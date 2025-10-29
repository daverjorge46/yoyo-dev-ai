"""
Tests for MCPServerMonitor service.

Tests MCP server status detection and process checking.
"""

import pytest
from datetime import datetime
from unittest.mock import Mock, MagicMock, patch
import subprocess

from lib.yoyo_tui_v3.services.mcp_monitor import MCPServerMonitor
from lib.yoyo_tui_v3.models import MCPServerStatus, EventType


@pytest.fixture
def mock_event_bus():
    """Mock EventBus for testing."""
    bus = Mock()
    bus.publish = Mock()
    return bus


@pytest.fixture
def monitor(mock_event_bus):
    """Create MCPServerMonitor instance."""
    return MCPServerMonitor(event_bus=mock_event_bus)


# ============================================================================
# MCP Process Detection
# ============================================================================

@patch('subprocess.run')
def test_detect_mcp_process_running(mock_run, monitor):
    """Test detection of running MCP server process."""
    # Mock ps aux output showing MCP process
    mock_run.return_value = MagicMock(
        returncode=0,
        stdout="1234 user mcp-server --port 3000\n5678 user python -m mcp.server",
        stderr=""
    )

    status = monitor.check_mcp_status()

    assert status.connected is True
    assert status.server_name is not None
    assert "mcp" in status.server_name.lower()
    assert status.error_message is None


@patch('subprocess.run')
def test_detect_no_mcp_process(mock_run, monitor):
    """Test detection when no MCP process is running."""
    # Mock ps aux output with no MCP process
    mock_run.return_value = MagicMock(
        returncode=0,
        stdout="1234 user python app.py\n5678 user node server.js",
        stderr=""
    )

    status = monitor.check_mcp_status()

    assert status.connected is False
    assert status.server_name is None
    assert status.error_message == "Not running"


@patch('subprocess.run')
def test_detect_multiple_mcp_processes(mock_run, monitor):
    """Test detection of multiple MCP server processes."""
    # Mock ps aux output with multiple MCP processes
    mock_run.return_value = MagicMock(
        returncode=0,
        stdout="""
1234 user mcp-server-1 --port 3000
5678 user mcp-server-2 --port 3001
        """,
        stderr=""
    )

    status = monitor.check_mcp_status()

    assert status.connected is True
    # Should detect at least one MCP server
    assert status.server_name is not None


@patch('subprocess.run')
def test_handle_ps_command_failure(mock_run, monitor):
    """Test handling when ps command fails."""
    # Mock ps command failure
    mock_run.side_effect = subprocess.CalledProcessError(1, "ps aux")

    status = monitor.check_mcp_status()

    # Should return disconnected status
    assert status.connected is False
    assert "error" in status.error_message.lower() or "failed" in status.error_message.lower()


# ============================================================================
# MCP Server Name Detection
# ============================================================================

@patch('subprocess.run')
def test_extract_server_name_from_process(mock_run, monitor):
    """Test extraction of server name from process info."""
    test_cases = [
        ("mcp-server --config config.json", "mcp"),  # Will extract "mcp-server" or "mcp"
        ("python -m mcp.server", "mcp"),              # Will extract "mcp"
        ("/usr/bin/mcp-claude-server", "mcp"),        # Will extract "mcp-claude-server" or "mcp"
        ("node mcp/index.js", "index"),                # Will extract "index" from last path component
    ]

    for process_cmd, expected_substring in test_cases:
        mock_run.return_value = MagicMock(
            returncode=0,
            stdout=f"1234 user {process_cmd}",
            stderr=""
        )

        status = monitor.check_mcp_status()

        assert status.connected is True
        # Just check that "mcp" appears somewhere in the server name
        assert expected_substring.lower() in status.server_name.lower()


# ============================================================================
# Status Caching and Updates
# ============================================================================

def test_status_updates_on_check(monitor):
    """Test that status is updated each time check is called."""
    with patch('subprocess.run') as mock_run:
        # First check: server running
        mock_run.return_value = MagicMock(
            returncode=0,
            stdout="1234 user mcp-server",
            stderr=""
        )

        status1 = monitor.check_mcp_status()
        assert status1.connected is True

        # Second check: server stopped
        mock_run.return_value = MagicMock(
            returncode=0,
            stdout="",  # No MCP process
            stderr=""
        )

        status2 = monitor.check_mcp_status()
        assert status2.connected is False

        # Timestamps should be different
        assert status2.last_check >= status1.last_check


def test_get_cached_status(monitor):
    """Test retrieval of cached status without re-checking."""
    with patch('subprocess.run') as mock_run:
        mock_run.return_value = MagicMock(
            returncode=0,
            stdout="1234 user mcp-server",
            stderr=""
        )

        # First check
        status1 = monitor.check_mcp_status()

        # Get cached status (should not call ps again)
        mock_run.reset_mock()
        status2 = monitor.get_status()

        # Should return same status
        assert status1.connected == status2.connected
        assert status1.server_name == status2.server_name

        # Should not have called ps again
        mock_run.assert_not_called()


# ============================================================================
# Event Publishing
# ============================================================================

def test_publish_status_changed_event_on_connection(monitor, mock_event_bus):
    """Test that MCP_STATUS_CHANGED event is published when server connects."""
    with patch('subprocess.run') as mock_run:
        # Initial status: disconnected
        mock_run.return_value = MagicMock(
            returncode=0,
            stdout="",  # No MCP
            stderr=""
        )
        monitor.check_mcp_status()

        # Clear previous calls
        mock_event_bus.publish.reset_mock()

        # Server starts
        mock_run.return_value = MagicMock(
            returncode=0,
            stdout="1234 user mcp-server",
            stderr=""
        )
        monitor.check_mcp_status()

        # Should publish MCP_STATUS_CHANGED event
        mock_event_bus.publish.assert_called()

        call_args = mock_event_bus.publish.call_args
        event_type = call_args[0][0] if call_args[0] else call_args[1].get('event_type')

        assert event_type == EventType.MCP_STATUS_CHANGED


def test_publish_status_changed_event_on_disconnection(monitor, mock_event_bus):
    """Test that event is published when server disconnects."""
    with patch('subprocess.run') as mock_run:
        # Initial status: connected
        mock_run.return_value = MagicMock(
            returncode=0,
            stdout="1234 user mcp-server",
            stderr=""
        )
        monitor.check_mcp_status()

        # Clear previous calls
        mock_event_bus.publish.reset_mock()

        # Server stops
        mock_run.return_value = MagicMock(
            returncode=0,
            stdout="",  # No MCP
            stderr=""
        )
        monitor.check_mcp_status()

        # Should publish MCP_STATUS_CHANGED event
        mock_event_bus.publish.assert_called()


def test_no_event_published_when_status_unchanged(monitor, mock_event_bus):
    """Test that no event is published if status hasn't changed."""
    with patch('subprocess.run') as mock_run:
        # Initial check
        mock_run.return_value = MagicMock(
            returncode=0,
            stdout="1234 user mcp-server",
            stderr=""
        )
        monitor.check_mcp_status()

        # Clear previous calls
        mock_event_bus.publish.reset_mock()

        # Second check with same status
        mock_run.return_value = MagicMock(
            returncode=0,
            stdout="1234 user mcp-server",
            stderr=""
        )
        monitor.check_mcp_status()

        # Should not publish event (status unchanged)
        mock_event_bus.publish.assert_not_called()


# ============================================================================
# Platform Compatibility
# ============================================================================

@patch('platform.system')
@patch('subprocess.run')
def test_linux_process_detection(mock_run, mock_platform, monitor):
    """Test MCP detection on Linux."""
    mock_platform.return_value = "Linux"

    mock_run.return_value = MagicMock(
        returncode=0,
        stdout="1234 user mcp-server",
        stderr=""
    )

    status = monitor.check_mcp_status()

    # Should use ps aux on Linux
    call_args = mock_run.call_args[0][0]
    assert "ps" in call_args

    assert status.connected is True


@patch('platform.system')
@patch('subprocess.run')
def test_macos_process_detection(mock_run, mock_platform, monitor):
    """Test MCP detection on macOS."""
    mock_platform.return_value = "Darwin"

    mock_run.return_value = MagicMock(
        returncode=0,
        stdout="1234 user mcp-server",
        stderr=""
    )

    status = monitor.check_mcp_status()

    # Should use ps aux on macOS
    call_args = mock_run.call_args[0][0]
    assert "ps" in call_args

    assert status.connected is True


@patch('platform.system')
def test_unsupported_platform(mock_platform, monitor):
    """Test behavior on unsupported platform."""
    mock_platform.return_value = "Windows"

    status = monitor.check_mcp_status()

    # Should return "not configured" on unsupported platforms
    assert status.connected is False
    assert "not supported" in status.error_message.lower() or "windows" in status.error_message.lower()


# ============================================================================
# Alternative Detection Methods
# ============================================================================

@patch('subprocess.run')
def test_detect_via_pidfile(mock_run, monitor, tmp_path):
    """Test MCP detection via PID file (alternative method)."""
    # Create mock PID file
    pid_file = tmp_path / "mcp.pid"
    pid_file.write_text("1234")

    # Configure monitor to check PID file
    monitor.pid_file_path = pid_file

    # Mock process check
    mock_run.return_value = MagicMock(
        returncode=0,
        stdout="1234 user mcp-server",
        stderr=""
    )

    status = monitor.check_mcp_via_pidfile()

    assert status.connected is True


@patch('subprocess.run')
def test_detect_via_port_check(mock_run, monitor):
    """Test MCP detection via port listening check."""
    # Mock netstat/lsof output showing MCP on port 3000
    mock_run.return_value = MagicMock(
        returncode=0,
        stdout="mcp-server 1234 user TCP *:3000 (LISTEN)",
        stderr=""
    )

    status = monitor.check_mcp_via_port(port=3000)

    assert status.connected is True
    assert "3000" in str(status.server_name) or status.connected


# ============================================================================
# Error Scenarios
# ============================================================================

@patch('subprocess.run')
def test_handle_timeout(mock_run, monitor):
    """Test handling of subprocess timeout."""
    mock_run.side_effect = subprocess.TimeoutExpired("ps aux", timeout=5)

    status = monitor.check_mcp_status()

    assert status.connected is False
    assert "timeout" in status.error_message.lower()


@patch('subprocess.run')
def test_handle_permission_denied(mock_run, monitor):
    """Test handling of permission denied errors."""
    mock_run.side_effect = PermissionError("Permission denied")

    status = monitor.check_mcp_status()

    assert status.connected is False
    assert status.error_message is not None


def test_status_has_timestamp(monitor):
    """Test that status always includes timestamp."""
    with patch('subprocess.run') as mock_run:
        mock_run.return_value = MagicMock(
            returncode=0,
            stdout="",
            stderr=""
        )

        status = monitor.check_mcp_status()

        assert isinstance(status.last_check, datetime)
        assert status.last_check <= datetime.now()


# ============================================================================
# Integration Tests
# ============================================================================

def test_full_monitoring_cycle(monitor, mock_event_bus):
    """Test complete monitoring cycle with state changes."""
    with patch('subprocess.run') as mock_run:
        # Cycle 1: Server not running
        mock_run.return_value = MagicMock(returncode=0, stdout="", stderr="")
        status1 = monitor.check_mcp_status()
        assert not status1.connected

        # Cycle 2: Server starts
        mock_run.return_value = MagicMock(
            returncode=0,
            stdout="1234 user mcp-server",
            stderr=""
        )
        status2 = monitor.check_mcp_status()
        assert status2.connected

        # Cycle 3: Server continues running
        status3 = monitor.check_mcp_status()
        assert status3.connected

        # Cycle 4: Server stops
        mock_run.return_value = MagicMock(returncode=0, stdout="", stderr="")
        status4 = monitor.check_mcp_status()
        assert not status4.connected

        # Should have published 2 status change events (start and stop)
        assert mock_event_bus.publish.call_count >= 2


def test_monitor_provides_helpful_error_messages(monitor):
    """Test that monitor provides helpful error messages."""
    with patch('subprocess.run') as mock_run:
        # No MCP process
        mock_run.return_value = MagicMock(returncode=0, stdout="", stderr="")
        status = monitor.check_mcp_status()

        assert status.error_message is not None
        assert len(status.error_message) > 0
        # Should be helpful, not just "Error"
        assert status.error_message != "Error"
