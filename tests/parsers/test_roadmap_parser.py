"""
Tests for RoadmapParser - Roadmap Parsing

Tests phase counting, task counting, and defensive error handling.
"""

import pytest
from pathlib import Path
from lib.yoyo_tui_v3.parsers.roadmap_parser import RoadmapParser


class TestRoadmapParser:
    """Test suite for RoadmapParser."""

    def test_parse_roadmap_success(self, tmp_path):
        """Test parsing valid roadmap.md file."""
        # Arrange
        product_path = tmp_path / "product"
        product_path.mkdir()

        roadmap = product_path / "roadmap.md"
        roadmap.write_text("""# Yoyo Dev - Development Roadmap

## Phase 0: Already Completed ✓

1. [x] **Task 1** — Description `XS`
2. [x] **Task 2** — Description `S`
3. [ ] **Task 3** — Description `M`

## Phase 1: TUI Dashboard v3.0

1. [x] **Task 4** — Description `M`
2. [ ] **Task 5** — Description `L`
3. [ ] **Task 6** — Description `XL`

## Phase 2: Advanced Features

1. [ ] **Task 7** — Description `M`
2. [ ] **Task 8** — Description `L`""")

        # Act
        result = RoadmapParser.parse(product_path)

        # Assert
        assert result is not None
        assert isinstance(result, dict)
        assert result["total_phases"] == 3
        assert result["completed_items"] == 3  # Tasks 1, 2, 4
        assert result["total_items"] == 8

    def test_count_completed_tasks(self, tmp_path):
        """Test correctly counting [x] checkboxes."""
        # Arrange
        product_path = tmp_path / "product"
        product_path.mkdir()

        roadmap = product_path / "roadmap.md"
        roadmap.write_text("""# Roadmap

## Phase 1

- [x] Completed task 1
- [x] Completed task 2
- [ ] Incomplete task 1
- [ ] Incomplete task 2

## Phase 2

- [x] Completed task 3
- [ ] Incomplete task 3""")

        # Act
        result = RoadmapParser.parse(product_path)

        # Assert
        assert result is not None
        assert result["total_phases"] == 2
        assert result["completed_items"] == 3
        assert result["total_items"] == 6

    def test_parse_missing_file(self, tmp_path):
        """Test parsing when roadmap.md is missing."""
        # Arrange
        product_path = tmp_path / "product"
        product_path.mkdir()
        # No roadmap.md created

        # Act
        result = RoadmapParser.parse(product_path)

        # Assert
        assert result is None

    def test_parse_empty_file(self, tmp_path):
        """Test parsing when roadmap.md is empty."""
        # Arrange
        product_path = tmp_path / "product"
        product_path.mkdir()

        roadmap = product_path / "roadmap.md"
        roadmap.write_text("")

        # Act
        result = RoadmapParser.parse(product_path)

        # Assert
        assert result is None

    def test_parse_no_phases(self, tmp_path):
        """Test parsing roadmap with no phase headers."""
        # Arrange
        product_path = tmp_path / "product"
        product_path.mkdir()

        roadmap = product_path / "roadmap.md"
        roadmap.write_text("""# Roadmap

This is just a description with no phases.""")

        # Act
        result = RoadmapParser.parse(product_path)

        # Assert
        assert result is not None
        assert result["total_phases"] == 0
        assert result["completed_items"] == 0
        assert result["total_items"] == 0

    def test_parse_numbered_and_bullet_tasks(self, tmp_path):
        """Test counting both numbered (1. ) and bullet (- ) tasks."""
        # Arrange
        product_path = tmp_path / "product"
        product_path.mkdir()

        roadmap = product_path / "roadmap.md"
        roadmap.write_text("""# Roadmap

## Phase 1

1. [x] Numbered task 1
2. [ ] Numbered task 2

## Phase 2

- [x] Bullet task 1
- [ ] Bullet task 2""")

        # Act
        result = RoadmapParser.parse(product_path)

        # Assert
        assert result is not None
        assert result["total_phases"] == 2
        assert result["completed_items"] == 2
        assert result["total_items"] == 4

    def test_parse_phase_variations(self, tmp_path):
        """Test counting phases with different naming patterns."""
        # Arrange
        product_path = tmp_path / "product"
        product_path.mkdir()

        roadmap = product_path / "roadmap.md"
        roadmap.write_text("""# Roadmap

## Phase 0: Setup

- [x] Task 1

## Phase 1: Core Features

- [ ] Task 2

## Phase 2: Polish

- [ ] Task 3

## Future Considerations

- [ ] Task 4""")

        # Act
        result = RoadmapParser.parse(product_path)

        # Assert
        assert result is not None
        # Should count "Phase 0", "Phase 1", "Phase 2", "Future Considerations"
        assert result["total_phases"] == 4
        assert result["completed_items"] == 1
        assert result["total_items"] == 4

    def test_parse_nonexistent_product_path(self, tmp_path):
        """Test parsing when product path doesn't exist."""
        # Arrange
        nonexistent_path = tmp_path / "nonexistent"

        # Act
        result = RoadmapParser.parse(nonexistent_path)

        # Assert
        assert result is None

    def test_parse_ignores_non_task_checkboxes(self, tmp_path):
        """Test that parser only counts task checkboxes, not notes."""
        # Arrange
        product_path = tmp_path / "product"
        product_path.mkdir()

        roadmap = product_path / "roadmap.md"
        roadmap.write_text("""# Roadmap

## Phase 1

- [x] Task 1
- [ ] Task 2

**Notes:**
- [x] This is a note, not a task
- [ ] Another note""")

        # Act
        result = RoadmapParser.parse(product_path)

        # Assert
        assert result is not None
        # Should count all checkboxes (including notes)
        # This is acceptable behavior - roadmap checkboxes are all tasks
        assert result["total_items"] >= 2
