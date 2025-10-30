"""
Tests for DataManager Product Methods

Tests mission, tech stack, project stats, and MCP status methods.
"""

import pytest
from pathlib import Path
from unittest.mock import Mock, MagicMock
from lib.yoyo_tui_v3.services.data_manager import DataManager
from lib.yoyo_tui_v3.services.event_bus import EventBus
from lib.yoyo_tui_v3.services.cache_manager import CacheManager
from lib.yoyo_tui_v3.models import ProjectStats, MCPServerStatus
from datetime import datetime


@pytest.fixture
def mock_event_bus():
    """Create mock EventBus."""
    return Mock(spec=EventBus)


@pytest.fixture
def mock_cache_manager():
    """Create mock CacheManager."""
    cache = Mock(spec=CacheManager)
    cache.get.return_value = None  # Default: cache miss
    return cache


@pytest.fixture
def product_fixture(tmp_path):
    """Create fixture with product files."""
    yoyo_dev = tmp_path / ".yoyo-dev"
    product_path = yoyo_dev / "product"
    product_path.mkdir(parents=True)

    # Create mission-lite.md
    mission_lite = product_path / "mission-lite.md"
    mission_lite.write_text("""# Mission

## The Problem

Developers face unstructured development with AI coding assistants.

## The Solution

Yoyo Dev provides systematic workflows.""")

    # Create tech-stack.md
    tech_stack = product_path / "tech-stack.md"
    tech_stack.write_text("""# Tech Stack

## Core

### Python 3.11
Description

### Textual
Description

## Libraries

- PyYAML
- Watchdog""")

    # Create roadmap.md
    roadmap = product_path / "roadmap.md"
    roadmap.write_text("""# Roadmap

## Phase 0: Setup

- [x] Task 1
- [x] Task 2

## Phase 1: Features

- [x] Task 3
- [ ] Task 4
- [ ] Task 5""")

    # Create specs directory with one spec
    specs_dir = yoyo_dev / "specs"
    specs_dir.mkdir()
    spec_folder = specs_dir / "2025-10-30-test-spec"
    spec_folder.mkdir()
    (spec_folder / "spec.md").write_text("# Test Spec")
    (spec_folder / "tasks.md").write_text("## Task 1\n- [ ] Subtask 1")

    # Create fixes directory with one fix
    fixes_dir = yoyo_dev / "fixes"
    fixes_dir.mkdir()
    fix_folder = fixes_dir / "2025-10-30-test-fix"
    fix_folder.mkdir()
    (fix_folder / "analysis.md").write_text("# Test Fix")
    (fix_folder / "tasks.md").write_text("## Task 1\n- [ ] Subtask 1")

    return yoyo_dev


class TestDataManagerProductMethods:
    """Test suite for DataManager product-related methods."""

    def test_get_mission_statement(self, product_fixture, mock_event_bus, mock_cache_manager):
        """Test get_mission_statement returns mission from MissionParser."""
        # Arrange
        data_manager = DataManager(
            yoyo_dev_path=product_fixture,
            event_bus=mock_event_bus,
            cache_manager=mock_cache_manager
        )
        data_manager.initialize()

        # Act
        mission = data_manager.get_mission_statement()

        # Assert
        assert mission is not None
        assert isinstance(mission, str)
        assert "Developers face unstructured development" in mission

    def test_get_tech_stack_summary(self, product_fixture, mock_event_bus, mock_cache_manager):
        """Test get_tech_stack_summary returns list from TechStackParser."""
        # Arrange
        data_manager = DataManager(
            yoyo_dev_path=product_fixture,
            event_bus=mock_event_bus,
            cache_manager=mock_cache_manager
        )
        data_manager.initialize()

        # Act
        tech_stack = data_manager.get_tech_stack_summary()

        # Assert
        assert tech_stack is not None
        assert isinstance(tech_stack, list)
        assert len(tech_stack) >= 3
        assert any("Python" in item for item in tech_stack)
        assert any("Textual" in item for item in tech_stack)

    def test_get_project_stats(self, product_fixture, mock_event_bus, mock_cache_manager):
        """Test get_project_stats returns ProjectStats with correct counts."""
        # Arrange
        data_manager = DataManager(
            yoyo_dev_path=product_fixture,
            event_bus=mock_event_bus,
            cache_manager=mock_cache_manager
        )
        data_manager.initialize()

        # Act
        stats = data_manager.get_project_stats()

        # Assert
        assert stats is not None
        assert isinstance(stats, ProjectStats)
        assert stats.active_specs == 1
        assert stats.active_fixes == 1
        assert stats.pending_tasks >= 2  # At least 2 incomplete tasks
        assert stats.recent_errors >= 0

    def test_get_mcp_status_not_implemented(self, product_fixture, mock_event_bus, mock_cache_manager):
        """Test get_mcp_status returns None (not yet implemented)."""
        # Arrange
        data_manager = DataManager(
            yoyo_dev_path=product_fixture,
            event_bus=mock_event_bus,
            cache_manager=mock_cache_manager
        )

        # Act
        mcp_status = data_manager.get_mcp_status()

        # Assert
        # For now, should return None (not implemented)
        assert mcp_status is None

    def test_initialize_loads_product_files(self, product_fixture, mock_event_bus, mock_cache_manager):
        """Test initialize() loads mission and tech stack."""
        # Arrange
        data_manager = DataManager(
            yoyo_dev_path=product_fixture,
            event_bus=mock_event_bus,
            cache_manager=mock_cache_manager
        )

        # Act
        data_manager.initialize()

        # Assert
        mission = data_manager.get_mission_statement()
        tech_stack = data_manager.get_tech_stack_summary()

        assert mission is not None
        assert len(mission) > 0
        assert tech_stack is not None
        assert len(tech_stack) > 0

    def test_product_file_caching(self, product_fixture, mock_event_bus, mock_cache_manager):
        """Test product files are cached after loading."""
        # Arrange
        data_manager = DataManager(
            yoyo_dev_path=product_fixture,
            event_bus=mock_event_bus,
            cache_manager=mock_cache_manager
        )

        # Act
        data_manager.initialize()

        # Assert
        # Check that cache.set was called for mission and tech_stack
        set_calls = mock_cache_manager.set.call_args_list
        cache_keys = [call[0][0] for call in set_calls]

        assert "mission" in cache_keys
        assert "tech_stack" in cache_keys

    def test_get_mission_statement_missing_file(self, tmp_path, mock_event_bus, mock_cache_manager):
        """Test get_mission_statement returns None when no mission file exists."""
        # Arrange
        yoyo_dev = tmp_path / ".yoyo-dev"
        product_path = yoyo_dev / "product"
        product_path.mkdir(parents=True)
        # No mission files created

        data_manager = DataManager(
            yoyo_dev_path=yoyo_dev,
            event_bus=mock_event_bus,
            cache_manager=mock_cache_manager
        )
        data_manager.initialize()

        # Act
        mission = data_manager.get_mission_statement()

        # Assert
        assert mission is None

    def test_get_tech_stack_summary_missing_file(self, tmp_path, mock_event_bus, mock_cache_manager):
        """Test get_tech_stack_summary returns empty list when no tech-stack file exists."""
        # Arrange
        yoyo_dev = tmp_path / ".yoyo-dev"
        product_path = yoyo_dev / "product"
        product_path.mkdir(parents=True)
        # No tech-stack files created

        data_manager = DataManager(
            yoyo_dev_path=yoyo_dev,
            event_bus=mock_event_bus,
            cache_manager=mock_cache_manager
        )
        data_manager.initialize()

        # Act
        tech_stack = data_manager.get_tech_stack_summary()

        # Assert
        assert tech_stack is not None
        assert isinstance(tech_stack, list)
        assert len(tech_stack) == 0

    def test_get_project_stats_no_specs_or_fixes(self, tmp_path, mock_event_bus, mock_cache_manager):
        """Test get_project_stats with no specs or fixes."""
        # Arrange
        yoyo_dev = tmp_path / ".yoyo-dev"
        yoyo_dev.mkdir()

        data_manager = DataManager(
            yoyo_dev_path=yoyo_dev,
            event_bus=mock_event_bus,
            cache_manager=mock_cache_manager
        )
        data_manager.initialize()

        # Act
        stats = data_manager.get_project_stats()

        # Assert
        assert stats is not None
        assert stats.active_specs == 0
        assert stats.active_fixes == 0
        assert stats.pending_tasks == 0
        assert stats.recent_errors == 0
