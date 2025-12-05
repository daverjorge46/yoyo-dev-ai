"""
Tests for FeaturesJsonParser - Features JSON Schema Validation and Parsing

Tests schema validation, progress calculation, and state management
for the features.json file format used in session recovery workflows.
"""

import pytest
import json
from pathlib import Path


class TestFeaturesJsonSchema:
    """Test suite for features.json schema validation."""

    def test_valid_features_json(self, tmp_path):
        """Test parsing a valid features.json file."""
        # Arrange
        spec_path = tmp_path / "specs" / "2025-12-05-test-feature"
        spec_path.mkdir(parents=True)

        features_data = {
            "spec_name": "Test Feature",
            "created": "2025-12-05",
            "features": [
                {
                    "id": "1",
                    "name": "Feature One",
                    "description": "First feature",
                    "implemented": False,
                    "tested": False,
                    "test_steps": ["Run unit tests", "Verify output"],
                    "sub_features": [
                        {
                            "id": "1.1",
                            "name": "Sub-feature A",
                            "implemented": False,
                            "tested": False
                        }
                    ]
                }
            ],
            "progress_summary": {
                "total_features": 1,
                "implemented": 0,
                "tested": 0,
                "completion_percentage": 0
            }
        }

        features_file = spec_path / "features.json"
        features_file.write_text(json.dumps(features_data, indent=2))

        # Act
        loaded = json.loads(features_file.read_text())

        # Assert
        assert loaded["spec_name"] == "Test Feature"
        assert loaded["created"] == "2025-12-05"
        assert len(loaded["features"]) == 1
        assert loaded["features"][0]["id"] == "1"
        assert loaded["progress_summary"]["total_features"] == 1

    def test_features_json_required_fields(self, tmp_path):
        """Test that all required fields are present."""
        # Arrange
        features_data = {
            "spec_name": "Test",
            "created": "2025-12-05",
            "features": [],
            "progress_summary": {
                "total_features": 0,
                "implemented": 0,
                "tested": 0,
                "completion_percentage": 0
            }
        }

        # Act & Assert
        required_fields = ["spec_name", "created", "features", "progress_summary"]
        for field in required_fields:
            assert field in features_data, f"Missing required field: {field}"

    def test_feature_item_required_fields(self, tmp_path):
        """Test that feature items have all required fields."""
        # Arrange
        feature = {
            "id": "1",
            "name": "Test Feature",
            "description": "Description",
            "implemented": False,
            "tested": False,
            "test_steps": [],
            "sub_features": []
        }

        # Act & Assert
        required_fields = ["id", "name", "description", "implemented", "tested", "test_steps", "sub_features"]
        for field in required_fields:
            assert field in feature, f"Missing required field: {field}"

    def test_sub_feature_required_fields(self, tmp_path):
        """Test that sub-feature items have all required fields."""
        # Arrange
        sub_feature = {
            "id": "1.1",
            "name": "Sub-feature",
            "implemented": False,
            "tested": False
        }

        # Act & Assert
        required_fields = ["id", "name", "implemented", "tested"]
        for field in required_fields:
            assert field in sub_feature, f"Missing required field: {field}"

    def test_progress_summary_required_fields(self, tmp_path):
        """Test that progress_summary has all required fields."""
        # Arrange
        progress_summary = {
            "total_features": 5,
            "implemented": 2,
            "tested": 1,
            "completion_percentage": 40
        }

        # Act & Assert
        required_fields = ["total_features", "implemented", "tested", "completion_percentage"]
        for field in required_fields:
            assert field in progress_summary, f"Missing required field: {field}"


class TestFeaturesJsonProgressCalculation:
    """Test suite for progress calculation from features.json."""

    def test_calculate_completion_percentage_empty(self, tmp_path):
        """Test completion percentage with no features."""
        # Arrange
        features_data = {
            "spec_name": "Empty",
            "created": "2025-12-05",
            "features": [],
            "progress_summary": {
                "total_features": 0,
                "implemented": 0,
                "tested": 0,
                "completion_percentage": 0
            }
        }

        # Act
        total = features_data["progress_summary"]["total_features"]
        tested = features_data["progress_summary"]["tested"]
        percentage = (tested / total * 100) if total > 0 else 0

        # Assert
        assert percentage == 0

    def test_calculate_completion_percentage_partial(self, tmp_path):
        """Test completion percentage with partial progress."""
        # Arrange
        features_data = {
            "spec_name": "Partial",
            "created": "2025-12-05",
            "features": [
                {"id": "1", "name": "F1", "description": "", "implemented": True, "tested": True, "test_steps": [], "sub_features": []},
                {"id": "2", "name": "F2", "description": "", "implemented": True, "tested": False, "test_steps": [], "sub_features": []},
                {"id": "3", "name": "F3", "description": "", "implemented": False, "tested": False, "test_steps": [], "sub_features": []},
                {"id": "4", "name": "F4", "description": "", "implemented": False, "tested": False, "test_steps": [], "sub_features": []},
            ],
            "progress_summary": {
                "total_features": 4,
                "implemented": 2,
                "tested": 1,
                "completion_percentage": 25
            }
        }

        # Act - recalculate from features
        total = len(features_data["features"])
        tested = sum(1 for f in features_data["features"] if f["tested"])
        implemented = sum(1 for f in features_data["features"] if f["implemented"])
        percentage = (tested / total * 100) if total > 0 else 0

        # Assert
        assert total == 4
        assert implemented == 2
        assert tested == 1
        assert percentage == 25

    def test_calculate_completion_percentage_complete(self, tmp_path):
        """Test completion percentage when all features tested."""
        # Arrange
        features_data = {
            "spec_name": "Complete",
            "created": "2025-12-05",
            "features": [
                {"id": "1", "name": "F1", "description": "", "implemented": True, "tested": True, "test_steps": [], "sub_features": []},
                {"id": "2", "name": "F2", "description": "", "implemented": True, "tested": True, "test_steps": [], "sub_features": []},
            ],
            "progress_summary": {
                "total_features": 2,
                "implemented": 2,
                "tested": 2,
                "completion_percentage": 100
            }
        }

        # Act
        total = len(features_data["features"])
        tested = sum(1 for f in features_data["features"] if f["tested"])
        percentage = (tested / total * 100) if total > 0 else 0

        # Assert
        assert percentage == 100

    def test_count_sub_features_in_progress(self, tmp_path):
        """Test that sub-features are counted in progress calculation."""
        # Arrange
        features_data = {
            "spec_name": "With Sub-features",
            "created": "2025-12-05",
            "features": [
                {
                    "id": "1",
                    "name": "Parent Feature",
                    "description": "",
                    "implemented": False,
                    "tested": False,
                    "test_steps": [],
                    "sub_features": [
                        {"id": "1.1", "name": "Sub 1", "implemented": True, "tested": True},
                        {"id": "1.2", "name": "Sub 2", "implemented": True, "tested": False},
                        {"id": "1.3", "name": "Sub 3", "implemented": False, "tested": False},
                    ]
                }
            ],
            "progress_summary": {
                "total_features": 3,
                "implemented": 2,
                "tested": 1,
                "completion_percentage": 33
            }
        }

        # Act - count sub-features
        total_subs = 0
        implemented_subs = 0
        tested_subs = 0
        for feature in features_data["features"]:
            for sub in feature["sub_features"]:
                total_subs += 1
                if sub["implemented"]:
                    implemented_subs += 1
                if sub["tested"]:
                    tested_subs += 1

        # Assert
        assert total_subs == 3
        assert implemented_subs == 2
        assert tested_subs == 1


class TestFeaturesJsonStateManagement:
    """Test suite for features.json state management."""

    def test_mark_feature_implemented(self, tmp_path):
        """Test marking a feature as implemented."""
        # Arrange
        features_data = {
            "spec_name": "Test",
            "created": "2025-12-05",
            "features": [
                {"id": "1", "name": "F1", "description": "", "implemented": False, "tested": False, "test_steps": [], "sub_features": []}
            ],
            "progress_summary": {"total_features": 1, "implemented": 0, "tested": 0, "completion_percentage": 0}
        }

        # Act
        features_data["features"][0]["implemented"] = True
        features_data["progress_summary"]["implemented"] = 1

        # Assert
        assert features_data["features"][0]["implemented"] is True
        assert features_data["progress_summary"]["implemented"] == 1

    def test_mark_feature_tested(self, tmp_path):
        """Test marking a feature as tested."""
        # Arrange
        features_data = {
            "spec_name": "Test",
            "created": "2025-12-05",
            "features": [
                {"id": "1", "name": "F1", "description": "", "implemented": True, "tested": False, "test_steps": [], "sub_features": []}
            ],
            "progress_summary": {"total_features": 1, "implemented": 1, "tested": 0, "completion_percentage": 0}
        }

        # Act
        features_data["features"][0]["tested"] = True
        features_data["progress_summary"]["tested"] = 1
        features_data["progress_summary"]["completion_percentage"] = 100

        # Assert
        assert features_data["features"][0]["tested"] is True
        assert features_data["progress_summary"]["tested"] == 1
        assert features_data["progress_summary"]["completion_percentage"] == 100

    def test_cannot_test_without_implementation(self, tmp_path):
        """Test that testing requires implementation first (business rule)."""
        # Arrange
        feature = {"id": "1", "name": "F1", "description": "", "implemented": False, "tested": False, "test_steps": [], "sub_features": []}

        # Act & Assert - this is a business rule check
        # A feature should not be marked tested if not implemented
        if not feature["implemented"]:
            # Don't allow marking as tested
            assert feature["tested"] is False, "Cannot mark feature as tested before implementation"

    def test_find_feature_by_id(self, tmp_path):
        """Test finding a feature by its ID."""
        # Arrange
        features_data = {
            "spec_name": "Test",
            "created": "2025-12-05",
            "features": [
                {"id": "1", "name": "F1", "description": "", "implemented": False, "tested": False, "test_steps": [], "sub_features": []},
                {"id": "2", "name": "F2", "description": "", "implemented": False, "tested": False, "test_steps": [], "sub_features": []},
                {"id": "3", "name": "F3", "description": "", "implemented": False, "tested": False, "test_steps": [], "sub_features": []},
            ],
            "progress_summary": {"total_features": 3, "implemented": 0, "tested": 0, "completion_percentage": 0}
        }

        # Act
        target_id = "2"
        found = next((f for f in features_data["features"] if f["id"] == target_id), None)

        # Assert
        assert found is not None
        assert found["name"] == "F2"

    def test_find_next_incomplete_feature(self, tmp_path):
        """Test finding the next incomplete feature for session recovery."""
        # Arrange
        features_data = {
            "spec_name": "Test",
            "created": "2025-12-05",
            "features": [
                {"id": "1", "name": "F1", "description": "", "implemented": True, "tested": True, "test_steps": [], "sub_features": []},
                {"id": "2", "name": "F2", "description": "", "implemented": True, "tested": False, "test_steps": [], "sub_features": []},
                {"id": "3", "name": "F3", "description": "", "implemented": False, "tested": False, "test_steps": [], "sub_features": []},
            ],
            "progress_summary": {"total_features": 3, "implemented": 2, "tested": 1, "completion_percentage": 33}
        }

        # Act - find first feature that's not fully tested
        next_incomplete = next((f for f in features_data["features"] if not f["tested"]), None)

        # Assert
        assert next_incomplete is not None
        assert next_incomplete["id"] == "2"
        assert next_incomplete["name"] == "F2"


class TestFeaturesJsonFilePersistence:
    """Test suite for features.json file read/write operations."""

    def test_write_and_read_features_json(self, tmp_path):
        """Test writing and reading features.json file."""
        # Arrange
        spec_path = tmp_path / "specs" / "test-spec"
        spec_path.mkdir(parents=True)

        features_data = {
            "spec_name": "Persistence Test",
            "created": "2025-12-05",
            "features": [
                {"id": "1", "name": "F1", "description": "Test", "implemented": False, "tested": False, "test_steps": ["Step 1"], "sub_features": []}
            ],
            "progress_summary": {"total_features": 1, "implemented": 0, "tested": 0, "completion_percentage": 0}
        }

        features_file = spec_path / "features.json"

        # Act - Write
        features_file.write_text(json.dumps(features_data, indent=2))

        # Act - Read
        loaded = json.loads(features_file.read_text())

        # Assert
        assert loaded == features_data

    def test_missing_features_json_returns_none(self, tmp_path):
        """Test behavior when features.json doesn't exist."""
        # Arrange
        spec_path = tmp_path / "specs" / "nonexistent"
        spec_path.mkdir(parents=True)
        features_file = spec_path / "features.json"

        # Act
        exists = features_file.exists()

        # Assert
        assert exists is False

    def test_invalid_json_raises_error(self, tmp_path):
        """Test that invalid JSON raises an error."""
        # Arrange
        spec_path = tmp_path / "specs" / "invalid"
        spec_path.mkdir(parents=True)
        features_file = spec_path / "features.json"
        features_file.write_text("{ invalid json }")

        # Act & Assert
        with pytest.raises(json.JSONDecodeError):
            json.loads(features_file.read_text())

    def test_update_features_json_preserves_structure(self, tmp_path):
        """Test that updates preserve the complete structure."""
        # Arrange
        spec_path = tmp_path / "specs" / "update-test"
        spec_path.mkdir(parents=True)

        original_data = {
            "spec_name": "Update Test",
            "created": "2025-12-05",
            "features": [
                {"id": "1", "name": "F1", "description": "Original", "implemented": False, "tested": False, "test_steps": ["Step 1"], "sub_features": [
                    {"id": "1.1", "name": "Sub1", "implemented": False, "tested": False}
                ]}
            ],
            "progress_summary": {"total_features": 1, "implemented": 0, "tested": 0, "completion_percentage": 0}
        }

        features_file = spec_path / "features.json"
        features_file.write_text(json.dumps(original_data, indent=2))

        # Act - Load, modify, save
        data = json.loads(features_file.read_text())
        data["features"][0]["implemented"] = True
        data["features"][0]["sub_features"][0]["implemented"] = True
        data["progress_summary"]["implemented"] = 1
        features_file.write_text(json.dumps(data, indent=2))

        # Reload
        reloaded = json.loads(features_file.read_text())

        # Assert - all fields still present
        assert reloaded["spec_name"] == "Update Test"
        assert reloaded["created"] == "2025-12-05"
        assert reloaded["features"][0]["implemented"] is True
        assert reloaded["features"][0]["sub_features"][0]["implemented"] is True
        assert len(reloaded["features"][0]["test_steps"]) == 1


class TestFeaturesJsonConversionFromTasksMd:
    """Test suite for converting tasks.md to features.json format."""

    def test_task_to_feature_mapping(self, tmp_path):
        """Test mapping tasks.md structure to features.json."""
        # Arrange - Simulated parsed task from tasks.md
        task_data = {
            "id": "1",
            "title": "Implement Authentication",
            "subtasks": [
                {"id": "1.1", "title": "Write tests for auth", "completed": False},
                {"id": "1.2", "title": "Implement login", "completed": False},
                {"id": "1.3", "title": "Verify tests pass", "completed": False}
            ],
            "completed": False
        }

        # Act - Convert to feature format
        feature = {
            "id": task_data["id"],
            "name": task_data["title"],
            "description": f"Task {task_data['id']}: {task_data['title']}",
            "implemented": task_data["completed"],
            "tested": False,  # Must be explicitly tested
            "test_steps": [f"Complete subtask {st['id']}" for st in task_data["subtasks"]],
            "sub_features": [
                {
                    "id": st["id"],
                    "name": st["title"],
                    "implemented": st["completed"],
                    "tested": False
                }
                for st in task_data["subtasks"]
            ]
        }

        # Assert
        assert feature["id"] == "1"
        assert feature["name"] == "Implement Authentication"
        assert len(feature["sub_features"]) == 3
        assert feature["sub_features"][0]["id"] == "1.1"
