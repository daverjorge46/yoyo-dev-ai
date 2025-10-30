#!/usr/bin/env python3
"""
Quick verification script for parsers.

Tests parsers with real .yoyo-dev data.
"""

import sys
from pathlib import Path

# Add lib to path
sys.path.insert(0, str(Path(__file__).parent))

from lib.yoyo_tui_v3.parsers.mission_parser import MissionParser
from lib.yoyo_tui_v3.parsers.tech_stack_parser import TechStackParser
from lib.yoyo_tui_v3.parsers.roadmap_parser import RoadmapParser

def main():
    """Run parser verification."""
    print("=" * 60)
    print("PARSER VERIFICATION")
    print("=" * 60)

    product_path = Path.cwd() / ".yoyo-dev" / "product"

    if not product_path.exists():
        print(f"❌ Product path not found: {product_path}")
        return 1

    print(f"\nProduct path: {product_path}")
    print()

    # Test MissionParser
    print("1. Testing MissionParser")
    print("-" * 60)
    mission = MissionParser.parse(product_path)
    if mission:
        print(f"✅ Mission parsed successfully ({len(mission)} chars):")
        print(f"   '{mission}'")
    else:
        print("❌ Failed to parse mission")
    print()

    # Test TechStackParser
    print("2. Testing TechStackParser")
    print("-" * 60)
    tech_stack = TechStackParser.parse(product_path)
    if tech_stack:
        print(f"✅ Tech stack parsed successfully ({len(tech_stack)} items):")
        for i, tech in enumerate(tech_stack[:5], 1):
            print(f"   {i}. {tech}")
        if len(tech_stack) > 5:
            print(f"   ... and {len(tech_stack) - 5} more")
    else:
        print("❌ Failed to parse tech stack (empty list)")
    print()

    # Test RoadmapParser
    print("3. Testing RoadmapParser")
    print("-" * 60)
    roadmap = RoadmapParser.parse(product_path)
    if roadmap:
        print(f"✅ Roadmap parsed successfully:")
        print(f"   Total phases: {roadmap['total_phases']}")
        print(f"   Completed items: {roadmap['completed_items']}")
        print(f"   Total items: {roadmap['total_items']}")
        if roadmap['total_items'] > 0:
            progress = (roadmap['completed_items'] / roadmap['total_items']) * 100
            print(f"   Progress: {progress:.1f}%")
    else:
        print("❌ Failed to parse roadmap")
    print()

    print("=" * 60)
    print("VERIFICATION COMPLETE")
    print("=" * 60)

    return 0


if __name__ == "__main__":
    sys.exit(main())
