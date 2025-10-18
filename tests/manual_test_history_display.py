#!/usr/bin/env python3
"""
Manual test to display actual history data from HistoryTracker.

This helps verify the fix visually by showing real git timestamps.
"""

import sys
from pathlib import Path
from datetime import datetime

# Add lib to path
sys.path.insert(0, str(Path.home() / '.yoyo-dev' / 'lib'))

from yoyo_tui.services.history_tracker import HistoryTracker


def main():
    project_root = Path.home() / '.yoyo-dev'
    tracker = HistoryTracker(project_root)

    print("=" * 80)
    print("HISTORY TRACKER TEST - Real Git Timestamps")
    print("=" * 80)
    print()

    # Get recent actions
    recent = tracker.get_recent_actions(count=5)

    print(f"Recent Actions ({len(recent)}):")
    print("-" * 80)

    for i, entry in enumerate(recent, 1):
        print(f"{i}. [{entry.type.value.upper()}] {entry.title}")
        print(f"   Timestamp: {entry.timestamp.strftime('%Y-%m-%d %H:%M:%S')}")
        if entry.description:
            print(f"   Description: {entry.description}")
        if entry.source_path:
            print(f"   Source: {entry.source_path}")
        print()

    # Get all git commits to verify timestamps
    print("=" * 80)
    print("Git Commits (with real timestamps):")
    print("-" * 80)

    git_commits = tracker._get_git_commits()

    for i, commit in enumerate(git_commits, 1):
        print(f"{i}. {commit.title}")
        print(f"   Timestamp: {commit.timestamp.strftime('%Y-%m-%d %H:%M:%S')}")
        print()

    # Verify chronological sorting
    print("=" * 80)
    print("Chronological Sorting Verification:")
    print("-" * 80)

    all_history = tracker._aggregate_history()
    print(f"Total history entries: {len(all_history)}")

    # Check if sorted
    is_sorted = True
    for i in range(len(all_history) - 1):
        if all_history[i].timestamp < all_history[i + 1].timestamp:
            is_sorted = False
            print(f"❌ SORTING ERROR at position {i}:")
            print(f"   {all_history[i].title} ({all_history[i].timestamp})")
            print(f"   is BEFORE")
            print(f"   {all_history[i+1].title} ({all_history[i+1].timestamp})")
            break

    if is_sorted:
        print("✓ All entries are sorted chronologically (newest first)")

    print()
    print("=" * 80)
    print("TEST COMPLETE")
    print("=" * 80)


if __name__ == '__main__':
    main()
