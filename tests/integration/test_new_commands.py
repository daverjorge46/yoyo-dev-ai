"""
Integration Tests for New Commands

Tests /orchestrate-tasks and /improve-skills commands integration.
"""

import pytest
from pathlib import Path


class TestNewCommandsIntegration:
    """Integration tests for new commands."""

    @pytest.fixture
    def project_root(self):
        """Get project root directory."""
        return Path(__file__).parent.parent.parent

    @pytest.fixture
    def commands_dir(self, project_root):
        """Get commands directory."""
        return project_root / ".claude" / "commands"

    @pytest.fixture
    def instructions_dir(self, project_root):
        """Get instructions directory."""
        return project_root / ".yoyo-dev" / "instructions" / "core"

    # ========================================================================
    # /orchestrate-tasks Command Tests
    # ========================================================================

    def test_orchestrate_tasks_command_exists(self, commands_dir):
        """Test that /orchestrate-tasks command file exists."""
        command_file = commands_dir / "orchestrate-tasks.md"
        assert command_file.exists(), "orchestrate-tasks.md should exist in .claude/commands/"

    def test_orchestrate_tasks_references_instruction(self, commands_dir):
        """Test that command references instruction file."""
        command_file = commands_dir / "orchestrate-tasks.md"
        content = command_file.read_text(encoding='utf-8')

        assert ("@instructions/core/orchestrate-tasks.md" in content or
                "@.yoyo-dev/instructions/core/orchestrate-tasks.md" in content), \
            "Command should reference instruction file"

    def test_orchestrate_tasks_instruction_exists(self, instructions_dir):
        """Test that orchestrate-tasks instruction file exists."""
        instruction_file = instructions_dir / "orchestrate-tasks.md"
        assert instruction_file.exists(), "orchestrate-tasks.md should exist in instructions/core/"

    def test_orchestrate_tasks_has_xml_structure(self, instructions_dir):
        """Test that instruction has XML process flow."""
        instruction_file = instructions_dir / "orchestrate-tasks.md"
        content = instruction_file.read_text(encoding='utf-8')

        assert "<process_flow>" in content, "Should have <process_flow> tag"
        assert "<step" in content, "Should have <step> tags"
        assert "</process_flow>" in content, "Should close <process_flow>"

    def test_orchestrate_tasks_has_all_steps(self, instructions_dir):
        """Test that orchestration has all required steps."""
        instruction_file = instructions_dir / "orchestrate-tasks.md"
        content = instruction_file.read_text(encoding='utf-8')

        required_steps = [
            "task_selection",
            "agent_assignment",
            "standards_assignment",
            "orchestration",
            "execution"
        ]

        for step in required_steps:
            assert (f'name="{step}"' in content or step in content.lower().replace("-", "_")), \
                f"Should have {step} step"

    def test_orchestrate_tasks_documented_in_claude_md(self, project_root):
        """Test that /orchestrate-tasks is documented in CLAUDE.md."""
        claude_md = project_root / "CLAUDE.md"
        content = claude_md.read_text(encoding='utf-8')

        assert "/orchestrate-tasks" in content, "CLAUDE.md should document /orchestrate-tasks"
        assert "Advanced Orchestration" in content, "CLAUDE.md should have Advanced Orchestration section"

    # ========================================================================
    # /improve-skills Command Tests
    # ========================================================================

    def test_improve_skills_command_exists(self, commands_dir):
        """Test that /improve-skills command file exists."""
        command_file = commands_dir / "improve-skills.md"
        assert command_file.exists(), "improve-skills.md should exist in .claude/commands/"

    def test_improve_skills_references_instruction(self, commands_dir):
        """Test that command references instruction file."""
        command_file = commands_dir / "improve-skills.md"
        content = command_file.read_text(encoding='utf-8')

        assert ("@instructions/core/improve-skills.md" in content or
                "@.yoyo-dev/instructions/core/improve-skills.md" in content), \
            "Command should reference instruction file"

    def test_improve_skills_instruction_exists(self, instructions_dir):
        """Test that improve-skills instruction file exists."""
        instruction_file = instructions_dir / "improve-skills.md"
        assert instruction_file.exists(), "improve-skills.md should exist in instructions/core/"

    def test_improve_skills_has_xml_structure(self, instructions_dir):
        """Test that instruction has XML process flow."""
        instruction_file = instructions_dir / "improve-skills.md"
        content = instruction_file.read_text(encoding='utf-8')

        assert "<process_flow>" in content, "Should have <process_flow> tag"
        assert "<step" in content, "Should have <step> tags"
        assert "</process_flow>" in content, "Should close <process_flow>"

    def test_improve_skills_has_required_steps(self, instructions_dir):
        """Test that skills optimization has required steps."""
        instruction_file = instructions_dir / "improve-skills.md"
        content = instruction_file.read_text(encoding='utf-8')

        required_keywords = [
            "scan",
            "analyze",
            "optimize",
            "when to use",
            "review",
            "apply"
        ]

        for keyword in required_keywords:
            assert keyword in content.lower(), f"Should mention {keyword}"

    def test_improve_skills_documented_in_claude_md(self, project_root):
        """Test that /improve-skills is documented in CLAUDE.md."""
        claude_md = project_root / "CLAUDE.md"
        content = claude_md.read_text(encoding='utf-8')

        assert "/improve-skills" in content, "CLAUDE.md should document /improve-skills"

    # ========================================================================
    # Command Integration Tests
    # ========================================================================

    def test_all_commands_have_matching_instructions(self, commands_dir, instructions_dir):
        """Test that all command files have matching instruction files."""
        for command_file in commands_dir.glob("*.md"):
            # Skip non-command files
            if command_file.name.startswith("_"):
                continue

            # Read command content
            content = command_file.read_text(encoding='utf-8')

            # Command should either:
            # 1. Reference an instruction file (with @ syntax or direct path mention)
            # 2. Contain inline instructions (some commands are self-contained)
            has_instruction_ref = (
                "@instructions/" in content or
                "@.yoyo-dev/instructions/" in content or
                ".yoyo-dev/instructions/" in content
            )
            has_inline_instructions = "<instructions>" in content or "##" in content

            assert has_instruction_ref or has_inline_instructions, \
                f"{command_file.name} should reference instruction file or have inline instructions"

    def test_commands_documented_in_help(self, project_root):
        """Test that new commands appear in help documentation."""
        claude_md = project_root / "CLAUDE.md"
        content = claude_md.read_text(encoding='utf-8')

        # Check Core Commands section includes new commands
        assert "orchestrate-tasks" in content.lower(), "Help should document orchestrate-tasks"
        assert "improve-skills" in content.lower(), "Help should document improve-skills"

    def test_commands_have_clear_usage_examples(self, project_root):
        """Test that CLAUDE.md has usage examples for new commands."""
        claude_md = project_root / "CLAUDE.md"
        content = claude_md.read_text(encoding='utf-8')

        # Should have orchestration example
        assert "orchestration" in content.lower(), "Should have orchestration examples"

        # Should explain when to use each command
        assert "when to use" in content.lower(), "Should explain when to use commands"

    # ========================================================================
    # Regression Tests for Existing Commands
    # ========================================================================

    def test_existing_commands_still_work(self, commands_dir):
        """Test that existing commands are not broken."""
        essential_commands = [
            "plan-product.md",
            "create-new.md",
            "create-spec.md",
            "create-tasks.md",
            "execute-tasks.md",
            "create-fix.md"
        ]

        for command in essential_commands:
            command_file = commands_dir / command
            assert command_file.exists(), f"{command} should still exist"

            content = command_file.read_text(encoding='utf-8')

            # Should have instruction reference
            assert "@instructions/" in content or "@.yoyo-dev/instructions/" in content, \
                f"{command} should reference instructions"

    def test_execute_tasks_has_implementation_reports_flag(self, instructions_dir):
        """Test that execute-tasks instruction mentions implementation reports."""
        execute_tasks = instructions_dir / "execute-tasks.md"
        content = execute_tasks.read_text(encoding='utf-8')

        assert "--implementation-reports" in content, "execute-tasks should document --implementation-reports flag"
        assert "implementation/" in content, "execute-tasks should mention implementation/ folder"

    # ========================================================================
    # Config Integration Tests
    # ========================================================================

    def test_config_has_skills_settings(self, project_root):
        """Test that config.yml has skills optimization settings."""
        import yaml

        config_path = project_root / ".yoyo-dev" / "config.yml"
        with open(config_path, 'r', encoding='utf-8') as f:
            config = yaml.safe_load(f)

        assert "skills" in config, "Config should have skills section"
        assert "auto_improve" in config["skills"], "Skills should have auto_improve setting"
        assert "optimization_report" in config["skills"], "Skills should have optimization_report setting"

    def test_config_has_implementation_reports_setting(self, project_root):
        """Test that config.yml has implementation reports setting."""
        import yaml

        config_path = project_root / ".yoyo-dev" / "config.yml"
        with open(config_path, 'r', encoding='utf-8') as f:
            config = yaml.safe_load(f)

        assert "workflows" in config, "Config should have workflows section"
        assert "task_execution" in config["workflows"], "Workflows should have task_execution"
        assert "implementation_reports" in config["workflows"]["task_execution"], \
            "task_execution should have implementation_reports setting"

    # ========================================================================
    # End-to-End Command Flow Tests
    # ========================================================================

    def test_orchestrate_tasks_to_execute_flow(self, project_root):
        """Test that /orchestrate-tasks workflow integrates with execution."""
        # orchestrate-tasks should generate orchestration.yml
        # execute-tasks should be able to read orchestration.yml
        instruction_file = project_root / ".yoyo-dev" / "instructions" / "core" / "orchestrate-tasks.md"
        content = instruction_file.read_text(encoding='utf-8')

        # Should mention orchestration.yml creation
        assert "orchestration.yml" in content.lower(), "Should create orchestration.yml"

        # Should mention execution
        assert "execution" in content.lower(), "Should describe execution"

    def test_improve_skills_complete_workflow(self, project_root):
        """Test that /improve-skills has complete workflow."""
        instruction_file = project_root / ".yoyo-dev" / "instructions" / "core" / "improve-skills.md"
        content = instruction_file.read_text(encoding='utf-8')

        workflow_steps = [
            "scan",          # Scan .claude/skills/
            "analyze",       # Analyze descriptions
            "optimize",      # Rewrite/optimize
            "review",        # User review
            "apply"          # Apply changes
        ]

        for step in workflow_steps:
            assert step in content.lower(), f"Workflow should include {step} step"

    # ========================================================================
    # Documentation Completeness Tests
    # ========================================================================

    def test_claude_md_has_when_to_use_guidance(self, project_root):
        """Test that CLAUDE.md has clear guidance on when to use each command."""
        claude_md = project_root / "CLAUDE.md"
        content = claude_md.read_text(encoding='utf-8')

        # Check for decision guidance between execute-tasks and orchestrate-tasks
        # The guidance exists but may be phrased differently
        has_execute_guidance = (
            "when to use" in content.lower() and "execute" in content.lower()
        ) or (
            "use `/execute-tasks`" in content.lower()
        ) or (
            "/execute-tasks" in content and ("default" in content.lower() or "standard" in content.lower())
        )

        has_orchestrate_guidance = (
            "when to use" in content.lower() and "orchestrate" in content.lower()
        ) or (
            "use `/orchestrate-tasks`" in content.lower()
        ) or (
            "/orchestrate-tasks" in content and ("advanced" in content.lower() or "complex" in content.lower())
        )

        assert has_execute_guidance, "Should explain when to use /execute-tasks"
        assert has_orchestrate_guidance, "Should explain when to use /orchestrate-tasks"

    def test_claude_md_has_workflow_examples(self, project_root):
        """Test that CLAUDE.md has workflow composition examples."""
        claude_md = project_root / "CLAUDE.md"
        content = claude_md.read_text(encoding='utf-8')

        # Should have examples
        assert "example" in content.lower(), "Should have examples"
        assert "```" in content, "Should have code blocks with examples"
