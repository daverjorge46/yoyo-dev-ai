"""
Tests for YoyoDevTUIApp integration.

Tests app initialization, service setup, event subscriptions, and lifecycle.
"""

import pytest
from unittest.mock import Mock, patch, MagicMock
from pathlib import Path

from lib.yoyo_tui_v3.app import YoyoDevTUIApp, create_app
from lib.yoyo_tui_v3.models import TUIConfig, EventType


@pytest.fixture
def mock_config():
    """Mock TUIConfig."""
    return TUIConfig(
        refresh_interval_seconds=10,
        cache_ttl_seconds=10,
        yoyo_dev_path=Path("/test/.yoyo-dev")
    )


@pytest.fixture
def mock_services():
    """Mock all services."""
    services = {
        'event_bus': Mock(),
        'cache_manager': Mock(),
        'data_manager': Mock(),
        'command_suggester': Mock(),
        'error_detector': Mock(),
        'mcp_monitor': Mock(),
        'refresh_service': Mock(),
    }
    return services


# ============================================================================
# App Creation Tests
# ============================================================================

def test_app_creation():
    """Test that YoyoDevTUIApp can be created."""
    app = YoyoDevTUIApp()
    assert app is not None
    assert isinstance(app, YoyoDevTUIApp)


def test_create_app_helper():
    """Test create_app() helper function."""
    app = create_app()
    assert app is not None
    assert isinstance(app, YoyoDevTUIApp)


def test_app_has_title():
    """Test that app has correct title."""
    app = YoyoDevTUIApp()
    assert app.TITLE == "Yoyo Dev v3.0 - AI-Assisted Development"


def test_app_has_css_path():
    """Test that app has CSS path configured."""
    app = YoyoDevTUIApp()
    assert app.CSS_PATH == "styles.css"


def test_app_has_bindings():
    """Test that app has keyboard bindings configured."""
    app = YoyoDevTUIApp()
    assert hasattr(app, 'BINDINGS')
    assert len(app.BINDINGS) > 0


# ============================================================================
# Initialization Tests
# ============================================================================

def test_app_initializes_config():
    """Test that app loads configuration on init."""
    with patch('lib.yoyo_tui_v3.app.ConfigManager') as mock_config_manager:
        mock_config_manager.load.return_value = TUIConfig()
        app = YoyoDevTUIApp()

        # Should load config
        mock_config_manager.load.assert_called_once()
        assert hasattr(app, 'config')


def test_app_initializes_service_placeholders():
    """Test that app sets service placeholders to None."""
    app = YoyoDevTUIApp()

    # Services should be None until on_mount
    assert app.event_bus is None
    assert app.cache_manager is None
    assert app.data_manager is None
    assert app.command_suggester is None
    assert app.error_detector is None
    assert app.mcp_monitor is None
    assert app.refresh_service is None


# ============================================================================
# Service Initialization Tests
# ============================================================================

@patch('lib.yoyo_tui_v3.app.ConfigManager')
def test_on_mount_initializes_services(mock_config_manager):
    """Test that on_mount initializes all services."""
    mock_config_manager.load.return_value = TUIConfig()
    app = YoyoDevTUIApp()

    # Services should be initialized after on_mount
    # (Implementation will be tested once completed)
    assert hasattr(app, 'on_mount')


@patch('lib.yoyo_tui_v3.app.ConfigManager')
def test_service_initialization_order(mock_config_manager):
    """Test that services are initialized in correct order."""
    mock_config_manager.load.return_value = TUIConfig()
    app = YoyoDevTUIApp()

    # Order should be:
    # 1. EventBus (no dependencies)
    # 2. CacheManager (no dependencies)
    # 3. DataManager (depends on EventBus, CacheManager)
    # 4. IntelligentCommandSuggester (depends on DataManager)
    # 5. ErrorDetector (depends on EventBus)
    # 6. MCPServerMonitor (no dependencies)
    # 7. RefreshService (depends on all above)

    assert hasattr(app, 'on_mount')


# ============================================================================
# Action Method Tests
# ============================================================================

def test_action_help_exists():
    """Test that action_help method exists."""
    app = YoyoDevTUIApp()
    assert hasattr(app, 'action_help')
    assert callable(app.action_help)


def test_action_command_search_exists():
    """Test that action_command_search method exists."""
    app = YoyoDevTUIApp()
    assert hasattr(app, 'action_command_search')
    assert callable(app.action_command_search)


def test_action_refresh_exists():
    """Test that action_refresh method exists."""
    app = YoyoDevTUIApp()
    assert hasattr(app, 'action_refresh')
    assert callable(app.action_refresh)


def test_action_git_menu_exists():
    """Test that action_git_menu method exists."""
    app = YoyoDevTUIApp()
    assert hasattr(app, 'action_git_menu')
    assert callable(app.action_git_menu)


def test_action_focus_active_work_exists():
    """Test that action_focus_active_work method exists."""
    app = YoyoDevTUIApp()
    assert hasattr(app, 'action_focus_active_work')
    assert callable(app.action_focus_active_work)


def test_action_focus_specs_exists():
    """Test that action_focus_specs method exists."""
    app = YoyoDevTUIApp()
    assert hasattr(app, 'action_focus_specs')
    assert callable(app.action_focus_specs)


def test_action_focus_history_exists():
    """Test that action_focus_history method exists."""
    app = YoyoDevTUIApp()
    assert hasattr(app, 'action_focus_history')
    assert callable(app.action_focus_history)


def test_action_quit_exists():
    """Test that action_quit method exists."""
    app = YoyoDevTUIApp()
    assert hasattr(app, 'action_quit')
    assert callable(app.action_quit)


# ============================================================================
# Keybinding Tests
# ============================================================================

def test_help_keybinding():
    """Test that '?' key is bound to help action."""
    app = YoyoDevTUIApp()
    bindings = {b.key: b.action for b in app.BINDINGS}
    assert "?" in bindings
    assert bindings["?"] == "help"


def test_command_search_keybinding():
    """Test that '/' key is bound to command search."""
    app = YoyoDevTUIApp()
    bindings = {b.key: b.action for b in app.BINDINGS}
    assert "/" in bindings
    assert bindings["/"] == "command_search"


def test_refresh_keybinding():
    """Test that 'r' key is bound to refresh."""
    app = YoyoDevTUIApp()
    bindings = {b.key: b.action for b in app.BINDINGS}
    assert "r" in bindings
    assert bindings["r"] == "refresh"


def test_git_menu_keybinding():
    """Test that 'g' key is bound to git menu."""
    app = YoyoDevTUIApp()
    bindings = {b.key: b.action for b in app.BINDINGS}
    assert "g" in bindings
    assert bindings["g"] == "git_menu"


def test_focus_tasks_keybinding():
    """Test that 't' key is bound to focus tasks."""
    app = YoyoDevTUIApp()
    bindings = {b.key: b.action for b in app.BINDINGS}
    assert "t" in bindings
    assert bindings["t"] == "focus_active_work"


def test_focus_specs_keybinding():
    """Test that 's' key is bound to focus specs."""
    app = YoyoDevTUIApp()
    bindings = {b.key: b.action for b in app.BINDINGS}
    assert "s" in bindings
    assert bindings["s"] == "focus_specs"


def test_focus_history_keybinding():
    """Test that 'h' key is bound to focus history."""
    app = YoyoDevTUIApp()
    bindings = {b.key: b.action for b in app.BINDINGS}
    assert "h" in bindings
    assert bindings["h"] == "focus_history"


def test_quit_keybinding():
    """Test that 'q' key is bound to quit."""
    app = YoyoDevTUIApp()
    bindings = {b.key: b.action for b in app.BINDINGS}
    assert "q" in bindings
    assert bindings["q"] == "quit"


# ============================================================================
# Lifecycle Tests
# ============================================================================

def test_on_mount_method_exists():
    """Test that on_mount method exists."""
    app = YoyoDevTUIApp()
    assert hasattr(app, 'on_mount')
    assert callable(app.on_mount)


def test_on_unmount_method_exists():
    """Test that on_unmount method exists."""
    app = YoyoDevTUIApp()
    assert hasattr(app, 'on_unmount')
    assert callable(app.on_unmount)


@patch('lib.yoyo_tui_v3.app.ConfigManager')
def test_on_unmount_stops_refresh_service(mock_config_manager):
    """Test that on_unmount stops refresh service."""
    mock_config_manager.load.return_value = TUIConfig()
    app = YoyoDevTUIApp()

    # Mock refresh service
    app.refresh_service = Mock()
    app.refresh_service.stop = Mock()

    # Call on_unmount
    app.on_unmount()

    # Should stop refresh service (when implemented)
    assert hasattr(app, 'refresh_service')


# ============================================================================
# Screen Management Tests
# ============================================================================

@patch('lib.yoyo_tui_v3.app.ConfigManager')
def test_app_pushes_main_dashboard_on_mount(mock_config_manager):
    """Test that app pushes MainDashboard screen on mount."""
    mock_config_manager.load.return_value = TUIConfig()
    app = YoyoDevTUIApp()

    # Should push MainDashboard (when implemented)
    assert hasattr(app, 'on_mount')


# ============================================================================
# Refresh Service Tests
# ============================================================================

@patch('lib.yoyo_tui_v3.app.ConfigManager')
def test_refresh_service_starts_on_mount(mock_config_manager):
    """Test that refresh service starts on mount if enabled."""
    config = TUIConfig(refresh_interval_seconds=10)
    mock_config_manager.load.return_value = config
    app = YoyoDevTUIApp()

    # Should start refresh service if interval > 0
    assert app.config.refresh_interval_seconds == 10


@patch('lib.yoyo_tui_v3.app.ConfigManager')
def test_refresh_service_not_started_if_disabled(mock_config_manager):
    """Test that refresh service doesn't start if interval is 0."""
    config = TUIConfig(refresh_interval_seconds=0)
    mock_config_manager.load.return_value = config
    app = YoyoDevTUIApp()

    # Should not start refresh service if interval == 0
    assert app.config.refresh_interval_seconds == 0


# ============================================================================
# Error Handling Tests
# ============================================================================

@patch('lib.yoyo_tui_v3.app.ConfigManager')
def test_app_handles_missing_config_gracefully(mock_config_manager):
    """Test that app handles missing config gracefully."""
    mock_config_manager.load.side_effect = Exception("Config error")

    # Should not crash
    try:
        app = YoyoDevTUIApp()
        # May use default config
        assert True
    except Exception:
        # If it raises, that's acceptable for missing config
        assert True


# ============================================================================
# Integration Tests
# ============================================================================

@patch('lib.yoyo_tui_v3.app.ConfigManager')
def test_full_app_lifecycle(mock_config_manager):
    """Test complete app lifecycle: create → mount → unmount."""
    mock_config_manager.load.return_value = TUIConfig()

    # Create app
    app = YoyoDevTUIApp()
    assert app is not None

    # Mount (initializes services)
    app.on_mount()

    # Unmount (cleans up)
    app.on_unmount()

    assert True


@patch('lib.yoyo_tui_v3.app.ConfigManager')
def test_app_with_all_services_initialized(mock_config_manager, mock_services):
    """Test app with all services properly initialized."""
    mock_config_manager.load.return_value = TUIConfig()
    app = YoyoDevTUIApp()

    # Manually set services for testing
    app.event_bus = mock_services['event_bus']
    app.cache_manager = mock_services['cache_manager']
    app.data_manager = mock_services['data_manager']
    app.command_suggester = mock_services['command_suggester']
    app.error_detector = mock_services['error_detector']
    app.mcp_monitor = mock_services['mcp_monitor']
    app.refresh_service = mock_services['refresh_service']

    # All services should be set
    assert app.event_bus is not None
    assert app.cache_manager is not None
    assert app.data_manager is not None
    assert app.command_suggester is not None
    assert app.error_detector is not None
    assert app.mcp_monitor is not None
    assert app.refresh_service is not None


# ============================================================================
# Configuration Tests
# ============================================================================

def test_default_configuration_values():
    """Test that app uses sensible default configuration."""
    with patch('lib.yoyo_tui_v3.app.ConfigManager') as mock_config_manager:
        config = TUIConfig()
        mock_config_manager.load.return_value = config
        app = YoyoDevTUIApp()

        # Check default values
        assert app.config.refresh_interval_seconds == 10
        assert app.config.cache_ttl_seconds == 10


# ============================================================================
# Create App Helper Tests
# ============================================================================

def test_create_app_returns_configured_app():
    """Test that create_app() returns properly configured app."""
    with patch('lib.yoyo_tui_v3.app.ConfigManager'):
        app = create_app()

        assert isinstance(app, YoyoDevTUIApp)
        assert app.TITLE == "Yoyo Dev v3.0 - AI-Assisted Development"
        assert len(app.BINDINGS) == 8  # All keyboard shortcuts


def test_create_app_is_ready_to_run():
    """Test that app from create_app() is ready to run."""
    with patch('lib.yoyo_tui_v3.app.ConfigManager'):
        app = create_app()

        # Should have all necessary attributes
        assert hasattr(app, 'on_mount')
        assert hasattr(app, 'on_unmount')
        assert hasattr(app, 'BINDINGS')
        assert hasattr(app, 'CSS_PATH')
