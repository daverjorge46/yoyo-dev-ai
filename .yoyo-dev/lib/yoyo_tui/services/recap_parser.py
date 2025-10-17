"""
RecapParser service for extracting metadata from recap files.

Parses .yoyo-dev/recaps/*.md files to extract:
- PR URLs
- Titles
- Dates
- Status information
"""

import re
from dataclasses import dataclass
from pathlib import Path
from typing import Optional


@dataclass
class RecapData:
    """
    Parsed recap file metadata.

    Attributes:
        title: Recap title (from first heading)
        date: Date string in YYYY-MM-DD format
        status: Status text (e.g., "Completed", "In Progress")
        pr_url: GitHub PR URL if found
    """
    title: str
    date: Optional[str] = None
    status: Optional[str] = None
    pr_url: Optional[str] = None


class RecapParser:
    """
    Parser for recap markdown files.

    Extracts structured metadata from recap files including:
    - PR URLs (various formats)
    - Titles (from headings)
    - Dates (from metadata fields)
    - Status (from metadata fields)
    """

    # Regex patterns for PR URL extraction
    PR_PATTERNS = [
        # Standard PR link: PR: https://github.com/user/repo/pull/123
        r'(?:PR|pr|Pull Request|pull request):\s*(https://github\.com/[^/]+/[^/]+/pull/\d+)',
        # Markdown link: [PR #123](https://github.com/user/repo/pull/123)
        r'\[.*?\]\((https://github\.com/[^/]+/[^/]+/pull/\d+)\)',
        # PR Link section: **PR Link:** https://...
        r'\*\*PR Link:\*\*\s*(https://github\.com/[^/]+/[^/]+/pull/\d+)',
        # Direct link on its own line
        r'^(https://github\.com/[^/]+/[^/]+/pull/\d+)\s*$',
    ]

    # Regex patterns for date extraction
    DATE_PATTERNS = [
        r'\*\*Date:\*\*\s*(\d{4}-\d{2}-\d{2})',
        r'Date:\s*(\d{4}-\d{2}-\d{2})',
        r'\*\*Created:\*\*\s*(\d{4}-\d{2}-\d{2})',
        r'Created:\s*(\d{4}-\d{2}-\d{2})',
    ]

    # Regex patterns for status extraction
    STATUS_PATTERNS = [
        r'\*\*Status:\*\*\s*(.+?)(?:\n|$)',
        r'Status:\s*(.+?)(?:\n|$)',
    ]

    def parse_recap_file(self, content: str) -> RecapData:
        """
        Parse recap file content and extract metadata.

        Args:
            content: Markdown file content

        Returns:
            RecapData with extracted metadata
        """
        # Extract title (first heading)
        title = self._extract_title(content)

        # Extract date
        date = self._extract_date(content)

        # Extract status
        status = self._extract_status(content)

        # Extract PR URL (try all patterns)
        pr_url = self._extract_pr_url(content)

        return RecapData(
            title=title,
            date=date,
            status=status,
            pr_url=pr_url
        )

    def parse_recap_from_path(self, file_path: Path) -> RecapData:
        """
        Parse recap file from path.

        Args:
            file_path: Path to recap markdown file

        Returns:
            RecapData with extracted metadata, or empty data if file cannot be read
        """
        try:
            content = file_path.read_text(encoding='utf-8')
            return self.parse_recap_file(content)
        except (FileNotFoundError, IOError, UnicodeDecodeError):
            # Return empty data on file read errors
            return RecapData(title="", date=None, status=None, pr_url=None)

    def _extract_title(self, content: str) -> str:
        """
        Extract title from first markdown heading.

        Args:
            content: File content

        Returns:
            Title string without leading # symbols
        """
        # Find first heading (# Title)
        match = re.search(r'^#\s+(.+?)$', content, re.MULTILINE)
        if match:
            return match.group(1).strip()
        return ""

    def _extract_date(self, content: str) -> Optional[str]:
        """
        Extract date from content using various patterns.

        Args:
            content: File content

        Returns:
            Date string in YYYY-MM-DD format, or None if not found
        """
        for pattern in self.DATE_PATTERNS:
            match = re.search(pattern, content, re.IGNORECASE)
            if match:
                return match.group(1)
        return None

    def _extract_status(self, content: str) -> Optional[str]:
        """
        Extract status from content.

        Args:
            content: File content

        Returns:
            Status string, or None if not found
        """
        for pattern in self.STATUS_PATTERNS:
            match = re.search(pattern, content, re.IGNORECASE)
            if match:
                return match.group(1).strip()
        return None

    def _extract_pr_url(self, content: str) -> Optional[str]:
        """
        Extract GitHub PR URL from content using multiple patterns.

        Tries various formats:
        - PR: https://github.com/...
        - [PR #123](https://github.com/...)
        - Direct URL on its own line

        Args:
            content: File content

        Returns:
            First PR URL found, or None if no PR URL found
        """
        for pattern in self.PR_PATTERNS:
            match = re.search(pattern, content, re.MULTILINE | re.IGNORECASE)
            if match:
                # Extract URL (first capture group)
                url = match.group(1)
                # Remove any trailing query params or fragments for consistency
                # But keep them if they exist (some PRs have #section anchors)
                return url.strip()
        return None
