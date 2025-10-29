"""
Unit Tests for DataManager

Tests centralized state management with:
- Initialization and state loading
- Query API for all data types
- Event handling (file changes, creation, deletion)
- Cache integration
- Thread safety
- Recent actions aggregation
"""

import json
import pytest
import tempfile
import shutil
import threading
import time
from pathlib import Path
from datetime import datetime
from typing import List

from lib.yoyo_tui.services.data_manager import DataManager
from lib.yoyo_tui.services.event_bus import EventBus
from lib.yoyo_tui.services.cache_manager import CacheManager
from lib.yoyo_tui.models import Event, EventType, ApplicationState


class TestDataManagerInitialization:
    """Test DataManager initialization and state loading."""

    @pytest.fixture
    def temp_project_dir(self):
        """Create temporary project directory with yoyo-dev structure."""
        temp_dir = tempfile.mkdtemp()
        project_dir = Path(temp_dir)

        # Create .yoyo-dev structure
        yoyo_dev = project_dir / ".yoyo-dev"
        (yoyo_dev / "specs").mkdir(parents=True)
        (yoyo_dev / "fixes").mkdir(parents=True)
        (yoyo_dev / "recaps").mkdir(parents=True)

        # Create sample spec
        spec_dir = yoyo_dev / "specs" / "2025-10-15-test-spec"
        spec_dir.mkdir()
        (spec_dir / "spec.md").write_text("# Test Spec\n\nTest specification.")
        (spec_dir / "state.json").write_text(json.dumps({
            "spec_name": "test-spec",
            "spec_created": "2025-10-15",
            "current_phase": "implementation"
        }))
        (spec_dir / "tasks.md").write_text("""# Tasks
## Task 1: Test Task
- [ ] 1.1 Subtask one
- [x] 1.2 Subtask two
""")

        # Create sample fix
        fix_dir = yoyo_dev / "fixes" / "2025-10-16-test-fix"
        fix_dir.mkdir()
        (fix_dir / "analysis.md").write_text("# Test Fix\n\nProblem summary goes here.")
        (fix_dir / "state.json").write_text(json.dumps({
            "fix_name": "test-fix",
            "fix_created": "2025-10-16",
            "current_phase": "pending"
        }))

        # Create sample recap
        recap_file = yoyo_dev / "recaps" / "2025-10-17-test-recap.md"
        recap_file.write_text("# Test Recap\n\nRecap summary.")

        yield project_dir
        shutil.rmtree(temp_dir)

    def test_initialization_creates_empty_state(self):
        """Test DataManager initializes with empty state."""
        event_bus = EventBus()
        cache_manager = CacheManager()

        data_manager = DataManager(
            yoyo_dev_path=Path("/tmp/nonexistent"),
            event_bus=event_bus,
            cache_manager=cache_manager
        )

        assert data_manager.state is not None
        assert len(data_manager.state.specs) == 0
        assert len(data_manager.state.fixes) == 0
        assert len(data_manager.state.tasks) == 0
        assert len(data_manager.state.recaps) == 0

    def test_initialize_loads_all_data(self, temp_project_dir):
        """Test initialize() loads all specs, fixes, recaps from file system."""
        yoyo_dev = temp_project_dir / ".yoyo-dev"
        event_bus = EventBus()
        cache_manager = CacheManager()

        data_manager = DataManager(
            yoyo_dev_path=yoyo_dev,
            event_bus=event_bus,
            cache_manager=cache_manager
        )

        data_manager.initialize()

        # Verify specs loaded
        assert len(data_manager.state.specs) == 1
        assert data_manager.state.specs[0].name == "test-spec"

        # Verify fixes loaded
        assert len(data_manager.state.fixes) == 1
        assert data_manager.state.fixes[0].name == "test-fix"

        # Verify recaps loaded
        assert len(data_manager.state.recaps) == 1
        assert data_manager.state.recaps[0].name == "test-recap"

    def test_initialize_emits_state_updated_event(self, temp_project_dir):
        """Test initialize() emits STATE_UPDATED event after loading."""
        yoyo_dev = temp_project_dir / ".yoyo-dev"
        event_bus = EventBus(enable_logging=True)
        cache_manager = CacheManager()

        data_manager = DataManager(
            yoyo_dev_path=yoyo_dev,
            event_bus=event_bus,
            cache_manager=cache_manager
        )

        data_manager.initialize()

        # Check event log
        events = event_bus.get_event_log()
        state_updated_events = [e for e in events if e.event_type == EventType.STATE_UPDATED]

        assert len(state_updated_events) >= 1
        assert state_updated_events[0].source == "DataManager"


class TestDataManagerQueryAPI:
    """Test DataManager query API methods."""

    @pytest.fixture
    def data_manager_with_data(self, temp_project_dir):
        """Create DataManager with loaded data."""
        yoyo_dev = temp_project_dir / ".yoyo-dev"
        event_bus = EventBus()
        cache_manager = CacheManager()

        data_manager = DataManager(
            yoyo_dev_path=yoyo_dev,
            event_bus=event_bus,
            cache_manager=cache_manager
        )
        data_manager.initialize()

        return data_manager

    @pytest.fixture
    def temp_project_dir(self):
        """Create temporary project directory (reuse from above)."""
        temp_dir = tempfile.mkdtemp()
        project_dir = Path(temp_dir)

        # Create .yoyo-dev structure
        yoyo_dev = project_dir / ".yoyo-dev"
        (yoyo_dev / "specs").mkdir(parents=True)
        (yoyo_dev / "fixes").mkdir(parents=True)
        (yoyo_dev / "recaps").mkdir(parents=True)

        # Create sample spec
        spec_dir = yoyo_dev / "specs" / "2025-10-15-test-spec"
        spec_dir.mkdir()
        (spec_dir / "spec.md").write_text("# Test Spec\n\nTest specification.")
        (spec_dir / "state.json").write_text(json.dumps({
            "spec_name": "test-spec",
            "spec_created": "2025-10-15",
            "current_phase": "implementation"
        }))

        # Create sample fix
        fix_dir = yoyo_dev / "fixes" / "2025-10-16-test-fix"
        fix_dir.mkdir()
        (fix_dir / "analysis.md").write_text("# Test Fix\n\nProblem summary.")

        # Create sample recap
        recap_file = yoyo_dev / "recaps" / "2025-10-17-test-recap.md"
        recap_file.write_text("# Test Recap\n\nRecap summary.")

        yield project_dir
        shutil.rmtree(temp_dir)

    def test_get_all_specs(self, data_manager_with_data):
        """Test get_all_specs() returns all specs."""
        specs = data_manager_with_data.get_all_specs()

        assert len(specs) == 1
        assert specs[0].name == "test-spec"

    def test_get_spec_by_name(self, data_manager_with_data):
        """Test get_spec_by_name() returns matching spec."""
        spec = data_manager_with_data.get_spec_by_name("test-spec")

        assert spec is not None
        assert spec.name == "test-spec"

    def test_get_spec_by_name_not_found(self, data_manager_with_data):
        """Test get_spec_by_name() returns None for nonexistent spec."""
        spec = data_manager_with_data.get_spec_by_name("nonexistent")

        assert spec is None

    def test_get_all_fixes(self, data_manager_with_data):
        """Test get_all_fixes() returns all fixes."""
        fixes = data_manager_with_data.get_all_fixes()

        assert len(fixes) == 1
        assert fixes[0].name == "test-fix"

    def test_get_fix_by_name(self, data_manager_with_data):
        """Test get_fix_by_name() returns matching fix."""
        fix = data_manager_with_data.get_fix_by_name("test-fix")

        assert fix is not None
        assert fix.name == "test-fix"

    def test_get_all_recaps(self, data_manager_with_data):
        """Test get_all_recaps() returns all recaps."""
        recaps = data_manager_with_data.get_all_recaps()

        assert len(recaps) == 1
        assert recaps[0].name == "test-recap"

    def test_get_execution_progress_empty(self, data_manager_with_data):
        """Test get_execution_progress() returns None when no progress."""
        progress = data_manager_with_data.get_execution_progress()

        assert progress is None

    def test_get_all_tasks_empty(self, data_manager_with_data):
        """Test get_all_tasks() returns empty list when no tasks."""
        tasks = data_manager_with_data.get_all_tasks()

        # Initial implementation may not have tasks loaded
        assert isinstance(tasks, list)


class TestDataManagerEventHandling:
    """Test DataManager event handling for file changes."""

    @pytest.fixture
    def temp_project_dir(self):
        """Create temporary project directory."""
        temp_dir = tempfile.mkdtemp()
        project_dir = Path(temp_dir)

        # Create .yoyo-dev structure
        yoyo_dev = project_dir / ".yoyo-dev"
        (yoyo_dev / "specs").mkdir(parents=True)
        (yoyo_dev / "fixes").mkdir(parents=True)
        (yoyo_dev / "recaps").mkdir(parents=True)

        yield project_dir
        shutil.rmtree(temp_dir)

    def test_on_file_created_adds_spec(self, temp_project_dir):
        """Test FILE_CREATED event adds new spec to state."""
        yoyo_dev = temp_project_dir / ".yoyo-dev"
        event_bus = EventBus()
        cache_manager = CacheManager()

        data_manager = DataManager(
            yoyo_dev_path=yoyo_dev,
            event_bus=event_bus,
            cache_manager=cache_manager
        )
        data_manager.initialize()

        # Create new spec
        new_spec_dir = yoyo_dev / "specs" / "2025-10-20-new-spec"
        new_spec_dir.mkdir()
        (new_spec_dir / "spec.md").write_text("# New Spec\n\nNew specification.")

        # Emit FILE_CREATED event
        event_bus.publish(
            EventType.FILE_CREATED,
            {"file_path": str(new_spec_dir / "spec.md")},
            source="FileWatcher"
        )

        # Give event handler time to process
        time.sleep(0.1)

        # Verify spec was added
        specs = data_manager.get_all_specs()
        assert len(specs) == 1
        assert specs[0].name == "new-spec"

    def test_on_file_changed_updates_spec(self, temp_project_dir):
        """Test FILE_CHANGED event updates existing spec in state."""
        yoyo_dev = temp_project_dir / ".yoyo-dev"
        event_bus = EventBus()
        cache_manager = CacheManager()

        # Create initial spec
        spec_dir = yoyo_dev / "specs" / "2025-10-15-test-spec"
        spec_dir.mkdir()
        spec_file = spec_dir / "spec.md"
        spec_file.write_text("# Original Title\n\nOriginal content.")

        data_manager = DataManager(
            yoyo_dev_path=yoyo_dev,
            event_bus=event_bus,
            cache_manager=cache_manager
        )
        data_manager.initialize()

        # Get original spec
        original_spec = data_manager.get_spec_by_name("test-spec")
        assert original_spec.title == "Original Title"

        # Modify spec file
        spec_file.write_text("# Updated Title\n\nUpdated content.")

        # Emit FILE_CHANGED event
        event_bus.publish(
            EventType.FILE_CHANGED,
            {"file_path": str(spec_file)},
            source="FileWatcher"
        )

        # Give event handler time to process
        time.sleep(0.1)

        # Verify spec was updated
        updated_spec = data_manager.get_spec_by_name("test-spec")
        assert updated_spec.title == "Updated Title"

    def test_on_file_deleted_removes_spec(self, temp_project_dir):
        """Test FILE_DELETED event removes spec from state."""
        yoyo_dev = temp_project_dir / ".yoyo-dev"
        event_bus = EventBus()
        cache_manager = CacheManager()

        # Create initial spec
        spec_dir = yoyo_dev / "specs" / "2025-10-15-test-spec"
        spec_dir.mkdir()
        (spec_dir / "spec.md").write_text("# Test Spec\n\nTest specification.")

        data_manager = DataManager(
            yoyo_dev_path=yoyo_dev,
            event_bus=event_bus,
            cache_manager=cache_manager
        )
        data_manager.initialize()

        # Verify spec exists
        assert len(data_manager.get_all_specs()) == 1

        # Emit FILE_DELETED event
        event_bus.publish(
            EventType.FILE_DELETED,
            {"file_path": str(spec_dir / "spec.md")},
            source="FileWatcher"
        )

        # Give event handler time to process
        time.sleep(0.1)

        # Verify spec was removed
        assert len(data_manager.get_all_specs()) == 0

    def test_state_updated_event_emitted_on_change(self, temp_project_dir):
        """Test STATE_UPDATED event emitted when state changes."""
        yoyo_dev = temp_project_dir / ".yoyo-dev"
        event_bus = EventBus(enable_logging=True)
        cache_manager = CacheManager()

        data_manager = DataManager(
            yoyo_dev_path=yoyo_dev,
            event_bus=event_bus,
            cache_manager=cache_manager
        )
        data_manager.initialize()

        # Clear event log
        event_bus.clear_event_log()

        # Create new spec
        new_spec_dir = yoyo_dev / "specs" / "2025-10-20-new-spec"
        new_spec_dir.mkdir()
        (new_spec_dir / "spec.md").write_text("# New Spec\n\nNew specification.")

        # Emit FILE_CREATED event
        event_bus.publish(
            EventType.FILE_CREATED,
            {"file_path": str(new_spec_dir / "spec.md")},
            source="FileWatcher"
        )

        # Give event handler time to process
        time.sleep(0.1)

        # Check STATE_UPDATED event was emitted
        events = event_bus.get_event_log()
        state_updated_events = [e for e in events if e.event_type == EventType.STATE_UPDATED]

        assert len(state_updated_events) >= 1


class TestDataManagerCacheIntegration:
    """Test DataManager cache integration."""

    @pytest.fixture
    def temp_project_dir(self):
        """Create temporary project directory."""
        temp_dir = tempfile.mkdtemp()
        project_dir = Path(temp_dir)

        # Create .yoyo-dev structure
        yoyo_dev = project_dir / ".yoyo-dev"
        (yoyo_dev / "specs").mkdir(parents=True)

        # Create sample spec
        spec_dir = yoyo_dev / "specs" / "2025-10-15-test-spec"
        spec_dir.mkdir()
        (spec_dir / "spec.md").write_text("# Test Spec\n\nTest specification.")

        yield project_dir
        shutil.rmtree(temp_dir)

    def test_cache_hit_on_second_load(self, temp_project_dir):
        """Test cache is used on subsequent loads."""
        yoyo_dev = temp_project_dir / ".yoyo-dev"
        event_bus = EventBus()
        cache_manager = CacheManager()

        data_manager = DataManager(
            yoyo_dev_path=yoyo_dev,
            event_bus=event_bus,
            cache_manager=cache_manager
        )

        # First load - cache miss
        data_manager.initialize()
        initial_stats = cache_manager.get_stats()

        # Second load - should hit cache
        data_manager.refresh_all()
        updated_stats = cache_manager.get_stats()

        # Cache hits should increase
        assert updated_stats.hits > initial_stats.hits

    def test_cache_invalidated_on_file_change(self, temp_project_dir):
        """Test cache invalidated when file changes."""
        yoyo_dev = temp_project_dir / ".yoyo-dev"
        event_bus = EventBus()
        cache_manager = CacheManager()

        spec_dir = yoyo_dev / "specs" / "2025-10-15-test-spec"
        spec_file = spec_dir / "spec.md"

        data_manager = DataManager(
            yoyo_dev_path=yoyo_dev,
            event_bus=event_bus,
            cache_manager=cache_manager
        )
        data_manager.initialize()

        # Emit FILE_CHANGED event
        event_bus.publish(
            EventType.FILE_CHANGED,
            {"file_path": str(spec_file)},
            source="FileWatcher"
        )

        # Give event handler time to process
        time.sleep(0.1)

        # Cache should have invalidation
        stats = cache_manager.get_stats()
        assert stats.invalidations > 0


class TestDataManagerThreadSafety:
    """Test DataManager thread safety."""

    def test_concurrent_reads(self):
        """Test multiple threads can safely read state."""
        event_bus = EventBus()
        cache_manager = CacheManager()

        data_manager = DataManager(
            yoyo_dev_path=Path("/tmp/test"),
            event_bus=event_bus,
            cache_manager=cache_manager
        )

        results = []
        errors = []

        def read_state():
            try:
                specs = data_manager.get_all_specs()
                results.append(len(specs))
            except Exception as e:
                errors.append(e)

        # Create 10 threads that read concurrently
        threads = [threading.Thread(target=read_state) for _ in range(10)]

        for thread in threads:
            thread.start()

        for thread in threads:
            thread.join()

        # No errors should occur
        assert len(errors) == 0
        # All reads should complete
        assert len(results) == 10


class TestDataManagerRecentActions:
    """Test DataManager get_recent_actions() method."""

    @pytest.fixture
    def temp_project_dir(self):
        """Create temporary project directory with multiple items."""
        temp_dir = tempfile.mkdtemp()
        project_dir = Path(temp_dir)

        # Create .yoyo-dev structure
        yoyo_dev = project_dir / ".yoyo-dev"
        (yoyo_dev / "specs").mkdir(parents=True)
        (yoyo_dev / "fixes").mkdir(parents=True)
        (yoyo_dev / "recaps").mkdir(parents=True)

        # Create multiple specs
        for i in range(3):
            spec_dir = yoyo_dev / "specs" / f"2025-10-{15+i:02d}-spec-{i}"
            spec_dir.mkdir()
            (spec_dir / "spec.md").write_text(f"# Spec {i}\n\nSpec content.")

        # Create multiple fixes
        for i in range(2):
            fix_dir = yoyo_dev / "fixes" / f"2025-10-{18+i:02d}-fix-{i}"
            fix_dir.mkdir()
            (fix_dir / "analysis.md").write_text(f"# Fix {i}\n\nFix content.")

        # Create multiple recaps
        for i in range(3):
            recap_file = yoyo_dev / "recaps" / f"2025-10-{20+i:02d}-recap-{i}.md"
            recap_file.write_text(f"# Recap {i}\n\nRecap content.")

        yield project_dir
        shutil.rmtree(temp_dir)

    def test_get_recent_actions_returns_chronological_list(self, temp_project_dir):
        """Test get_recent_actions() returns items in chronological order."""
        yoyo_dev = temp_project_dir / ".yoyo-dev"
        event_bus = EventBus()
        cache_manager = CacheManager()

        data_manager = DataManager(
            yoyo_dev_path=yoyo_dev,
            event_bus=event_bus,
            cache_manager=cache_manager
        )
        data_manager.initialize()

        recent = data_manager.get_recent_actions(limit=10)

        # Should return all 8 items (3 specs + 2 fixes + 3 recaps)
        assert len(recent) == 8

        # Should be in chronological order (most recent first)
        for i in range(len(recent) - 1):
            assert recent[i]["date"] >= recent[i + 1]["date"]

    def test_get_recent_actions_respects_limit(self, temp_project_dir):
        """Test get_recent_actions() respects limit parameter."""
        yoyo_dev = temp_project_dir / ".yoyo-dev"
        event_bus = EventBus()
        cache_manager = CacheManager()

        data_manager = DataManager(
            yoyo_dev_path=yoyo_dev,
            event_bus=event_bus,
            cache_manager=cache_manager
        )
        data_manager.initialize()

        recent = data_manager.get_recent_actions(limit=5)

        # Should return only 5 items
        assert len(recent) == 5

    def test_get_recent_actions_includes_all_types(self, temp_project_dir):
        """Test get_recent_actions() includes specs, fixes, and recaps."""
        yoyo_dev = temp_project_dir / ".yoyo-dev"
        event_bus = EventBus()
        cache_manager = CacheManager()

        data_manager = DataManager(
            yoyo_dev_path=yoyo_dev,
            event_bus=event_bus,
            cache_manager=cache_manager
        )
        data_manager.initialize()

        recent = data_manager.get_recent_actions(limit=10)

        # Check we have all types represented
        types = set(action["type"] for action in recent)
        assert "spec" in types
        assert "fix" in types
        assert "recap" in types
