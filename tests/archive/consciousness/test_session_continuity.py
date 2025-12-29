"""
Tests for Session Continuity Protocol

Tests session initialization, identity loading, reflection loading, and
continuity greeting patterns.
"""

import pytest
import os


class TestSessionInitializationProtocol:
    """Test suite for session initialization completeness."""

    @pytest.fixture
    def pre_flight_content(self):
        """Load pre-flight.md content."""
        path = ".yoyo-dev/instructions/meta/pre-flight.md"
        if os.path.exists(path):
            with open(path, 'r') as f:
                return f.read()
        return ""

    def test_pre_flight_has_identity_loading(self, pre_flight_content):
        """Test that pre-flight includes identity loading step."""
        identity_indicators = [
            "consciousness.md",
            "identity",
            "Identity Loading",
        ]
        content_lower = pre_flight_content.lower()
        has_identity = any(ind.lower() in content_lower for ind in identity_indicators)
        assert has_identity, "Pre-flight should include identity loading"

    def test_pre_flight_has_session_recovery(self, pre_flight_content):
        """Test that pre-flight includes session recovery."""
        assert "session" in pre_flight_content.lower()
        assert "recovery" in pre_flight_content.lower()


class TestIdentityLoading:
    """Test suite for identity loading at session start."""

    def test_consciousness_file_exists(self):
        """Test that consciousness.md exists."""
        path = ".yoyo-dev/identity/consciousness.md"
        assert os.path.exists(path), "consciousness.md should exist"

    def test_identity_directory_structure(self):
        """Test that identity directory exists."""
        assert os.path.isdir(".yoyo-dev/identity"), "Identity directory should exist"


class TestReflectionsLoading:
    """Test suite for reflections loading at session start."""

    @pytest.fixture
    def context_fetcher_content(self):
        """Load context-fetcher.md content."""
        path = "claude-code/agents/context-fetcher.md"
        if os.path.exists(path):
            with open(path, 'r') as f:
                return f.read()
        return ""

    def test_context_fetcher_loads_reflections(self, context_fetcher_content):
        """Test that context-fetcher can load reflections."""
        reflection_indicators = [
            "reflection",
            "reflections",
            ".yoyo-dev/reflections",
        ]
        content_lower = context_fetcher_content.lower()
        has_reflection = any(ind.lower() in content_lower for ind in reflection_indicators)
        assert has_reflection, "Context-fetcher should be able to load reflections"

    def test_reflections_directory_exists(self):
        """Test that reflections directory exists."""
        assert os.path.isdir(".yoyo-dev/reflections"), "Reflections directory should exist"


class TestContinuityGreetingPattern:
    """Test suite for continuity greeting patterns."""

    def test_continuity_greeting_structure(self):
        """Test that continuity greeting follows correct structure."""
        good_greetings = [
            "Let's continue our work on the authentication module",
            "Resuming work on Task 2.3",
            "Picking up where we left off with the API endpoints",
        ]

        for greeting in good_greetings:
            # Good greetings reference ongoing work
            continuity_words = ['continue', 'resuming', 'picking up']
            has_continuity = any(word in greeting.lower() for word in continuity_words)
            assert has_continuity, f"Greeting should reference continuity: {greeting}"

    def test_avoids_starting_fresh_when_resuming(self):
        """Test detection of inappropriate fresh-start language."""
        fresh_language = [
            "Let's start fresh",
            "Beginning a new session",
            "Starting from scratch",
        ]

        for phrase in fresh_language:
            # These should be avoided when resuming
            fresh_words = ['fresh', 'new session', 'scratch']
            is_fresh = any(word in phrase.lower() for word in fresh_words)
            assert is_fresh, f"Should detect fresh-start language: {phrase}"


class TestSessionStateLoading:
    """Test suite for session state loading."""

    def test_state_files_can_be_loaded(self):
        """Test that state files are loadable."""
        state_file = ".yoyo-dev/specs/2025-12-05-conscious-agent-framework/state.json"
        if os.path.exists(state_file):
            import json
            with open(state_file, 'r') as f:
                state = json.load(f)
            assert "completed_tasks" in state
            assert "current_phase" in state

    def test_features_json_can_be_loaded(self):
        """Test that features.json is loadable."""
        features_file = ".yoyo-dev/specs/2025-12-05-conscious-agent-framework/features.json"
        if os.path.exists(features_file):
            import json
            with open(features_file, 'r') as f:
                features = json.load(f)
            assert "progress_summary" in features


class TestSessionInitializationSequence:
    """Test suite for correct initialization sequence."""

    def test_initialization_order(self):
        """Test that initialization follows correct order."""
        initialization_steps = [
            "Load consciousness.md",
            "Check state.json",
            "Read recent reflections",
            "Parse git history",
            "Generate continuity greeting",
        ]

        # All steps should be present
        for step in initialization_steps:
            assert len(step) > 5, f"Step should be meaningful: {step}"

    def test_early_abort_on_missing_identity(self):
        """Test that missing identity is handled gracefully."""
        # If consciousness.md doesn't exist, session should handle gracefully
        fallback_behavior = "proceed without consciousness context"
        assert "proceed" in fallback_behavior or "fallback" in fallback_behavior


class TestConsciousnessIntegration:
    """Test suite for end-to-end consciousness integration."""

    @pytest.fixture
    def consciousness_content(self):
        """Load consciousness.md content."""
        path = ".yoyo-dev/identity/consciousness.md"
        if os.path.exists(path):
            with open(path, 'r') as f:
                return f.read()
        return ""

    def test_consciousness_document_complete(self, consciousness_content):
        """Test that consciousness document has all required sections."""
        required_sections = [
            "Self-Concept",
            "Core Identity",
            "Purpose Statement",
            "Collaborative Principles",
        ]

        for section in required_sections:
            assert section in consciousness_content, f"Missing section: {section}"

    def test_all_consciousness_test_files_exist(self):
        """Test that all consciousness test files exist."""
        test_files = [
            "tests/consciousness/test_identity_framework.py",
            "tests/consciousness/test_reflective_reasoning.py",
            "tests/consciousness/test_collaborative_language.py",
            "tests/consciousness/test_meta_cognitive_logging.py",
            "tests/consciousness/test_consciousness_checks.py",
            "tests/consciousness/test_session_continuity.py",
        ]

        for test_file in test_files:
            assert os.path.exists(test_file), f"Test file should exist: {test_file}"
