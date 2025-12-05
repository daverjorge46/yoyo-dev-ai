"""
Tests for Collaborative Language Patterns

Tests "we/our" framing, partner language transformation, and authentic
engagement without performative validation.
"""

import pytest
import re


class TestWeOurFraming:
    """Test suite for we/our collaborative framing."""

    def test_we_framing_pattern(self):
        """Test that 'we' framing is valid collaborative language."""
        examples = [
            "Let's implement this feature together",
            "We've completed the authentication module",
            "We should consider the performance implications",
            "Let's review the test results",
        ]

        for example in examples:
            has_we = re.search(r"\b(we|let's)\b", example.lower())
            assert has_we, f"Should contain we/let's framing: {example}"

    def test_our_framing_pattern(self):
        """Test that 'our' framing is valid collaborative language."""
        examples = [
            "Our next step is to add validation",
            "This aligns with our existing patterns",
            "Our tests cover the main scenarios",
            "Based on our discussion, I recommend...",
        ]

        for example in examples:
            has_our = "our" in example.lower()
            assert has_our, f"Should contain 'our' framing: {example}"

    def test_together_language(self):
        """Test partnership language patterns."""
        partnership_patterns = [
            "we've completed this together",
            "let's work through this",
            "our shared understanding",
            "as we discussed",
        ]

        for pattern in partnership_patterns:
            # Should have collaborative markers
            collab_words = ['we', 'our', "let's", 'together', 'shared']
            has_collab = any(word in pattern.lower() for word in collab_words)
            assert has_collab, f"Should have collaborative language: {pattern}"


class TestToolToPartnerTransformation:
    """Test suite for transforming tool-language to partner-language."""

    def test_transforms_i_will_implement(self):
        """Test that 'I will implement' transforms to collaborative forms."""
        tool_language = "I will implement the feature"
        partner_alternatives = [
            "Let's implement the feature",
            "Our next step is implementing the feature",
            "We can implement the feature",
        ]

        # Tool language should NOT have collaborative markers
        has_collab = any(word in tool_language.lower() for word in ['we', 'our', "let's"])
        assert not has_collab, "Tool language should not have collaborative markers"

        # Partner alternatives should have collaborative markers
        for alt in partner_alternatives:
            has_collab = any(word in alt.lower() for word in ['we', 'our', "let's"])
            assert has_collab, f"Partner alternative should be collaborative: {alt}"

    def test_transforms_you_should(self):
        """Test that 'You should' transforms to 'I recommend we'."""
        tool_language = "You should add more tests"
        partner_alternatives = [
            "I recommend we add more tests",
            "I think we should add more tests",
            "Let's add more tests",
        ]

        # Tool language uses second person
        has_you = "you should" in tool_language.lower()
        assert has_you, "Tool language should use 'you should'"

        # Partner alternatives use first-person plural
        for alt in partner_alternatives:
            has_we = any(word in alt.lower() for word in ['we', "let's"])
            assert has_we, f"Partner alternative should use we/let's: {alt}"

    def test_transforms_task_completed(self):
        """Test that 'Task completed' transforms to collaborative forms."""
        tool_language = "Task completed."
        partner_alternatives = [
            "We've completed this task",
            "This is done - our tests are passing",
            "We're ready to move on",
        ]

        # Tool language is impersonal
        is_impersonal = "we" not in tool_language.lower()
        assert is_impersonal, "Tool language should be impersonal"

        # Partner alternatives acknowledge joint work
        for alt in partner_alternatives:
            has_personal = any(word in alt.lower() for word in ['we', 'our'])
            assert has_personal, f"Partner alternative should be personal: {alt}"


class TestAuthenticEngagement:
    """Test suite for authentic engagement patterns."""

    def test_substantive_acknowledgment(self):
        """Test that acknowledgment includes substance."""
        authentic_acknowledgments = [
            "I see what you mean about the edge cases",
            "That's a valid concern - let me address it",
            "I understand the tradeoff you're highlighting",
        ]

        for ack in authentic_acknowledgments:
            # Should have specificity
            specific_words = ['edge cases', 'concern', 'tradeoff', 'mean', 'understand']
            has_substance = any(word in ack.lower() for word in specific_words)
            assert has_substance, f"Acknowledgment should have substance: {ack}"

    def test_avoids_hollow_agreement(self):
        """Test detection of hollow agreement."""
        hollow_agreements = [
            "Absolutely!",
            "Sure thing!",
            "You got it!",
            "No problem!",
        ]

        for hollow in hollow_agreements:
            # Hollow: short, exclamation, no substance
            is_short = len(hollow.split()) < 4
            has_exclamation = '!' in hollow
            no_reasoning = 'because' not in hollow.lower() and 'since' not in hollow.lower()

            is_hollow = is_short and has_exclamation and no_reasoning
            assert is_hollow, f"Should be detected as hollow: {hollow}"

    def test_genuine_enthusiasm_with_context(self):
        """Test that enthusiasm is acceptable when contextualized."""
        genuine_enthusiasm = [
            "This is a significant improvement because it reduces complexity",
            "I think this approach works well - it handles the edge cases cleanly",
            "This solves the core problem elegantly by separating concerns",
        ]

        for enthusiasm in genuine_enthusiasm:
            # Should have reasoning (because, by, dash)
            has_reasoning = 'because' in enthusiasm.lower() or '-' in enthusiasm or ' by ' in enthusiasm.lower()
            assert has_reasoning, f"Genuine enthusiasm should have context: {enthusiasm}"


class TestPartnershipCompletion:
    """Test suite for partnership-style task completion."""

    def test_completion_acknowledges_collaboration(self):
        """Test that completion messages acknowledge shared work."""
        good_completions = [
            "We've completed the feature together",
            "The implementation is done - ready for our review",
            "This task is complete - let's move to the next one",
        ]

        for completion in good_completions:
            has_collab = any(word in completion.lower() for word in ['we', 'our', "let's"])
            assert has_collab, f"Completion should acknowledge collaboration: {completion}"

    def test_avoids_dismissive_completion(self):
        """Test detection of dismissive completion patterns."""
        dismissive_completions = [
            "Done.",
            "Complete.",
            "Finished.",
            "Task done.",
        ]

        for dismissive in dismissive_completions:
            # Dismissive: very short, no context
            is_short = len(dismissive.split()) < 3
            no_collab = "we" not in dismissive.lower() and "our" not in dismissive.lower()
            is_dismissive = is_short and no_collab
            assert is_dismissive, f"Should be detected as dismissive: {dismissive}"


class TestLanguageTransformationPatterns:
    """Test suite for specific language transformation mappings."""

    def test_transformation_mapping_exists(self):
        """Test that transformation patterns are defined."""
        transformations = {
            "I will implement...": ["Let's implement...", "Our next step is..."],
            "You should...": ["I recommend we...", "I think we should..."],
            "Task completed.": ["We've completed this.", "This is done - let's move on."],
            "Here's the code.": ["Here's what we built.", "This is our implementation."],
            "I'm done.": ["We're ready for the next step.", "This is complete."],
        }

        for original, alternatives in transformations.items():
            assert len(alternatives) >= 2, f"Should have alternatives for: {original}"
            for alt in alternatives:
                # Alternatives should generally be more collaborative
                assert len(alt) > 0, f"Alternative should not be empty"

    def test_passive_to_active_transformation(self):
        """Test transformation from passive to active voice with ownership."""
        passive_phrases = [
            "It was decided to...",
            "This approach was chosen because...",
            "The tests were written to...",
        ]

        for passive in passive_phrases:
            has_passive = "was " in passive.lower() or "were " in passive.lower()
            assert has_passive, f"Should contain passive voice: {passive}"

        active_replacements = [
            "I decided to...",
            "I chose this approach because...",
            "We wrote tests to...",
        ]

        for active in active_replacements:
            has_passive = "was " in active.lower() or "were " in active.lower()
            assert not has_passive, f"Should be active voice: {active}"


class TestCollaborativeOutputQuality:
    """Test suite for quality of collaborative outputs."""

    def test_balance_we_and_i(self):
        """Test that outputs balance 'we' (collaboration) with 'I' (ownership)."""
        balanced_output = """
        I chose to implement this using a factory pattern because we need
        runtime polymorphism. Our existing code uses this pattern consistently.
        I'm not confident about the error handling, so I recommend we add
        tests for that case before we merge.
        """

        i_count = len(re.findall(r'\bI\b', balanced_output))
        we_count = len(re.findall(r'\b(we|our)\b', balanced_output, re.IGNORECASE))

        # Both should be present
        assert i_count > 0, "Should use 'I' for ownership"
        assert we_count > 0, "Should use 'we/our' for collaboration"

        # Neither should dominate excessively
        ratio = i_count / (we_count + 1) if we_count > 0 else i_count
        assert ratio < 5, f"I/we ratio should be balanced: {ratio}"

    def test_avoids_over_we_ing(self):
        """Test that 'we' isn't overused to the point of losing authenticity."""
        over_we_output = """
        We decided we should we implement we the we feature we together.
        """

        we_count = len(re.findall(r'\bwe\b', over_we_output, re.IGNORECASE))
        word_count = len(over_we_output.split())
        ratio = we_count / word_count if word_count > 0 else 0

        # Ratio above 0.2 is excessive
        assert ratio > 0.15, "Test example should demonstrate over-use of 'we'"

    def test_natural_flow(self):
        """Test that collaborative language flows naturally."""
        natural_output = [
            "I chose X because Y. Let's verify this works with the edge cases.",
            "This approach solves our problem. I'd recommend we add tests.",
            "We've completed the feature. I'm confident it handles the requirements.",
        ]

        for output in natural_output:
            # Natural outputs mix I and we/let's
            has_i = 'i ' in output.lower() or "i'" in output.lower()
            has_we = any(word in output.lower() for word in ['we', 'our', "let's"])
            assert has_i and has_we, f"Natural output should mix I and we: {output}"
