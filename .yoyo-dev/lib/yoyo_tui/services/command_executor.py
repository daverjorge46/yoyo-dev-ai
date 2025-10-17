"""
CommandExecutor Service

Handles execution of Yoyo Dev commands by sending them to Claude Code via stdin.
This integrates the TUI with Claude Code's command execution system.
"""

import subprocess
from pathlib import Path
from typing import Optional
import logging

logger = logging.getLogger(__name__)


class CommandExecutor:
    """
    Execute Yoyo Dev commands by sending them to Claude Code stdin.

    This service integrates the TUI with Claude Code by:
    - Starting Claude Code as a subprocess
    - Sending command text to Claude Code's stdin
    - Providing execution feedback via app notifications

    Usage:
        executor = CommandExecutor(app=app)
        executor.execute_command("/execute-tasks")
    """

    def __init__(self, app=None):
        """
        Initialize CommandExecutor.

        Args:
            app: Optional app instance for sending notifications
        """
        self.app = app
        self._process: Optional[subprocess.Popen] = None

    def execute_command(self, command: str) -> bool:
        """
        Execute a Yoyo Dev command by sending it to Claude Code stdin.

        Args:
            command: Command to execute (e.g., "/execute-tasks")

        Returns:
            True if command was sent successfully, False otherwise
        """
        # Validate command
        if not command or command is None:
            logger.error("Cannot execute empty or None command")
            if self.app:
                self.app.notify(
                    "Cannot execute empty command",
                    severity="error",
                    timeout=3
                )
            return False

        # Validate command is not empty string
        if not command.strip():
            logger.error("Cannot execute empty command")
            if self.app:
                self.app.notify(
                    "Cannot execute empty command",
                    severity="error",
                    timeout=3
                )
            return False

        try:
            # Notify user that command is executing
            if self.app:
                self.app.notify(
                    f"Executing {command}...",
                    severity="information",
                    timeout=2
                )

            # Start Claude Code subprocess
            self._process = subprocess.Popen(
                ["claude"],  # Claude Code CLI command
                stdin=subprocess.PIPE,
                stdout=subprocess.PIPE,
                stderr=subprocess.PIPE,
                text=True,
                cwd=Path.cwd(),
                bufsize=1
            )

            # Send command to stdin
            if self._process.stdin:
                self._process.stdin.write(f"{command}\n")
                self._process.stdin.flush()
                self._process.stdin.close()

            # Check if process started successfully
            if self._process.poll() is not None:
                # Process already exited
                logger.warning(f"Claude Code process exited immediately")
                return True  # Still consider it success if it started

            logger.info(f"Successfully sent command to Claude Code: {command}")
            return True

        except FileNotFoundError:
            error_msg = "Claude Code CLI not found. Is 'claude' installed?"
            logger.error(error_msg)
            if self.app:
                self.app.notify(error_msg, severity="error", timeout=5)
            return False

        except Exception as e:
            error_msg = f"Failed to execute command: {str(e)}"
            logger.error(error_msg)
            if self.app:
                self.app.notify(
                    f"Command execution failed: {str(e)}",
                    severity="error",
                    timeout=5
                )
            return False

    def cleanup(self) -> None:
        """Clean up subprocess resources."""
        if self._process:
            try:
                if self._process.poll() is None:
                    self._process.terminate()
                    self._process.wait(timeout=5)
            except Exception as e:
                logger.error(f"Error cleaning up subprocess: {e}")
            finally:
                self._process = None
