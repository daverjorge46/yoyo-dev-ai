"""
RecapParser Service

Parses recap files to extract RecapData with defensive error handling.
"""

import logging
import re
from pathlib import Path
from typing import Optional

from ..models import RecapData

logger = logging.getLogger(__name__)


class RecapParser:
    """
    Parse recap markdown files to extract structured RecapData.

    Handles:
    - File name parsing (date extraction)
    - Title extraction (first H1)
    - Summary extraction
    - Pattern counting
    - Defensive error handling (returns None on failure)
    """

    @staticmethod
    def parse(recap_file: Path) -> Optional[RecapData]:
        """
        Parse recap file and extract all metadata.

        Args:
            recap_file: Path to recap markdown file (e.g., .yoyo-dev/recaps/2025-10-17-feature.md)

        Returns:
            RecapData with parsed information, or None if parsing fails
        """
        try:
            # Validate file exists
            if not recap_file.exists() or not recap_file.is_file():
                logger.error(f"Recap file does not exist: {recap_file}")
                return None

            # Extract file metadata
            file_name = recap_file.stem  # Without .md extension
            created_date = RecapParser._extract_date(file_name)
            clean_name = RecapParser._extract_clean_name(file_name)

            # Read file content
            with open(recap_file, 'r') as f:
                content = f.read()

            # Extract title
            title = RecapParser._extract_title(content, clean_name)

            # Extract summary
            summary = RecapParser._extract_summary(content)

            # Count patterns
            patterns_extracted = RecapParser._count_patterns(content)

            return RecapData(
                name=clean_name,
                file_path=recap_file,
                created_date=created_date,
                title=title,
                summary=summary,
                patterns_extracted=patterns_extracted
            )

        except PermissionError as e:
            logger.error(f"Permission denied reading recap file {recap_file}: {e}")
            return None
        except Exception as e:
            logger.error(f"Error parsing recap file {recap_file}: {e}")
            return None

    @staticmethod
    def _extract_date(file_name: str) -> str:
        """
        Extract date from file name (YYYY-MM-DD-name format).

        Args:
            file_name: File name with date prefix (without extension)

        Returns:
            Date string in YYYY-MM-DD format, or "unknown" if not found
        """
        # Match YYYY-MM-DD pattern at start
        match = re.match(r'^(\d{4}-\d{2}-\d{2})', file_name)
        if match:
            return match.group(1)
        return "unknown"

    @staticmethod
    def _extract_clean_name(file_name: str) -> str:
        """
        Extract clean name from file name (remove YYYY-MM-DD- prefix).

        Args:
            file_name: File name with date prefix (without extension)

        Returns:
            Clean name without date prefix
        """
        # Split by hyphen and check if first three parts are date
        parts = file_name.split('-')

        # If we have at least 4 parts (YYYY-MM-DD-name), remove date
        if len(parts) >= 4:
            # Check if first part looks like a year (4 digits)
            if len(parts[0]) == 4 and parts[0].isdigit():
                # Return everything after the date (parts[3:])
                return '-'.join(parts[3:])

        # Return original if no date pattern found
        return file_name

    @staticmethod
    def _extract_title(content: str, fallback_name: str) -> str:
        """
        Extract title from markdown content (first H1 heading).

        Args:
            content: Markdown file content
            fallback_name: Fallback name if no H1 found

        Returns:
            Title string, or fallback_name if not found
        """
        try:
            # Find first H1 heading
            match = re.search(r'^#\s+(.+)$', content, re.MULTILINE)
            if match:
                return match.group(1).strip()

            # No H1 found, use fallback
            return fallback_name

        except Exception as e:
            logger.warning(f"Error extracting title: {e}")
            return fallback_name

    @staticmethod
    def _extract_summary(content: str) -> str:
        """
        Extract summary from markdown content.

        Looks for "## Summary" section and extracts first paragraph.

        Args:
            content: Markdown file content

        Returns:
            Summary text, or empty string if not found
        """
        try:
            # Find "## Summary" section
            match = re.search(
                r'^##\s+Summary\s*\n\s*\n(.+?)(?:\n\n|$)',
                content,
                re.MULTILINE | re.IGNORECASE | re.DOTALL
            )

            if match:
                summary = match.group(1).strip()
                # Limit to first 300 characters
                if len(summary) > 300:
                    summary = summary[:297] + "..."
                return summary

            # No summary found
            return ""

        except Exception as e:
            logger.warning(f"Error extracting summary: {e}")
            return ""

    @staticmethod
    def _count_patterns(content: str) -> int:
        """
        Count number of patterns extracted in recap.

        Looks for "### Pattern N:" headings.

        Args:
            content: Markdown file content

        Returns:
            Number of patterns found
        """
        try:
            # Find all "### Pattern N:" headings
            matches = re.findall(
                r'^###\s+Pattern\s+\d+:',
                content,
                re.MULTILINE | re.IGNORECASE
            )

            return len(matches)

        except Exception as e:
            logger.warning(f"Error counting patterns: {e}")
            return 0
