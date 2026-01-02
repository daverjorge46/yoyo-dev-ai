# Fix Summary (Lite)

**Problem**: TUI dashboard shows empty/error states despite valid .yoyo-dev data existing

**Root Cause**: Missing product file parsers and 4 DataManager methods that ProjectOverview widget calls

**Solution**: Create 3 parsers (MissionParser, TechStackParser, RoadmapParser) and implement 4 missing DataManager methods (get_mission_statement, get_tech_stack_summary, get_project_stats, get_mcp_status)

**Files to Modify**:
- `lib/yoyo_tui_v3/parsers/mission_parser.py` - CREATE (parse mission-lite.md)
- `lib/yoyo_tui_v3/parsers/tech_stack_parser.py` - CREATE (parse tech-stack.md)
- `lib/yoyo_tui_v3/parsers/roadmap_parser.py` - CREATE (parse roadmap.md for stats)
- `lib/yoyo_tui_v3/services/data_manager.py` - ADD 4 methods + update initialize()
- `lib/yoyo_tui_v3/models.py` - ADD ProjectStats and MCPStatus dataclasses (if missing)
- `tests/parsers/test_mission_parser.py` - CREATE tests
- `tests/parsers/test_tech_stack_parser.py` - CREATE tests
- `tests/parsers/test_roadmap_parser.py` - CREATE tests
- `tests/services/test_data_manager_product.py` - CREATE tests
