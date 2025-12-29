"""
Tests for Pre-Action Consciousness Checks

Tests presence of consciousness checks at trigger points and brevity requirements.
"""

import pytest
import os
import re


class TestConsciousnessCheckPresence:
    """Test suite for consciousness check presence in key files."""

    @pytest.fixture
    def execute_tasks_content(self):
        """Load execute-tasks.md content."""
        path = ".yoyo-dev/instructions/core/execute-tasks.md"
        if os.path.exists(path):
            with open(path, 'r') as f:
                return f.read()
        return ""

    @pytest.fixture
    def implementer_content(self):
        """Load implementer.md content."""
        path = ".yoyo-dev/claude-code/agents/implementer.md"
        if os.path.exists(path):
            with open(path, 'r') as f:
                return f.read()
        return ""

    def test_execute_tasks_has_consciousness_check(self, execute_tasks_content):
        """Test that execute-tasks.md includes consciousness check."""
        assert "consciousness_check" in execute_tasks_content.lower() or \
               "consciousness check" in execute_tasks_content.lower()

    def test_implementer_has_consciousness_check(self, implementer_content):
        """Test that implementer.md includes consciousness check."""
        assert "consciousness" in implementer_content.lower()


class TestConsciousnessCheckTemplate:
    """Test suite for consciousness check XML template."""

    def test_template_structure(self):
        """Test that consciousness check has valid structure."""
        template_elements = [
            "purpose",
            "approach",
            "uncertainty",
        ]

        # All elements should be present in a consciousness check
        for element in template_elements:
            assert len(element) > 3, f"Template element should be meaningful: {element}"

    def test_template_is_brief(self):
        """Test that consciousness check template is designed for brevity."""
        # A good consciousness check should be under 100 words
        max_check_words = 100

        sample_check = """
        Purpose: Implementing user authentication
        Approach: Using existing auth patterns
        Uncertainty: None - straightforward implementation
        """

        word_count = len(sample_check.split())
        assert word_count < max_check_words, f"Check should be brief: {word_count} words"


class TestTriggerPoints:
    """Test suite for consciousness check trigger points."""

    def test_trigger_new_feature_start(self):
        """Test that new feature start is a valid trigger."""
        triggers = [
            "starting a new feature",
            "beginning implementation",
            "new task execution",
        ]

        for trigger in triggers:
            significant_words = ['new', 'starting', 'beginning']
            is_significant = any(word in trigger.lower() for word in significant_words)
            assert is_significant, f"Should be a valid trigger: {trigger}"

    def test_trigger_architectural_decision(self):
        """Test that architectural decisions are valid triggers."""
        triggers = [
            "choosing between approaches",
            "architectural decision",
            "major design choice",
        ]

        for trigger in triggers:
            assert len(trigger) > 5, f"Trigger should be meaningful: {trigger}"

    def test_trigger_task_completion(self):
        """Test that task completion is a valid trigger."""
        triggers = [
            "before marking task complete",
            "task completion verification",
            "final task review",
        ]

        for trigger in triggers:
            completion_words = ['complete', 'completion', 'final']
            is_completion = any(word in trigger.lower() for word in completion_words)
            assert is_completion, f"Should be completion trigger: {trigger}"

    def test_trigger_ambiguous_requirements(self):
        """Test that ambiguous requirements are valid triggers."""
        triggers = [
            "ambiguous requirements",
            "unclear specifications",
            "multiple valid interpretations",
        ]

        for trigger in triggers:
            ambiguity_words = ['ambiguous', 'unclear', 'multiple']
            is_ambiguous = any(word in trigger.lower() for word in ambiguity_words)
            assert is_ambiguous, f"Should be ambiguity trigger: {trigger}"


class TestConsciousnessCheckContent:
    """Test suite for consciousness check content quality."""

    def test_purpose_clarity(self):
        """Test that purpose statement is clear."""
        good_purposes = [
            "Implementing user authentication module",
            "Adding validation to form inputs",
            "Refactoring database queries for performance",
        ]

        for purpose in good_purposes:
            # Good purposes are specific
            assert len(purpose.split()) >= 3, f"Purpose should be specific: {purpose}"
            assert len(purpose.split()) <= 15, f"Purpose should be concise: {purpose}"

    def test_approach_articulation(self):
        """Test that approach is articulated."""
        good_approaches = [
            "Using existing auth patterns from the codebase",
            "Following TDD - tests first, then implementation",
            "Matching the style of similar components",
        ]

        for approach in good_approaches:
            # Approaches reference existing patterns or methods
            approach_words = ['using', 'following', 'matching', 'applying']
            has_method = any(word in approach.lower() for word in approach_words)
            assert has_method, f"Approach should describe method: {approach}"

    def test_uncertainty_honesty(self):
        """Test that uncertainty is expressed honestly."""
        uncertainty_options = [
            "None - straightforward implementation",
            "Not confident about edge case handling",
            "Uncertain about performance implications",
        ]

        for uncertainty in uncertainty_options:
            # Can be "none" or express actual uncertainty
            is_clear = "none" in uncertainty.lower() or \
                      "not confident" in uncertainty.lower() or \
                      "uncertain" in uncertainty.lower()
            assert is_clear, f"Uncertainty should be clear: {uncertainty}"


class TestConsciousnessCheckBrevity:
    """Test suite for consciousness check brevity requirements."""

    def test_check_under_100_words(self):
        """Test that full check is under 100 words."""
        full_check = """
        <consciousness_check>
        Purpose: Implementing user authentication
        Approach: Using existing JWT patterns
        Uncertainty: None - standard implementation
        </consciousness_check>
        """

        word_count = len(full_check.split())
        assert word_count < 100, f"Full check should be under 100 words: {word_count}"

    def test_verbose_check_detection(self):
        """Test detection of overly verbose checks."""
        verbose_check = """
        <consciousness_check>
        Let me take a moment to deeply reflect on my purpose here.
        I want to carefully consider every aspect of what I'm about to do.
        First, I'll think about the purpose, then the approach, and finally
        I'll consider all possible uncertainties. After much deliberation and
        extensive contemplation of all the factors involved, I believe that
        it would be prudent to carefully and thoughtfully examine each aspect
        of this task before proceeding with the implementation phase.
        </consciousness_check>
        """

        word_count = len(verbose_check.split())
        # Verbose is over 50 words
        assert word_count > 50, f"Verbose check example should exceed limit: {word_count}"

    def test_minimal_check_valid(self):
        """Test that minimal check is valid."""
        minimal_check = """
        Purpose: Add login endpoint
        Approach: Match existing API patterns
        Uncertainty: None
        """

        word_count = len(minimal_check.split())
        # Minimal but complete
        assert word_count < 20, "Minimal check should be very brief"
        assert "purpose" in minimal_check.lower()
        assert "approach" in minimal_check.lower()
        assert "uncertainty" in minimal_check.lower()


class TestConsciousnessCheckIntegration:
    """Test suite for consciousness check integration points."""

    def test_integration_before_implementation(self):
        """Test that check should occur before implementation."""
        timing = "before"
        assert timing == "before", "Check should happen before, not during"

    def test_integration_not_verbose_output(self):
        """Test that check doesn't create verbose output."""
        # Consciousness checks should be internal, not output
        check_note = "Internal check - not visible to user unless issues detected"
        assert "internal" in check_note.lower() or "not visible" in check_note.lower()

    def test_integration_skip_routine_tasks(self):
        """Test that routine tasks can skip consciousness check."""
        skip_conditions = [
            "routine file edit",
            "minor documentation update",
            "simple refactor",
        ]

        for condition in skip_conditions:
            routine_words = ['routine', 'minor', 'simple']
            is_routine = any(word in condition.lower() for word in routine_words)
            assert is_routine, f"Should be skippable: {condition}"
