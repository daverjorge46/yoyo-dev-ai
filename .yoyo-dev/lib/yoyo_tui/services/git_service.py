"""
GitService

Provides git operations for the TUI (status, branch, commit, push).
All operations use subprocess to run git commands.

Async methods are provided to prevent blocking the UI thread.
"""

import asyncio
import subprocess
import re
import time
from functools import lru_cache
from pathlib import Path
from typing import Optional, Tuple, List, Dict

from ..models import GitStatus


class GitService:
    """
    Git operations service.

    Handles:
    - Repository detection
    - Status information
    - Branch management
    - Staging, committing, pushing
    - Remote synchronization
    """

    @staticmethod
    @lru_cache(maxsize=1)
    def is_git_installed() -> bool:
        """
        Check if git is installed and available.

        Cached permanently since git installation doesn't change during runtime.

        Returns:
            True if git is installed, False otherwise
        """
        try:
            subprocess.run(
                ['git', '--version'],
                capture_output=True,
                check=True,
                timeout=5
            )
            return True
        except (subprocess.CalledProcessError, FileNotFoundError, subprocess.TimeoutExpired):
            return False

    @staticmethod
    def is_git_repo(directory: Path) -> bool:
        """
        Check if directory is a git repository.

        Args:
            directory: Directory to check

        Returns:
            True if git repo, False otherwise
        """
        try:
            subprocess.run(
                ['git', 'rev-parse', '--git-dir'],
                cwd=str(directory),
                capture_output=True,
                check=True,
                timeout=5
            )
            return True
        except (subprocess.CalledProcessError, FileNotFoundError, subprocess.TimeoutExpired):
            return False

    @staticmethod
    def get_current_branch(directory: Path) -> str:
        """
        Get current git branch name.

        Args:
            directory: Repository directory

        Returns:
            Branch name or empty string if not in a repo
        """
        try:
            result = subprocess.run(
                ['git', 'rev-parse', '--abbrev-ref', 'HEAD'],
                cwd=str(directory),
                capture_output=True,
                check=True,
                text=True,
                timeout=5
            )
            return result.stdout.strip()
        except (subprocess.CalledProcessError, FileNotFoundError, subprocess.TimeoutExpired):
            return ""

    @staticmethod
    def get_status(directory: Path) -> GitStatus:
        """
        Get comprehensive git status.

        Args:
            directory: Repository directory

        Returns:
            GitStatus object with all status information
        """
        if not GitService.is_git_repo(directory):
            return GitStatus(
                branch="",
                uncommitted=0,
                untracked=0,
                ahead=0,
                behind=0
            )

        branch = GitService.get_current_branch(directory)
        uncommitted, untracked = GitService.get_status_counts(directory)
        ahead, behind = GitService.get_ahead_behind(directory)

        return GitStatus(
            branch=branch,
            uncommitted=uncommitted,
            untracked=untracked,
            ahead=ahead,
            behind=behind
        )

    @staticmethod
    def get_status_counts(directory: Path) -> Tuple[int, int]:
        """
        Get uncommitted and untracked file counts from a single git call.

        This combines the functionality of _count_uncommitted_changes() and
        _count_untracked_files() to avoid duplicate subprocess calls.

        Args:
            directory: Repository directory

        Returns:
            Tuple of (uncommitted_count, untracked_count)
        """
        try:
            result = subprocess.run(
                ['git', 'status', '--porcelain'],
                cwd=str(directory),
                capture_output=True,
                check=True,
                text=True,
                timeout=5
            )

            uncommitted = 0
            untracked = 0
            lines = result.stdout.strip().split('\n')

            for line in lines:
                if not line:
                    continue
                if line.startswith('??'):
                    untracked += 1
                else:
                    uncommitted += 1

            return uncommitted, untracked

        except (subprocess.CalledProcessError, FileNotFoundError, subprocess.TimeoutExpired):
            return 0, 0

    @staticmethod
    def _count_uncommitted_changes(directory: Path) -> int:
        """
        Count uncommitted changes (modified, deleted, staged).

        DEPRECATED: Use get_status_counts() instead to avoid duplicate git calls.

        Args:
            directory: Repository directory

        Returns:
            Number of uncommitted changes
        """
        uncommitted, _ = GitService.get_status_counts(directory)
        return uncommitted

    @staticmethod
    def _count_untracked_files(directory: Path) -> int:
        """
        Count untracked files.

        DEPRECATED: Use get_status_counts() instead to avoid duplicate git calls.

        Args:
            directory: Repository directory

        Returns:
            Number of untracked files
        """
        _, untracked = GitService.get_status_counts(directory)
        return untracked

    @staticmethod
    def get_ahead_behind(directory: Path) -> Tuple[int, int]:
        """
        Get number of commits ahead/behind remote.

        Args:
            directory: Repository directory

        Returns:
            Tuple of (ahead_count, behind_count)
        """
        try:
            result = subprocess.run(
                ['git', 'rev-list', '--left-right', '--count', 'HEAD...@{upstream}'],
                cwd=str(directory),
                capture_output=True,
                check=True,
                text=True,
                timeout=5
            )

            output = result.stdout.strip()
            if output:
                parts = output.split()
                if len(parts) == 2:
                    ahead = int(parts[0])
                    behind = int(parts[1])
                    return ahead, behind

            return 0, 0

        except (subprocess.CalledProcessError, FileNotFoundError, subprocess.TimeoutExpired, ValueError):
            return 0, 0

    @staticmethod
    def stage_files(directory: Path, files: List[str]) -> bool:
        """
        Stage specific files.

        Args:
            directory: Repository directory
            files: List of file paths to stage

        Returns:
            True if successful, False otherwise
        """
        if not GitService.is_git_repo(directory):
            return False

        try:
            subprocess.run(
                ['git', 'add'] + files,
                cwd=str(directory),
                capture_output=True,
                check=True,
                timeout=10
            )
            return True
        except (subprocess.CalledProcessError, FileNotFoundError, subprocess.TimeoutExpired):
            return False

    @staticmethod
    def stage_all(directory: Path) -> bool:
        """
        Stage all changes (git add -A).

        Args:
            directory: Repository directory

        Returns:
            True if successful, False otherwise
        """
        if not GitService.is_git_repo(directory):
            return False

        try:
            subprocess.run(
                ['git', 'add', '-A'],
                cwd=str(directory),
                capture_output=True,
                check=True,
                timeout=10
            )
            return True
        except (subprocess.CalledProcessError, FileNotFoundError, subprocess.TimeoutExpired):
            return False

    @staticmethod
    def commit(directory: Path, message: str) -> bool:
        """
        Create a commit with message.

        Args:
            directory: Repository directory
            message: Commit message

        Returns:
            True if successful, False otherwise
        """
        if not GitService.is_git_repo(directory):
            return False

        try:
            subprocess.run(
                ['git', 'commit', '-m', message],
                cwd=str(directory),
                capture_output=True,
                check=True,
                timeout=10
            )
            return True
        except (subprocess.CalledProcessError, FileNotFoundError, subprocess.TimeoutExpired):
            return False

    @staticmethod
    def push(directory: Path, remote: str = "origin", branch: Optional[str] = None) -> bool:
        """
        Push commits to remote.

        Args:
            directory: Repository directory
            remote: Remote name (default: origin)
            branch: Branch name (default: current branch)

        Returns:
            True if successful, False otherwise
        """
        if not GitService.is_git_repo(directory):
            return False

        cmd = ['git', 'push', remote]
        if branch:
            cmd.append(branch)

        try:
            subprocess.run(
                cmd,
                cwd=str(directory),
                capture_output=True,
                check=True,
                timeout=30  # Pushing can take longer
            )
            return True
        except (subprocess.CalledProcessError, FileNotFoundError, subprocess.TimeoutExpired):
            return False

    @staticmethod
    def has_remote(directory: Path) -> bool:
        """
        Check if repository has at least one remote.

        Args:
            directory: Repository directory

        Returns:
            True if has remote, False otherwise
        """
        if not GitService.is_git_repo(directory):
            return False

        try:
            result = subprocess.run(
                ['git', 'remote'],
                cwd=str(directory),
                capture_output=True,
                check=True,
                text=True,
                timeout=5
            )
            return bool(result.stdout.strip())
        except (subprocess.CalledProcessError, FileNotFoundError, subprocess.TimeoutExpired):
            return False

    @staticmethod
    def get_last_commit_message(directory: Path) -> str:
        """
        Get the last commit message.

        Args:
            directory: Repository directory

        Returns:
            Last commit message or empty string
        """
        if not GitService.is_git_repo(directory):
            return ""

        try:
            result = subprocess.run(
                ['git', 'log', '-1', '--pretty=%B'],
                cwd=str(directory),
                capture_output=True,
                check=True,
                text=True,
                timeout=5
            )
            return result.stdout.strip()
        except (subprocess.CalledProcessError, FileNotFoundError, subprocess.TimeoutExpired):
            return ""

    @staticmethod
    def get_recent_commits(directory: Path, count: int = 5) -> List[str]:
        """
        Get recent commit messages.

        Args:
            directory: Repository directory
            count: Number of commits to retrieve

        Returns:
            List of commit messages
        """
        if not GitService.is_git_repo(directory):
            return []

        try:
            result = subprocess.run(
                ['git', 'log', f'-{count}', '--pretty=%s'],
                cwd=str(directory),
                capture_output=True,
                check=True,
                text=True,
                timeout=5
            )
            messages = result.stdout.strip().split('\n')
            return [msg for msg in messages if msg]
        except (subprocess.CalledProcessError, FileNotFoundError, subprocess.TimeoutExpired):
            return []

    # ============================================================================
    # Async Methods (Non-blocking)
    # ============================================================================

    @staticmethod
    async def is_git_repo_async(directory: Path) -> bool:
        """
        Check if directory is a git repository (async version).

        Runs in background thread to prevent blocking UI.

        Args:
            directory: Directory to check

        Returns:
            True if git repo, False otherwise
        """
        return await asyncio.to_thread(GitService.is_git_repo, directory)

    @staticmethod
    async def get_current_branch_async(directory: Path) -> str:
        """
        Get current git branch name (async version).

        Runs in background thread to prevent blocking UI.

        Args:
            directory: Repository directory

        Returns:
            Branch name or empty string if not in a repo
        """
        return await asyncio.to_thread(GitService.get_current_branch, directory)

    @staticmethod
    async def get_status_async(directory: Path) -> GitStatus:
        """
        Get comprehensive git status (async version).

        Runs in background thread to prevent blocking UI.
        This is the primary method to use from async contexts (like Textual widgets).

        Args:
            directory: Repository directory

        Returns:
            GitStatus object with all status information
        """
        return await asyncio.to_thread(GitService.get_status, directory)

    @staticmethod
    async def get_status_counts_async(directory: Path) -> Tuple[int, int]:
        """
        Get uncommitted and untracked file counts (async version).

        Runs in background thread to prevent blocking UI.

        Args:
            directory: Repository directory

        Returns:
            Tuple of (uncommitted_count, untracked_count)
        """
        return await asyncio.to_thread(GitService.get_status_counts, directory)

    @staticmethod
    async def get_ahead_behind_async(directory: Path) -> Tuple[int, int]:
        """
        Get number of commits ahead/behind remote (async version).

        Runs in background thread to prevent blocking UI.

        Args:
            directory: Repository directory

        Returns:
            Tuple of (ahead_count, behind_count)
        """
        return await asyncio.to_thread(GitService.get_ahead_behind, directory)

    @staticmethod
    async def has_remote_async(directory: Path) -> bool:
        """
        Check if repository has at least one remote (async version).

        Runs in background thread to prevent blocking UI.

        Args:
            directory: Repository directory

        Returns:
            True if has remote, False otherwise
        """
        return await asyncio.to_thread(GitService.has_remote, directory)


class CachedGitService:
    """
    Caching wrapper for GitService to reduce subprocess calls.

    Implements TTL-based caching with directory-specific cache keys.
    Cache invalidation occurs on directory change or TTL expiration (30s default).
    """

    def __init__(self, ttl_seconds: float = 30.0):
        """
        Initialize cached git service.

        Args:
            ttl_seconds: Time-to-live for cached results (default: 30s)
        """
        self._ttl = ttl_seconds
        self._cache: Dict[str, Tuple[float, GitStatus]] = {}
        self._current_directory: Optional[Path] = None

    def get_status(self, directory: Path) -> GitStatus:
        """
        Get git status with TTL caching.

        Cache key is based on directory path. Cache is invalidated if:
        - Directory changes
        - TTL expires (30 seconds)

        Args:
            directory: Repository directory

        Returns:
            Cached or fresh GitStatus object
        """
        # Invalidate cache on directory change
        if self._current_directory != directory:
            self._cache.clear()
            self._current_directory = directory

        # Create cache key
        cache_key = str(directory.resolve())

        # Check cache
        if cache_key in self._cache:
            timestamp, cached_status = self._cache[cache_key]
            age = time.time() - timestamp

            # Return cached result if fresh
            if age < self._ttl:
                return cached_status

        # Cache miss or expired - fetch fresh data
        status = GitService.get_status(directory)

        # Store in cache with current timestamp
        self._cache[cache_key] = (time.time(), status)

        return status

    def invalidate_cache(self, directory: Optional[Path] = None):
        """
        Manually invalidate cache.

        Args:
            directory: If specified, only invalidate cache for this directory.
                      If None, clear entire cache.
        """
        if directory is None:
            self._cache.clear()
        else:
            cache_key = str(directory.resolve())
            self._cache.pop(cache_key, None)

    def set_ttl(self, ttl_seconds: float):
        """
        Change TTL duration.

        Args:
            ttl_seconds: New TTL in seconds
        """
        self._ttl = ttl_seconds

    @property
    def cache_size(self) -> int:
        """Get current number of cached entries."""
        return len(self._cache)

    @property
    def ttl(self) -> float:
        """Get current TTL in seconds."""
        return self._ttl

    async def get_status_async(self, directory: Path) -> GitStatus:
        """
        Get git status with TTL caching (async version).

        Runs in background thread to prevent blocking UI.
        Cache key is based on directory path. Cache is invalidated if:
        - Directory changes
        - TTL expires (30 seconds)

        Args:
            directory: Repository directory

        Returns:
            Cached or fresh GitStatus object
        """
        # Invalidate cache on directory change
        if self._current_directory != directory:
            self._cache.clear()
            self._current_directory = directory

        # Create cache key
        cache_key = str(directory.resolve())

        # Check cache
        if cache_key in self._cache:
            timestamp, cached_status = self._cache[cache_key]
            age = time.time() - timestamp

            # Return cached result if fresh
            if age < self._ttl:
                return cached_status

        # Cache miss or expired - fetch fresh data (in background thread)
        status = await GitService.get_status_async(directory)

        # Store in cache with current timestamp
        self._cache[cache_key] = (time.time(), status)

        return status
