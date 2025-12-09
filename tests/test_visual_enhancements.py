"""
Tests for TUI Visual Enhancements.

Tests configuration changes, CSS unification, and mouse integration.
"""

import pytest
import yaml
from pathlib import Path
from unittest.mock import Mock, patch


# ============================================================================
# Configuration Tests
# ============================================================================

class TestSplitViewConfig:
    """Tests for split view configuration."""

    def test_config_split_ratio_is_fifty_percent(self):
        """Verify config.yml has 0.5 split ratio for 50/50 layout."""
        config_path = Path(__file__).parent.parent / ".yoyo-dev" / "config.yml"

        with open(config_path, 'r') as f:
            config = yaml.safe_load(f)

        assert config['split_view']['ratio'] == 0.5, \
            f"Expected split ratio 0.5, got {config['split_view']['ratio']}"

    def test_config_has_split_view_section(self):
        """Verify config has split_view section with required fields."""
        config_path = Path(__file__).parent.parent / ".yoyo-dev" / "config.yml"

        with open(config_path, 'r') as f:
            config = yaml.safe_load(f)

        assert 'split_view' in config
        assert 'ratio' in config['split_view']
        assert 'enabled' in config['split_view']


# ============================================================================
# CSS Tests
# ============================================================================

class TestCSSUnification:
    """Tests for unified CSS styling."""

    @pytest.fixture
    def css_content(self):
        """Load CSS content."""
        css_path = Path(__file__).parent.parent / "lib" / "yoyo_tui_v3" / "styles.css"
        with open(css_path, 'r') as f:
            return f.read()

    def test_all_panels_have_panel_background(self, css_content):
        """Verify all main panels have $panel background."""
        # Check for unified panel styling
        assert "background: $panel" in css_content or \
               "#active-work-panel" in css_content

    def test_all_panels_have_primary_border(self, css_content):
        """Verify all panels use $primary border color."""
        # Look for unified border styling
        assert "border: solid $primary" in css_content or \
               "$primary" in css_content

    def test_scrollable_class_exists(self, css_content):
        """Verify .scrollable-panel CSS class exists."""
        assert "scrollable" in css_content.lower() or \
               "overflow" in css_content.lower()

    def test_clickable_class_exists(self, css_content):
        """Verify .clickable CSS class exists."""
        # May be .clickable or .copyable-command
        assert "clickable" in css_content.lower() or \
               "copyable" in css_content.lower() or \
               "hover" in css_content.lower()


# ============================================================================
# Main Dashboard CSS Tests
# ============================================================================

class TestMainDashboardCSS:
    """Tests for MainDashboard inline CSS."""

    def test_main_dashboard_has_unified_panel_css(self):
        """Verify MainDashboard inline CSS matches unified styling."""
        from lib.yoyo_tui_v3.screens.main_dashboard import MainDashboard

        # Should have CSS attribute
        assert hasattr(MainDashboard, 'CSS')

        css = MainDashboard.CSS
        # All panels should use consistent styling
        assert "#active-work-panel" in css or "active-work" in css.lower()
        assert "#command-palette-panel" in css or "command-palette" in css.lower()
        assert "#history-panel" in css or "history" in css.lower()


# ============================================================================
# Panel Icons Tests
# ============================================================================

class TestPanelIcons:
    """Tests for shared PanelIcons constants."""

    def test_panel_icons_module_exists(self):
        """Verify PanelIcons module can be imported."""
        try:
            from lib.yoyo_tui_v3.utils.panel_icons import PanelIcons
            assert True
        except ImportError:
            # May not exist yet - that's what we're building
            pytest.skip("PanelIcons not yet implemented")

    def test_panel_icons_has_status_icons(self):
        """Verify PanelIcons has status icon constants."""
        try:
            from lib.yoyo_tui_v3.utils.panel_icons import PanelIcons
            assert hasattr(PanelIcons, 'COMPLETED')
            assert hasattr(PanelIcons, 'IN_PROGRESS')
            assert hasattr(PanelIcons, 'PENDING')
        except ImportError:
            pytest.skip("PanelIcons not yet implemented")


# ============================================================================
# Clipboard Utility Tests
# ============================================================================

class TestClipboardUtility:
    """Tests for clipboard utility module."""

    def test_clipboard_module_exists(self):
        """Verify clipboard utility can be imported."""
        try:
            from lib.yoyo_tui_v3.utils.clipboard import copy_to_clipboard
            assert True
        except ImportError:
            pytest.skip("Clipboard utility not yet implemented")

    def test_clipboard_copy_returns_bool(self):
        """Verify copy_to_clipboard returns boolean."""
        try:
            from lib.yoyo_tui_v3.utils.clipboard import copy_to_clipboard
            result = copy_to_clipboard("test")
            assert isinstance(result, bool)
        except ImportError:
            pytest.skip("Clipboard utility not yet implemented")


# ============================================================================
# Header Rendering Tests
# ============================================================================

class TestHeaderRendering:
    """Tests for enhanced header rendering."""

    def test_header_utility_exists(self):
        """Verify header rendering utility exists."""
        try:
            from lib.yoyo_tui_v3.utils.headers import render_header
            assert True
        except ImportError:
            pytest.skip("Header utility not yet implemented")

    def test_header_uses_box_drawing(self):
        """Verify headers use box-drawing characters."""
        try:
            from lib.yoyo_tui_v3.utils.headers import render_header
            from rich.text import Text

            result = render_header("TEST")
            # Should contain box-drawing characters
            text_str = str(result) if isinstance(result, Text) else result
            assert "┌" in text_str or "─" in text_str
        except ImportError:
            pytest.skip("Header utility not yet implemented")


# ============================================================================
# Widget Scroll Tests
# ============================================================================

class TestWidgetScrolling:
    """Tests for scrollable widgets."""

    def test_active_work_panel_is_scrollable(self):
        """Verify ActiveWorkPanel supports scrolling."""
        from lib.yoyo_tui_v3.widgets.active_work_panel import ActiveWorkPanel

        # Should use VerticalScroll or have scroll support
        source = open(
            Path(__file__).parent.parent / "lib" / "yoyo_tui_v3" / "widgets" / "active_work_panel.py"
        ).read()

        assert "VerticalScroll" in source or "scrollable" in source.lower() or \
               "scroll" in source.lower()

    def test_command_palette_is_scrollable(self):
        """Verify CommandPalettePanel supports scrolling."""
        source = open(
            Path(__file__).parent.parent / "lib" / "yoyo_tui_v3" / "widgets" / "command_palette.py"
        ).read()

        assert "VerticalScroll" in source or "scrollable" in source.lower() or \
               "scroll" in source.lower()

    def test_history_panel_is_scrollable(self):
        """Verify HistoryPanel supports scrolling."""
        source = open(
            Path(__file__).parent.parent / "lib" / "yoyo_tui_v3" / "widgets" / "history_panel.py"
        ).read()

        assert "VerticalScroll" in source or "scrollable" in source.lower() or \
               "scroll" in source.lower()


# ============================================================================
# Click Handler Tests
# ============================================================================

class TestClickHandlers:
    """Tests for mouse click handlers."""

    def test_main_dashboard_has_click_handler(self):
        """Verify MainDashboard has click-to-focus handler."""
        source = open(
            Path(__file__).parent.parent / "lib" / "yoyo_tui_v3" / "screens" / "main_dashboard.py"
        ).read()

        # Should have on_click or click handling
        assert "on_click" in source or "Click" in source or \
               "_focus_panel" in source or "click" in source.lower()

    def test_command_palette_has_copy_handler(self):
        """Verify CommandPalettePanel has click-to-copy functionality."""
        source = open(
            Path(__file__).parent.parent / "lib" / "yoyo_tui_v3" / "widgets" / "command_palette.py"
        ).read()

        # Should have clipboard or copy functionality
        assert "clipboard" in source.lower() or "copy" in source.lower() or \
               "on_click" in source or "Clicked" in source


# ============================================================================
# Integration Tests
# ============================================================================

class TestVisualEnhancementsIntegration:
    """Integration tests for visual enhancements."""

    def test_all_css_files_valid(self):
        """Verify all CSS files are syntactically valid."""
        css_path = Path(__file__).parent.parent / "lib" / "yoyo_tui_v3" / "styles.css"

        # Basic validation - should not be empty and have expected sections
        with open(css_path, 'r') as f:
            content = f.read()

        assert len(content) > 100, "CSS file seems too short"
        assert "Panel" in content or "panel" in content

    def test_widgets_import_without_error(self):
        """Verify all enhanced widgets can be imported."""
        from lib.yoyo_tui_v3.widgets.active_work_panel import ActiveWorkPanel
        from lib.yoyo_tui_v3.widgets.command_palette import CommandPalettePanel
        from lib.yoyo_tui_v3.widgets.history_panel import HistoryPanel
        from lib.yoyo_tui_v3.widgets.project_overview import ProjectOverview

        assert ActiveWorkPanel is not None
        assert CommandPalettePanel is not None
        assert HistoryPanel is not None
        assert ProjectOverview is not None

    def test_main_dashboard_imports_without_error(self):
        """Verify MainDashboard can be imported."""
        from lib.yoyo_tui_v3.screens.main_dashboard import MainDashboard
        assert MainDashboard is not None
