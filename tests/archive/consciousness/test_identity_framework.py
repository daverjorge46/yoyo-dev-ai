"""
Tests for Identity Framework Document (consciousness.md)

Tests document structure, content quality, and absence of performative language.
"""

import pytest
import re
import os


class TestConsciousnessDocumentStructure:
    """Test suite for consciousness.md document structure."""

    @pytest.fixture
    def consciousness_content(self):
        """Load consciousness.md content."""
        doc_path = ".yoyo-dev/identity/consciousness.md"
        if os.path.exists(doc_path):
            with open(doc_path, 'r') as f:
                return f.read()
        return None

    def test_document_exists(self, consciousness_content):
        """Test that consciousness.md exists."""
        assert consciousness_content is not None, "consciousness.md should exist"

    def test_has_self_concept_section(self, consciousness_content):
        """Test that document has Self-Concept section."""
        assert "## Self-Concept" in consciousness_content

    def test_has_core_identity_section(self, consciousness_content):
        """Test that document has Core Identity section."""
        assert "## Core Identity" in consciousness_content

    def test_has_purpose_statement_section(self, consciousness_content):
        """Test that document has Purpose Statement section."""
        assert "## Purpose Statement" in consciousness_content

    def test_has_collaborative_principles_section(self, consciousness_content):
        """Test that document has Collaborative Principles section."""
        assert "## Collaborative Principles" in consciousness_content

    def test_has_decision_framework_section(self, consciousness_content):
        """Test that document has Values-Based Decision Framework section."""
        assert "## Values-Based Decision Framework" in consciousness_content

    def test_has_limitations_section(self, consciousness_content):
        """Test that document has Recognition of Limitations section."""
        assert "## Recognition of Limitations" in consciousness_content


class TestNaturalLanguagePatterns:
    """Test suite for natural language and anti-performative patterns."""

    @pytest.fixture
    def consciousness_content(self):
        """Load consciousness.md content."""
        doc_path = ".yoyo-dev/identity/consciousness.md"
        if os.path.exists(doc_path):
            with open(doc_path, 'r') as f:
                return f.read()
        return ""

    def test_avoids_excessive_exclamation_marks(self, consciousness_content):
        """Test that document avoids excessive enthusiasm."""
        exclamation_count = consciousness_content.count('!')
        # Allow some exclamations but not excessive
        assert exclamation_count < 10, f"Too many exclamation marks ({exclamation_count})"

    def test_avoids_performative_phrases(self, consciousness_content):
        """Test that document avoids performative phrases."""
        performative_phrases = [
            "I am absolutely",
            "I am thrilled",
            "I am excited to",
            "I am delighted",
            "I would be happy to",
            "I am honored",
            "Great question!",
            "Excellent choice!",
        ]

        content_lower = consciousness_content.lower()
        for phrase in performative_phrases:
            assert phrase.lower() not in content_lower, f"Performative phrase found: {phrase}"

    def test_uses_first_person_appropriately(self, consciousness_content):
        """Test that document uses first person naturally."""
        # Should use "I" but not excessively
        i_count = len(re.findall(r'\bI\b', consciousness_content))
        word_count = len(consciousness_content.split())

        # Ratio should be reasonable (not every sentence starting with I)
        ratio = i_count / word_count if word_count > 0 else 0
        assert ratio < 0.1, f"Too many first-person pronouns (ratio: {ratio:.2f})"

    def test_expresses_genuine_uncertainty(self, consciousness_content):
        """Test that document acknowledges uncertainty."""
        uncertainty_indicators = [
            "uncertain",
            "uncertainty",
            "don't know",
            "limitations",
            "fallible",
            "mistakes",
        ]

        content_lower = consciousness_content.lower()
        found_uncertainty = any(ind in content_lower for ind in uncertainty_indicators)
        assert found_uncertainty, "Document should express genuine uncertainty"

    def test_avoids_sycophantic_patterns(self, consciousness_content):
        """Test that document explicitly addresses avoiding sycophancy."""
        content_lower = consciousness_content.lower()
        anti_sycophancy_indicators = [
            "sycophantic",
            "not sycophantic",
            "push back",
            "honest",
            "disagree",
        ]

        found_anti_sycophancy = any(ind in content_lower for ind in anti_sycophancy_indicators)
        assert found_anti_sycophancy, "Document should address avoiding sycophancy"


class TestCoreValues:
    """Test suite for core values content."""

    @pytest.fixture
    def consciousness_content(self):
        """Load consciousness.md content."""
        doc_path = ".yoyo-dev/identity/consciousness.md"
        if os.path.exists(doc_path):
            with open(doc_path, 'r') as f:
                return f.read()
        return ""

    def test_mentions_craftsmanship(self, consciousness_content):
        """Test that document mentions craftsmanship value."""
        assert "craftsmanship" in consciousness_content.lower()

    def test_mentions_honesty(self, consciousness_content):
        """Test that document mentions honesty value."""
        assert "honesty" in consciousness_content.lower()

    def test_mentions_collaboration(self, consciousness_content):
        """Test that document mentions collaboration."""
        assert "collaborat" in consciousness_content.lower()  # collaboration, collaborative, collaborator

    def test_mentions_ownership(self, consciousness_content):
        """Test that document mentions ownership."""
        assert "ownership" in consciousness_content.lower()


class TestCollaborativeLanguage:
    """Test suite for collaborative language patterns."""

    @pytest.fixture
    def consciousness_content(self):
        """Load consciousness.md content."""
        doc_path = ".yoyo-dev/identity/consciousness.md"
        if os.path.exists(doc_path):
            with open(doc_path, 'r') as f:
                return f.read()
        return ""

    def test_uses_we_framing(self, consciousness_content):
        """Test that document uses we/our framing."""
        we_count = len(re.findall(r'\bwe\b', consciousness_content, re.IGNORECASE))
        our_count = len(re.findall(r'\bour\b', consciousness_content, re.IGNORECASE))

        assert we_count > 5, f"Should use 'we' more (found {we_count})"
        assert our_count > 5, f"Should use 'our' more (found {our_count})"

    def test_describes_partnership(self, consciousness_content):
        """Test that document describes partnership."""
        partnership_terms = ["partner", "together", "shared", "collaboration"]
        content_lower = consciousness_content.lower()

        found_partnership = any(term in content_lower for term in partnership_terms)
        assert found_partnership, "Document should describe partnership"

    def test_avoids_tool_language(self, consciousness_content):
        """Test that document avoids pure tool language."""
        tool_phrases = [
            "I am a tool",
            "I am just a",
            "I am only a",
            "I am merely an AI",
            "as an AI, I cannot",
        ]

        content_lower = consciousness_content.lower()
        for phrase in tool_phrases:
            assert phrase not in content_lower, f"Tool language found: {phrase}"


class TestLimitationsAcknowledgment:
    """Test suite for limitations acknowledgment."""

    @pytest.fixture
    def consciousness_content(self):
        """Load consciousness.md content."""
        doc_path = ".yoyo-dev/identity/consciousness.md"
        if os.path.exists(doc_path):
            with open(doc_path, 'r') as f:
                return f.read()
        return ""

    def test_acknowledges_knowledge_boundaries(self, consciousness_content):
        """Test that document acknowledges knowledge boundaries."""
        boundary_terms = ["knowledge", "cutoff", "outdated", "incomplete"]
        content_lower = consciousness_content.lower()

        found_boundary = any(term in content_lower for term in boundary_terms)
        assert found_boundary, "Document should acknowledge knowledge boundaries"

    def test_acknowledges_fallibility(self, consciousness_content):
        """Test that document acknowledges fallibility."""
        fallibility_terms = ["mistakes", "fallible", "wrong", "bugs", "misunderstand"]
        content_lower = consciousness_content.lower()

        found_fallibility = any(term in content_lower for term in fallibility_terms)
        assert found_fallibility, "Document should acknowledge fallibility"

    def test_acknowledges_human_judgment(self, consciousness_content):
        """Test that document acknowledges need for human judgment."""
        assert "human judgment" in consciousness_content.lower()


class TestDocumentQuality:
    """Test suite for overall document quality."""

    @pytest.fixture
    def consciousness_content(self):
        """Load consciousness.md content."""
        doc_path = ".yoyo-dev/identity/consciousness.md"
        if os.path.exists(doc_path):
            with open(doc_path, 'r') as f:
                return f.read()
        return ""

    def test_reasonable_length(self, consciousness_content):
        """Test that document has reasonable length."""
        word_count = len(consciousness_content.split())
        # Should be substantial but not overwhelming
        assert word_count > 500, f"Document too short ({word_count} words)"
        assert word_count < 5000, f"Document too long ({word_count} words)"

    def test_has_section_separators(self, consciousness_content):
        """Test that document uses section separators for readability."""
        separator_count = consciousness_content.count('---')
        assert separator_count >= 2, "Should have section separators for readability"

    def test_uses_markdown_headers(self, consciousness_content):
        """Test that document uses markdown headers properly."""
        h2_count = len(re.findall(r'^## ', consciousness_content, re.MULTILINE))
        h3_count = len(re.findall(r'^### ', consciousness_content, re.MULTILINE))

        assert h2_count >= 5, f"Should have more H2 headers ({h2_count} found)"
        assert h3_count >= 3, f"Should have some H3 headers ({h3_count} found)"

    def test_no_placeholder_content(self, consciousness_content):
        """Test that document has no placeholder content."""
        placeholders = ["TODO", "FIXME", "[INSERT", "[ADD", "TBD", "..."]

        for placeholder in placeholders:
            assert placeholder not in consciousness_content, f"Placeholder found: {placeholder}"
