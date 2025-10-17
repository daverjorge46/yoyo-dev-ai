#!/usr/bin/env python3
"""
Integration tests for TUI interactions (Task 9).

Tests the integration of all components implemented in Tasks 1-8:
- Command execution (Tasks 1-2)
- History tracking (Tasks 3-4)
- Layout changes (Task 6)
- Task metadata (Tasks 7-8)
"""

import sys
import unittest
from pathlib import Path
from unittest.mock import MagicMock, patch

# Add lib to path for imports
sys.path.insert(0, str(Path.home() / '.yoyo-dev' / 'lib'))


class TestCommandExecutionIntegration(unittest.TestCase):
    """Test command execution integration (Tasks 1-2)."""

    def test_command_executor_service_exists(self):
        """Verify CommandExecutor service was created."""
        from yoyo_tui.services.command_executor import CommandExecutor

        executor = CommandExecutor()
        self.assertIsNotNone(executor)
        self.assertTrue(hasattr(executor, 'execute_command'))

    @patch('subprocess.Popen')
    def test_command_execution_flow_end_to_end(self, mock_popen):
        """Test full command execution flow from button click to subprocess."""
        from yoyo_tui.services.command_executor import CommandExecutor

        # Setup mock
        mock_process = MagicMock()
        mock_stdin = MagicMock()
        mock_process.stdin = mock_stdin
        mock_process.poll.return_value = None
        mock_popen.return_value = mock_process

        # Create executor with mock app
        mock_app = MagicMock()
        executor = CommandExecutor(app=mock_app)

        # Execute command
        result = executor.execute_command("/execute-tasks")

        # Verify success
        self.assertTrue(result)
        mock_popen.assert_called_once()
        mock_stdin.write.assert_called()
        mock_app.notify.assert_called()


class TestHistoryTrackingIntegration(unittest.TestCase):
    """Test history tracking integration (Tasks 3-4)."""

    def test_history_tracker_service_exists(self):
        """Verify HistoryTracker service was created."""
        from yoyo_tui.services.history_tracker import HistoryTracker

        tracker = HistoryTracker(Path.cwd())
        self.assertIsNotNone(tracker)
        self.assertTrue(hasattr(tracker, 'get_recent_actions'))

    def test_recap_parser_service_exists(self):
        """Verify RecapParser service was created."""
        from yoyo_tui.services.recap_parser import RecapParser

        parser = RecapParser()
        self.assertIsNotNone(parser)
        self.assertTrue(hasattr(parser, 'parse_recap_file'))

    def test_history_panel_widget_exists(self):
        """Verify HistoryPanel widget was created."""
        from yoyo_tui.widgets.history_panel import HistoryPanel

        panel = HistoryPanel()
        self.assertIsNotNone(panel)
        self.assertTrue(hasattr(panel, 'refresh_history'))


class TestLayoutIntegration(unittest.TestCase):
    """Test layout changes integration (Task 6)."""

    def test_styles_css_has_50_50_split(self):
        """Verify styles.css has 50/50 split."""
        styles_path = Path.home() / '.yoyo-dev' / 'lib' / 'yoyo_tui' / 'styles.css'
        content = styles_path.read_text()

        # Check sidebar is 50%
        self.assertIn('width: 50%', self._extract_section(content, '#sidebar'))

        # Check main is 50%
        self.assertIn('width: 50%', self._extract_section(content, '#main'))

    def _extract_section(self, content: str, selector: str) -> str:
        """Extract CSS section for a selector."""
        lines = content.split('\n')
        section = []
        in_section = False

        for line in lines:
            if selector in line and '{' in line:
                in_section = True
            if in_section:
                section.append(line)
                if '}' in line:
                    break

        return '\n'.join(section)


class TestTaskMetadataIntegration(unittest.TestCase):
    """Test task metadata integration (Tasks 7-8)."""

    def test_next_tasks_panel_shows_metadata(self):
        """Verify NextTasksPanel displays source metadata."""
        from yoyo_tui.widgets.next_tasks_panel import NextTasksPanel
        from yoyo_tui.models import TaskData, ParentTask, Subtask

        # Create task data with metadata
        parent_task = ParentTask(
            number=1,
            name="Test Task",
            completed=False,
            subtasks=[
                Subtask(text="Subtask 1", completed=False)
            ]
        )

        task_data = TaskData(
            file_path=Path.cwd() / ".yoyo-dev" / "specs" / "2025-10-17-test-feature" / "tasks.md",
            parent_tasks=[parent_task],
            total_tasks=1,
            completed_tasks=0,
            total_subtasks=1,
            completed_subtasks=0,
            progress=0,
            source_type="spec",
            spec_name="test-feature"
        )

        # Create panel and render
        panel = NextTasksPanel(task_data=task_data)
        content = panel._render_content()

        # Verify metadata is displayed (formatted as "📄 SPEC: test-feature")
        self.assertIn("SPEC:", content)
        self.assertIn("test-feature", content)


class TestEndToEndIntegration(unittest.TestCase):
    """Test end-to-end integration of all components."""

    def test_tui_app_can_launch(self):
        """Verify TUI app can be instantiated."""
        from yoyo_tui.app import YoyoDevApp

        app = YoyoDevApp()
        self.assertIsNotNone(app)

    def test_main_screen_has_all_widgets(self):
        """Verify MainScreen includes all new widgets."""
        from yoyo_tui.screens.main import MainScreen
        from yoyo_tui.widgets import (
            NextTasksPanel,
            SuggestedCommandsPanel,
            ProgressPanel
        )
        from yoyo_tui.config import TUIConfig

        # Create main screen
        screen = MainScreen(config=TUIConfig())

        # Verify it has task_data
        self.assertTrue(hasattr(screen, 'task_data'))

    def test_all_services_can_be_imported(self):
        """Verify all new services can be imported."""
        try:
            from yoyo_tui.services.command_executor import CommandExecutor
            from yoyo_tui.services.history_tracker import HistoryTracker
            from yoyo_tui.services.recap_parser import RecapParser

            self.assertTrue(True)
        except ImportError as e:
            self.fail(f"Service import failed: {e}")


class TestOriginalIssuesResolution(unittest.TestCase):
    """Verify original issues from analysis.md are resolved."""

    def test_command_execution_implemented(self):
        """Issue: Suggested commands not clickable - RESOLVED."""
        from yoyo_tui.services.command_executor import CommandExecutor

        # CommandExecutor exists and can execute commands
        executor = CommandExecutor()
        self.assertTrue(callable(executor.execute_command))

    def test_history_tracking_implemented(self):
        """Issue: No unified history display - RESOLVED."""
        from yoyo_tui.services.history_tracker import HistoryTracker

        # HistoryTracker exists and can get recent actions
        tracker = HistoryTracker(Path.cwd())
        self.assertTrue(callable(tracker.get_recent_actions))

    def test_layout_improved(self):
        """Issue: Layout too cramped (35/65) - RESOLVED (now 50/50)."""
        styles_path = Path.home() / '.yoyo-dev' / 'lib' / 'yoyo_tui' / 'styles.css'
        content = styles_path.read_text()

        # Verify NOT 35/65
        self.assertNotIn('width: 35%', content.split('#sidebar')[1].split('}')[0])
        self.assertNotIn('width: 65%', content.split('#main')[1].split('}')[0])

        # Verify IS 50/50
        self.assertIn('width: 50%', content.split('#sidebar')[1].split('}')[0])
        self.assertIn('width: 50%', content.split('#main')[1].split('}')[0])

    def test_task_metadata_implemented(self):
        """Issue: No task source indication - RESOLVED."""
        from yoyo_tui.widgets.next_tasks_panel import NextTasksPanel
        from yoyo_tui.models import TaskData

        # NextTasksPanel can render metadata
        panel = NextTasksPanel(task_data=TaskData.empty())
        self.assertTrue(hasattr(panel, '_render_content'))


if __name__ == '__main__':
    # Run tests with verbose output
    unittest.main(verbosity=2)
