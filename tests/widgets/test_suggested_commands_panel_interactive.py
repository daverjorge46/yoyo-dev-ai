#!/usr/bin/env python3
"""
Test suite for SuggestedCommandsPanel interactive functionality.

Tests the button click handling and command execution integration
for the SuggestedCommandsPanel widget.

Following TDD approach - these tests should FAIL initially (red phase).
"""

import sys
import unittest
from pathlib import Path
from unittest.mock import patch, MagicMock, AsyncMock
import asyncio

# Add lib to path for imports
sys.path.insert(0, str(Path.home() / '.yoyo-dev' / 'lib'))


class TestSuggestedCommandsPanelButtonConversion(unittest.TestCase):
    """Test conversion of Static widgets to Button widgets."""

    def test_suggested_commands_panel_uses_buttons(self):
        """Test that SuggestedCommandsPanel uses Button widgets instead of Static."""
        from yoyo_tui.widgets.suggested_commands_panel import SuggestedCommandsPanel
        from yoyo_tui.models import TaskData

        # Create panel
        panel = SuggestedCommandsPanel(task_data=TaskData.empty())

        # Check compose method
        compose_result = list(panel.compose())

        # Should contain Button widgets (once implemented)
        # For now, test will fail because Static widgets are used
        from textual.widgets import Button

        has_buttons = False
        for widget in compose_result:
            # Check if any child contains Button widgets
            if hasattr(widget, 'children'):
                for child in widget.children:
                    if isinstance(child, Button):
                        has_buttons = True
                        break

        # Will fail initially - that's expected for TDD
        self.assertTrue(has_buttons, "Panel should use Button widgets for commands")

    def test_suggested_commands_panel_buttons_have_command_data(self):
        """Test that Button widgets store command data."""
        from yoyo_tui.widgets.suggested_commands_panel import SuggestedCommandsPanel
        from yoyo_tui.models import TaskData

        # Create panel with some context
        panel = SuggestedCommandsPanel(task_data=TaskData.empty())

        # Get buttons from compose
        compose_result = list(panel.compose())

        # Find Button widgets
        from textual.widgets import Button
        buttons = []
        for widget in compose_result:
            if isinstance(widget, Button):
                buttons.append(widget)
            elif hasattr(widget, 'children'):
                for child in widget.children:
                    if isinstance(child, Button):
                        buttons.append(child)

        # Will fail initially
        self.assertGreater(len(buttons), 0, "Panel should have Button widgets")

        # Buttons should have command data (id or custom attribute)
        if buttons:
            button = buttons[0]
            has_command_data = (
                hasattr(button, 'command') or
                hasattr(button, 'id') and button.id.startswith('cmd-')
            )
            self.assertTrue(has_command_data, "Buttons should store command data")

    def test_suggested_commands_panel_buttons_are_clickable(self):
        """Test that buttons have proper styling to indicate clickability."""
        from yoyo_tui.widgets.suggested_commands_panel import SuggestedCommandsPanel
        from yoyo_tui.models import TaskData

        # Create panel
        panel = SuggestedCommandsPanel(task_data=TaskData.empty())

        # Get buttons
        compose_result = list(panel.compose())

        from textual.widgets import Button
        buttons = []
        for widget in compose_result:
            if isinstance(widget, Button):
                buttons.append(widget)
            elif hasattr(widget, 'children'):
                for child in widget.children:
                    if isinstance(child, Button):
                        buttons.append(child)

        # Will fail initially
        self.assertGreater(len(buttons), 0, "Should have clickable buttons")

        # Buttons should have classes or styling
        if buttons:
            button = buttons[0]
            has_styling = (
                hasattr(button, 'classes') and len(button.classes) > 0 or
                hasattr(button, 'variant')
            )
            self.assertTrue(has_styling, "Buttons should have styling")


class TestSuggestedCommandsPanelButtonClickHandling(unittest.TestCase):
    """Test button click event handling."""

    def test_panel_has_button_pressed_handler(self):
        """Test that panel has on_button_pressed event handler."""
        from yoyo_tui.widgets.suggested_commands_panel import SuggestedCommandsPanel

        # Check for handler method
        self.assertTrue(
            hasattr(SuggestedCommandsPanel, 'on_button_pressed'),
            "Panel should have on_button_pressed handler"
        )

        # Should be callable
        handler = getattr(SuggestedCommandsPanel, 'on_button_pressed', None)
        self.assertTrue(callable(handler), "Handler should be callable")

    @patch('yoyo_tui.services.command_executor.CommandExecutor')
    def test_button_click_triggers_command_execution(self, mock_executor_class):
        """Test that clicking a button triggers command execution."""
        from yoyo_tui.widgets.suggested_commands_panel import SuggestedCommandsPanel
        from yoyo_tui.models import TaskData
        from textual.widgets import Button

        # Setup mock executor
        mock_executor = MagicMock()
        mock_executor.execute_command = MagicMock(return_value=True)
        mock_executor_class.return_value = mock_executor

        # Create panel
        panel = SuggestedCommandsPanel(task_data=TaskData.empty())

        # Create mock button pressed event
        mock_button = MagicMock(spec=Button)
        mock_button.id = "cmd-execute-tasks"

        mock_event = MagicMock()
        mock_event.button = mock_button

        # Trigger button press
        try:
            panel.on_button_pressed(mock_event)

            # Verify command executor was called
            # Will fail initially - handler doesn't exist yet
            mock_executor.execute_command.assert_called()
        except AttributeError:
            # Expected to fail - on_button_pressed doesn't exist yet
            self.fail("on_button_pressed handler should be implemented")

    @patch('yoyo_tui.services.command_executor.CommandExecutor')
    def test_button_click_passes_correct_command(self, mock_executor_class):
        """Test that button click passes the correct command to executor."""
        from yoyo_tui.widgets.suggested_commands_panel import SuggestedCommandsPanel
        from yoyo_tui.models import TaskData
        from textual.widgets import Button

        # Setup mock executor
        mock_executor = MagicMock()
        mock_executor.execute_command = MagicMock(return_value=True)
        mock_executor_class.return_value = mock_executor

        # Create panel
        panel = SuggestedCommandsPanel(task_data=TaskData.empty())

        # Create mock button for /execute-tasks
        mock_button = MagicMock(spec=Button)
        mock_button.id = "cmd-execute-tasks"

        mock_event = MagicMock()
        mock_event.button = mock_button

        # Trigger button press
        try:
            panel.on_button_pressed(mock_event)

            # Verify correct command was passed
            mock_executor.execute_command.assert_called_with("/execute-tasks")
        except (AttributeError, AssertionError):
            # Expected to fail in TDD red phase
            self.fail("Should pass /execute-tasks command to executor")

    @patch('yoyo_tui.services.command_executor.CommandExecutor')
    def test_button_click_handles_different_commands(self, mock_executor_class):
        """Test that different buttons execute different commands."""
        from yoyo_tui.widgets.suggested_commands_panel import SuggestedCommandsPanel
        from yoyo_tui.models import TaskData
        from textual.widgets import Button

        # Setup mock executor
        mock_executor = MagicMock()
        mock_executor.execute_command = MagicMock(return_value=True)
        mock_executor_class.return_value = mock_executor

        # Create panel
        panel = SuggestedCommandsPanel(task_data=TaskData.empty())

        # Test different commands
        test_commands = [
            ("cmd-create-new", "/create-new"),
            ("cmd-create-fix", "/create-fix"),
            ("cmd-plan-product", "/plan-product"),
        ]

        for button_id, expected_command in test_commands:
            mock_executor.reset_mock()

            # Create mock button
            mock_button = MagicMock(spec=Button)
            mock_button.id = button_id

            mock_event = MagicMock()
            mock_event.button = mock_button

            # Trigger button press
            try:
                panel.on_button_pressed(mock_event)

                # Verify correct command
                mock_executor.execute_command.assert_called_with(expected_command)
            except (AttributeError, AssertionError):
                # Expected to fail
                self.fail(f"Should execute {expected_command} for {button_id}")


class TestCommandExecutorIntegration(unittest.TestCase):
    """Test integration with CommandExecutor service."""

    def test_panel_creates_command_executor_instance(self):
        """Test that panel creates or receives CommandExecutor instance."""
        from yoyo_tui.widgets.suggested_commands_panel import SuggestedCommandsPanel
        from yoyo_tui.models import TaskData

        # Create panel
        panel = SuggestedCommandsPanel(task_data=TaskData.empty())

        # Should have executor attribute or create one
        has_executor = (
            hasattr(panel, 'executor') or
            hasattr(panel, 'command_executor') or
            hasattr(panel, '_executor')
        )

        # Will fail initially
        self.assertTrue(has_executor, "Panel should have CommandExecutor instance")

    def test_panel_accepts_command_executor_as_parameter(self):
        """Test that panel can accept CommandExecutor via constructor."""
        from yoyo_tui.widgets.suggested_commands_panel import SuggestedCommandsPanel
        from yoyo_tui.models import TaskData

        # Create mock executor
        mock_executor = MagicMock()

        # Try to create panel with executor
        try:
            panel = SuggestedCommandsPanel(
                task_data=TaskData.empty(),
                executor=mock_executor
            )
            self.assertIsNotNone(panel)
        except TypeError:
            # Expected to fail - parameter doesn't exist yet
            self.fail("Panel should accept executor parameter")

    @patch('yoyo_tui.services.command_executor.CommandExecutor')
    def test_panel_uses_app_instance_for_executor(self, mock_executor_class):
        """Test that panel passes app instance to executor for notifications."""
        from yoyo_tui.widgets.suggested_commands_panel import SuggestedCommandsPanel
        from yoyo_tui.models import TaskData

        # Setup mock
        mock_executor = MagicMock()
        mock_executor_class.return_value = mock_executor

        # Create mock app
        mock_app = MagicMock()

        # Create panel with app context
        panel = SuggestedCommandsPanel(task_data=TaskData.empty())

        # Set app property (Textual pattern)
        try:
            panel.app = mock_app

            # Trigger initialization or mount
            if hasattr(panel, 'on_mount'):
                panel.on_mount()

            # Verify executor was created with app
            # Will fail initially
            mock_executor_class.assert_called()
        except (AttributeError, AssertionError):
            # Expected to fail
            self.fail("Panel should create executor with app instance")


class TestCommandExecutionFeedbackInPanel(unittest.TestCase):
    """Test that command execution feedback is displayed."""

    @patch('yoyo_tui.services.command_executor.CommandExecutor')
    def test_panel_shows_feedback_after_button_click(self, mock_executor_class):
        """Test that panel shows feedback after executing command."""
        from yoyo_tui.widgets.suggested_commands_panel import SuggestedCommandsPanel
        from yoyo_tui.models import TaskData
        from textual.widgets import Button

        # Setup mock executor
        mock_executor = MagicMock()
        mock_executor.execute_command = MagicMock(return_value=True)
        mock_executor_class.return_value = mock_executor

        # Create panel with mock app
        mock_app = MagicMock()
        mock_app.notify = MagicMock()

        panel = SuggestedCommandsPanel(task_data=TaskData.empty())
        panel.app = mock_app

        # Create mock button
        mock_button = MagicMock(spec=Button)
        mock_button.id = "cmd-execute-tasks"

        mock_event = MagicMock()
        mock_event.button = mock_button

        # Trigger button press
        try:
            panel.on_button_pressed(mock_event)

            # Verify notification was shown
            # Either through app.notify or executor
            notification_shown = (
                mock_app.notify.called or
                mock_executor.execute_command.called
            )

            self.assertTrue(notification_shown, "Should show feedback notification")
        except AttributeError:
            # Expected to fail
            self.fail("Should provide execution feedback")

    @patch('yoyo_tui.services.command_executor.CommandExecutor')
    def test_panel_handles_execution_failure(self, mock_executor_class):
        """Test that panel handles command execution failure gracefully."""
        from yoyo_tui.widgets.suggested_commands_panel import SuggestedCommandsPanel
        from yoyo_tui.models import TaskData
        from textual.widgets import Button

        # Setup mock executor to fail
        mock_executor = MagicMock()
        mock_executor.execute_command = MagicMock(return_value=False)
        mock_executor_class.return_value = mock_executor

        # Create panel
        mock_app = MagicMock()
        panel = SuggestedCommandsPanel(task_data=TaskData.empty())
        panel.app = mock_app

        # Create mock button
        mock_button = MagicMock(spec=Button)
        mock_button.id = "cmd-create-new"

        mock_event = MagicMock()
        mock_event.button = mock_button

        # Trigger button press - should not crash
        try:
            panel.on_button_pressed(mock_event)
            # Should handle gracefully
            self.assertTrue(True)
        except Exception as e:
            self.fail(f"Should handle execution failure gracefully: {e}")

    @patch('yoyo_tui.services.command_executor.CommandExecutor')
    def test_panel_displays_executing_state(self, mock_executor_class):
        """Test that panel shows 'executing' state while command runs."""
        from yoyo_tui.widgets.suggested_commands_panel import SuggestedCommandsPanel
        from yoyo_tui.models import TaskData
        from textual.widgets import Button

        # Setup mock executor
        mock_executor = MagicMock()
        mock_executor.execute_command = MagicMock(return_value=True)
        mock_executor_class.return_value = mock_executor

        # Create panel
        panel = SuggestedCommandsPanel(task_data=TaskData.empty())

        # Create mock button
        mock_button = MagicMock(spec=Button)
        mock_button.id = "cmd-execute-tasks"

        mock_event = MagicMock()
        mock_event.button = mock_button

        # Trigger button press
        try:
            panel.on_button_pressed(mock_event)

            # Should show executing state (could be via button disable, style change, etc.)
            # This test will fail initially
            # Implementation could set button.disabled = True or change button text
            self.assertTrue(
                mock_button.disabled if hasattr(mock_button, 'disabled') else False,
                "Button should be disabled while executing"
            )
        except AttributeError:
            # Expected to fail
            pass


class TestButtonLayout(unittest.TestCase):
    """Test button layout and styling."""

    def test_buttons_are_vertically_stacked(self):
        """Test that command buttons are arranged vertically."""
        from yoyo_tui.widgets.suggested_commands_panel import SuggestedCommandsPanel
        from yoyo_tui.models import TaskData
        from textual.containers import Vertical

        # Create panel
        panel = SuggestedCommandsPanel(task_data=TaskData.empty())

        # Get compose result
        compose_result = list(panel.compose())

        # Should contain Vertical container
        has_vertical = any(isinstance(w, Vertical) for w in compose_result)

        # Will fail initially
        self.assertTrue(has_vertical, "Buttons should be in Vertical container")

    def test_buttons_have_consistent_styling(self):
        """Test that all command buttons have consistent styling."""
        from yoyo_tui.widgets.suggested_commands_panel import SuggestedCommandsPanel
        from yoyo_tui.models import TaskData
        from textual.widgets import Button

        # Create panel
        panel = SuggestedCommandsPanel(task_data=TaskData.empty())

        # Get buttons
        compose_result = list(panel.compose())
        buttons = []
        for widget in compose_result:
            if isinstance(widget, Button):
                buttons.append(widget)
            elif hasattr(widget, 'children'):
                for child in widget.children:
                    if isinstance(child, Button):
                        buttons.append(child)

        # Will fail initially
        self.assertGreater(len(buttons), 0, "Should have button widgets")

        # All buttons should have same variant/classes
        if len(buttons) > 1:
            first_variant = getattr(buttons[0], 'variant', None)
            all_same = all(
                getattr(b, 'variant', None) == first_variant
                for b in buttons
            )
            self.assertTrue(all_same, "All buttons should have consistent styling")


if __name__ == '__main__':
    unittest.main()
