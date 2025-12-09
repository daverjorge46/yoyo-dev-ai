"""
Clipboard utility for Yoyo Dev TUI.

Provides cross-platform clipboard copy functionality with multiple fallbacks.
"""

import subprocess
import shutil
from typing import Optional


def copy_to_clipboard(text: str) -> bool:
    """
    Copy text to system clipboard.

    Tries multiple methods in order of preference:
    1. pyperclip (if installed) - cross-platform
    2. xclip (Linux)
    3. xsel (Linux)
    4. pbcopy (macOS)
    5. clip.exe (Windows/WSL)

    Args:
        text: Text to copy to clipboard

    Returns:
        True if copy succeeded, False otherwise
    """
    # Try pyperclip first (most reliable cross-platform)
    try:
        import pyperclip
        pyperclip.copy(text)
        return True
    except ImportError:
        pass
    except Exception:
        pass

    # Try xclip (Linux)
    if shutil.which('xclip'):
        try:
            process = subprocess.Popen(
                ['xclip', '-selection', 'clipboard'],
                stdin=subprocess.PIPE,
                stderr=subprocess.DEVNULL
            )
            process.communicate(input=text.encode('utf-8'))
            return process.returncode == 0
        except Exception:
            pass

    # Try xsel (Linux alternative)
    if shutil.which('xsel'):
        try:
            process = subprocess.Popen(
                ['xsel', '--clipboard', '--input'],
                stdin=subprocess.PIPE,
                stderr=subprocess.DEVNULL
            )
            process.communicate(input=text.encode('utf-8'))
            return process.returncode == 0
        except Exception:
            pass

    # Try pbcopy (macOS)
    if shutil.which('pbcopy'):
        try:
            process = subprocess.Popen(
                ['pbcopy'],
                stdin=subprocess.PIPE,
                stderr=subprocess.DEVNULL
            )
            process.communicate(input=text.encode('utf-8'))
            return process.returncode == 0
        except Exception:
            pass

    # Try clip.exe (Windows/WSL)
    if shutil.which('clip.exe'):
        try:
            process = subprocess.Popen(
                ['clip.exe'],
                stdin=subprocess.PIPE,
                stderr=subprocess.DEVNULL
            )
            process.communicate(input=text.encode('utf-8'))
            return process.returncode == 0
        except Exception:
            pass

    # All methods failed
    return False


def get_clipboard_method() -> Optional[str]:
    """
    Detect which clipboard method is available.

    Returns:
        Name of available clipboard method, or None if none available
    """
    try:
        import pyperclip
        return 'pyperclip'
    except ImportError:
        pass

    if shutil.which('xclip'):
        return 'xclip'
    if shutil.which('xsel'):
        return 'xsel'
    if shutil.which('pbcopy'):
        return 'pbcopy'
    if shutil.which('clip.exe'):
        return 'clip.exe'

    return None


def is_clipboard_available() -> bool:
    """
    Check if clipboard functionality is available.

    Returns:
        True if a clipboard method is available
    """
    return get_clipboard_method() is not None
