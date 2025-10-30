#!/usr/bin/env python3
"""
Yoyo Dev TUI v3.0 - Entry Point

Production-grade intelligent development dashboard.
Launches the Textual TUI application.
"""

import sys
from pathlib import Path

# Add lib directory to Python path
lib_path = Path(__file__).parent.resolve()
if str(lib_path) not in sys.path:
    sys.path.insert(0, str(lib_path))

from yoyo_tui_v3.app import YoyoDevTUIApp


def main():
    """Launch the Yoyo Dev TUI application."""
    app = YoyoDevTUIApp()
    app.run()


if __name__ == "__main__":
    main()
