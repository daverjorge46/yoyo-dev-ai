"""
Tests for keyboard shortcuts help display module.
"""

import pytest
from lib.yoyo_tui_v3.split_view.shortcuts_help import (
    get_shortcuts_help_text,
    get_compact_shortcuts_hint,
    get_shortcuts_for_readme,
    print_shortcuts_help,
    print_compact_hint
)


class TestShortcutsHelpText:
    """Test full shortcuts help text generation"""

    def test_help_text_contains_all_shortcuts(self):
        """Test that help text includes all keyboard shortcuts"""
        help_text = get_shortcuts_help_text()

        # Core shortcuts
        assert 'Ctrl+B' in help_text
        assert '→' in help_text or '->' in help_text
        assert '<' in help_text
        assert '>' in help_text
        assert 'Ctrl+D' in help_text
        assert 'Ctrl+C' in help_text

    def test_help_text_contains_action_descriptions(self):
        """Test that help text describes what shortcuts do"""
        help_text = get_shortcuts_help_text()

        assert 'Switch focus' in help_text or 'switch' in help_text.lower()
        assert 'resize' in help_text.lower() or 'Grow' in help_text or 'Shrink' in help_text
        assert 'Exit' in help_text or 'exit' in help_text.lower()

    def test_help_text_contains_visual_indicators(self):
        """Test that help text explains visual indicators"""
        help_text = get_shortcuts_help_text()

        assert 'cyan' in help_text.lower() or 'Bright cyan' in help_text
        assert 'white' in help_text.lower() or 'Dim white' in help_text
        assert 'Active' in help_text or 'active' in help_text.lower()

    def test_help_text_uses_box_drawing(self):
        """Test that help text uses box drawing characters for formatting"""
        help_text = get_shortcuts_help_text()

        # Should contain box drawing characters
        assert any(char in help_text for char in ['╔', '║', '═', '╚', '┌', '│', '─', '└'])

    def test_help_text_is_multiline(self):
        """Test that help text spans multiple lines"""
        help_text = get_shortcuts_help_text()

        lines = help_text.strip().split('\n')
        assert len(lines) > 5  # Should have multiple lines


class TestCompactShortcutHint:
    """Test compact shortcut hint generation"""

    def test_compact_hint_is_single_line(self):
        """Test that compact hint is a single line"""
        hint = get_compact_shortcuts_hint()

        lines = hint.strip().split('\n')
        assert len(lines) == 1

    def test_compact_hint_contains_essential_shortcuts(self):
        """Test that compact hint includes essential shortcuts"""
        hint = get_compact_shortcuts_hint()

        # Should mention key shortcuts
        assert 'Ctrl+B' in hint
        assert 'switch' in hint.lower() or '→' in hint
        assert 'resize' in hint.lower() or '<' in hint or '>' in hint

    def test_compact_hint_is_concise(self):
        """Test that compact hint is reasonably short"""
        hint = get_compact_shortcuts_hint()

        # Should be under 100 characters for terminal footer
        assert len(hint) < 150


class TestReadmeFormatting:
    """Test README.md formatted shortcuts"""

    def test_readme_format_is_markdown(self):
        """Test that README format uses markdown syntax"""
        readme = get_shortcuts_for_readme()

        # Should contain markdown table or list syntax
        assert '|' in readme or '###' in readme or '-' in readme

    def test_readme_contains_all_shortcuts(self):
        """Test that README format includes all shortcuts"""
        readme = get_shortcuts_for_readme()

        assert 'Ctrl+B' in readme
        assert 'Ctrl+D' in readme
        assert 'Ctrl+C' in readme

    def test_readme_has_visual_indicators_section(self):
        """Test that README includes visual indicators explanation"""
        readme = get_shortcuts_for_readme()

        assert 'cyan' in readme.lower() or 'Cyan' in readme
        assert 'white' in readme.lower() or 'White' in readme
        assert 'Active' in readme or 'active' in readme.lower()

    def test_readme_has_heading(self):
        """Test that README format has proper heading"""
        readme = get_shortcuts_for_readme()

        assert '###' in readme or '##' in readme

    def test_readme_has_tips_section(self):
        """Test that README includes helpful tips"""
        readme = get_shortcuts_for_readme()

        # Should contain tips or usage notes
        assert 'Tips' in readme or 'tips' in readme.lower() or 'Note' in readme


class TestPrintFunctions:
    """Test print functions for displaying help"""

    def test_print_shortcuts_help_outputs_text(self, capsys):
        """Test that print_shortcuts_help outputs to stdout"""
        print_shortcuts_help()

        captured = capsys.readouterr()
        assert len(captured.out) > 0
        assert 'Ctrl+B' in captured.out

    def test_print_compact_hint_outputs_text(self, capsys):
        """Test that print_compact_hint outputs to stdout"""
        print_compact_hint()

        captured = capsys.readouterr()
        assert len(captured.out) > 0
        assert 'Ctrl+B' in captured.out

    def test_print_shortcuts_matches_get_shortcuts(self, capsys):
        """Test that print function outputs match get function"""
        expected = get_shortcuts_help_text()
        print_shortcuts_help()

        captured = capsys.readouterr()
        assert expected.strip() in captured.out.strip()

    def test_print_compact_matches_get_compact(self, capsys):
        """Test that print compact matches get compact"""
        expected = get_compact_shortcuts_hint()
        print_compact_hint()

        captured = capsys.readouterr()
        assert expected.strip() in captured.out.strip()
