"""
GitService

Provides git operations for the TUI (status, branch, commit, push).
All operations use subprocess to run git commands.
"""

import subprocess
import re
from pathlib import Path
from typing import Optional, Tuple, List

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
    def is_git_installed() -> bool:
        """
        Check if git is installed and available.

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
        uncommitted = GitService._count_uncommitted_changes(directory)
        untracked = GitService._count_untracked_files(directory)
        ahead, behind = GitService.get_ahead_behind(directory)

        return GitStatus(
            branch=branch,
            uncommitted=uncommitted,
            untracked=untracked,
            ahead=ahead,
            behind=behind
        )

    @staticmethod
    def _count_uncommitted_changes(directory: Path) -> int:
        """
        Count uncommitted changes (modified, deleted, staged).

        Args:
            directory: Repository directory

        Returns:
            Number of uncommitted changes
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

            # Count lines that are not untracked (not starting with ??)
            lines = result.stdout.strip().split('\n')
            count = sum(1 for line in lines if line and not line.startswith('??'))
            return count

        except (subprocess.CalledProcessError, FileNotFoundError, subprocess.TimeoutExpired):
            return 0

    @staticmethod
    def _count_untracked_files(directory: Path) -> int:
        """
        Count untracked files.

        Args:
            directory: Repository directory

        Returns:
            Number of untracked files
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

            # Count lines starting with ??
            lines = result.stdout.strip().split('\n')
            count = sum(1 for line in lines if line.startswith('??'))
            return count

        except (subprocess.CalledProcessError, FileNotFoundError, subprocess.TimeoutExpired):
            return 0

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
