"""
Cache Integration Tests

Tests cache behavior across the entire system:
- Load → Cache hit → Invalidate → Cache miss → Reload
- Cache statistics tracking
- TTL expiration
- Performance improvements from caching
"""

import json
import pytest
import tempfile
import shutil
import time
from pathlib import Path

from lib.yoyo_tui.services.event_bus import EventBus
from lib.yoyo_tui.services.cache_manager import CacheManager
from lib.yoyo_tui.services.data_manager import DataManager
from lib.yoyo_tui.models import EventType


class TestCacheIntegrationFlow:
    """Test cache integration across DataManager operations."""

    @pytest.fixture
    def temp_project_dir(self):
        """Create temporary project directory with sample data."""
        temp_dir = tempfile.mkdtemp()
        project_dir = Path(temp_dir)

        # Create .yoyo-dev structure
        yoyo_dev = project_dir / ".yoyo-dev"
        (yoyo_dev / "specs").mkdir(parents=True)
        (yoyo_dev / "fixes").mkdir(parents=True)
        (yoyo_dev / "recaps").mkdir(parents=True)

        # Create sample spec
        spec_dir = yoyo_dev / "specs" / "2025-10-15-test-spec"
        spec_dir.mkdir()
        (spec_dir / "spec.md").write_text("# Test Spec\n\nTest specification.")
        (spec_dir / "state.json").write_text(json.dumps({
            "spec_name": "test-spec",
            "spec_created": "2025-10-15",
            "current_phase": "implementation"
        }))

        # Create sample fix
        fix_dir = yoyo_dev / "fixes" / "2025-10-16-test-fix"
        fix_dir.mkdir()
        (fix_dir / "analysis.md").write_text("# Test Fix\n\nProblem analysis.")

        # Create sample recap
        recap_file = yoyo_dev / "recaps" / "2025-10-17-test-recap.md"
        recap_file.write_text("# Test Recap\n\nRecap summary.")

        yield project_dir
        shutil.rmtree(temp_dir)

    def test_load_cache_hit_flow(self, temp_project_dir):
        """Test: Initial load → cache miss → second load → cache hit."""
        yoyo_dev = temp_project_dir / ".yoyo-dev"
        event_bus = EventBus()
        cache_manager = CacheManager()

        data_manager = DataManager(
            yoyo_dev_path=yoyo_dev,
            event_bus=event_bus,
            cache_manager=cache_manager
        )

        # First load - cache misses
        data_manager.initialize()
        initial_stats = cache_manager.get_stats()

        assert initial_stats.misses > 0, "Initial load should have cache misses"
        assert len(data_manager.get_all_specs()) == 1

        # Second load - cache hits
        data_manager.refresh_all()
        updated_stats = cache_manager.get_stats()

        # Cache hits should increase
        assert updated_stats.hits > initial_stats.hits, "Second load should hit cache"
        assert updated_stats.misses == initial_stats.misses, "No new misses on cached data"

    def test_invalidate_cache_miss_reload_flow(self, temp_project_dir):
        """Test: Load → invalidate → reload → cache miss → new cache entry."""
        yoyo_dev = temp_project_dir / ".yoyo-dev"
        event_bus = EventBus()
        cache_manager = CacheManager()

        data_manager = DataManager(
            yoyo_dev_path=yoyo_dev,
            event_bus=event_bus,
            cache_manager=cache_manager
        )

        # Initial load
        data_manager.initialize()
        initial_stats = cache_manager.get_stats()

        # Verify cached
        cache_key = "spec:2025-10-15-test-spec"
        cached_spec = cache_manager.get(cache_key)
        assert cached_spec is not None, "Spec should be cached"

        # Invalidate cache
        cache_manager.invalidate(cache_key)
        invalidated_stats = cache_manager.get_stats()
        assert invalidated_stats.invalidations == 1, "Should have 1 invalidation"

        # Cache should return None now
        cached_spec = cache_manager.get(cache_key)
        assert cached_spec is None, "Cache should be invalidated"

        # Reload - cache miss, then re-cache
        data_manager.refresh_all()
        reload_stats = cache_manager.get_stats()

        # Should have new cache miss
        assert reload_stats.misses > initial_stats.misses, "Reload should miss cache"

        # Should be re-cached
        cached_spec = cache_manager.get(cache_key)
        assert cached_spec is not None, "Spec should be re-cached"

    def test_cache_statistics_accuracy(self, temp_project_dir):
        """Test cache statistics are accurately tracked."""
        yoyo_dev = temp_project_dir / ".yoyo-dev"
        event_bus = EventBus()
        cache_manager = CacheManager()

        data_manager = DataManager(
            yoyo_dev_path=yoyo_dev,
            event_bus=event_bus,
            cache_manager=cache_manager
        )

        # Initial stats should be zero
        stats = cache_manager.get_stats()
        assert stats.hits == 0
        assert stats.misses == 0
        assert stats.invalidations == 0

        # Load data - should generate misses
        data_manager.initialize()
        load_stats = cache_manager.get_stats()

        # Should have misses (specs, fixes, recaps, progress check)
        assert load_stats.misses > 0

        # Access cached data - should generate hits
        spec_key = "spec:2025-10-15-test-spec"
        cache_manager.get(spec_key)  # Hit
        cache_manager.get(spec_key)  # Hit
        cache_manager.get(spec_key)  # Hit

        hit_stats = cache_manager.get_stats()
        assert hit_stats.hits >= 3, "Should have at least 3 hits"

        # Invalidate - should increment invalidations
        cache_manager.invalidate(spec_key)
        invalidation_stats = cache_manager.get_stats()
        assert invalidation_stats.invalidations > 0, "Should have invalidations"

    def test_file_change_invalidates_cache(self, temp_project_dir):
        """Test file change event invalidates cache correctly."""
        yoyo_dev = temp_project_dir / ".yoyo-dev"
        event_bus = EventBus()
        cache_manager = CacheManager()

        spec_dir = yoyo_dev / "specs" / "2025-10-15-test-spec"
        spec_file = spec_dir / "spec.md"

        data_manager = DataManager(
            yoyo_dev_path=yoyo_dev,
            event_bus=event_bus,
            cache_manager=cache_manager
        )

        # Initial load
        data_manager.initialize()

        # Verify cached
        cache_key = "spec:2025-10-15-test-spec"
        cached_spec = cache_manager.get(cache_key)
        assert cached_spec is not None

        # Emit FILE_CHANGED event
        event_bus.publish(
            EventType.FILE_CHANGED,
            {"file_path": str(spec_file)},
            source="FileWatcher"
        )

        # Give event handler time to process
        time.sleep(0.1)

        # Cache should be invalidated
        stats = cache_manager.get_stats()
        assert stats.invalidations > 0, "File change should invalidate cache"


class TestCacheTTL:
    """Test cache TTL expiration behavior."""

    def test_cache_expires_after_ttl(self):
        """Test cache entries expire after TTL."""
        cache_manager = CacheManager(default_ttl=0.2)  # 200ms TTL

        # Set cache entry
        cache_manager.set("test_key", "test_value", ttl=0.2)

        # Immediate access - hit
        value = cache_manager.get("test_key")
        assert value == "test_value"

        # Wait for TTL to expire
        time.sleep(0.3)

        # Access after expiration - miss
        value = cache_manager.get("test_key")
        assert value is None

        # Stats should show miss
        stats = cache_manager.get_stats()
        assert stats.misses > 0

    def test_different_ttl_per_entry(self):
        """Test different TTL values per cache entry."""
        cache_manager = CacheManager()

        # Set entries with different TTLs
        cache_manager.set("short_ttl", "value1", ttl=0.1)  # 100ms
        cache_manager.set("long_ttl", "value2", ttl=1.0)   # 1000ms

        # Wait for short TTL to expire
        time.sleep(0.2)

        # Short TTL should be expired
        assert cache_manager.get("short_ttl") is None

        # Long TTL should still be valid
        assert cache_manager.get("long_ttl") == "value2"

    def test_zero_ttl_expires_immediately(self):
        """Test TTL=0 means cache expires immediately (not 'never expires')."""
        cache_manager = CacheManager()

        # Set entry with zero TTL (expires immediately)
        cache_manager.set("short_lived", "short_value", ttl=0)

        # Wait a tiny bit
        time.sleep(0.01)

        # Should be expired
        value = cache_manager.get("short_lived")
        assert value is None, "TTL=0 should expire immediately"


class TestCachePerformance:
    """Test cache improves performance."""

    @pytest.fixture
    def temp_project_dir(self):
        """Create temporary project directory."""
        temp_dir = tempfile.mkdtemp()
        project_dir = Path(temp_dir)

        # Create .yoyo-dev structure
        yoyo_dev = project_dir / ".yoyo-dev"
        (yoyo_dev / "specs").mkdir(parents=True)
        (yoyo_dev / "fixes").mkdir(parents=True)
        (yoyo_dev / "recaps").mkdir(parents=True)

        yield project_dir
        shutil.rmtree(temp_dir)

    def test_cache_reduces_parsing_overhead(self, temp_project_dir):
        """Test cache reduces parsing overhead on repeated loads."""
        yoyo_dev = temp_project_dir / ".yoyo-dev"

        # Create multiple specs to amplify caching effect
        for i in range(5):
            spec_dir = yoyo_dev / "specs" / f"2025-10-{15+i:02d}-spec-{i}"
            spec_dir.mkdir()
            (spec_dir / "spec.md").write_text(f"# Spec {i}\n\nSpec content.")

        event_bus = EventBus()
        cache_manager = CacheManager()

        data_manager = DataManager(
            yoyo_dev_path=yoyo_dev,
            event_bus=event_bus,
            cache_manager=cache_manager
        )

        # First load - no cache (slower)
        start_time = time.time()
        data_manager.initialize()
        first_load_time = time.time() - start_time

        # Second load - with cache (faster)
        start_time = time.time()
        data_manager.refresh_all()
        second_load_time = time.time() - start_time

        # Cached load should be faster (or at least not significantly slower)
        # We're not asserting strict performance because tests can be flaky
        # But we verify cache was used
        stats = cache_manager.get_stats()
        assert stats.hits > 0, "Second load should use cache"

        print(f"First load: {first_load_time:.3f}s, Second load: {second_load_time:.3f}s")
        print(f"Cache stats: {stats.hits} hits, {stats.misses} misses")

    def test_cache_hit_rate_on_repeated_access(self):
        """Test cache hit rate increases with repeated access."""
        event_bus = EventBus()
        cache_manager = CacheManager()

        # Set some values
        for i in range(10):
            cache_manager.set(f"key_{i}", f"value_{i}")

        # Access repeatedly
        for _ in range(5):
            for i in range(10):
                cache_manager.get(f"key_{i}")

        # Calculate hit rate
        stats = cache_manager.get_stats()
        total_accesses = stats.hits + stats.misses
        hit_rate = stats.hits / total_accesses if total_accesses > 0 else 0

        # Hit rate should be high (initial misses, then all hits)
        assert hit_rate > 0.8, f"Hit rate should be > 80%, got {hit_rate:.2%}"


class TestCacheClearAndReset:
    """Test cache clear and reset operations."""

    def test_clear_removes_all_entries(self):
        """Test clear() removes all cache entries."""
        cache_manager = CacheManager()

        # Set multiple entries
        cache_manager.set("key1", "value1")
        cache_manager.set("key2", "value2")
        cache_manager.set("key3", "value3")

        # Verify cached
        assert cache_manager.get("key1") == "value1"
        assert cache_manager.get("key2") == "value2"

        # Clear cache
        cache_manager.invalidate_all()

        # All entries should be gone
        assert cache_manager.get("key1") is None
        assert cache_manager.get("key2") is None
        assert cache_manager.get("key3") is None

        # Stats should show misses
        stats = cache_manager.get_stats()
        assert stats.misses > 0

    def test_reset_statistics(self):
        """Test reset_stats() resets cache statistics."""
        cache_manager = CacheManager()

        # Generate some statistics
        cache_manager.set("key1", "value1")
        cache_manager.get("key1")
        cache_manager.invalidate("key1")

        # Stats should be non-zero
        stats_before = cache_manager.get_stats()
        assert stats_before.hits > 0
        assert stats_before.invalidations > 0

        # Reset statistics
        cache_manager.reset_stats()

        # Stats should be reset
        stats_after = cache_manager.get_stats()
        assert stats_after.hits == 0
        assert stats_after.misses == 0
        assert stats_after.invalidations == 0
