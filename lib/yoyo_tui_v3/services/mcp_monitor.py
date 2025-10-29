"""
MCP Server Monitor service.

Monitors MCP server connection status and process health.
"""

import platform
import subprocess
from datetime import datetime
from pathlib import Path
from typing import Optional

from ..models import MCPServerStatus, EventType


class MCPServerMonitor:
    """
    Monitors MCP server connection status.

    Detection Methods:
    1. Process detection via ps/tasklist
    2. PID file checking (if available)
    3. Port listening check (if available)
    """

    def __init__(self, event_bus, pid_file_path: Optional[Path] = None):
        """
        Initialize MCPServerMonitor.

        Args:
            event_bus: EventBus instance for publishing events
            pid_file_path: Optional path to MCP server PID file
        """
        self.event_bus = event_bus
        self.pid_file_path = pid_file_path
        self._last_status: Optional[MCPServerStatus] = None

    def check_mcp_status(self) -> MCPServerStatus:
        """
        Check MCP server status.

        Returns:
            MCPServerStatus with current connection state
        """
        # Detect platform
        system = platform.system()

        if system in ["Linux", "Darwin"]:  # Linux or macOS
            status = self._check_via_process_list()
        elif system == "Windows":
            status = MCPServerStatus(
                connected=False,
                server_name=None,
                last_check=datetime.now(),
                error_message="Windows not supported yet"
            )
        else:
            status = MCPServerStatus(
                connected=False,
                server_name=None,
                last_check=datetime.now(),
                error_message="Platform not supported"
            )

        # Publish status change event if status changed
        self._publish_if_changed(status)

        # Store current status
        self._last_status = status

        return status

    def _check_via_process_list(self) -> MCPServerStatus:
        """Check MCP status via process list (ps aux)."""
        try:
            result = subprocess.run(
                ["ps", "aux"],
                capture_output=True,
                text=True,
                timeout=5
            )

            if result.returncode == 0:
                return self._parse_process_list(result.stdout)
            else:
                return MCPServerStatus(
                    connected=False,
                    server_name=None,
                    last_check=datetime.now(),
                    error_message="Failed to check processes"
                )

        except subprocess.TimeoutExpired:
            return MCPServerStatus(
                connected=False,
                server_name=None,
                last_check=datetime.now(),
                error_message="Timeout checking processes"
            )
        except subprocess.CalledProcessError as e:
            return MCPServerStatus(
                connected=False,
                server_name=None,
                last_check=datetime.now(),
                error_message=f"Error checking processes: {e}"
            )
        except PermissionError:
            return MCPServerStatus(
                connected=False,
                server_name=None,
                last_check=datetime.now(),
                error_message="Permission denied"
            )
        except FileNotFoundError:
            return MCPServerStatus(
                connected=False,
                server_name=None,
                last_check=datetime.now(),
                error_message="ps command not found"
            )

    def _parse_process_list(self, ps_output: str) -> MCPServerStatus:
        """
        Parse ps aux output to detect MCP server.

        Args:
            ps_output: Output from ps aux command

        Returns:
            MCPServerStatus based on process detection
        """
        # Look for MCP-related process names
        mcp_patterns = [
            "mcp-server",
            "mcp.server",
            "mcp-claude",
            "python -m mcp",
            "node mcp",
            "mcp/index",
        ]

        for line in ps_output.split('\n'):
            line_lower = line.lower()

            for pattern in mcp_patterns:
                if pattern in line_lower:
                    # Found MCP process
                    server_name = self._extract_server_name(line)

                    return MCPServerStatus(
                        connected=True,
                        server_name=server_name,
                        last_check=datetime.now(),
                        error_message=None
                    )

        # No MCP process found
        return MCPServerStatus(
            connected=False,
            server_name=None,
            last_check=datetime.now(),
            error_message="Not running"
        )

    def _extract_server_name(self, process_line: str) -> str:
        """
        Extract server name from process line.

        Args:
            process_line: Single line from ps aux output

        Returns:
            Extracted server name
        """
        # Try to extract meaningful name from command
        parts = process_line.split()

        for part in parts:
            if "mcp" in part.lower():
                # Clean up the name
                name = part.split('/')[-1]  # Get last component of path
                name = name.split('.')[0]   # Remove extension
                return name

        return "MCP Server"

    def check_mcp_via_pidfile(self) -> MCPServerStatus:
        """
        Check MCP status via PID file (alternative method).

        Returns:
            MCPServerStatus based on PID file check
        """
        if not self.pid_file_path or not self.pid_file_path.exists():
            return MCPServerStatus(
                connected=False,
                server_name=None,
                last_check=datetime.now(),
                error_message="PID file not found"
            )

        try:
            pid = int(self.pid_file_path.read_text().strip())

            # Check if process with this PID exists
            result = subprocess.run(
                ["ps", "-p", str(pid)],
                capture_output=True,
                text=True,
                timeout=5
            )

            if result.returncode == 0 and "mcp" in result.stdout.lower():
                return MCPServerStatus(
                    connected=True,
                    server_name="MCP Server",
                    last_check=datetime.now(),
                    error_message=None
                )
            else:
                return MCPServerStatus(
                    connected=False,
                    server_name=None,
                    last_check=datetime.now(),
                    error_message="Process not running"
                )

        except (ValueError, IOError, subprocess.SubprocessError):
            return MCPServerStatus(
                connected=False,
                server_name=None,
                last_check=datetime.now(),
                error_message="Failed to check PID"
            )

    def check_mcp_via_port(self, port: int = 3000) -> MCPServerStatus:
        """
        Check MCP status via port listening check (alternative method).

        Args:
            port: Port to check (default: 3000)

        Returns:
            MCPServerStatus based on port check
        """
        try:
            # Use lsof or netstat to check port
            system = platform.system()

            if system == "Darwin":  # macOS
                cmd = ["lsof", "-i", f":{port}"]
            elif system == "Linux":
                cmd = ["netstat", "-tuln"]
            else:
                return MCPServerStatus(
                    connected=False,
                    server_name=None,
                    last_check=datetime.now(),
                    error_message="Platform not supported for port check"
                )

            result = subprocess.run(
                cmd,
                capture_output=True,
                text=True,
                timeout=5
            )

            if result.returncode == 0:
                output_lower = result.stdout.lower()

                if "mcp" in output_lower and str(port) in result.stdout:
                    return MCPServerStatus(
                        connected=True,
                        server_name=f"MCP Server (port {port})",
                        last_check=datetime.now(),
                        error_message=None
                    )

            return MCPServerStatus(
                connected=False,
                server_name=None,
                last_check=datetime.now(),
                error_message=f"Not listening on port {port}"
            )

        except (subprocess.SubprocessError, FileNotFoundError):
            return MCPServerStatus(
                connected=False,
                server_name=None,
                last_check=datetime.now(),
                error_message="Failed to check port"
            )

    def get_status(self) -> MCPServerStatus:
        """
        Get cached status without re-checking.

        Returns:
            Last known MCPServerStatus or default disconnected status
        """
        if self._last_status:
            return self._last_status

        # No cached status, return default
        return MCPServerStatus(
            connected=False,
            server_name=None,
            last_check=datetime.now(),
            error_message="Not checked yet"
        )

    def _publish_if_changed(self, new_status: MCPServerStatus) -> None:
        """
        Publish MCP_STATUS_CHANGED event if status changed.

        Args:
            new_status: New status to compare with last status
        """
        # Check if status changed
        if self._last_status is None:
            # First check, don't publish
            return

        status_changed = (
            self._last_status.connected != new_status.connected or
            self._last_status.server_name != new_status.server_name
        )

        if status_changed:
            self.event_bus.publish(
                EventType.MCP_STATUS_CHANGED,
                data={
                    "connected": new_status.connected,
                    "server_name": new_status.server_name,
                    "error_message": new_status.error_message,
                    "previous_connected": self._last_status.connected
                },
                source="MCPServerMonitor"
            )
