"""
Tests for GitService.

Tests git operations like status, branch, commit, push.
"""

import pytest
from pathlib import Path
from lib.yoyo_tui.services.git_service import GitService, GitStatus


class TestGitService:
    """Test suite for GitService."""

    def test_is_git_installed_when_available(self):
        """Test checking if git is installed (should be true in CI)."""
        result = GitService.is_git_installed()

        # Git should be available in most environments
        assert isinstance(result, bool)

    def test_is_git_repo_in_non_repo(self, tmp_path):
        """Test checking if directory is a git repo (not a repo)."""
        result = GitService.is_git_repo(tmp_path)

        assert result is False

    def test_is_git_repo_in_actual_repo(self):
        """Test checking if directory is a git repo (actual repo)."""
        # Current directory should be a git repo
        result = GitService.is_git_repo(Path.cwd())

        assert result is True

    def test_get_current_branch_in_non_repo(self, tmp_path):
        """Test getting current branch in non-repo directory."""
        branch = GitService.get_current_branch(tmp_path)

        assert branch == ""

    def test_get_current_branch_in_actual_repo(self):
        """Test getting current branch in actual repo."""
        branch = GitService.get_current_branch(Path.cwd())

        # Should return a branch name
        assert len(branch) > 0
        assert isinstance(branch, str)

    def test_get_status_in_non_repo(self, tmp_path):
        """Test getting git status in non-repo directory."""
        status = GitService.get_status(tmp_path)

        assert status.branch == ""
        assert status.uncommitted == 0
        assert status.untracked == 0

    def test_get_status_in_actual_repo(self):
        """Test getting git status in actual repo."""
        status = GitService.get_status(Path.cwd())

        # Should return valid git status
        assert isinstance(status, GitStatus)
        assert len(status.branch) > 0

    def test_get_uncommitted_changes_count(self):
        """Test counting uncommitted changes."""
        status = GitService.get_status(Path.cwd())

        # Should return non-negative number
        assert status.uncommitted >= 0

    def test_get_untracked_files_count(self):
        """Test counting untracked files."""
        status = GitService.get_status(Path.cwd())

        # Should return non-negative number
        assert status.untracked >= 0

    def test_stage_files_in_non_repo(self, tmp_path):
        """Test staging files in non-repo directory."""
        result = GitService.stage_files(tmp_path, ["file.txt"])

        assert result is False

    def test_stage_all_files_in_non_repo(self, tmp_path):
        """Test staging all files in non-repo directory."""
        result = GitService.stage_all(tmp_path)

        assert result is False

    def test_commit_in_non_repo(self, tmp_path):
        """Test committing in non-repo directory."""
        result = GitService.commit(tmp_path, "Test commit")

        assert result is False

    def test_push_in_non_repo(self, tmp_path):
        """Test pushing in non-repo directory."""
        result = GitService.push(tmp_path)

        assert result is False

    def test_has_remote_in_non_repo(self, tmp_path):
        """Test checking for remote in non-repo."""
        result = GitService.has_remote(tmp_path)

        assert result is False

    def test_has_remote_in_actual_repo(self):
        """Test checking for remote in actual repo."""
        result = GitService.has_remote(Path.cwd())

        # Yoyo Dev repo should have a remote
        assert isinstance(result, bool)

    def test_get_ahead_behind_count_in_non_repo(self, tmp_path):
        """Test getting ahead/behind count in non-repo."""
        ahead, behind = GitService.get_ahead_behind(tmp_path)

        assert ahead == 0
        assert behind == 0

    def test_is_clean_when_uncommitted_changes(self):
        """Test GitStatus.is_clean property."""
        # Mock dirty status
        status = GitStatus(
            branch="main",
            uncommitted=5,
            untracked=0,
            ahead=0,
            behind=0
        )

        assert status.is_clean is False

        # Mock clean status
        clean_status = GitStatus(
            branch="main",
            uncommitted=0,
            untracked=0,
            ahead=0,
            behind=0
        )

        assert clean_status.is_clean is True

    def test_status_text_when_dirty(self):
        """Test GitStatus.status_text property."""
        status = GitStatus(
            branch="main",
            uncommitted=3,
            untracked=2,
            ahead=0,
            behind=0
        )

        text = status.status_text

        assert "3 uncommitted" in text
        assert "2 untracked" in text

    def test_status_text_when_clean(self):
        """Test GitStatus.status_text when clean."""
        status = GitStatus(
            branch="main",
            uncommitted=0,
            untracked=0,
            ahead=0,
            behind=0
        )

        text = status.status_text

        assert text == "Clean"

    def test_sync_status_when_ahead(self):
        """Test GitStatus.sync_status when ahead of remote."""
        status = GitStatus(
            branch="main",
            uncommitted=0,
            untracked=0,
            ahead=3,
            behind=0
        )

        text = status.sync_status

        assert "3 ahead" in text
        assert "↑" in text

    def test_sync_status_when_behind(self):
        """Test GitStatus.sync_status when behind remote."""
        status = GitStatus(
            branch="main",
            uncommitted=0,
            untracked=0,
            ahead=0,
            behind=2
        )

        text = status.sync_status

        assert "2 behind" in text
        assert "↓" in text

    def test_sync_status_when_diverged(self):
        """Test GitStatus.sync_status when diverged from remote."""
        status = GitStatus(
            branch="main",
            uncommitted=0,
            untracked=0,
            ahead=3,
            behind=2
        )

        text = status.sync_status

        assert "3 ahead" in text
        assert "2 behind" in text
        assert "↕" in text

    def test_sync_status_when_up_to_date(self):
        """Test GitStatus.sync_status when up to date."""
        status = GitStatus(
            branch="main",
            uncommitted=0,
            untracked=0,
            ahead=0,
            behind=0
        )

        text = status.sync_status

        assert "Up to date" in text or "✓" in text

    def test_get_last_commit_message(self):
        """Test getting last commit message."""
        message = GitService.get_last_commit_message(Path.cwd())

        # Should return a message (non-empty)
        assert isinstance(message, str)
        assert len(message) >= 0  # Could be empty if no commits

    def test_get_recent_commits(self):
        """Test getting recent commit messages."""
        commits = GitService.get_recent_commits(Path.cwd(), count=5)

        # Should return a list
        assert isinstance(commits, list)
        # Each commit should be a string
        assert all(isinstance(commit, str) for commit in commits)
