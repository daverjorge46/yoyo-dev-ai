"""
Split View Manager - Orchestrates the integrated Claude Code + TUI split view.

This module provides the main orchestration layer for the split view feature,
managing the complete lifecycle including:
- Claude Code detection
- Pane creation and lifecycle
- Main event loop with I/O multiplexing
- Keyboard shortcut handling
- Terminal resize handling
- Graceful shutdown
"""

import os
import sys
import signal
import select
import shutil
import time
import logging
from dataclasses import dataclass, field
from typing import Optional, List

from .terminal_control import TerminalController
from .layout import LayoutManager
from .focus import FocusManager
from .pane import Pane, PaneBounds


@dataclass
class BorderStyle:
    """Visual styling for pane borders."""
    active: str = "bright_cyan"         # ANSI color for active pane
    inactive: str = "dim_white"         # ANSI color for inactive pane
    char_vertical: str = "│"
    char_horizontal: str = "─"
    char_top_left: str = "┌"
    char_top_right: str = "┐"
    char_bottom_left: str = "└"
    char_bottom_right: str = "┘"


@dataclass
class KeyboardShortcuts:
    """Keyboard shortcuts for split view control."""
    switch_focus: bytes = b'\x02\x1b[C'  # Ctrl+B →
    resize_left: bytes = b'\x02<'        # Ctrl+B <
    resize_right: bytes = b'\x02>'       # Ctrl+B >


@dataclass
class ClaudeConfig:
    """Configuration for Claude Code integration."""
    command: str = "claude"
    fallback_delay: int = 3  # seconds


@dataclass
class SplitViewConfig:
    """Configuration for split view behavior."""
    enabled: bool = True
    ratio: float = 0.4                  # 0.0-1.0 (left pane ratio)
    active_pane: str = "claude"         # "claude", "tui", or "shell"
    use_shell: bool = False             # Use terminal shell instead of Claude
    border_style: BorderStyle = field(default_factory=BorderStyle)
    shortcuts: KeyboardShortcuts = field(default_factory=KeyboardShortcuts)
    claude: ClaudeConfig = field(default_factory=ClaudeConfig)


class SplitViewManager:
    """
    Orchestrates the entire split view lifecycle.

    Manages:
    - Claude Code detection and fallback
    - Terminal setup and cleanup
    - Pane creation and lifecycle
    - Main event loop with I/O multiplexing
    - Keyboard shortcuts and terminal resize
    - Graceful shutdown
    """

    def __init__(self, config: SplitViewConfig):
        """
        Initialize the split view manager.

        Args:
            config: Split view configuration
        """
        self.config = config
        self.term_controller = TerminalController()
        self.layout_manager = LayoutManager()
        self.focus_manager = FocusManager()
        self.claude_pane: Optional[Pane] = None
        self.tui_pane: Optional[Pane] = None
        self.running = False
        self._last_resize_time = 0.0
        self._resize_debounce_threshold = 0.1  # 100ms debounce

        # Setup logging
        self.logger = logging.getLogger('split_view')
        if not self.logger.handlers:
            handler = logging.StreamHandler()
            handler.setFormatter(logging.Formatter(
                '%(asctime)s - %(name)s - %(levelname)s - %(message)s'
            ))
            self.logger.addHandler(handler)
            self.logger.setLevel(logging.INFO)

    def launch(self) -> int:
        """
        Main entry point for split view.

        Returns:
            Exit code (0 for success, non-zero for error)

        Steps:
        1. Check if running in a TTY
        2. Detect Claude Code availability
        3. Setup terminal (alt screen, raw mode)
        4. Create panes (Claude + TUI)
        5. Run main event loop
        6. Cleanup on exit
        """
        try:
            # Check if stdin is a TTY (required for split view)
            if not sys.stdin.isatty():
                self.logger.info("Not running in a TTY, falling back to TUI only")
                return self._launch_fallback_silent()

            # Claude Code detection (skip if using shell mode)
            if not self.config.use_shell and not self._detect_claude():
                return self._launch_fallback()

            # Terminal setup
            self.term_controller.enter_alt_screen()
            self.term_controller.clear_screen()

            # Create panes
            self._create_panes()

            # Setup signal handlers
            signal.signal(signal.SIGWINCH, self._handle_resize)

            # Main loop
            return self._main_loop()

        finally:
            self._cleanup()

    def _detect_claude(self) -> bool:
        """
        Check if Claude Code is installed.

        Returns:
            True if claude command is available in PATH, False otherwise
        """
        return shutil.which(self.config.claude.command) is not None

    def _launch_fallback(self) -> int:
        """
        Show message and launch TUI only when Claude not found.

        Returns:
            Exit code from TUI
        """
        self._show_claude_not_found_message()
        time.sleep(self.config.claude.fallback_delay)

        # Launch TUI normally
        from lib.yoyo_tui_v3.cli import launch_tui_only
        return launch_tui_only()

    def _launch_fallback_silent(self) -> int:
        """
        Launch TUI only without showing message (for non-TTY contexts).

        Returns:
            Exit code from TUI
        """
        from lib.yoyo_tui_v3.cli import launch_tui_only
        return launch_tui_only()

    def _show_claude_not_found_message(self):
        """Display formatted message when Claude Code is not found."""
        print("""
╔═══════════════════════════════════════════════════════════╗
║ ⚠️  Claude Code Not Found                                 ║
╠═══════════════════════════════════════════════════════════╣
║                                                           ║
║ Claude Code CLI is not installed or not in PATH.         ║
║                                                           ║
║ To install Claude Code:                                  ║
║ https://github.com/anthropics/claude-code                ║
║                                                           ║
║ After installation, run 'yoyo' again for split view     ║
║                                                           ║
║ To suppress this message: yoyo --no-split               ║
║                                                           ║
║ [Launching TUI in 3 seconds...]                          ║
╚═══════════════════════════════════════════════════════════╝
        """)

    def _create_panes(self):
        """
        Initialize both panes with calculated bounds.

        Creates Claude pane (left) and TUI pane (right) with appropriate
        dimensions based on terminal size and split ratio.
        """
        term_width, term_height = os.get_terminal_size()
        self.logger.info(f"Creating panes with terminal size: {term_width}x{term_height}")

        # Calculate split (will raise ValueError if terminal too small)
        try:
            claude_bounds, tui_bounds = self.layout_manager.calculate_split(
                width=term_width,
                height=term_height,
                ratio=self.config.ratio
            )
        except ValueError as e:
            self.logger.error(f"Failed to calculate split: {e}")
            raise

        # Create left pane (Claude Code or Shell based on config)
        if self.config.use_shell:
            # Use user's default shell or fallback to bash
            shell_cmd = os.environ.get('SHELL', '/bin/bash')
            left_cmd = [shell_cmd]
            left_name = "Shell"
            self.logger.info(f"Using shell mode with: {shell_cmd}")
        else:
            # Use Claude Code (automatically uses current directory)
            left_cmd = [self.config.claude.command]
            left_name = "Claude Code"

        self.claude_pane = Pane(
            command=left_cmd,
            bounds=claude_bounds,
            name=left_name
        )

        # Create TUI pane
        self.tui_pane = Pane(
            command=["python3", "-m", "lib.yoyo_tui_v3.cli", "--no-split"],
            bounds=tui_bounds,
            name="Yoyo TUI"
        )

        # Start both processes
        self.logger.info("Starting pane processes")
        self.claude_pane.start()
        self.tui_pane.start()

        # Set panes list for focus manager
        self.focus_manager.panes = [self.claude_pane, self.tui_pane]

        # Set initial focus (with validation)
        if self.config.active_pane == "tui":
            initial_pane = self.tui_pane
        else:
            # Default to claude for invalid values
            initial_pane = self.claude_pane

        self.focus_manager.set_active(initial_pane)
        self.logger.info(f"Initial focus set to: {initial_pane.name}")

    def _main_loop(self) -> int:
        """
        Main event loop: route input, render output.

        Uses select() for non-blocking I/O on:
        - stdin (user keyboard input)
        - claude_pane.pty (Claude output)
        - tui_pane.pty (TUI output)

        Returns:
            Exit code (0 for success)
        """
        self.running = True

        while self.running:
            # Setup file descriptors for select()
            read_fds = []

            # Add stdin
            read_fds.append(sys.stdin)

            # Add pane fds if available
            if self.claude_pane and self.claude_pane.fd is not None:
                read_fds.append(self.claude_pane.fd)
            if self.tui_pane and self.tui_pane.fd is not None:
                read_fds.append(self.tui_pane.fd)

            try:
                readable, _, _ = select.select(read_fds, [], [], 0.1)
            except (ValueError, OSError):
                # File descriptors may have been closed
                break

            for fd in readable:
                if fd == sys.stdin:
                    # User input - route to active pane
                    try:
                        data = os.read(sys.stdin.fileno(), 1024)
                    except OSError:
                        continue

                    # Check for special shortcuts
                    if self._is_shortcut(data):
                        self._handle_shortcut(data)
                    else:
                        # Forward to active pane
                        active_pane = self.focus_manager.get_active()
                        if active_pane:
                            active_pane.write(data)

                elif fd == self.claude_pane.fd:
                    # Claude output - render to Claude pane area
                    data = self.claude_pane.read()
                    if data:
                        self._render_pane_output(self.claude_pane, data)

                elif fd == self.tui_pane.fd:
                    # TUI output - render to TUI pane area
                    data = self.tui_pane.read()
                    if data:
                        self._render_pane_output(self.tui_pane, data)

            # Check if panes are still alive
            if not self.claude_pane.is_alive() and not self.tui_pane.is_alive():
                self.running = False

        return 0

    def _is_shortcut(self, data: bytes) -> bool:
        """
        Check if input matches keyboard shortcut.

        Args:
            data: Input bytes from stdin

        Returns:
            True if data starts with Ctrl+B prefix, False otherwise
        """
        # Ctrl+B = \x02
        return data.startswith(b'\x02')

    def _handle_shortcut(self, data: bytes):
        """
        Handle keyboard shortcuts.

        Args:
            data: Shortcut bytes from stdin

        Supported shortcuts:
        - Ctrl+B → : Switch focus between panes
        - Ctrl+B < : Shrink left pane / grow right pane
        - Ctrl+B > : Grow left pane / shrink right pane
        """
        if data == self.config.shortcuts.switch_focus:  # Ctrl+B →
            self.focus_manager.toggle()
            self._render_borders()

        elif data == self.config.shortcuts.resize_left:  # Ctrl+B <
            # Shrink Claude pane (negative delta)
            new_left, new_right = self.layout_manager.resize_pane(
                self.claude_pane.bounds,
                self.tui_pane.bounds,
                delta=-5
            )
            self.claude_pane.resize(new_left)
            self.tui_pane.resize(new_right)
            self._rerender_all()

        elif data == self.config.shortcuts.resize_right:  # Ctrl+B >
            # Grow Claude pane (positive delta)
            new_left, new_right = self.layout_manager.resize_pane(
                self.claude_pane.bounds,
                self.tui_pane.bounds,
                delta=5
            )
            self.claude_pane.resize(new_left)
            self.tui_pane.resize(new_right)
            self._rerender_all()

    def _should_process_resize(self) -> bool:
        """
        Check if resize event should be processed (debouncing).

        Returns:
            True if enough time has passed since last resize
        """
        current_time = time.time()
        elapsed = current_time - self._last_resize_time

        if elapsed >= self._resize_debounce_threshold:
            self._last_resize_time = current_time
            return True
        return False

    def _handle_resize(self, signum, frame):
        """
        Handle terminal resize (SIGWINCH) with debouncing.

        Args:
            signum: Signal number
            frame: Current stack frame
        """
        # Debounce rapid resize events
        if not self._should_process_resize():
            self.logger.debug("Resize event debounced")
            return

        try:
            term_width, term_height = os.get_terminal_size()
            self.logger.info(f"Terminal resized to: {term_width}x{term_height}")
        except OSError as e:
            # Can't get terminal size, skip resize
            self.logger.error(f"Failed to get terminal size during resize: {e}")
            return

        # Recalculate layout
        try:
            claude_bounds, tui_bounds = self.layout_manager.calculate_split(
                width=term_width,
                height=term_height,
                ratio=self.config.ratio
            )
        except ValueError as e:
            # Terminal too small, skip resize gracefully
            self.logger.warning(f"Terminal too small for resize, ignoring: {e}")
            return

        # Resize panes (this updates pane.bounds internally)
        if self.claude_pane:
            self.claude_pane.resize(claude_bounds)
        if self.tui_pane:
            self.tui_pane.resize(tui_bounds)

        self.logger.debug("Panes resized successfully")

        # Re-render everything
        self._rerender_all()

    def _render_pane_output(self, pane: Pane, data: bytes):
        """
        Render pane output in its designated area.

        Args:
            pane: Pane that produced the output
            data: Output bytes to render
        """
        # Move cursor to pane area
        self.term_controller.move_cursor(pane.bounds.y, pane.bounds.x)

        # Write output (already constrained by pty size)
        sys.stdout.buffer.write(data)
        sys.stdout.buffer.flush()

    def _render_borders(self):
        """Draw borders around panes with appropriate styling."""
        for pane in [self.claude_pane, self.tui_pane]:
            is_active = (pane == self.focus_manager.get_active())
            color = (self.config.border_style.active if is_active
                    else self.config.border_style.inactive)

            self.term_controller.draw_border(pane.bounds, color)

    def _rerender_all(self):
        """Clear and re-render entire screen."""
        self.term_controller.clear_screen()
        self._render_borders()
        # Panes will re-render themselves on next output

    def _check_pane_health(self) -> dict:
        """
        Monitor pane health and return status.

        Returns:
            Dictionary with pane health status
        """
        claude_alive = self.claude_pane.is_alive() if self.claude_pane else False
        tui_alive = self.tui_pane.is_alive() if self.tui_pane else False

        status = {
            'claude_alive': claude_alive,
            'tui_alive': tui_alive,
            'both_alive': claude_alive and tui_alive
        }

        # Log pane deaths
        if self.claude_pane and not claude_alive:
            self.logger.error("Claude pane process has died")
        if self.tui_pane and not tui_alive:
            self.logger.error("TUI pane process has died")

        return status

    def _display_pane_error(self, pane: Pane, error_message: str):
        """
        Display error message in pane area.

        Args:
            pane: Pane where error occurred
            error_message: Error message to display
        """
        self.logger.error(f"Pane error in {pane.name}: {error_message}")

        # Move cursor to pane area (centered vertically)
        center_y = pane.bounds.y + (pane.bounds.height // 2)
        center_x = pane.bounds.x + 2

        self.term_controller.move_cursor(center_y, center_x)

        # Display formatted error message
        error_text = f"[ERROR] {pane.name}: {error_message}"
        sys.stdout.buffer.write(error_text.encode('utf-8'))
        sys.stdout.buffer.flush()

    def _cleanup(self):
        """Shutdown split view gracefully."""
        self.logger.info("Cleaning up split view")

        # Terminate panes
        if self.claude_pane:
            self.logger.debug("Terminating Claude pane")
            self.claude_pane.terminate()
        if self.tui_pane:
            self.logger.debug("Terminating TUI pane")
            self.tui_pane.terminate()

        # Restore terminal
        self.term_controller.exit_alt_screen()
        self.term_controller.show_cursor()

        self.logger.info("Split view cleanup complete")


# Export main classes
__all__ = [
    'SplitViewManager',
    'SplitViewConfig',
    'BorderStyle',
    'KeyboardShortcuts',
    'ClaudeConfig'
]
