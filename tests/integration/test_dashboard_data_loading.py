"""
Integration test for dashboard data loading.

Tests that DataManager correctly loads product files, specs, and fixes
from a real .yoyo-dev directory structure.
"""

import sys
from pathlib import Path

# Add lib to path for imports
sys.path.insert(0, str(Path(__file__).parent.parent.parent / "lib"))

from yoyo_tui_v3.services.event_bus import EventBus
from yoyo_tui_v3.services.cache_manager import CacheManager
from yoyo_tui_v3.services.data_manager import DataManager


def test_dashboard_data_loading():
    """Test end-to-end dashboard data loading with real .yoyo-dev directory."""

    # Setup
    yoyo_dev_path = Path.cwd() / ".yoyo-dev"

    # Skip if .yoyo-dev doesn't exist
    if not yoyo_dev_path.exists():
        print("⚠️  Skipping: .yoyo-dev directory not found")
        return

    event_bus = EventBus()
    cache_manager = CacheManager(default_ttl=30)
    data_manager = DataManager(
        yoyo_dev_path=yoyo_dev_path,
        event_bus=event_bus,
        cache_manager=cache_manager
    )

    # Initialize (loads all data)
    data_manager.initialize()

    # Test 1: Mission statement loaded
    mission = data_manager.get_mission_statement()
    assert mission is not None, "Mission statement should not be None"
    assert len(mission) > 0, "Mission statement should not be empty"
    print(f"✅ Mission loaded: {len(mission)} chars")

    # Test 2: Tech stack loaded
    tech_stack = data_manager.get_tech_stack_summary()
    assert isinstance(tech_stack, list), "Tech stack should be a list"
    assert len(tech_stack) > 0, "Tech stack should not be empty"
    print(f"✅ Tech stack loaded: {len(tech_stack)} items")

    # Test 3: Project stats calculated
    stats = data_manager.get_project_stats()
    assert stats is not None, "Project stats should not be None"
    assert hasattr(stats, 'active_specs'), "Stats should have active_specs"
    assert hasattr(stats, 'active_fixes'), "Stats should have active_fixes"
    print(f"✅ Project stats: {stats.active_specs} specs, {stats.active_fixes} fixes")

    # Test 4: Existing functionality (specs loading) still works
    specs = data_manager.get_all_specs()
    assert isinstance(specs, list), "Specs should be a list"
    print(f"✅ Specs loaded: {len(specs)} specs")

    # Test 5: Existing functionality (fixes loading) still works
    fixes = data_manager.get_all_fixes()
    assert isinstance(fixes, list), "Fixes should be a list"
    print(f"✅ Fixes loaded: {len(fixes)} fixes")

    # Test 6: Stats match actual counts
    assert stats.active_specs == len(specs), "Stats should match actual spec count"
    assert stats.active_fixes == len(fixes), "Stats should match actual fix count"
    print("✅ Stats match actual counts")

    print("\n🎉 All integration tests passed!")


if __name__ == "__main__":
    test_dashboard_data_loading()
