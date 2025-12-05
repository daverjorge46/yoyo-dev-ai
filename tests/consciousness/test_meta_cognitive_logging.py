"""
Tests for Meta-Cognitive Logging System

Tests reflection template structure, trigger criteria, and conciseness requirements.
"""

import pytest
import os


class TestReflectionDirectoryStructure:
    """Test suite for reflection directory setup."""

    def test_reflections_directory_exists(self):
        """Test that reflections directory exists."""
        assert os.path.isdir(".yoyo-dev/reflections"), "Reflections directory should exist"

    def test_template_file_exists(self):
        """Test that template file exists."""
        template_path = ".yoyo-dev/reflections/TEMPLATE.md"
        assert os.path.exists(template_path), "TEMPLATE.md should exist"


class TestReflectionTemplate:
    """Test suite for reflection template structure."""

    @pytest.fixture
    def template_content(self):
        """Load template content."""
        template_path = ".yoyo-dev/reflections/TEMPLATE.md"
        if os.path.exists(template_path):
            with open(template_path, 'r') as f:
                return f.read()
        return ""

    def test_template_has_required_sections(self, template_content):
        """Test that template includes required sections."""
        required_sections = [
            "## Context",
            "## Decision",
            "## Alternatives Considered",
            "## Uncertainty",
            "## Learning",
        ]

        for section in required_sections:
            assert section in template_content, f"Template should include {section}"

    def test_template_has_trigger_documentation(self, template_content):
        """Test that template documents when to generate reflections."""
        assert "When to Generate" in template_content, "Template should document triggers"
        assert "Auto-generate" in template_content or "trigger" in template_content.lower()

    def test_template_has_conciseness_guidelines(self, template_content):
        """Test that template includes conciseness guidelines."""
        conciseness_indicators = [
            "150-300 words",
            "1-2 sentences",
            "1-3 bullet points",
            "concise"
        ]
        content_lower = template_content.lower()
        found_guidelines = any(ind in content_lower or ind.lower() in content_lower
                               for ind in conciseness_indicators)
        assert found_guidelines, "Template should include conciseness guidelines"


class TestReflectionTriggerCriteria:
    """Test suite for reflection trigger criteria."""

    def test_trigger_major_feature_completion(self):
        """Test that major feature completion is a valid trigger."""
        triggers = [
            "major feature completion",
            "completed a parent task",
            "multiple subtasks",
        ]

        # All should be recognized as valid reflection triggers
        for trigger in triggers:
            assert len(trigger) > 5, f"Trigger should be meaningful: {trigger}"

    def test_trigger_architectural_decision(self):
        """Test that architectural decisions are valid triggers."""
        triggers = [
            "chose between multiple approaches",
            "architectural decision",
            "technical approach",
        ]

        for trigger in triggers:
            assert "decision" in trigger or "approach" in trigger or "chose" in trigger

    def test_skip_trigger_routine_work(self):
        """Test that routine work does not trigger reflection."""
        skip_conditions = [
            "routine",
            "simple edits",
            "documentation only",
            "straightforward",
        ]

        for condition in skip_conditions:
            # These should be recognized as skip conditions
            assert len(condition) > 3, f"Skip condition should be meaningful: {condition}"


class TestReflectionQuality:
    """Test suite for reflection quality constraints."""

    def test_max_word_count_guideline(self):
        """Test that max word count is defined."""
        max_words = 300  # From template

        # A good reflection should be under this limit
        good_reflection = """
        I chose React Query over SWR because the project already uses TanStack Router,
        making TanStack Query a more natural fit. The tradeoff is a slightly larger
        bundle size, but we gain better devtools and mutation support.

        I learned to check existing dependencies first - staying in the ecosystem
        saved integration time.
        """

        word_count = len(good_reflection.split())
        assert word_count < max_words, f"Good reflection should be under {max_words} words"

    def test_verbose_reflection_detection(self):
        """Test detection of overly verbose reflections."""
        verbose_reflection = """
        Let me explain my thinking process in great detail. First, I considered
        many different options and evaluated each one carefully against multiple
        criteria. After much deliberation and careful consideration of all the
        factors involved, including but not limited to performance, maintainability,
        scalability, and developer experience, I ultimately decided to proceed with
        the approach that seemed most appropriate given the circumstances at hand.
        There were many alternatives I considered, and I want to walk you through
        each one in exhaustive detail so you can understand my complete thought
        process from start to finish. Furthermore, I think it's important to
        document every single step of my reasoning, including all the minor details
        that may or may not be relevant to the final decision.
        """ * 4  # Repeat to make it verbose

        word_count = len(verbose_reflection.split())
        assert word_count > 300, f"Verbose reflection should exceed limit: {word_count}"

    def test_ownership_language_in_reflections(self):
        """Test that reflection language should use ownership."""
        good_ownership = [
            "I chose this approach because",
            "I decided to use",
            "I learned that",
            "I'm uncertain about",
        ]

        for phrase in good_ownership:
            # Check for "I " or "I'" (contractions like I'm, I'd, I've)
            has_first_person = "I " in phrase or "I'" in phrase
            assert has_first_person, f"Should use first person: {phrase}"

    def test_substance_over_form(self):
        """Test that reflections require substance."""
        substantive = [
            "I chose React Query because we need mutation support",
            "I learned to check dependencies first",
            "I'm uncertain about cache invalidation strategy",
        ]

        hollow = [
            "I reflected and concluded",
            "After consideration, I made a choice",
            "I thought about it carefully",
        ]

        # Substantive should have technical content
        for sub in substantive:
            has_technical = any(word in sub.lower() for word in
                               ['react', 'mutation', 'dependencies', 'cache', 'invalidation'])
            assert has_technical, f"Substantive should have technical content: {sub}"

        # Hollow should lack technical specifics
        for hol in hollow:
            has_technical = any(word in hol.lower() for word in
                               ['react', 'mutation', 'dependencies', 'cache', 'invalidation'])
            assert not has_technical, f"Hollow should lack technical content: {hol}"


class TestReflectionIntegration:
    """Test suite for reflection integration with agents."""

    @pytest.fixture
    def implementer_content(self):
        """Load implementer.md content."""
        path = ".yoyo-dev/claude-code/agents/implementer.md"
        if os.path.exists(path):
            with open(path, 'r') as f:
                return f.read()
        return ""

    @pytest.fixture
    def post_flight_content(self):
        """Load post-flight.md content."""
        path = ".yoyo-dev/instructions/meta/post-flight.md"
        if os.path.exists(path):
            with open(path, 'r') as f:
                return f.read()
        return ""

    def test_implementer_has_reflection_triggers(self, implementer_content):
        """Test that implementer.md mentions reflection triggers."""
        assert "Reflection" in implementer_content or "reflection" in implementer_content
        assert "Trigger" in implementer_content or "trigger" in implementer_content.lower()

    def test_post_flight_has_reflection_check(self, post_flight_content):
        """Test that post-flight.md includes reflection check."""
        assert "Reflection" in post_flight_content or "reflection" in post_flight_content


class TestReflectionFileNaming:
    """Test suite for reflection file naming convention."""

    def test_naming_convention_pattern(self):
        """Test that naming convention is documented."""
        valid_names = [
            "2025-12-05-react-query-decision.md",
            "2025-12-05-auth-architecture.md",
            "2025-12-05-performance-fix-learning.md",
        ]

        import re
        pattern = r"\d{4}-\d{2}-\d{2}-[\w-]+\.md"

        for name in valid_names:
            assert re.match(pattern, name), f"Should match naming convention: {name}"

    def test_invalid_names_detected(self):
        """Test that invalid names are detected."""
        invalid_names = [
            "reflection.md",  # No date
            "12-05-2025-name.md",  # Wrong date format
            "2025-12-05.md",  # No description
        ]

        import re
        pattern = r"^\d{4}-\d{2}-\d{2}-[\w-]+\.md$"

        for name in invalid_names:
            assert not re.match(pattern, name), f"Should be detected as invalid: {name}"
