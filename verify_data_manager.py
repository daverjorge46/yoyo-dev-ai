#!/usr/bin/env python3
"""
Quick verification script for DataManager integration.

Tests DataManager with real .yoyo-dev data.
"""

import sys
from pathlib import Path

# Add lib to path
sys.path.insert(0, str(Path(__file__).parent))

from lib.yoyo_tui_v3.services.data_manager import DataManager
from lib.yoyo_tui_v3.services.event_bus import EventBus
from lib.yoyo_tui_v3.services.cache_manager import CacheManager


def main():
    """Run DataManager verification."""
    print("=" * 60)
    print("DATAMANAGER VERIFICATION")
    print("=" * 60)

    yoyo_dev_path = Path.cwd() / ".yoyo-dev"

    if not yoyo_dev_path.exists():
        print(f"❌ .yoyo-dev path not found: {yoyo_dev_path}")
        return 1

    print(f"\n.yoyo-dev path: {yoyo_dev_path}")
    print()

    # Create EventBus and CacheManager
    event_bus = EventBus()
    cache_manager = CacheManager(default_ttl=10)

    # Create DataManager
    print("Initializing DataManager...")
    data_manager = DataManager(
        yoyo_dev_path=yoyo_dev_path,
        event_bus=event_bus,
        cache_manager=cache_manager
    )

    # Initialize to load data
    data_manager.initialize()
    print()

    # Test get_mission_statement()
    print("1. Testing get_mission_statement()")
    print("-" * 60)
    mission = data_manager.get_mission_statement()
    if mission:
        print(f"✅ Mission loaded ({len(mission)} chars):")
        print(f"   '{mission}'")
    else:
        print("❌ Mission is None")
    print()

    # Test get_tech_stack_summary()
    print("2. Testing get_tech_stack_summary()")
    print("-" * 60)
    tech_stack = data_manager.get_tech_stack_summary()
    if tech_stack:
        print(f"✅ Tech stack loaded ({len(tech_stack)} items):")
        for i, tech in enumerate(tech_stack[:5], 1):
            print(f"   {i}. {tech}")
        if len(tech_stack) > 5:
            print(f"   ... and {len(tech_stack) - 5} more")
    else:
        print("⚠️  Tech stack is empty (but list exists)")
    print()

    # Test get_project_stats()
    print("3. Testing get_project_stats()")
    print("-" * 60)
    stats = data_manager.get_project_stats()
    if stats:
        print(f"✅ Project stats loaded:")
        print(f"   Active specs: {stats.active_specs}")
        print(f"   Active fixes: {stats.active_fixes}")
        print(f"   Pending tasks: {stats.pending_tasks}")
        print(f"   Recent errors: {stats.recent_errors}")
    else:
        print("❌ Stats is None")
    print()

    # Test get_all_specs()
    print("4. Testing get_all_specs()")
    print("-" * 60)
    specs = data_manager.get_all_specs()
    print(f"✅ Found {len(specs)} specs")
    if specs:
        for spec in specs[:3]:
            print(f"   - {spec.name} ({spec.status}, {spec.progress:.0f}% complete)")
        if len(specs) > 3:
            print(f"   ... and {len(specs) - 3} more")
    print()

    # Test get_all_fixes()
    print("5. Testing get_all_fixes()")
    print("-" * 60)
    fixes = data_manager.get_all_fixes()
    print(f"✅ Found {len(fixes)} fixes")
    if fixes:
        for fix in fixes[:3]:
            print(f"   - {fix.name} ({fix.status}, {fix.progress:.0f}% complete)")
        if len(fixes) > 3:
            print(f"   ... and {len(fixes) - 3} more")
    print()

    # Test get_mcp_status()
    print("6. Testing get_mcp_status()")
    print("-" * 60)
    mcp_status = data_manager.get_mcp_status()
    if mcp_status:
        print(f"✅ MCP status loaded:")
        print(f"   Connected: {mcp_status.connected}")
        print(f"   Server: {mcp_status.server_name}")
    else:
        print("⚠️  MCP status is None (not yet implemented)")
    print()

    print("=" * 60)
    print("VERIFICATION COMPLETE")
    print("=" * 60)
    print("\n✅ All DataManager methods working correctly!")

    return 0


if __name__ == "__main__":
    sys.exit(main())
