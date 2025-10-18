#!/usr/bin/env python3
"""
Simplified test for CommandExecutor clipboard bug.

Bug #3: CommandExecutor uses subprocess instead of clipboard integration.

This simplified test directly verifies the code behavior.
"""

import unittest
import sys
from pathlib import Path

# Add lib to path
sys.path.insert(0, str(Path.home() / '.yoyo-dev' / 'lib'))

from yoyo_tui.services.command_executor import CommandExecutor


class TestCommandExecutorClipboardBug(unittest.TestCase):
    """Verify the subprocess bug exists by examining the code."""

    def test_execute_command_uses_subprocess_popen(self):
        """
        Test that execute_command() uses subprocess.Popen instead of clipboard.

        EXPECTED: Should write command to clipboard using pyperclip
        ACTUAL: Spawns subprocess with subprocess.Popen(['claude'])

        BUG CONFIRMED: Examining source code shows subprocess.Popen is used.
        """
        # Read the source code
        source_file = Path.home() / '.yoyo-dev' / 'lib' / 'yoyo_tui' / 'services' / 'command_executor.py'
        source_code = source_file.read_text()

        # Verify subprocess.Popen is used
        self.assertIn('subprocess.Popen', source_code,
                      "Bug confirmed: subprocess.Popen is used in command_executor.py")

        # Verify it's in the execute_command method
        execute_command_section = source_code[source_code.find('def execute_command'):]
        execute_command_section = execute_command_section[:execute_command_section.find('\n    def ')]

        self.assertIn('subprocess.Popen', execute_command_section,
                      "BUG: execute_command() method uses subprocess.Popen")

        self.assertIn('["claude"]', execute_command_section,
                      "BUG: Spawns 'claude' subprocess instead of using clipboard")

    def test_no_clipboard_integration_exists(self):
        """
        Test that there is NO clipboard integration.

        EXPECTED: Should import and use pyperclip
        ACTUAL: No pyperclip usage anywhere in the code
        """
        source_file = Path.home() / '.yoyo-dev' / 'lib' / 'yoyo_tui' / 'services' / 'command_executor.py'
        source_code = source_file.read_text()

        # Verify pyperclip is NOT imported
        self.assertNotIn('pyperclip', source_code,
                         "Bug confirmed: No pyperclip import (no clipboard integration)")

        self.assertNotIn('clipboard', source_code.lower(),
                         "Bug confirmed: No clipboard-related code exists")

    def test_subprocess_writes_to_stdin(self):
        """
        Test that command is written to subprocess stdin instead of clipboard.

        EXPECTED: Command should go to clipboard
        ACTUAL: Command written to subprocess stdin
        """
        source_file = Path.home() / '.yoyo-dev' / 'lib' / 'yoyo_tui' / 'services' / 'command_executor.py'
        source_code = source_file.read_text()

        execute_command_section = source_code[source_code.find('def execute_command'):]
        execute_command_section = execute_command_section[:execute_command_section.find('\n    def ')]

        # Verify stdin is used
        self.assertIn('stdin', execute_command_section,
                      "BUG: Uses subprocess stdin instead of clipboard")

        self.assertIn('stdin.write', execute_command_section,
                      "BUG: Writes command to stdin (wrong approach)")

    def test_creates_subprocess_process_variable(self):
        """
        Test that code creates and stores subprocess instance.

        EXPECTED: No subprocess should be created
        ACTUAL: self._process stores subprocess.Popen instance
        """
        source_file = Path.home() / '.yoyo-dev' / 'lib' / 'yoyo_tui' / 'services' / 'command_executor.py'
        source_code = source_file.read_text()

        # Verify _process variable is used for subprocess
        self.assertIn('self._process', source_code,
                      "Bug: Stores subprocess in self._process")

        self.assertIn('self._process: Optional[subprocess.Popen]', source_code,
                      "Bug: Type hint shows subprocess.Popen is stored")

    def test_expected_fix_documented(self):
        """
        Document the expected fix.

        FIX: Replace subprocess.Popen with pyperclip.copy()
        """
        expected_fix = """
        Should use:
            import pyperclip

            def execute_command(self, command: str) -> bool:
                try:
                    # Copy to clipboard
                    pyperclip.copy(command)

                    # Notify user to paste
                    if self.app:
                        self.app.notify(
                            f"Command copied: {command}\\nPress Cmd+V to paste",
                            severity="information"
                        )

                    return True
                except Exception as e:
                    # Handle errors
                    return False
        """

        # This test always passes - it documents the expected fix
        self.assertTrue(True, f"Expected fix: {expected_fix}")


if __name__ == '__main__':
    unittest.main()
