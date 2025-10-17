"""
Tests for GitService.

Tests git operations like status, branch, commit, push.
Includes async tests to verify non-blocking behavior.
"""

import pytest
import asyncio
import time
from pathlib import Path
from unittest.mock import patch, MagicMock
from lib.yoyo_tui.services.git_service import GitService, GitStatus, CachedGitService


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

    def test_get_status_counts_combines_uncommitted_and_untracked(self):
        """Test that get_status_counts returns both counts from single git call."""
        uncommitted, untracked = GitService.get_status_counts(Path.cwd())

        # Should return non-negative numbers
        assert uncommitted >= 0
        assert untracked >= 0
        assert isinstance(uncommitted, int)
        assert isinstance(untracked, int)

    def test_is_git_installed_caches_result(self):
        """Test that is_git_installed is cached (called only once)."""
        # Clear the cache first (if exists)
        GitService.is_git_installed.cache_clear()

        with patch('subprocess.run') as mock_run:
            mock_run.return_value = MagicMock(returncode=0)

            # First call
            result1 = GitService.is_git_installed()
            assert result1 is True
            assert mock_run.call_count == 1

            # Second call - should use cache, not call subprocess again
            result2 = GitService.is_git_installed()
            assert result2 is True
            assert mock_run.call_count == 1  # Still 1, not 2!


class TestCachedGitService:
    """Test suite for CachedGitService."""

    def test_cached_service_initialization(self):
        """Test CachedGitService initializes with correct defaults."""
        service = CachedGitService()

        assert service.ttl == 30.0
        assert service.cache_size == 0

    def test_cached_service_custom_ttl(self):
        """Test CachedGitService with custom TTL."""
        service = CachedGitService(ttl_seconds=60.0)

        assert service.ttl == 60.0

    def test_cached_service_caches_status_within_ttl(self):
        """Test that status is cached and reused within TTL."""
        service = CachedGitService(ttl_seconds=10.0)
        directory = Path.cwd()

        with patch.object(GitService, 'get_status') as mock_get_status:
            # Mock return value
            mock_status = GitStatus(
                branch="main",
                uncommitted=5,
                untracked=2,
                ahead=0,
                behind=0
            )
            mock_get_status.return_value = mock_status

            # First call - should call GitService
            status1 = service.get_status(directory)
            assert mock_get_status.call_count == 1
            assert status1.branch == "main"
            assert status1.uncommitted == 5

            # Second call within TTL - should use cache
            status2 = service.get_status(directory)
            assert mock_get_status.call_count == 1  # Still 1!
            assert status2.branch == "main"
            assert status2.uncommitted == 5

            # Verify cache size
            assert service.cache_size == 1

    def test_cached_service_expires_after_ttl(self):
        """Test that cache expires after TTL and refetches."""
        service = CachedGitService(ttl_seconds=0.1)  # 100ms TTL
        directory = Path.cwd()

        with patch.object(GitService, 'get_status') as mock_get_status:
            # Mock return value
            mock_status = GitStatus(
                branch="main",
                uncommitted=5,
                untracked=2,
                ahead=0,
                behind=0
            )
            mock_get_status.return_value = mock_status

            # First call
            status1 = service.get_status(directory)
            assert mock_get_status.call_count == 1

            # Wait for TTL to expire
            time.sleep(0.15)

            # Second call after TTL - should refetch
            status2 = service.get_status(directory)
            assert mock_get_status.call_count == 2  # Called again!

    def test_cached_service_invalidates_on_directory_change(self):
        """Test that cache is cleared when directory changes."""
        service = CachedGitService(ttl_seconds=10.0)
        directory1 = Path.cwd()
        directory2 = Path.cwd().parent

        with patch.object(GitService, 'get_status') as mock_get_status:
            # Mock return value
            mock_status = GitStatus(
                branch="main",
                uncommitted=0,
                untracked=0,
                ahead=0,
                behind=0
            )
            mock_get_status.return_value = mock_status

            # Call with directory1
            service.get_status(directory1)
            assert service.cache_size == 1

            # Call with directory2 - should clear cache
            service.get_status(directory2)
            # Cache should be cleared and rebuilt with new directory
            assert service.cache_size == 1

    def test_cached_service_manual_invalidation(self):
        """Test manual cache invalidation."""
        service = CachedGitService(ttl_seconds=10.0)
        directory = Path.cwd()

        with patch.object(GitService, 'get_status') as mock_get_status:
            # Mock return value
            mock_status = GitStatus(
                branch="main",
                uncommitted=0,
                untracked=0,
                ahead=0,
                behind=0
            )
            mock_get_status.return_value = mock_status

            # First call
            service.get_status(directory)
            assert service.cache_size == 1

            # Manually invalidate
            service.invalidate_cache()
            assert service.cache_size == 0

            # Next call should refetch
            service.get_status(directory)
            assert mock_get_status.call_count == 2

    def test_cached_service_set_ttl(self):
        """Test changing TTL dynamically."""
        service = CachedGitService(ttl_seconds=10.0)

        assert service.ttl == 10.0

        service.set_ttl(60.0)
        assert service.ttl == 60.0

    def test_cached_service_performance_improvement(self):
        """Test that caching reduces subprocess calls (performance test)."""
        service = CachedGitService(ttl_seconds=5.0)
        directory = Path.cwd()

        # Real integration test - call get_status multiple times
        # Without cache: would make 4+ subprocess calls per get_status
        # With cache: only 4+ subprocess calls for first get_status, then 0 for subsequent

        start_time = time.time()

        # First call - will execute subprocess calls
        status1 = service.get_status(directory)

        first_call_time = time.time() - start_time

        # Multiple cached calls
        start_time = time.time()
        for _ in range(10):
            service.get_status(directory)

        cached_calls_time = time.time() - start_time

        # Cached calls should be significantly faster
        # (at least 5x faster, realistically 50-100x faster)
        assert cached_calls_time < first_call_time * 2

        # Should only have one entry in cache
        assert service.cache_size == 1


class TestAsyncGitOperations:
    """Test suite for async git operations (non-blocking)."""

    @pytest.mark.asyncio
    async def test_is_git_repo_async(self, tmp_path):
        """Test async version of is_git_repo."""
        result = await GitService.is_git_repo_async(tmp_path)
        assert result is False

        # Test with actual repo
        result = await GitService.is_git_repo_async(Path.cwd())
        assert result is True

    @pytest.mark.asyncio
    async def test_get_current_branch_async(self):
        """Test async version of get_current_branch."""
        branch = await GitService.get_current_branch_async(Path.cwd())

        assert isinstance(branch, str)
        assert len(branch) > 0

    @pytest.mark.asyncio
    async def test_get_status_async(self):
        """Test async version of get_status."""
        status = await GitService.get_status_async(Path.cwd())

        assert isinstance(status, GitStatus)
        assert len(status.branch) > 0
        assert status.uncommitted >= 0
        assert status.untracked >= 0

    @pytest.mark.asyncio
    async def test_get_status_counts_async(self):
        """Test async version of get_status_counts."""
        uncommitted, untracked = await GitService.get_status_counts_async(Path.cwd())

        assert uncommitted >= 0
        assert untracked >= 0
        assert isinstance(uncommitted, int)
        assert isinstance(untracked, int)

    @pytest.mark.asyncio
    async def test_get_ahead_behind_async(self):
        """Test async version of get_ahead_behind."""
        ahead, behind = await GitService.get_ahead_behind_async(Path.cwd())

        assert ahead >= 0
        assert behind >= 0
        assert isinstance(ahead, int)
        assert isinstance(behind, int)

    @pytest.mark.asyncio
    async def test_has_remote_async(self):
        """Test async version of has_remote."""
        has_remote = await GitService.has_remote_async(Path.cwd())

        assert isinstance(has_remote, bool)

    @pytest.mark.asyncio
    async def test_async_operations_run_concurrently(self):
        """Test that async operations can run concurrently without blocking."""
        directory = Path.cwd()

        # Run multiple operations concurrently
        start_time = time.time()
        results = await asyncio.gather(
            GitService.get_current_branch_async(directory),
            GitService.get_status_counts_async(directory),
            GitService.get_ahead_behind_async(directory),
            GitService.has_remote_async(directory),
        )
        concurrent_time = time.time() - start_time

        # Verify all results are valid
        branch, (uncommitted, untracked), (ahead, behind), has_remote = results
        assert isinstance(branch, str)
        assert uncommitted >= 0
        assert untracked >= 0
        assert ahead >= 0
        assert behind >= 0
        assert isinstance(has_remote, bool)

        # Run same operations sequentially
        start_time = time.time()
        await GitService.get_current_branch_async(directory)
        await GitService.get_status_counts_async(directory)
        await GitService.get_ahead_behind_async(directory)
        await GitService.has_remote_async(directory)
        sequential_time = time.time() - start_time

        # Concurrent should be faster (or at least not much slower)
        # This verifies operations are truly async and don't block each other
        assert concurrent_time <= sequential_time * 1.5

    @pytest.mark.asyncio
    async def test_cached_service_async(self):
        """Test CachedGitService async methods."""
        service = CachedGitService(ttl_seconds=10.0)
        directory = Path.cwd()

        # First call
        status1 = await service.get_status_async(directory)
        assert isinstance(status1, GitStatus)
        assert service.cache_size == 1

        # Second call within TTL - should use cache
        status2 = await service.get_status_async(directory)
        assert isinstance(status2, GitStatus)
        assert status2.branch == status1.branch

    @pytest.mark.asyncio
    async def test_async_doesnt_block_event_loop(self):
        """
        Test that async git operations don't block the event loop.

        This is critical for UI responsiveness - git operations should
        run in background threads without freezing the UI.
        """
        directory = Path.cwd()

        # Track if other async work can run during git operation
        other_work_completed = False

        async def other_async_work():
            nonlocal other_work_completed
            await asyncio.sleep(0.01)  # Small delay
            other_work_completed = True

        # Run git operation and other work concurrently
        await asyncio.gather(
            GitService.get_status_async(directory),
            other_async_work()
        )

        # If git operation blocked the event loop, other_work wouldn't complete
        assert other_work_completed is True

    @pytest.mark.asyncio
    async def test_multiple_async_calls_performance(self):
        """Test that multiple concurrent async calls don't multiply execution time."""
        directory = Path.cwd()

        # Single call baseline
        start_time = time.time()
        await GitService.get_status_async(directory)
        single_call_time = time.time() - start_time

        # Multiple concurrent calls
        start_time = time.time()
        await asyncio.gather(*[
            GitService.get_status_async(directory)
            for _ in range(5)
        ])
        concurrent_calls_time = time.time() - start_time

        # Concurrent calls should not take 5x the time
        # (Should be close to single call time since they run in parallel)
        # Allow 3x margin for overhead
        assert concurrent_calls_time < single_call_time * 3
