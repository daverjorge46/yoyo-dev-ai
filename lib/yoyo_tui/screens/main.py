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

from ..widgets import TaskTree, ProgressPanel, SpecList, GitStatus, ProjectOverview, ShortcutsPanel
from ..models import TaskData


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
                # Project overview widget showing mission and context
                yield ProjectOverview()

                # Git Status widget with live updates
                yield GitStatus()

                # Keyboard shortcuts panel
                yield ShortcutsPanel()

            # Right main content area
            with Vertical(id="main"):
                # Progress overview panel
                yield ProgressPanel(task_data=TaskData.empty())

                # Task tree widget
                yield TaskTree(task_data=TaskData.empty())

                # Spec list widget showing recent specs and fixes
                yield SpecList()

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
