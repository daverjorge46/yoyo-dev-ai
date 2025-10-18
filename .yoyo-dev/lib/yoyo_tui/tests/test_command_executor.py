"""
Tests for CommandExecutor Service

Tests the clipboard-based command execution system that replaces
the subprocess approach with clipboard copy + notification pattern.
"""

import pytest
from unittest.mock import Mock, patch, MagicMock
from pathlib import Path
import sys

# Add parent directory to path for imports
sys.path.insert(0, str(Path(__file__).parent.parent))

from yoyo_tui.services.command_executor import CommandExecutor


class TestCommandExecutorClipboardCopy:
    """Test clipboard copy functionality (TDD - expected to fail initially)"""

    @pytest.fixture
    def mock_app(self):
        """Create mock app with notify method"""
        app = Mock()
        app.notify = Mock()
        return app

    @pytest.fixture
    def executor(self, mock_app):
        """Create CommandExecutor instance with mock app"""
        return CommandExecutor(app=mock_app)

    def test_execute_command_copies_to_clipboard_pyperclip(self, executor, mock_app):
        """
        Test that execute_command() copies command to clipboard using pyperclip.
        
        Expected behavior (not yet implemented):
        - Call pyperclip.copy() with command text
        - Show success notification
        - Return True
        """
        command = "/execute-tasks"
        
        with patch('pyperclip.copy') as mock_copy:
            result = executor.execute_command(command)
            
            # Verify clipboard copy was called
            mock_copy.assert_called_once_with(command)
            
            # Verify success notification was shown
            assert mock_app.notify.called
            notify_call = mock_app.notify.call_args
            assert "Copied" in str(notify_call) or "clipboard" in str(notify_call).lower()
            
            # Verify success return
            assert result is True

    def test_execute_command_copies_to_clipboard_xclip_fallback(self, executor, mock_app):
        """
        Test fallback to xclip when pyperclip unavailable (Linux).
        
        Expected behavior:
        - pyperclip.copy() raises ImportError or fails
        - Falls back to subprocess.run(["xclip", "-selection", "clipboard"])
        - Shows success notification
        - Returns True
        """
        command = "/create-spec"
        
        # Mock pyperclip to fail
        with patch('pyperclip.copy', side_effect=ImportError("pyperclip not available")):
            with patch('subprocess.run') as mock_run:
                mock_run.return_value = Mock(returncode=0)
                
                result = executor.execute_command(command)
                
                # Verify xclip was called
                mock_run.assert_called_once()
                call_args = mock_run.call_args[0][0]
                assert "xclip" in call_args or "xsel" in call_args
                
                # Verify success notification
                assert mock_app.notify.called
                
                # Verify success return
                assert result is True

    def test_execute_command_notification_content(self, executor, mock_app):
        """
        Test notification message content after successful copy.
        
        Expected behavior:
        - Notification includes command name
        - Notification instructs user to paste in Claude Code
        - Notification severity is "information" or "success"
        """
        command = "/review --devil"
        
        with patch('pyperclip.copy'):
            executor.execute_command(command)
            
            # Verify notification was called
            assert mock_app.notify.called
            
            # Check notification content
            notify_call = mock_app.notify.call_args
            message = str(notify_call)
            
            # Should mention the command
            assert command in message or "Copied" in message
            
            # Should instruct to paste in Claude Code
            assert "paste" in message.lower() or "clipboard" in message.lower()
            
            # Should have appropriate severity
            if 'severity' in str(notify_call):
                assert 'error' not in message.lower()

    def test_execute_command_handles_empty_command(self, executor, mock_app):
        """
        Test handling of empty or None commands.
        
        Expected behavior:
        - Does not attempt clipboard copy
        - Shows error notification
        - Returns False
        """
        # Test empty string
        with patch('pyperclip.copy') as mock_copy:
            result = executor.execute_command("")
            
            # Should not copy empty string
            mock_copy.assert_not_called()
            
            # Should show error notification
            assert mock_app.notify.called
            notify_call = str(mock_app.notify.call_args)
            assert "error" in notify_call.lower() or "empty" in notify_call.lower()
            
            # Should return False
            assert result is False

    def test_execute_command_handles_none_command(self, executor, mock_app):
        """Test handling of None command"""
        with patch('pyperclip.copy') as mock_copy:
            result = executor.execute_command(None)
            
            # Should not attempt copy
            mock_copy.assert_not_called()
            
            # Should show error
            assert mock_app.notify.called
            
            # Should return False
            assert result is False

    def test_execute_command_fallback_when_clipboard_unavailable(self, executor, mock_app):
        """
        Test graceful fallback when clipboard is completely unavailable.
        
        Expected behavior (alternative approaches):
        1. Write to .yoyo-dev/.pending-command file
        2. Show notification with manual copy instructions
        3. Log error but don't crash
        """
        command = "/design-init"
        
        # Mock both pyperclip and subprocess to fail
        with patch('pyperclip.copy', side_effect=Exception("Clipboard unavailable")):
            with patch('subprocess.run', side_effect=FileNotFoundError("xclip not found")):
                result = executor.execute_command(command)
                
                # Should handle gracefully (either file write or informative error)
                assert mock_app.notify.called
                
                # Check if file-based fallback was used
                pending_file = Path.cwd() / ".yoyo-dev" / ".pending-command"
                if pending_file.exists():
                    content = pending_file.read_text()
                    assert command in content
                    assert result is True
                else:
                    # If no fallback, should show helpful error
                    notify_msg = str(mock_app.notify.call_args)
                    assert "clipboard" in notify_msg.lower() or "unavailable" in notify_msg.lower()
                    assert result is False


class TestCommandExecutorNotifications:
    """Test notification display after command execution"""

    @pytest.fixture
    def mock_app(self):
        app = Mock()
        app.notify = Mock()
        return app

    @pytest.fixture
    def executor(self, mock_app):
        return CommandExecutor(app=mock_app)

    def test_notification_shows_immediately_after_copy(self, executor, mock_app):
        """
        Test that notification appears immediately after clipboard copy.
        
        Expected behavior:
        - Notification called exactly once
        - Called after clipboard.copy()
        - Timeout parameter set appropriately (3-5 seconds)
        """
        with patch('pyperclip.copy'):
            executor.execute_command("/execute-tasks")
            
            # Should call notify exactly once
            assert mock_app.notify.call_count == 1
            
            # Check timeout parameter
            notify_call = mock_app.notify.call_args
            if notify_call.kwargs and 'timeout' in notify_call.kwargs:
                timeout = notify_call.kwargs['timeout']
                assert 2 <= timeout <= 10  # Reasonable timeout range

    def test_notification_severity_levels(self, executor, mock_app):
        """
        Test appropriate severity levels for different scenarios.
        
        Success: "information" or "success"
        Error: "error"
        """
        # Success case
        with patch('pyperclip.copy'):
            executor.execute_command("/create-new")
            
            success_call = mock_app.notify.call_args
            if success_call and success_call.kwargs and 'severity' in success_call.kwargs:
                assert success_call.kwargs['severity'] in ['information', 'success']
        
        # Error case (empty command)
        mock_app.notify.reset_mock()
        executor.execute_command("")
        
        error_call = mock_app.notify.call_args
        if error_call and error_call.kwargs and 'severity' in error_call.kwargs:
            assert error_call.kwargs['severity'] == 'error'

    def test_notification_without_app_instance(self):
        """
        Test that executor works without app instance (no notifications).
        
        Expected behavior:
        - No crash when app=None
        - Clipboard copy still works
        - Returns True on success
        """
        executor = CommandExecutor(app=None)
        
        with patch('pyperclip.copy'):
            result = executor.execute_command("/plan-product")
            
            # Should succeed even without app
            assert result is True


class TestCommandExecutorEdgeCases:
    """Test edge cases and error handling"""

    @pytest.fixture
    def mock_app(self):
        app = Mock()
        app.notify = Mock()
        return app

    @pytest.fixture
    def executor(self, mock_app):
        return CommandExecutor(app=mock_app)

    def test_execute_command_with_special_characters(self, executor, mock_app):
        """
        Test commands with special characters are copied correctly.
        
        Commands may contain spaces, dashes, quotes, etc.
        """
        commands = [
            "/execute-tasks --parallel",
            "/review --devil \"Check authentication flow\"",
            "/create-new 'User profile page'",
        ]
        
        for command in commands:
            with patch('pyperclip.copy') as mock_copy:
                result = executor.execute_command(command)
                
                # Should copy exact command
                mock_copy.assert_called_once_with(command)
                assert result is True
                
                mock_copy.reset_mock()

    def test_execute_command_with_long_command(self, executor, mock_app):
        """Test handling of very long command strings"""
        long_command = "/create-spec " + "A" * 500  # Very long feature name
        
        with patch('pyperclip.copy') as mock_copy:
            result = executor.execute_command(long_command)
            
            # Should copy entire command
            mock_copy.assert_called_once_with(long_command)
            assert result is True

    def test_multiple_sequential_executions(self, executor, mock_app):
        """
        Test executing multiple commands sequentially.
        
        Each should work independently without state issues.
        """
        commands = ["/plan-product", "/create-spec", "/execute-tasks"]
        
        with patch('pyperclip.copy') as mock_copy:
            for command in commands:
                result = executor.execute_command(command)
                assert result is True
            
            # Should have called copy for each command
            assert mock_copy.call_count == len(commands)

    def test_cleanup_does_not_crash(self, executor):
        """
        Test cleanup() method doesn't crash (used in old subprocess approach).
        
        Expected behavior:
        - Method exists for backward compatibility
        - Does nothing (no subprocess to clean)
        - Returns None
        """
        # Should not crash
        executor.cleanup()
        
        # Should be callable
        assert callable(executor.cleanup)


class TestCommandExecutorMocking:
    """Test mock setup for clipboard libraries"""

    def test_mock_pyperclip_import(self):
        """
        Test that pyperclip can be mocked for testing.
        
        This verifies our test setup is correct.
        """
        with patch('pyperclip.copy') as mock_copy:
            # Import should work with mock
            import pyperclip
            pyperclip.copy("test")
            
            # Mock should have been called
            mock_copy.assert_called_once_with("test")

    def test_mock_subprocess_run(self):
        """Test that subprocess.run can be mocked for xclip fallback"""
        with patch('subprocess.run') as mock_run:
            import subprocess
            subprocess.run(["xclip", "-selection", "clipboard"], input="test", text=True)
            
            # Mock should have been called
            assert mock_run.called
            call_args = mock_run.call_args[0][0]
            assert "xclip" in call_args


# Additional test for integration with SuggestedCommandsPanel
class TestCommandExecutorIntegration:
    """Test integration with SuggestedCommandsPanel"""

    @pytest.fixture
    def mock_app(self):
        app = Mock()
        app.notify = Mock()
        return app

    @pytest.fixture
    def executor(self, mock_app):
        return CommandExecutor(app=mock_app)

    def test_suggested_commands_panel_integration(self, executor, mock_app):
        """
        Test that CommandExecutor works with SuggestedCommandsPanel button clicks.
        
        Expected flow:
        1. User clicks button in SuggestedCommandsPanel
        2. Panel calls executor.execute_command(command)
        3. Command copied to clipboard
        4. Notification shows success
        5. Panel shows visual feedback
        """
        command = "/execute-tasks"
        
        with patch('pyperclip.copy') as mock_copy:
            # Simulate button click calling execute_command
            result = executor.execute_command(command)
            
            # Verify clipboard copy happened
            mock_copy.assert_called_once_with(command)
            
            # Verify notification shown
            assert mock_app.notify.called
            
            # Verify success result (panel can show visual feedback)
            assert result is True


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
