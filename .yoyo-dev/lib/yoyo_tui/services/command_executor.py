"""
CommandExecutor Service

Handles execution of Yoyo Dev commands by copying them to clipboard.
This integrates the TUI with Claude Code's command execution system.
"""

import pyperclip
from typing import Optional
import logging

logger = logging.getLogger(__name__)


class CommandExecutor:
    """
    Execute Yoyo Dev commands by copying them to clipboard.

    This service integrates the TUI with Claude Code by:
    - Copying command text to system clipboard
    - Providing execution feedback via app notifications
    - User pastes command into Claude Code

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
            # Copy command to clipboard
            pyperclip.copy(command)

            # Notify user that command was copied (with clear instructions)
            if self.app:
                self.app.notify(
                    f"✓ Copied to clipboard! Paste into Claude Code to execute:\n{command}",
                    severity="information",
                    timeout=6
                )

            logger.info(f"Successfully copied command to clipboard: {command}")
            return True

        except pyperclip.PyperclipException as e:
            # Clipboard-specific error - fallback to displaying command
            error_msg = f"Clipboard unavailable: {str(e)}"
            logger.warning(error_msg)
            if self.app:
                self.app.notify(
                    f"Clipboard unavailable - copy manually:\n{command}",
                    severity="warning",
                    timeout=6
                )
            return False

        except Exception as e:
            # Generic error handling
            error_msg = f"Failed to copy command: {str(e)}"
            logger.error(error_msg)
            if self.app:
                self.app.notify(
                    f"Command copy failed - copy manually:\n{command}",
                    severity="error",
                    timeout=6
                )
            return False

    def cleanup(self) -> None:
        """Clean up resources (no-op for clipboard-based executor)."""
        # No resources to clean up when using clipboard
        pass
