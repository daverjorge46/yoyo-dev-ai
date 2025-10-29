"""
EditorLauncher Service - Opens files in external editor.

Provides:
- Editor detection from $EDITOR environment variable
- Fallback to config.yml editor setting
- Support for --goto flag for jumping to specific line
- Common editor patterns (code, vim, nano, emacs, etc.)
"""

import os
import subprocess
import logging
from pathlib import Path
from typing import Optional, Tuple
from dataclasses import dataclass

logger = logging.getLogger(__name__)


@dataclass
class EditorConfig:
    """Editor configuration."""
    command: str
    goto_format: str  # Format string for line jumping (e.g., "--goto {file}:{line}")
    supports_goto: bool = True


# Common editor configurations
EDITOR_CONFIGS = {
    'code': EditorConfig(command='code', goto_format='--goto {file}:{line}', supports_goto=True),
    'cursor': EditorConfig(command='cursor', goto_format='--goto {file}:{line}', supports_goto=True),
    'subl': EditorConfig(command='subl', goto_format='{file}:{line}', supports_goto=True),
    'sublime': EditorConfig(command='subl', goto_format='{file}:{line}', supports_goto=True),
    'vim': EditorConfig(command='vim', goto_format='+{line} {file}', supports_goto=True),
    'nvim': EditorConfig(command='nvim', goto_format='+{line} {file}', supports_goto=True),
    'nano': EditorConfig(command='nano', goto_format='+{line} {file}', supports_goto=True),
    'emacs': EditorConfig(command='emacs', goto_format='+{line} {file}', supports_goto=True),
    'atom': EditorConfig(command='atom', goto_format='{file}:{line}', supports_goto=True),
}


class EditorLauncher:
    """
    Launches external editor to open files.

    Detects editor from $EDITOR environment variable or config.yml.
    Supports line jumping for most common editors.
    """

    def __init__(self, config_editor: Optional[str] = None):
        """
        Initialize EditorLauncher.

        Args:
            config_editor: Editor from config.yml (optional)
        """
        self.config_editor = config_editor
        self.editor_config = self._detect_editor()

        if self.editor_config:
            logger.info(f"EditorLauncher initialized with: {self.editor_config.command}")
        else:
            logger.warning("No editor detected - editor launching will be disabled")

    def _detect_editor(self) -> Optional[EditorConfig]:
        """
        Detect editor from $EDITOR or config.

        Returns:
            EditorConfig if editor detected, None otherwise
        """
        # Try $EDITOR environment variable first
        editor_env = os.environ.get('EDITOR', '').strip()
        if editor_env:
            editor_name = Path(editor_env).name  # Extract basename (e.g., /usr/bin/vim -> vim)
            if editor_name in EDITOR_CONFIGS:
                return EDITOR_CONFIGS[editor_name]
            else:
                # Unknown editor - create basic config without goto support
                logger.debug(f"Unknown editor from $EDITOR: {editor_name}, using basic config")
                return EditorConfig(
                    command=editor_env,
                    goto_format='{file}',
                    supports_goto=False
                )

        # Try config editor
        if self.config_editor:
            editor_name = Path(self.config_editor).name
            if editor_name in EDITOR_CONFIGS:
                return EDITOR_CONFIGS[editor_name]
            else:
                # Unknown editor - create basic config
                return EditorConfig(
                    command=self.config_editor,
                    goto_format='{file}',
                    supports_goto=False
                )

        # No editor detected
        return None

    def open_file(self, file_path: Path, line: Optional[int] = None) -> bool:
        """
        Open file in editor, optionally jumping to specific line.

        Args:
            file_path: Path to file to open
            line: Optional line number to jump to

        Returns:
            True if editor launched successfully, False otherwise
        """
        if not self.editor_config:
            logger.warning("No editor configured - cannot open file")
            return False

        if not file_path.exists():
            logger.warning(f"File does not exist: {file_path}")
            return False

        try:
            # Build command
            if line and self.editor_config.supports_goto:
                # Use goto format
                goto_arg = self.editor_config.goto_format.format(
                    file=str(file_path),
                    line=line
                )

                # Handle different goto formats
                if '--goto' in self.editor_config.goto_format:
                    # VS Code style: code --goto file:line
                    cmd = [self.editor_config.command, goto_arg]
                elif '+' in self.editor_config.goto_format:
                    # Vim style: vim +line file
                    cmd = [self.editor_config.command, f'+{line}', str(file_path)]
                else:
                    # Generic style: editor file:line
                    cmd = [self.editor_config.command, goto_arg]
            else:
                # Just open file without line jumping
                cmd = [self.editor_config.command, str(file_path)]

            logger.debug(f"Launching editor: {' '.join(cmd)}")

            # Launch editor in background (don't wait)
            subprocess.Popen(
                cmd,
                stdout=subprocess.DEVNULL,
                stderr=subprocess.DEVNULL,
                start_new_session=True  # Detach from terminal
            )

            return True

        except Exception as e:
            logger.error(f"Failed to launch editor: {e}")
            return False

    def parse_file_location(self, location: str) -> Tuple[Optional[Path], Optional[int]]:
        """
        Parse file location string (e.g., "path/to/file.py:42").

        Args:
            location: File location string (file or file:line)

        Returns:
            Tuple of (file_path, line_number)
        """
        if ':' in location:
            parts = location.rsplit(':', 1)
            try:
                file_path = Path(parts[0])
                line_num = int(parts[1])
                return (file_path, line_num)
            except (ValueError, IndexError):
                # Invalid line number
                return (Path(location), None)
        else:
            return (Path(location), None)

    def is_available(self) -> bool:
        """Check if editor is available."""
        return self.editor_config is not None

    def get_editor_name(self) -> str:
        """Get name of detected editor."""
        if self.editor_config:
            return self.editor_config.command
        return "None"
