"""
Tests for TechStackParser - Tech Stack Parsing

Tests bullet list extraction and defensive error handling.
"""

import pytest
from pathlib import Path
from lib.yoyo_tui_v3.parsers.tech_stack_parser import TechStackParser


class TestTechStackParser:
    """Test suite for TechStackParser."""

    def test_parse_tech_stack_success(self, tmp_path):
        """Test parsing valid tech-stack.md file."""
        # Arrange
        product_path = tmp_path / "product"
        product_path.mkdir()

        tech_stack = product_path / "tech-stack.md"
        tech_stack.write_text("""# Yoyo Dev - Technical Stack

## Core Language & Runtime

### Python 3.11
- **Why**: Modern language with excellent library ecosystem

## User Interface

### Textual (TUI Framework)
- **Purpose**: Production-grade terminal user interface

### Watchdog (File System Monitoring)
- **Purpose**: Real-time file change detection""")

        # Act
        result = TechStackParser.parse(product_path)

        # Assert
        assert result is not None
        assert isinstance(result, list)
        assert len(result) >= 3
        assert "Python 3.11" in result
        assert "Textual" in result or "Textual (TUI Framework)" in result
        assert "Watchdog" in result or "Watchdog (File System Monitoring)" in result

    def test_parse_bullet_list(self, tmp_path):
        """Test extracting tech from bullet points."""
        # Arrange
        product_path = tmp_path / "product"
        product_path.mkdir()

        tech_stack = product_path / "tech-stack.md"
        tech_stack.write_text("""# Tech Stack

## Technologies

- Python 3.11
- Textual
- PyYAML
- Watchdog
- Rich""")

        # Act
        result = TechStackParser.parse(product_path)

        # Assert
        assert result is not None
        assert isinstance(result, list)
        assert len(result) == 5
        assert "Python 3.11" in result
        assert "Textual" in result
        assert "PyYAML" in result
        assert "Watchdog" in result
        assert "Rich" in result

    def test_parse_missing_file(self, tmp_path):
        """Test parsing when tech-stack.md is missing."""
        # Arrange
        product_path = tmp_path / "product"
        product_path.mkdir()
        # No tech-stack.md created

        # Act
        result = TechStackParser.parse(product_path)

        # Assert
        assert result is not None
        assert isinstance(result, list)
        assert len(result) == 0

    def test_parse_empty_file(self, tmp_path):
        """Test parsing when tech-stack.md is empty."""
        # Arrange
        product_path = tmp_path / "product"
        product_path.mkdir()

        tech_stack = product_path / "tech-stack.md"
        tech_stack.write_text("")

        # Act
        result = TechStackParser.parse(product_path)

        # Assert
        assert result is not None
        assert isinstance(result, list)
        assert len(result) == 0

    def test_parse_h3_headers_as_tech(self, tmp_path):
        """Test extracting H3 headers as tech names."""
        # Arrange
        product_path = tmp_path / "product"
        product_path.mkdir()

        tech_stack = product_path / "tech-stack.md"
        tech_stack.write_text("""# Tech Stack

## Frontend

### React 18
Description here

### Tailwind CSS
More description

## Backend

### Node.js
Description""")

        # Act
        result = TechStackParser.parse(product_path)

        # Assert
        assert result is not None
        assert isinstance(result, list)
        assert len(result) >= 3
        assert "React 18" in result
        assert "Tailwind CSS" in result
        assert "Node.js" in result

    def test_parse_mixed_format(self, tmp_path):
        """Test parsing mixed bullet list and H3 headers."""
        # Arrange
        product_path = tmp_path / "product"
        product_path.mkdir()

        tech_stack = product_path / "tech-stack.md"
        tech_stack.write_text("""# Tech Stack

## Core

### Python 3.11
- Feature 1
- Feature 2

## Libraries

- Textual
- Watchdog

### PyYAML
Description here""")

        # Act
        result = TechStackParser.parse(product_path)

        # Assert
        assert result is not None
        assert isinstance(result, list)
        assert "Python 3.11" in result
        assert "Textual" in result
        assert "Watchdog" in result
        assert "PyYAML" in result

    def test_parse_nonexistent_product_path(self, tmp_path):
        """Test parsing when product path doesn't exist."""
        # Arrange
        nonexistent_path = tmp_path / "nonexistent"

        # Act
        result = TechStackParser.parse(nonexistent_path)

        # Assert
        assert result is not None
        assert isinstance(result, list)
        assert len(result) == 0

    def test_parse_removes_markdown_formatting(self, tmp_path):
        """Test that markdown formatting is removed from tech names."""
        # Arrange
        product_path = tmp_path / "product"
        product_path.mkdir()

        tech_stack = product_path / "tech-stack.md"
        tech_stack.write_text("""# Tech Stack

- **Python 3.11** - Programming language
- *Textual* (TUI Framework)
- [Watchdog](https://example.com)""")

        # Act
        result = TechStackParser.parse(product_path)

        # Assert
        assert result is not None
        # Check that markdown formatting is cleaned
        assert any("Python 3.11" in item for item in result)
        assert any("Textual" in item for item in result)
        assert any("Watchdog" in item for item in result)
