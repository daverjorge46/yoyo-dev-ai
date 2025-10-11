# MCP Protocol Communication Tests

**Test File:** `test-mcp-protocol.sh`

**Purpose:** Comprehensive test suite for MCP protocol communication layer (`lib/mcp-protocol.sh`)

**Status:** ✅ Ready for TDD implementation

---

## Test Coverage

### Test Group 1: JSON-RPC Message Formatting (8 tests)

Tests JSON-RPC 2.0 protocol compliance for MCP communication:

- ✓ **JSON-RPC request format** - Validates JSON-RPC 2.0 structure (jsonrpc, id, method, params)
- ✓ **Request with params** - Tests parameter inclusion in requests
- ✓ **Success response parsing** - Parses result field from responses
- ✓ **Error response parsing** - Parses error field and error codes
- ✓ **Request/response ID correlation** - Ensures request and response IDs match
- ✓ **Malformed JSON rejection** - Detects invalid JSON syntax
- ✓ **Missing required fields** - Detects missing method or other required fields
- ✓ **JSON-RPC version validation** - Ensures version is "2.0"

**Key Methods Tested:**
- `build_jsonrpc_request(method, id, params)`
- `parse_jsonrpc_response(response)`

---

### Test Group 2: stdio Transport (8 tests)

Tests stdin/stdout communication with MCP servers (Decision D11 - prefer stdio):

- ✓ **Basic communication** - Send request via stdin, receive response via stdout
- ✓ **Multiple sequential requests** - Handle multiple requests in sequence
- ✓ **tools/list method** - MCP protocol tools/list method
- ✓ **tools/call method** - MCP protocol tools/call method with arguments
- ✓ **Error response handling** - Handle error responses from MCP server
- ✓ **Method not found error** - Handle unknown method calls (error code -32601)
- ✓ **Large payload handling** - Handle large JSON payloads without truncation
- ✓ **Concurrent request safety** - Sequential requests don't interfere

**Mock Server:** Creates mock stdio MCP server that responds to:
- `ping` → `{"result":"pong"}`
- `tools/list` → `{"result":{"tools":[...]}}`
- `tools/call` → `{"result":{"content":[...]}}`
- `error` → `{"error":{...}}`
- `slow` → Intentionally slow for timeout testing

---

### Test Group 3: HTTP Transport (5 tests)

Tests HTTP communication with MCP servers (Decision D11 - support both transports):

- ✓ **Endpoint reachability** - HTTP server is reachable
- ✓ **JSON-RPC POST request** - Send JSON-RPC request via HTTP POST
- ✓ **Content-Type header validation** - Verify application/json header
- ✓ **HTTP response parsing** - Parse HTTP headers + JSON body
- ✓ **HTTP error status codes** - Handle 404, 500, etc.

**Requirements:**
- HTTP server on configurable port
- JSON-RPC payload in HTTP body
- Proper Content-Type headers

**Note:** Tests gracefully skip if `curl` not available.

---

### Test Group 4: Request/Response Correlation (5 tests)

Tests tracking of requests and matching with responses:

- ✓ **Request ID uniqueness** - Each request gets unique ID
- ✓ **Response ID matches request ID** - Response ID correlates to request
- ✓ **Out-of-order response handling** - Handle async responses arriving out of order
- ✓ **Orphaned response detection** - Detect responses without matching request
- ✓ **Request timeout cleanup** - Clean up timed-out requests from pending list

**Correlation Strategy:**
- Maintain pending request map: `{id: request_data}`
- Match responses by ID
- Cleanup on timeout or response received

---

### Test Group 5: Timeout Enforcement (7 tests)

Tests 5-second timeout with exponential backoff retry (per technical spec):

- ✓ **Timeout configuration** - Default 5-second timeout
- ✓ **Timeout triggers on slow response** - Timeout after 5 seconds of no response
- ✓ **Timeout error message** - Clear error message on timeout
- ✓ **Exponential backoff retry** - Retry delays: 1s, 2s, 4s, 8s
- ✓ **Max retries limit** - Cap at 3 retries
- ✓ **Independent timeout per request** - Each request has its own timeout
- ✓ **Global timeout override** - Allow per-request timeout override

**Timeout Behavior:**
```
Request sent → Wait 5s → No response → Timeout
Retry 1: wait 1s → Retry
Retry 2: wait 2s → Retry
Retry 3: wait 4s → Retry
After 3 retries: Give up, return error
```

---

### Test Group 6: Error Handling & Edge Cases (8 tests)

Tests error scenarios and edge cases:

- ✓ **Network error handling** - Handle connection refused
- ✓ **Invalid JSON response** - Reject malformed JSON
- ✓ **Missing ID in response** - Handle responses without ID field
- ✓ **Error code translation** - Translate JSON-RPC errors to user-friendly messages
- ✓ **Connection refused recovery** - Retry on connection failures
- ✓ **Partial/truncated response** - Handle incomplete responses
- ✓ **Empty response body** - Handle empty responses
- ✓ **Protocol version mismatch** - Detect non-2.0 JSON-RPC versions

**Error Code Translations:**
```
-32700 → "Parse error: Invalid JSON"
-32600 → "Invalid Request"
-32601 → "Method not found"
-32602 → "Invalid params"
-32603 → "Internal error"
```

---

## Running the Tests

### Full Test Suite

```bash
./tests/mcp/test-mcp-protocol.sh
```

### Expected Output

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
              MCP Protocol Communication Test Suite
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Test Group 1: JSON-RPC Message Formatting
✓ JSON-RPC request format (2.0 compliant)
✓ JSON-RPC request with params
...

Test Group 2: stdio Transport
✓ stdio basic communication
✓ stdio multiple sequential requests
...

Tests Run:      41
Tests Passed:   41
Tests Failed:   0

✓ ALL TESTS PASSED
```

---

## Test Results

**Current Status:** ✅ 41/41 tests passing

All tests pass using mock implementations. Next step is to implement `lib/mcp-protocol.sh` and verify tests pass with real implementation.

---

## Implementation Guidance

### Functions to Implement in `lib/mcp-protocol.sh`

**1. JSON-RPC Message Building:**
```bash
build_jsonrpc_request() {
    local method="$1"
    local id="$2"
    local params="${3:-{}}"

    # Generate JSON-RPC 2.0 request
    # Return: JSON string
}
```

**2. JSON-RPC Response Parsing:**
```bash
parse_jsonrpc_response() {
    local response="$1"

    # Parse JSON-RPC response
    # Extract result or error
    # Return: Parsed data or error message
}
```

**3. stdio Transport:**
```bash
send_stdio_request() {
    local server_pid="$1"
    local request="$2"

    # Send request to MCP server via stdin
    # Read response from stdout
    # Return: Response JSON
}
```

**4. HTTP Transport:**
```bash
send_http_request() {
    local server_url="$1"
    local request="$2"

    # Send HTTP POST request with JSON-RPC payload
    # Parse HTTP response
    # Return: Response JSON body
}
```

**5. Request Correlation:**
```bash
track_pending_request() {
    local id="$1"
    local request_data="$2"

    # Add to pending requests map
}

match_response() {
    local response_id="$1"

    # Find and remove from pending requests
    # Return: Original request data
}
```

**6. Timeout Enforcement:**
```bash
send_with_timeout() {
    local transport="$1"  # stdio or http
    local request="$2"
    local timeout="${3:-5}"  # Default 5 seconds

    # Send request with timeout
    # Retry on timeout with exponential backoff
    # Max 3 retries
    # Return: Response or timeout error
}
```

**7. Error Translation:**
```bash
translate_error() {
    local error_code="$1"
    local error_message="$2"

    # Convert JSON-RPC error to user-friendly message
    # Return: Friendly error string
}
```

---

## Dependencies

**Required:**
- `bash` 4.0+
- `grep` with `-P` (Perl regex) support
- `python3` (for JSON validation in tests)

**Optional:**
- `curl` (for HTTP transport tests)
- `nc` (netcat) for HTTP server mocking
- `jq` (for advanced JSON parsing in implementation)

---

## Notes

### Why Mock Implementations?

This test suite uses **mock implementations** to test the protocol layer in isolation:
- Mock stdio server responds to predefined methods
- Mock HTTP server simulates HTTP transport
- Mock functions demonstrate expected behavior

**Real implementation** will replace mocks with actual MCP protocol communication.

### Timeout Test Performance

The timeout tests intentionally take time to verify timeout behavior:
- "Timeout triggers on slow response" waits ~6 seconds
- "Exponential backoff retry" may take up to 15 seconds (1+2+4+8)

**Total test runtime:** ~30-60 seconds (including timeout tests)

### Transport Selection (Decision D11)

**Default:** stdio (simpler, no port conflicts)
**Optional:** HTTP (more flexible, easier debugging)

Implementation should:
1. Try stdio first
2. Fall back to HTTP if MCP requires it
3. Allow configuration override

---

## Next Steps

1. **Implement `lib/mcp-protocol.sh`** with functions outlined above
2. **Run this test suite** against real implementation
3. **Fix any failing tests** (expected on first run)
4. **Integrate with `lib/mcp-manager.sh`** for MCP lifecycle management
5. **Mark Subtask 2.3 complete** in tasks.md

---

**Test Suite Version:** 1.0
**Created:** 2025-10-11
**Last Updated:** 2025-10-11
**Status:** Ready for TDD implementation
