"""
Tests for StateParser service.

Tests parsing of state.json files from spec/fix workflows.
"""

import json
import pytest
from pathlib import Path
from lib.yoyo_tui.services.state_parser import StateParser


class TestStateParser:
    """Test suite for StateParser."""

    def test_parse_nonexistent_file(self, tmp_path):
        """Test parsing a file that doesn't exist."""
        state_file = tmp_path / "state.json"

        result = StateParser.parse(state_file)

        assert result is None

    def test_parse_empty_file(self, tmp_path):
        """Test parsing an empty file."""
        state_file = tmp_path / "state.json"
        state_file.write_text("")

        result = StateParser.parse(state_file)

        assert result is None

    def test_parse_invalid_json(self, tmp_path):
        """Test parsing a file with invalid JSON."""
        state_file = tmp_path / "state.json"
        state_file.write_text("{invalid json")

        result = StateParser.parse(state_file)

        assert result is None

    def test_parse_valid_state_file(self, tmp_path):
        """Test parsing a valid state.json file."""
        state_file = tmp_path / "state.json"
        state_data = {
            "current_phase": "implementation",
            "created_at": "2025-10-11T10:00:00",
            "updated_at": "2025-10-11T11:00:00"
        }
        state_file.write_text(json.dumps(state_data))

        result = StateParser.parse(state_file)

        assert result is not None
        assert result["current_phase"] == "implementation"
        assert result["created_at"] == "2025-10-11T10:00:00"

    def test_get_current_phase_from_valid_file(self, tmp_path):
        """Test extracting current_phase from valid state file."""
        state_file = tmp_path / "state.json"
        state_data = {"current_phase": "ready_for_execution"}
        state_file.write_text(json.dumps(state_data))

        phase = StateParser.get_current_phase(state_file)

        assert phase == "ready_for_execution"

    def test_get_current_phase_from_nonexistent_file(self, tmp_path):
        """Test extracting phase from nonexistent file."""
        state_file = tmp_path / "state.json"

        phase = StateParser.get_current_phase(state_file)

        assert phase == ""

    def test_get_current_phase_missing_key(self, tmp_path):
        """Test extracting phase when current_phase key is missing."""
        state_file = tmp_path / "state.json"
        state_data = {"some_other_key": "value"}
        state_file.write_text(json.dumps(state_data))

        phase = StateParser.get_current_phase(state_file)

        assert phase == ""

    def test_get_workflow_status(self, tmp_path):
        """Test extracting workflow status."""
        state_file = tmp_path / "state.json"
        state_data = {
            "current_phase": "implementation",
            "workflow": "create-new",
            "status": "in_progress"
        }
        state_file.write_text(json.dumps(state_data))

        status = StateParser.get_workflow_status(state_file)

        assert status == "in_progress"

    def test_get_workflow_status_missing(self, tmp_path):
        """Test extracting status when missing."""
        state_file = tmp_path / "state.json"
        state_data = {"current_phase": "implementation"}
        state_file.write_text(json.dumps(state_data))

        status = StateParser.get_workflow_status(state_file)

        assert status == "unknown"

    def test_parse_all_phases(self, tmp_path):
        """Test parsing all possible workflow phases."""
        phases = [
            "spec_creation",
            "ready_for_tasks",
            "ready_for_execution",
            "implementation",
            "testing",
            "completed"
        ]

        for phase in phases:
            state_file = tmp_path / f"state_{phase}.json"
            state_data = {"current_phase": phase}
            state_file.write_text(json.dumps(state_data))

            result = StateParser.get_current_phase(state_file)
            assert result == phase

    def test_is_workflow_complete(self, tmp_path):
        """Test checking if workflow is complete."""
        # Test completed workflow
        state_file = tmp_path / "state.json"
        state_data = {"current_phase": "completed"}
        state_file.write_text(json.dumps(state_data))

        assert StateParser.is_workflow_complete(state_file) is True

        # Test incomplete workflow
        state_data = {"current_phase": "implementation"}
        state_file.write_text(json.dumps(state_data))

        assert StateParser.is_workflow_complete(state_file) is False

    def test_is_ready_for_execution(self, tmp_path):
        """Test checking if workflow is ready for task execution."""
        ready_phases = ["ready_for_execution", "implementation"]

        for phase in ready_phases:
            state_file = tmp_path / "state.json"
            state_data = {"current_phase": phase}
            state_file.write_text(json.dumps(state_data))

            assert StateParser.is_ready_for_execution(state_file) is True

        # Test not ready
        state_file.write_text(json.dumps({"current_phase": "spec_creation"}))
        assert StateParser.is_ready_for_execution(state_file) is False

    def test_parse_timestamps(self, tmp_path):
        """Test parsing created_at and updated_at timestamps."""
        state_file = tmp_path / "state.json"
        state_data = {
            "current_phase": "implementation",
            "created_at": "2025-10-11T10:00:00Z",
            "updated_at": "2025-10-11T12:30:00Z"
        }
        state_file.write_text(json.dumps(state_data))

        result = StateParser.parse(state_file)

        assert result["created_at"] == "2025-10-11T10:00:00Z"
        assert result["updated_at"] == "2025-10-11T12:30:00Z"

    def test_parse_with_metadata(self, tmp_path):
        """Test parsing state file with additional metadata."""
        state_file = tmp_path / "state.json"
        state_data = {
            "current_phase": "implementation",
            "workflow": "create-new",
            "spec_name": "2025-10-11-feature-name",
            "metadata": {
                "assignee": "claude",
                "priority": "high"
            }
        }
        state_file.write_text(json.dumps(state_data))

        result = StateParser.parse(state_file)

        assert result["workflow"] == "create-new"
        assert result["spec_name"] == "2025-10-11-feature-name"
        assert result["metadata"]["priority"] == "high"
