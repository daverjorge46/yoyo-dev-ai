"""
CacheManager Service - TTL-based cache with statistics tracking

Provides:
- Key-value cache with TTL expiration
- Cache invalidation (single key, pattern, all)
- Statistics tracking (hits, misses, invalidations)
- Thread-safe operations
"""

import threading
import time
from dataclasses import dataclass
from datetime import datetime, timedelta
from typing import Any, Dict, Optional, List


@dataclass
class CacheEntry:
    """
    Cache entry with value and expiration time.

    Attributes:
        value: Cached value
        expires_at: Timestamp when entry expires
    """
    value: Any
    expires_at: float  # Unix timestamp


@dataclass
class CacheStats:
    """
    Cache statistics.

    Attributes:
        hits: Number of cache hits
        misses: Number of cache misses
        invalidations: Number of invalidations
        size: Current cache size
    """
    hits: int = 0
    misses: int = 0
    invalidations: int = 0
    size: int = 0


class CacheManager:
    """
    TTL-based cache manager with statistics.

    Thread-safe cache with automatic expiration and statistics tracking.
    """

    def __init__(self, default_ttl: int = 300):
        """
        Initialize the cache manager.

        Args:
            default_ttl: Default time-to-live in seconds (default: 300 = 5 minutes)
        """
        self._cache: Dict[str, CacheEntry] = {}
        self._lock = threading.Lock()
        self._default_ttl = default_ttl
        self._stats = CacheStats()

    def get(self, key: str) -> Optional[Any]:
        """
        Get value from cache.

        Args:
            key: Cache key

        Returns:
            Cached value, or None if not found or expired
        """
        with self._lock:
            if key not in self._cache:
                self._stats.misses += 1
                return None

            entry = self._cache[key]

            # Check if expired
            if time.time() > entry.expires_at:
                # Remove expired entry
                del self._cache[key]
                self._stats.misses += 1
                return None

            # Cache hit
            self._stats.hits += 1
            return entry.value

    def set(self, key: str, value: Any, ttl: Optional[int] = None) -> None:
        """
        Set value in cache with TTL.

        Args:
            key: Cache key
            value: Value to cache
            ttl: Time-to-live in seconds (uses default if not provided)
        """
        if ttl is None:
            ttl = self._default_ttl

        expires_at = time.time() + ttl

        with self._lock:
            self._cache[key] = CacheEntry(value=value, expires_at=expires_at)
            self._stats.size = len(self._cache)

    def invalidate(self, key: str) -> None:
        """
        Invalidate (remove) a single cache entry.

        Args:
            key: Cache key to invalidate
        """
        with self._lock:
            if key in self._cache:
                del self._cache[key]
                self._stats.invalidations += 1
                self._stats.size = len(self._cache)

    def invalidate_pattern(self, pattern: str) -> int:
        """
        Invalidate all keys matching a pattern.

        Args:
            pattern: String pattern to match (substring match)

        Returns:
            Number of keys invalidated
        """
        count = 0
        with self._lock:
            keys_to_remove = [key for key in self._cache.keys() if pattern in key]

            for key in keys_to_remove:
                del self._cache[key]
                count += 1

            self._stats.invalidations += count
            self._stats.size = len(self._cache)

        return count

    def invalidate_all(self) -> int:
        """
        Invalidate all cache entries.

        Returns:
            Number of keys invalidated
        """
        with self._lock:
            count = len(self._cache)
            self._cache.clear()
            self._stats.invalidations += count
            self._stats.size = 0

        return count

    def get_stats(self) -> CacheStats:
        """
        Get cache statistics.

        Returns:
            CacheStats with current statistics
        """
        with self._lock:
            return CacheStats(
                hits=self._stats.hits,
                misses=self._stats.misses,
                invalidations=self._stats.invalidations,
                size=len(self._cache)
            )

    def reset_stats(self) -> None:
        """Reset cache statistics (but keep cached data)."""
        with self._lock:
            self._stats.hits = 0
            self._stats.misses = 0
            self._stats.invalidations = 0

    def cleanup_expired(self) -> int:
        """
        Remove all expired entries from cache.

        Returns:
            Number of expired entries removed
        """
        count = 0
        current_time = time.time()

        with self._lock:
            keys_to_remove = [
                key for key, entry in self._cache.items()
                if current_time > entry.expires_at
            ]

            for key in keys_to_remove:
                del self._cache[key]
                count += 1

            self._stats.size = len(self._cache)

        return count
