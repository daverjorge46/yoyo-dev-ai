"""
Tests for DataManager.get_active_work() Method

Tests the missing get_active_work() method that provides ActiveWork data
to the active_work_panel widget. This follows TDD Red phase - tests should
fail initially as the method doesn't exist yet.
"""

import pytest
from pathlib import Path
from unittest.mock import Mock
from datetime import datetime

from lib.yoyo_tui_v3.services.data_manager import DataManager
from lib.yoyo_tui_v3.services.event_bus import EventBus
from lib.yoyo_tui_v3.services.cache_manager import CacheManager
from lib.yoyo_tui_v3.models import ActiveWork, Spec, Fix, Task, TaskStatus


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
def empty_fixture(tmp_path):
    """Create fixture with no specs or fixes."""
    yoyo_dev = tmp_path / ".yoyo-dev"
    yoyo_dev.mkdir()

    # Create empty directories
    (yoyo_dev / "specs").mkdir()
    (yoyo_dev / "fixes").mkdir()
    (yoyo_dev / "recaps").mkdir()

    return yoyo_dev


@pytest.fixture
def spec_with_incomplete_tasks_fixture(tmp_path):
    """Create fixture with a spec that has incomplete tasks."""
    yoyo_dev = tmp_path / ".yoyo-dev"
    specs_dir = yoyo_dev / "specs"
    specs_dir.mkdir(parents=True)

    # Create spec with incomplete tasks
    spec_folder = specs_dir / "2025-10-30-user-auth"
    spec_folder.mkdir()

    (spec_folder / "spec.md").write_text("""# User Authentication Spec

## Overview
Implement user authentication system.

## Status
In Progress
""")

    (spec_folder / "tasks.md").write_text("""# Tasks

## Task 1: Setup Auth Provider
- [x] 1.1 Install Clerk SDK
- [x] 1.2 Configure environment
- [ ] 1.3 Add auth context

## Task 2: Create Login Page
- [ ] 2.1 Create login component
- [ ] 2.2 Add form validation
- [ ] 2.3 Integrate with Clerk
""")

    (yoyo_dev / "fixes").mkdir()
    (yoyo_dev / "recaps").mkdir()

    return yoyo_dev


@pytest.fixture
def fix_with_incomplete_tasks_fixture(tmp_path):
    """Create fixture with a fix that has incomplete tasks."""
    yoyo_dev = tmp_path / ".yoyo-dev"
    fixes_dir = yoyo_dev / "fixes"
    fixes_dir.mkdir(parents=True)

    # Create fix with incomplete tasks
    fix_folder = fixes_dir / "2025-10-30-button-styling"
    fix_folder.mkdir()

    (fix_folder / "analysis.md").write_text("""# Button Styling Fix

## Problem
Buttons have inconsistent padding.

## Solution
Standardize button styles.
""")

    (fix_folder / "tasks.md").write_text("""# Tasks

## Task 1: Update Button Styles
- [x] 1.1 Create button variants
- [ ] 1.2 Update existing buttons
- [ ] 1.3 Test all button states
""")

    (yoyo_dev / "specs").mkdir()
    (yoyo_dev / "recaps").mkdir()

    return yoyo_dev


@pytest.fixture
def completed_tasks_fixture(tmp_path):
    """Create fixture with specs/fixes that have all tasks completed."""
    yoyo_dev = tmp_path / ".yoyo-dev"
    specs_dir = yoyo_dev / "specs"
    specs_dir.mkdir(parents=True)

    # Create spec with all tasks completed
    spec_folder = specs_dir / "2025-10-29-old-feature"
    spec_folder.mkdir()

    (spec_folder / "spec.md").write_text("""# Old Feature Spec

## Status
Complete
""")

    (spec_folder / "tasks.md").write_text("""# Tasks

## Task 1: Implement Feature
- [x] 1.1 Write tests
- [x] 1.2 Implement code
- [x] 1.3 Verify all tests pass
""")

    (yoyo_dev / "fixes").mkdir()
    (yoyo_dev / "recaps").mkdir()

    return yoyo_dev


@pytest.fixture
def multiple_active_items_fixture(tmp_path):
    """Create fixture with multiple specs and fixes with incomplete tasks."""
    yoyo_dev = tmp_path / ".yoyo-dev"

    # Create older spec (2025-10-28)
    specs_dir = yoyo_dev / "specs"
    specs_dir.mkdir(parents=True)

    older_spec = specs_dir / "2025-10-28-old-feature"
    older_spec.mkdir()
    (older_spec / "spec.md").write_text("# Old Feature")
    (older_spec / "tasks.md").write_text("""# Tasks

## Task 1: Old Task
- [x] 1.1 First subtask
- [ ] 1.2 Incomplete subtask
""")

    # Create newer spec (2025-10-30)
    newer_spec = specs_dir / "2025-10-30-new-feature"
    newer_spec.mkdir()
    (newer_spec / "spec.md").write_text("# New Feature")
    (newer_spec / "tasks.md").write_text("""# Tasks

## Task 1: New Task
- [x] 1.1 First subtask
- [ ] 1.2 Incomplete subtask
""")

    # Create fix (2025-10-29)
    fixes_dir = yoyo_dev / "fixes"
    fixes_dir.mkdir()

    fix_folder = fixes_dir / "2025-10-29-middle-fix"
    fix_folder.mkdir()
    (fix_folder / "analysis.md").write_text("# Middle Fix")
    (fix_folder / "tasks.md").write_text("""# Tasks

## Task 1: Fix Task
- [x] 1.1 First subtask
- [ ] 1.2 Incomplete subtask
""")

    (yoyo_dev / "recaps").mkdir()

    return yoyo_dev


class TestDataManagerGetActiveWork:
    """Test suite for DataManager.get_active_work() method."""

    def test_get_active_work_returns_none_when_no_specs_or_fixes(
        self, empty_fixture, mock_event_bus, mock_cache_manager
    ):
        """
        Test get_active_work returns None when no specs/fixes exist.

        RED PHASE: This test should FAIL with AttributeError
        because get_active_work() method doesn't exist yet.
        """
        # Arrange
        data_manager = DataManager(
            yoyo_dev_path=empty_fixture,
            event_bus=mock_event_bus,
            cache_manager=mock_cache_manager
        )
        data_manager.initialize()

        # Act
        active_work = data_manager.get_active_work()

        # Assert
        assert active_work is None

    def test_get_active_work_returns_none_when_all_tasks_completed(
        self, completed_tasks_fixture, mock_event_bus, mock_cache_manager
    ):
        """
        Test get_active_work returns None when all tasks completed.

        RED PHASE: This test should FAIL with AttributeError.
        """
        # Arrange
        data_manager = DataManager(
            yoyo_dev_path=completed_tasks_fixture,
            event_bus=mock_event_bus,
            cache_manager=mock_cache_manager
        )
        data_manager.initialize()

        # Act
        active_work = data_manager.get_active_work()

        # Assert
        assert active_work is None

    def test_get_active_work_returns_activework_for_spec_with_incomplete_tasks(
        self, spec_with_incomplete_tasks_fixture, mock_event_bus, mock_cache_manager
    ):
        """
        Test get_active_work returns ActiveWork for spec with incomplete tasks.

        RED PHASE: This test should FAIL with AttributeError.
        """
        # Arrange
        data_manager = DataManager(
            yoyo_dev_path=spec_with_incomplete_tasks_fixture,
            event_bus=mock_event_bus,
            cache_manager=mock_cache_manager
        )
        data_manager.initialize()

        # Act
        active_work = data_manager.get_active_work()

        # Assert
        assert active_work is not None
        assert isinstance(active_work, ActiveWork)
        assert active_work.type == "spec"
        assert active_work.name == "user-auth"
        assert active_work.path is not None
        assert isinstance(active_work.tasks, list)
        assert len(active_work.tasks) > 0
        assert active_work.progress > 0  # Some tasks completed
        assert active_work.progress < 100  # Not all tasks completed
        assert active_work.status in ["pending", "in_progress", "completed"]

    def test_get_active_work_returns_activework_for_fix_with_incomplete_tasks(
        self, fix_with_incomplete_tasks_fixture, mock_event_bus, mock_cache_manager
    ):
        """
        Test get_active_work returns ActiveWork for fix with incomplete tasks.

        RED PHASE: This test should FAIL with AttributeError.
        """
        # Arrange
        data_manager = DataManager(
            yoyo_dev_path=fix_with_incomplete_tasks_fixture,
            event_bus=mock_event_bus,
            cache_manager=mock_cache_manager
        )
        data_manager.initialize()

        # Act
        active_work = data_manager.get_active_work()

        # Assert
        assert active_work is not None
        assert isinstance(active_work, ActiveWork)
        assert active_work.type == "fix"
        assert active_work.name == "button-styling"
        assert active_work.path is not None
        assert isinstance(active_work.tasks, list)
        assert len(active_work.tasks) > 0
        assert active_work.progress > 0  # Some tasks completed
        assert active_work.progress < 100  # Not all tasks completed
        assert active_work.status in ["pending", "in_progress", "completed"]

    def test_get_active_work_prefers_most_recent_when_multiple_active_items(
        self, multiple_active_items_fixture, mock_event_bus, mock_cache_manager
    ):
        """
        Test get_active_work prefers most recent when multiple active items.

        Should return the most recent (2025-10-30) spec, not the older ones.

        RED PHASE: This test should FAIL with AttributeError.
        """
        # Arrange
        data_manager = DataManager(
            yoyo_dev_path=multiple_active_items_fixture,
            event_bus=mock_event_bus,
            cache_manager=mock_cache_manager
        )
        data_manager.initialize()

        # Act
        active_work = data_manager.get_active_work()

        # Assert
        assert active_work is not None
        assert isinstance(active_work, ActiveWork)
        # Should be the most recent item (2025-10-30 spec)
        assert active_work.type == "spec"
        assert active_work.name == "new-feature"
        assert "2025-10-30" in str(active_work.path)

    def test_get_active_work_calculates_progress_correctly(
        self, spec_with_incomplete_tasks_fixture, mock_event_bus, mock_cache_manager
    ):
        """
        Test get_active_work calculates task progress correctly.

        Fixture has 6 total subtasks: 2 completed, 4 incomplete.
        Expected progress: 33%

        RED PHASE: This test should FAIL with AttributeError.
        """
        # Arrange
        data_manager = DataManager(
            yoyo_dev_path=spec_with_incomplete_tasks_fixture,
            event_bus=mock_event_bus,
            cache_manager=mock_cache_manager
        )
        data_manager.initialize()

        # Act
        active_work = data_manager.get_active_work()

        # Assert
        assert active_work is not None
        # 2 out of 6 subtasks completed = 33.33% → 33%
        assert active_work.progress == pytest.approx(33.0, rel=0.1)

    def test_get_active_work_returns_correct_task_structure(
        self, spec_with_incomplete_tasks_fixture, mock_event_bus, mock_cache_manager
    ):
        """
        Test get_active_work returns tasks with correct structure.

        RED PHASE: This test should FAIL with AttributeError.
        """
        # Arrange
        data_manager = DataManager(
            yoyo_dev_path=spec_with_incomplete_tasks_fixture,
            event_bus=mock_event_bus,
            cache_manager=mock_cache_manager
        )
        data_manager.initialize()

        # Act
        active_work = data_manager.get_active_work()

        # Assert
        assert active_work is not None
        assert len(active_work.tasks) == 2  # Two parent tasks

        # Check first task structure
        task1 = active_work.tasks[0]
        assert hasattr(task1, 'id')
        assert hasattr(task1, 'title')
        assert hasattr(task1, 'status')
        assert hasattr(task1, 'subtasks')
        assert isinstance(task1.subtasks, list)
        assert len(task1.subtasks) == 3  # Task 1 has 3 subtasks

    def test_get_active_work_is_thread_safe(
        self, spec_with_incomplete_tasks_fixture, mock_event_bus, mock_cache_manager
    ):
        """
        Test get_active_work is thread-safe (doesn't modify internal state).

        RED PHASE: This test should FAIL with AttributeError.
        """
        # Arrange
        data_manager = DataManager(
            yoyo_dev_path=spec_with_incomplete_tasks_fixture,
            event_bus=mock_event_bus,
            cache_manager=mock_cache_manager
        )
        data_manager.initialize()

        # Act - Call multiple times
        active_work1 = data_manager.get_active_work()
        active_work2 = data_manager.get_active_work()

        # Assert - Should return consistent results
        assert active_work1 is not None
        assert active_work2 is not None
        assert active_work1.name == active_work2.name
        assert active_work1.type == active_work2.type
        assert active_work1.progress == active_work2.progress
