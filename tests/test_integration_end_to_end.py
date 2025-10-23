"""
End-to-End Integration Tests for Event-Driven Architecture

Tests the complete flow:
1. File creation → FileWatcher detects → emits FILE_CREATED event
2. DataManager receives event → parses file → updates state
3. DataManager emits STATE_UPDATED event
4. State changes are reflected in query API
"""

import json
import pytest
import tempfile
import shutil
import time
from pathlib import Path
from threading import Event as ThreadEvent

from lib.yoyo_tui.services.event_bus import EventBus
from lib.yoyo_tui.services.cache_manager import CacheManager
from lib.yoyo_tui.services.data_manager import DataManager
from lib.yoyo_tui.services.file_watcher import FileWatcher
from lib.yoyo_tui.models import EventType


class TestEndToEndFileToState:
    """Test complete flow from file creation to state update."""

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

        yield project_dir
        shutil.rmtree(temp_dir)

    def test_spec_creation_end_to_end(self, temp_project_dir):
        """Test complete flow: create spec file → watcher → parser → state."""
        yoyo_dev = temp_project_dir / ".yoyo-dev"

        # Setup services
        event_bus = EventBus(enable_logging=True)
        cache_manager = CacheManager()
        data_manager = DataManager(
            yoyo_dev_path=yoyo_dev,
            event_bus=event_bus,
            cache_manager=cache_manager
        )
        data_manager.initialize()

        # Setup file watcher
        file_watcher = FileWatcher(event_bus)
        file_watcher.start_watching(yoyo_dev)

        # Track STATE_UPDATED events
        state_updated_events = []
        state_updated_received = ThreadEvent()

        def on_state_updated(event):
            state_updated_events.append(event)
            state_updated_received.set()

        event_bus.subscribe(EventType.STATE_UPDATED, on_state_updated)

        try:
            # Initial state should be empty
            assert len(data_manager.get_all_specs()) == 0

            # Create new spec directory and files
            spec_dir = yoyo_dev / "specs" / "2025-10-20-test-spec"
            spec_dir.mkdir()

            spec_file = spec_dir / "spec.md"
            spec_file.write_text("# Test Spec\n\nThis is a test specification.")

            state_file = spec_dir / "state.json"
            state_file.write_text(json.dumps({
                "spec_name": "test-spec",
                "spec_created": "2025-10-20",
                "current_phase": "implementation"
            }))

            # Wait for file watcher to detect change and state to update
            state_updated_received.wait(timeout=3.0)
            time.sleep(0.2)  # Give extra time for processing

            # Verify STATE_UPDATED event was emitted
            assert len(state_updated_events) > 0, "STATE_UPDATED event should be emitted"

            # Verify spec was added to state
            specs = data_manager.get_all_specs()
            assert len(specs) == 1, f"Should have 1 spec, got {len(specs)}"
            assert specs[0].name == "test-spec"
            assert specs[0].title == "Test Spec"

            # Verify cache was populated
            cache_key = "spec:2025-10-20-test-spec"
            cached = cache_manager.get(cache_key)
            assert cached is not None, "Spec should be cached"

        finally:
            file_watcher.stop_watching()

    def test_fix_creation_end_to_end(self, temp_project_dir):
        """Test complete flow: create fix file → watcher → parser → state."""
        yoyo_dev = temp_project_dir / ".yoyo-dev"

        # Setup services
        event_bus = EventBus()
        cache_manager = CacheManager()
        data_manager = DataManager(
            yoyo_dev_path=yoyo_dev,
            event_bus=event_bus,
            cache_manager=cache_manager
        )
        data_manager.initialize()

        # Setup file watcher
        file_watcher = FileWatcher(event_bus)
        file_watcher.start_watching(yoyo_dev)

        # Track state updates
        state_updated_received = ThreadEvent()

        def on_state_updated(event):
            state_updated_received.set()

        event_bus.subscribe(EventType.STATE_UPDATED, on_state_updated)

        try:
            # Initial state should be empty
            assert len(data_manager.get_all_fixes()) == 0

            # Create new fix directory and files
            fix_dir = yoyo_dev / "fixes" / "2025-10-21-test-fix"
            fix_dir.mkdir()

            analysis_file = fix_dir / "analysis.md"
            analysis_file.write_text("""# Test Fix

## Problem Summary
This is a test problem.

## Root Cause
Test root cause.
""")

            state_file = fix_dir / "state.json"
            state_file.write_text(json.dumps({
                "fix_name": "test-fix",
                "fix_created": "2025-10-21",
                "current_phase": "pending"
            }))

            # Wait for file watcher to detect change and state to update
            state_updated_received.wait(timeout=3.0)
            time.sleep(0.2)  # Give extra time for processing

            # Verify fix was added to state
            fixes = data_manager.get_all_fixes()
            assert len(fixes) == 1, f"Should have 1 fix, got {len(fixes)}"
            assert fixes[0].name == "test-fix"
            assert fixes[0].title == "Test Fix"

        finally:
            file_watcher.stop_watching()

    def test_file_modification_propagates(self, temp_project_dir):
        """Test file modification → watcher → state update → cache invalidation."""
        yoyo_dev = temp_project_dir / ".yoyo-dev"

        # Create initial spec
        spec_dir = yoyo_dev / "specs" / "2025-10-15-test-spec"
        spec_dir.mkdir()
        spec_file = spec_dir / "spec.md"
        spec_file.write_text("# Original Title\n\nOriginal content.")

        # Setup services
        event_bus = EventBus()
        cache_manager = CacheManager()
        data_manager = DataManager(
            yoyo_dev_path=yoyo_dev,
            event_bus=event_bus,
            cache_manager=cache_manager
        )
        data_manager.initialize()

        # Verify initial state
        spec = data_manager.get_spec_by_name("test-spec")
        assert spec is not None
        assert spec.title == "Original Title"

        # Setup file watcher
        file_watcher = FileWatcher(event_bus)
        file_watcher.start_watching(yoyo_dev)

        # Track state updates
        state_updated_received = ThreadEvent()

        def on_state_updated(event):
            state_updated_received.set()

        event_bus.subscribe(EventType.STATE_UPDATED, on_state_updated)

        try:
            # Modify spec file
            spec_file.write_text("# Updated Title\n\nUpdated content.")

            # Wait for file watcher to detect change
            state_updated_received.wait(timeout=3.0)
            time.sleep(0.2)  # Give extra time for processing

            # Verify spec was updated in state
            updated_spec = data_manager.get_spec_by_name("test-spec")
            assert updated_spec is not None
            assert updated_spec.title == "Updated Title", f"Expected 'Updated Title', got '{updated_spec.title}'"

            # Verify cache was invalidated (stats should show invalidation)
            stats = cache_manager.get_stats()
            assert stats.invalidations > 0, "Cache should have been invalidated"

        finally:
            file_watcher.stop_watching()

    def test_recap_creation_end_to_end(self, temp_project_dir):
        """Test complete flow: create recap file → watcher → parser → state."""
        yoyo_dev = temp_project_dir / ".yoyo-dev"

        # Setup services
        event_bus = EventBus()
        cache_manager = CacheManager()
        data_manager = DataManager(
            yoyo_dev_path=yoyo_dev,
            event_bus=event_bus,
            cache_manager=cache_manager
        )
        data_manager.initialize()

        # Setup file watcher
        file_watcher = FileWatcher(event_bus)
        file_watcher.start_watching(yoyo_dev)

        # Track state updates
        state_updated_received = ThreadEvent()

        def on_state_updated(event):
            state_updated_received.set()

        event_bus.subscribe(EventType.STATE_UPDATED, on_state_updated)

        try:
            # Initial state should be empty
            assert len(data_manager.get_all_recaps()) == 0

            # Create new recap file
            recap_file = yoyo_dev / "recaps" / "2025-10-22-test-recap.md"
            recap_file.write_text("""# Test Recap

## Summary
This is a test recap summarizing completed work.

## Key Achievements
- Implemented feature X
- Fixed bug Y
""")

            # Wait for file watcher to detect change and state to update
            state_updated_received.wait(timeout=3.0)
            time.sleep(0.2)  # Give extra time for processing

            # Verify recap was added to state
            recaps = data_manager.get_all_recaps()
            assert len(recaps) == 1, f"Should have 1 recap, got {len(recaps)}"
            assert recaps[0].name == "test-recap"
            assert recaps[0].title == "Test Recap"

        finally:
            file_watcher.stop_watching()


class TestEventPropagation:
    """Test event propagation through the system."""

    def test_event_log_records_all_events(self):
        """Test event bus logs all events when logging enabled."""
        event_bus = EventBus(enable_logging=True)
        cache_manager = CacheManager()

        # Publish various events
        event_bus.publish(
            EventType.FILE_CREATED,
            {"file_path": "/test/path"},
            source="TestSource"
        )

        event_bus.publish(
            EventType.STATE_UPDATED,
            {"source": "test"},
            source="DataManager"
        )

        # Check event log
        events = event_bus.get_event_log()
        assert len(events) == 2

        # Verify event types
        event_types = [e.event_type for e in events]
        assert EventType.FILE_CREATED in event_types
        assert EventType.STATE_UPDATED in event_types

    def test_multiple_subscribers_all_receive_events(self):
        """Test multiple subscribers all receive the same event."""
        event_bus = EventBus()

        received_1 = []
        received_2 = []
        received_3 = []

        def handler_1(event):
            received_1.append(event)

        def handler_2(event):
            received_2.append(event)

        def handler_3(event):
            received_3.append(event)

        # Subscribe all handlers
        event_bus.subscribe(EventType.STATE_UPDATED, handler_1)
        event_bus.subscribe(EventType.STATE_UPDATED, handler_2)
        event_bus.subscribe(EventType.STATE_UPDATED, handler_3)

        # Publish event
        event_bus.publish(
            EventType.STATE_UPDATED,
            {"test": "data"},
            source="Test"
        )

        # All handlers should receive the event
        assert len(received_1) == 1
        assert len(received_2) == 1
        assert len(received_3) == 1
