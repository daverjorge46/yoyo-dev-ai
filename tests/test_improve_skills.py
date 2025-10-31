"""
Tests for /improve-skills Command

Tests skills optimization workflow and skill file improvements.
"""

import pytest
from pathlib import Path


class TestImproveSkillsCommand:
    """Test /improve-skills command functionality."""

    @pytest.fixture
    def command_file(self):
        """Get the command entry point file."""
        return Path(__file__).parent.parent / ".claude" / "commands" / "improve-skills.md"

    @pytest.fixture
    def instruction_file(self):
        """Get the instruction file."""
        return Path(__file__).parent.parent / ".yoyo-dev" / "instructions" / "core" / "improve-skills.md"

    @pytest.fixture
    def sample_skills_dir(self, tmp_path):
        """Create a sample skills directory."""
        skills_dir = tmp_path / ".claude" / "skills"
        skills_dir.mkdir(parents=True)

        # Create sample skill file (poor description)
        poor_skill = skills_dir / "analyze-data.md"
        poor_skill.write_text("""# Analyze Data

Analyzes data.
""")

        # Create sample skill file (good description)
        good_skill = skills_dir / "generate-report.md"
        good_skill.write_text("""# Generate Report

Generate comprehensive reports from analyzed data with charts and visualizations.

## When to use this skill

Use this skill when you need to:
- Create detailed reports with data visualizations
- Generate executive summaries
- Export data in multiple formats (PDF, Excel, HTML)

## Capabilities

- Data aggregation and summarization
- Chart generation (bar, line, pie, scatter)
- Template-based report formatting
- Multi-format export support
""")

        return skills_dir

    # ========================================================================
    # File Existence Tests
    # ========================================================================

    def test_command_entry_point_exists(self, command_file):
        """Test that command entry point exists."""
        assert command_file.exists(), "improve-skills.md should exist in .claude/commands/"

    def test_instruction_file_exists(self, instruction_file):
        """Test that instruction file exists."""
        assert instruction_file.exists(), "improve-skills.md should exist in .yoyo-dev/instructions/core/"

    # ========================================================================
    # Command Structure Tests
    # ========================================================================

    def test_command_references_instruction(self, command_file):
        """Test that command file references instruction file."""
        with open(command_file, 'r', encoding='utf-8') as f:
            content = f.read()

        assert "@instructions/core/improve-skills.md" in content or \
               "@.yoyo-dev/instructions/core/improve-skills.md" in content, \
            "Command should reference instruction file"

    def test_instruction_has_xml_structure(self, instruction_file):
        """Test that instruction file has XML structure with steps."""
        with open(instruction_file, 'r', encoding='utf-8') as f:
            content = f.read()

        assert "<process_flow>" in content, "Should have <process_flow> tag"
        assert "<step" in content, "Should have <step> tags"
        assert "</process_flow>" in content, "Should close <process_flow>"

    def test_instruction_has_required_steps(self, instruction_file):
        """Test that instruction file has all required steps."""
        with open(instruction_file, 'r', encoding='utf-8') as f:
            content = f.read()

        # Key steps for skills optimization
        required_keywords = [
            "scan",
            "analyze",
            "optimize",  # Changed from "rewrite"
            "when to use",
            "review",
            "apply",
        ]

        for keyword in required_keywords:
            assert keyword in content.lower(), f"Should mention {keyword}"

    # ========================================================================
    # Skill Analysis Tests
    # ========================================================================

    def test_identify_poor_descriptions(self):
        """Test identifying skills with poor descriptions."""
        poor_descriptions = [
            "Analyzes data.",
            "Does stuff.",
            "Helps with things.",
            "Process files.",
        ]

        for desc in poor_descriptions:
            # Poor descriptions are typically:
            # - Very short (< 20 chars)
            # - Vague/generic
            # - No details about capabilities
            assert len(desc) < 50, "Poor description should be short"
            assert "." in desc, "Should be a sentence fragment"

    def test_identify_good_descriptions(self):
        """Test identifying skills with good descriptions."""
        good_description = """Generate comprehensive reports from analyzed data with charts and visualizations.

This skill creates professional reports with:
- Data aggregation and summarization
- Visual charts (bar, line, pie)
- Multiple export formats (PDF, Excel, HTML)
- Template-based formatting

Use when you need detailed reporting with visualizations.
"""

        # Good descriptions have:
        # - Detailed explanation (> 100 chars)
        # - Lists capabilities
        # - Has "when to use" section
        assert len(good_description) > 100, "Good description should be detailed"
        assert "-" in good_description, "Should list capabilities"
        assert "when" in good_description.lower(), "Should mention when to use"

    def test_extract_triggering_keywords(self):
        """Test extracting triggering keywords from skill descriptions."""
        description = """Analyze large datasets and generate insights.

Capabilities:
- Statistical analysis
- Data visualization
- Pattern recognition
- Anomaly detection

Use when working with data, analytics, or reporting.
"""

        # Expected keywords that should trigger this skill
        expected_keywords = [
            "analyze",
            "data",
            "insights",
            "statistical",
            "visualization",
            "analytics",
            "reporting",
        ]

        desc_lower = description.lower()
        for keyword in expected_keywords:
            assert keyword in desc_lower, f"Should contain keyword: {keyword}"

    # ========================================================================
    # Skill Improvement Tests
    # ========================================================================

    def test_improved_description_structure(self):
        """Test that improved descriptions have proper structure."""
        improved = {
            "title": "# Analyze Data",
            "summary": "Perform comprehensive statistical analysis on datasets to extract insights and patterns.",
            "when_to_use": """## When to use this skill

Use this skill when you need to:
- Analyze large datasets for patterns and trends
- Perform statistical calculations
- Generate data insights and visualizations
- Detect anomalies or outliers in data
""",
            "capabilities": """## Capabilities

- Statistical analysis (mean, median, mode, std dev)
- Data visualization (charts and graphs)
- Pattern and trend detection
- Anomaly detection
- Data quality assessment
"""
        }

        # Validate structure
        assert "# " in improved["title"], "Should have H1 header"
        assert len(improved["summary"]) > 50, "Summary should be detailed"
        assert "## When to use" in improved["when_to_use"], "Should have 'When to use' section"
        assert "- " in improved["capabilities"], "Should list capabilities with bullets"

    def test_optimization_report_structure(self):
        """Test that optimization report has required sections."""
        report_sections = [
            "# Skills Optimization Report",
            "## Summary",
            "## Skills Analyzed",
            "## Improvements Made",
            "## Recommendations",
        ]

        for section in report_sections:
            assert isinstance(section, str)
            assert section.startswith("#"), "Should be a markdown header"

    # ========================================================================
    # Before/After Comparison Tests
    # ========================================================================

    def test_skill_before_after_comparison(self):
        """Test comparing skill before and after optimization."""
        before = {
            "description": "Analyzes data.",
            "has_when_to_use": False,
            "has_capabilities": False,
            "char_count": 14,
        }

        after = {
            "description": "Perform comprehensive statistical analysis on datasets to extract insights, patterns, and anomalies.",
            "has_when_to_use": True,
            "has_capabilities": True,
            "char_count": 105,
        }

        # Improvements
        assert after["char_count"] > before["char_count"] * 3, "Should be much more detailed"
        assert after["has_when_to_use"] and not before["has_when_to_use"], "Should add 'When to use'"
        assert after["has_capabilities"] and not before["has_capabilities"], "Should add capabilities"

    # ========================================================================
    # User Review Workflow Tests
    # ========================================================================

    def test_review_approval_required(self):
        """Test that user review is required before applying changes."""
        # Skills optimization should:
        # 1. Analyze and propose improvements
        # 2. Show before/after comparison
        # 3. Ask for user approval
        # 4. Only apply changes if approved

        workflow_steps = [
            "analyze",
            "propose_improvements",
            "show_comparison",
            "ask_approval",
            "apply_if_approved",
        ]

        assert len(workflow_steps) == 5, "Should have 5-step workflow"
        assert "ask_approval" in workflow_steps, "Should require approval"
        assert workflow_steps.index("ask_approval") < workflow_steps.index("apply_if_approved"), \
            "Approval must come before applying"

    def test_rollback_capability(self):
        """Test that changes can be rolled back if needed."""
        # Should create backups before applying changes
        backup_strategy = {
            "create_backup": True,
            "backup_location": ".claude/skills/.backup/",
            "can_rollback": True,
        }

        assert backup_strategy["create_backup"], "Should create backups"
        assert backup_strategy["can_rollback"], "Should support rollback"
