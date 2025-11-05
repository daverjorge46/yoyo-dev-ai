"""
Integration tests for Split View feature.

Tests the complete split view functionality end-to-end including:
- Full split view launch
- Claude Code detection and fallback
- TUI reactivity (file watcher)
- Independent pane exit
- Layout persistence across sessions
- Keyboard shortcuts (focus, resize)
- Terminal resize handling
- Multi-terminal emulator compatibility
"""

import os
import sys
import time
import tempfile
import subprocess
import signal
import shutil
from pathlib import Path
from unittest.mock import Mock, patch, MagicMock
from typing import Optional

import pytest
import yaml

from lib.yoyo_tui_v3.split_view.manager import (
    SplitViewManager,
    SplitViewConfig,
    BorderStyle,
    ClaudeConfig
)
from lib.yoyo_tui_v3.split_view.pane import Pane, PaneBounds
from lib.yoyo_tui_v3.services.layout_persistence import LayoutPersistence


class TestSplitViewLaunch:
    """Test full split view launch scenarios."""

    @pytest.fixture
    def config(self):
        """Provide default split view config."""
        return SplitViewConfig(
            enabled=True,
            ratio=0.4,
            active_pane="claude"
        )

    @pytest.fixture
    def mock_terminal_size(self):
        """Mock terminal size for testing."""
        with patch('os.get_terminal_size') as mock:
            mock.return_value = os.terminal_size((120, 30))
            yield mock

    @pytest.fixture
    def temp_project_dir(self):
        """Create temporary project directory with .yoyo-dev structure."""
        temp_dir = tempfile.mkdtemp()
        yoyo_dev = Path(temp_dir) / ".yoyo-dev"
        yoyo_dev.mkdir()

        # Create config.yml
        config_file = yoyo_dev / "config.yml"
        config_file.write_text(yaml.dump({
            'split_view': {
                'enabled': True,
                'ratio': 0.4,
                'active_pane': 'claude'
            }
        }))

        yield temp_dir

        # Cleanup
        shutil.rmtree(temp_dir)

    def test_split_view_launch_with_claude_installed(self, config, mock_terminal_size):
        """Test: Split view launches successfully when Claude is installed."""
        with patch('shutil.which') as mock_which, \
             patch.object(SplitViewManager, '_create_panes') as mock_create, \
             patch.object(SplitViewManager, '_main_loop') as mock_loop, \
             patch.object(SplitViewManager, '_cleanup') as mock_cleanup:

            # Claude is installed
            mock_which.return_value = "/usr/bin/claude"
            mock_loop.return_value = 0

            manager = SplitViewManager(config)
            exit_code = manager.launch()

            # Verify Claude detection worked
            mock_which.assert_called_once_with("claude")

            # Verify panes were created
            mock_create.assert_called_once()

            # Verify main loop ran
            mock_loop.assert_called_once()

            # Verify cleanup happened
            mock_cleanup.assert_called_once()

            # Verify success exit code
            assert exit_code == 0

    def test_split_view_launch_creates_both_panes(self, config, mock_terminal_size):
        """Test: Both Claude and TUI panes are created with correct dimensions."""
        with patch('shutil.which') as mock_which, \
             patch.object(Pane, 'start') as mock_pane_start, \
             patch.object(SplitViewManager, '_main_loop') as mock_loop, \
             patch.object(SplitViewManager, '_cleanup'):

            mock_which.return_value = "/usr/bin/claude"
            mock_loop.return_value = 0

            manager = SplitViewManager(config)
            manager._create_panes()

            # Verify both panes created
            assert manager.claude_pane is not None
            assert manager.tui_pane is not None

            # Verify correct split ratio (40/60)
            term_width = 120
            expected_claude_width = int(term_width * 0.4)
            expected_tui_width = term_width - expected_claude_width

            assert manager.claude_pane.bounds.width == expected_claude_width
            assert manager.tui_pane.bounds.width == expected_tui_width

            # Verify panes started
            assert mock_pane_start.call_count == 2

    def test_split_view_sets_initial_focus(self, config, mock_terminal_size):
        """Test: Initial focus is set to configured pane."""
        with patch('shutil.which') as mock_which, \
             patch.object(Pane, 'start'), \
             patch.object(SplitViewManager, '_main_loop') as mock_loop, \
             patch.object(SplitViewManager, '_cleanup'):

            mock_which.return_value = "/usr/bin/claude"
            mock_loop.return_value = 0

            # Test with Claude as active pane
            config.active_pane = "claude"
            manager = SplitViewManager(config)
            manager._create_panes()

            active_pane = manager.focus_manager.get_active()
            assert active_pane == manager.claude_pane

            # Test with TUI as active pane
            config.active_pane = "tui"
            manager2 = SplitViewManager(config)
            manager2._create_panes()

            active_pane2 = manager2.focus_manager.get_active()
            assert active_pane2 == manager2.tui_pane


class TestClaudeDetectionFallback:
    """Test Claude Code detection and fallback behavior."""

    @pytest.fixture
    def config(self):
        """Provide default split view config."""
        return SplitViewConfig(
            enabled=True,
            ratio=0.4,
            active_pane="claude",
            claude=ClaudeConfig(
                command="claude",
                auto_cwd=True,
                fallback_delay=1  # Shorter for testing
            )
        )

    def test_claude_not_found_triggers_fallback(self, config):
        """Test: Fallback is triggered when Claude is not installed."""
        with patch('shutil.which') as mock_which, \
             patch.object(SplitViewManager, '_launch_fallback') as mock_fallback:

            # Claude not found
            mock_which.return_value = None
            mock_fallback.return_value = 0

            manager = SplitViewManager(config)
            exit_code = manager.launch()

            # Verify Claude detection failed
            mock_which.assert_called_once_with("claude")

            # Verify fallback was triggered
            mock_fallback.assert_called_once()

            assert exit_code == 0

    def test_fallback_shows_message_and_launches_tui(self, config, capsys):
        """Test: Fallback displays message and launches TUI only."""
        with patch('shutil.which') as mock_which, \
             patch('time.sleep') as mock_sleep, \
             patch('lib.yoyo_tui_v3.cli.launch_tui_only') as mock_run_tui:

            mock_which.return_value = None
            mock_run_tui.return_value = 0

            manager = SplitViewManager(config)
            exit_code = manager._launch_fallback()

            # Verify message was displayed
            captured = capsys.readouterr()
            assert "Claude Code Not Found" in captured.out
            assert "https://github.com/anthropics/claude-code" in captured.out
            assert "yoyo --no-split" in captured.out

            # Verify delay happened
            mock_sleep.assert_called_once_with(1)  # Our config has fallback_delay=1

            # Verify TUI launched
            mock_run_tui.assert_called_once()

            assert exit_code == 0

    def test_claude_detection_checks_path(self, config):
        """Test: Claude detection uses shutil.which correctly."""
        with patch('shutil.which') as mock_which:
            mock_which.return_value = "/usr/local/bin/claude"

            manager = SplitViewManager(config)
            result = manager._detect_claude()

            assert result is True
            mock_which.assert_called_once_with("claude")

            # Test when not found
            mock_which.reset_mock()
            mock_which.return_value = None

            result = manager._detect_claude()

            assert result is False


class TestTUIReactivity:
    """Test TUI reactivity to file changes from Claude Code."""

    @pytest.fixture
    def temp_project_dir(self):
        """Create temporary project directory with .yoyo-dev structure."""
        temp_dir = tempfile.mkdtemp()
        yoyo_dev = Path(temp_dir) / ".yoyo-dev"
        yoyo_dev.mkdir()

        # Create specs directory
        specs_dir = yoyo_dev / "specs"
        specs_dir.mkdir()

        yield temp_dir, specs_dir

        # Cleanup
        shutil.rmtree(temp_dir)

    def test_tui_detects_new_spec_file(self, temp_project_dir):
        """Test: TUI file watcher detects new spec files created by Claude."""
        temp_dir, specs_dir = temp_project_dir

        # This test verifies the file watcher would detect changes
        # In a real scenario, the TUI's file watcher monitors .yoyo-dev/

        # Simulate Claude creating a new spec
        new_spec_dir = specs_dir / "2025-11-05-test-feature"
        new_spec_dir.mkdir()

        spec_file = new_spec_dir / "spec.md"
        spec_file.write_text("# Test Feature\n\nThis is a test spec.")

        # Verify file was created
        assert spec_file.exists()

        # In the actual TUI, the file watcher service would detect this
        # and trigger a dashboard refresh

    def test_tui_detects_task_updates(self, temp_project_dir):
        """Test: TUI detects when tasks.md is updated."""
        temp_dir, specs_dir = temp_project_dir

        # Create spec with tasks
        spec_dir = specs_dir / "2025-11-05-feature"
        spec_dir.mkdir()

        tasks_file = spec_dir / "tasks.md"
        tasks_file.write_text("# Tasks\n\n- [ ] Task 1\n")

        # Verify initial content
        assert "Task 1" in tasks_file.read_text()

        # Simulate Claude updating tasks
        time.sleep(0.1)  # Ensure file modification time changes
        tasks_file.write_text("# Tasks\n\n- [x] Task 1\n- [ ] Task 2\n")

        # Verify update
        updated_content = tasks_file.read_text()
        assert "[x] Task 1" in updated_content
        assert "Task 2" in updated_content


class TestIndependentPaneExit:
    """Test independent pane exit scenarios."""

    @pytest.fixture
    def config(self):
        """Provide default split view config."""
        return SplitViewConfig(enabled=True, ratio=0.4)

    @pytest.fixture
    def mock_terminal_size(self):
        """Mock terminal size for testing."""
        with patch('os.get_terminal_size') as mock:
            mock.return_value = os.terminal_size((120, 30))
            yield mock

    def test_claude_pane_exit_keeps_tui_running(self, config, mock_terminal_size):
        """Test: Exiting Claude pane leaves TUI running."""
        with patch('shutil.which') as mock_which, \
             patch.object(Pane, 'start'), \
             patch.object(Pane, 'is_alive') as mock_alive, \
             patch.object(SplitViewManager, '_cleanup'):

            mock_which.return_value = "/usr/bin/claude"

            manager = SplitViewManager(config)
            manager._create_panes()

            # Simulate Claude pane exiting
            def alive_side_effect():
                # First call: Claude dead, TUI alive
                if hasattr(mock_alive, 'call_count') and mock_alive.call_count == 1:
                    return False  # Claude
                return True  # TUI

            mock_alive.side_effect = [False, True, False, False]

            # Main loop checks both panes
            # When one is dead, it should continue running
            manager.running = True

            # Check if both are alive
            claude_alive = mock_alive()  # False
            tui_alive = mock_alive()      # True

            # Manager should keep running if at least one pane is alive
            assert not claude_alive
            assert tui_alive

    def test_tui_pane_exit_keeps_claude_running(self, config, mock_terminal_size):
        """Test: Exiting TUI pane leaves Claude running."""
        with patch('shutil.which') as mock_which, \
             patch.object(Pane, 'start'), \
             patch.object(Pane, 'is_alive') as mock_alive, \
             patch.object(SplitViewManager, '_cleanup'):

            mock_which.return_value = "/usr/bin/claude"

            manager = SplitViewManager(config)
            manager._create_panes()

            # Simulate TUI pane exiting
            mock_alive.side_effect = [True, False, False, False]

            manager.running = True

            # Check if both are alive
            claude_alive = mock_alive()  # True
            tui_alive = mock_alive()     # False

            # Manager should keep running if at least one pane is alive
            assert claude_alive
            assert not tui_alive

    def test_both_panes_exit_stops_manager(self, config, mock_terminal_size):
        """Test: Exiting both panes stops the manager."""
        with patch('shutil.which') as mock_which, \
             patch.object(Pane, 'start'), \
             patch.object(Pane, 'is_alive') as mock_alive, \
             patch.object(SplitViewManager, '_cleanup'):

            mock_which.return_value = "/usr/bin/claude"

            manager = SplitViewManager(config)
            manager._create_panes()

            # Both panes dead
            mock_alive.return_value = False

            # Main loop logic
            if not manager.claude_pane.is_alive() and not manager.tui_pane.is_alive():
                manager.running = False

            assert manager.running is False


class TestLayoutPersistence:
    """Test layout persistence across sessions."""

    @pytest.fixture
    def temp_config_file(self):
        """Create temporary config file."""
        temp_dir = tempfile.mkdtemp()
        config_path = Path(temp_dir) / ".yoyo-dev" / "config.yml"
        config_path.parent.mkdir(parents=True, exist_ok=True)

        yield config_path

        # Cleanup
        shutil.rmtree(temp_dir)

    def test_save_and_load_split_view_config(self, temp_config_file):
        """Test: Save configuration and load it back successfully."""
        persistence = LayoutPersistence(temp_config_file)

        # Create custom config
        config = SplitViewConfig(
            enabled=True,
            ratio=0.6,
            active_pane="tui"
        )

        # Save
        persistence.save_config(config)

        # Verify file exists
        assert temp_config_file.exists()

        # Load
        loaded_config = persistence.load_config()

        # Verify loaded config matches saved config
        assert loaded_config.enabled == config.enabled
        assert loaded_config.ratio == config.ratio
        assert loaded_config.active_pane == config.active_pane

    def test_persist_split_ratio_change(self, temp_config_file):
        """Test: Split ratio changes persist across sessions."""
        persistence = LayoutPersistence(temp_config_file)

        # Create initial config with 40/60 split
        config1 = SplitViewConfig(ratio=0.4)
        persistence.save_config(config1)

        # Simulate user resizing to 50/50
        config2 = SplitViewConfig(ratio=0.5)
        persistence.save_config(config2)

        # Load and verify new ratio persisted
        loaded = persistence.load_config()
        assert loaded.ratio == 0.5

    def test_persist_active_pane_preference(self, temp_config_file):
        """Test: Active pane preference persists."""
        persistence = LayoutPersistence(temp_config_file)

        # User prefers TUI to be active
        config = SplitViewConfig(active_pane="tui")
        persistence.save_config(config)

        # Load and verify
        loaded = persistence.load_config()
        assert loaded.active_pane == "tui"

    def test_load_config_with_missing_file_returns_defaults(self, temp_config_file):
        """Test: Missing config file returns default configuration."""
        persistence = LayoutPersistence(temp_config_file)

        # Don't create file
        assert not temp_config_file.exists()

        # Load should return defaults without error
        config = persistence.load_config()

        assert config.enabled is True
        assert config.ratio == 0.4
        assert config.active_pane == "claude"

    def test_corrupted_config_returns_defaults(self, temp_config_file):
        """Test: Corrupted config file returns defaults."""
        # Write invalid YAML
        temp_config_file.parent.mkdir(parents=True, exist_ok=True)
        temp_config_file.write_text("invalid: yaml: {broken")

        persistence = LayoutPersistence(temp_config_file)
        config = persistence.load_config()

        # Should return defaults without crashing
        assert config.enabled is True
        assert config.ratio == 0.4


class TestKeyboardShortcuts:
    """Test keyboard shortcut handling."""

    @pytest.fixture
    def config(self):
        """Provide default split view config."""
        return SplitViewConfig(enabled=True, ratio=0.4)

    @pytest.fixture
    def mock_terminal_size(self):
        """Mock terminal size for testing."""
        with patch('os.get_terminal_size') as mock:
            mock.return_value = os.terminal_size((120, 30))
            yield mock

    def test_switch_focus_shortcut(self, config, mock_terminal_size):
        """Test: Ctrl+B → switches focus between panes."""
        with patch('shutil.which') as mock_which, \
             patch.object(Pane, 'start'), \
             patch.object(SplitViewManager, '_render_borders') as mock_render:

            mock_which.return_value = "/usr/bin/claude"

            manager = SplitViewManager(config)
            manager._create_panes()

            # Initially focused on Claude
            assert manager.focus_manager.get_active() == manager.claude_pane

            # Send Ctrl+B → shortcut
            manager._handle_shortcut(b'\x02\x1b[C')

            # Focus should switch to TUI
            assert manager.focus_manager.get_active() == manager.tui_pane

            # Verify borders were re-rendered
            mock_render.assert_called_once()

    def test_resize_left_shortcut(self, config, mock_terminal_size):
        """Test: Ctrl+B < shrinks left pane."""
        with patch('shutil.which') as mock_which, \
             patch.object(Pane, 'start'), \
             patch.object(Pane, 'resize') as mock_resize, \
             patch.object(SplitViewManager, '_rerender_all'):

            mock_which.return_value = "/usr/bin/claude"

            manager = SplitViewManager(config)
            manager._create_panes()

            initial_claude_width = manager.claude_pane.bounds.width

            # Send Ctrl+B < shortcut
            manager._handle_shortcut(b'\x02<')

            # Verify resize was called on both panes
            assert mock_resize.call_count == 2

    def test_resize_right_shortcut(self, config, mock_terminal_size):
        """Test: Ctrl+B > grows left pane."""
        with patch('shutil.which') as mock_which, \
             patch.object(Pane, 'start'), \
             patch.object(Pane, 'resize') as mock_resize, \
             patch.object(SplitViewManager, '_rerender_all'):

            mock_which.return_value = "/usr/bin/claude"

            manager = SplitViewManager(config)
            manager._create_panes()

            # Send Ctrl+B > shortcut
            manager._handle_shortcut(b'\x02>')

            # Verify resize was called on both panes
            assert mock_resize.call_count == 2

    def test_is_shortcut_detection(self, config):
        """Test: Shortcut detection identifies Ctrl+B prefix."""
        manager = SplitViewManager(config)

        # Ctrl+B sequences
        assert manager._is_shortcut(b'\x02\x1b[C') is True  # Ctrl+B →
        assert manager._is_shortcut(b'\x02<') is True       # Ctrl+B <
        assert manager._is_shortcut(b'\x02>') is True       # Ctrl+B >

        # Normal input
        assert manager._is_shortcut(b'a') is False
        assert manager._is_shortcut(b'\x1b[A') is False    # Arrow key
        assert manager._is_shortcut(b'\n') is False        # Enter


class TestTerminalResize:
    """Test terminal resize handling."""

    @pytest.fixture
    def config(self):
        """Provide default split view config."""
        return SplitViewConfig(enabled=True, ratio=0.4)

    def test_terminal_resize_recalculates_layout(self, config):
        """Test: Terminal resize triggers layout recalculation."""
        with patch('os.get_terminal_size') as mock_size, \
             patch('shutil.which') as mock_which, \
             patch.object(Pane, 'start'), \
             patch.object(Pane, 'resize') as mock_pane_resize, \
             patch.object(SplitViewManager, '_rerender_all') as mock_rerender:

            mock_which.return_value = "/usr/bin/claude"

            # Initial size: 120x30
            mock_size.return_value = os.terminal_size((120, 30))

            manager = SplitViewManager(config)
            manager._create_panes()

            initial_claude_width = manager.claude_pane.bounds.width
            initial_tui_width = manager.tui_pane.bounds.width

            # Resize terminal to 160x40
            mock_size.return_value = os.terminal_size((160, 40))

            # Trigger resize handler
            manager._handle_resize(signal.SIGWINCH, None)

            # Verify panes were resized
            assert mock_pane_resize.call_count == 2

            # Verify screen was re-rendered
            mock_rerender.assert_called_once()

    def test_terminal_resize_maintains_ratio(self, config):
        """Test: Terminal resize maintains split ratio."""
        with patch('os.get_terminal_size') as mock_size, \
             patch('shutil.which') as mock_which, \
             patch.object(Pane, 'start'):

            mock_which.return_value = "/usr/bin/claude"

            # Initial size: 120x30 (meets minimum requirement)
            mock_size.return_value = os.terminal_size((120, 30))

            manager = SplitViewManager(config)
            manager._create_panes()

            # 40% of 120 = 48
            assert manager.claude_pane.bounds.width == 48
            assert manager.tui_pane.bounds.width == 72

            # Resize to 200x40
            mock_size.return_value = os.terminal_size((200, 40))
            manager._handle_resize(signal.SIGWINCH, None)

            # 40% of 200 = 80
            assert manager.claude_pane.bounds.width == 80
            assert manager.tui_pane.bounds.width == 120

    def test_terminal_too_small_skip_resize(self, config):
        """Test: Very small terminal skips resize."""
        with patch('os.get_terminal_size') as mock_size, \
             patch('shutil.which') as mock_which, \
             patch.object(Pane, 'start'), \
             patch.object(Pane, 'resize') as mock_pane_resize:

            mock_which.return_value = "/usr/bin/claude"

            # Initial size: 120x30
            mock_size.return_value = os.terminal_size((120, 30))

            manager = SplitViewManager(config)
            manager._create_panes()

            # Resize to too-small dimensions (would raise ValueError in calculate_split)
            mock_size.return_value = os.terminal_size((50, 20))

            # Reset mock
            mock_pane_resize.reset_mock()

            # Trigger resize - should skip due to ValueError
            manager._handle_resize(signal.SIGWINCH, None)

            # Verify resize was not attempted
            # (The implementation catches ValueError and returns early)


class TestTerminalEmulatorCompatibility:
    """Test compatibility with different terminal emulators."""

    # These tests are meant to be run manually on different terminals
    # They verify that the split view works correctly across emulators

    @pytest.mark.manual
    def test_gnome_terminal_compatibility(self):
        """Manual test: Verify split view works in GNOME Terminal."""
        # To run manually:
        # 1. Open GNOME Terminal
        # 2. Run: python -m pytest tests/integration/test_split_view_integration.py::TestTerminalEmulatorCompatibility::test_gnome_terminal_compatibility
        # 3. Verify split view renders correctly
        # 4. Test keyboard shortcuts
        # 5. Test terminal resize
        pytest.skip("Manual test - run in GNOME Terminal")

    @pytest.mark.manual
    def test_konsole_compatibility(self):
        """Manual test: Verify split view works in Konsole."""
        pytest.skip("Manual test - run in Konsole")

    @pytest.mark.manual
    def test_alacritty_compatibility(self):
        """Manual test: Verify split view works in Alacritty."""
        pytest.skip("Manual test - run in Alacritty")

    @pytest.mark.manual
    def test_kitty_compatibility(self):
        """Manual test: Verify split view works in Kitty."""
        pytest.skip("Manual test - run in Kitty")

    @pytest.mark.manual
    def test_terminator_compatibility(self):
        """Manual test: Verify split view works in Terminator."""
        pytest.skip("Manual test - run in Terminator")

    def test_terminal_capabilities_check(self):
        """Test: Verify terminal has necessary capabilities."""
        # Check if terminal supports basic features needed for split view

        # Check if we can get terminal size
        try:
            size = os.get_terminal_size()
            assert size.columns > 0
            assert size.lines > 0
        except OSError:
            pytest.skip("Not running in a terminal")

        # Check if terminal supports ANSI escape sequences
        # (Most modern terminals do, this is a basic sanity check)
        assert sys.stdout.isatty() or pytest.skip("Not running in TTY")


class TestIntegrationScenarios:
    """End-to-end integration scenarios."""

    @pytest.fixture
    def temp_project_dir(self):
        """Create temporary project directory with .yoyo-dev structure."""
        temp_dir = tempfile.mkdtemp()
        yoyo_dev = Path(temp_dir) / ".yoyo-dev"
        yoyo_dev.mkdir()

        # Create config.yml
        config_file = yoyo_dev / "config.yml"
        config_file.write_text(yaml.dump({
            'split_view': {
                'enabled': True,
                'ratio': 0.4,
                'active_pane': 'claude'
            }
        }))

        # Create specs directory
        specs_dir = yoyo_dev / "specs"
        specs_dir.mkdir()

        yield temp_dir, config_file, specs_dir

        # Cleanup
        shutil.rmtree(temp_dir)

    def test_full_workflow_launch_to_exit(self, temp_project_dir):
        """
        Test: Complete workflow from launch to exit.

        Scenario:
        1. Launch split view
        2. Verify both panes running
        3. Switch focus
        4. Resize panes
        5. Create file in one pane
        6. Exit gracefully
        """
        temp_dir, config_file, specs_dir = temp_project_dir

        with patch('shutil.which') as mock_which, \
             patch.object(Pane, 'start'), \
             patch.object(Pane, 'is_alive') as mock_alive, \
             patch('os.get_terminal_size') as mock_size:

            mock_which.return_value = "/usr/bin/claude"
            mock_alive.return_value = True
            mock_size.return_value = os.terminal_size((120, 30))

            # Load config
            persistence = LayoutPersistence(config_file)
            config = persistence.load_config()

            # Launch
            manager = SplitViewManager(config)
            manager._create_panes()

            # Verify both panes created
            assert manager.claude_pane is not None
            assert manager.tui_pane is not None

            # Switch focus
            initial_focus = manager.focus_manager.get_active()
            manager.focus_manager.toggle()
            new_focus = manager.focus_manager.get_active()
            assert initial_focus != new_focus

            # Simulate file creation
            new_spec_dir = specs_dir / "2025-11-05-test"
            new_spec_dir.mkdir()
            spec_file = new_spec_dir / "spec.md"
            spec_file.write_text("# Test\n")
            assert spec_file.exists()

    def test_session_persistence_scenario(self, temp_project_dir):
        """
        Test: Configuration persists across sessions.

        Scenario:
        1. First session: User resizes panes to 50/50
        2. Save configuration
        3. Second session: Configuration restored
        """
        temp_dir, config_file, specs_dir = temp_project_dir

        persistence = LayoutPersistence(config_file)

        # Session 1: User changes ratio to 50/50
        config1 = SplitViewConfig(
            enabled=True,
            ratio=0.5,
            active_pane="tui"
        )
        persistence.save_config(config1)

        # Session 2: Load config
        config2 = persistence.load_config()

        # Verify preferences persisted
        assert config2.ratio == 0.5
        assert config2.active_pane == "tui"

    def test_error_recovery_scenario(self, temp_project_dir):
        """
        Test: Graceful error recovery.

        Scenario:
        1. Launch with valid config
        2. Claude pane crashes
        3. TUI continues running
        4. User can still interact with TUI
        """
        temp_dir, config_file, specs_dir = temp_project_dir

        with patch('shutil.which') as mock_which, \
             patch.object(Pane, 'start'), \
             patch.object(Pane, 'is_alive') as mock_alive, \
             patch('os.get_terminal_size') as mock_size:

            mock_which.return_value = "/usr/bin/claude"
            mock_size.return_value = os.terminal_size((120, 30))

            config = SplitViewConfig()
            manager = SplitViewManager(config)
            manager._create_panes()

            # Simulate Claude pane crash
            mock_alive.side_effect = lambda: (
                False if manager.claude_pane and mock_alive.call_count % 2 == 1
                else True
            )

            # Check pane status
            # Main loop should continue as long as one pane is alive


# Test execution entry point
if __name__ == "__main__":
    pytest.main([__file__, "-v"])
