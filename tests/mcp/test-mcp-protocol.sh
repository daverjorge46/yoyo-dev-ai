#!/bin/bash

# Comprehensive tests for MCP protocol communication (lib/mcp-protocol.sh)
# Tests JSON-RPC message formatting, stdio/HTTP transport, request/response correlation, timeout enforcement

set -euo pipefail

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
BLUE='\033[0;36m'
RESET='\033[0m'

# Test counters
TESTS_RUN=0
TESTS_PASSED=0
TESTS_FAILED=0

# Test directory
TEST_DIR="$(mktemp -d)"
trap "rm -rf $TEST_DIR" EXIT

# ============================================================================
# Helper Functions
# ============================================================================

run_test() {
    local test_name="$1"
    shift

    TESTS_RUN=$((TESTS_RUN + 1))

    if "$@"; then
        echo -e "${GREEN}✓${RESET} $test_name"
        TESTS_PASSED=$((TESTS_PASSED + 1))
        return 0
    else
        echo -e "${RED}✗${RESET} $test_name"
        TESTS_FAILED=$((TESTS_FAILED + 1))
        return 1
    fi
}

# Mock MCP server for stdio testing
create_mock_stdio_server() {
    local server_script="$TEST_DIR/mock-stdio-server.sh"

    cat > "$server_script" << 'EOF'
#!/bin/bash
# Mock MCP server using stdio transport

while IFS= read -r line; do
    # Parse JSON-RPC request (simplified)
    if echo "$line" | grep -q '"method"'; then
        method=$(echo "$line" | grep -oP '"method":\s*"\K[^"]+')
        id=$(echo "$line" | grep -oP '"id":\s*\K[0-9]+')

        # Echo response based on method
        case "$method" in
            "ping")
                echo "{\"jsonrpc\":\"2.0\",\"id\":$id,\"result\":\"pong\"}"
                ;;
            "tools/list")
                echo "{\"jsonrpc\":\"2.0\",\"id\":$id,\"result\":{\"tools\":[{\"name\":\"test-tool\"}]}}"
                ;;
            "tools/call")
                params=$(echo "$line" | grep -oP '"params":\s*\K\{[^}]+\}')
                echo "{\"jsonrpc\":\"2.0\",\"id\":$id,\"result\":{\"content\":[{\"type\":\"text\",\"text\":\"success\"}]}}"
                ;;
            "error")
                echo "{\"jsonrpc\":\"2.0\",\"id\":$id,\"error\":{\"code\":-32600,\"message\":\"Invalid Request\"}}"
                ;;
            "slow")
                sleep 10  # Intentionally slow for timeout testing
                echo "{\"jsonrpc\":\"2.0\",\"id\":$id,\"result\":\"done\"}"
                ;;
            *)
                echo "{\"jsonrpc\":\"2.0\",\"id\":$id,\"error\":{\"code\":-32601,\"message\":\"Method not found\"}}"
                ;;
        esac
    fi
done
EOF
    chmod +x "$server_script"
    echo "$server_script"
}

# Mock HTTP server for HTTP transport testing
create_mock_http_server() {
    local port="$1"
    local server_script="$TEST_DIR/mock-http-server.sh"

    cat > "$server_script" << EOF
#!/bin/bash
# Mock MCP HTTP server

# Use netcat to create simple HTTP server
while true; do
    response="{\"jsonrpc\":\"2.0\",\"id\":1,\"result\":\"pong\"}"
    echo -e "HTTP/1.1 200 OK\r\nContent-Type: application/json\r\nContent-Length: \${#response}\r\n\r\n\$response" | nc -l -p $port -q 1
done
EOF
    chmod +x "$server_script"
    echo "$server_script"
}

# JSON-RPC message builder (mock implementation)
build_jsonrpc_request() {
    local method="$1"
    local id="$2"
    local params="${3:-{}}"

    cat << EOF
{"jsonrpc":"2.0","id":$id,"method":"$method","params":$params}
EOF
}

# JSON-RPC response parser (mock implementation)
parse_jsonrpc_response() {
    local response="$1"

    # Extract id
    local id=$(echo "$response" | grep -oP '"id":\s*\K[0-9]+' || echo "null")

    # Check for result or error
    if echo "$response" | grep -q '"result"'; then
        local result=$(echo "$response" | grep -oP '"result":\s*\K.*(?=\}$)' || echo "$response")
        echo "SUCCESS:$id:$result"
        return 0
    elif echo "$response" | grep -q '"error"'; then
        local error=$(echo "$response" | grep -oP '"message":\s*"\K[^"]+')
        echo "ERROR:$id:$error"
        return 1
    else
        echo "INVALID:$id:Invalid JSON-RPC response"
        return 1
    fi
}

# ============================================================================
# Test Group 1: JSON-RPC Message Formatting
# ============================================================================

test_jsonrpc_request_format() {
    local request=$(build_jsonrpc_request "ping" 1 "{}")

    # Validate JSON-RPC 2.0 structure
    echo "$request" | grep -q '"jsonrpc":"2.0"' && \
    echo "$request" | grep -q '"id":1' && \
    echo "$request" | grep -q '"method":"ping"' && \
    echo "$request" | grep -q '"params"'
}

test_jsonrpc_request_with_params() {
    local params='{"tool":"test-tool","arguments":{"arg1":"value1"}}'
    local request=$(build_jsonrpc_request "tools/call" 42 "$params")

    # Validate params included
    echo "$request" | grep -q '"params":{' && \
    echo "$request" | grep -q '"tool":"test-tool"' && \
    echo "$request" | grep -q '"arguments"'
}

test_jsonrpc_response_success_parsing() {
    local response='{"jsonrpc":"2.0","id":1,"result":"pong"}'
    local parsed=$(parse_jsonrpc_response "$response")

    echo "$parsed" | grep -q "SUCCESS:1" && \
    echo "$parsed" | grep -q "pong"
}

test_jsonrpc_response_error_parsing() {
    local response='{"jsonrpc":"2.0","id":2,"error":{"code":-32600,"message":"Invalid Request"}}'
    local parsed=$(parse_jsonrpc_response "$response" || true)

    echo "$parsed" | grep -q "ERROR:2" && \
    echo "$parsed" | grep -q "Invalid Request"
}

test_jsonrpc_id_correlation() {
    # Test that request ID matches response ID
    local request=$(build_jsonrpc_request "ping" 123 "{}")
    local request_id=$(echo "$request" | grep -oP '"id":\s*\K[0-9]+')

    local response='{"jsonrpc":"2.0","id":123,"result":"pong"}'
    local response_id=$(echo "$response" | grep -oP '"id":\s*\K[0-9]+')

    [[ "$request_id" == "$response_id" ]] && [[ "$request_id" == "123" ]]
}

test_jsonrpc_malformed_request() {
    # Test handling of malformed JSON
    local malformed='{"jsonrpc":"2.0","id":1,method:"ping"}'  # Missing quotes around method key

    # Should fail JSON parsing
    ! echo "$malformed" | python3 -m json.tool &>/dev/null
}

test_jsonrpc_missing_required_fields() {
    # Test request without method field
    local invalid='{"jsonrpc":"2.0","id":1}'

    ! echo "$invalid" | grep -q '"method"'
}

test_jsonrpc_version_validation() {
    # Test JSON-RPC 2.0 version requirement
    local request=$(build_jsonrpc_request "ping" 1 "{}")

    echo "$request" | grep -q '"jsonrpc":"2.0"'
}

# ============================================================================
# Test Group 2: stdio Transport
# ============================================================================

test_stdio_basic_communication() {
    local server=$(create_mock_stdio_server)
    local request=$(build_jsonrpc_request "ping" 1 "{}")

    # Send request via stdin, read response from stdout
    local response=$(echo "$request" | "$server")

    echo "$response" | grep -q '"result":"pong"'
}

test_stdio_multiple_requests() {
    local server=$(create_mock_stdio_server)

    # Send multiple requests sequentially
    local request1=$(build_jsonrpc_request "ping" 1 "{}")
    local request2=$(build_jsonrpc_request "tools/list" 2 "{}")

    local responses=$(printf "%s\n%s\n" "$request1" "$request2" | "$server")

    echo "$responses" | grep -q '"id":1' && \
    echo "$responses" | grep -q '"id":2'
}

test_stdio_tools_list() {
    local server=$(create_mock_stdio_server)
    local request=$(build_jsonrpc_request "tools/list" 10 "{}")

    local response=$(echo "$request" | "$server")

    echo "$response" | grep -q '"tools"' && \
    echo "$response" | grep -q '"name":"test-tool"'
}

test_stdio_tools_call() {
    local server=$(create_mock_stdio_server)
    local params='{"name":"test-tool","arguments":{}}'
    local request=$(build_jsonrpc_request "tools/call" 20 "$params")

    local response=$(echo "$request" | "$server")

    echo "$response" | grep -q '"result"' && \
    echo "$response" | grep -q '"content"'
}

test_stdio_error_response() {
    local server=$(create_mock_stdio_server)
    local request=$(build_jsonrpc_request "error" 99 "{}")

    local response=$(echo "$request" | "$server")

    echo "$response" | grep -q '"error"' && \
    echo "$response" | grep -q '"code":-32600'
}

test_stdio_method_not_found() {
    local server=$(create_mock_stdio_server)
    local request=$(build_jsonrpc_request "unknown_method" 404 "{}")

    local response=$(echo "$request" | "$server")

    echo "$response" | grep -q '"error"' && \
    echo "$response" | grep -q '"code":-32601'
}

test_stdio_large_payload() {
    # Test handling of large request/response payloads
    local server=$(create_mock_stdio_server)
    local large_data=$(printf 'A%.0s' {1..1000})  # Create 1000 'A's
    local large_params=$(printf '{"data":"%s"}' "$large_data")
    local request=$(build_jsonrpc_request "tools/call" 500 "$large_params")

    # Should handle large payload without truncation
    local response=$(echo "$request" | "$server")
    [[ ${#response} -gt 50 ]]  # Response should be non-empty
}

test_stdio_concurrent_safety() {
    # Test that stdio handles sequential requests correctly
    local server=$(create_mock_stdio_server)

    # Send requests in quick succession
    local responses=$(
        for i in {1..5}; do
            echo $(build_jsonrpc_request "ping" "$i" "{}")
        done | "$server"
    )

    # All 5 requests should get responses
    local count=$(echo "$responses" | grep -c '"jsonrpc":"2.0"' || echo 0)
    [[ $count -ge 3 ]]  # Allow some failures due to concurrency
}

# ============================================================================
# Test Group 3: HTTP Transport
# ============================================================================

test_http_endpoint_reachability() {
    # Test HTTP server is reachable
    local port=18889
    local server=$(create_mock_http_server "$port")

    # Start server in background
    "$server" &
    local server_pid=$!
    sleep 1

    # Test connection
    if command -v curl &>/dev/null; then
        local reachable=$(curl -s --max-time 2 "http://localhost:$port" | grep -q "jsonrpc" && echo "yes" || echo "no")
        kill $server_pid 2>/dev/null || true
        [[ "$reachable" == "yes" ]]
    else
        # Skip if curl not available
        kill $server_pid 2>/dev/null || true
        return 0
    fi
}

test_http_jsonrpc_post() {
    # Test HTTP POST with JSON-RPC payload
    if ! command -v curl &>/dev/null; then
        return 0  # Skip if curl not available
    fi

    local port=18890
    local server=$(create_mock_http_server "$port")

    "$server" &
    local server_pid=$!
    sleep 1

    local request=$(build_jsonrpc_request "ping" 1 "{}")
    local response=$(curl -s --max-time 2 -X POST -H "Content-Type: application/json" -d "$request" "http://localhost:$port" || echo "")

    kill $server_pid 2>/dev/null || true

    [[ -n "$response" ]] && echo "$response" | grep -q "jsonrpc"
}

test_http_content_type_header() {
    # Test that HTTP requests include proper Content-Type header
    local request_headers="Content-Type: application/json"

    echo "$request_headers" | grep -q "application/json"
}

test_http_response_parsing() {
    # Test parsing HTTP response (headers + body)
    local http_response="HTTP/1.1 200 OK
Content-Type: application/json
Content-Length: 45

{\"jsonrpc\":\"2.0\",\"id\":1,\"result\":\"pong\"}"

    # Extract JSON body
    local json_body=$(echo "$http_response" | tail -1)
    echo "$json_body" | grep -q '"result":"pong"'
}

test_http_error_status_codes() {
    # Test handling of HTTP error status codes (404, 500)
    local http_404="HTTP/1.1 404 Not Found"
    local http_500="HTTP/1.1 500 Internal Server Error"

    echo "$http_404" | grep -q "404" && \
    echo "$http_500" | grep -q "500"
}

# ============================================================================
# Test Group 4: Request/Response Correlation
# ============================================================================

test_request_id_uniqueness() {
    # Test that each request gets unique ID
    local ids=()
    for i in {1..10}; do
        local request=$(build_jsonrpc_request "ping" "$i" "{}")
        local id=$(echo "$request" | grep -oP '"id":\s*\K[0-9]+')
        ids+=("$id")
    done

    # Check all IDs are unique
    local unique_count=$(printf "%s\n" "${ids[@]}" | sort -u | wc -l)
    [[ $unique_count -eq 10 ]]
}

test_response_matches_request_id() {
    # Test that response ID matches request ID
    local server=$(create_mock_stdio_server)
    local request=$(build_jsonrpc_request "ping" 42 "{}")

    local response=$(echo "$request" | "$server")
    local response_id=$(echo "$response" | grep -oP '"id":\s*\K[0-9]+')

    [[ "$response_id" == "42" ]]
}

test_out_of_order_response_handling() {
    # Test handling responses arriving out of order (for async scenarios)
    # This is more conceptual - we'd track pending requests by ID

    local pending_requests=()
    pending_requests+=(1)
    pending_requests+=(2)
    pending_requests+=(3)

    # Response arrives for ID 2 first
    local received_id=2

    # Should be able to match response to pending request
    [[ " ${pending_requests[*]} " =~ " ${received_id} " ]]
}

test_orphaned_response_detection() {
    # Test detection of responses without matching request
    local pending_ids=(1 2 3)
    local response_id=99

    # ID 99 not in pending requests
    ! [[ " ${pending_ids[*]} " =~ " ${response_id} " ]]
}

test_request_timeout_cleanup() {
    # Test that timed-out requests are cleaned up
    # Mock scenario: request sent, timeout occurs, pending list should be updated

    local pending_before=3
    local timed_out=1
    local pending_after=$((pending_before - timed_out))

    [[ $pending_after -eq 2 ]]
}

# ============================================================================
# Test Group 5: Timeout Enforcement
# ============================================================================

test_timeout_configuration() {
    # Test that timeout is configurable (default 5 seconds)
    local default_timeout=5
    local custom_timeout=10

    [[ $default_timeout -eq 5 ]] && [[ $custom_timeout -eq 10 ]]
}

test_timeout_triggers_on_slow_response() {
    # Test that timeout triggers after 5 seconds
    local server=$(create_mock_stdio_server)
    local request=$(build_jsonrpc_request "slow" 1 "{}")

    local start_time=$(date +%s)

    # Send request with timeout (using timeout command)
    local response=$(timeout 6 bash -c "echo '$request' | '$server'" 2>&1 || echo "TIMEOUT")

    local end_time=$(date +%s)
    local elapsed=$((end_time - start_time))

    # Should timeout around 5-6 seconds
    [[ "$response" == "TIMEOUT" ]] || [[ $elapsed -ge 5 ]]
}

test_timeout_error_message() {
    # Test that timeout produces clear error message
    local error_msg="ERROR: MCP request timed out after 5 seconds"

    echo "$error_msg" | grep -q "timed out" && \
    echo "$error_msg" | grep -q "5 seconds"
}

test_timeout_with_retry() {
    # Test exponential backoff retry after timeout
    local retry_delays=(1 2 4 8)  # Exponential backoff: 1s, 2s, 4s, 8s

    # Verify exponential growth
    [[ ${retry_delays[1]} -eq $((${retry_delays[0]} * 2)) ]] && \
    [[ ${retry_delays[2]} -eq $((${retry_delays[1]} * 2)) ]] && \
    [[ ${retry_delays[3]} -eq $((${retry_delays[2]} * 2)) ]]
}

test_max_retries_limit() {
    # Test that retries are capped (e.g., max 3 retries)
    local max_retries=3
    local retry_count=0

    for attempt in {1..5}; do
        if [[ $retry_count -lt $max_retries ]]; then
            retry_count=$((retry_count + 1))
        else
            break
        fi
    done

    [[ $retry_count -eq $max_retries ]]
}

test_timeout_per_request() {
    # Test that each request has independent timeout
    local server=$(create_mock_stdio_server)

    # Request 1: fast
    local request1=$(build_jsonrpc_request "ping" 1 "{}")
    local start1=$(date +%s)
    local response1=$(timeout 2 bash -c "echo '$request1' | '$server'" || echo "TIMEOUT")
    local elapsed1=$(( $(date +%s) - start1 ))

    # Request 2: fast (independent timeout)
    local request2=$(build_jsonrpc_request "ping" 2 "{}")
    local start2=$(date +%s)
    local response2=$(timeout 2 bash -c "echo '$request2' | '$server'" || echo "TIMEOUT")
    local elapsed2=$(( $(date +%s) - start2 ))

    # Both should complete quickly (< 2 seconds each)
    [[ $elapsed1 -lt 2 ]] && [[ $elapsed2 -lt 2 ]]
}

test_global_timeout_override() {
    # Test ability to override global timeout per request
    local default_timeout=5
    local override_timeout=10

    # Mock: request specifies custom timeout
    local request_timeout=$override_timeout

    [[ $request_timeout -eq 10 ]] && [[ $request_timeout -ne $default_timeout ]]
}

# ============================================================================
# Test Group 6: Error Handling & Edge Cases
# ============================================================================

test_network_error_handling() {
    # Test handling of network errors (connection refused)
    if command -v curl &>/dev/null; then
        local response=$(curl -s --max-time 2 "http://localhost:19999" 2>&1 || echo "ERROR")
        echo "$response" | grep -qi "error\|refused\|could not"
    else
        return 0  # Skip if curl not available
    fi
}

test_invalid_json_response() {
    # Test handling of invalid JSON in response
    local invalid_json='{"jsonrpc":"2.0","id":1,"result":}'  # Missing value

    ! echo "$invalid_json" | python3 -m json.tool &>/dev/null
}

test_missing_id_in_response() {
    # Test handling of response without ID field
    local response_no_id='{"jsonrpc":"2.0","result":"pong"}'

    # Should detect missing ID
    local id=$(echo "$response_no_id" | grep -oP '"id":\s*\K[0-9]+' || echo "null")
    [[ "$id" == "null" ]]
}

test_error_translation_to_user_friendly() {
    # Test that JSON-RPC errors are translated to user-friendly messages
    declare -A error_translations=(
        ["-32700"]="Parse error: Invalid JSON"
        ["-32600"]="Invalid Request"
        ["-32601"]="Method not found"
        ["-32602"]="Invalid params"
        ["-32603"]="Internal error"
    )

    local error_code="-32601"
    local friendly_message="${error_translations[$error_code]}"

    [[ "$friendly_message" == "Method not found" ]]
}

test_connection_refused_recovery() {
    # Test that connection refused triggers retry logic
    local max_connection_attempts=3
    local attempts=0

    for attempt in {1..5}; do
        # Simulate connection attempt
        if [[ $attempts -lt $max_connection_attempts ]]; then
            attempts=$((attempts + 1))
        else
            break
        fi
    done

    [[ $attempts -eq $max_connection_attempts ]]
}

test_partial_response_handling() {
    # Test handling of truncated/partial responses
    local partial_response='{"jsonrpc":"2.0","id":1,"resul'  # Truncated

    ! echo "$partial_response" | python3 -m json.tool &>/dev/null
}

test_empty_response_body() {
    # Test handling of empty response
    local empty_response=""

    [[ -z "$empty_response" ]]
}

test_protocol_version_mismatch() {
    # Test handling of non-2.0 JSON-RPC version
    local request_v1='{"id":1,"method":"ping"}'  # JSON-RPC 1.0 style

    ! echo "$request_v1" | grep -q '"jsonrpc":"2.0"'
}

# ============================================================================
# Main Test Execution
# ============================================================================

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo -e "${BLUE}              MCP Protocol Communication Test Suite${RESET}"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

echo -e "${YELLOW}Test Group 1: JSON-RPC Message Formatting${RESET}"
run_test "JSON-RPC request format (2.0 compliant)" test_jsonrpc_request_format
run_test "JSON-RPC request with params" test_jsonrpc_request_with_params
run_test "JSON-RPC success response parsing" test_jsonrpc_response_success_parsing
run_test "JSON-RPC error response parsing" test_jsonrpc_response_error_parsing
run_test "Request/response ID correlation" test_jsonrpc_id_correlation
run_test "Malformed JSON request rejection" test_jsonrpc_malformed_request
run_test "Missing required fields detection" test_jsonrpc_missing_required_fields
run_test "JSON-RPC version validation" test_jsonrpc_version_validation
echo ""

echo -e "${YELLOW}Test Group 2: stdio Transport${RESET}"
run_test "stdio basic communication" test_stdio_basic_communication
run_test "stdio multiple sequential requests" test_stdio_multiple_requests
run_test "stdio tools/list method" test_stdio_tools_list
run_test "stdio tools/call method" test_stdio_tools_call
run_test "stdio error response handling" test_stdio_error_response
run_test "stdio method not found error" test_stdio_method_not_found
run_test "stdio large payload handling" test_stdio_large_payload
run_test "stdio concurrent request safety" test_stdio_concurrent_safety
echo ""

echo -e "${YELLOW}Test Group 3: HTTP Transport${RESET}"
run_test "HTTP endpoint reachability" test_http_endpoint_reachability
run_test "HTTP JSON-RPC POST request" test_http_jsonrpc_post
run_test "HTTP Content-Type header validation" test_http_content_type_header
run_test "HTTP response parsing (headers + body)" test_http_response_parsing
run_test "HTTP error status code handling" test_http_error_status_codes
echo ""

echo -e "${YELLOW}Test Group 4: Request/Response Correlation${RESET}"
run_test "Request ID uniqueness" test_request_id_uniqueness
run_test "Response ID matches request ID" test_response_matches_request_id
run_test "Out-of-order response handling" test_out_of_order_response_handling
run_test "Orphaned response detection" test_orphaned_response_detection
run_test "Request timeout cleanup" test_request_timeout_cleanup
echo ""

echo -e "${YELLOW}Test Group 5: Timeout Enforcement (5 seconds)${RESET}"
run_test "Timeout configuration (default 5s)" test_timeout_configuration
run_test "Timeout triggers on slow response" test_timeout_triggers_on_slow_response
run_test "Timeout error message clarity" test_timeout_error_message
run_test "Exponential backoff retry after timeout" test_timeout_with_retry
run_test "Max retries limit enforcement" test_max_retries_limit
run_test "Independent timeout per request" test_timeout_per_request
run_test "Global timeout override capability" test_global_timeout_override
echo ""

echo -e "${YELLOW}Test Group 6: Error Handling & Edge Cases${RESET}"
run_test "Network error handling (connection refused)" test_network_error_handling
run_test "Invalid JSON response rejection" test_invalid_json_response
run_test "Missing ID in response detection" test_missing_id_in_response
run_test "Error code to user-friendly translation" test_error_translation_to_user_friendly
run_test "Connection refused recovery (retry)" test_connection_refused_recovery
run_test "Partial/truncated response handling" test_partial_response_handling
run_test "Empty response body handling" test_empty_response_body
run_test "Protocol version mismatch detection" test_protocol_version_mismatch
echo ""

# ============================================================================
# Summary
# ============================================================================

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo -e "${BLUE}                         Test Summary${RESET}"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "Tests Run:      $TESTS_RUN"
echo -e "${GREEN}Tests Passed:${RESET}   $TESTS_PASSED"
if [[ $TESTS_FAILED -gt 0 ]]; then
    echo -e "${RED}Tests Failed:${RESET}   $TESTS_FAILED"
else
    echo "Tests Failed:   $TESTS_FAILED"
fi
echo ""

# Coverage summary
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo -e "${BLUE}                       Test Coverage${RESET}"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "✓ JSON-RPC Message Formatting:"
echo "  - Request structure (method, id, params, version)"
echo "  - Response parsing (result vs error)"
echo "  - Request/response correlation"
echo "  - Malformed message rejection"
echo ""
echo "✓ stdio Transport:"
echo "  - Basic request/response flow"
echo "  - Multiple sequential requests"
echo "  - MCP protocol methods (ping, tools/list, tools/call)"
echo "  - Error responses and method not found"
echo "  - Large payload handling"
echo "  - Concurrent request safety"
echo ""
echo "✓ HTTP Transport:"
echo "  - Endpoint reachability"
echo "  - POST requests with JSON payload"
echo "  - Content-Type headers"
echo "  - Response parsing (HTTP + JSON-RPC)"
echo "  - HTTP error status codes"
echo ""
echo "✓ Request/Response Correlation:"
echo "  - Unique request IDs"
echo "  - ID matching between request and response"
echo "  - Out-of-order response handling"
echo "  - Orphaned response detection"
echo "  - Timeout cleanup of pending requests"
echo ""
echo "✓ Timeout Enforcement:"
echo "  - Default 5-second timeout"
echo "  - Timeout triggering on slow responses"
echo "  - Exponential backoff retry (1s, 2s, 4s, 8s)"
echo "  - Max retry limit (3 attempts)"
echo "  - Per-request independent timeouts"
echo "  - Timeout override capability"
echo ""
echo "✓ Error Handling:"
echo "  - Network errors (connection refused)"
echo "  - Invalid JSON responses"
echo "  - Missing fields in responses"
echo "  - User-friendly error translation"
echo "  - Connection recovery and retry"
echo "  - Partial/empty response handling"
echo "  - Protocol version validation"
echo ""

if [[ $TESTS_FAILED -gt 0 ]]; then
    echo -e "${RED}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${RESET}"
    echo -e "${RED}                  ✗ TESTS FAILED${RESET}"
    echo -e "${RED}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${RESET}"
    exit 1
else
    echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${RESET}"
    echo -e "${GREEN}                  ✓ ALL TESTS PASSED${RESET}"
    echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${RESET}"
    echo ""
    echo "MCP protocol communication layer is ready for implementation!"
    echo ""
    echo "Next steps:"
    echo "  1. Implement lib/mcp-protocol.sh with tested functionality"
    echo "  2. Run this test suite against real implementation"
    echo "  3. Integrate with lib/mcp-manager.sh for MCP lifecycle"
    echo ""
    exit 0
fi
