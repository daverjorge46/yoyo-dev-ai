"""
Tests for CommandExecutor notification message clarity.

Tests that verify the fix for confusing command execution UX.
"""

import pytest
from unittest.mock import Mock, patch


def test_command_executor_notification_includes_checkmark():
    """
    Test that CommandExecutor notifications include a checkmark icon.

    This test verifies the fix for Issue #3: Confusing command execution UX.
    After fix: Notification should include "✓" checkmark
    """
    from lib.yoyo_tui.services.command_executor import CommandExecutor

    # Create mock app
    mock_app = Mock()

    # Create CommandExecutor
    executor = CommandExecutor(app=mock_app)

    # Mock clipboard copy
    with patch('pyperclip.copy'):
        # Execute a command
        executor.execute_command("/execute-tasks")

        # Verify notification was called
        assert mock_app.notify.called, "Notification should be sent"

        # Get notification message
        notification_message = mock_app.notify.call_args[0][0]

        # Verify message includes checkmark
        assert "✓" in notification_message, \
            f"Notification should include checkmark. Got: {notification_message}"


def test_command_executor_notification_mentions_paste():
    """
    Test that CommandExecutor notifications explicitly mention pasting.

    Before fix: "Command copied to clipboard - paste into Claude Code"
    After fix: "✓ Copied to clipboard! Paste into Claude Code to execute: {command}"
    """
    from lib.yoyo_tui.services.command_executor import CommandExecutor

    # Create mock app
    mock_app = Mock()

    # Create CommandExecutor
    executor = CommandExecutor(app=mock_app)

    # Mock clipboard copy
    with patch('pyperclip.copy'):
        # Execute a command
        command = "/execute-tasks"
        executor.execute_command(command)

        # Get notification message
        notification_message = mock_app.notify.call_args[0][0]

        # Verify message mentions pasting
        assert "paste" in notification_message.lower(), \
            f"Notification should mention pasting. Got: {notification_message}"

        # Verify message includes the command
        assert command in notification_message, \
            f"Notification should include command. Got: {notification_message}"


def test_command_executor_notification_timeout_is_6_seconds():
    """
    Test that CommandExecutor notification timeout is 6 seconds (not 4s).

    Before fix: timeout=4s
    After fix: timeout=6s (better visibility)
    """
    from lib.yoyo_tui.services.command_executor import CommandExecutor

    # Create mock app
    mock_app = Mock()

    # Create CommandExecutor
    executor = CommandExecutor(app=mock_app)

    # Mock clipboard copy
    with patch('pyperclip.copy'):
        # Execute a command
        executor.execute_command("/execute-tasks")

        # Get notification call kwargs
        notification_kwargs = mock_app.notify.call_args[1]

        # Verify timeout is 6 seconds
        assert notification_kwargs['timeout'] == 6, \
            f"Expected timeout=6s, got {notification_kwargs['timeout']}"


def test_command_executor_old_timeout_4_seconds():
    """
    Test to document old behavior (4s timeout) - this test SHOULD FAIL after fix.

    Before fix: timeout=4s
    After fix: timeout=6s
    """
    from lib.yoyo_tui.services.command_executor import CommandExecutor

    # Create mock app
    mock_app = Mock()

    # Create CommandExecutor
    executor = CommandExecutor(app=mock_app)

    # Mock clipboard copy
    with patch('pyperclip.copy'):
        # Execute a command
        executor.execute_command("/execute-tasks")

        # Get notification call kwargs
        notification_kwargs = mock_app.notify.call_args[1]

        # This assertion should FAIL after the fix (we want 6s, not 4s)
        assert notification_kwargs['timeout'] != 4, \
            "CommandExecutor timeout should not be 4s anymore (should be 6s)"


def test_command_executor_notification_severity_is_information():
    """
    Test that CommandExecutor uses 'information' severity for success.

    After fix: severity='information' with success styling
    """
    from lib.yoyo_tui.services.command_executor import CommandExecutor

    # Create mock app
    mock_app = Mock()

    # Create CommandExecutor
    executor = CommandExecutor(app=mock_app)

    # Mock clipboard copy
    with patch('pyperclip.copy'):
        # Execute a command
        executor.execute_command("/execute-tasks")

        # Get notification call kwargs
        notification_kwargs = mock_app.notify.call_args[1]

        # Verify severity is information
        assert notification_kwargs['severity'] == 'information', \
            f"Expected severity='information', got {notification_kwargs['severity']}"
