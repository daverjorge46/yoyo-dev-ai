"""
MissionParser Service

Parses mission files to extract mission statement for Project Overview panel.
"""

import logging
import re
from pathlib import Path
from typing import Optional

logger = logging.getLogger(__name__)


class MissionParser:
    """
    Parse mission files to extract mission statement.

    Handles:
    - mission-lite.md parsing (preferred)
    - mission.md fallback
    - First paragraph extraction
    - Truncation to 100 characters
    - Defensive error handling (returns None on failure)
    """

    @staticmethod
    def parse(product_path: Path) -> Optional[str]:
        """
        Parse mission files and extract mission statement.

        Args:
            product_path: Path to product directory (e.g., .yoyo-dev/product/)

        Returns:
            Mission statement string (first paragraph, max 100 chars), or None if not found
        """
        try:
            # Validate product path exists
            if not product_path.exists() or not product_path.is_dir():
                logger.debug(f"Product path does not exist: {product_path}")
                return None

            # Try mission-lite.md first (preferred)
            mission_lite = product_path / "mission-lite.md"
            if mission_lite.exists():
                logger.debug(f"Parsing mission-lite.md: {mission_lite}")
                mission = MissionParser._extract_first_paragraph(mission_lite)
                if mission:
                    return MissionParser._truncate(mission, max_length=100)

            # Fallback to mission.md
            mission_file = product_path / "mission.md"
            if mission_file.exists():
                logger.debug(f"Falling back to mission.md: {mission_file}")
                mission = MissionParser._extract_first_paragraph(mission_file)
                if mission:
                    return MissionParser._truncate(mission, max_length=100)

            # No mission files found
            logger.warning(f"No mission files found in {product_path}")
            return None

        except PermissionError as e:
            logger.error(f"Permission denied reading product path {product_path}: {e}")
            return None
        except Exception as e:
            logger.error(f"Error parsing mission from {product_path}: {e}")
            return None

    @staticmethod
    def _extract_first_paragraph(file_path: Path) -> Optional[str]:
        """
        Extract first content paragraph from markdown file.

        Skips headers and empty lines, extracts first paragraph of actual content.

        Args:
            file_path: Path to markdown file

        Returns:
            First paragraph text, or None if no content found
        """
        try:
            with open(file_path, 'r', encoding='utf-8') as f:
                content = f.read()

            if not content.strip():
                logger.debug(f"File is empty: {file_path}")
                return None

            # Split by double newlines to get paragraphs
            paragraphs = re.split(r'\n\s*\n', content)

            # Find first paragraph that's not a header
            for paragraph in paragraphs:
                paragraph = paragraph.strip()

                # Skip empty paragraphs
                if not paragraph:
                    continue

                # Skip markdown headers (lines starting with #)
                if paragraph.startswith('#'):
                    continue

                # Skip if paragraph is only headers (all lines start with #)
                lines = paragraph.split('\n')
                if all(line.strip().startswith('#') or not line.strip() for line in lines):
                    continue

                # Found first content paragraph
                # Clean up: remove newlines, normalize whitespace
                cleaned = ' '.join(paragraph.split())

                if cleaned:
                    return cleaned

            # No content paragraphs found
            logger.debug(f"No content paragraphs found in {file_path}")
            return None

        except UnicodeDecodeError as e:
            logger.error(f"Encoding error reading {file_path}: {e}")
            return None
        except Exception as e:
            logger.error(f"Error extracting paragraph from {file_path}: {e}")
            return None

    @staticmethod
    def _truncate(text: str, max_length: int = 100) -> str:
        """
        Truncate text to max length with ellipsis.

        Args:
            text: Text to truncate
            max_length: Maximum length (default: 100)

        Returns:
            Truncated text with "..." if over max_length
        """
        if len(text) <= max_length:
            return text

        # Truncate to max_length - 3 (for ellipsis)
        return text[:max_length - 3] + "..."
