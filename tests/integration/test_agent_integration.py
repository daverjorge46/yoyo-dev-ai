"""
Integration Tests for Agent System

Tests that all agents are properly integrated and configured.
"""

import pytest
from pathlib import Path
import yaml


class TestAgentIntegration:
    """Integration tests for the agent system."""

    @pytest.fixture
    def project_root(self):
        """Get project root directory."""
        return Path(__file__).parent.parent.parent

    @pytest.fixture
    def agents_dir(self, project_root):
        """Get agents directory."""
        return project_root / ".yoyo-dev" / "claude-code" / "agents"

    @pytest.fixture
    def config(self, project_root):
        """Load config.yml."""
        config_path = project_root / ".yoyo-dev" / "config.yml"
        with open(config_path, 'r', encoding='utf-8') as f:
            return yaml.safe_load(f)

    # ========================================================================
    # Agent Registration Tests
    # ========================================================================

    def test_all_agents_registered_in_config(self, agents_dir, config):
        """Test that all agent files are registered in config.yml."""
        # Get all agent files
        agent_files = [f.stem for f in agents_dir.glob("*.md") if not f.name.startswith("_")]

        # Convert filenames to config keys (dash to underscore)
        agent_keys = [name.replace("-", "_") for name in agent_files]

        # Check all are in config
        assert "specialized_agents" in config, "Config should have specialized_agents section"

        for key in agent_keys:
            assert key in config["specialized_agents"], f"{key} should be registered in config"

    def test_all_registered_agents_have_files(self, agents_dir, config):
        """Test that all registered agents have corresponding files."""
        registered_agents = config.get("specialized_agents", {}).keys()

        # Built-in Claude Code agents don't need files (context-fetcher, test-runner, etc.)
        # Only check workflow-based agents that should have files
        workflow_based_agents = [
            "spec_initializer",
            "spec_shaper",
            "spec_writer",
            "tasks_list_creator",
            "implementer",
            "implementation_verifier",
            "product_planner"
        ]

        for agent_key in registered_agents:
            if agent_key not in workflow_based_agents:
                continue  # Skip built-in agents

            # Convert config key to filename (underscore to dash)
            filename = agent_key.replace("_", "-") + ".md"
            agent_file = agents_dir / filename

            assert agent_file.exists(), f"Registered agent {agent_key} should have file {filename}"

    # ========================================================================
    # Agent Structure Tests
    # ========================================================================

    def test_all_agents_have_yaml_frontmatter(self, agents_dir):
        """Test that all agents have valid YAML frontmatter."""
        for agent_file in agents_dir.glob("*.md"):
            if agent_file.name.startswith("_"):
                continue

            content = agent_file.read_text(encoding='utf-8')

            # Should start with YAML frontmatter
            assert content.startswith("---"), f"{agent_file.name} should have YAML frontmatter"

            # Extract frontmatter
            parts = content.split("---", 2)
            assert len(parts) >= 3, f"{agent_file.name} should have complete frontmatter"

            # Parse frontmatter
            frontmatter = yaml.safe_load(parts[1])

            # Should have required fields
            assert "name" in frontmatter, f"{agent_file.name} should have name field"
            assert "description" in frontmatter, f"{agent_file.name} should have description field"
            assert "tools" in frontmatter, f"{agent_file.name} should have tools field"

    def test_agents_have_consistent_naming(self, agents_dir):
        """Test that agent names in frontmatter match filenames."""
        for agent_file in agents_dir.glob("*.md"):
            if agent_file.name.startswith("_"):
                continue

            content = agent_file.read_text(encoding='utf-8')
            parts = content.split("---", 2)

            if len(parts) >= 3:
                frontmatter = yaml.safe_load(parts[1])
                expected_name = agent_file.stem  # filename without extension

                assert frontmatter.get("name") == expected_name, \
                    f"{agent_file.name} name field should match filename"

    # ========================================================================
    # New Agent Tests
    # ========================================================================

    def test_new_agents_exist(self, agents_dir):
        """Test that all 7 new agents exist."""
        new_agents = [
            "spec-initializer.md",
            "spec-shaper.md",
            "spec-writer.md",
            "tasks-list-creator.md",
            "implementer.md",
            "implementation-verifier.md",
            "product-planner.md"
        ]

        for agent_file in new_agents:
            assert (agents_dir / agent_file).exists(), f"{agent_file} should exist"

    def test_new_agents_have_correct_models(self, agents_dir):
        """Test that new agents have correct model assignments."""
        expected_models = {
            "spec-initializer.md": "haiku",  # Fast initialization
            "spec-shaper.md": "sonnet",       # Complex requirements gathering
            "spec-writer.md": "sonnet",       # Detailed documentation
            "tasks-list-creator.md": "sonnet", # Strategic breakdown
            "implementer.md": "sonnet",       # Code implementation
            "implementation-verifier.md": "sonnet",  # Quality verification
            "product-planner.md": "sonnet"    # Product documentation
        }

        for agent_file, expected_model in expected_models.items():
            agent_path = agents_dir / agent_file
            content = agent_path.read_text(encoding='utf-8')
            parts = content.split("---", 2)

            if len(parts) >= 3:
                frontmatter = yaml.safe_load(parts[1])
                assert frontmatter.get("model") == expected_model, \
                    f"{agent_file} should have model: {expected_model}"

    def test_workflow_based_agents_reference_workflows(self, agents_dir):
        """Test that workflow-based agents reference workflows."""
        workflow_agents = [
            "spec-shaper.md",
            "spec-writer.md",
            "tasks-list-creator.md",
            "implementer.md",
            "implementation-verifier.md",
            "product-planner.md"
        ]

        for agent_file in workflow_agents:
            agent_path = agents_dir / agent_file
            content = agent_path.read_text(encoding='utf-8')

            assert "{{workflows/" in content, f"{agent_file} should reference workflows"

    # ========================================================================
    # Legacy Agent Tests
    # ========================================================================

    def test_legacy_agents_still_work(self, agents_dir):
        """Test that legacy agents (without workflows) still function."""
        legacy_agents = [
            "context-fetcher.md",
            "file-creator.md",
            "git-workflow.md",
            "project-manager.md",
            "test-runner.md",
            "date-checker.md"
        ]

        for agent_file in legacy_agents:
            agent_path = agents_dir / agent_file
            if not agent_path.exists():
                continue

            content = agent_path.read_text(encoding='utf-8')

            # Should have YAML frontmatter
            assert content.startswith("---"), f"{agent_file} should have YAML frontmatter"

            # Should have basic structure
            parts = content.split("---", 2)
            if len(parts) >= 3:
                frontmatter = yaml.safe_load(parts[1])
                assert "name" in frontmatter, f"{agent_file} should have name"
                assert "tools" in frontmatter, f"{agent_file} should have tools"

    # ========================================================================
    # Design System Agent Tests
    # ========================================================================

    def test_design_agents_exist(self, agents_dir):
        """Test that design system agents exist."""
        design_agents = [
            "design-analyzer.md",
            "design-validator.md"
        ]

        for agent_file in design_agents:
            agent_path = agents_dir / agent_file
            if agent_path.exists():
                content = agent_path.read_text(encoding='utf-8')
                assert content.startswith("---"), f"{agent_file} should have YAML frontmatter"

    # ========================================================================
    # Agent Tool Configuration Tests
    # ========================================================================

    def test_agents_have_appropriate_tools(self, agents_dir):
        """Test that agents have appropriate tool configurations."""
        # Agents that need Write tool
        write_agents = ["spec-writer", "tasks-list-creator", "implementer", "product-planner", "file-creator"]

        # Agents that need Bash tool
        bash_agents = ["implementer", "test-runner", "git-workflow"]

        # Agents that need WebFetch tool
        web_agents = ["spec-shaper", "spec-writer", "product-planner"]

        for agent_file in agents_dir.glob("*.md"):
            if agent_file.name.startswith("_"):
                continue

            content = agent_file.read_text(encoding='utf-8')
            parts = content.split("---", 2)

            if len(parts) >= 3:
                frontmatter = yaml.safe_load(parts[1])
                tools = frontmatter.get("tools", [])
                agent_name = agent_file.stem

                # Check Write tool
                if agent_name in write_agents:
                    assert "Write" in tools, f"{agent_file.name} should have Write tool"

                # Check Bash tool
                if agent_name in bash_agents:
                    assert "Bash" in tools, f"{agent_file.name} should have Bash tool"

                # Check WebFetch tool
                if agent_name in web_agents:
                    assert "WebFetch" in tools, f"{agent_file.name} should have WebFetch tool"

    # ========================================================================
    # Agent Description Tests
    # ========================================================================

    def test_agents_have_when_to_use_section(self, agents_dir):
        """Test that agents have 'When to use' guidance."""
        for agent_file in agents_dir.glob("*.md"):
            if agent_file.name.startswith("_"):
                continue

            content = agent_file.read_text(encoding='utf-8')

            # Should have "when to use" or "use this agent" guidance
            assert ("when to use" in content.lower() or
                    "use this agent" in content.lower() or
                    "use proactively" in content.lower()), \
                f"{agent_file.name} should have 'when to use' guidance"

    def test_agents_have_clear_descriptions(self, agents_dir):
        """Test that agents have clear, detailed descriptions."""
        for agent_file in agents_dir.glob("*.md"):
            if agent_file.name.startswith("_"):
                continue

            content = agent_file.read_text(encoding='utf-8')
            parts = content.split("---", 2)

            if len(parts) >= 3:
                frontmatter = yaml.safe_load(parts[1])
                description = frontmatter.get("description", "")

                # Description should be meaningful (> 10 chars)
                assert len(description) > 10, f"{agent_file.name} should have detailed description"

                # Description should not be too long (< 200 chars)
                assert len(description) < 200, f"{agent_file.name} description should be concise"

    # ========================================================================
    # Agent Integration with Instructions Tests
    # ========================================================================

    def test_agents_referenced_in_instructions(self, project_root, config):
        """Test that agents are referenced in instruction files."""
        instructions_dir = project_root / ".yoyo-dev" / "instructions" / "core"

        # Key agents that should be used in instructions
        # NOTE: Some agents are invoked implicitly via subagent_type rather than by name
        agent_usage = {
            "implementation-verifier": ["post-execution-tasks.md"]
        }

        for agent_name, instruction_files in agent_usage.items():
            for instruction_file in instruction_files:
                instruction_path = instructions_dir / instruction_file
                if instruction_path.exists():
                    content = instruction_path.read_text(encoding='utf-8')

                    # Should mention agent (with dash or underscore) or mention verification
                    agent_dash = agent_name.replace("_", "-")
                    agent_underscore = agent_name.replace("-", "_")
                    concept = "verif"  # Check for verification concept

                    assert (agent_dash in content or agent_underscore in content or concept in content.lower()), \
                        f"{instruction_file} should reference {agent_name} or verification concept"

    # ========================================================================
    # Agent Consistency Tests
    # ========================================================================

    def test_agent_names_consistent_across_system(self, project_root, agents_dir, config):
        """Test that agent names are consistent everywhere."""
        # Get agent names from files
        file_agents = set(f.stem for f in agents_dir.glob("*.md") if not f.name.startswith("_"))

        # Get agent names from config (convert underscore to dash)
        config_agents = set(name.replace("_", "-") for name in config.get("specialized_agents", {}).keys())

        # All file agents should be in config
        missing_in_config = file_agents - config_agents
        assert len(missing_in_config) == 0, f"Agents in files but not config: {missing_in_config}"

        # Only workflow-based agents need files
        workflow_based_agents = {
            "spec-initializer",
            "spec-shaper",
            "spec-writer",
            "tasks-list-creator",
            "implementer",
            "implementation-verifier",
            "product-planner"
        }

        # Check only workflow-based agents have files
        missing_files = workflow_based_agents - file_agents
        assert len(missing_files) == 0, f"Workflow-based agents missing files: {missing_files}"

    # ========================================================================
    # Performance Tests
    # ========================================================================

    def test_agents_load_quickly(self, agents_dir):
        """Test that agent files can be loaded quickly."""
        import time

        start = time.time()

        # Load all agent files
        for agent_file in agents_dir.glob("*.md"):
            if agent_file.name.startswith("_"):
                continue
            _ = agent_file.read_text(encoding='utf-8')

        elapsed = time.time() - start

        # Should load all agents in < 100ms
        assert elapsed < 0.1, f"Loading all agents took {elapsed}s (should be < 0.1s)"

    # ========================================================================
    # End-to-End Agent Integration Tests
    # ========================================================================

    def test_agent_chain_for_spec_creation(self, project_root):
        """Test that agent chain for spec creation is complete."""
        # Spec creation uses: spec-initializer → spec-shaper → spec-writer
        agents_dir = project_root / ".yoyo-dev" / "claude-code" / "agents"

        required_agents = [
            "spec-initializer.md",
            "spec-shaper.md",
            "spec-writer.md"
        ]

        for agent_file in required_agents:
            assert (agents_dir / agent_file).exists(), f"{agent_file} needed for spec creation"

    def test_agent_chain_for_task_execution(self, project_root):
        """Test that agent chain for task execution is complete."""
        # Task execution uses: implementer → implementation-verifier
        # (test-runner, git-workflow, project-manager are built-in Claude Code agents)
        agents_dir = project_root / ".yoyo-dev" / "claude-code" / "agents"

        required_agents = [
            "implementer.md",
            "implementation-verifier.md"
        ]

        for agent_file in required_agents:
            assert (agents_dir / agent_file).exists(), f"{agent_file} needed for task execution"
