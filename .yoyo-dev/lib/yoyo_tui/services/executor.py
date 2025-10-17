"""
CommandExecutor Service

Executes shell commands with output streaming support.
Used for running Yoyo Dev commands and other CLI operations from the TUI.
"""

import subprocess
import threading
from dataclasses import dataclass
from typing import List, Optional, Callable, Dict


@dataclass
class CommandResult:
    """
    Result of command execution.

    Attributes:
        success: Whether command executed successfully (exit code 0)
        exit_code: Process exit code
        stdout: Standard output
        stderr: Standard error
        timed_out: Whether command timed out
    """
    success: bool
    exit_code: int
    stdout: str
    stderr: str
    timed_out: bool

    @property
    def has_output(self) -> bool:
        """Check if command produced output."""
        return bool(self.stdout.strip())

    @property
    def has_errors(self) -> bool:
        """Check if command produced errors."""
        return bool(self.stderr.strip())

    def __str__(self) -> str:
        """String representation."""
        status = "SUCCESS" if self.success else "FAILED"
        return f"CommandResult(status={status}, exit_code={self.exit_code})"


class CommandExecutor:
    """
    Execute shell commands with various options.

    Features:
    - Simple execution with captured output
    - Streaming execution with real-time callbacks
    - Timeout support
    - Working directory specification
    - Environment variable passing
    """

    @staticmethod
    def execute(
        command: List[str],
        cwd: Optional[str] = None,
        env: Optional[Dict[str, str]] = None,
        timeout: Optional[float] = 30.0
    ) -> CommandResult:
        """
        Execute command and capture output.

        Args:
            command: Command and arguments as list
            cwd: Working directory (default: current directory)
            env: Environment variables to pass
            timeout: Timeout in seconds (default: 30)

        Returns:
            CommandResult with execution results
        """
        try:
            result = subprocess.run(
                command,
                cwd=cwd,
                env=env,
                capture_output=True,
                text=True,
                timeout=timeout,
                check=False  # Don't raise on non-zero exit
            )

            return CommandResult(
                success=(result.returncode == 0),
                exit_code=result.returncode,
                stdout=result.stdout,
                stderr=result.stderr,
                timed_out=False
            )

        except subprocess.TimeoutExpired:
            return CommandResult(
                success=False,
                exit_code=-1,
                stdout="",
                stderr=f"Command timed out after {timeout} seconds",
                timed_out=True
            )

        except FileNotFoundError:
            return CommandResult(
                success=False,
                exit_code=-1,
                stdout="",
                stderr=f"Command not found: {command[0]}",
                timed_out=False
            )

        except Exception as e:
            return CommandResult(
                success=False,
                exit_code=-1,
                stdout="",
                stderr=f"Execution error: {str(e)}",
                timed_out=False
            )

    @staticmethod
    def execute_streaming(
        command: List[str],
        callback: Callable[[str], None],
        cwd: Optional[str] = None,
        env: Optional[Dict[str, str]] = None,
        timeout: Optional[float] = 30.0,
        capture_stderr: bool = False
    ) -> CommandResult:
        """
        Execute command with real-time output streaming.

        Args:
            command: Command and arguments as list
            callback: Function called for each line of output
            cwd: Working directory (default: current directory)
            env: Environment variables to pass
            timeout: Timeout in seconds (default: 30)
            capture_stderr: Whether to also stream stderr

        Returns:
            CommandResult with execution results
        """
        try:
            process = subprocess.Popen(
                command,
                cwd=cwd,
                env=env,
                stdout=subprocess.PIPE,
                stderr=subprocess.PIPE if capture_stderr else subprocess.DEVNULL,
                text=True,
                bufsize=1  # Line buffered
            )

            stdout_lines = []
            stderr_lines = []

            def read_stdout():
                """Read stdout in separate thread."""
                for line in process.stdout:
                    line = line.rstrip('\n')
                    stdout_lines.append(line)
                    try:
                        callback(line)
                    except Exception:
                        pass  # Ignore callback errors

            def read_stderr():
                """Read stderr in separate thread."""
                if process.stderr:
                    for line in process.stderr:
                        line = line.rstrip('\n')
                        stderr_lines.append(line)
                        if capture_stderr:
                            try:
                                callback(line)
                            except Exception:
                                pass  # Ignore callback errors

            # Start reader threads
            stdout_thread = threading.Thread(target=read_stdout, daemon=True)
            stderr_thread = threading.Thread(target=read_stderr, daemon=True)

            stdout_thread.start()
            stderr_thread.start()

            # Wait for process with timeout
            try:
                exit_code = process.wait(timeout=timeout)

                # Wait for threads to finish reading
                stdout_thread.join(timeout=1.0)
                stderr_thread.join(timeout=1.0)

                return CommandResult(
                    success=(exit_code == 0),
                    exit_code=exit_code,
                    stdout='\n'.join(stdout_lines),
                    stderr='\n'.join(stderr_lines),
                    timed_out=False
                )

            except subprocess.TimeoutExpired:
                process.kill()
                process.wait()

                return CommandResult(
                    success=False,
                    exit_code=-1,
                    stdout='\n'.join(stdout_lines),
                    stderr=f"Command timed out after {timeout} seconds",
                    timed_out=True
                )

        except FileNotFoundError:
            return CommandResult(
                success=False,
                exit_code=-1,
                stdout="",
                stderr=f"Command not found: {command[0]}",
                timed_out=False
            )

        except Exception as e:
            return CommandResult(
                success=False,
                exit_code=-1,
                stdout="",
                stderr=f"Execution error: {str(e)}",
                timed_out=False
            )

    @staticmethod
    def execute_yoyo_command(
        command_name: str,
        args: Optional[List[str]] = None,
        cwd: Optional[str] = None,
        callback: Optional[Callable[[str], None]] = None
    ) -> CommandResult:
        """
        Execute a Yoyo Dev command.

        Args:
            command_name: Command name (e.g., "create-new", "execute-tasks")
            args: Additional arguments
            cwd: Working directory
            callback: Optional callback for streaming output

        Returns:
            CommandResult with execution results
        """
        # Build command
        command = ['yoyo', command_name]
        if args:
            command.extend(args)

        if callback:
            return CommandExecutor.execute_streaming(command, callback, cwd=cwd)
        else:
            return CommandExecutor.execute(command, cwd=cwd)
