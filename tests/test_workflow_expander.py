"""
Tests for Workflow Expander Module

Tests workflow reference expansion, nested expansion, and cycle detection.
"""

import pytest
from pathlib import Path
from lib.yoyo_workflow_expander import WorkflowExpander


class TestWorkflowExpander:
    """Test workflow reference expansion functionality."""

    @pytest.fixture
    def expander(self, tmp_path):
        """Create a WorkflowExpander with temporary workflows directory."""
        workflows_dir = tmp_path / "workflows"
        workflows_dir.mkdir()
        return WorkflowExpander(workflows_dir)

    @pytest.fixture
    def sample_workflows(self, tmp_path):
        """Create sample workflow files for testing."""
        workflows_dir = tmp_path / "workflows"
        workflows_dir.mkdir(exist_ok=True)

        # Create simple workflow
        simple = workflows_dir / "simple.md"
        simple.write_text("# Simple Workflow\n\nThis is a simple workflow.")

        # Create workflow with reference
        with_ref = workflows_dir / "with-reference.md"
        with_ref.write_text(
            "# Workflow With Reference\n\n"
            "{{workflows/simple.md}}\n\n"
            "Additional content."
        )

        # Create nested workflow
        nested = workflows_dir / "nested.md"
        nested.write_text(
            "# Nested Workflow\n\n"
            "{{workflows/with-reference.md}}\n\n"
            "More content."
        )

        # Create circular reference A
        circular_a = workflows_dir / "circular-a.md"
        circular_a.write_text(
            "# Circular A\n\n"
            "{{workflows/circular-b.md}}"
        )

        # Create circular reference B
        circular_b = workflows_dir / "circular-b.md"
        circular_b.write_text(
            "# Circular B\n\n"
            "{{workflows/circular-a.md}}"
        )

        # Create too-deep nesting (4 levels)
        level1 = workflows_dir / "level1.md"
        level1.write_text("{{workflows/level2.md}}")

        level2 = workflows_dir / "level2.md"
        level2.write_text("{{workflows/level3.md}}")

        level3 = workflows_dir / "level3.md"
        level3.write_text("{{workflows/level4.md}}")

        level4 = workflows_dir / "level4.md"
        level4.write_text("# Level 4\n\nToo deep!")

        return workflows_dir

    # ========================================================================
    # Basic Expansion Tests
    # ========================================================================

    def test_expand_no_references(self, expander):
        """Test content without workflow references passes through unchanged."""
        content = "# Agent\n\nNo references here."
        result = expander.expand(content)
        assert result == content

    def test_expand_single_reference(self, expander, sample_workflows):
        """Test expanding a single workflow reference."""
        expander = WorkflowExpander(sample_workflows)
        content = "# Agent\n\n{{workflows/simple.md}}\n\nMore content."

        result = expander.expand(content)

        assert "Simple Workflow" in result
        assert "This is a simple workflow." in result
        assert "More content." in result
        assert "{{workflows/" not in result

    def test_expand_multiple_references(self, expander, sample_workflows):
        """Test expanding multiple workflow references in one file."""
        expander = WorkflowExpander(sample_workflows)
        content = (
            "# Agent\n\n"
            "{{workflows/simple.md}}\n\n"
            "Middle content.\n\n"
            "{{workflows/simple.md}}\n\n"
            "End content."
        )

        result = expander.expand(content)

        # Should have two copies of the simple workflow
        assert result.count("Simple Workflow") == 2
        assert result.count("This is a simple workflow.") == 2
        assert "Middle content." in result
        assert "End content." in result

    # ========================================================================
    # Nested Expansion Tests
    # ========================================================================

    def test_expand_nested_references(self, expander, sample_workflows):
        """Test expanding nested workflow references (2 levels)."""
        expander = WorkflowExpander(sample_workflows)
        content = "# Agent\n\n{{workflows/with-reference.md}}"

        result = expander.expand(content)

        # Should contain content from both workflows
        assert "Workflow With Reference" in result
        assert "Simple Workflow" in result
        assert "This is a simple workflow." in result
        assert "Additional content." in result
        assert "{{workflows/" not in result

    def test_expand_deeply_nested_references(self, expander, sample_workflows):
        """Test expanding deeply nested references (3 levels - max allowed)."""
        expander = WorkflowExpander(sample_workflows)
        content = "# Agent\n\n{{workflows/nested.md}}"

        result = expander.expand(content)

        # Should contain content from all 3 levels
        assert "Nested Workflow" in result
        assert "Workflow With Reference" in result
        assert "Simple Workflow" in result
        assert "This is a simple workflow." in result
        assert "{{workflows/" not in result

    def test_expand_exceeds_max_depth(self, expander, sample_workflows):
        """Test that expansion fails when max depth (3) is exceeded."""
        expander = WorkflowExpander(sample_workflows)
        content = "{{workflows/level1.md}}"

        with pytest.raises(ValueError, match="Maximum nesting depth"):
            expander.expand(content)

    # ========================================================================
    # Cycle Detection Tests
    # ========================================================================

    def test_detect_circular_reference(self, expander, sample_workflows):
        """Test that circular references are detected and raise error."""
        expander = WorkflowExpander(sample_workflows)
        content = "{{workflows/circular-a.md}}"

        with pytest.raises(ValueError, match="Circular reference detected"):
            expander.expand(content)

    def test_self_reference(self, expander, sample_workflows):
        """Test that self-references are detected as circular."""
        expander = WorkflowExpander(sample_workflows)

        # Create self-referencing workflow
        self_ref = sample_workflows / "self-ref.md"
        self_ref.write_text("{{workflows/self-ref.md}}")

        content = "{{workflows/self-ref.md}}"

        with pytest.raises(ValueError, match="Circular reference detected"):
            expander.expand(content)

    # ========================================================================
    # Error Handling Tests
    # ========================================================================

    def test_missing_workflow_file(self, expander):
        """Test that missing workflow files raise appropriate error."""
        content = "{{workflows/nonexistent.md}}"

        with pytest.raises(FileNotFoundError, match="Workflow file not found"):
            expander.expand(content)

    def test_invalid_workflow_path(self, expander):
        """Test that invalid workflow paths raise appropriate error."""
        content = "{{workflows/../../../etc/passwd}}"

        with pytest.raises(ValueError, match="Invalid workflow path"):
            expander.expand(content)

    # ========================================================================
    # Reference Parsing Tests
    # ========================================================================

    def test_parse_workflow_references(self, expander):
        """Test extracting workflow references from content."""
        content = (
            "# Agent\n\n"
            "{{workflows/simple.md}}\n\n"
            "Middle content.\n\n"
            "{{workflows/nested.md}}\n\n"
            "End content."
        )

        refs = expander.parse_references(content)

        assert len(refs) == 2
        assert "workflows/simple.md" in refs
        assert "workflows/nested.md" in refs

    def test_parse_no_references(self, expander):
        """Test parsing content with no references."""
        content = "# Agent\n\nNo references here."

        refs = expander.parse_references(content)

        assert len(refs) == 0

    def test_parse_duplicate_references(self, expander):
        """Test that duplicate references are included."""
        content = (
            "{{workflows/simple.md}}\n\n"
            "{{workflows/simple.md}}"
        )

        refs = expander.parse_references(content)

        # Should include duplicates (will be expanded each time)
        assert len(refs) == 2
        assert all(ref == "workflows/simple.md" for ref in refs)

    # ========================================================================
    # Caching Tests
    # ========================================================================

    def test_workflow_caching(self, expander, sample_workflows):
        """Test that workflows are cached for performance."""
        expander = WorkflowExpander(sample_workflows)

        # First expansion
        content = "{{workflows/simple.md}}"
        result1 = expander.expand(content)

        # Check cache
        assert "workflows/simple.md" in expander._cache

        # Second expansion should use cache
        result2 = expander.expand(content)

        assert result1 == result2

    def test_cache_clear(self, expander, sample_workflows):
        """Test clearing the workflow cache."""
        expander = WorkflowExpander(sample_workflows)

        # Expand and cache
        content = "{{workflows/simple.md}}"
        expander.expand(content)

        assert len(expander._cache) > 0

        # Clear cache
        expander.clear_cache()

        assert len(expander._cache) == 0

    # ========================================================================
    # Performance Tests
    # ========================================================================

    def test_expansion_performance(self, expander, sample_workflows):
        """Test that expansion completes within 100ms."""
        import time

        expander = WorkflowExpander(sample_workflows)
        content = "{{workflows/nested.md}}"

        start = time.time()
        expander.expand(content)
        elapsed = (time.time() - start) * 1000  # Convert to ms

        # Should be < 100ms as per NFR2.1
        assert elapsed < 100, f"Expansion took {elapsed}ms (should be < 100ms)"
