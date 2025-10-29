#!/usr/bin/env python3
"""
Test interactive navigation and keyboard shortcuts.

Tests EditorLauncher, click handlers, and keyboard shortcuts.
"""

import sys
import os
from pathlib import Path
from unittest.mock import Mock, patch

# Add lib to path for imports
sys.path.insert(0, str(Path.home() / '.yoyo-dev' / 'lib'))


def test_editor_launcher_detects_vscode():
    """Test that EditorLauncher detects VS Code from $EDITOR."""
    from yoyo_tui.services.editor_launcher import EditorLauncher

    with patch.dict(os.environ, {'EDITOR': 'code'}):
        launcher = EditorLauncher()

        assert launcher.is_available()
        assert launcher.get_editor_name() == 'code'
        assert launcher.editor_config.supports_goto


def test_editor_launcher_detects_vim():
    """Test that EditorLauncher detects vim from $EDITOR."""
    from yoyo_tui.services.editor_launcher import EditorLauncher

    with patch.dict(os.environ, {'EDITOR': 'vim'}):
        launcher = EditorLauncher()

        assert launcher.is_available()
        assert launcher.get_editor_name() == 'vim'
        assert launcher.editor_config.supports_goto


def test_editor_launcher_uses_config_fallback():
    """Test that EditorLauncher falls back to config editor."""
    from yoyo_tui.services.editor_launcher import EditorLauncher

    with patch.dict(os.environ, {'EDITOR': ''}, clear=True):
        launcher = EditorLauncher(config_editor='nvim')

        assert launcher.is_available()
        assert launcher.get_editor_name() == 'nvim'


def test_editor_launcher_handles_no_editor():
    """Test that EditorLauncher handles no editor gracefully."""
    from yoyo_tui.services.editor_launcher import EditorLauncher

    with patch.dict(os.environ, {'EDITOR': ''}, clear=True):
        launcher = EditorLauncher()

        assert not launcher.is_available()
        assert launcher.get_editor_name() == "None"


def test_editor_launcher_parses_file_location():
    """Test that EditorLauncher parses file:line correctly."""
    from yoyo_tui.services.editor_launcher import EditorLauncher

    launcher = EditorLauncher(config_editor='vim')

    # Test file:line format
    file_path, line = launcher.parse_file_location('/path/to/file.py:42')
    assert file_path == Path('/path/to/file.py')
    assert line == 42

    # Test file only
    file_path, line = launcher.parse_file_location('/path/to/file.py')
    assert file_path == Path('/path/to/file.py')
    assert line is None

    # Test invalid line number
    file_path, line = launcher.parse_file_location('/path/to/file.py:invalid')
    assert file_path == Path('/path/to/file.py:invalid')
    assert line is None


@patch('subprocess.Popen')
def test_editor_launcher_opens_file(mock_popen):
    """Test that EditorLauncher opens file in editor."""
    from yoyo_tui.services.editor_launcher import EditorLauncher
    import tempfile

    # Create temp file
    with tempfile.NamedTemporaryFile(mode='w', delete=False, suffix='.py') as f:
        f.write("# Test file\n")
        temp_file = Path(f.name)

    try:
        with patch.dict(os.environ, {'EDITOR': 'code'}):
            launcher = EditorLauncher()

            # Open file
            result = launcher.open_file(temp_file)

            assert result is True
            mock_popen.assert_called_once()

            # Verify command
            call_args = mock_popen.call_args[0][0]
            assert 'code' in call_args
            assert str(temp_file) in ' '.join(call_args)

    finally:
        temp_file.unlink(missing_ok=True)


@patch('subprocess.Popen')
def test_editor_launcher_opens_file_with_line(mock_popen):
    """Test that EditorLauncher opens file at specific line."""
    from yoyo_tui.services.editor_launcher import EditorLauncher
    import tempfile

    # Create temp file
    with tempfile.NamedTemporaryFile(mode='w', delete=False, suffix='.py') as f:
        f.write("# Test file\n")
        temp_file = Path(f.name)

    try:
        with patch.dict(os.environ, {'EDITOR': 'code'}):
            launcher = EditorLauncher()

            # Open file at line 42
            result = launcher.open_file(temp_file, line=42)

            assert result is True
            mock_popen.assert_called_once()

            # Verify command includes line number
            call_args = mock_popen.call_args[0][0]
            assert 'code' in call_args
            # VS Code uses --goto file:line format
            assert any(':42' in arg for arg in call_args)

    finally:
        temp_file.unlink(missing_ok=True)


def test_editor_launcher_handles_nonexistent_file():
    """Test that EditorLauncher handles nonexistent file gracefully."""
    from yoyo_tui.services.editor_launcher import EditorLauncher

    with patch.dict(os.environ, {'EDITOR': 'code'}):
        launcher = EditorLauncher()

        # Try to open nonexistent file
        result = launcher.open_file(Path('/nonexistent/file.py'))

        assert result is False


def test_editor_launcher_unknown_editor():
    """Test that EditorLauncher handles unknown editor."""
    from yoyo_tui.services.editor_launcher import EditorLauncher

    with patch.dict(os.environ, {'EDITOR': 'unknown-editor'}):
        launcher = EditorLauncher()

        assert launcher.is_available()
        assert launcher.get_editor_name() == 'unknown-editor'
        # Should work but without goto support
        assert not launcher.editor_config.supports_goto


if __name__ == '__main__':
    import pytest
    pytest.main([__file__, '-v', '-s'])
