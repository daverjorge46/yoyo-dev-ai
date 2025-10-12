"""
Tests for CommandExecutor.

Tests command execution with output streaming.
"""

import pytest
from pathlib import Path
from lib.yoyo_tui.services.executor import CommandExecutor, CommandResult


class TestCommandExecutor:
    """Test suite for CommandExecutor."""

    def test_execute_simple_command(self):
        """Test executing a simple command."""
        result = CommandExecutor.execute(['echo', 'hello'])

        assert result.success is True
        assert result.exit_code == 0
        assert 'hello' in result.stdout

    def test_execute_command_with_error(self):
        """Test executing a command that fails."""
        result = CommandExecutor.execute(['ls', '/nonexistent/path'])

        assert result.success is False
        assert result.exit_code != 0
        assert len(result.stderr) > 0

    def test_execute_with_cwd(self, tmp_path):
        """Test executing command in specific directory."""
        test_file = tmp_path / "test.txt"
        test_file.write_text("test content")

        result = CommandExecutor.execute(['ls', 'test.txt'], cwd=str(tmp_path))

        assert result.success is True
        assert 'test.txt' in result.stdout

    def test_execute_with_timeout(self):
        """Test command timeout."""
        # Sleep command that exceeds timeout
        result = CommandExecutor.execute(['sleep', '10'], timeout=0.5)

        assert result.success is False
        assert result.timed_out is True

    def test_execute_command_not_found(self):
        """Test executing non-existent command."""
        result = CommandExecutor.execute(['nonexistent_command_12345'])

        assert result.success is False
        assert result.exit_code != 0

    def test_command_result_properties(self):
        """Test CommandResult properties."""
        # Success result
        success_result = CommandResult(
            success=True,
            exit_code=0,
            stdout="output",
            stderr="",
            timed_out=False
        )

        assert success_result.success is True
        assert success_result.has_output is True
        assert success_result.has_errors is False

        # Error result
        error_result = CommandResult(
            success=False,
            exit_code=1,
            stdout="",
            stderr="error message",
            timed_out=False
        )

        assert error_result.success is False
        assert error_result.has_output is False
        assert error_result.has_errors is True

    def test_execute_yoyo_dev_command(self):
        """Test executing a Yoyo Dev command (if available)."""
        # Try to execute yoyo --version
        result = CommandExecutor.execute(['yoyo', '--version'])

        # Command might not be available, just test the mechanism
        assert isinstance(result, CommandResult)
        assert isinstance(result.success, bool)

    def test_execute_python_command(self):
        """Test executing Python command."""
        result = CommandExecutor.execute(['python3', '--version'])

        assert result.success is True
        assert 'Python' in result.stdout or 'Python' in result.stderr

    def test_execute_with_streaming_callback(self):
        """Test command execution with streaming callback."""
        output_lines = []

        def callback(line: str):
            output_lines.append(line)

        result = CommandExecutor.execute_streaming(
            ['echo', 'line1 line2 line3'],
            callback=callback
        )

        assert result.success is True
        # Callback should have been called with output
        assert len(output_lines) > 0

    def test_execute_streaming_multiline_output(self):
        """Test streaming with multiline command output."""
        output_lines = []

        def callback(line: str):
            output_lines.append(line)

        # Use printf for multiline output
        result = CommandExecutor.execute_streaming(
            ['bash', '-c', 'printf "line1\\nline2\\nline3\\n"'],
            callback=callback
        )

        assert result.success is True
        # Should have captured multiple lines
        assert len(output_lines) >= 3

    def test_execute_streaming_error_output(self):
        """Test streaming with error output."""
        stderr_lines = []

        def callback(line: str):
            stderr_lines.append(line)

        result = CommandExecutor.execute_streaming(
            ['bash', '-c', 'echo "error" >&2'],
            callback=callback,
            capture_stderr=True
        )

        # Should capture stderr
        assert len(stderr_lines) > 0 or len(result.stderr) > 0

    def test_execute_streaming_with_timeout(self):
        """Test streaming execution with timeout."""
        output_lines = []

        def callback(line: str):
            output_lines.append(line)

        result = CommandExecutor.execute_streaming(
            ['sleep', '10'],
            callback=callback,
            timeout=0.5
        )

        assert result.success is False
        assert result.timed_out is True

    def test_execute_git_command(self):
        """Test executing git command."""
        result = CommandExecutor.execute(['git', '--version'])

        assert result.success is True
        assert 'git version' in result.stdout

    def test_execute_with_env_variables(self):
        """Test executing command with environment variables."""
        result = CommandExecutor.execute(
            ['bash', '-c', 'echo $TEST_VAR'],
            env={'TEST_VAR': 'test_value'}
        )

        assert result.success is True
        assert 'test_value' in result.stdout

    def test_command_result_str_representation(self):
        """Test CommandResult string representation."""
        result = CommandResult(
            success=True,
            exit_code=0,
            stdout="output text",
            stderr="",
            timed_out=False
        )

        str_repr = str(result)
        assert 'success' in str_repr.lower() or 'output' in str_repr

    def test_execute_parallel_commands(self):
        """Test executing multiple commands in parallel (if supported)."""
        # Execute two independent commands
        result1 = CommandExecutor.execute(['echo', 'command1'])
        result2 = CommandExecutor.execute(['echo', 'command2'])

        assert result1.success is True
        assert result2.success is True
        assert 'command1' in result1.stdout
        assert 'command2' in result2.stdout

    def test_command_result_has_output_property(self):
        """Test CommandResult.has_output property."""
        # With output
        result_with_output = CommandResult(
            success=True,
            exit_code=0,
            stdout="some output",
            stderr="",
            timed_out=False
        )
        assert result_with_output.has_output is True

        # Without output
        result_no_output = CommandResult(
            success=True,
            exit_code=0,
            stdout="",
            stderr="",
            timed_out=False
        )
        assert result_no_output.has_output is False

    def test_command_result_has_errors_property(self):
        """Test CommandResult.has_errors property."""
        # With errors
        result_with_errors = CommandResult(
            success=False,
            exit_code=1,
            stdout="",
            stderr="error message",
            timed_out=False
        )
        assert result_with_errors.has_errors is True

        # Without errors
        result_no_errors = CommandResult(
            success=True,
            exit_code=0,
            stdout="output",
            stderr="",
            timed_out=False
        )
        assert result_no_errors.has_errors is False
