#!/usr/bin/env python3
"""
Test DataManager population from file system.

Verifies that DataManager correctly loads specs, fixes, tasks, and recaps.
"""

import sys
from pathlib import Path

# Add lib to path for imports
sys.path.insert(0, str(Path.home() / '.yoyo-dev' / 'lib'))


def test_data_manager_loads_specs():
    """Test that DataManager loads actual spec data from file system."""
    from yoyo_tui.services.data_manager import DataManager
    from yoyo_tui.services.event_bus import EventBus
    from yoyo_tui.services.cache_manager import CacheManager

    # Setup
    yoyo_dev_path = Path.home() / '.yoyo-dev' / '.yoyo-dev'
    event_bus = EventBus(enable_logging=False)
    cache_manager = CacheManager(default_ttl=300)

    # Create DataManager
    data_manager = DataManager(
        yoyo_dev_path=yoyo_dev_path,
        event_bus=event_bus,
        cache_manager=cache_manager
    )

    # Initialize (load data)
    data_manager.initialize()

    # Verify specs loaded
    state = data_manager.state
    assert state.specs is not None, "Specs should not be None"
    assert len(state.specs) > 0, f"Should have loaded specs, got {len(state.specs)}"

    # Verify spec data has expected fields
    first_spec = state.specs[0]
    assert hasattr(first_spec, 'name'), "Spec should have name"
    assert hasattr(first_spec, 'created_date'), "Spec should have created_date"
    assert hasattr(first_spec, 'status'), "Spec should have status"

    print(f"✅ Successfully loaded {len(state.specs)} specs")
    for spec in state.specs:
        print(f"   - {spec.name} ({spec.status})")


def test_data_manager_loads_fixes():
    """Test that DataManager loads actual fix data from file system."""
    from yoyo_tui.services.data_manager import DataManager
    from yoyo_tui.services.event_bus import EventBus
    from yoyo_tui.services.cache_manager import CacheManager

    # Setup
    yoyo_dev_path = Path.home() / '.yoyo-dev' / '.yoyo-dev'
    event_bus = EventBus(enable_logging=False)
    cache_manager = CacheManager(default_ttl=300)

    # Create DataManager
    data_manager = DataManager(
        yoyo_dev_path=yoyo_dev_path,
        event_bus=event_bus,
        cache_manager=cache_manager
    )

    # Initialize (load data)
    data_manager.initialize()

    # Verify fixes loaded (may be empty if no fixes exist)
    state = data_manager.state
    assert state.fixes is not None, "Fixes should not be None"

    print(f"✅ Successfully loaded {len(state.fixes)} fixes")
    for fix in state.fixes:
        print(f"   - {fix.name} ({fix.status})")


def test_data_manager_loads_recaps():
    """Test that DataManager loads actual recap data from file system."""
    from yoyo_tui.services.data_manager import DataManager
    from yoyo_tui.services.event_bus import EventBus
    from yoyo_tui.services.cache_manager import CacheManager

    # Setup
    yoyo_dev_path = Path.home() / '.yoyo-dev' / '.yoyo-dev'
    event_bus = EventBus(enable_logging=False)
    cache_manager = CacheManager(default_ttl=300)

    # Create DataManager
    data_manager = DataManager(
        yoyo_dev_path=yoyo_dev_path,
        event_bus=event_bus,
        cache_manager=cache_manager
    )

    # Initialize (load data)
    data_manager.initialize()

    # Verify recaps loaded (may be empty if no recaps exist)
    state = data_manager.state
    assert state.recaps is not None, "Recaps should not be None"

    print(f"✅ Successfully loaded {len(state.recaps)} recaps")
    for recap in state.recaps:
        print(f"   - {recap.created_date} - {recap.name}")


def test_data_manager_state_updated_event_emitted():
    """Test that DataManager emits STATE_UPDATED event after initialization."""
    from yoyo_tui.services.data_manager import DataManager
    from yoyo_tui.services.event_bus import EventBus, EventType
    from yoyo_tui.services.cache_manager import CacheManager

    # Setup
    yoyo_dev_path = Path.home() / '.yoyo-dev' / '.yoyo-dev'
    event_bus = EventBus(enable_logging=False)
    cache_manager = CacheManager(default_ttl=300)

    # Track events
    events_received = []
    event_bus.subscribe(EventType.STATE_UPDATED, lambda e: events_received.append(e))

    # Create DataManager
    data_manager = DataManager(
        yoyo_dev_path=yoyo_dev_path,
        event_bus=event_bus,
        cache_manager=cache_manager
    )

    # Initialize (should emit STATE_UPDATED)
    data_manager.initialize()

    # Verify event emitted
    assert len(events_received) > 0, "STATE_UPDATED event should have been emitted"
    assert events_received[0].event_type == EventType.STATE_UPDATED

    print(f"✅ STATE_UPDATED event emitted successfully")


if __name__ == '__main__':
    import pytest
    pytest.main([__file__, '-v', '-s'])
