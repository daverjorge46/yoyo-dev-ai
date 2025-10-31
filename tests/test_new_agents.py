"""
Tests for New Specialized Agents

Tests agent registration, YAML frontmatter parsing, and workflow references.
"""

import pytest
from pathlib import Path
import yaml


class TestNewAgents:
    """Test new specialized agent files."""

    @pytest.fixture
    def agents_dir(self):
        """Get the agents directory."""
        return Path(__file__).parent.parent / ".yoyo-dev" / "claude-code" / "agents"

    def _parse_agent_file(self, agent_path: Path):
        """
        Parse agent file and extract frontmatter + content.

        Returns:
            Tuple of (frontmatter_dict, content_str)
        """
        with open(agent_path, 'r', encoding='utf-8') as f:
            content = f.read()

        # Check for YAML frontmatter
        if not content.startswith('---'):
            return None, content

        # Extract frontmatter
        parts = content.split('---', 2)
        if len(parts) < 3:
            return None, content

        frontmatter_str = parts[1]
        body = parts[2].strip()

        # Parse YAML
        frontmatter = yaml.safe_load(frontmatter_str)

        return frontmatter, body

    # ========================================================================
    # Agent File Structure Tests
    # ========================================================================

    def test_spec_initializer_exists(self, agents_dir):
        """Test that spec-initializer.md exists."""
        agent_file = agents_dir / "spec-initializer.md"
        assert agent_file.exists(), "spec-initializer.md should exist"

    def test_spec_shaper_exists(self, agents_dir):
        """Test that spec-shaper.md exists."""
        agent_file = agents_dir / "spec-shaper.md"
        assert agent_file.exists(), "spec-shaper.md should exist"

    def test_spec_writer_exists(self, agents_dir):
        """Test that spec-writer.md exists."""
        agent_file = agents_dir / "spec-writer.md"
        assert agent_file.exists(), "spec-writer.md should exist"

    def test_tasks_list_creator_exists(self, agents_dir):
        """Test that tasks-list-creator.md exists."""
        agent_file = agents_dir / "tasks-list-creator.md"
        assert agent_file.exists(), "tasks-list-creator.md should exist"

    def test_implementer_exists(self, agents_dir):
        """Test that implementer.md exists."""
        agent_file = agents_dir / "implementer.md"
        assert agent_file.exists(), "implementer.md should exist"

    def test_implementation_verifier_exists(self, agents_dir):
        """Test that implementation-verifier.md exists."""
        agent_file = agents_dir / "implementation-verifier.md"
        assert agent_file.exists(), "implementation-verifier.md should exist"

    def test_product_planner_exists(self, agents_dir):
        """Test that product-planner.md exists."""
        agent_file = agents_dir / "product-planner.md"
        assert agent_file.exists(), "product-planner.md should exist"

    # ========================================================================
    # YAML Frontmatter Tests
    # ========================================================================

    @pytest.mark.parametrize("agent_name", [
        "spec-initializer",
        "spec-shaper",
        "spec-writer",
        "tasks-list-creator",
        "implementer",
        "implementation-verifier",
        "product-planner",
    ])
    def test_agent_has_yaml_frontmatter(self, agents_dir, agent_name):
        """Test that agent has YAML frontmatter."""
        agent_file = agents_dir / f"{agent_name}.md"
        frontmatter, _ = self._parse_agent_file(agent_file)

        assert frontmatter is not None, f"{agent_name} should have YAML frontmatter"

    @pytest.mark.parametrize("agent_name,expected_name", [
        ("spec-initializer", "spec-initializer"),
        ("spec-shaper", "spec-shaper"),
        ("spec-writer", "spec-writer"),
        ("tasks-list-creator", "tasks-list-creator"),
        ("implementer", "implementer"),
        ("implementation-verifier", "implementation-verifier"),
        ("product-planner", "product-planner"),
    ])
    def test_agent_name_field(self, agents_dir, agent_name, expected_name):
        """Test that agent has correct name field."""
        agent_file = agents_dir / f"{agent_name}.md"
        frontmatter, _ = self._parse_agent_file(agent_file)

        assert "name" in frontmatter, f"{agent_name} should have 'name' field"
        assert frontmatter["name"] == expected_name

    @pytest.mark.parametrize("agent_name", [
        "spec-initializer",
        "spec-shaper",
        "spec-writer",
        "tasks-list-creator",
        "implementer",
        "implementation-verifier",
        "product-planner",
    ])
    def test_agent_description_field(self, agents_dir, agent_name):
        """Test that agent has description field."""
        agent_file = agents_dir / f"{agent_name}.md"
        frontmatter, _ = self._parse_agent_file(agent_file)

        assert "description" in frontmatter, f"{agent_name} should have 'description' field"
        assert len(frontmatter["description"]) > 10, "Description should be meaningful"

    @pytest.mark.parametrize("agent_name", [
        "spec-initializer",
        "spec-shaper",
        "spec-writer",
        "tasks-list-creator",
        "implementer",
        "implementation-verifier",
        "product-planner",
    ])
    def test_agent_tools_field(self, agents_dir, agent_name):
        """Test that agent has tools field."""
        agent_file = agents_dir / f"{agent_name}.md"
        frontmatter, _ = self._parse_agent_file(agent_file)

        assert "tools" in frontmatter, f"{agent_name} should have 'tools' field"
        assert isinstance(frontmatter["tools"], list), "Tools should be a list"
        assert len(frontmatter["tools"]) > 0, "Tools list should not be empty"

    @pytest.mark.parametrize("agent_name,expected_model", [
        ("spec-initializer", "haiku"),
        ("spec-shaper", "sonnet"),
        ("spec-writer", "sonnet"),
        ("tasks-list-creator", "sonnet"),
        ("implementer", "sonnet"),
        ("implementation-verifier", "sonnet"),
        ("product-planner", "sonnet"),
    ])
    def test_agent_model_field(self, agents_dir, agent_name, expected_model):
        """Test that agent has correct model field."""
        agent_file = agents_dir / f"{agent_name}.md"
        frontmatter, _ = self._parse_agent_file(agent_file)

        assert "model" in frontmatter, f"{agent_name} should have 'model' field"
        assert frontmatter["model"] == expected_model

    # ========================================================================
    # Content Structure Tests
    # ========================================================================

    @pytest.mark.parametrize("agent_name", [
        "spec-shaper",
        "spec-writer",
        "tasks-list-creator",
        "implementer",
        "implementation-verifier",
        "product-planner",
    ])
    def test_agent_has_workflow_references(self, agents_dir, agent_name):
        """Test that agent content includes workflow references."""
        agent_file = agents_dir / f"{agent_name}.md"
        _, content = self._parse_agent_file(agent_file)

        # Check for workflow reference pattern
        assert "{{workflows/" in content, f"{agent_name} should have workflow references"
        assert "}}" in content, "Workflow reference should be closed"

    @pytest.mark.parametrize("agent_name", [
        "spec-initializer",
        "spec-shaper",
        "spec-writer",
        "tasks-list-creator",
        "implementer",
        "implementation-verifier",
        "product-planner",
    ])
    def test_agent_has_when_to_use_section(self, agents_dir, agent_name):
        """Test that agent has 'When to use' section."""
        agent_file = agents_dir / f"{agent_name}.md"
        _, content = self._parse_agent_file(agent_file)

        # Check for "When to use" section
        assert "when to use" in content.lower() or "use this agent" in content.lower(), \
            f"{agent_name} should have 'When to use' section"

    # ========================================================================
    # Config Registration Tests
    # ========================================================================

    def test_config_has_agents_section(self):
        """Test that config.yml has agents section."""
        config_path = Path(__file__).parent.parent / ".yoyo-dev" / "config.yml"

        with open(config_path, 'r', encoding='utf-8') as f:
            config = yaml.safe_load(f)

        assert "agents" in config, "config.yml should have 'agents' section"

    @pytest.mark.parametrize("agent_name", [
        "spec_initializer",
        "spec_shaper",
        "spec_writer",
        "tasks_list_creator",
        "implementer",
        "implementation_verifier",
        "product_planner",
    ])
    def test_agent_registered_in_config(self, agent_name):
        """Test that agent is registered in config.yml."""
        config_path = Path(__file__).parent.parent / ".yoyo-dev" / "config.yml"

        with open(config_path, 'r', encoding='utf-8') as f:
            config = yaml.safe_load(f)

        assert "specialized_agents" in config, "config.yml should have 'specialized_agents' section"
        assert agent_name in config["specialized_agents"], f"{agent_name} should be in config.yml specialized_agents section"
        assert config["specialized_agents"][agent_name] is True, f"{agent_name} should be enabled"
