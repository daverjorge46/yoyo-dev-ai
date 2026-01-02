# Technical Specification: Integrated Claude Code + TUI Split View

**Created:** 2025-11-05
**Version:** 1.0

## Architecture

### High-Level Design

```
┌─────────────────────────────────────────────────────────────┐
│                    yoyo Command Entry Point                 │
│                      (bin/yoyo or CLI)                      │
└────────────────────────────┬────────────────────────────────┘
                             │
                             ▼
                    ┌─────────────────┐
                    │ SplitViewManager│
                    │  (orchestrator)  │
                    └────────┬─────────┘
                             │
                ┌────────────┴────────────┐
                ▼                         ▼
        ┌───────────────┐         ┌──────────────┐
        │  Claude Pane  │         │   TUI Pane   │
        │   (pty + I/O) │         │(Textual App) │
        └───────────────┘         └──────────────┘
                │                         │
                ▼                         ▼
        ┌───────────────┐         ┌──────────────┐
        │ Claude Process│         │ Yoyo TUI App │
        │  (subprocess) │         │  (existing)  │
        └───────────────┘         └──────────────┘
```

### Component Diagram

```
lib/yoyo_tui_v3/split_view/
│
├── manager.py
│   └── SplitViewManager
│       ├── launch()                    # Entry point
│       ├── _setup_terminal()          # Initialize terminal
│       ├── _create_panes()            # Create Claude + TUI panes
│       ├── _main_loop()               # Event loop (input routing)
│       ├── _handle_resize()           # SIGWINCH handler
│       └── _cleanup()                 # Shutdown both panes
│
├── pane.py
│   └── Pane
│       ├── __init__(command, bounds)
│       ├── start()                    # Spawn process in pty
│       ├── write(data)                # Send input to pane
│       ├── read()                     # Read output from pane
│       ├── resize(rows, cols)         # Resize pty
│       ├── is_alive()                 # Check process status
│       └── terminate()                # Kill process
│
├── layout.py
│   └── LayoutManager
│       ├── calculate_split(ratio)     # Calculate pane dimensions
│       ├── apply_layout(panes)        # Position panes on screen
│       ├── resize_pane(pane, delta)   # Adjust pane size
│       └── validate_minimum_size()    # Ensure terminal is large enough
│
├── focus.py
│   └── FocusManager
│       ├── set_active(pane)           # Mark pane as active
│       ├── get_active()               # Get current active pane
│       ├── toggle()                   # Switch between panes
│       └── render_indicators(panes)   # Draw borders/highlights
│
└── terminal_control.py
    └── TerminalController
        ├── enter_alt_screen()         # Switch to alternate screen
        ├── exit_alt_screen()          # Restore normal screen
        ├── clear_screen()             # Clear display
        ├── move_cursor(row, col)      # Position cursor
        ├── draw_border(bounds, style) # Draw pane border
        ├── set_color(color)           # Set foreground color
        └── hide_cursor() / show_cursor()
```

## Data Models

### Pane Bounds

```python
@dataclass
class PaneBounds:
    """Defines rectangular area for a pane"""
    x: int        # Left column (0-indexed)
    y: int        # Top row (0-indexed)
    width: int    # Width in columns
    height: int   # Height in rows
```

### Split View Config

```python
@dataclass
class SplitViewConfig:
    """Configuration for split view behavior"""
    enabled: bool = True
    ratio: float = 0.4                  # 0.0-1.0 (left pane ratio)
    active_pane: str = "claude"         # "claude" or "tui"
    border_style: BorderStyle = ...
    shortcuts: KeyboardShortcuts = ...
    claude: ClaudeConfig = ...
```

### Border Style

```python
@dataclass
class BorderStyle:
    """Visual styling for pane borders"""
    active: str = "bright_cyan"         # ANSI color for active pane
    inactive: str = "dim_white"         # ANSI color for inactive pane
    char_vertical: str = "│"
    char_horizontal: str = "─"
    char_top_left: str = "┌"
    char_top_right: str = "┐"
    char_bottom_left: str = "└"
    char_bottom_right: str = "┘"
```

## Core Components

### 1. SplitViewManager

**Responsibility:** Orchestrate the entire split view lifecycle

**Key Methods:**

```python
class SplitViewManager:
    def __init__(self, config: SplitViewConfig):
        self.config = config
        self.term_controller = TerminalController()
        self.layout_manager = LayoutManager()
        self.focus_manager = FocusManager()
        self.claude_pane: Optional[Pane] = None
        self.tui_pane: Optional[Pane] = None
        self.running = False

    def launch(self) -> int:
        """
        Main entry point. Returns exit code.

        Steps:
        1. Detect Claude Code availability
        2. Load layout config
        3. Setup terminal (alt screen, raw mode)
        4. Create panes (Claude + TUI)
        5. Run main event loop
        6. Cleanup on exit
        """
        try:
            # Claude Code detection
            if not self._detect_claude():
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
        """Check if Claude Code is installed"""
        return shutil.which("claude") is not None

    def _launch_fallback(self) -> int:
        """Show message and launch TUI only"""
        self._show_claude_not_found_message()
        time.sleep(self.config.claude.fallback_delay)
        # Launch TUI normally
        from lib.yoyo_tui_v3.main import run_tui
        return run_tui()

    def _create_panes(self):
        """Initialize both panes with calculated bounds"""
        term_width, term_height = os.get_terminal_size()

        # Calculate split
        claude_bounds, tui_bounds = self.layout_manager.calculate_split(
            width=term_width,
            height=term_height,
            ratio=self.config.ratio
        )

        # Create Claude pane
        self.claude_pane = Pane(
            command=["claude", "--cwd", os.getcwd()],
            bounds=claude_bounds,
            name="Claude Code"
        )

        # Create TUI pane
        self.tui_pane = Pane(
            command=["python3", "-m", "lib.yoyo_tui_v3.main"],
            bounds=tui_bounds,
            name="Yoyo TUI"
        )

        # Start both processes
        self.claude_pane.start()
        self.tui_pane.start()

        # Set initial focus
        initial_pane = (self.claude_pane if self.config.active_pane == "claude"
                       else self.tui_pane)
        self.focus_manager.set_active(initial_pane)

    def _main_loop(self) -> int:
        """
        Main event loop: route input, render output

        Uses select() for non-blocking I/O on:
        - stdin (user keyboard input)
        - claude_pane.pty (Claude output)
        - tui_pane.pty (TUI output)
        """
        self.running = True

        while self.running:
            # Setup file descriptors for select()
            read_fds = [sys.stdin, self.claude_pane.fd, self.tui_pane.fd]

            readable, _, _ = select.select(read_fds, [], [], 0.1)

            for fd in readable:
                if fd == sys.stdin:
                    # User input - route to active pane
                    data = os.read(fd.fileno(), 1024)

                    # Check for special shortcuts
                    if self._is_shortcut(data):
                        self._handle_shortcut(data)
                    else:
                        # Forward to active pane
                        active_pane = self.focus_manager.get_active()
                        active_pane.write(data)

                elif fd == self.claude_pane.fd:
                    # Claude output - render to Claude pane area
                    data = self.claude_pane.read()
                    self._render_pane_output(self.claude_pane, data)

                elif fd == self.tui_pane.fd:
                    # TUI output - render to TUI pane area
                    data = self.tui_pane.read()
                    self._render_pane_output(self.tui_pane, data)

            # Check if panes are still alive
            if not self.claude_pane.is_alive() and not self.tui_pane.is_alive():
                self.running = False

        return 0

    def _is_shortcut(self, data: bytes) -> bool:
        """Check if input matches keyboard shortcut"""
        # Ctrl+B = \x02
        return data.startswith(b'\x02')

    def _handle_shortcut(self, data: bytes):
        """Handle keyboard shortcuts"""
        if data == b'\x02\x1b[C':  # Ctrl+B →
            self.focus_manager.toggle()
            self._render_borders()
        elif data == b'\x02<':      # Ctrl+B <
            self.layout_manager.resize_pane(self.claude_pane, delta=5)
            self._rerender_all()
        elif data == b'\x02>':      # Ctrl+B >
            self.layout_manager.resize_pane(self.tui_pane, delta=5)
            self._rerender_all()

    def _handle_resize(self, signum, frame):
        """Handle terminal resize (SIGWINCH)"""
        term_width, term_height = os.get_terminal_size()

        # Recalculate layout
        claude_bounds, tui_bounds = self.layout_manager.calculate_split(
            width=term_width,
            height=term_height,
            ratio=self.config.ratio
        )

        # Resize panes
        self.claude_pane.resize(claude_bounds)
        self.tui_pane.resize(tui_bounds)

        # Re-render everything
        self._rerender_all()

    def _render_pane_output(self, pane: Pane, data: bytes):
        """Render pane output in its designated area"""
        # Move cursor to pane area
        self.term_controller.move_cursor(pane.bounds.y, pane.bounds.x)

        # Write output (already constrained by pty size)
        sys.stdout.buffer.write(data)
        sys.stdout.buffer.flush()

    def _render_borders(self):
        """Draw borders around panes with appropriate styling"""
        for pane in [self.claude_pane, self.tui_pane]:
            is_active = (pane == self.focus_manager.get_active())
            style = (self.config.border_style.active if is_active
                    else self.config.border_style.inactive)

            self.term_controller.draw_border(pane.bounds, style)

    def _rerender_all(self):
        """Clear and re-render entire screen"""
        self.term_controller.clear_screen()
        self._render_borders()
        # Panes will re-render themselves on next output

    def _cleanup(self):
        """Shutdown split view gracefully"""
        # Terminate panes
        if self.claude_pane:
            self.claude_pane.terminate()
        if self.tui_pane:
            self.tui_pane.terminate()

        # Restore terminal
        self.term_controller.exit_alt_screen()
        self.term_controller.show_cursor()
```

### 2. Pane

**Responsibility:** Manage a single pane (process + pty + I/O)

```python
class Pane:
    def __init__(self, command: List[str], bounds: PaneBounds, name: str):
        self.command = command
        self.bounds = bounds
        self.name = name
        self.process: Optional[subprocess.Popen] = None
        self.master_fd: Optional[int] = None

    def start(self):
        """Spawn process in pseudo-terminal"""
        pid, master_fd = pty.fork()

        if pid == 0:
            # Child process - exec command
            os.execvp(self.command[0], self.command)
        else:
            # Parent process - keep master fd
            self.master_fd = master_fd
            self.process = psutil.Process(pid)

            # Set pty size
            self._set_pty_size()

    def _set_pty_size(self):
        """Set pty window size to match pane bounds"""
        import fcntl
        import termios
        import struct

        # TIOCSWINSZ - set window size
        winsize = struct.pack('HHHH',
                             self.bounds.height,
                             self.bounds.width,
                             0, 0)
        fcntl.ioctl(self.master_fd, termios.TIOCSWINSZ, winsize)

    def write(self, data: bytes):
        """Send input to pane's process"""
        if self.master_fd:
            os.write(self.master_fd, data)

    def read(self, size: int = 1024) -> bytes:
        """Read output from pane's process (non-blocking)"""
        if self.master_fd:
            try:
                return os.read(self.master_fd, size)
            except OSError:
                return b''
        return b''

    @property
    def fd(self) -> int:
        """Get file descriptor for select()"""
        return self.master_fd

    def is_alive(self) -> bool:
        """Check if process is still running"""
        return self.process and self.process.is_running()

    def resize(self, new_bounds: PaneBounds):
        """Update pane bounds and pty size"""
        self.bounds = new_bounds
        self._set_pty_size()

    def terminate(self):
        """Kill the pane's process"""
        if self.process and self.process.is_running():
            self.process.terminate()
            self.process.wait(timeout=5)

        if self.master_fd:
            os.close(self.master_fd)
```

### 3. LayoutManager

**Responsibility:** Calculate pane dimensions and positions

```python
class LayoutManager:
    MIN_WIDTH = 120
    MIN_HEIGHT = 30
    BORDER_WIDTH = 1

    def calculate_split(self, width: int, height: int, ratio: float) -> Tuple[PaneBounds, PaneBounds]:
        """
        Calculate bounds for left and right panes

        Args:
            width: Terminal width in columns
            height: Terminal height in rows
            ratio: Fraction of width for left pane (0.0-1.0)

        Returns:
            (left_bounds, right_bounds)
        """
        # Validate minimum size
        if width < self.MIN_WIDTH or height < self.MIN_HEIGHT:
            raise ValueError(f"Terminal too small. Minimum {self.MIN_WIDTH}x{self.MIN_HEIGHT}")

        # Calculate split point
        split_col = int(width * ratio)

        # Left pane (Claude)
        left = PaneBounds(
            x=0,
            y=0,
            width=split_col - self.BORDER_WIDTH,
            height=height
        )

        # Right pane (TUI)
        right = PaneBounds(
            x=split_col + self.BORDER_WIDTH,
            y=0,
            width=width - split_col - self.BORDER_WIDTH,
            height=height
        )

        return left, right

    def resize_pane(self, pane: Pane, delta: int):
        """Adjust pane width by delta columns"""
        # Note: Would need to track both panes to redistribute space
        # Implementation depends on whether we store pane references
        pass

    def validate_minimum_size(self) -> bool:
        """Check if terminal meets minimum size requirements"""
        width, height = os.get_terminal_size()
        return width >= self.MIN_WIDTH and height >= self.MIN_HEIGHT
```

### 4. FocusManager

**Responsibility:** Track active pane and render visual indicators

```python
class FocusManager:
    def __init__(self):
        self.active_pane: Optional[Pane] = None
        self.panes: List[Pane] = []

    def set_active(self, pane: Pane):
        """Mark pane as active"""
        self.active_pane = pane

    def get_active(self) -> Pane:
        """Get currently active pane"""
        return self.active_pane

    def toggle(self):
        """Switch to the other pane"""
        if len(self.panes) == 2:
            current_idx = self.panes.index(self.active_pane)
            next_idx = (current_idx + 1) % 2
            self.active_pane = self.panes[next_idx]

    def render_indicators(self, term_controller: TerminalController, border_style: BorderStyle):
        """Draw borders with appropriate colors"""
        for pane in self.panes:
            is_active = (pane == self.active_pane)
            color = border_style.active if is_active else border_style.inactive

            term_controller.draw_border(pane.bounds, color)
```

### 5. TerminalController

**Responsibility:** Low-level terminal control via ANSI escape sequences

```python
class TerminalController:
    # ANSI Escape Sequences
    ESC = '\033'
    CSI = f'{ESC}['

    # Screen control
    ALT_SCREEN_ON = f'{CSI}?1049h'      # Enter alternate screen
    ALT_SCREEN_OFF = f'{CSI}?1049l'     # Exit alternate screen
    CLEAR_SCREEN = f'{CSI}2J'           # Clear entire screen

    # Cursor control
    HIDE_CURSOR = f'{CSI}?25l'
    SHOW_CURSOR = f'{CSI}?25h'

    # Colors (simplified)
    COLORS = {
        'bright_cyan': f'{CSI}1;36m',
        'dim_white': f'{CSI}2;37m',
        'reset': f'{CSI}0m'
    }

    def enter_alt_screen(self):
        """Switch to alternate screen buffer"""
        sys.stdout.write(self.ALT_SCREEN_ON)
        sys.stdout.flush()

    def exit_alt_screen(self):
        """Restore normal screen buffer"""
        sys.stdout.write(self.ALT_SCREEN_OFF)
        sys.stdout.flush()

    def clear_screen(self):
        """Clear entire screen"""
        sys.stdout.write(self.CLEAR_SCREEN)
        sys.stdout.flush()

    def move_cursor(self, row: int, col: int):
        """Move cursor to (row, col) - 1-indexed"""
        sys.stdout.write(f'{self.CSI}{row+1};{col+1}H')
        sys.stdout.flush()

    def set_color(self, color: str):
        """Set foreground color"""
        if color in self.COLORS:
            sys.stdout.write(self.COLORS[color])
            sys.stdout.flush()

    def hide_cursor(self):
        sys.stdout.write(self.HIDE_CURSOR)
        sys.stdout.flush()

    def show_cursor(self):
        sys.stdout.write(self.SHOW_CURSOR)
        sys.stdout.flush()

    def draw_border(self, bounds: PaneBounds, color: str):
        """Draw a border around the given bounds"""
        self.set_color(color)

        # Top border
        self.move_cursor(bounds.y, bounds.x)
        sys.stdout.write('┌' + '─' * (bounds.width - 2) + '┐')

        # Side borders
        for row in range(bounds.y + 1, bounds.y + bounds.height - 1):
            self.move_cursor(row, bounds.x)
            sys.stdout.write('│')
            self.move_cursor(row, bounds.x + bounds.width - 1)
            sys.stdout.write('│')

        # Bottom border
        self.move_cursor(bounds.y + bounds.height - 1, bounds.x)
        sys.stdout.write('└' + '─' * (bounds.width - 2) + '┘')

        self.set_color('reset')
        sys.stdout.flush()
```

## Integration Points

### 1. Entry Point Modification

**File:** `bin/yoyo` or main CLI entry

```python
#!/usr/bin/env python3
"""Yoyo Dev CLI entry point"""

import sys
from lib.yoyo_tui_v3.split_view.manager import SplitViewManager
from lib.yoyo_tui_v3.services.layout_persistence import LayoutPersistence
from lib.yoyo_tui_v3.main import run_tui

def main():
    # Parse command-line arguments
    args = parse_args()

    if args.no_split:
        # Launch TUI only
        return run_tui()

    # Load config
    config = LayoutPersistence.load_config()

    if args.split_ratio:
        config.ratio = args.split_ratio
    if args.focus:
        config.active_pane = args.focus

    # Launch split view
    manager = SplitViewManager(config)
    return manager.launch()

if __name__ == "__main__":
    sys.exit(main())
```

### 2. Config Schema Extension

**File:** `.yoyo-dev/config.yml`

```yaml
# Existing config...

# New split view section
split_view:
  enabled: true
  ratio: 0.4
  active_pane: "claude"

  border_style:
    active: "bright_cyan"
    inactive: "dim_white"

  shortcuts:
    switch_focus: "ctrl+b+arrow"
    resize_left: "ctrl+b+<"
    resize_right: "ctrl+b+>"

  claude:
    command: "claude"
    auto_cwd: true
    fallback_delay: 3
```

### 3. TUI Independence

The Yoyo TUI should remain fully functional when launched in split view. No modifications needed to existing TUI code, as it will run in its own pty with constrained dimensions.

### 4. File Watcher Integration

Existing `FileWatcherService` will automatically work in split view mode. When Claude Code creates/modifies files, the file watcher detects changes and triggers TUI updates.

## Error Handling

### Terminal Too Small

```python
try:
    layout_manager.validate_minimum_size()
except ValueError as e:
    print(f"Error: {e}")
    print("Please resize your terminal to at least 120x30 characters")
    return 1
```

### Claude Code Not Found

```python
if not shutil.which("claude"):
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
    time.sleep(3)
    return run_tui()
```

### Pane Crash

```python
def _check_pane_health(self):
    """Monitor pane processes and handle crashes"""
    if not self.claude_pane.is_alive():
        # Show error in Claude pane area
        self._render_error_message(
            self.claude_pane.bounds,
            "Claude Code process exited. Press 'r' to restart or 'q' to quit."
        )

    if not self.tui_pane.is_alive():
        # TUI crashed - likely critical, exit split view
        self._cleanup()
        print("Error: Yoyo TUI crashed. Check logs for details.")
        return 1
```

## Performance Considerations

### 1. Event Loop Optimization

- Use `select()` with 100ms timeout to balance responsiveness and CPU usage
- Batch output rendering to reduce syscalls
- Debounce terminal resize events (100ms)

### 2. Memory Management

- Limit scroll buffer size per pane (e.g., 10,000 lines)
- Clean up closed panes promptly
- Monitor process memory usage

### 3. Rendering Efficiency

- Only redraw changed regions
- Use double buffering for smooth updates
- Minimize escape sequence overhead

## Security Considerations

### 1. Command Injection

- Never construct shell commands from user input
- Use `subprocess` with argument lists, not shell strings
- Validate command paths before execution

### 2. PTY Security

- Set appropriate permissions on pty devices
- Clear sensitive data from pty buffers on exit
- Don't log raw terminal data (may contain passwords)

### 3. Configuration Safety

- Validate config.yml schema before loading
- Sanitize color values (prevent escape sequence injection)
- Limit ratio values to 0.1-0.9 range

## Testing Strategy

### Unit Tests

**LayoutManager:**
```python
def test_calculate_split_40_60():
    manager = LayoutManager()
    left, right = manager.calculate_split(width=120, height=30, ratio=0.4)
    assert left.width == 47  # ~40% of 120
    assert right.width == 71  # ~60% of 120

def test_terminal_too_small():
    manager = LayoutManager()
    with pytest.raises(ValueError):
        manager.calculate_split(width=80, height=20, ratio=0.4)
```

**FocusManager:**
```python
def test_toggle_focus():
    manager = FocusManager()
    pane1 = Pane(["cmd1"], bounds, "Pane1")
    pane2 = Pane(["cmd2"], bounds, "Pane2")
    manager.panes = [pane1, pane2]
    manager.set_active(pane1)

    manager.toggle()
    assert manager.get_active() == pane2

    manager.toggle()
    assert manager.get_active() == pane1
```

### Integration Tests

**Split View Launch:**
```python
def test_split_view_launch(tmp_path):
    """Test that both panes start successfully"""
    config = SplitViewConfig()
    manager = SplitViewManager(config)

    # Mock Claude detection
    with patch('shutil.which', return_value='/usr/bin/claude'):
        manager.launch()

    assert manager.claude_pane.is_alive()
    assert manager.tui_pane.is_alive()
```

**Claude Fallback:**
```python
def test_claude_not_found_fallback():
    """Test graceful fallback when Claude not installed"""
    config = SplitViewConfig()
    manager = SplitViewManager(config)

    with patch('shutil.which', return_value=None):
        exit_code = manager.launch()

    # Should launch TUI only
    assert exit_code == 0
```

## Dependencies

**Standard Library:**
- `pty` - Pseudo-terminal operations
- `select` - Non-blocking I/O
- `signal` - Signal handling (SIGWINCH)
- `subprocess` - Process management
- `os`, `sys`, `time`, `shutil`

**Third-Party (already in project):**
- `psutil` - Process utilities
- `pyyaml` - Config parsing

## Migration Path

### Phase 1: Core Implementation (Week 1-2)
- Implement all core components
- Basic split view functionality
- Keyboard shortcuts
- Layout persistence

### Phase 2: Polish & Testing (Week 2-3)
- Visual indicators
- Error handling
- Comprehensive testing
- Documentation

### Phase 3: User Rollout (Week 3)
- Beta testing with select users
- Gather feedback
- Fix issues
- General availability

### Rollback Plan

If critical issues arise:
1. Add `--no-split` flag as default
2. Require `--split` flag to opt-in
3. Fix issues in isolated branch
4. Re-enable split view as default in next release

## Open Technical Questions

1. **Buffer Management:** How much scroll buffer should we maintain per pane?
   - Recommendation: 10,000 lines (configurable)

2. **PTY vs Pipe:** Should we use pty.fork() or subprocess.Popen with pty?
   - Recommendation: pty.fork() for simpler implementation

3. **Resize Algorithm:** Should resize distribute space proportionally or add/subtract from one side?
   - Recommendation: Maintain ratio, recalculate both sides

4. **Focus Restoration:** Should we persist active pane across sessions?
   - Recommendation: Yes, store in config.yml

## Performance Targets

- **Launch time:** < 3 seconds (both panes ready)
- **Input latency:** < 50ms (keystroke to active pane)
- **Output latency:** < 100ms (process output to screen)
- **Resize latency:** < 200ms (terminal resize to rerender)
- **Memory overhead:** < 50 MB (split view manager + borders)
- **CPU usage:** < 5% idle, < 20% active

## Conclusion

This technical specification provides a complete implementation plan for the integrated Claude Code + TUI split view feature. The architecture is modular, testable, and maintainable, with clear separation of concerns and well-defined interfaces. The built-in terminal splitting approach avoids external dependencies while providing a polished user experience.
