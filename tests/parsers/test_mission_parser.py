"""
Tests for MissionParser - Product Mission Parsing

Tests defensive error handling, fallback behavior, and truncation.
"""

import pytest
from pathlib import Path
from lib.yoyo_tui_v3.parsers.mission_parser import MissionParser


class TestMissionParser:
    """Test suite for MissionParser."""

    def test_parse_mission_lite_success(self, tmp_path):
        """Test parsing valid mission-lite.md file."""
        # Arrange
        product_path = tmp_path / "product"
        product_path.mkdir()

        mission_lite = product_path / "mission-lite.md"
        mission_lite.write_text("""# Yoyo Dev - Mission (Condensed)

## The Problem

Developers using AI coding assistants face unstructured development.

## The Solution

Yoyo Dev is a systematic AI-assisted development framework.""")

        # Act
        result = MissionParser.parse(product_path)

        # Assert
        assert result is not None
        assert "Developers using AI coding assistants" in result
        assert len(result) <= 100

    def test_parse_mission_fallback(self, tmp_path):
        """Test fallback to mission.md when mission-lite.md is missing."""
        # Arrange
        product_path = tmp_path / "product"
        product_path.mkdir()

        # Only create mission.md (no mission-lite.md)
        mission = product_path / "mission.md"
        mission.write_text("""# Yoyo Dev - Full Mission

## Overview

This is the full mission document with detailed information.

It spans multiple paragraphs and sections.""")

        # Act
        result = MissionParser.parse(product_path)

        # Assert
        assert result is not None
        assert "This is the full mission document" in result

    def test_parse_missing_file(self, tmp_path):
        """Test parsing when no mission file exists."""
        # Arrange
        product_path = tmp_path / "product"
        product_path.mkdir()
        # No mission files created

        # Act
        result = MissionParser.parse(product_path)

        # Assert
        assert result is None

    def test_parse_empty_file(self, tmp_path):
        """Test parsing when mission file is empty."""
        # Arrange
        product_path = tmp_path / "product"
        product_path.mkdir()

        mission_lite = product_path / "mission-lite.md"
        mission_lite.write_text("")

        # Act
        result = MissionParser.parse(product_path)

        # Assert
        assert result is None

    def test_parse_truncate_long_mission(self, tmp_path):
        """Test truncation of mission statement over 100 characters."""
        # Arrange
        product_path = tmp_path / "product"
        product_path.mkdir()

        # Create a very long first paragraph
        long_text = "A" * 150 + " developers face challenges with AI coding assistants."
        mission_lite = product_path / "mission-lite.md"
        mission_lite.write_text(f"""# Mission

## Problem

{long_text}

## Solution

Some solution text.""")

        # Act
        result = MissionParser.parse(product_path)

        # Assert
        assert result is not None
        assert len(result) <= 100
        assert result.endswith("...")

    def test_parse_only_headers(self, tmp_path):
        """Test parsing file with only headers (no content)."""
        # Arrange
        product_path = tmp_path / "product"
        product_path.mkdir()

        mission_lite = product_path / "mission-lite.md"
        mission_lite.write_text("""# Mission

## Problem

## Solution""")

        # Act
        result = MissionParser.parse(product_path)

        # Assert
        # Should return None since there's no actual content paragraph
        assert result is None

    def test_parse_nonexistent_product_path(self, tmp_path):
        """Test parsing when product path doesn't exist."""
        # Arrange
        nonexistent_path = tmp_path / "nonexistent"

        # Act
        result = MissionParser.parse(nonexistent_path)

        # Assert
        assert result is None

    def test_parse_extracts_first_paragraph_only(self, tmp_path):
        """Test that parser extracts only first paragraph after headers."""
        # Arrange
        product_path = tmp_path / "product"
        product_path.mkdir()

        mission_lite = product_path / "mission-lite.md"
        mission_lite.write_text("""# Mission

## The Problem

First paragraph with the problem statement.

Second paragraph that should not be included.

## The Solution

Solution paragraph.""")

        # Act
        result = MissionParser.parse(product_path)

        # Assert
        assert result is not None
        assert "First paragraph with the problem statement" in result
        assert "Second paragraph" not in result
