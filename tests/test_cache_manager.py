"""
Unit tests for CacheManager system.

Tests cover:
- Basic get/set operations
- TTL expiration
- Invalidation (single key, pattern, all)
- Cache statistics tracking
- Thread safety with concurrent access
"""

import pytest
import threading
import time
from datetime import datetime

from lib.yoyo_tui.services.cache_manager import CacheManager, CacheEntry, CacheStats


class TestCacheBasics:
    """Test basic cache operations."""

    def test_set_and_get(self):
        """Test setting and getting values."""
        cache = CacheManager(default_ttl=10)

        cache.set("key1", "value1")
        result = cache.get("key1")

        assert result == "value1"

    def test_get_nonexistent_key(self):
        """Test getting nonexistent key returns None."""
        cache = CacheManager()
        result = cache.get("nonexistent")
        assert result is None

    def test_set_overwrites_existing(self):
        """Test setting existing key overwrites value."""
        cache = CacheManager(default_ttl=10)

        cache.set("key1", "value1")
        cache.set("key1", "value2")

        result = cache.get("key1")
        assert result == "value2"

    def test_multiple_keys(self):
        """Test multiple keys can coexist."""
        cache = CacheManager(default_ttl=10)

        cache.set("key1", "value1")
        cache.set("key2", "value2")
        cache.set("key3", "value3")

        assert cache.get("key1") == "value1"
        assert cache.get("key2") == "value2"
        assert cache.get("key3") == "value3"

    def test_cache_different_types(self):
        """Test caching different data types."""
        cache = CacheManager(default_ttl=10)

        cache.set("string", "text")
        cache.set("number", 42)
        cache.set("list", [1, 2, 3])
        cache.set("dict", {"a": 1, "b": 2})
        cache.set("bool", True)

        assert cache.get("string") == "text"
        assert cache.get("number") == 42
        assert cache.get("list") == [1, 2, 3]
        assert cache.get("dict") == {"a": 1, "b": 2}
        assert cache.get("bool") is True


class TestCacheTTL:
    """Test TTL expiration functionality."""

    def test_ttl_expiration(self):
        """Test values expire after TTL."""
        cache = CacheManager(default_ttl=1)  # 1 second TTL

        cache.set("key1", "value1")
        assert cache.get("key1") == "value1"

        # Wait for expiration
        time.sleep(1.1)

        result = cache.get("key1")
        assert result is None

    def test_custom_ttl(self):
        """Test custom TTL per key."""
        cache = CacheManager(default_ttl=10)

        cache.set("key1", "value1", ttl=1)  # 1 second
        cache.set("key2", "value2", ttl=5)  # 5 seconds

        # Immediately both should be available
        assert cache.get("key1") == "value1"
        assert cache.get("key2") == "value2"

        # After 1.1 seconds, key1 should expire but key2 still valid
        time.sleep(1.1)
        assert cache.get("key1") is None
        assert cache.get("key2") == "value2"

    def test_ttl_not_expired(self):
        """Test value available before TTL expires."""
        cache = CacheManager(default_ttl=10)

        cache.set("key1", "value1", ttl=2)
        time.sleep(1)  # Wait less than TTL

        result = cache.get("key1")
        assert result == "value1"


class TestCacheInvalidation:
    """Test cache invalidation functionality."""

    def test_invalidate_single_key(self):
        """Test invalidating single key."""
        cache = CacheManager(default_ttl=10)

        cache.set("key1", "value1")
        cache.set("key2", "value2")

        cache.invalidate("key1")

        assert cache.get("key1") is None
        assert cache.get("key2") == "value2"

    def test_invalidate_nonexistent_key(self):
        """Test invalidating nonexistent key doesn't crash."""
        cache = CacheManager()
        # Should not raise exception
        cache.invalidate("nonexistent")

    def test_invalidate_pattern(self):
        """Test invalidating keys by pattern (prefix match)."""
        cache = CacheManager(default_ttl=10)

        cache.set("spec:feature-a", {"name": "a"})
        cache.set("spec:feature-b", {"name": "b"})
        cache.set("fix:bug-1", {"name": "fix"})

        cache.invalidate_pattern("spec:")

        assert cache.get("spec:feature-a") is None
        assert cache.get("spec:feature-b") is None
        assert cache.get("fix:bug-1") == {"name": "fix"}

    def test_invalidate_pattern_no_matches(self):
        """Test invalidating pattern with no matches."""
        cache = CacheManager(default_ttl=10)

        cache.set("key1", "value1")
        cache.invalidate_pattern("nonexistent:")

        assert cache.get("key1") == "value1"

    def test_clear_all(self):
        """Test clearing entire cache."""
        cache = CacheManager(default_ttl=10)

        cache.set("key1", "value1")
        cache.set("key2", "value2")
        cache.set("key3", "value3")

        cache.invalidate_all()

        assert cache.get("key1") is None
        assert cache.get("key2") is None
        assert cache.get("key3") is None

    def test_clear_all_empty_cache(self):
        """Test clearing empty cache doesn't crash."""
        cache = CacheManager()
        cache.invalidate_all()  # Should not raise exception


class TestCacheStatistics:
    """Test cache statistics tracking."""

    def test_initial_stats(self):
        """Test initial statistics are zero."""
        cache = CacheManager()
        stats = cache.get_stats()

        assert stats.hits == 0
        assert stats.misses == 0
        assert stats.invalidations == 0
        assert stats.size == 0

    def test_cache_hits(self):
        """Test cache hits are tracked."""
        cache = CacheManager(default_ttl=10)

        cache.set("key1", "value1")
        cache.get("key1")  # Hit
        cache.get("key1")  # Hit

        stats = cache.get_stats()
        assert stats.hits == 2

    def test_cache_misses(self):
        """Test cache misses are tracked."""
        cache = CacheManager(default_ttl=10)

        cache.get("nonexistent1")  # Miss
        cache.get("nonexistent2")  # Miss

        stats = cache.get_stats()
        assert stats.misses == 2

    def test_expired_key_counts_as_miss(self):
        """Test expired key access counts as miss."""
        cache = CacheManager(default_ttl=1)

        cache.set("key1", "value1")
        time.sleep(1.1)
        cache.get("key1")  # Should be miss (expired)

        stats = cache.get_stats()
        assert stats.misses == 1

    def test_cache_size(self):
        """Test cache size tracking."""
        cache = CacheManager(default_ttl=10)

        cache.set("key1", "value1")
        assert cache.get_stats().size == 1

        cache.set("key2", "value2")
        assert cache.get_stats().size == 2

        cache.invalidate("key1")
        assert cache.get_stats().size == 1

    def test_invalidations_count(self):
        """Test invalidations are counted."""
        cache = CacheManager(default_ttl=10)

        cache.set("key1", "value1")
        cache.set("key2", "value2")

        cache.invalidate("key1")
        stats = cache.get_stats()
        assert stats.invalidations == 1

        cache.invalidate("key2")
        stats = cache.get_stats()
        assert stats.invalidations == 2

    def test_pattern_invalidations_count(self):
        """Test pattern invalidations are counted."""
        cache = CacheManager(default_ttl=10)

        cache.set("spec:a", "a")
        cache.set("spec:b", "b")
        cache.set("spec:c", "c")

        cache.invalidate_pattern("spec:")

        stats = cache.get_stats()
        assert stats.invalidations == 3

    def test_combined_statistics(self):
        """Test combined statistics tracking."""
        cache = CacheManager(default_ttl=10)

        # Set 3 keys
        cache.set("key1", "value1")
        cache.set("key2", "value2")
        cache.set("key3", "value3")

        # 2 hits
        cache.get("key1")
        cache.get("key2")

        # 2 misses
        cache.get("nonexistent1")
        cache.get("nonexistent2")

        # 1 invalidation
        cache.invalidate("key1")

        stats = cache.get_stats()
        assert stats.hits == 2
        assert stats.misses == 2
        assert stats.invalidations == 1
        assert stats.size == 2  # key2 and key3 remain

    def test_stats_are_isolated(self):
        """Test stats object is a copy (not reference)."""
        cache = CacheManager(default_ttl=10)

        stats1 = cache.get_stats()
        cache.set("key1", "value1")
        stats2 = cache.get_stats()

        # stats1 should not have changed
        assert stats1.size == 0
        assert stats2.size == 1


class TestCacheThreadSafety:
    """Test thread safety of cache operations."""

    def test_concurrent_writes(self):
        """Test concurrent writes are thread-safe."""
        cache = CacheManager(default_ttl=10)

        def write_thread(thread_id: int):
            for i in range(10):
                cache.set(f"key-{thread_id}-{i}", f"value-{thread_id}-{i}")

        threads = [threading.Thread(target=write_thread, args=(i,)) for i in range(10)]
        for t in threads:
            t.start()
        for t in threads:
            t.join()

        stats = cache.get_stats()
        assert stats.size == 100  # 10 threads * 10 keys

    def test_concurrent_reads(self):
        """Test concurrent reads are thread-safe."""
        cache = CacheManager(default_ttl=10)

        # Pre-populate cache
        for i in range(10):
            cache.set(f"key-{i}", f"value-{i}")

        results = []
        lock = threading.Lock()

        def read_thread(key: str):
            value = cache.get(key)
            with lock:
                results.append((key, value))

        threads = [
            threading.Thread(target=read_thread, args=(f"key-{i % 10}",))
            for i in range(50)
        ]
        for t in threads:
            t.start()
        for t in threads:
            t.join()

        assert len(results) == 50
        # All reads should have succeeded
        assert all(value is not None for _, value in results)

    def test_concurrent_read_write(self):
        """Test concurrent reads and writes don't corrupt data."""
        cache = CacheManager(default_ttl=10)

        def write_thread(thread_id: int):
            for i in range(20):
                cache.set(f"key-{thread_id}", f"value-{thread_id}-{i}")
                time.sleep(0.001)

        def read_thread(thread_id: int):
            for i in range(20):
                cache.get(f"key-{thread_id}")
                time.sleep(0.001)

        threads = []
        for i in range(5):
            threads.append(threading.Thread(target=write_thread, args=(i,)))
            threads.append(threading.Thread(target=read_thread, args=(i,)))

        for t in threads:
            t.start()
        for t in threads:
            t.join()

        # Should complete without errors

    def test_concurrent_invalidations(self):
        """Test concurrent invalidations are thread-safe."""
        cache = CacheManager(default_ttl=10)

        # Pre-populate cache
        for i in range(100):
            cache.set(f"key-{i}", f"value-{i}")

        def invalidate_thread(start: int, end: int):
            for i in range(start, end):
                cache.invalidate(f"key-{i}")

        threads = [
            threading.Thread(target=invalidate_thread, args=(i * 10, (i + 1) * 10))
            for i in range(10)
        ]
        for t in threads:
            t.start()
        for t in threads:
            t.join()

        stats = cache.get_stats()
        assert stats.size == 0
        assert stats.invalidations == 100

    def test_concurrent_pattern_invalidations(self):
        """Test concurrent pattern invalidations are thread-safe."""
        cache = CacheManager(default_ttl=10)

        # Pre-populate with different prefixes
        for prefix in ["spec", "fix", "recap"]:
            for i in range(10):
                cache.set(f"{prefix}:{i}", f"value-{i}")

        def invalidate_pattern_thread(pattern: str):
            cache.invalidate_pattern(pattern)

        threads = [
            threading.Thread(target=invalidate_pattern_thread, args=(f"{prefix}:",))
            for prefix in ["spec", "fix", "recap"]
        ]
        for t in threads:
            t.start()
        for t in threads:
            t.join()

        stats = cache.get_stats()
        assert stats.size == 0

    def test_statistics_thread_safe(self):
        """Test statistics tracking is thread-safe."""
        cache = CacheManager(default_ttl=10)

        def mixed_operations(thread_id: int):
            # Mix of operations
            cache.set(f"key-{thread_id}", f"value-{thread_id}")
            cache.get(f"key-{thread_id}")
            cache.get("nonexistent")
            cache.invalidate(f"key-{thread_id}")

        threads = [
            threading.Thread(target=mixed_operations, args=(i,))
            for i in range(50)
        ]
        for t in threads:
            t.start()
        for t in threads:
            t.join()

        stats = cache.get_stats()
        assert stats.hits == 50
        assert stats.misses == 50
        assert stats.invalidations == 50
        assert stats.size == 0


class TestCacheEdgeCases:
    """Test edge cases and unusual scenarios."""

    def test_none_value(self):
        """Test caching None value."""
        cache = CacheManager(default_ttl=10)
        cache.set("key1", None)

        # Should return None (cached) not None (miss)
        # We can verify by checking statistics
        result = cache.get("key1")
        stats = cache.get_stats()

        assert result is None
        assert stats.hits == 1
        assert stats.misses == 0

    def test_empty_string_key(self):
        """Test empty string as key."""
        cache = CacheManager(default_ttl=10)
        cache.set("", "empty key value")

        result = cache.get("")
        assert result == "empty key value"

    def test_large_value(self):
        """Test caching large values."""
        cache = CacheManager(default_ttl=10)
        large_value = "x" * 1000000  # 1MB string

        cache.set("large", large_value)
        result = cache.get("large")

        assert result == large_value

    def test_zero_ttl(self):
        """Test zero TTL (immediate expiration)."""
        cache = CacheManager(default_ttl=10)
        cache.set("key1", "value1", ttl=0)

        # Should expire immediately
        time.sleep(0.1)
        result = cache.get("key1")
        assert result is None
