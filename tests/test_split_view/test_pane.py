"""
Tests for Pane and PaneBounds classes.

Tests pane management including pty creation, I/O operations, and lifecycle management.
"""

import pytest
import os
import time
import signal
from unittest.mock import Mock, patch, MagicMock

from lib.yoyo_tui_v3.split_view.pane import Pane, PaneBounds


class TestPaneBounds:
    """Tests for PaneBounds dataclass."""

    def test_create_pane_bounds(self):
        """Test creating PaneBounds with all parameters."""
        bounds = PaneBounds(x=0, y=0, width=80, height=24)
        
        assert bounds.x == 0
        assert bounds.y == 0
        assert bounds.width == 80
        assert bounds.height == 24

    def test_pane_bounds_equality(self):
        """Test PaneBounds equality comparison."""
        bounds1 = PaneBounds(x=0, y=0, width=80, height=24)
        bounds2 = PaneBounds(x=0, y=0, width=80, height=24)
        bounds3 = PaneBounds(x=10, y=0, width=80, height=24)
        
        assert bounds1 == bounds2
        assert bounds1 != bounds3

    def test_pane_bounds_immutable_fields(self):
        """Test that PaneBounds fields can be accessed."""
        bounds = PaneBounds(x=5, y=10, width=100, height=30)
        
        assert bounds.x == 5
        assert bounds.y == 10
        assert bounds.width == 100
        assert bounds.height == 30


class TestPaneCreation:
    """Tests for Pane initialization."""

    def test_create_pane(self):
        """Test creating a Pane instance."""
        bounds = PaneBounds(x=0, y=0, width=80, height=24)
        pane = Pane(command=["echo", "test"], bounds=bounds, name="Test Pane")
        
        assert pane.command == ["echo", "test"]
        assert pane.bounds == bounds
        assert pane.name == "Test Pane"
        assert pane.process is None
        assert pane.master_fd is None

    def test_pane_default_name(self):
        """Test Pane with default name."""
        bounds = PaneBounds(x=0, y=0, width=80, height=24)
        pane = Pane(command=["echo", "test"], bounds=bounds)
        
        assert pane.name == "Pane"


class TestPaneLifecycle:
    """Tests for Pane start, stop, and process management."""

    @patch('pty.fork')
    @patch('os.execvp')
    @patch('psutil.Process')
    def test_start_pane_parent_process(self, mock_process_class, mock_execvp, mock_fork):
        """Test starting a pane - parent process path."""
        # Mock pty.fork to return parent process
        mock_fork.return_value = (1234, 5)  # (pid, master_fd)
        
        # Mock psutil.Process
        mock_process = Mock()
        mock_process_class.return_value = mock_process
        
        bounds = PaneBounds(x=0, y=0, width=80, height=24)
        pane = Pane(command=["echo", "test"], bounds=bounds)
        
        with patch.object(pane, '_set_pty_size'):
            pane.start()
        
        # Verify fork was called
        mock_fork.assert_called_once()
        
        # Verify process was created with correct pid
        mock_process_class.assert_called_once_with(1234)
        
        # Verify pane has master_fd and process
        assert pane.master_fd == 5
        assert pane.process == mock_process
        
        # Verify execvp was NOT called (parent process)
        mock_execvp.assert_not_called()

    @patch('pty.fork')
    @patch('os.execvp')
    def test_start_pane_child_process(self, mock_execvp, mock_fork):
        """Test starting a pane - child process path."""
        # Mock pty.fork to return child process
        mock_fork.return_value = (0, 5)  # (pid=0 means child)
        
        bounds = PaneBounds(x=0, y=0, width=80, height=24)
        pane = Pane(command=["echo", "test"], bounds=bounds)
        
        pane.start()
        
        # Verify execvp was called with correct command
        mock_execvp.assert_called_once_with("echo", ["echo", "test"])

    @patch('fcntl.ioctl')
    def test_set_pty_size(self, mock_ioctl):
        """Test setting pty window size."""
        bounds = PaneBounds(x=0, y=0, width=80, height=24)
        pane = Pane(command=["echo", "test"], bounds=bounds)
        pane.master_fd = 5
        
        pane._set_pty_size()
        
        # Verify ioctl was called
        mock_ioctl.assert_called_once()
        
        # Verify the arguments (fd, TIOCSWINSZ, winsize struct)
        call_args = mock_ioctl.call_args
        assert call_args[0][0] == 5  # fd


class TestPaneIO:
    """Tests for Pane I/O operations."""

    def test_write_to_pane(self):
        """Test writing data to pane."""
        bounds = PaneBounds(x=0, y=0, width=80, height=24)
        pane = Pane(command=["cat"], bounds=bounds)
        pane.master_fd = 5
        
        with patch('os.write') as mock_write:
            pane.write(b"test data")
            mock_write.assert_called_once_with(5, b"test data")

    def test_write_without_fd(self):
        """Test writing when master_fd is None."""
        bounds = PaneBounds(x=0, y=0, width=80, height=24)
        pane = Pane(command=["cat"], bounds=bounds)
        
        # Should not raise exception
        pane.write(b"test data")

    def test_read_from_pane(self):
        """Test reading data from pane."""
        bounds = PaneBounds(x=0, y=0, width=80, height=24)
        pane = Pane(command=["cat"], bounds=bounds)
        pane.master_fd = 5
        
        with patch('os.read', return_value=b"output data") as mock_read:
            data = pane.read(1024)
            
            mock_read.assert_called_once_with(5, 1024)
            assert data == b"output data"

    def test_read_without_fd(self):
        """Test reading when master_fd is None."""
        bounds = PaneBounds(x=0, y=0, width=80, height=24)
        pane = Pane(command=["cat"], bounds=bounds)
        
        data = pane.read(1024)
        assert data == b''

    def test_read_with_oserror(self):
        """Test reading when OSError occurs."""
        bounds = PaneBounds(x=0, y=0, width=80, height=24)
        pane = Pane(command=["cat"], bounds=bounds)
        pane.master_fd = 5
        
        with patch('os.read', side_effect=OSError("Resource unavailable")):
            data = pane.read(1024)
            assert data == b''

    def test_fd_property(self):
        """Test fd property returns master_fd."""
        bounds = PaneBounds(x=0, y=0, width=80, height=24)
        pane = Pane(command=["cat"], bounds=bounds)
        pane.master_fd = 5
        
        assert pane.fd == 5


class TestPaneStatus:
    """Tests for checking pane status."""

    def test_is_alive_true(self):
        """Test is_alive returns True when process is running."""
        bounds = PaneBounds(x=0, y=0, width=80, height=24)
        pane = Pane(command=["sleep", "10"], bounds=bounds)
        
        mock_process = Mock()
        mock_process.is_running.return_value = True
        pane.process = mock_process
        
        assert pane.is_alive() is True

    def test_is_alive_false(self):
        """Test is_alive returns False when process is not running."""
        bounds = PaneBounds(x=0, y=0, width=80, height=24)
        pane = Pane(command=["echo", "test"], bounds=bounds)
        
        mock_process = Mock()
        mock_process.is_running.return_value = False
        pane.process = mock_process
        
        assert pane.is_alive() is False

    def test_is_alive_no_process(self):
        """Test is_alive returns False when process is None."""
        bounds = PaneBounds(x=0, y=0, width=80, height=24)
        pane = Pane(command=["echo", "test"], bounds=bounds)
        
        assert pane.is_alive() is False


class TestPaneResize:
    """Tests for pane resizing."""

    def test_resize_pane(self):
        """Test resizing a pane updates bounds and pty size."""
        old_bounds = PaneBounds(x=0, y=0, width=80, height=24)
        pane = Pane(command=["cat"], bounds=old_bounds)
        pane.master_fd = 5
        
        new_bounds = PaneBounds(x=0, y=0, width=100, height=30)
        
        with patch.object(pane, '_set_pty_size') as mock_set_size:
            pane.resize(new_bounds)
            
            assert pane.bounds == new_bounds
            mock_set_size.assert_called_once()


class TestPaneTermination:
    """Tests for pane termination."""

    def test_terminate_running_pane(self):
        """Test terminating a running pane."""
        bounds = PaneBounds(x=0, y=0, width=80, height=24)
        pane = Pane(command=["sleep", "100"], bounds=bounds)
        pane.master_fd = 5
        
        mock_process = Mock()
        mock_process.is_running.return_value = True
        pane.process = mock_process
        
        with patch('os.close') as mock_close:
            pane.terminate()
            
            mock_process.terminate.assert_called_once()
            mock_process.wait.assert_called_once_with(timeout=5)
            mock_close.assert_called_once_with(5)

    def test_terminate_stopped_pane(self):
        """Test terminating an already stopped pane."""
        bounds = PaneBounds(x=0, y=0, width=80, height=24)
        pane = Pane(command=["echo", "test"], bounds=bounds)
        pane.master_fd = 5
        
        mock_process = Mock()
        mock_process.is_running.return_value = False
        pane.process = mock_process
        
        with patch('os.close') as mock_close:
            pane.terminate()
            
            mock_process.terminate.assert_not_called()
            mock_close.assert_called_once_with(5)

    def test_terminate_no_process(self):
        """Test terminating when process is None."""
        bounds = PaneBounds(x=0, y=0, width=80, height=24)
        pane = Pane(command=["echo", "test"], bounds=bounds)
        pane.master_fd = 5
        
        with patch('os.close') as mock_close:
            pane.terminate()
            mock_close.assert_called_once_with(5)

    def test_terminate_no_fd(self):
        """Test terminating when master_fd is None."""
        bounds = PaneBounds(x=0, y=0, width=80, height=24)
        pane = Pane(command=["echo", "test"], bounds=bounds)
        
        mock_process = Mock()
        mock_process.is_running.return_value = True
        pane.process = mock_process
        
        pane.terminate()
        
        mock_process.terminate.assert_called_once()
        mock_process.wait.assert_called_once_with(timeout=5)


class TestPaneIntegration:
    """Integration tests for Pane (requires actual process spawning)."""

    @pytest.mark.skipif(os.environ.get('CI') == 'true', reason="Requires PTY support")
    def test_real_pane_lifecycle(self):
        """Test real pane creation, I/O, and termination."""
        bounds = PaneBounds(x=0, y=0, width=80, height=24)
        pane = Pane(command=["echo", "Hello, World!"], bounds=bounds, name="Echo Test")
        
        try:
            pane.start()
            
            # Give process time to start
            time.sleep(0.1)
            
            # Process should be alive initially
            assert pane.master_fd is not None
            assert pane.process is not None
            
            # Read output (may need retries as output is asynchronous)
            max_attempts = 10
            output = b''
            for _ in range(max_attempts):
                chunk = pane.read(1024)
                if chunk:
                    output += chunk
                if b"Hello, World!" in output:
                    break
                time.sleep(0.1)
            
            # Verify we got the expected output
            assert b"Hello, World!" in output
            
        finally:
            pane.terminate()

    @pytest.mark.skipif(os.environ.get('CI') == 'true', reason="Requires PTY support")
    def test_real_pane_write_and_read(self):
        """Test writing to and reading from a real pane."""
        bounds = PaneBounds(x=0, y=0, width=80, height=24)
        pane = Pane(command=["cat"], bounds=bounds, name="Cat Test")
        
        try:
            pane.start()
            time.sleep(0.1)
            
            # Write to cat
            pane.write(b"test input\n")
            time.sleep(0.1)
            
            # Read back (cat echoes input)
            output = pane.read(1024)
            
            assert b"test input" in output
            
        finally:
            pane.terminate()
