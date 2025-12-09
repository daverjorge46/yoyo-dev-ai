"""
MCP Server Monitor service.

Monitors Docker MCP Gateway status and enabled servers.
"""

import platform
import re
import subprocess
from datetime import datetime
from pathlib import Path
from typing import Optional, List

from ..models import MCPServerStatus, EventType


class MCPServerMonitor:
    """
    Monitors Docker MCP Gateway connection status.

    Detection Method:
    Uses `docker mcp server ls` to check enabled servers via Docker MCP Toolkit.
    """

    def __init__(self, event_bus, pid_file_path: Optional[Path] = None):
        """
        Initialize MCPServerMonitor.

        Args:
            event_bus: EventBus instance for publishing events
            pid_file_path: Deprecated - kept for backward compatibility
        """
        self.event_bus = event_bus
        self.pid_file_path = pid_file_path  # Deprecated
        self._last_status: Optional[MCPServerStatus] = None

    def check_mcp_status(self) -> MCPServerStatus:
        """
        Check Docker MCP Gateway status.

        Returns:
            MCPServerStatus with current connection state
        """
        # Detect platform
        system = platform.system()

        if system in ["Linux", "Darwin"]:  # Linux or macOS
            status = self._check_docker_mcp_status()
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

    def _check_docker_mcp_status(self) -> MCPServerStatus:
        """
        Check MCP status via Docker MCP Toolkit.

        Returns:
            MCPServerStatus based on Docker MCP Gateway status
        """
        try:
            # Run docker mcp server ls (correct command - 'status' doesn't exist)
            result = subprocess.run(
                ["docker", "mcp", "server", "ls"],
                capture_output=True,
                text=True,
                timeout=10
            )

            if result.returncode != 0:
                # Check if MCP Toolkit is not enabled
                stderr_lower = result.stderr.lower()
                if "not a docker command" in stderr_lower or "'mcp'" in stderr_lower:
                    return MCPServerStatus(
                        connected=False,
                        server_name=None,
                        last_check=datetime.now(),
                        error_message="MCP Toolkit not enabled in Docker Desktop"
                    )

                # Check for permission denied (Docker not accessible)
                if "permission denied" in stderr_lower:
                    return MCPServerStatus(
                        connected=False,
                        server_name=None,
                        last_check=datetime.now(),
                        error_message="Docker permission denied"
                    )

                # Other error
                return MCPServerStatus(
                    connected=False,
                    server_name=None,
                    last_check=datetime.now(),
                    error_message="Docker MCP Gateway not available"
                )

            # Parse output to find enabled servers
            output = result.stdout
            servers = self._parse_enabled_servers(output)

            if servers:
                # Servers are enabled
                server_count = len(servers)
                if server_count == 1:
                    server_name = f"Docker MCP Gateway: {servers[0]}"
                else:
                    server_name = f"Docker MCP Gateway: {server_count} servers"

                return MCPServerStatus(
                    connected=True,
                    server_name=server_name,
                    last_check=datetime.now(),
                    error_message=None
                )
            else:
                # No servers enabled
                return MCPServerStatus(
                    connected=False,
                    server_name=None,
                    last_check=datetime.now(),
                    error_message="No MCP servers enabled"
                )

        except FileNotFoundError:
            return MCPServerStatus(
                connected=False,
                server_name=None,
                last_check=datetime.now(),
                error_message="Docker not found"
            )
        except subprocess.TimeoutExpired:
            return MCPServerStatus(
                connected=False,
                server_name=None,
                last_check=datetime.now(),
                error_message="Timeout checking Docker MCP status"
            )
        except subprocess.CalledProcessError as e:
            return MCPServerStatus(
                connected=False,
                server_name=None,
                last_check=datetime.now(),
                error_message=f"Docker MCP error: {e}"
            )
        except PermissionError:
            return MCPServerStatus(
                connected=False,
                server_name=None,
                last_check=datetime.now(),
                error_message="Permission denied accessing Docker"
            )
        except Exception as e:
            return MCPServerStatus(
                connected=False,
                server_name=None,
                last_check=datetime.now(),
                error_message=f"Unexpected error: {e}"
            )

    def _parse_enabled_servers(self, output: str) -> List[str]:
        """
        Parse docker mcp server ls output to extract enabled servers.

        Args:
            output: Output from docker mcp server ls

        Returns:
            List of enabled server names
        """
        servers = []

        # Check for "no servers enabled" or empty output
        output_lower = output.lower()
        if "no servers enabled" in output_lower or not output.strip():
            return servers

        lines = output.strip().split('\n')

        # Skip header line if present (usually first line with column names)
        # Typical formats:
        # 1. Tabular: "NAME    IMAGE    TAG" header with data rows
        # 2. List: "  - server_name (status)" format
        # 3. Simple: just server names, one per line

        for line in lines:
            line = line.strip()
            if not line:
                continue

            # Skip header lines (contain NAME, IMAGE, or are all caps)
            if 'NAME' in line.upper() and ('IMAGE' in line.upper() or 'STATUS' in line.upper()):
                continue

            # Format 1: Tabular output - "playwright  alpine/..." (first column is name)
            # Format 2: List format - "  - playwright (running)"
            # Format 3: Simple format - just "playwright"

            # Try list format first: "  - server_name (status)" or "  - server_name"
            list_match = re.match(r'^\s*-\s+(\S+)', line)
            if list_match:
                servers.append(list_match.group(1))
                continue

            # Try tabular format: first column is the server name
            # Split by multiple spaces or tabs
            parts = re.split(r'\s{2,}|\t', line)
            if parts and parts[0]:
                # First part should be the server name (alphanumeric, hyphens, underscores)
                name_candidate = parts[0].strip()
                # Validate it looks like a server name (not a separator line)
                if re.match(r'^[a-zA-Z][a-zA-Z0-9_-]*$', name_candidate):
                    servers.append(name_candidate)

        return servers

    def get_enabled_servers(self) -> List[str]:
        """
        Get list of enabled MCP servers from Docker.

        Returns:
            List of enabled server names
        """
        try:
            result = subprocess.run(
                ["docker", "mcp", "server", "ls"],
                capture_output=True,
                text=True,
                timeout=10
            )

            if result.returncode != 0:
                return []

            return self._parse_enabled_servers(result.stdout)

        except (FileNotFoundError, subprocess.TimeoutExpired, subprocess.CalledProcessError, PermissionError):
            return []

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
