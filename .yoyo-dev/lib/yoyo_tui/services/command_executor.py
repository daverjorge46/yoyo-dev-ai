"""
CommandExecutor Service

Handles execution of Yoyo Dev commands by copying them to clipboard.
This integrates the TUI with Claude Code's command execution system.
"""

import subprocess
from pathlib import Path
from typing import Optional
import logging

logger = logging.getLogger(__name__)


class CommandExecutor:
    """
    Execute Yoyo Dev commands by copying them to clipboard.

    This service integrates the TUI with Claude Code by:
    - Copying command text to clipboard using pyperclip
    - Falling back to xclip/xsel on Linux if pyperclip unavailable
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

    def execute_command(self, command: str) -> bool:
        """
        Execute a Yoyo Dev command by copying it to clipboard.

        Args:
            command: Command to execute (e.g., "/execute-tasks")

        Returns:
            True if command was copied successfully, False otherwise
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
            # Try pyperclip first
            try:
                import pyperclip
                pyperclip.copy(command)
                logger.info(f"Copied command to clipboard using pyperclip: {command}")

                # Show success notification
                if self.app:
                    self.app.notify(
                        f"Copied '{command}' to clipboard. Paste in Claude Code to execute.",
                        severity="information",
                        timeout=5
                    )
                return True

            except (ImportError, Exception) as e:
                # Pyperclip failed, try xclip/xsel fallback on Linux
                logger.warning(f"pyperclip failed ({e}), trying xclip/xsel fallback")

                # Try xclip first
                try:
                    result = subprocess.run(
                        ["xclip", "-selection", "clipboard"],
                        input=command,
                        text=True,
                        capture_output=True,
                        timeout=2
                    )

                    if result.returncode == 0:
                        logger.info(f"Copied command to clipboard using xclip: {command}")

                        if self.app:
                            self.app.notify(
                                f"Copied '{command}' to clipboard. Paste in Claude Code to execute.",
                                severity="information",
                                timeout=5
                            )
                        return True

                except (FileNotFoundError, subprocess.TimeoutExpired):
                    # xclip not available, try xsel
                    try:
                        result = subprocess.run(
                            ["xsel", "--clipboard", "--input"],
                            input=command,
                            text=True,
                            capture_output=True,
                            timeout=2
                        )

                        if result.returncode == 0:
                            logger.info(f"Copied command to clipboard using xsel: {command}")

                            if self.app:
                                self.app.notify(
                                    f"Copied '{command}' to clipboard. Paste in Claude Code to execute.",
                                    severity="information",
                                    timeout=5
                                )
                            return True

                    except (FileNotFoundError, subprocess.TimeoutExpired):
                        pass

                # All clipboard methods failed
                error_msg = "Clipboard unavailable. Install pyperclip, xclip, or xsel."
                logger.error(error_msg)

                if self.app:
                    self.app.notify(
                        f"Clipboard unavailable. Command: {command}",
                        severity="error",
                        timeout=5
                    )
                return False

        except Exception as e:
            error_msg = f"Failed to copy command: {str(e)}"
            logger.error(error_msg)
            if self.app:
                self.app.notify(
                    f"Command copy failed: {str(e)}",
                    severity="error",
                    timeout=5
                )
            return False

    def cleanup(self) -> None:
        """Clean up resources (no-op for clipboard-based approach)."""
        # No subprocess to clean up anymore
        pass
