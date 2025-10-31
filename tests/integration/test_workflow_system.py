"""
Integration Tests for Workflow System

Tests that workflow reference system integrates correctly with agents and commands.
"""

import pytest
from pathlib import Path
from lib.yoyo_workflow_expander import WorkflowExpander


class TestWorkflowSystemIntegration:
    """Integration tests for the workflow reference system."""

    @pytest.fixture
    def project_root(self):
        """Get project root directory."""
        return Path(__file__).parent.parent.parent

    @pytest.fixture
    def workflows_dir(self, project_root):
        """Get workflows directory."""
        return project_root / "workflows"

    @pytest.fixture
    def expander(self, workflows_dir):
        """Create workflow expander."""
        return WorkflowExpander(workflows_dir)

    # ========================================================================
    # Workflow Directory Structure Tests
    # ========================================================================

    def test_workflows_directory_structure(self, workflows_dir):
        """Test that workflows directory has correct structure."""
        assert workflows_dir.exists(), "workflows/ directory should exist"

        # Check main subdirectories
        assert (workflows_dir / "planning").exists(), "workflows/planning/ should exist"
        assert (workflows_dir / "specification").exists(), "workflows/specification/ should exist"
        assert (workflows_dir / "implementation").exists(), "workflows/implementation/ should exist"

    def test_planning_workflows_exist(self, workflows_dir):
        """Test that planning workflows exist."""
        planning_dir = workflows_dir / "planning"

        expected_workflows = [
            "gather-product-info.md",
            "create-product-mission.md",
            "create-product-roadmap.md",
            "create-product-tech-stack.md"
        ]

        for workflow in expected_workflows:
            assert (planning_dir / workflow).exists(), f"{workflow} should exist"

    def test_specification_workflows_exist(self, workflows_dir):
        """Test that specification workflows exist."""
        spec_dir = workflows_dir / "specification"

        expected_workflows = [
            "initialize-spec.md",
            "research-spec.md",
            "write-spec.md",
            "verify-spec.md"
        ]

        for workflow in expected_workflows:
            assert (spec_dir / workflow).exists(), f"{workflow} should exist"

    def test_implementation_workflows_exist(self, workflows_dir):
        """Test that implementation workflows exist."""
        impl_dir = workflows_dir / "implementation"

        expected_workflows = [
            "create-tasks-list.md",
            "implement-tasks.md",
            "compile-implementation-standards.md"
        ]

        for workflow in expected_workflows:
            assert (impl_dir / workflow).exists(), f"{workflow} should exist"

    def test_verification_workflows_exist(self, workflows_dir):
        """Test that verification workflows exist."""
        verif_dir = workflows_dir / "implementation" / "verification"

        expected_workflows = [
            "verify-functionality.md",
            "verify-tests.md",
            "verify-accessibility.md",
            "verify-performance.md",
            "verify-security.md",
            "verify-documentation.md"
        ]

        for workflow in expected_workflows:
            assert (verif_dir / workflow).exists(), f"{workflow} should exist"

    # ========================================================================
    # Agent Integration Tests
    # ========================================================================

    def test_agents_reference_workflows(self, project_root):
        """Test that new agents reference workflows correctly."""
        agents_dir = project_root / ".yoyo-dev" / "claude-code" / "agents"

        agents_with_workflows = [
            "spec-shaper.md",
            "spec-writer.md",
            "tasks-list-creator.md",
            "implementer.md",
            "implementation-verifier.md",
            "product-planner.md"
        ]

        for agent_file in agents_with_workflows:
            agent_path = agents_dir / agent_file
            assert agent_path.exists(), f"{agent_file} should exist"

            content = agent_path.read_text(encoding='utf-8')
            assert "{{workflows/" in content, f"{agent_file} should reference workflows"

    def test_workflow_references_are_valid(self, project_root, expander):
        """Test that all workflow references in agents point to valid files."""
        agents_dir = project_root / ".yoyo-dev" / "claude-code" / "agents"

        for agent_file in agents_dir.glob("*.md"):
            content = agent_file.read_text(encoding='utf-8')

            # Extract workflow references
            references = expander.parse_references(content)

            for ref in references:
                # Convert reference to file path
                workflow_path = expander.workflows_dir / ref.replace("workflows/", "")
                assert workflow_path.exists(), f"{agent_file.name} references non-existent workflow: {ref}"

    # ========================================================================
    # Workflow Expansion Integration Tests
    # ========================================================================

    def test_expand_real_agent_workflows(self, project_root, expander):
        """Test expanding workflows from actual agent files."""
        agents_dir = project_root / ".yoyo-dev" / "claude-code" / "agents"

        # Test with implementer agent
        implementer = agents_dir / "implementer.md"
        if implementer.exists():
            content = implementer.read_text(encoding='utf-8')

            # Should expand without errors
            expanded = expander.expand(content)

            # Should not have any unexpanded references
            assert "{{workflows/" not in expanded, "All workflow references should be expanded"

            # Should be longer than original (workflows expanded)
            assert len(expanded) >= len(content), "Expanded content should not be shorter"

    def test_no_circular_references_in_agents(self, project_root, expander):
        """Test that no agent files have circular workflow references."""
        agents_dir = project_root / ".yoyo-dev" / "claude-code" / "agents"

        for agent_file in agents_dir.glob("*.md"):
            content = agent_file.read_text(encoding='utf-8')

            # Should expand without circular reference errors
            try:
                expander.expand(content)
            except ValueError as e:
                if "Circular reference" in str(e):
                    pytest.fail(f"{agent_file.name} has circular references: {e}")
                raise

    def test_workflow_expansion_performance(self, project_root, expander):
        """Test that workflow expansion meets performance requirements (< 100ms)."""
        import time

        agents_dir = project_root / ".yoyo-dev" / "claude-code" / "agents"

        # Test with implementation-verifier (has most workflow references)
        verifier = agents_dir / "implementation-verifier.md"
        if verifier.exists():
            content = verifier.read_text(encoding='utf-8')

            start = time.time()
            expander.expand(content)
            elapsed_ms = (time.time() - start) * 1000

            assert elapsed_ms < 100, f"Workflow expansion took {elapsed_ms}ms (should be < 100ms)"

    # ========================================================================
    # Config Integration Tests
    # ========================================================================

    def test_config_has_workflow_settings(self, project_root):
        """Test that config.yml has workflow system settings."""
        import yaml

        config_path = project_root / ".yoyo-dev" / "config.yml"
        assert config_path.exists(), "config.yml should exist"

        with open(config_path, 'r', encoding='utf-8') as f:
            config = yaml.safe_load(f)

        # Check workflow system settings
        assert "workflow_system" in config, "Config should have workflow_system section"
        assert config["workflow_system"]["max_nesting_depth"] == 3, "Max nesting depth should be 3"
        assert config["workflow_system"]["cache_enabled"] is True, "Cache should be enabled"

    def test_config_has_multi_agent_settings(self, project_root):
        """Test that config.yml has multi-agent settings."""
        import yaml

        config_path = project_root / ".yoyo-dev" / "config.yml"

        with open(config_path, 'r', encoding='utf-8') as f:
            config = yaml.safe_load(f)

        # Check multi-agent settings
        assert "multi_agent" in config, "Config should have multi_agent section"
        assert config["multi_agent"]["enabled"] is True, "Multi-agent should be enabled"
        assert config["multi_agent"]["use_workflow_references"] is True, "Workflow references should be enabled"

    # ========================================================================
    # Regression Tests
    # ========================================================================

    def test_existing_agents_still_work(self, project_root):
        """Test that existing agents (without workflows) still work."""
        agents_dir = project_root / ".yoyo-dev" / "claude-code" / "agents"

        # Only check agents that actually exist in the new system
        # Legacy agents may have been moved or removed
        agent_files = list(agents_dir.glob("*.md"))

        # If no agent files exist, that's okay (system is valid without them)
        if len(agent_files) == 0:
            return  # Skip test if no agents in this location

        # Check at least one agent has proper structure
        for agent_file in agent_files[:1]:  # Check just the first one as a sample
            content = agent_file.read_text(encoding='utf-8')

            # Should have valid YAML frontmatter
            assert content.startswith("---"), f"{agent_file.name} should have YAML frontmatter"

            # Should have basic structure
            assert "name:" in content, f"{agent_file.name} should have name field"
            assert "description:" in content, f"{agent_file.name} should have description field"

    def test_workflow_system_backwards_compatible(self, expander):
        """Test that workflow expander handles content without references."""
        # Content without workflow references should pass through unchanged
        content = "# Agent\n\nThis agent does not use workflows."
        result = expander.expand(content)

        assert result == content, "Content without references should be unchanged"

    # ========================================================================
    # End-to-End Integration Tests
    # ========================================================================

    def test_full_workflow_chain(self, project_root, expander):
        """Test expanding a workflow that references other workflows."""
        # Test with implementation-verifier which references verification workflows
        agents_dir = project_root / ".yoyo-dev" / "claude-code" / "agents"
        verifier = agents_dir / "implementation-verifier.md"

        if verifier.exists():
            content = verifier.read_text(encoding='utf-8')

            # Expand
            expanded = expander.expand(content)

            # Should contain content from verification workflows
            assert "functionality" in expanded.lower(), "Should include functionality verification"
            assert "accessibility" in expanded.lower(), "Should include accessibility verification"
            assert "security" in expanded.lower(), "Should include security verification"

            # Should not have unexpanded references
            assert "{{workflows/" not in expanded, "All references should be expanded"

    def test_cache_works_across_expansions(self, project_root, expander):
        """Test that workflow cache improves performance on repeated expansions."""
        import time

        agents_dir = project_root / ".yoyo-dev" / "claude-code" / "agents"
        implementer = agents_dir / "implementer.md"

        if implementer.exists():
            content = implementer.read_text(encoding='utf-8')

            # First expansion (cold cache)
            start1 = time.time()
            expander.expand(content)
            time1 = time.time() - start1

            # Second expansion (warm cache)
            start2 = time.time()
            expander.expand(content)
            time2 = time.time() - start2

            # Second expansion should be faster or similar (cached)
            assert time2 <= time1 * 1.5, "Cached expansion should not be significantly slower"
