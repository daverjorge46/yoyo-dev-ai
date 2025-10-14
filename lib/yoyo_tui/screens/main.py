"""
MainScreen - Primary dashboard screen for Yoyo Dev TUI.

This screen provides the main layout for the TUI with:
- Header with app title
- Sidebar with project overview, git status, and shortcuts
- Main content area for tasks, specs, and progress
- Footer with keyboard shortcuts

Layout structure:
┌────────────────────────────────────────────┐
│          Header (Brand Blue)               │
├─────────────┬──────────────────────────────┤
│  Sidebar    │      Main Content            │
│  (30 cols)  │                              │
│             │                              │
│ - Project   │  - Active Task Panel         │
│   Overview  │  - Spec List Panel           │
│ - Git       │                              │
│   Status    │                              │
│ - Shortcuts │                              │
│             │                              │
├─────────────┴──────────────────────────────┤
│          Footer (Medium Gray)              │
└────────────────────────────────────────────┘
"""

from textual.app import ComposeResult
from textual.containers import Container, Horizontal, Vertical
from textual.screen import Screen
from textual.widgets import Header, Footer, Static


class MainScreen(Screen):
    """Main dashboard screen for Yoyo Dev TUI."""

    # Minimum terminal size requirements
    MIN_WIDTH = 80
    MIN_HEIGHT = 24

    # Responsive breakpoints
    BREAKPOINT_SMALL = 79  # < 80 columns (hide sidebar)
    BREAKPOINT_MEDIUM = 120  # 80-120 columns (normal sidebar)
    # > 120 columns = large (wider sidebar)

    def compose(self) -> ComposeResult:
        """
        Compose the main screen layout.

        Returns:
            ComposeResult with header, content area, and footer
        """
        # Top header bar
        yield Header()

        # Main content area with sidebar and main panel
        with Horizontal():
            # Left sidebar (30 columns)
            with Vertical(id="sidebar"):
                yield Static(
                    "[bold cyan]Project Overview[/bold cyan]\n\n"
                    "Loading project context...",
                    id="project-overview"
                )
                yield Static(
                    "[bold cyan]Git Status[/bold cyan]\n\n"
                    "Checking repository...",
                    id="git-status-panel"
                )
                yield Static(
                    "[bold cyan]Keyboard Shortcuts[/bold cyan]\n\n"
                    "[cyan]Ctrl+P[/cyan] Command Palette\n"
                    "[cyan]?[/cyan]      Help\n"
                    "[cyan]q[/cyan]      Quit\n"
                    "[cyan]r[/cyan]      Refresh\n"
                    "[cyan]g[/cyan]      Git Menu",
                    id="shortcuts-panel"
                )

            # Right main content area
            with Vertical(id="main"):
                yield Static(
                    "[bold cyan]Active Tasks[/bold cyan]\n\n"
                    "Loading task data...\n\n"
                    "[dim]Tasks will appear here once widgets are implemented (Task 6)[/dim]",
                    id="task-panel"
                )
                yield Static(
                    "[bold cyan]Specifications[/bold cyan]\n\n"
                    "Loading specifications...\n\n"
                    "[dim]Spec list will appear here once widgets are implemented (Task 7)[/dim]",
                    id="spec-panel"
                )

        # Bottom footer with keyboard shortcuts
        yield Footer()

    def on_mount(self) -> None:
        """
        Called when screen is mounted to the app.

        Checks terminal size and displays warning if too small.
        """
        self.check_terminal_size()

    def check_terminal_size(self) -> None:
        """
        Check if terminal meets minimum size requirements.

        Displays a notification if terminal is too small.
        """
        size = self.app.size
        width, height = size.width, size.height

        # Check minimum width
        if width < self.MIN_WIDTH:
            self.app.notify(
                f"Terminal too narrow ({width} cols). "
                f"Minimum recommended: {self.MIN_WIDTH} cols",
                severity="warning",
                timeout=10
            )

        # Check minimum height
        if height < self.MIN_HEIGHT:
            self.app.notify(
                f"Terminal too short ({height} rows). "
                f"Minimum recommended: {self.MIN_HEIGHT} rows",
                severity="warning",
                timeout=10
            )

    def on_resize(self, event) -> None:
        """
        Called when terminal is resized.

        Re-checks terminal size and updates layout if needed.

        Args:
            event: Resize event with new dimensions
        """
        self.check_terminal_size()

        # Get current size
        width = self.app.size.width

        # Adjust sidebar visibility based on breakpoints
        sidebar = self.query_one("#sidebar")

        if width <= self.BREAKPOINT_SMALL:
            # Small terminal: hide sidebar
            sidebar.display = False
        else:
            # Medium/large terminal: show sidebar
            sidebar.display = True
