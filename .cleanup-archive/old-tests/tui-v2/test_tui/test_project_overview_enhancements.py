"""
Tests for ProjectOverview widget enhancements.

Tests the enhanced ProjectOverview widget that displays:
- Project name (from mission-lite.md)
- Mission summary (from mission-lite.md)
- Key features (from mission-lite.md Solution section)
- Tech stack (from tech-stack.md Core Technologies section)
- Current phase (from roadmap.md)

Enhancement Date: 2025-10-23
"""

import unittest
import tempfile
from pathlib import Path
import sys

# Add lib to path for imports
sys.path.insert(0, str(Path.home() / '.yoyo-dev' / 'lib'))


class TestProjectOverviewEnhancements(unittest.TestCase):
    """Test enhanced ProjectOverview widget features."""

    def setUp(self):
        """Create temporary product directory with test files."""
        # Create temp directory
        self.temp_dir = tempfile.mkdtemp()
        self.product_path = Path(self.temp_dir)

        # Create mission-lite.md with complete structure
        mission_content = """# Test Project

**Mission**: Empower developers to build great software faster using systematic workflows.

## Target Users
- Solo developers
- Small teams

## Core Problem
Development without structure leads to technical debt.

## Solution
Structured workflow framework providing:
- Systematic feature development (specs to tasks to execution)
- Bug fix workflows with root cause analysis
- Design system enforcement (WCAG AA)
- Real-time TUI dashboard (being rebuilt)
- Parallel execution (2-3x speed)
- Pattern library for reusable approaches

## Current Focus (Phase 1)
**PRIMARY MISSION**: Build amazing software

## Tech Stack
- Runtime: Python 3.11
- TUI: Textual, Rich
"""
        (self.product_path / 'mission-lite.md').write_text(mission_content)

        # Create tech-stack.md with realistic structure
        tech_content = """# Test Project - Technical Stack

## Architecture Overview

Test project uses Python and modern TUI frameworks.

---

## Core Technologies

### Runtime & Languages

**Bash 4.0+**
- Primary scripting language
- System orchestration
- Rationale: Universal on Unix systems

**Python 3.11+**
- TUI dashboard application
- Business logic
- Rationale: Best-in-class terminal UI frameworks

**Platform**
- Primary: Linux
- Secondary: macOS

---

## TUI Dashboard Stack

### UI Framework

**Textual 0.83.0+** (https://textual.textualize.io/)
- Modern Python TUI framework
- Rich widget system
- Rationale: Most advanced terminal UI framework

**Rich 13.7.0+** (https://rich.readthedocs.io/)
- Terminal formatting
- Syntax highlighting
- Rationale: Industry standard

### File & State Management

**Watchdog 4.0.0+**
- File system monitoring
- Real-time change detection
- Rationale: Enables real-time updates

---

## Workflow Orchestration

**Claude Code** (Primary)
- Command system
- Agent system
"""
        (self.product_path / 'tech-stack.md').write_text(tech_content)

        # Create roadmap.md
        roadmap_content = """# Test Project - Roadmap

## Overview

Development roadmap for test project.

---

## Phase 0: Foundation - COMPLETED ✅

*Everything that's already working*

### Core Workflows ✅
- [x] Feature development
- [x] Bug fixes
- [x] Testing

---

## Phase 1: Enhancement - IN PROGRESS 🔧

*Current focus*

### New Features
- [ ] Advanced workflows
- [ ] Enhanced UI
"""
        (self.product_path / 'roadmap.md').write_text(roadmap_content)

    def tearDown(self):
        """Cleanup temp directory."""
        import shutil
        shutil.rmtree(self.temp_dir, ignore_errors=True)

    def test_get_project_name(self):
        """Test project name extraction from mission-lite.md."""
        from yoyo_tui.widgets.project_overview import ProjectOverview

        widget = ProjectOverview(product_path=self.product_path)
        project_name = widget._get_project_name()

        self.assertEqual(project_name, "Test Project",
                        "Should extract project name from heading")

    def test_get_mission_summary(self):
        """Test mission summary extraction from mission-lite.md."""
        from yoyo_tui.widgets.project_overview import ProjectOverview

        widget = ProjectOverview(product_path=self.product_path)
        mission_summary = widget._get_mission_summary()

        self.assertIn("Empower developers", mission_summary,
                     "Should extract mission text")
        self.assertIn("systematic workflows", mission_summary,
                     "Should include key mission keywords")

    def test_get_mission_summary_truncation(self):
        """Test that long mission summaries are truncated."""
        from yoyo_tui.widgets.project_overview import ProjectOverview

        # Create mission with very long text
        long_mission = """# Long Project

**Mission**: """ + "A" * 200 + """

## Solution
"""
        (self.product_path / 'mission-lite.md').write_text(long_mission)

        widget = ProjectOverview(product_path=self.product_path)
        mission_summary = widget._get_mission_summary()

        self.assertLessEqual(len(mission_summary), 100,
                           "Mission should be truncated to ~100 chars")
        self.assertTrue(mission_summary.endswith("..."),
                       "Truncated mission should end with ellipsis")

    def test_get_key_features(self):
        """Test key features extraction from Solution section."""
        from yoyo_tui.widgets.project_overview import ProjectOverview

        widget = ProjectOverview(product_path=self.product_path)
        features = widget._get_key_features()

        self.assertIsInstance(features, list, "Should return list of features")
        self.assertGreater(len(features), 0, "Should extract at least one feature")
        self.assertLessEqual(len(features), 4, "Should return max 4 features")

        # Check specific features (check that first feature is about systematic development)
        self.assertTrue(features[0].startswith("Systematic feature development"),
                       "First feature should be about systematic development")

    def test_get_key_features_max_four(self):
        """Test that only first 4 features are returned."""
        from yoyo_tui.widgets.project_overview import ProjectOverview

        # Add many features to mission-lite.md
        many_features = """# Many Features Project

**Mission**: Test project

## Solution
Structured workflow framework providing:
- Feature 1
- Feature 2
- Feature 3
- Feature 4
- Feature 5
- Feature 6
- Feature 7
"""
        (self.product_path / 'mission-lite.md').write_text(many_features)

        widget = ProjectOverview(product_path=self.product_path)
        features = widget._get_key_features()

        self.assertEqual(len(features), 4,
                        "Should return exactly 4 features")

    def test_get_tech_stack(self):
        """Test tech stack extraction from tech-stack.md."""
        from yoyo_tui.widgets.project_overview import ProjectOverview

        widget = ProjectOverview(product_path=self.product_path)
        tech_stack = widget._get_tech_stack()

        self.assertIsInstance(tech_stack, str, "Should return string")
        self.assertIn("Bash", tech_stack, "Should include Bash")
        self.assertIn("Python", tech_stack, "Should include Python")
        self.assertIn("Textual", tech_stack, "Should include Textual")

    def test_get_tech_stack_excludes_generic_terms(self):
        """Test that generic terms like 'Platform' are excluded."""
        from yoyo_tui.widgets.project_overview import ProjectOverview

        widget = ProjectOverview(product_path=self.product_path)
        tech_stack = widget._get_tech_stack()

        self.assertNotIn("Platform", tech_stack,
                        "Should exclude generic 'Platform' term")
        self.assertNotIn("Status", tech_stack,
                        "Should exclude generic 'Status' term")

    def test_get_tech_stack_max_four(self):
        """Test that only first 4 technologies are returned."""
        from yoyo_tui.widgets.project_overview import ProjectOverview

        widget = ProjectOverview(product_path=self.product_path)
        tech_stack = widget._get_tech_stack()

        tech_list = tech_stack.split(", ")
        self.assertLessEqual(len(tech_list), 4,
                           "Should return max 4 technologies")

    def test_get_current_phase(self):
        """Test current phase extraction from roadmap.md."""
        from yoyo_tui.widgets.project_overview import ProjectOverview

        widget = ProjectOverview(product_path=self.product_path)
        current_phase = widget._get_current_phase()

        self.assertIn("Phase 0", current_phase,
                     "Should extract phase number")
        self.assertIn("Foundation", current_phase,
                     "Should extract phase name")

    def test_generate_overview_text_complete(self):
        """Test that complete overview text is generated correctly."""
        from yoyo_tui.widgets.project_overview import ProjectOverview

        widget = ProjectOverview(product_path=self.product_path)
        overview_text = widget._generate_overview_text()

        # Check all components are present
        self.assertIn("Test Project", overview_text,
                     "Should include project name")
        self.assertIn("Mission:", overview_text,
                     "Should include mission section")
        self.assertIn("Features:", overview_text,
                     "Should include features section")
        self.assertIn("Stack:", overview_text,
                     "Should include tech stack section")
        self.assertIn("Phase:", overview_text,
                     "Should include phase section")

    def test_generate_overview_text_with_rich_markup(self):
        """Test that overview text includes rich markup."""
        from yoyo_tui.widgets.project_overview import ProjectOverview

        widget = ProjectOverview(product_path=self.product_path)
        overview_text = widget._generate_overview_text()

        # Check for rich markup
        self.assertIn("[bold cyan]", overview_text,
                     "Should include bold cyan markup for project name")
        self.assertIn("[yellow]", overview_text,
                     "Should include yellow markup for section headers")
        self.assertIn("[dim]", overview_text,
                     "Should include dim markup for content")

    def test_generate_overview_missing_files(self):
        """Test behavior when product files are missing."""
        from yoyo_tui.widgets.project_overview import ProjectOverview

        # Create empty product directory
        empty_dir = Path(self.temp_dir) / 'empty'
        empty_dir.mkdir()

        widget = ProjectOverview(product_path=empty_dir)
        overview_text = widget._generate_overview_text()

        # Should handle missing files gracefully (project name will be directory name)
        # Just verify overview is generated without errors
        self.assertIsInstance(overview_text, str,
                            "Should return string even with missing files")
        self.assertGreater(len(overview_text), 0,
                          "Should return non-empty overview")

    def test_generate_overview_nonexistent_directory(self):
        """Test behavior when product directory doesn't exist."""
        from yoyo_tui.widgets.project_overview import ProjectOverview

        nonexistent = Path(self.temp_dir) / 'nonexistent'
        widget = ProjectOverview(product_path=nonexistent)
        overview_text = widget._generate_overview_text()

        self.assertIn("No product context found", overview_text,
                     "Should show error message for nonexistent directory")


class TestProjectOverviewTechStackParsing(unittest.TestCase):
    """Test tech stack parsing edge cases."""

    def setUp(self):
        """Create temp directory for tests."""
        self.temp_dir = tempfile.mkdtemp()
        self.product_path = Path(self.temp_dir)

    def tearDown(self):
        """Cleanup temp directory."""
        import shutil
        shutil.rmtree(self.temp_dir, ignore_errors=True)

    def test_tech_stack_with_versions(self):
        """Test that version numbers are removed from tech names."""
        tech_content = """# Tech Stack

## Core Technologies

**Python 3.11+**
- Programming language

**Textual 0.83.0+** (https://example.com)
- TUI framework
"""
        (self.product_path / 'tech-stack.md').write_text(tech_content)

        from yoyo_tui.widgets.project_overview import ProjectOverview
        widget = ProjectOverview(product_path=self.product_path)
        tech_stack = widget._get_tech_stack()

        self.assertIn("Python", tech_stack, "Should include Python")
        self.assertNotIn("3.11", tech_stack, "Should remove version numbers")
        self.assertIn("Textual", tech_stack, "Should include Textual")
        self.assertNotIn("0.83", tech_stack, "Should remove version numbers")

    def test_tech_stack_multiple_sections(self):
        """Test that tech stack is extracted from multiple relevant sections."""
        tech_content = """# Tech Stack

## Core Technologies

**Python**
- Core language

## TUI Dashboard Stack

**Textual**
- UI framework

## Other Section

**Irrelevant**
- Should not be included
"""
        (self.product_path / 'tech-stack.md').write_text(tech_content)

        from yoyo_tui.widgets.project_overview import ProjectOverview
        widget = ProjectOverview(product_path=self.product_path)
        tech_stack = widget._get_tech_stack()

        self.assertIn("Python", tech_stack,
                     "Should include tech from Core Technologies")
        self.assertIn("Textual", tech_stack,
                     "Should include tech from TUI Dashboard Stack")
        self.assertNotIn("Irrelevant", tech_stack,
                        "Should not include tech from other sections")

    def test_tech_stack_empty_file(self):
        """Test behavior with empty tech-stack.md."""
        (self.product_path / 'tech-stack.md').write_text("")

        from yoyo_tui.widgets.project_overview import ProjectOverview
        widget = ProjectOverview(product_path=self.product_path)
        tech_stack = widget._get_tech_stack()

        self.assertEqual(tech_stack, "",
                        "Should return empty string for empty file")

    def test_tech_stack_no_file(self):
        """Test behavior when tech-stack.md doesn't exist."""
        from yoyo_tui.widgets.project_overview import ProjectOverview
        widget = ProjectOverview(product_path=self.product_path)
        tech_stack = widget._get_tech_stack()

        self.assertEqual(tech_stack, "",
                        "Should return empty string when file doesn't exist")


if __name__ == '__main__':
    unittest.main()
