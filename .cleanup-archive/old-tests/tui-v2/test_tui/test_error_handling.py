"""
Test error handling in TUI widgets and services.

Tests verify that TUI never crashes on bad data or missing files:
- Corrupted state.json files
- Missing .yoyo-dev directory
- Failed git operations
- Missing task files
"""

import json
import pytest
from pathlib import Path
from unittest.mock import Mock, patch, MagicMock
import tempfile
import shutil

from lib.yoyo_tui.widgets.task_tree import TaskTree
from lib.yoyo_tui.widgets.spec_list import SpecList
from lib.yoyo_tui.widgets.git_status import GitStatus
from lib.yoyo_tui.services.data_manager import DataManager
from lib.yoyo_tui.models import TaskData


class TestTaskTreeErrorHandling:
    """Test TaskTree widget error handling."""

    def test_loading_state_on_init(self):
        """Test TaskTree shows loading state initially."""
        task_tree = TaskTree()
        assert task_tree._is_loading is True

    def test_empty_state_after_load(self):
        """Test TaskTree shows helpful empty state when no tasks."""
        task_tree = TaskTree()
        empty_data = TaskData.empty()
        task_tree.load_tasks(empty_data)

        assert task_tree._is_loading is False
        assert task_tree.task_data == empty_data

    def test_handles_none_task_data(self):
        """Test TaskTree handles None task data gracefully."""
        task_tree = TaskTree(task_data=None)
        assert task_tree.task_data is not None  # Should default to empty
        assert len(task_tree.task_data.parent_tasks) == 0


class TestSpecListErrorHandling:
    """Test SpecList widget error handling for corrupted data."""

    def test_corrupted_state_json_in_spec(self, tmp_path):
        """Test SpecList handles corrupted state.json in spec folder."""
        # Create spec folder with corrupted state.json
        yoyo_dev = tmp_path / ".yoyo-dev"
        specs_dir = yoyo_dev / "specs"
        spec_folder = specs_dir / "2025-10-17-test-spec"
        spec_folder.mkdir(parents=True)

        # Write corrupted JSON
        state_file = spec_folder / "state.json"
        state_file.write_text("{this is not valid json")

        # Create SpecList widget
        spec_list = SpecList(yoyo_dev_path=yoyo_dev)

        # Load specs - should not crash
        specs = spec_list._load_specs_sync()

        # Should return spec with default values (not crash)
        assert len(specs) == 1
        assert specs[0]['name'] == "2025-10-17-test-spec"
        assert specs[0]['progress'] == 0  # Default value
        assert specs[0]['status'] == "Not Started"  # Default status

    def test_corrupted_state_json_in_fix(self, tmp_path):
        """Test SpecList handles corrupted state.json in fix folder."""
        # Create fix folder with corrupted state.json
        yoyo_dev = tmp_path / ".yoyo-dev"
        fixes_dir = yoyo_dev / "fixes"
        fix_folder = fixes_dir / "2025-10-17-test-fix"
        fix_folder.mkdir(parents=True)

        # Write corrupted JSON
        state_file = fix_folder / "state.json"
        state_file.write_text("not json at all!")

        # Create SpecList widget
        spec_list = SpecList(yoyo_dev_path=yoyo_dev)

        # Load fixes - should not crash
        fixes = spec_list._load_fixes_sync()

        # Should return fix with default values (not crash)
        assert len(fixes) == 1
        assert fixes[0]['name'] == "2025-10-17-test-fix"
        assert fixes[0]['progress'] == 0  # Default value
        assert fixes[0]['status'] == "Not Started"  # Default status

    def test_missing_specs_directory(self, tmp_path):
        """Test SpecList handles missing specs directory gracefully."""
        yoyo_dev = tmp_path / ".yoyo-dev"
        yoyo_dev.mkdir()

        # Don't create specs directory
        spec_list = SpecList(yoyo_dev_path=yoyo_dev)

        # Load specs - should not crash
        specs = spec_list._load_specs_sync()

        # Should return empty list
        assert specs == []

    def test_missing_fixes_directory(self, tmp_path):
        """Test SpecList handles missing fixes directory gracefully."""
        yoyo_dev = tmp_path / ".yoyo-dev"
        yoyo_dev.mkdir()

        # Don't create fixes directory
        spec_list = SpecList(yoyo_dev_path=yoyo_dev)

        # Load fixes - should not crash
        fixes = spec_list._load_fixes_sync()

        # Should return empty list
        assert fixes == []

    def test_permission_error_on_state_file(self, tmp_path):
        """Test SpecList handles permission errors gracefully."""
        # Create spec with state.json
        yoyo_dev = tmp_path / ".yoyo-dev"
        specs_dir = yoyo_dev / "specs"
        spec_folder = specs_dir / "2025-10-17-test-spec"
        spec_folder.mkdir(parents=True)

        state_file = spec_folder / "state.json"
        state_file.write_text('{"execution_started": true}')

        # Mock file open to raise PermissionError
        spec_list = SpecList(yoyo_dev_path=yoyo_dev)

        with patch('builtins.open', side_effect=PermissionError("Access denied")):
            specs = spec_list._load_specs_sync()

        # Should return spec with default values (not crash)
        assert len(specs) == 1
        assert specs[0]['progress'] == 0  # Default value


class TestDataManagerErrorHandling:
    """Test DataManager error handling for missing directories."""

    def test_missing_yoyo_dev_directory(self, tmp_path, monkeypatch):
        """Test DataManager handles missing .yoyo-dev directory."""
        # Change to temp directory with no .yoyo-dev
        monkeypatch.chdir(tmp_path)

        # Load project info - should not crash
        project_info = DataManager.load_project_info()

        # Should return default values
        assert project_info['name'] == tmp_path.name
        assert project_info['has_yoyo_dev'] is False
        assert project_info['mission'] == ""

    def test_cannot_get_current_directory(self):
        """Test DataManager handles getcwd() failure."""
        with patch('os.getcwd', side_effect=OSError("No such directory")):
            # Load project info - should not crash
            project_info = DataManager.load_project_info()

        # Should return fallback values
        assert project_info['name'] == "Unknown"
        assert project_info['has_yoyo_dev'] is False

    def test_permission_error_on_yoyo_dev(self, tmp_path, monkeypatch):
        """Test DataManager handles permission errors on .yoyo-dev."""
        monkeypatch.chdir(tmp_path)

        yoyo_dev = tmp_path / ".yoyo-dev"
        yoyo_dev.mkdir()

        # Mock exists() to raise PermissionError
        with patch.object(Path, 'exists', side_effect=PermissionError("Access denied")):
            project_info = DataManager.load_project_info()

        # Should handle gracefully
        assert project_info['has_yoyo_dev'] is False

    def test_task_loading_with_filesystem_error(self):
        """Test DataManager handles filesystem errors when loading tasks."""
        with patch('lib.yoyo_tui.services.task_parser.TaskParser.find_and_parse_tasks',
                   side_effect=OSError("File system error")):
            # Load tasks - should not crash
            task_data = DataManager.load_active_tasks()

        # Should return empty TaskData
        assert task_data is not None
        assert len(task_data.parent_tasks) == 0

    def test_task_loading_with_permission_error(self):
        """Test DataManager handles permission errors when loading tasks."""
        with patch('lib.yoyo_tui.services.task_parser.TaskParser.find_and_parse_tasks',
                   side_effect=PermissionError("Access denied")):
            # Load tasks - should not crash
            task_data = DataManager.load_active_tasks()

        # Should return empty TaskData
        assert task_data is not None
        assert len(task_data.parent_tasks) == 0


class TestGitStatusErrorHandling:
    """Test GitStatus widget error handling for failed git operations."""

    @pytest.mark.asyncio
    async def test_git_operation_failure(self):
        """Test GitStatus handles git operation failures gracefully."""
        git_status = GitStatus()

        # Mock _generate_status_text to raise an exception
        with patch.object(git_status, '_generate_status_text',
                         side_effect=RuntimeError("Git command failed")):
            # Update status - should not crash
            await git_status._update_status_async()

        # Widget should still exist (not crashed)
        assert git_status is not None

    @pytest.mark.asyncio
    async def test_git_service_timeout(self):
        """Test GitStatus handles git timeouts gracefully."""
        git_status = GitStatus()

        # Mock _generate_status_text to raise timeout
        import subprocess
        with patch.object(git_status, '_generate_status_text',
                         side_effect=subprocess.TimeoutExpired("git", 5)):
            # Update status - should not crash
            await git_status._update_status_async()

        # Widget should still exist (not crashed)
        assert git_status is not None

    @pytest.mark.asyncio
    async def test_git_not_installed(self):
        """Test GitStatus handles missing git installation."""
        git_status = GitStatus()

        # Mock is_git_installed to return False
        with patch('lib.yoyo_tui.services.git_service.GitService.is_git_installed',
                  return_value=False):
            status_text = await git_status._generate_status_text()

        # Should show "Git not available"
        assert "Git not available" in status_text

    @pytest.mark.asyncio
    async def test_not_a_git_repo(self):
        """Test GitStatus handles non-git directories."""
        git_status = GitStatus()

        # Mock is_git_repo_async to return False
        with patch('lib.yoyo_tui.services.git_service.GitService.is_git_repo_async',
                  return_value=False):
            status_text = await git_status._generate_status_text()

        # Should show "Not a git repository"
        assert "Not a git repository" in status_text


class TestIntegrationErrorHandling:
    """Integration tests for error handling across components."""

    def test_tui_never_crashes_on_corrupted_data(self, tmp_path, monkeypatch):
        """Integration test: TUI handles all error conditions without crashing."""
        monkeypatch.chdir(tmp_path)

        # Create corrupted .yoyo-dev structure
        yoyo_dev = tmp_path / ".yoyo-dev"
        specs_dir = yoyo_dev / "specs"
        spec_folder = specs_dir / "2025-10-17-test"
        spec_folder.mkdir(parents=True)

        # Corrupted state.json
        (spec_folder / "state.json").write_text("not json!")

        # Missing tasks.md
        # No product directory
        # No fixes directory

        # Try to load all data - should not crash
        project_info = DataManager.load_project_info()
        task_data = DataManager.load_active_tasks()
        spec_list = SpecList(yoyo_dev_path=yoyo_dev)
        specs = spec_list._load_specs_sync()

        # All operations should succeed (with defaults)
        assert project_info is not None
        assert task_data is not None
        assert specs is not None

    def test_refresh_all_data_with_errors(self, tmp_path, monkeypatch):
        """Test refresh_all_data handles errors gracefully."""
        monkeypatch.chdir(tmp_path)

        # Call refresh with no .yoyo-dev - should not crash
        data = DataManager.refresh_all_data()

        assert data is not None
        assert 'task_data' in data
        assert 'project_info' in data
        assert data['specs_count'] == 0
        assert data['fixes_count'] == 0
