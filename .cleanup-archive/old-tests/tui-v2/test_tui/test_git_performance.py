"""
Performance tests for GitService caching.

Measures subprocess call reduction from caching layer.
"""

import time
from pathlib import Path
from unittest.mock import patch, MagicMock
from lib.yoyo_tui.services.git_service import GitService, CachedGitService


class TestGitServicePerformance:
    """Performance benchmark tests for git caching."""

    def test_measure_subprocess_calls_without_cache(self):
        """Measure how many subprocess calls are made without caching."""
        directory = Path.cwd()

        with patch('subprocess.run') as mock_run:
            # Mock successful git operations
            mock_run.return_value = MagicMock(
                returncode=0,
                stdout="main\n",
                stderr=""
            )

            # Simulate 5 refreshes (like 5-second intervals over 25 seconds)
            for _ in range(5):
                status = GitService.get_status(directory)

            # Count total subprocess calls
            total_calls = mock_run.call_count

            print(f"\n⚠️  WITHOUT CACHE:")
            print(f"   - 5 get_status() calls")
            print(f"   - {total_calls} total subprocess calls")
            print(f"   - {total_calls / 5:.1f} subprocess calls per refresh")

            # Without optimization, we expect 4-5 subprocess calls per get_status
            # (is_git_repo, get_branch, get_status_counts, get_ahead_behind, has_remote)
            assert total_calls >= 15  # At least 3 per call
            assert total_calls <= 30  # At most 6 per call

    def test_measure_subprocess_calls_with_cache(self):
        """Measure how many subprocess calls are made WITH caching."""
        directory = Path.cwd()
        service = CachedGitService(ttl_seconds=10.0)

        with patch('subprocess.run') as mock_run:
            # Mock successful git operations
            mock_run.return_value = MagicMock(
                returncode=0,
                stdout="main\n",
                stderr=""
            )

            # Simulate 5 refreshes within TTL (like 5-second intervals over 25 seconds)
            for _ in range(5):
                status = service.get_status(directory)

            # Count total subprocess calls
            total_calls = mock_run.call_count

            print(f"\n✅ WITH CACHE (30s TTL):")
            print(f"   - 5 get_status() calls")
            print(f"   - {total_calls} total subprocess calls")
            print(f"   - {total_calls / 5:.1f} subprocess calls per refresh")

            # With cache, only the FIRST call should make subprocess calls
            # Subsequent calls within TTL use cached results
            assert total_calls >= 3  # At least 3 for first call
            assert total_calls <= 6  # At most 6 for first call
            # Should NOT be ~20-25 like without cache!

    def test_compare_performance_improvement(self):
        """Compare performance improvement from caching."""
        directory = Path.cwd()

        # WITHOUT CACHE: Count calls for 10 refreshes
        with patch('subprocess.run') as mock_run:
            mock_run.return_value = MagicMock(
                returncode=0,
                stdout="main\n",
                stderr=""
            )

            for _ in range(10):
                GitService.get_status(directory)

            uncached_calls = mock_run.call_count

        # WITH CACHE: Count calls for 10 refreshes (within TTL)
        service = CachedGitService(ttl_seconds=30.0)
        with patch('subprocess.run') as mock_run:
            mock_run.return_value = MagicMock(
                returncode=0,
                stdout="main\n",
                stderr=""
            )

            for _ in range(10):
                service.get_status(directory)

            cached_calls = mock_run.call_count

        # Calculate improvement
        reduction_percent = ((uncached_calls - cached_calls) / uncached_calls) * 100

        print(f"\n📊 PERFORMANCE COMPARISON:")
        print(f"   - Uncached:  {uncached_calls} subprocess calls")
        print(f"   - Cached:    {cached_calls} subprocess calls")
        print(f"   - Reduction: {reduction_percent:.1f}%")
        print(f"   - Speedup:   {uncached_calls / cached_calls:.1f}x faster")

        # Should achieve at least 80% reduction in subprocess calls
        assert reduction_percent >= 80.0, f"Expected >=80% reduction, got {reduction_percent:.1f}%"

    def test_real_world_timing_improvement(self):
        """Measure actual timing improvement with real git operations."""
        directory = Path.cwd()

        # Skip if not in git repo
        if not GitService.is_git_repo(directory):
            return

        # WITHOUT CACHE: Time 10 calls
        start = time.time()
        for _ in range(10):
            GitService.get_status(directory)
        uncached_time = time.time() - start

        # WITH CACHE: Time 10 calls
        service = CachedGitService(ttl_seconds=30.0)
        start = time.time()
        for _ in range(10):
            service.get_status(directory)
        cached_time = time.time() - start

        # Calculate improvement
        speedup = uncached_time / cached_time
        time_saved = uncached_time - cached_time

        print(f"\n⏱️  REAL-WORLD TIMING:")
        print(f"   - Uncached:  {uncached_time:.3f}s for 10 calls")
        print(f"   - Cached:    {cached_time:.3f}s for 10 calls")
        print(f"   - Speedup:   {speedup:.1f}x faster")
        print(f"   - Time saved: {time_saved:.3f}s")

        # Cached version should be significantly faster
        # (at least 2x, realistically 5-10x depending on repo size)
        assert speedup >= 2.0, f"Expected >=2x speedup, got {speedup:.1f}x"
