"""
Pane management for split view.

Manages individual panes including process lifecycle, pty I/O, and terminal control.
"""

import os
import pty
import struct
import fcntl
import termios
from collections import deque
from dataclasses import dataclass
from typing import List, Optional, Deque

import psutil


# Performance configuration
MAX_SCROLL_BUFFER_LINES = 10000  # Limit scroll buffer to prevent memory bloat


@dataclass
class PaneBounds:
    """Defines rectangular area for a pane."""
    x: int        # Left column (0-indexed)
    y: int        # Top row (0-indexed)
    width: int    # Width in columns
    height: int   # Height in rows


class Pane:
    """
    Manages a single pane with its own process and pseudo-terminal.

    A pane represents a rectangular area of the terminal that runs an independent
    process (like Claude Code or the Yoyo TUI) in its own pty.

    Includes scroll buffer limiting to prevent memory bloat during long sessions.
    """

    def __init__(self, command: List[str], bounds: PaneBounds, name: str = "Pane",
                 max_buffer_lines: int = MAX_SCROLL_BUFFER_LINES):
        """
        Initialize a pane.

        Args:
            command: Command to execute in the pane (list of strings)
            bounds: Rectangular bounds for the pane
            name: Human-readable name for the pane
            max_buffer_lines: Maximum lines to keep in scroll buffer (default: 10,000)
        """
        self.command = command
        self.bounds = bounds
        self.name = name
        self.process: Optional[psutil.Process] = None
        self.master_fd: Optional[int] = None

        # Scroll buffer management (limits memory usage)
        self.max_buffer_lines = max_buffer_lines
        self.output_buffer: Deque[bytes] = deque(maxlen=max_buffer_lines)
        self.buffer_size_bytes = 0
    
    def start(self):
        """
        Spawn process in pseudo-terminal.
        
        Uses pty.fork() to create a child process with a pty. The parent process
        keeps the master file descriptor for I/O, while the child process execs
        the specified command.
        """
        pid, master_fd = pty.fork()
        
        if pid == 0:
            # Child process - exec command
            os.execvp(self.command[0], self.command)
        else:
            # Parent process - keep master fd and create process object
            self.master_fd = master_fd
            self.process = psutil.Process(pid)
            
            # Set pty size to match pane bounds
            self._set_pty_size()
    
    def _set_pty_size(self):
        """
        Set pty window size to match pane bounds.
        
        Uses TIOCSWINSZ ioctl to inform the pty about its window size.
        This ensures applications running in the pane render correctly.
        """
        if self.master_fd is None:
            return
        
        # Pack window size as: rows, cols, xpixel, ypixel
        # (xpixel and ypixel are unused by most applications)
        winsize = struct.pack('HHHH',
                             self.bounds.height,
                             self.bounds.width,
                             0, 0)
        
        fcntl.ioctl(self.master_fd, termios.TIOCSWINSZ, winsize)
    
    def write(self, data: bytes):
        """
        Send input to pane's process.
        
        Args:
            data: Raw bytes to write to the pty master
        """
        if self.master_fd is not None:
            os.write(self.master_fd, data)
    
    def read(self, size: int = 1024) -> bytes:
        """
        Read output from pane's process (non-blocking).

        Implements scroll buffer limiting by tracking output lines and
        automatically discarding old data when MAX_SCROLL_BUFFER_LINES is exceeded.

        Args:
            size: Maximum number of bytes to read

        Returns:
            Bytes read from pty master, or empty bytes if unavailable
        """
        if self.master_fd is None:
            return b''

        try:
            data = os.read(self.master_fd, size)

            # Track output in buffer (with automatic size limiting via deque)
            if data:
                # Split by newlines to count lines
                lines = data.split(b'\n')
                for line in lines:
                    if line:  # Skip empty lines
                        self.output_buffer.append(line)
                        self.buffer_size_bytes += len(line)

                # Recalculate buffer size if we've hit the limit
                # (deque automatically pops old items when maxlen is exceeded)
                if len(self.output_buffer) >= self.max_buffer_lines:
                    self.buffer_size_bytes = sum(len(line) for line in self.output_buffer)

            return data
        except OSError:
            # Resource temporarily unavailable (EAGAIN) or other I/O error
            return b''
    
    @property
    def fd(self) -> Optional[int]:
        """
        Get file descriptor for select().
        
        Returns:
            Master file descriptor for the pty
        """
        return self.master_fd
    
    def is_alive(self) -> bool:
        """
        Check if process is still running.
        
        Returns:
            True if process exists and is running, False otherwise
        """
        if self.process is None:
            return False
        
        return self.process.is_running()
    
    def resize(self, new_bounds: PaneBounds):
        """
        Update pane bounds and pty size.
        
        Args:
            new_bounds: New rectangular bounds for the pane
        """
        self.bounds = new_bounds
        self._set_pty_size()
    
    def get_memory_stats(self) -> dict:
        """
        Get memory usage statistics for this pane.

        Returns:
            dict: Memory statistics including:
                - buffer_lines: Number of lines in scroll buffer
                - buffer_bytes: Size of scroll buffer in bytes
                - buffer_mb: Size of scroll buffer in MB
                - process_rss_mb: Process resident set size in MB (if available)
                - max_buffer_lines: Maximum allowed buffer lines
        """
        stats = {
            'buffer_lines': len(self.output_buffer),
            'buffer_bytes': self.buffer_size_bytes,
            'buffer_mb': self.buffer_size_bytes / 1024 / 1024,
            'max_buffer_lines': self.max_buffer_lines,
            'process_rss_mb': None
        }

        # Get process memory if available
        if self.process is not None and self.is_alive():
            try:
                mem_info = self.process.memory_info()
                stats['process_rss_mb'] = mem_info.rss / 1024 / 1024
            except (psutil.NoSuchProcess, psutil.AccessDenied):
                pass

        return stats

    def terminate(self):
        """
        Kill the pane's process and close file descriptors.

        Attempts graceful termination with a timeout, then closes the master fd.
        """
        # Terminate process if running
        if self.process is not None and self.process.is_running():
            self.process.terminate()
            try:
                self.process.wait(timeout=5)
            except psutil.TimeoutExpired:
                # Force kill if graceful termination fails
                self.process.kill()

        # Close master fd
        if self.master_fd is not None:
            os.close(self.master_fd)
            self.master_fd = None

        # Clear buffers to free memory
        self.output_buffer.clear()
        self.buffer_size_bytes = 0
