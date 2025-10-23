#!/usr/bin/env python3
"""
Test end-to-end EventBus flow for reactive updates.

Verifies that file changes trigger widget updates through the complete chain:
FileWatcher → EventBus → DataManager → EventBus → Widgets
"""

import sys
import time
import tempfile
import shutil
from pathlib import Path

# Add lib to path for imports
sys.path.insert(0, str(Path.home() / '.yoyo-dev' / 'lib'))


def test_file_change_triggers_state_updated_event():
    """Test that file change triggers STATE_UPDATED event through DataManager."""
    from yoyo_tui.services.file_watcher import FileWatcher
    from yoyo_tui.services.data_manager import DataManager
    from yoyo_tui.services.event_bus import EventBus, EventType
    from yoyo_tui.services.cache_manager import CacheManager

    # Setup temp directory with spec structure
    temp_dir = tempfile.mkdtemp(prefix="yoyo_test_")
    temp_path = Path(temp_dir)

    # Create mock spec structure
    specs_dir = temp_path / "specs" / "2025-10-23-test-spec"
    specs_dir.mkdir(parents=True)

    spec_file = specs_dir / "spec.md"
    spec_file.write_text("# Test Spec\n\nTest content")

    state_file = specs_dir / "state.json"
    state_file.write_text('{"spec_name": "test-spec", "current_phase": "planning"}')

    try:
        # Setup EventBus, CacheManager, DataManager, FileWatcher
        event_bus = EventBus(enable_logging=False)
        cache_manager = CacheManager(default_ttl=300)

        data_manager = DataManager(
            yoyo_dev_path=temp_path,
            event_bus=event_bus,
            cache_manager=cache_manager
        )

        # Track STATE_UPDATED events (subscribe BEFORE initialize to catch all events)
        state_updated_events = []
        event_bus.subscribe(EventType.STATE_UPDATED, lambda e: state_updated_events.append(e))

        # Initialize data (will emit STATE_UPDATED event)
        data_manager.initialize()

        # Clear events from initialization
        initial_event_count = len(state_updated_events)
        state_updated_events.clear()

        # Start FileWatcher
        file_watcher = FileWatcher(event_bus=event_bus, debounce_window=0.1, max_wait=1.0)
        file_watcher.start_watching(temp_path)

        # Give watchdog time to start
        time.sleep(0.2)

        # Modify spec file (should trigger: FileWatcher → DataManager → STATE_UPDATED)
        spec_file.write_text("# Test Spec\n\nModified content")

        # Wait for event propagation
        time.sleep(0.5)

        # Verify STATE_UPDATED event was emitted from file change
        assert len(state_updated_events) >= 1, f"Expected ≥1 STATE_UPDATED event from file change, got {len(state_updated_events)}"
        assert initial_event_count >= 1, f"Should have received event from initialize()"

        print(f"✅ File change triggered STATE_UPDATED event")
        print(f"   Total STATE_UPDATED events: {len(state_updated_events)}")

        file_watcher.stop_watching()

    finally:
        shutil.rmtree(temp_dir, ignore_errors=True)


def test_datamanager_handles_file_changed_event():
    """Test that DataManager correctly handles FILE_CHANGED events."""
    from yoyo_tui.services.data_manager import DataManager
    from yoyo_tui.services.event_bus import EventBus, EventType, Event
    from yoyo_tui.services.cache_manager import CacheManager

    # Setup temp directory with spec structure
    temp_dir = tempfile.mkdtemp(prefix="yoyo_test_")
    temp_path = Path(temp_dir)

    specs_dir = temp_path / "specs" / "2025-10-23-test-spec"
    specs_dir.mkdir(parents=True)

    spec_file = specs_dir / "spec.md"
    spec_file.write_text("# Test Spec\n\nOriginal content")

    state_file = specs_dir / "state.json"
    state_file.write_text('{"spec_name": "test-spec", "current_phase": "planning"}')

    try:
        # Setup
        event_bus = EventBus(enable_logging=False)
        cache_manager = CacheManager(default_ttl=300)

        data_manager = DataManager(
            yoyo_dev_path=temp_path,
            event_bus=event_bus,
            cache_manager=cache_manager
        )

        # Initialize
        data_manager.initialize()

        initial_spec_count = len(data_manager.state.specs)
        assert initial_spec_count > 0, "Should have loaded initial spec"

        # Track STATE_UPDATED events
        state_updated_events = []
        event_bus.subscribe(EventType.STATE_UPDATED, lambda e: state_updated_events.append(e))

        # Modify spec file
        spec_file.write_text("# Test Spec\n\nModified content")

        # Manually publish FILE_CHANGED event (simulating FileWatcher)
        event_bus.publish(
            EventType.FILE_CHANGED,
            {"file_path": str(spec_file), "change_type": "modified"},
            source="TestSuite"
        )

        # Give DataManager time to process
        time.sleep(0.1)

        # Verify STATE_UPDATED was emitted
        assert len(state_updated_events) > 0, "STATE_UPDATED should have been emitted"

        # Verify spec was re-parsed
        final_spec_count = len(data_manager.state.specs)
        assert final_spec_count == initial_spec_count, "Spec count should remain the same"

        print(f"✅ DataManager handled FILE_CHANGED event correctly")

    finally:
        shutil.rmtree(temp_dir, ignore_errors=True)


def test_event_bus_pubsub_pattern():
    """Test basic EventBus publish-subscribe pattern."""
    from yoyo_tui.services.event_bus import EventBus, EventType

    event_bus = EventBus(enable_logging=False)

    # Track events
    events_received = []

    def handler(event):
        events_received.append(event)

    # Subscribe
    event_bus.subscribe(EventType.STATE_UPDATED, handler)

    # Publish
    event_bus.publish(
        EventType.STATE_UPDATED,
        {"test": "data"},
        source="Test"
    )

    # Verify
    assert len(events_received) == 1, "Should have received one event"
    assert events_received[0].event_type == EventType.STATE_UPDATED
    assert events_received[0].data["test"] == "data"

    print("✅ EventBus pub-sub pattern working correctly")


if __name__ == '__main__':
    import pytest
    pytest.main([__file__, '-v', '-s'])
