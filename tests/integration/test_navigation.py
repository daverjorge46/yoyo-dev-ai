#!/usr/bin/env python3
"""
Manual test script for TUI navigation system.

Tests:
1. SpecList click navigation to SpecDetailScreen
2. SuggestedCommandsPanel "Tasks" button navigation to TaskDetailScreen
3. ESC key returns to main screen
"""

import sys
from pathlib import Path

# Add lib to path
sys.path.insert(0, str(Path(__file__).parent / 'lib'))

from yoyo_tui.app import create_app

if __name__ == '__main__':
    print("Starting Yoyo Dev TUI...")
    print("\nTest Instructions:")
    print("1. Click on any spec/fix in the list → Should navigate to SpecDetailScreen")
    print("2. Press ESC → Should return to main screen")
    print("3. Click 'Tasks' button (if visible) → Should navigate to TaskDetailScreen")
    print("4. Press ESC → Should return to main screen")
    print("5. Press 'q' to quit\n")

    app = create_app()
    app.run()
