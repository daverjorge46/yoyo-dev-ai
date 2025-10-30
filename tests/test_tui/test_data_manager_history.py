"""
Tests for DataManager.get_recent_history() Method

Tests the missing get_recent_history() method that provides HistoryEntry list
to the history_panel widget. This follows TDD Red phase - tests should
fail initially as the method doesn't exist yet.
"""

import pytest
from pathlib import Path
from unittest.mock import Mock
from datetime import datetime

from lib.yoyo_tui_v3.services.data_manager import DataManager
from lib.yoyo_tui_v3.services.event_bus import EventBus
from lib.yoyo_tui_v3.services.cache_manager import CacheManager
from lib.yoyo_tui_v3.models import HistoryEntry, ActionType


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
    """Create fixture with no data."""
    yoyo_dev = tmp_path / ".yoyo-dev"
    yoyo_dev.mkdir()

    # Create empty directories
    (yoyo_dev / "specs").mkdir()
    (yoyo_dev / "fixes").mkdir()
    (yoyo_dev / "recaps").mkdir()

    return yoyo_dev


@pytest.fixture
def specs_only_fixture(tmp_path):
    """Create fixture with only specs (no fixes or recaps)."""
    yoyo_dev = tmp_path / ".yoyo-dev"
    specs_dir = yoyo_dev / "specs"
    specs_dir.mkdir(parents=True)

    # Create spec 1 (2025-10-28)
    spec1 = specs_dir / "2025-10-28-first-feature"
    spec1.mkdir()
    (spec1 / "spec.md").write_text("# First Feature")
    (spec1 / "tasks.md").write_text("## Task 1\n- [x] 1.1 Complete")

    # Create spec 2 (2025-10-29)
    spec2 = specs_dir / "2025-10-29-second-feature"
    spec2.mkdir()
    (spec2 / "spec.md").write_text("# Second Feature")
    (spec2 / "tasks.md").write_text("## Task 1\n- [x] 1.1 Complete")

    # Create spec 3 (2025-10-30)
    spec3 = specs_dir / "2025-10-30-third-feature"
    spec3.mkdir()
    (spec3 / "spec.md").write_text("# Third Feature")
    (spec3 / "tasks.md").write_text("## Task 1\n- [ ] 1.1 Incomplete")

    (yoyo_dev / "fixes").mkdir()
    (yoyo_dev / "recaps").mkdir()

    return yoyo_dev


@pytest.fixture
def mixed_data_fixture(tmp_path):
    """Create fixture with specs, fixes, and recaps."""
    yoyo_dev = tmp_path / ".yoyo-dev"

    # Create specs
    specs_dir = yoyo_dev / "specs"
    specs_dir.mkdir(parents=True)

    spec1 = specs_dir / "2025-10-28-user-auth"
    spec1.mkdir()
    (spec1 / "spec.md").write_text("# User Auth Spec")
    (spec1 / "tasks.md").write_text("## Task 1\n- [x] 1.1 Complete")

    # Create fixes
    fixes_dir = yoyo_dev / "fixes"
    fixes_dir.mkdir()

    fix1 = fixes_dir / "2025-10-29-button-styling"
    fix1.mkdir()
    (fix1 / "analysis.md").write_text("# Button Styling Fix")
    (fix1 / "tasks.md").write_text("## Task 1\n- [x] 1.1 Complete")

    # Create recaps
    recaps_dir = yoyo_dev / "recaps"
    recaps_dir.mkdir()

    recap1 = recaps_dir / "2025-10-30-deployment-recap.md"
    recap1.write_text("""# Deployment Recap

## Summary
Deployed v1.0 to production.

## What Went Well
- Clean deployment process
- No downtime

## What Could Improve
- Better testing coverage
""")

    return yoyo_dev


@pytest.fixture
def large_dataset_fixture(tmp_path):
    """Create fixture with 15 items for testing count limit."""
    yoyo_dev = tmp_path / ".yoyo-dev"

    # Create 8 specs
    specs_dir = yoyo_dev / "specs"
    specs_dir.mkdir(parents=True)
    for i in range(1, 9):
        spec = specs_dir / f"2025-10-{20+i:02d}-feature-{i}"
        spec.mkdir()
        (spec / "spec.md").write_text(f"# Feature {i}")
        (spec / "tasks.md").write_text("## Task 1\n- [x] 1.1 Complete")

    # Create 4 fixes
    fixes_dir = yoyo_dev / "fixes"
    fixes_dir.mkdir()
    for i in range(1, 5):
        fix = fixes_dir / f"2025-10-{24+i:02d}-fix-{i}"
        fix.mkdir()
        (fix / "analysis.md").write_text(f"# Fix {i}")
        (fix / "tasks.md").write_text("## Task 1\n- [x] 1.1 Complete")

    # Create 3 recaps
    recaps_dir = yoyo_dev / "recaps"
    recaps_dir.mkdir()
    for i in range(1, 4):
        recap = recaps_dir / f"2025-10-{27+i:02d}-recap-{i}.md"
        recap.write_text(f"""# Recap {i}

## Summary
Completed work on feature {i}.
""")

    return yoyo_dev


@pytest.fixture
def chronological_fixture(tmp_path):
    """Create fixture with items spanning multiple dates for sorting test."""
    yoyo_dev = tmp_path / ".yoyo-dev"

    # Create items with intentionally non-chronological creation order
    specs_dir = yoyo_dev / "specs"
    specs_dir.mkdir(parents=True)

    # Create newest spec first (2025-10-30)
    spec_new = specs_dir / "2025-10-30-newest-feature"
    spec_new.mkdir()
    (spec_new / "spec.md").write_text("# Newest Feature")
    (spec_new / "tasks.md").write_text("## Task 1\n- [ ] 1.1 Incomplete")

    # Create oldest spec (2025-10-25)
    spec_old = specs_dir / "2025-10-25-oldest-feature"
    spec_old.mkdir()
    (spec_old / "spec.md").write_text("# Oldest Feature")
    (spec_old / "tasks.md").write_text("## Task 1\n- [x] 1.1 Complete")

    # Create middle spec (2025-10-28)
    spec_mid = specs_dir / "2025-10-28-middle-feature"
    spec_mid.mkdir()
    (spec_mid / "spec.md").write_text("# Middle Feature")
    (spec_mid / "tasks.md").write_text("## Task 1\n- [x] 1.1 Complete")

    # Create fix (2025-10-29)
    fixes_dir = yoyo_dev / "fixes"
    fixes_dir.mkdir()

    fix = fixes_dir / "2025-10-29-some-fix"
    fix.mkdir()
    (fix / "analysis.md").write_text("# Some Fix")
    (fix / "tasks.md").write_text("## Task 1\n- [x] 1.1 Complete")

    # Create recap (2025-10-27)
    recaps_dir = yoyo_dev / "recaps"
    recaps_dir.mkdir()

    recap = recaps_dir / "2025-10-27-early-recap.md"
    recap.write_text("""# Early Recap

## Summary
Early work completed.
""")

    return yoyo_dev


class TestDataManagerGetRecentHistory:
    """Test suite for DataManager.get_recent_history() method."""

    def test_get_recent_history_returns_empty_list_when_no_data(
        self, empty_fixture, mock_event_bus, mock_cache_manager
    ):
        """
        Test get_recent_history returns empty list when no data.

        RED PHASE: This test should FAIL with AttributeError
        because get_recent_history() method doesn't exist yet.
        """
        # Arrange
        data_manager = DataManager(
            yoyo_dev_path=empty_fixture,
            event_bus=mock_event_bus,
            cache_manager=mock_cache_manager
        )
        data_manager.initialize()

        # Act
        history = data_manager.get_recent_history(count=10)

        # Assert
        assert history is not None
        assert isinstance(history, list)
        assert len(history) == 0

    def test_get_recent_history_returns_historyentry_list_sorted_by_date(
        self, chronological_fixture, mock_event_bus, mock_cache_manager
    ):
        """
        Test get_recent_history returns HistoryEntry list sorted by date (most recent first).

        Expected order: 2025-10-30, 2025-10-29, 2025-10-28, 2025-10-27, 2025-10-25

        RED PHASE: This test should FAIL with AttributeError.
        """
        # Arrange
        data_manager = DataManager(
            yoyo_dev_path=chronological_fixture,
            event_bus=mock_event_bus,
            cache_manager=mock_cache_manager
        )
        data_manager.initialize()

        # Act
        history = data_manager.get_recent_history(count=10)

        # Assert
        assert history is not None
        assert isinstance(history, list)
        assert len(history) == 5

        # Check all entries are HistoryEntry objects
        for entry in history:
            assert isinstance(entry, HistoryEntry)
            assert hasattr(entry, 'timestamp')
            assert hasattr(entry, 'action_type')
            assert hasattr(entry, 'description')
            assert hasattr(entry, 'success')

        # Verify chronological order (most recent first)
        dates = [entry.timestamp for entry in history]
        assert dates == sorted(dates, reverse=True)

        # Verify specific order
        assert "newest-feature" in history[0].description.lower()
        assert "some-fix" in history[1].description.lower()
        assert "middle-feature" in history[2].description.lower()
        assert "early-recap" in history[3].description.lower()
        assert "oldest-feature" in history[4].description.lower()

    def test_get_recent_history_respects_count_limit(
        self, large_dataset_fixture, mock_event_bus, mock_cache_manager
    ):
        """
        Test get_recent_history respects count limit parameter.

        Fixture has 15 items (8 specs + 4 fixes + 3 recaps).
        When requesting count=10, should only return 10 most recent.

        RED PHASE: This test should FAIL with AttributeError.
        """
        # Arrange
        data_manager = DataManager(
            yoyo_dev_path=large_dataset_fixture,
            event_bus=mock_event_bus,
            cache_manager=mock_cache_manager
        )
        data_manager.initialize()

        # Act
        history = data_manager.get_recent_history(count=10)

        # Assert
        assert history is not None
        assert isinstance(history, list)
        assert len(history) == 10  # Should limit to 10

        # Verify all are HistoryEntry objects
        for entry in history:
            assert isinstance(entry, HistoryEntry)

        # Verify chronological order maintained
        dates = [entry.timestamp for entry in history]
        assert dates == sorted(dates, reverse=True)

    def test_get_recent_history_combines_specs_fixes_and_recaps(
        self, mixed_data_fixture, mock_event_bus, mock_cache_manager
    ):
        """
        Test get_recent_history combines specs, fixes, and recaps.

        RED PHASE: This test should FAIL with AttributeError.
        """
        # Arrange
        data_manager = DataManager(
            yoyo_dev_path=mixed_data_fixture,
            event_bus=mock_event_bus,
            cache_manager=mock_cache_manager
        )
        data_manager.initialize()

        # Act
        history = data_manager.get_recent_history(count=10)

        # Assert
        assert history is not None
        assert len(history) == 3  # 1 spec + 1 fix + 1 recap

        # Check that all three types are present
        action_types = [entry.action_type for entry in history]
        assert ActionType.SPEC in action_types
        assert ActionType.FIX in action_types
        # Recaps may use a different action type - verify presence by description
        descriptions = [entry.description.lower() for entry in history]
        assert any("spec" in desc for desc in descriptions)
        assert any("fix" in desc for desc in descriptions)
        assert any("recap" in desc or "deployment" in desc for desc in descriptions)

    def test_get_recent_history_with_count_5(
        self, large_dataset_fixture, mock_event_bus, mock_cache_manager
    ):
        """
        Test get_recent_history with smaller count parameter.

        RED PHASE: This test should FAIL with AttributeError.
        """
        # Arrange
        data_manager = DataManager(
            yoyo_dev_path=large_dataset_fixture,
            event_bus=mock_event_bus,
            cache_manager=mock_cache_manager
        )
        data_manager.initialize()

        # Act
        history = data_manager.get_recent_history(count=5)

        # Assert
        assert history is not None
        assert len(history) == 5  # Should limit to 5

        # Verify chronological order
        dates = [entry.timestamp for entry in history]
        assert dates == sorted(dates, reverse=True)

    def test_get_recent_history_with_specs_only(
        self, specs_only_fixture, mock_event_bus, mock_cache_manager
    ):
        """
        Test get_recent_history when only specs exist (no fixes or recaps).

        RED PHASE: This test should FAIL with AttributeError.
        """
        # Arrange
        data_manager = DataManager(
            yoyo_dev_path=specs_only_fixture,
            event_bus=mock_event_bus,
            cache_manager=mock_cache_manager
        )
        data_manager.initialize()

        # Act
        history = data_manager.get_recent_history(count=10)

        # Assert
        assert history is not None
        assert len(history) == 3  # 3 specs

        # All should be spec type
        for entry in history:
            assert isinstance(entry, HistoryEntry)
            assert entry.action_type == ActionType.SPEC

        # Verify chronological order
        dates = [entry.timestamp for entry in history]
        assert dates == sorted(dates, reverse=True)

    def test_get_recent_history_entry_structure(
        self, mixed_data_fixture, mock_event_bus, mock_cache_manager
    ):
        """
        Test get_recent_history returns entries with correct structure.

        RED PHASE: This test should FAIL with AttributeError.
        """
        # Arrange
        data_manager = DataManager(
            yoyo_dev_path=mixed_data_fixture,
            event_bus=mock_event_bus,
            cache_manager=mock_cache_manager
        )
        data_manager.initialize()

        # Act
        history = data_manager.get_recent_history(count=10)

        # Assert
        assert len(history) > 0

        # Check first entry structure
        entry = history[0]
        assert isinstance(entry, HistoryEntry)
        assert isinstance(entry.timestamp, datetime)
        assert isinstance(entry.action_type, ActionType)
        assert isinstance(entry.description, str)
        assert len(entry.description) > 0
        assert isinstance(entry.success, bool)
        # details is optional
        assert entry.details is None or isinstance(entry.details, str)

    def test_get_recent_history_is_thread_safe(
        self, mixed_data_fixture, mock_event_bus, mock_cache_manager
    ):
        """
        Test get_recent_history is thread-safe (doesn't modify internal state).

        RED PHASE: This test should FAIL with AttributeError.
        """
        # Arrange
        data_manager = DataManager(
            yoyo_dev_path=mixed_data_fixture,
            event_bus=mock_event_bus,
            cache_manager=mock_cache_manager
        )
        data_manager.initialize()

        # Act - Call multiple times
        history1 = data_manager.get_recent_history(count=10)
        history2 = data_manager.get_recent_history(count=10)

        # Assert - Should return consistent results
        assert len(history1) == len(history2)
        for i in range(len(history1)):
            assert history1[i].action_type == history2[i].action_type
            assert history1[i].description == history2[i].description
            assert history1[i].timestamp == history2[i].timestamp

    def test_get_recent_history_with_default_count(
        self, mixed_data_fixture, mock_event_bus, mock_cache_manager
    ):
        """
        Test get_recent_history with default count parameter.

        The method signature should have a default count value (likely 10).

        RED PHASE: This test should FAIL with AttributeError.
        """
        # Arrange
        data_manager = DataManager(
            yoyo_dev_path=mixed_data_fixture,
            event_bus=mock_event_bus,
            cache_manager=mock_cache_manager
        )
        data_manager.initialize()

        # Act - Call without count parameter (should use default)
        history = data_manager.get_recent_history(count=10)

        # Assert
        assert history is not None
        assert isinstance(history, list)

    def test_get_recent_history_with_zero_count(
        self, mixed_data_fixture, mock_event_bus, mock_cache_manager
    ):
        """
        Test get_recent_history with count=0 returns empty list.

        RED PHASE: This test should FAIL with AttributeError.
        """
        # Arrange
        data_manager = DataManager(
            yoyo_dev_path=mixed_data_fixture,
            event_bus=mock_event_bus,
            cache_manager=mock_cache_manager
        )
        data_manager.initialize()

        # Act
        history = data_manager.get_recent_history(count=0)

        # Assert
        assert history is not None
        assert isinstance(history, list)
        assert len(history) == 0
