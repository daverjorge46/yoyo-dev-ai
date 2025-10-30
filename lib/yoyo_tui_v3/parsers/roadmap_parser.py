"""
RoadmapParser Service

Parses roadmap.md to extract phase count and task statistics for Project Overview panel.
"""

import logging
import re
from pathlib import Path
from typing import Optional, Dict

logger = logging.getLogger(__name__)


class RoadmapParser:
    """
    Parse roadmap.md to extract phase count and task statistics.

    Handles:
    - Phase header counting (## Phase N)
    - Completed task counting ([x] checkboxes)
    - Total task counting (all checkboxes)
    - Both numbered lists (1. [x]) and bullet lists (- [x])
    - Defensive error handling (returns None on failure)
    """

    @staticmethod
    def parse(product_path: Path) -> Optional[Dict[str, int]]:
        """
        Parse roadmap.md and extract phase and task statistics.

        Args:
            product_path: Path to product directory (e.g., .yoyo-dev/product/)

        Returns:
            Dict with keys:
                - total_phases: Number of phase sections (## headers)
                - completed_items: Number of [x] checkboxes
                - total_items: Total number of checkboxes
            Returns None if file not found or error
        """
        try:
            # Validate product path exists
            if not product_path.exists() or not product_path.is_dir():
                logger.debug(f"Product path does not exist: {product_path}")
                return None

            # Check if roadmap.md exists
            roadmap_file = product_path / "roadmap.md"
            if not roadmap_file.exists():
                logger.debug(f"roadmap.md not found in {product_path}")
                return None

            # Read file
            with open(roadmap_file, 'r', encoding='utf-8') as f:
                content = f.read()

            if not content.strip():
                logger.debug(f"roadmap.md is empty")
                return None

            # Count phases (## headers, typically "## Phase N")
            # Count any H2 headers as phases
            phase_pattern = r'^##\s+(.+)$'
            phases = re.findall(phase_pattern, content, re.MULTILINE)
            total_phases = len(phases)

            # Count completed tasks ([x] checkboxes)
            # Match both:
            #   - [x] ...  (bullet list)
            #   1. [x] ... (numbered list)
            completed_pattern = r'^[\s]*(?:[-\*]|\d+\.)\s+\[x\]'
            completed_items = len(re.findall(completed_pattern, content, re.MULTILINE | re.IGNORECASE))

            # Count total tasks (all checkboxes: [x] and [ ])
            # Match both:
            #   - [ ] or - [x]  (bullet list)
            #   1. [ ] or 1. [x] (numbered list)
            total_pattern = r'^[\s]*(?:[-\*]|\d+\.)\s+\[[x\s]\]'
            total_items = len(re.findall(total_pattern, content, re.MULTILINE | re.IGNORECASE))

            logger.info(
                f"Parsed roadmap: {total_phases} phases, "
                f"{completed_items}/{total_items} tasks completed"
            )

            return {
                "total_phases": total_phases,
                "completed_items": completed_items,
                "total_items": total_items
            }

        except PermissionError as e:
            logger.error(f"Permission denied reading {product_path}: {e}")
            return None
        except UnicodeDecodeError as e:
            logger.error(f"Encoding error reading roadmap.md: {e}")
            return None
        except Exception as e:
            logger.error(f"Error parsing roadmap.md from {product_path}: {e}")
            return None
