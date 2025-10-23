"""
MainScreen - Primary dashboard screen for Yoyo Dev TUI.

This screen provides the main layout for the TUI with:
- Header with app title
- Fixed project overview panel at top (full width)
- Sidebar with git status, history, and shortcuts
- Main content area for tasks, specs, and progress
- Footer with keyboard shortcuts

Layout structure:
┌────────────────────────────────────────────┐
│          Header (Brand Blue)               │
├────────────────────────────────────────────┤
│  📦 Yoyo Dev - Project Overview (Fixed)    │
│  Mission | Features | Stack | Phase        │
├─────────────┬──────────────────────────────┤
│  Sidebar    │      Main Content            │
│  (50%)      │      (50%)                   │
│             │                              │
│ - Git       │  - Progress Panel            │
│   Status    │  - Next Tasks                │
│ - History   │  - Task Tree                 │
│ - Shortcuts │  - Spec List                 │
│ - Commands  │                              │
│             │                              │
├─────────────┴──────────────────────────────┤
│          Footer (Medium Gray)              │
└────────────────────────────────────────────┘
"""

import logging
from textual.app import ComposeResult
from textual.containers import Container, Horizontal, Vertical
from textual.screen import Screen
from textual.widgets import Header, Footer, Static

logger = logging.getLogger(__name__)

from ..widgets import TaskTree, ProgressPanel, SpecList, ProjectOverview, ShortcutsPanel, NextTasksPanel, SuggestedCommandsPanel, HistoryPanel
from ..widgets.git_status import GitStatus
from ..models import TaskData
from ..services.data_manager import DataManager
from ..config import TUIConfig


class MainScreen(Screen):
    """Main dashboard screen for Yoyo Dev TUI."""

    # Minimum terminal size requirements
    MIN_WIDTH = 80
    MIN_HEIGHT = 24

    # Responsive breakpoints
    BREAKPOINT_SMALL = 79  # < 80 columns (hide sidebar)
    BREAKPOINT_MEDIUM = 120  # 80-120 columns (normal sidebar)
    # > 120 columns = large (wider sidebar)

    def __init__(self, config: TUIConfig = None, *args, **kwargs):
        """
        Initialize MainScreen with task data attribute.

        Args:
            config: TUI configuration (Task 8)
            data_manager: Optional DataManager instance (passed via kwargs)
        """
        # Extract data_manager from kwargs before calling super().__init__()
        # to prevent TypeError from Textual's Screen.__init__()
        self.data_manager = kwargs.pop('data_manager', None)

        super().__init__(*args, **kwargs)
        self.config = config or TUIConfig()  # Use provided config or defaults
        self.task_data = TaskData.empty()  # Will be loaded on mount

    def compose(self) -> ComposeResult:
        """
        Compose the main screen layout.

        Returns:
            ComposeResult with header, content area, and footer
        """
        # Top header bar
        yield Header()

        # Fixed project overview panel at the top (full width)
        with Container(id="project-overview-container"):
            yield ProjectOverview()

        # Main content area with sidebar and main panel
        with Horizontal(id="content-area"):
            # Left sidebar (30 columns)
            with Vertical(id="sidebar"):
                # Git Status widget - always show
                yield GitStatus(
                    refresh_interval=self.config.refresh_interval,
                    git_cache_ttl=self.config.git_cache_ttl
                )

                # History panel - shows recent activity
                yield HistoryPanel()

                # Keyboard shortcuts panel
                yield ShortcutsPanel()

                # Suggested commands panel
                yield SuggestedCommandsPanel(task_data=TaskData.empty())

            # Right main content area
            with Vertical(id="main"):
                # Progress overview panel
                yield ProgressPanel(task_data=TaskData.empty())

                # Next tasks panel - shows next uncompleted task
                yield NextTasksPanel(task_data=TaskData.empty())

                # Task tree widget
                yield TaskTree(task_data=TaskData.empty())

                # Spec list widget showing recent specs and fixes (with config - Task 8)
                yield SpecList(cache_ttl=self.config.spec_cache_ttl)

        # Bottom footer with keyboard shortcuts
        yield Footer()

    def on_mount(self) -> None:
        """
        Called when screen is mounted to the app.

        Loads real data and passes to widgets, then checks terminal size.
        """
        logger.debug("MainScreen.on_mount: Starting")

        # Load real task data
        self.load_data()

        # Check terminal size
        self.check_terminal_size()

        # Start auto-refresh timer using config refresh_interval
        self.set_interval(self.auto_refresh, self.config.refresh_interval)

        logger.debug("MainScreen.on_mount: Complete")

    def load_data(self) -> None:
        """
        Load real data from project and update widgets.

        Discovers tasks.md, loads task data, and passes to all widgets.
        """
        logger.debug("MainScreen.load_data: Loading task data from DataManager")

        # Load task data using DataManager instance
        if self.data_manager:
            state = self.data_manager.state
            # Use first available task data (could be from spec, fix, or master)
            if state.tasks and len(state.tasks) > 0:
                self.task_data = state.tasks[0]
                logger.debug(f"MainScreen.load_data: Loaded {len(self.task_data.parent_tasks)} parent tasks from {self.task_data.source_type}")
            else:
                logger.debug("MainScreen.load_data: No tasks found in state, using empty TaskData")
                self.task_data = TaskData.empty()
        else:
            logger.debug("MainScreen.load_data: No data_manager available, using empty TaskData")
            self.task_data = TaskData.empty()

        logger.debug(f"MainScreen.load_data: Final task count: {len(self.task_data.parent_tasks) if self.task_data else 0} parent tasks")

        # Update widgets with loaded data
        try:
            # Update TaskTree
            logger.debug("MainScreen.load_data: Updating TaskTree")
            task_tree = self.query_one(TaskTree)
            task_tree.load_tasks(self.task_data)

            # Update ProgressPanel
            progress_panel = self.query_one(ProgressPanel)
            progress_panel.update_data(self.task_data)

            # Update NextTasksPanel
            next_tasks_panel = self.query_one(NextTasksPanel)
            next_tasks_panel.update_data(self.task_data)

            # Update SuggestedCommandsPanel
            suggested_commands_panel = self.query_one(SuggestedCommandsPanel)
            suggested_commands_panel.update_data(self.task_data)

            logger.debug("MainScreen.load_data: All widgets updated successfully")

        except Exception as e:
            # Widgets not mounted yet or other error
            # Data is stored in self.task_data and will be available
            logger.debug(f"MainScreen.load_data: Error updating widgets: {e}")

    def refresh_all_data(self) -> None:
        """
        Refresh all data and update widgets.

        Used by FileWatcher to trigger updates when files change.
        """
        # Store previous state for change detection
        previous_specs_count = len(self.data_manager.state.specs) if self.data_manager else 0
        previous_fixes_count = len(self.data_manager.state.fixes) if self.data_manager else 0
        previous_tasks_count = len(self.task_data.parent_tasks) if self.task_data else 0

        self.load_data()

        # Check for significant changes and show notifications
        if self.data_manager:
            current_specs_count = len(self.data_manager.state.specs)
            current_fixes_count = len(self.data_manager.state.fixes)
            current_tasks_count = len(self.task_data.parent_tasks) if self.task_data else 0

            # New spec created
            if current_specs_count > previous_specs_count:
                latest_spec = self.data_manager.state.specs[0] if self.data_manager.state.specs else None
                if latest_spec:
                    self.app.notify(
                        title="✓ Spec Created",
                        message=f"{latest_spec.name}",
                        severity="information",
                        timeout=3
                    )

            # New fix created
            if current_fixes_count > previous_fixes_count:
                latest_fix = self.data_manager.state.fixes[0] if self.data_manager.state.fixes else None
                if latest_fix:
                    self.app.notify(
                        title="✓ Fix Created",
                        message=f"{latest_fix.name}",
                        severity="information",
                        timeout=3
                    )

            # Task completed (increased task count usually means new work, but we can check completion)
            if self.task_data and hasattr(self.task_data, 'progress'):
                if self.task_data.progress == 100 and previous_tasks_count > 0:
                    self.app.notify(
                        title="✓ All Tasks Complete!",
                        message="Great work! All tasks are done.",
                        severity="information",
                        timeout=4
                    )

        # Also refresh history panel
        try:
            history_panel = self.query_one(HistoryPanel)
            history_panel.refresh_history()
        except Exception:
            # History panel not mounted yet
            pass

    def refresh_task_data(self) -> None:
        """
        Reload task data without full screen refresh.

        Lightweight refresh for task-related widgets only.
        """
        # Reload task data using DataManager instance
        if self.data_manager:
            state = self.data_manager.state
            if state.tasks and len(state.tasks) > 0:
                self.task_data = state.tasks[0]
            else:
                self.task_data = TaskData.empty()
        else:
            self.task_data = TaskData.empty()

        # Update task-related widgets
        try:
            # Update TaskTree
            task_tree = self.query_one(TaskTree)
            task_tree.load_tasks(self.task_data)

            # Update ProgressPanel
            progress_panel = self.query_one(ProgressPanel)
            progress_panel.update_data(self.task_data)

            # Update NextTasksPanel
            next_tasks_panel = self.query_one(NextTasksPanel)
            next_tasks_panel.update_data(self.task_data)

            # Update SuggestedCommandsPanel
            suggested_commands_panel = self.query_one(SuggestedCommandsPanel)
            suggested_commands_panel.update_data(self.task_data)
        except Exception:
            # Widgets not mounted yet or error
            pass

    def refresh_history_data(self) -> None:
        """
        Reload history data without full screen refresh.

        Lightweight refresh for history panel only.
        """
        try:
            history_panel = self.query_one(HistoryPanel)
            history_panel.refresh_history()
        except Exception:
            # History panel not mounted yet
            pass

    def auto_refresh(self) -> None:
        """
        Automatic refresh called by timer every 10 seconds.

        Performs lightweight data reload without notification spam.
        """
        self.refresh_task_data()
        self.refresh_history_data()

    def check_terminal_size(self) -> None:
        """
        Check if terminal meets minimum size requirements.

        Displays a notification if terminal is too small.
        """
        try:
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
        except Exception:
            # No active app context (likely in testing)
            pass

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
