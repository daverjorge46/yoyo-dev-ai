"""
Tests for MCPServerMonitor service.

Tests Docker MCP Gateway detection and status checking.
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
# Docker MCP Gateway Detection
# ============================================================================

@patch('subprocess.run')
def test_detect_docker_mcp_gateway_connected(mock_run, monitor):
    """Test detection of Docker MCP Gateway with enabled servers."""
    # Mock docker mcp server status output
    mock_run.return_value = MagicMock(
        returncode=0,
        stdout="""Enabled servers:
  - playwright (running)
  - github-official (running)
  - duckduckgo (idle)
""",
        stderr=""
    )

    status = monitor.check_mcp_status()

    assert status.connected is True
    assert "Docker MCP Gateway" in status.server_name
    assert status.error_message is None


@patch('subprocess.run')
def test_detect_docker_mcp_no_servers_enabled(mock_run, monitor):
    """Test detection when Docker MCP Gateway has no servers enabled."""
    mock_run.return_value = MagicMock(
        returncode=0,
        stdout="No servers enabled",
        stderr=""
    )

    status = monitor.check_mcp_status()

    assert status.connected is False
    assert "No MCP servers enabled" in status.error_message


@patch('subprocess.run')
def test_detect_docker_mcp_not_running(mock_run, monitor):
    """Test detection when Docker is not running."""
    mock_run.side_effect = subprocess.CalledProcessError(1, "docker mcp server status")

    status = monitor.check_mcp_status()

    assert status.connected is False
    assert status.error_message is not None


@patch('subprocess.run')
def test_detect_docker_not_installed(mock_run, monitor):
    """Test detection when Docker is not installed."""
    mock_run.side_effect = FileNotFoundError("docker not found")

    status = monitor.check_mcp_status()

    assert status.connected is False
    assert "Docker" in status.error_message or "not found" in status.error_message.lower()


@patch('subprocess.run')
def test_detect_mcp_toolkit_not_enabled(mock_run, monitor):
    """Test detection when MCP Toolkit is not enabled."""
    mock_run.return_value = MagicMock(
        returncode=1,
        stdout="",
        stderr="Error: 'mcp' is not a docker command"
    )

    status = monitor.check_mcp_status()

    assert status.connected is False
    assert "MCP Toolkit" in status.error_message or "not enabled" in status.error_message.lower()


# ============================================================================
# Docker MCP Server Parsing
# ============================================================================

@patch('subprocess.run')
def test_parse_enabled_servers_list(mock_run, monitor):
    """Test parsing of enabled servers from docker mcp server status."""
    mock_run.return_value = MagicMock(
        returncode=0,
        stdout="""Enabled servers:
  - playwright (running)
  - github-official (running)
  - duckduckgo (idle)
  - filesystem (running)
""",
        stderr=""
    )

    status = monitor.check_mcp_status()

    assert status.connected is True
    # Should include server count or names
    assert "4" in status.server_name or "playwright" in status.server_name.lower()


@patch('subprocess.run')
def test_parse_single_server(mock_run, monitor):
    """Test parsing when only one server is enabled."""
    mock_run.return_value = MagicMock(
        returncode=0,
        stdout="""Enabled servers:
  - playwright (running)
""",
        stderr=""
    )

    status = monitor.check_mcp_status()

    assert status.connected is True
    assert "playwright" in status.server_name.lower() or "1" in status.server_name


@patch('subprocess.run')
def test_parse_server_with_idle_status(mock_run, monitor):
    """Test that idle servers are still considered enabled."""
    mock_run.return_value = MagicMock(
        returncode=0,
        stdout="""Enabled servers:
  - duckduckgo (idle)
""",
        stderr=""
    )

    status = monitor.check_mcp_status()

    # Idle servers should still count as connected (they start on demand)
    assert status.connected is True


# ============================================================================
# Status Caching and Updates
# ============================================================================

def test_status_updates_on_check(monitor):
    """Test that status is updated each time check is called."""
    with patch('subprocess.run') as mock_run:
        # First check: servers running
        mock_run.return_value = MagicMock(
            returncode=0,
            stdout="Enabled servers:\n  - playwright (running)",
            stderr=""
        )

        status1 = monitor.check_mcp_status()
        assert status1.connected is True

        # Second check: no servers
        mock_run.return_value = MagicMock(
            returncode=0,
            stdout="No servers enabled",
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
            stdout="Enabled servers:\n  - playwright (running)",
            stderr=""
        )

        # First check
        status1 = monitor.check_mcp_status()

        # Get cached status (should not call docker again)
        mock_run.reset_mock()
        status2 = monitor.get_status()

        # Should return same status
        assert status1.connected == status2.connected
        assert status1.server_name == status2.server_name

        # Should not have called docker again
        mock_run.assert_not_called()


# ============================================================================
# Event Publishing
# ============================================================================

def test_publish_status_changed_event_on_connection(monitor, mock_event_bus):
    """Test that MCP_STATUS_CHANGED event is published when gateway connects."""
    with patch('subprocess.run') as mock_run:
        # Initial status: disconnected
        mock_run.return_value = MagicMock(
            returncode=0,
            stdout="No servers enabled",
            stderr=""
        )
        monitor.check_mcp_status()

        # Clear previous calls
        mock_event_bus.publish.reset_mock()

        # Gateway starts with servers
        mock_run.return_value = MagicMock(
            returncode=0,
            stdout="Enabled servers:\n  - playwright (running)",
            stderr=""
        )
        monitor.check_mcp_status()

        # Should publish MCP_STATUS_CHANGED event
        mock_event_bus.publish.assert_called()

        call_args = mock_event_bus.publish.call_args
        event_type = call_args[0][0] if call_args[0] else call_args[1].get('event_type')

        assert event_type == EventType.MCP_STATUS_CHANGED


def test_publish_status_changed_event_on_disconnection(monitor, mock_event_bus):
    """Test that event is published when gateway disconnects."""
    with patch('subprocess.run') as mock_run:
        # Initial status: connected
        mock_run.return_value = MagicMock(
            returncode=0,
            stdout="Enabled servers:\n  - playwright (running)",
            stderr=""
        )
        monitor.check_mcp_status()

        # Clear previous calls
        mock_event_bus.publish.reset_mock()

        # Gateway stops
        mock_run.return_value = MagicMock(
            returncode=0,
            stdout="No servers enabled",
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
            stdout="Enabled servers:\n  - playwright (running)",
            stderr=""
        )
        monitor.check_mcp_status()

        # Clear previous calls
        mock_event_bus.publish.reset_mock()

        # Second check with same status
        mock_run.return_value = MagicMock(
            returncode=0,
            stdout="Enabled servers:\n  - playwright (running)",
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
def test_linux_docker_detection(mock_run, mock_platform, monitor):
    """Test Docker MCP detection on Linux."""
    mock_platform.return_value = "Linux"

    mock_run.return_value = MagicMock(
        returncode=0,
        stdout="Enabled servers:\n  - playwright (running)",
        stderr=""
    )

    status = monitor.check_mcp_status()

    # Should use docker mcp server status
    call_args = mock_run.call_args[0][0]
    assert "docker" in call_args

    assert status.connected is True


@patch('platform.system')
@patch('subprocess.run')
def test_macos_docker_detection(mock_run, mock_platform, monitor):
    """Test Docker MCP detection on macOS."""
    mock_platform.return_value = "Darwin"

    mock_run.return_value = MagicMock(
        returncode=0,
        stdout="Enabled servers:\n  - playwright (running)",
        stderr=""
    )

    status = monitor.check_mcp_status()

    # Should use docker mcp server status
    call_args = mock_run.call_args[0][0]
    assert "docker" in call_args

    assert status.connected is True


@patch('platform.system')
def test_unsupported_platform(mock_platform, monitor):
    """Test behavior on unsupported platform."""
    mock_platform.return_value = "Windows"

    status = monitor.check_mcp_status()

    # Should return "not supported" on Windows
    assert status.connected is False
    assert "not supported" in status.error_message.lower() or "windows" in status.error_message.lower()


# ============================================================================
# Error Scenarios
# ============================================================================

@patch('subprocess.run')
def test_handle_timeout(mock_run, monitor):
    """Test handling of subprocess timeout."""
    mock_run.side_effect = subprocess.TimeoutExpired("docker mcp server status", timeout=5)

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
            stdout="No servers enabled",
            stderr=""
        )

        status = monitor.check_mcp_status()

        assert isinstance(status.last_check, datetime)
        assert status.last_check <= datetime.now()


# ============================================================================
# Get Enabled Servers
# ============================================================================

@patch('subprocess.run')
def test_get_enabled_servers(mock_run, monitor):
    """Test getting list of enabled MCP servers."""
    mock_run.return_value = MagicMock(
        returncode=0,
        stdout="""Enabled servers:
  - playwright (running)
  - github-official (running)
  - duckduckgo (idle)
""",
        stderr=""
    )

    servers = monitor.get_enabled_servers()

    assert len(servers) == 3
    assert "playwright" in servers
    assert "github-official" in servers
    assert "duckduckgo" in servers


@patch('subprocess.run')
def test_get_enabled_servers_none(mock_run, monitor):
    """Test getting enabled servers when none are enabled."""
    mock_run.return_value = MagicMock(
        returncode=0,
        stdout="No servers enabled",
        stderr=""
    )

    servers = monitor.get_enabled_servers()

    assert len(servers) == 0


@patch('subprocess.run')
def test_get_enabled_servers_error(mock_run, monitor):
    """Test getting enabled servers when Docker fails."""
    mock_run.side_effect = subprocess.CalledProcessError(1, "docker")

    servers = monitor.get_enabled_servers()

    assert len(servers) == 0


# ============================================================================
# Integration Tests
# ============================================================================

def test_full_monitoring_cycle(monitor, mock_event_bus):
    """Test complete monitoring cycle with state changes."""
    with patch('subprocess.run') as mock_run:
        # Cycle 1: No servers enabled
        mock_run.return_value = MagicMock(returncode=0, stdout="No servers enabled", stderr="")
        status1 = monitor.check_mcp_status()
        assert not status1.connected

        # Cycle 2: Servers start
        mock_run.return_value = MagicMock(
            returncode=0,
            stdout="Enabled servers:\n  - playwright (running)",
            stderr=""
        )
        status2 = monitor.check_mcp_status()
        assert status2.connected

        # Cycle 3: Servers continue running
        status3 = monitor.check_mcp_status()
        assert status3.connected

        # Cycle 4: Servers stop
        mock_run.return_value = MagicMock(returncode=0, stdout="No servers enabled", stderr="")
        status4 = monitor.check_mcp_status()
        assert not status4.connected

        # Should have published 2 status change events (start and stop)
        assert mock_event_bus.publish.call_count >= 2


def test_monitor_provides_helpful_error_messages(monitor):
    """Test that monitor provides helpful error messages."""
    with patch('subprocess.run') as mock_run:
        # No servers enabled
        mock_run.return_value = MagicMock(returncode=0, stdout="No servers enabled", stderr="")
        status = monitor.check_mcp_status()

        assert status.error_message is not None
        assert len(status.error_message) > 0
        # Should be helpful, not just "Error"
        assert status.error_message != "Error"


def test_docker_command_used(monitor):
    """Test that docker mcp command is used for detection."""
    with patch('subprocess.run') as mock_run:
        mock_run.return_value = MagicMock(
            returncode=0,
            stdout="Enabled servers:\n  - playwright (running)",
            stderr=""
        )

        monitor.check_mcp_status()

        # Verify docker mcp server status was called
        call_args = mock_run.call_args[0][0]
        assert "docker" in call_args
        assert "mcp" in call_args
        assert "server" in call_args
        assert "status" in call_args
