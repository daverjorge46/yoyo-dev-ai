"""
Test suite for CommandExecutor clipboard integration.

This test file reproduces Bug #3: CommandExecutor uses subprocess instead of clipboard.

PROBLEM:
The CommandExecutor starts a subprocess to run Claude Code CLI, but this creates
several issues:
1. Cannot send commands to already-running Claude Code instance
2. Spawns duplicate Claude Code processes
3. No integration with TUI's parent Claude Code session
4. Commands execute in isolated subprocess, not current context

EXPECTED BEHAVIOR:
- CommandExecutor should write command to clipboard
- User pastes command into Claude Code with Cmd/Ctrl+V
- Command executes in current Claude Code session
- No subprocess spawning, clean integration

ACTUAL BEHAVIOR:
- Starts subprocess with subprocess.Popen(['claude'])
- Writes command to subprocess stdin
- Creates isolated Claude Code instance
- No integration with TUI's parent session

Following TDD approach - these tests should FAIL initially (red phase).
"""

import unittest
import sys
from pathlib import Path
from unittest.mock import MagicMock, patch, call

# Add lib to path for imports
sys.path.insert(0, str(Path.home() / '.yoyo-dev' / 'lib'))

from yoyo_tui.services.command_executor import CommandExecutor


class TestCommandExecutorClipboardIntegration:
    """Test CommandExecutor's clipboard integration instead of subprocess."""

    def test_execute_command_writes_to_clipboard(self):
        """
        Test that execute_command writes command to clipboard.

        Expected: Command text should be copied to system clipboard
        Actual: Command is sent to subprocess stdin

        FAIL: Bug reproduction - Uses subprocess instead of clipboard
        """
        with patch('pyperclip.copy') as mock_clipboard:
            executor = CommandExecutor()

            command = "/execute-tasks"
            executor.execute_command(command)

            # Expected: Should write to clipboard
            # Actual: Writes to subprocess stdin
            mock_clipboard.assert_called_once_with(command), \
                "EXPECTED: Command should be copied to clipboard\n" \
                "ACTUAL: Command sent to subprocess stdin\n" \
                "BUG: Lines 82-96 use subprocess.Popen instead of clipboard"

    def test_execute_command_does_not_spawn_subprocess(self):
        """
        Test that execute_command does NOT spawn a subprocess.

        Expected: No subprocess should be created
        Actual: subprocess.Popen(['claude']) is called

        FAIL: Bug reproduction - Spawns subprocess unnecessarily
        """
        with patch('subprocess.Popen') as mock_popen:
            with patch('pyperclip.copy'):
                executor = CommandExecutor()

                command = "/create-new"
                executor.execute_command(command)

                # Expected: Should NOT call subprocess.Popen
                # Actual: Calls subprocess.Popen(['claude'])
                mock_popen.assert_not_called(), \
                    "EXPECTED: Should not spawn subprocess\n" \
                    "ACTUAL: Spawns subprocess with Popen(['claude'])\n" \
                    "BUG: Lines 82-90 create subprocess unnecessarily"

    def test_execute_command_clipboard_preserves_command_text(self):
        """
        Test that clipboard contains exact command text.

        Expected: Clipboard should contain command exactly as provided
        Actual: Command written to subprocess stdin (not clipboard)

        FAIL: Bug reproduction - Clipboard not used at all
        """
        with patch('pyperclip.copy') as mock_clipboard:
            executor = CommandExecutor()

            command = "/review --devil"
            executor.execute_command(command)

            # Expected: Clipboard should have exact command text
            # Actual: Command goes to subprocess stdin
            mock_clipboard.assert_called_once()

            # Verify exact command text
            clipboard_content = mock_clipboard.call_args[0][0]
            assert clipboard_content == command, \
                "EXPECTED: Clipboard should contain exact command text\n" \
                "ACTUAL: Command sent to subprocess, not clipboard\n" \
                "BUG: No clipboard integration exists"

    def test_execute_command_notifies_user_to_paste(self):
        """
        Test that execute_command tells user to paste command.

        Expected: Notification should say "Command copied, press Cmd+V to paste"
        Actual: Notification says "Executing command..." (subprocess approach)

        FAIL: Bug reproduction - Wrong notification message
        """
        mock_app = MagicMock()

        with patch('pyperclip.copy'):
            executor = CommandExecutor(app=mock_app)

            command = "/execute-tasks"
            executor.execute_command(command)

            # Expected: Notification tells user to paste
            # Actual: Notification says "Executing..."
            mock_app.notify.assert_called()

            notification_message = mock_app.notify.call_args[0][0]

            assert "paste" in notification_message.lower() or "Cmd+V" in notification_message, \
                "EXPECTED: Notification should tell user to paste command\n" \
                "ACTUAL: Notification says 'Executing...' (subprocess approach)\n" \
                "BUG: Lines 74-79 show wrong notification for clipboard approach"


class TestCommandExecutorSubprocessProblems:
    """Test problems with current subprocess approach."""

    @patch('subprocess.Popen')
    def test_subprocess_creates_duplicate_claude_instance(self, mock_popen):
        """
        Test that subprocess approach creates duplicate Claude Code instance.

        Expected: Should integrate with existing Claude Code session
        Actual: Spawns new Claude Code subprocess

        FAIL: Bug reproduction - Creates duplicate processes
        """
        mock_process = MagicMock()
        mock_popen.return_value = mock_process

        executor = CommandExecutor()

        command = "/execute-tasks"
        executor.execute_command(command)

        # Current implementation DOES call Popen (the bug)
        # Expected behavior: Should NOT call Popen
        assert not mock_popen.called, \
            "EXPECTED: Should not spawn subprocess (use clipboard instead)\n" \
            "ACTUAL: Spawns subprocess.Popen(['claude'])\n" \
            "BUG: Creates duplicate Claude Code instance"

    @patch('subprocess.Popen')
    def test_subprocess_not_integrated_with_parent_session(self, mock_popen):
        """
        Test that subprocess runs in isolation, not parent Claude Code session.

        Expected: Command should execute in current Claude Code context
        Actual: Command executes in new subprocess with no context

        FAIL: Bug reproduction - Isolated execution context
        """
        mock_process = MagicMock()
        mock_popen.return_value = mock_process

        executor = CommandExecutor()

        command = "/execute-tasks"
        executor.execute_command(command)

        # Subprocess is called (current buggy behavior)
        # This means command runs in DIFFERENT context
        assert not mock_popen.called, \
            "EXPECTED: Command should run in current Claude Code session\n" \
            "ACTUAL: Subprocess spawns isolated Claude Code instance\n" \
            "BUG: No context sharing between TUI and command execution"

    @patch('subprocess.Popen')
    def test_subprocess_cannot_access_tui_context(self, mock_popen):
        """
        Test that subprocess cannot access TUI's project context.

        Expected: Command should see same CWD, git state, specs as TUI
        Actual: Subprocess starts fresh with no TUI context

        FAIL: Bug reproduction - Context isolation problem
        """
        mock_process = MagicMock()
        mock_popen.return_value = mock_process

        executor = CommandExecutor()

        # Execute command that needs project context
        command = "/execute-tasks"  # Needs access to tasks.md, specs, etc.
        executor.execute_command(command)

        # Verify subprocess is started (the problem)
        # Subprocess won't have access to TUI's loaded context
        assert not mock_popen.called, \
            "EXPECTED: Command executes in same context as TUI\n" \
            "ACTUAL: Subprocess starts fresh, loses TUI context\n" \
            "BUG: Subprocess cannot see TaskData, SpecList, etc. loaded in TUI"


class TestCommandExecutorBugDocumentation:
    """Document the exact bug behavior with clear expected vs actual."""

    def test_bug_reproduction_complete_workflow(self):
        """
        Complete bug reproduction showing exact issue.

        PROBLEM SUMMARY:
        ---------------
        command_executor.py lines 82-96:

        ```python
        # Start Claude Code subprocess
        self._process = subprocess.Popen(
            ["claude"],  # Claude Code CLI command
            stdin=subprocess.PIPE,
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
            text=True,
            cwd=Path.cwd(),
            bufsize=1
        )

        # Send command to stdin
        if self._process.stdin:
            self._process.stdin.write(f"{command}\n")
            self._process.stdin.flush()
            self._process.stdin.close()
        ```

        PROBLEMS:
        ---------
        1. **Duplicate Processes**: Spawns new Claude Code instance
           - TUI already runs inside Claude Code
           - New subprocess creates second instance
           - Resource waste, process management complexity

        2. **Context Isolation**: Subprocess has no TUI context
           - Cannot access TaskData loaded in TUI
           - Cannot see SpecList, git state, etc.
           - Starts fresh with no project knowledge

        3. **No Session Integration**: Cannot integrate with parent Claude
           - TUI runs INSIDE Claude Code session
           - Should execute command IN THAT SESSION
           - Subprocess creates entirely separate session

        4. **User Confusion**: User sees two Claude instances
           - Original Claude Code session (where TUI runs)
           - New subprocess spawned by executor
           - Unclear which one is executing command

        EXPECTED SOLUTION:
        ------------------
        Use clipboard integration instead:

        ```python
        import pyperclip

        def execute_command(self, command: str) -> bool:
            try:
                # Copy command to clipboard
                pyperclip.copy(command)

                # Notify user to paste
                if self.app:
                    self.app.notify(
                        f"Command copied: {command}\n"
                        "Press Cmd+V (Mac) or Ctrl+V (Linux/Windows) to paste",
                        severity="information",
                        timeout=5
                    )

                return True
            except Exception as e:
                # Handle clipboard errors
                logger.error(f"Failed to copy to clipboard: {e}")
                if self.app:
                    self.app.notify(
                        f"Clipboard error: {str(e)}",
                        severity="error"
                    )
                return False
        ```

        BENEFITS OF CLIPBOARD APPROACH:
        -------------------------------
        1. No subprocess spawning
        2. User pastes into current Claude Code session
        3. Command executes in same context as TUI
        4. Clean, simple integration
        5. User has control over when command executes

        IMPLEMENTATION:
        ---------------
        1. Replace subprocess.Popen with pyperclip.copy()
        2. Update notification to tell user to paste
        3. Remove subprocess cleanup code
        4. Add pyperclip to dependencies

        FAIL: This test reproduces the exact bug
        """
        with patch('subprocess.Popen') as mock_popen:
            with patch('pyperclip.copy') as mock_clipboard:
                mock_process = MagicMock()
                mock_popen.return_value = mock_process

                executor = CommandExecutor()
                command = "/execute-tasks"
                executor.execute_command(command)

                # BUG VERIFICATION:
                # ----------------

                # 1. Should NOT spawn subprocess
                assert not mock_popen.called, \
                    "EXPECTED: No subprocess spawning\n" \
                    "ACTUAL: subprocess.Popen(['claude']) called\n" \
                    "BUG: Lines 82-90 in command_executor.py"

                # 2. Should write to clipboard
                assert mock_clipboard.called, \
                    "EXPECTED: Command copied to clipboard\n" \
                    "ACTUAL: No clipboard integration\n" \
                    "BUG: No pyperclip usage in command_executor.py"

                # 3. Clipboard should have command text
                if mock_clipboard.called:
                    clipboard_content = mock_clipboard.call_args[0][0]
                    assert clipboard_content == command, \
                        "EXPECTED: Clipboard contains command text\n" \
                        "ACTUAL: Command sent to subprocess stdin\n" \
                        "BUG: Wrong integration approach"

    def test_clipboard_approach_would_fix_issue(self):
        """
        Test that clipboard approach would fix all issues.

        This test shows what the CORRECT behavior should be.

        PASS: This test shows the target behavior after fix
        """
        with patch('pyperclip.copy') as mock_clipboard:
            mock_app = MagicMock()

            # Simulated fixed implementation
            class FixedCommandExecutor:
                def __init__(self, app=None):
                    self.app = app

                def execute_command(self, command: str) -> bool:
                    """Fixed implementation using clipboard."""
                    if not command or not command.strip():
                        return False

                    try:
                        # Copy to clipboard (THE FIX)
                        import pyperclip
                        pyperclip.copy(command)

                        # Notify user to paste
                        if self.app:
                            self.app.notify(
                                f"Command copied: {command}\nPress Cmd+V to paste",
                                severity="information"
                            )

                        return True
                    except Exception:
                        return False

            executor = FixedCommandExecutor(app=mock_app)
            command = "/execute-tasks"
            result = executor.execute_command(command)

            # Verify correct behavior
            assert result is True, "Should succeed"
            mock_clipboard.assert_called_once_with(command), \
                "Should copy command to clipboard"

            # Verify notification
            mock_app.notify.assert_called_once()
            notification = mock_app.notify.call_args[0][0]
            assert "paste" in notification.lower() or "Cmd+V" in notification, \
                "Should tell user to paste"

            # This is what the code SHOULD do after fix


class TestCommandExecutorClipboardDependency:
    """Test clipboard library integration requirements."""

    def test_pyperclip_can_be_imported(self):
        """
        Test that pyperclip library is available.

        Expected: pyperclip should be importable
        Actual: May not be installed yet

        NOTE: This documents the dependency requirement
        """
        try:
            import pyperclip
            assert pyperclip is not None
        except ImportError:
            self.skipTest("pyperclip not installed (required for clipboard fix)")

    def test_pyperclip_copy_works(self):
        """
        Test that pyperclip.copy() works correctly.

        This verifies the clipboard library functions as needed.
        """
        try:
            import pyperclip

            test_text = "/execute-tasks"
            pyperclip.copy(test_text)

            # Verify copy worked (read back from clipboard)
            copied = pyperclip.paste()
            assert copied == test_text, \
                "pyperclip should correctly copy and paste text"
        except ImportError:
            self.skipTest("pyperclip not installed")
        except Exception as e:
            # Clipboard might not work in headless environments
            self.skipTest(f"Clipboard not available: {e}")


if __name__ == '__main__':
    pytest.main([__file__, '-v'])
