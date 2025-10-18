"""
HistoryTracker service for aggregating project history.

Combines multiple history sources:
- Git commit history (last 5 commits)
- Spec folders (.yoyo-dev/specs/)
- Fix folders (.yoyo-dev/fixes/)
- Recap files (.yoyo-dev/recaps/)

Provides unified, chronologically sorted history for display in TUI.
"""

import re
from dataclasses import dataclass
from datetime import datetime
from enum import Enum
from pathlib import Path
from typing import List, Optional

from .git_service import GitService
from .recap_parser import RecapParser


class HistoryType(Enum):
    """History entry types."""
    COMMIT = "commit"
    SPEC = "spec"
    FIX = "fix"
    RECAP = "recap"


@dataclass
class HistoryEntry:
    """
    Single unified history entry.

    Attributes:
        type: Entry type (commit, spec, fix, recap)
        timestamp: When this entry was created
        title: Display title
        description: Optional description or PR URL
        source_path: Path to source file/folder (optional)
    """
    type: HistoryType
    timestamp: datetime
    title: str
    description: str
    source_path: Optional[Path] = None

    def __lt__(self, other: 'HistoryEntry') -> bool:
        """Compare entries by timestamp for sorting (newest first)."""
        return self.timestamp > other.timestamp


class HistoryTracker:
    """
    Aggregates and tracks project history from multiple sources.

    Provides unified view of:
    - Recent git commits
    - Spec creations
    - Fix implementations
    - Recap completions

    All entries are sorted chronologically (newest first).
    """

    def __init__(self, project_root: Path):
        """
        Initialize history tracker.

        Args:
            project_root: Root directory of the project
        """
        self.project_root = project_root
        self.recap_parser = RecapParser()

    def get_recent_actions(self, count: int = 3) -> List[HistoryEntry]:
        """
        Get recent important actions across all history sources.

        Aggregates all history sources, sorts chronologically,
        and returns the most recent N entries.

        Args:
            count: Number of recent actions to return (default: 3)

        Returns:
            List of HistoryEntry objects (newest first)
        """
        # Aggregate all history
        all_history = self._aggregate_history()

        # Return top N entries (already sorted newest first)
        return all_history[:count]

    def _aggregate_history(self) -> List[HistoryEntry]:
        """
        Aggregate history from all sources and sort chronologically.

        Returns:
            List of all HistoryEntry objects sorted newest first
        """
        all_entries: List[HistoryEntry] = []

        # Gather from all sources
        try:
            all_entries.extend(self._get_git_commits())
        except Exception:
            # Silently handle git errors
            pass

        try:
            all_entries.extend(self._get_specs())
        except Exception:
            # Silently handle spec parsing errors
            pass

        try:
            all_entries.extend(self._get_fixes())
        except Exception:
            # Silently handle fix parsing errors
            pass

        try:
            all_entries.extend(self._get_recaps())
        except Exception:
            # Silently handle recap parsing errors
            pass

        # Sort chronologically (newest first)
        all_entries.sort()

        return all_entries

    def _get_git_commits(self) -> List[HistoryEntry]:
        """
        Get recent git commit history with real timestamps.

        Returns:
            List of HistoryEntry objects for recent commits
        """
        try:
            if not GitService.is_git_repo(self.project_root):
                return []
        except Exception:
            return []

        # Get commit messages with actual git timestamps
        try:
            commit_data = GitService.get_recent_commits_with_timestamps(
                self.project_root,
                count=5
            )

            entries = []
            for commit in commit_data:
                # Parse ISO timestamp from git
                try:
                    # commit['timestamp'] is in ISO format (e.g., "2025-10-18T10:30:45-07:00")
                    timestamp = datetime.fromisoformat(commit['timestamp'])
                except (ValueError, KeyError):
                    # Skip commits with invalid timestamps
                    continue

                entries.append(HistoryEntry(
                    type=HistoryType.COMMIT,
                    timestamp=timestamp,
                    title=commit['message'],
                    description="",
                    source_path=None
                ))

            return entries

        except Exception:
            return []

    def _get_specs(self) -> List[HistoryEntry]:
        """
        Get spec folder history from .yoyo-dev/specs/.

        Parses folder names in format: YYYY-MM-DD-feature-name

        Returns:
            List of HistoryEntry objects for specs
        """
        specs_dir = self.project_root / ".yoyo-dev" / "specs"

        if not specs_dir.exists() or not specs_dir.is_dir():
            return []

        entries = []

        try:
            for item in specs_dir.iterdir():
                if not item.is_dir():
                    continue

                # Parse date from folder name (YYYY-MM-DD-name)
                date_match = re.match(r'(\d{4})-(\d{2})-(\d{2})-(.+)', item.name)
                if not date_match:
                    continue

                year, month, day, name = date_match.groups()

                try:
                    timestamp = datetime(int(year), int(month), int(day))
                except ValueError:
                    continue

                # Create display title (keep hyphens)
                title = f"Spec: {name}"

                entries.append(HistoryEntry(
                    type=HistoryType.SPEC,
                    timestamp=timestamp,
                    title=title,
                    description="",
                    source_path=item
                ))

        except Exception:
            pass

        return entries

    def _get_fixes(self) -> List[HistoryEntry]:
        """
        Get fix folder history from .yoyo-dev/fixes/.

        Parses folder names in format: YYYY-MM-DD-fix-name

        Returns:
            List of HistoryEntry objects for fixes
        """
        fixes_dir = self.project_root / ".yoyo-dev" / "fixes"

        if not fixes_dir.exists() or not fixes_dir.is_dir():
            return []

        entries = []

        try:
            for item in fixes_dir.iterdir():
                if not item.is_dir():
                    continue

                # Parse date from folder name (YYYY-MM-DD-name)
                date_match = re.match(r'(\d{4})-(\d{2})-(\d{2})-(.+)', item.name)
                if not date_match:
                    continue

                year, month, day, name = date_match.groups()

                try:
                    timestamp = datetime(int(year), int(month), int(day))
                except ValueError:
                    continue

                # Create display title (keep hyphens)
                title = f"Fix: {name}"

                entries.append(HistoryEntry(
                    type=HistoryType.FIX,
                    timestamp=timestamp,
                    title=title,
                    description="",
                    source_path=item
                ))

        except Exception:
            pass

        return entries

    def _get_recaps(self) -> List[HistoryEntry]:
        """
        Get recap file history from .yoyo-dev/recaps/.

        Parses markdown files and extracts PR URLs.

        Returns:
            List of HistoryEntry objects for recaps
        """
        recaps_dir = self.project_root / ".yoyo-dev" / "recaps"

        if not recaps_dir.exists() or not recaps_dir.is_dir():
            return []

        entries = []

        try:
            for item in recaps_dir.iterdir():
                if not item.is_file() or item.suffix != '.md':
                    continue

                # Parse date from filename (YYYY-MM-DD-name.md)
                date_match = re.match(r'(\d{4})-(\d{2})-(\d{2})-(.+)\.md', item.name)
                if not date_match:
                    continue

                year, month, day, name = date_match.groups()

                try:
                    timestamp = datetime(int(year), int(month), int(day))
                except ValueError:
                    continue

                # Parse recap file for metadata
                try:
                    recap_data = self.recap_parser.parse_recap_from_path(item)

                    # Skip if parsing failed (empty title means file couldn't be read)
                    if not recap_data.title:
                        continue

                    # Use parsed title
                    title = recap_data.title

                    # Use PR URL as description if available
                    description = recap_data.pr_url if recap_data.pr_url else ""

                    entries.append(HistoryEntry(
                        type=HistoryType.RECAP,
                        timestamp=timestamp,
                        title=title,
                        description=description,
                        source_path=item
                    ))

                except Exception:
                    # Skip corrupted recap files
                    continue

        except Exception:
            pass

        return entries
