"""
Tests for Verification Workflows

Tests verification workflow files, integration with post-execution, and implementation-verifier agent.
"""

import pytest
from pathlib import Path


class TestVerificationWorkflows:
    """Test verification workflow files and integration."""

    @pytest.fixture
    def workflows_dir(self):
        """Get the workflows directory."""
        return Path(__file__).parent.parent / "workflows"

    @pytest.fixture
    def verification_dir(self, workflows_dir):
        """Get the verification workflows directory."""
        return workflows_dir / "implementation" / "verification"

    @pytest.fixture
    def post_execution_file(self):
        """Get the post-execution-tasks instruction file."""
        return Path(__file__).parent.parent / ".yoyo-dev" / "instructions" / "core" / "post-execution-tasks.md"

    @pytest.fixture
    def implementation_verifier_agent(self):
        """Get the implementation-verifier agent file."""
        return Path(__file__).parent.parent / ".yoyo-dev" / "claude-code" / "agents" / "implementation-verifier.md"

    # ========================================================================
    # Workflow File Existence Tests
    # ========================================================================

    def test_verification_directory_exists(self, verification_dir):
        """Test that verification workflows directory exists."""
        assert verification_dir.exists(), "workflows/implementation/verification/ should exist"
        assert verification_dir.is_dir()

    def test_verify_functionality_exists(self, verification_dir):
        """Test that verify-functionality.md exists."""
        workflow = verification_dir / "verify-functionality.md"
        assert workflow.exists(), "verify-functionality.md should exist"

    def test_verify_tests_exists(self, verification_dir):
        """Test that verify-tests.md exists."""
        workflow = verification_dir / "verify-tests.md"
        assert workflow.exists(), "verify-tests.md should exist"

    def test_verify_accessibility_exists(self, verification_dir):
        """Test that verify-accessibility.md exists."""
        workflow = verification_dir / "verify-accessibility.md"
        assert workflow.exists(), "verify-accessibility.md should exist"

    def test_verify_performance_exists(self, verification_dir):
        """Test that verify-performance.md exists."""
        workflow = verification_dir / "verify-performance.md"
        assert workflow.exists(), "verify-performance.md should exist"

    def test_verify_security_exists(self, verification_dir):
        """Test that verify-security.md exists."""
        workflow = verification_dir / "verify-security.md"
        assert workflow.exists(), "verify-security.md should exist"

    def test_verify_documentation_exists(self, verification_dir):
        """Test that verify-documentation.md exists."""
        workflow = verification_dir / "verify-documentation.md"
        assert workflow.exists(), "verify-documentation.md should exist"

    # ========================================================================
    # Workflow Content Structure Tests
    # ========================================================================

    def test_functionality_workflow_structure(self, verification_dir):
        """Test that functionality verification has correct structure."""
        workflow = verification_dir / "verify-functionality.md"
        content = workflow.read_text(encoding='utf-8')

        # Should have clear sections
        assert "# " in content, "Should have header"
        assert "functionality" in content.lower(), "Should mention functionality"

        # Should have verification steps
        assert any(keyword in content.lower() for keyword in ["check", "verify", "test", "ensure"]), \
            "Should have verification steps"

    def test_tests_workflow_structure(self, verification_dir):
        """Test that tests verification has correct structure."""
        workflow = verification_dir / "verify-tests.md"
        content = workflow.read_text(encoding='utf-8')

        # Should check test coverage and passing
        required_checks = ["test", "coverage", "pass"]
        for check in required_checks:
            assert check in content.lower(), f"Should check {check}"

    def test_accessibility_workflow_structure(self, verification_dir):
        """Test that accessibility verification has correct structure."""
        workflow = verification_dir / "verify-accessibility.md"
        content = workflow.read_text(encoding='utf-8')

        # Should check WCAG compliance
        accessibility_keywords = ["accessibility", "wcag", "aria", "contrast", "keyboard"]
        matches = sum(1 for keyword in accessibility_keywords if keyword in content.lower())
        assert matches >= 2, "Should check accessibility standards"

    def test_performance_workflow_structure(self, verification_dir):
        """Test that performance verification has correct structure."""
        workflow = verification_dir / "verify-performance.md"
        content = workflow.read_text(encoding='utf-8')

        # Should check performance metrics
        performance_keywords = ["performance", "speed", "load", "optimize", "bundle"]
        matches = sum(1 for keyword in performance_keywords if keyword in content.lower())
        assert matches >= 2, "Should check performance metrics"

    def test_security_workflow_structure(self, verification_dir):
        """Test that security verification has correct structure."""
        workflow = verification_dir / "verify-security.md"
        content = workflow.read_text(encoding='utf-8')

        # Should check security concerns
        security_keywords = ["security", "vulnerability", "auth", "xss", "injection", "owasp"]
        matches = sum(1 for keyword in security_keywords if keyword in content.lower())
        assert matches >= 2, "Should check security concerns"

    def test_documentation_workflow_structure(self, verification_dir):
        """Test that documentation verification has correct structure."""
        workflow = verification_dir / "verify-documentation.md"
        content = workflow.read_text(encoding='utf-8')

        # Should check documentation completeness
        doc_keywords = ["documentation", "comment", "readme", "api", "jsdoc"]
        matches = sum(1 for keyword in doc_keywords if keyword in content.lower())
        assert matches >= 2, "Should check documentation completeness"

    # ========================================================================
    # Workflow Format Tests
    # ========================================================================

    @pytest.mark.parametrize("workflow_name", [
        "verify-functionality.md",
        "verify-tests.md",
        "verify-accessibility.md",
        "verify-performance.md",
        "verify-security.md",
        "verify-documentation.md",
    ])
    def test_workflow_is_markdown(self, verification_dir, workflow_name):
        """Test that verification workflows are valid markdown."""
        workflow = verification_dir / workflow_name
        content = workflow.read_text(encoding='utf-8')

        # Should have markdown headers
        assert content.startswith("#"), f"{workflow_name} should start with markdown header"

    @pytest.mark.parametrize("workflow_name", [
        "verify-functionality.md",
        "verify-tests.md",
        "verify-accessibility.md",
        "verify-performance.md",
        "verify-security.md",
        "verify-documentation.md",
    ])
    def test_workflow_has_clear_title(self, verification_dir, workflow_name):
        """Test that workflows have clear titles."""
        workflow = verification_dir / workflow_name
        content = workflow.read_text(encoding='utf-8')

        first_line = content.split('\n')[0]
        assert first_line.startswith("# "), "Should have H1 title"
        assert len(first_line) > 3, "Title should not be empty"

    # ========================================================================
    # Post-Execution Integration Tests
    # ========================================================================

    def test_post_execution_file_exists(self, post_execution_file):
        """Test that post-execution-tasks.md exists."""
        assert post_execution_file.exists(), "post-execution-tasks.md should exist"

    def test_post_execution_references_verification(self, post_execution_file):
        """Test that post-execution-tasks.md references verification workflows."""
        content = post_execution_file.read_text(encoding='utf-8')

        # Should reference verification workflows
        assert "verification" in content.lower(), "Should mention verification"
        assert "{{workflows/" in content or "verification" in content.lower(), \
            "Should reference verification workflows"

    def test_post_execution_has_verification_step(self, post_execution_file):
        """Test that post-execution has implementation verification step."""
        content = post_execution_file.read_text(encoding='utf-8')

        # Should have verification as a step
        verification_keywords = [
            "implementation verification",
            "verify implementation",
            "implementation-verifier"
        ]

        matches = sum(1 for keyword in verification_keywords if keyword.lower() in content.lower())
        assert matches >= 1, "Should have verification step in post-execution"

    # ========================================================================
    # Implementation-Verifier Agent Tests
    # ========================================================================

    def test_implementation_verifier_exists(self, implementation_verifier_agent):
        """Test that implementation-verifier agent exists."""
        assert implementation_verifier_agent.exists(), "implementation-verifier.md should exist"

    def test_implementation_verifier_references_workflows(self, implementation_verifier_agent):
        """Test that implementation-verifier references verification workflows."""
        content = implementation_verifier_agent.read_text(encoding='utf-8')

        # Should reference verification workflows
        assert "{{workflows/" in content, "Should have workflow references"
        assert "verification" in content.lower(), "Should reference verification workflows"

    def test_implementation_verifier_has_yaml_frontmatter(self, implementation_verifier_agent):
        """Test that implementation-verifier has YAML frontmatter."""
        content = implementation_verifier_agent.read_text(encoding='utf-8')

        assert content.startswith('---'), "Should start with YAML frontmatter"
        assert 'name:' in content, "Should have name field"
        assert 'description:' in content, "Should have description field"
        assert 'tools:' in content, "Should have tools field"

    def test_implementation_verifier_has_all_checks(self, implementation_verifier_agent):
        """Test that implementation-verifier checks all verification aspects."""
        content = implementation_verifier_agent.read_text(encoding='utf-8')

        # Should reference all 6 verification workflows
        verification_aspects = [
            "functionality",
            "tests",
            "accessibility",
            "performance",
            "security",
            "documentation"
        ]

        for aspect in verification_aspects:
            assert aspect in content.lower(), f"Should verify {aspect}"

    # ========================================================================
    # Verification Checklist Tests
    # ========================================================================

    def test_functionality_checklist_items(self, verification_dir):
        """Test that functionality verification has checklist items."""
        workflow = verification_dir / "verify-functionality.md"
        content = workflow.read_text(encoding='utf-8')

        # Should have checklist format (- [ ] or numbered list)
        has_checklist = "- [ ]" in content or "1." in content
        assert has_checklist, "Should have checklist items"

    def test_tests_checklist_comprehensive(self, verification_dir):
        """Test that tests verification checks are comprehensive."""
        workflow = verification_dir / "verify-tests.md"
        content = workflow.read_text(encoding='utf-8')

        # Should check multiple test aspects
        test_aspects = ["unit", "integration", "coverage"]
        matches = sum(1 for aspect in test_aspects if aspect in content.lower())
        assert matches >= 1, "Should check multiple test aspects"

    # ========================================================================
    # Verification Output Tests
    # ========================================================================

    def test_workflows_specify_output_format(self, verification_dir):
        """Test that workflows specify what output to generate."""
        workflows = [
            "verify-functionality.md",
            "verify-tests.md",
            "verify-accessibility.md",
            "verify-performance.md",
            "verify-security.md",
            "verify-documentation.md",
        ]

        for workflow_name in workflows:
            workflow = verification_dir / workflow_name
            content = workflow.read_text(encoding='utf-8')

            # Should specify output or results
            has_output = any(keyword in content.lower() for keyword in ["output", "result", "report", "status"])
            assert has_output, f"{workflow_name} should specify output format"

    # ========================================================================
    # Integration with Execute Tasks Tests
    # ========================================================================

    def test_verification_runs_before_completion(self, post_execution_file):
        """Test that verification runs before marking tasks complete."""
        content = post_execution_file.read_text(encoding='utf-8')

        # Find step numbers for verification and task completion
        # Verification should be in an earlier step than task completion verification

        # Look for "implementation_verification" step
        impl_verification_match = content.find('name="implementation_verification"')

        # Look for "tasks_completion_verification" or "completion" steps
        tasks_completion_match = content.find('Tasks Completion Verification')

        # Both should exist
        assert impl_verification_match != -1, "Should have implementation verification step"
        assert tasks_completion_match != -1, "Should have tasks completion step"

        # Implementation verification should come before tasks completion
        assert impl_verification_match < tasks_completion_match, \
            "Implementation verification should come before tasks completion verification"
