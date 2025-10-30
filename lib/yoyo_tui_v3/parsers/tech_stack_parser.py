"""
TechStackParser Service

Parses tech-stack.md to extract list of technologies for Project Overview panel.
"""

import logging
import re
from pathlib import Path
from typing import List

logger = logging.getLogger(__name__)


class TechStackParser:
    """
    Parse tech-stack.md to extract list of technologies.

    Handles:
    - H3 header extraction (### Technology Name)
    - Bullet list extraction (- Technology)
    - Markdown formatting removal
    - Defensive error handling (returns empty list on failure)
    """

    @staticmethod
    def parse(product_path: Path) -> List[str]:
        """
        Parse tech-stack.md and extract list of technology names.

        Args:
            product_path: Path to product directory (e.g., .yoyo-dev/product/)

        Returns:
            List of technology names (empty list if file not found or error)
        """
        try:
            # Validate product path exists
            if not product_path.exists() or not product_path.is_dir():
                logger.debug(f"Product path does not exist: {product_path}")
                return []

            # Check if tech-stack.md exists
            tech_stack_file = product_path / "tech-stack.md"
            if not tech_stack_file.exists():
                logger.debug(f"tech-stack.md not found in {product_path}")
                return []

            # Read file
            with open(tech_stack_file, 'r', encoding='utf-8') as f:
                content = f.read()

            if not content.strip():
                logger.debug(f"tech-stack.md is empty")
                return []

            # Extract technologies
            technologies = []

            # Extract H3 headers (### Technology Name)
            h3_pattern = r'^###\s+(.+)$'
            for match in re.finditer(h3_pattern, content, re.MULTILINE):
                tech_name = match.group(1).strip()
                tech_name = TechStackParser._clean_tech_name(tech_name)
                if tech_name and tech_name not in technologies:
                    technologies.append(tech_name)
                    logger.debug(f"Found H3 tech: {tech_name}")

            # Extract bullet list items (- Technology or * Technology)
            bullet_pattern = r'^[\-\*]\s+(.+)$'
            for match in re.finditer(bullet_pattern, content, re.MULTILINE):
                line = match.group(1).strip()

                # Skip if line starts with ** (likely a description, not tech name)
                # e.g., "- **Why**: Modern language" should be skipped
                # but "- **Python 3.11** - Description" should extract "Python 3.11"
                if line.startswith('**') and ':' in line:
                    # Skip description lines like "**Why**: ..."
                    continue

                tech_name = TechStackParser._clean_tech_name(line)
                if tech_name and tech_name not in technologies:
                    technologies.append(tech_name)
                    logger.debug(f"Found bullet tech: {tech_name}")

            logger.info(f"Extracted {len(technologies)} technologies from tech-stack.md")
            return technologies

        except PermissionError as e:
            logger.error(f"Permission denied reading {product_path}: {e}")
            return []
        except UnicodeDecodeError as e:
            logger.error(f"Encoding error reading tech-stack.md: {e}")
            return []
        except Exception as e:
            logger.error(f"Error parsing tech-stack.md from {product_path}: {e}")
            return []

    @staticmethod
    def _clean_tech_name(text: str) -> str:
        """
        Clean technology name by removing markdown formatting and descriptions.

        Removes:
        - Bold formatting (**text**)
        - Italic formatting (*text*)
        - Links ([text](url))
        - Parenthetical descriptions (text)
        - Em dashes and descriptions after them

        Args:
            text: Raw text from markdown

        Returns:
            Cleaned technology name
        """
        # Remove markdown links [text](url) -> text
        text = re.sub(r'\[([^\]]+)\]\([^\)]+\)', r'\1', text)

        # Remove bold **text** -> text
        text = re.sub(r'\*\*([^\*]+)\*\*', r'\1', text)

        # Remove italic *text* -> text
        text = re.sub(r'\*([^\*]+)\*', r'\1', text)

        # Remove everything after em dash or hyphen with description
        # e.g., "Python 3.11 - Programming language" -> "Python 3.11"
        text = re.split(r'\s+[-–—]\s+', text)[0]

        # Remove parenthetical descriptions
        # e.g., "Textual (TUI Framework)" -> "Textual (TUI Framework)" (keep for now)
        # Actually, let's keep parentheticals as they're informative

        # Strip whitespace
        text = text.strip()

        return text
