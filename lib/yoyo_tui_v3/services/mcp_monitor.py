"""
MCP Server Monitor service.

Monitors MCP server connection status and process health.
"""

import json
import platform
import subprocess
from datetime import datetime
from pathlib import Path
from typing import Optional, Dict, List

from ..models import MCPServerStatus, EventType


class MCPServerMonitor:
    """
    Monitors MCP server connection status.

    Detection Methods:
    1. Read Claude's config from ~/.claude.json
    2. Cross-reference configured MCPs with running processes
    3. Process detection via ps/tasklist
    """

    def __init__(self, event_bus, pid_file_path: Optional[Path] = None):
        """
        Initialize MCPServerMonitor.

        Args:
            event_bus: EventBus instance for publishing events
            pid_file_path: Optional path to MCP server PID file (deprecated)
        """
        self.event_bus = event_bus
        self.pid_file_path = pid_file_path
        self._last_status: Optional[MCPServerStatus] = None
        self._claude_config_path = Path.home() / ".claude.json"

    def check_mcp_status(self) -> MCPServerStatus:
        """
        Check MCP server status.

        Returns:
            MCPServerStatus with current connection state
        """
        # Detect platform
        system = platform.system()

        if system in ["Linux", "Darwin"]:  # Linux or macOS
            # Try Claude-aware detection first
            status = self._check_via_claude_config()

            # Fallback to generic process detection if no Claude config
            if not status.connected and status.error_message == "No Claude config found":
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

    def _check_via_claude_config(self) -> MCPServerStatus:
        """
        Check MCP status by reading Claude's config and cross-referencing with running processes.

        Returns:
            MCPServerStatus based on Claude config and process detection
        """
        try:
            # Read Claude config
            if not self._claude_config_path.exists():
                return MCPServerStatus(
                    connected=False,
                    server_name=None,
                    last_check=datetime.now(),
                    error_message="No Claude config found"
                )

            with open(self._claude_config_path, 'r') as f:
                config = json.load(f)

            # Get current project path
            current_project_path = str(Path.cwd())

            # Find MCPs configured for current project
            projects = config.get("projects", {})
            project_config = projects.get(current_project_path, {})
            mcp_servers = project_config.get("mcpServers", {})

            if not mcp_servers:
                return MCPServerStatus(
                    connected=False,
                    server_name=None,
                    last_check=datetime.now(),
                    error_message="No MCPs configured for project"
                )

            # Get running processes
            result = subprocess.run(
                ["ps", "aux"],
                capture_output=True,
                text=True,
                timeout=5
            )

            if result.returncode != 0:
                return MCPServerStatus(
                    connected=False,
                    server_name=None,
                    last_check=datetime.now(),
                    error_message="Failed to check processes"
                )

            ps_output = result.stdout

            # Check if any configured MCP is running
            running_mcps = []
            for mcp_name, mcp_config in mcp_servers.items():
                if self._is_mcp_process_running(mcp_name, mcp_config, ps_output):
                    running_mcps.append(mcp_name)

            if running_mcps:
                # At least one MCP is running
                server_names = ", ".join(running_mcps)
                return MCPServerStatus(
                    connected=True,
                    server_name=f"Claude MCPs: {server_names}",
                    last_check=datetime.now(),
                    error_message=None
                )
            else:
                # MCPs configured but none running
                total_mcps = len(mcp_servers)
                return MCPServerStatus(
                    connected=False,
                    server_name=None,
                    last_check=datetime.now(),
                    error_message=f"{total_mcps} MCP(s) configured but not running"
                )

        except json.JSONDecodeError:
            return MCPServerStatus(
                connected=False,
                server_name=None,
                last_check=datetime.now(),
                error_message="Invalid Claude config JSON"
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
        except Exception as e:
            return MCPServerStatus(
                connected=False,
                server_name=None,
                last_check=datetime.now(),
                error_message=f"Unexpected error: {e}"
            )

    def _is_mcp_process_running(self, mcp_name: str, mcp_config: Dict, ps_output: str) -> bool:
        """
        Check if a specific MCP server process is running.

        Args:
            mcp_name: Name of the MCP server
            mcp_config: MCP configuration dict with command and args
            ps_output: Output from ps aux command

        Returns:
            True if the MCP process is running, False otherwise
        """
        # Extract command and args
        command = mcp_config.get("command", "")
        args = mcp_config.get("args", [])

        # Build search patterns based on command and args
        # Common patterns for Claude MCPs:
        # - npx <package>@latest
        # - bunx -y <package>
        # - node <script>
        # - python <script>
        patterns = []

        if command:
            patterns.append(command.lower())

        # Add first arg as additional pattern (usually the package name)
        if args and len(args) > 0:
            first_arg = str(args[0]).lower()
            # Skip common flags
            if not first_arg.startswith("-"):
                patterns.append(first_arg)

        # Also search for MCP name itself
        patterns.append(mcp_name.lower())

        # Search for patterns in process list
        ps_output_lower = ps_output.lower()
        for pattern in patterns:
            if pattern and pattern in ps_output_lower:
                return True

        return False

    def _check_via_process_list(self) -> MCPServerStatus:
        """Check MCP status via process list (ps aux) - fallback method."""
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
        Parse ps aux output to detect MCP server (generic fallback method).

        Args:
            ps_output: Output from ps aux command

        Returns:
            MCPServerStatus based on process detection
        """
        # Look for MCP-related process names
        # Updated patterns for Claude-installed MCPs
        mcp_patterns = [
            "mcp-server",
            "mcp.server",
            "mcp-claude",
            "python -m mcp",
            "node mcp",
            "mcp/index",
            "npx chrome-devtools-mcp",
            "npx @modelcontextprotocol",
            "bunx -y @jpisnice/shadcn-ui-mcp-server",
            "claude-code-templates",
            "npx -y @context7",
            "npx -y memory-integration",
            "npx -y playwright-mcp-server",
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

        # Look for recognizable MCP package names
        known_mcps = {
            "chrome-devtools-mcp": "Chrome DevTools",
            "shadcn-ui-mcp-server": "shadcn UI",
            "context7": "Context7",
            "memory-integration": "Memory",
            "playwright-mcp-server": "Playwright",
            "containerize": "Containerization",
        }

        for keyword, name in known_mcps.items():
            if keyword in process_line.lower():
                return name

        # Fallback: try to extract from command args
        for part in parts:
            if "mcp" in part.lower():
                # Clean up the name
                name = part.split('/')[-1]  # Get last component of path
                name = name.split('.')[0]   # Remove extension
                return name

        return "MCP Server"

    def get_configured_mcps(self) -> List[str]:
        """
        Get list of MCPs configured in Claude config for current project.

        Returns:
            List of configured MCP server names
        """
        try:
            if not self._claude_config_path.exists():
                return []

            with open(self._claude_config_path, 'r') as f:
                config = json.load(f)

            current_project_path = str(Path.cwd())
            projects = config.get("projects", {})
            project_config = projects.get(current_project_path, {})
            mcp_servers = project_config.get("mcpServers", {})

            return list(mcp_servers.keys())

        except (json.JSONDecodeError, FileNotFoundError, KeyError):
            return []

    def check_mcp_via_pidfile(self) -> MCPServerStatus:
        """
        Check MCP status via PID file (deprecated - kept for backward compatibility).

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
        Check MCP status via port listening check (deprecated - kept for backward compatibility).

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
