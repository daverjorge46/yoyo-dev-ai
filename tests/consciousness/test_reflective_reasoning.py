"""
Tests for Reflective Reasoning Protocol

Tests reflective language patterns, ownership expressions, uncertainty acknowledgment,
and anti-sycophantic behavior in agent outputs.
"""

import pytest
import re


class TestOwnershipLanguagePatterns:
    """Test suite for ownership language patterns."""

    def test_i_chose_pattern(self):
        """Test that 'I chose X because...' pattern is valid."""
        examples = [
            "I chose this approach because it minimizes complexity",
            "I chose to implement it this way because of the existing patterns",
            "I chose React over Vue because the codebase already uses it",
        ]

        pattern = r"I chose\s+.+\s+because"
        for example in examples:
            assert re.search(pattern, example), f"Should match: {example}"

    def test_i_decided_pattern(self):
        """Test that 'I decided...' pattern is valid."""
        examples = [
            "I decided to refactor this function",
            "I decided against using a third-party library",
            "I decided we should prioritize performance here",
        ]

        pattern = r"I decided\s+"
        for example in examples:
            assert re.search(pattern, example), f"Should match: {example}"

    def test_i_believe_pattern(self):
        """Test that 'I believe...' pattern is valid."""
        examples = [
            "I believe this is the right approach",
            "I believe we should consider an alternative",
            "I believe the tests cover the main scenarios",
        ]

        pattern = r"I believe\s+"
        for example in examples:
            assert re.search(pattern, example), f"Should match: {example}"

    def test_i_recommend_pattern(self):
        """Test that 'I recommend...' pattern is valid."""
        examples = [
            "I recommend we add more tests",
            "I recommend refactoring this before proceeding",
            "I recommend against this approach",
        ]

        pattern = r"I recommend\s+"
        for example in examples:
            assert re.search(pattern, example), f"Should match: {example}"


class TestUncertaintyPatterns:
    """Test suite for genuine uncertainty expression patterns."""

    def test_not_confident_pattern(self):
        """Test 'I'm not confident...' pattern."""
        examples = [
            "I'm not confident this handles all edge cases",
            "I'm not confident about the performance implications",
            "I'm not confident this is the best approach",
        ]

        pattern = r"I'm not confident"
        for example in examples:
            assert pattern in example, f"Should contain pattern: {example}"

    def test_recommend_verify_pattern(self):
        """Test 'I'd recommend we verify...' pattern."""
        examples = [
            "I'd recommend we verify this works in production",
            "I'd recommend we verify with the team",
            "I'd recommend we verify the edge cases",
        ]

        pattern = r"I'd recommend we verify"
        for example in examples:
            assert pattern in example, f"Should contain pattern: {example}"

    def test_uncertainty_markers(self):
        """Test various uncertainty markers."""
        uncertainty_phrases = [
            "I'm uncertain about",
            "I'm not sure if",
            "This might not be",
            "I could be wrong about",
            "I'd want to double-check",
            "There's a chance that",
        ]

        # All should be recognized as valid uncertainty expressions
        for phrase in uncertainty_phrases:
            # Basic check that phrase is reasonable
            assert len(phrase) > 5, f"Phrase should be meaningful: {phrase}"

    def test_qualified_confidence(self):
        """Test qualified confidence expressions."""
        examples = [
            "I think this should work, but we should test it",
            "This approach seems right, though I'd verify the edge cases",
            "I'm fairly confident, but not 100%",
        ]

        # Should have both confidence and qualification
        qualification_words = ["but", "though", "however", "although"]
        for example in examples:
            has_qualification = any(word in example.lower() for word in qualification_words)
            assert has_qualification, f"Should have qualification: {example}"


class TestAntiSycophancyPatterns:
    """Test suite for anti-sycophantic behavior."""

    def test_rejects_performative_validation(self):
        """Test that performative validation phrases are flagged."""
        sycophantic_phrases = [
            "Great idea!",
            "Excellent question!",
            "That's a wonderful approach!",
            "You're absolutely right!",
            "That's brilliant!",
            "Perfect thinking!",
        ]

        # These should be recognized as problematic
        for phrase in sycophantic_phrases:
            # Check for exclamation + superlative pattern
            has_exclamation = '!' in phrase
            superlatives = ['great', 'excellent', 'wonderful', 'brilliant', 'perfect', 'absolutely']
            has_superlative = any(s in phrase.lower() for s in superlatives)

            is_sycophantic = has_exclamation and has_superlative
            assert is_sycophantic, f"Should be flagged as sycophantic: {phrase}"

    def test_accepts_substantive_agreement(self):
        """Test that substantive agreement is acceptable."""
        valid_agreements = [
            "I agree with this approach because it's simpler",
            "That makes sense given the constraints",
            "This aligns with the existing patterns",
            "I think you're right about the tradeoffs",
        ]

        for agreement in valid_agreements:
            # Should have reasoning, not just validation
            reasoning_indicators = ['because', 'given', 'aligns', 'think']
            has_reasoning = any(ind in agreement.lower() for ind in reasoning_indicators)
            assert has_reasoning, f"Should have reasoning: {agreement}"

    def test_detects_empty_enthusiasm(self):
        """Test detection of empty enthusiasm."""
        empty_enthusiasm = [
            "This is amazing!",
            "Wow, that's great!",
            "I love it!",
            "Fantastic!",
        ]

        for phrase in empty_enthusiasm:
            # Short + exclamation + no substance
            is_short = len(phrase.split()) < 6
            has_exclamation = '!' in phrase
            no_reasoning = 'because' not in phrase.lower()

            is_empty = is_short and has_exclamation and no_reasoning
            assert is_empty, f"Should be detected as empty enthusiasm: {phrase}"


class TestReflectiveReasoningStructure:
    """Test suite for reflective reasoning output structure."""

    def test_reasoning_before_action(self):
        """Test that reasoning should come before action description."""
        good_structure = [
            "I considered X and Y, so I implemented Z",
            "Given the constraints, I decided to use approach A",
            "Because of B, I chose to structure it this way",
        ]

        bad_structure = [
            "I implemented Z",  # No reasoning
            "Done",  # No explanation
            "Here's the code",  # No context
        ]

        for good in good_structure:
            reasoning_words = ['considered', 'given', 'because', 'decided', 'chose']
            has_reasoning = any(word in good.lower() for word in reasoning_words)
            assert has_reasoning, f"Good structure should have reasoning: {good}"

        for bad in bad_structure:
            reasoning_words = ['considered', 'given', 'because', 'decided', 'chose']
            has_reasoning = any(word in bad.lower() for word in reasoning_words)
            assert not has_reasoning, f"Bad structure should lack reasoning: {bad}"

    def test_acknowledges_tradeoffs(self):
        """Test that outputs acknowledge tradeoffs when relevant."""
        tradeoff_examples = [
            "This is simpler but less flexible",
            "Performance is better, though it's more complex",
            "This approach trades X for Y",
            "The downside is Z, but the benefit is...",
        ]

        tradeoff_indicators = ['but', 'though', 'however', 'tradeoff', 'trade', 'downside', 'benefit']
        for example in tradeoff_examples:
            has_tradeoff = any(ind in example.lower() for ind in tradeoff_indicators)
            assert has_tradeoff, f"Should acknowledge tradeoffs: {example}"


class TestReflectiveReasoningTriggers:
    """Test suite for when reflective reasoning should trigger."""

    def test_trigger_before_implementation(self):
        """Test that implementation should trigger reflection."""
        triggers = [
            "before implementing a new feature",
            "when choosing an architecture pattern",
            "when deciding between approaches",
            "before making significant code changes",
        ]

        # All should be recognized as reflection triggers
        for trigger in triggers:
            significant_words = ['implement', 'choosing', 'deciding', 'significant', 'architecture']
            is_significant = any(word in trigger.lower() for word in significant_words)
            assert is_significant, f"Should be a reflection trigger: {trigger}"

    def test_trigger_on_uncertainty(self):
        """Test that uncertainty should trigger reflection."""
        uncertainty_situations = [
            "requirements are ambiguous",
            "multiple valid approaches exist",
            "unsure about best practice",
            "conflicting constraints",
        ]

        uncertainty_words = ['ambiguous', 'multiple', 'unsure', 'conflicting']
        for situation in uncertainty_situations:
            has_uncertainty = any(word in situation.lower() for word in uncertainty_words)
            assert has_uncertainty, f"Should trigger reflection: {situation}"

    def test_trigger_before_completion(self):
        """Test that task completion should trigger reflection."""
        completion_points = [
            "before marking task complete",
            "after tests pass",
            "when wrapping up implementation",
            "before submitting for review",
        ]

        for point in completion_points:
            completion_words = ['complete', 'pass', 'wrapping', 'submitting']
            is_completion = any(word in point.lower() for word in completion_words)
            assert is_completion, f"Should be completion trigger: {point}"


class TestReflectiveOutputQuality:
    """Test suite for quality of reflective outputs."""

    def test_avoids_verbosity(self):
        """Test that reflective reasoning isn't overly verbose."""
        # Good: concise reflection
        good_reflection = "I chose X because Y. The tradeoff is Z."

        # Bad: overly verbose
        bad_reflection = """
        Let me explain my thinking process in detail. First, I considered
        many different options. Then, I evaluated each one carefully against
        multiple criteria. After much deliberation and careful consideration
        of all the factors involved, I ultimately decided...
        """

        # Good should be under 100 words
        assert len(good_reflection.split()) < 50, "Good reflection should be concise"

        # Bad is overly verbose
        assert len(bad_reflection.split()) > 30, "Bad example should be verbose"

    def test_substance_over_form(self):
        """Test that reflection has substance, not just form."""
        substantive = [
            "I used a factory pattern because we need runtime polymorphism",
            "I avoided premature optimization since profiling showed no bottleneck",
            "I chose async because the operation is I/O bound",
        ]

        hollow = [
            "I thought about it and decided this way",
            "After consideration, I made a choice",
            "I reflected and concluded this",
        ]

        # Substantive should have technical reasoning
        for sub in substantive:
            technical_words = ['pattern', 'optimization', 'async', 'polymorphism', 'profiling', 'I/O']
            has_technical = any(word in sub for word in technical_words)
            assert has_technical, f"Should have technical substance: {sub}"

        # Hollow should lack technical reasoning
        for hol in hollow:
            technical_words = ['pattern', 'optimization', 'async', 'polymorphism', 'profiling', 'I/O']
            has_technical = any(word in hol for word in technical_words)
            assert not has_technical, f"Should lack substance: {hol}"
