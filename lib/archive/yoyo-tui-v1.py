#!/usr/bin/env python3
"""
Yoyo Dev TUI v3.0 - Entry Point

Production-grade intelligent development dashboard.
Launches the Textual-based TUI application.
"""

import sys
from pathlib import Path

# Add lib directory to path for imports
lib_dir = Path(__file__).parent
if str(lib_dir) not in sys.path:
    sys.path.insert(0, str(lib_dir))

from yoyo_tui_v3.app import create_app


def main():
    """Main entry point for Yoyo Dev TUI v3.0."""
    try:
        app = create_app()
        app.run()
    except KeyboardInterrupt:
        print("\n\nYoyo Dev TUI exited.")
        sys.exit(0)
    except Exception as e:
        print(f"\n\nError running Yoyo Dev TUI: {e}", file=sys.stderr)
        print("\nPlease report this issue at: https://github.com/your-org/yoyo-dev/issues")
        sys.exit(1)


if __name__ == "__main__":
    main()
