#!/usr/bin/env python3
"""
Test suite for CommandExecutor service.

Tests the command execution service that handles running Yoyo Dev commands
via subprocess integration with Claude Code.

Following TDD approach - these tests should FAIL initially (red phase).
"""

import sys
import unittest
from pathlib import Path
from unittest.mock import patch, MagicMock, AsyncMock, call
import asyncio

# Add lib to path for imports
sys.path.insert(0, str(Path.home() / '.yoyo-dev' / 'lib'))


class TestCommandExecutorInitialization(unittest.TestCase):
    """Test CommandExecutor service initialization."""

    def test_command_executor_can_be_imported(self):
        """Test that CommandExecutor can be imported from services module."""
        try:
            from yoyo_tui.services.command_executor import CommandExecutor
            self.assertIsNotNone(CommandExecutor)
        except ImportError as e:
            self.fail(f"Failed to import CommandExecutor: {e}")

    def test_command_executor_can_be_instantiated(self):
        """Test that CommandExecutor can be created without errors."""
        from yoyo_tui.services.command_executor import CommandExecutor

        try:
            executor = CommandExecutor()
            self.assertIsNotNone(executor)
        except Exception as e:
            self.fail(f"CommandExecutor instantiation should not raise: {e}")

    def test_command_executor_has_execute_command_method(self):
        """Test that CommandExecutor has execute_command method."""
        from yoyo_tui.services.command_executor import CommandExecutor

        self.assertTrue(
            hasattr(CommandExecutor, 'execute_command'),
            "CommandExecutor should have execute_command method"
        )
        self.assertTrue(
            callable(getattr(CommandExecutor, 'execute_command', None)),
            "execute_command should be callable"
        )

    def test_command_executor_accepts_app_instance(self):
        """Test that CommandExecutor can accept app instance for notifications."""
        from yoyo_tui.services.command_executor import CommandExecutor

        # Mock app instance
        mock_app = MagicMock()

        try:
            executor = CommandExecutor(app=mock_app)
            self.assertIsNotNone(executor)
            self.assertEqual(executor.app, mock_app)
        except Exception as e:
            self.fail(f"CommandExecutor should accept app instance: {e}")


class TestCommandExecutionViaSubprocess(unittest.TestCase):
    """Test command execution via subprocess integration."""

    @patch('subprocess.Popen')
    def test_execute_command_starts_subprocess(self, mock_popen):
        """Test that execute_command starts a subprocess for Claude Code."""
        from yoyo_tui.services.command_executor import CommandExecutor

        # Setup mock
        mock_process = MagicMock()
        mock_process.poll.return_value = None  # Process still running
        mock_popen.return_value = mock_process

        executor = CommandExecutor()

        # Execute command
        command = "/execute-tasks"
        executor.execute_command(command)

        # Verify subprocess was started
        mock_popen.assert_called_once()
        call_args = mock_popen.call_args

        # Verify Claude Code CLI is invoked
        self.assertIn('claude', str(call_args).lower())

    @patch('subprocess.Popen')
    def test_execute_command_sends_to_claude_code_stdin(self, mock_popen):
        """Test that execute_command sends command to Claude Code stdin."""
        from yoyo_tui.services.command_executor import CommandExecutor

        # Setup mock
        mock_process = MagicMock()
        mock_stdin = MagicMock()
        mock_process.stdin = mock_stdin
        mock_process.poll.return_value = None
        mock_popen.return_value = mock_process

        executor = CommandExecutor()

        # Execute command
        command = "/execute-tasks"
        executor.execute_command(command)

        # Verify command was written to stdin
        mock_stdin.write.assert_called()
        written_data = mock_stdin.write.call_args[0][0]

        # Verify command text is in written data
        self.assertIn(command, written_data)

    @patch('subprocess.Popen')
    def test_execute_command_uses_correct_working_directory(self, mock_popen):
        """Test that execute_command uses current working directory."""
        from yoyo_tui.services.command_executor import CommandExecutor

        # Setup mock
        mock_process = MagicMock()
        mock_popen.return_value = mock_process

        executor = CommandExecutor()

        # Execute command
        command = "/create-new"
        executor.execute_command(command)

        # Verify cwd is set
        call_args = mock_popen.call_args
        self.assertIn('cwd', call_args.kwargs)

        # Verify cwd is current directory
        cwd = call_args.kwargs['cwd']
        self.assertEqual(cwd, Path.cwd())

    @patch('subprocess.Popen')
    def test_execute_command_handles_subprocess_errors(self, mock_popen):
        """Test that execute_command handles subprocess errors gracefully."""
        from yoyo_tui.services.command_executor import CommandExecutor

        # Setup mock to raise error
        mock_popen.side_effect = Exception("Subprocess failed")

        executor = CommandExecutor()

        # Execute command and verify error is handled
        command = "/plan-product"

        try:
            result = executor.execute_command(command)
            # Should return False on error
            self.assertFalse(result)
        except Exception as e:
            self.fail(f"execute_command should handle errors gracefully: {e}")

    @patch('subprocess.Popen')
    def test_execute_command_returns_success_status(self, mock_popen):
        """Test that execute_command returns success/failure status."""
        from yoyo_tui.services.command_executor import CommandExecutor

        # Setup mock for success
        mock_process = MagicMock()
        mock_process.poll.return_value = None
        mock_popen.return_value = mock_process

        executor = CommandExecutor()

        # Execute command
        command = "/create-fix"
        result = executor.execute_command(command)

        # Verify success status returned
        self.assertTrue(result)


class TestCommandInputHandling(unittest.TestCase):
    """Test command input handling and routing to Claude Code stdin."""

    @patch('subprocess.Popen')
    def test_execute_command_formats_input_correctly(self, mock_popen):
        """Test that command input is formatted correctly for Claude Code."""
        from yoyo_tui.services.command_executor import CommandExecutor

        # Setup mock
        mock_process = MagicMock()
        mock_stdin = MagicMock()
        mock_process.stdin = mock_stdin
        mock_popen.return_value = mock_process

        executor = CommandExecutor()

        # Execute command
        command = "/execute-tasks"
        executor.execute_command(command)

        # Verify input format
        mock_stdin.write.assert_called()
        written_data = mock_stdin.write.call_args[0][0]

        # Should include command and newline
        self.assertIn(command, written_data)
        self.assertTrue(written_data.endswith('\n') or '\n' in written_data)

    @patch('subprocess.Popen')
    def test_execute_command_handles_special_characters(self, mock_popen):
        """Test that special characters in commands are handled properly."""
        from yoyo_tui.services.command_executor import CommandExecutor

        # Setup mock
        mock_process = MagicMock()
        mock_stdin = MagicMock()
        mock_process.stdin = mock_stdin
        mock_popen.return_value = mock_process

        executor = CommandExecutor()

        # Execute command with special characters
        command = "/review --devil"
        executor.execute_command(command)

        # Verify command passed through correctly
        mock_stdin.write.assert_called()
        written_data = mock_stdin.write.call_args[0][0]
        self.assertIn("--devil", written_data)

    @patch('subprocess.Popen')
    def test_execute_command_closes_stdin_after_write(self, mock_popen):
        """Test that stdin is closed after writing command."""
        from yoyo_tui.services.command_executor import CommandExecutor

        # Setup mock
        mock_process = MagicMock()
        mock_stdin = MagicMock()
        mock_process.stdin = mock_stdin
        mock_popen.return_value = mock_process

        executor = CommandExecutor()

        # Execute command
        command = "/plan-product"
        executor.execute_command(command)

        # Verify stdin flush and close
        mock_stdin.flush.assert_called()
        mock_stdin.close.assert_called()


class TestCommandExecutionFeedback(unittest.TestCase):
    """Test command execution feedback display."""

    @patch('subprocess.Popen')
    def test_execute_command_sends_notification_on_success(self, mock_popen):
        """Test that notification is sent when command executes successfully."""
        from yoyo_tui.services.command_executor import CommandExecutor

        # Setup mock app with notify method
        mock_app = MagicMock()
        mock_app.notify = MagicMock()

        # Setup mock subprocess
        mock_process = MagicMock()
        mock_process.poll.return_value = None
        mock_popen.return_value = mock_process

        executor = CommandExecutor(app=mock_app)

        # Execute command
        command = "/execute-tasks"
        executor.execute_command(command)

        # Verify notification was sent
        mock_app.notify.assert_called()

        # Verify notification contains command info
        call_args = mock_app.notify.call_args
        notification_message = str(call_args)
        self.assertIn(command, notification_message.lower())

    @patch('subprocess.Popen')
    def test_execute_command_sends_error_notification_on_failure(self, mock_popen):
        """Test that error notification is sent when command fails."""
        from yoyo_tui.services.command_executor import CommandExecutor

        # Setup mock app
        mock_app = MagicMock()
        mock_app.notify = MagicMock()

        # Setup mock to fail
        mock_popen.side_effect = Exception("Subprocess failed")

        executor = CommandExecutor(app=mock_app)

        # Execute command
        command = "/create-new"
        executor.execute_command(command)

        # Verify error notification was sent
        mock_app.notify.assert_called()

        # Verify notification indicates error
        call_args = mock_app.notify.call_args
        self.assertIn('severity', call_args.kwargs)
        self.assertEqual(call_args.kwargs['severity'], 'error')

    @patch('subprocess.Popen')
    def test_execute_command_includes_command_name_in_feedback(self, mock_popen):
        """Test that feedback includes the command name being executed."""
        from yoyo_tui.services.command_executor import CommandExecutor

        # Setup mock app
        mock_app = MagicMock()
        mock_app.notify = MagicMock()

        # Setup mock subprocess
        mock_process = MagicMock()
        mock_popen.return_value = mock_process

        executor = CommandExecutor(app=mock_app)

        # Execute command
        command = "/create-fix"
        executor.execute_command(command)

        # Verify command name is in notification
        mock_app.notify.assert_called()
        call_args = mock_app.notify.call_args
        notification_text = call_args[0][0]  # First positional arg is message

        # Should mention the command
        self.assertIn('create-fix', notification_text.lower())

    @patch('subprocess.Popen')
    def test_execute_command_shows_executing_status(self, mock_popen):
        """Test that feedback shows "Executing..." status."""
        from yoyo_tui.services.command_executor import CommandExecutor

        # Setup mock app
        mock_app = MagicMock()
        mock_app.notify = MagicMock()

        # Setup mock subprocess
        mock_process = MagicMock()
        mock_popen.return_value = mock_process

        executor = CommandExecutor(app=mock_app)

        # Execute command
        command = "/plan-product"
        executor.execute_command(command)

        # Verify "Executing" or similar in notification
        mock_app.notify.assert_called()
        call_args = mock_app.notify.call_args
        notification_text = call_args[0][0].lower()

        # Should indicate execution started
        self.assertTrue(
            'executing' in notification_text or
            'running' in notification_text or
            'started' in notification_text
        )


class TestCommandExecutorEdgeCases(unittest.TestCase):
    """Test edge cases and error handling."""

    @patch('subprocess.Popen')
    def test_execute_command_handles_empty_command(self, mock_popen):
        """Test that empty command is rejected."""
        from yoyo_tui.services.command_executor import CommandExecutor

        executor = CommandExecutor()

        # Execute empty command
        result = executor.execute_command("")

        # Should fail
        self.assertFalse(result)

        # Should not start subprocess
        mock_popen.assert_not_called()

    @patch('subprocess.Popen')
    def test_execute_command_handles_none_command(self, mock_popen):
        """Test that None command is rejected."""
        from yoyo_tui.services.command_executor import CommandExecutor

        executor = CommandExecutor()

        # Execute None command
        result = executor.execute_command(None)

        # Should fail
        self.assertFalse(result)

        # Should not start subprocess
        mock_popen.assert_not_called()

    @patch('subprocess.Popen')
    def test_execute_command_validates_command_format(self, mock_popen):
        """Test that command format is validated (should start with /)."""
        from yoyo_tui.services.command_executor import CommandExecutor

        # Setup mock
        mock_process = MagicMock()
        mock_popen.return_value = mock_process

        executor = CommandExecutor()

        # Execute command without leading slash
        command = "execute-tasks"  # Missing leading /
        result = executor.execute_command(command)

        # Should still work OR should fail - depends on implementation
        # At minimum, should not crash
        self.assertIsNotNone(result)


if __name__ == '__main__':
    unittest.main()
