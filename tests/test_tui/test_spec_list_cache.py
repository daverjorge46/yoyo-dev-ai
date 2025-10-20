"""
Tests for SpecList cache TTL behavior.

Tests that verify the fix for slow spec/fix updates (30s cache → 10s cache).
"""

import pytest
import time
from pathlib import Path


def test_spec_list_cache_ttl_should_be_10_seconds():
    """
    Test that SpecList cache TTL is 10 seconds (not 30s).

    This test verifies the fix for Issue #2: Spec/Fix updates take too long to appear.
    Before fix: 30s cache TTL
    After fix: 10s cache TTL
    """
    from lib.yoyo_tui.widgets.spec_list import SpecList

    # Create SpecList with default cache TTL
    spec_list = SpecList()

    # Verify cache TTL is 10s (not 30s)
    assert spec_list._cache_ttl == 10.0, \
        f"Expected cache_ttl=10.0, got {spec_list._cache_ttl}"


def test_spec_list_custom_cache_ttl():
    """
    Test that SpecList respects custom cache TTL values.
    """
    from lib.yoyo_tui.widgets.spec_list import SpecList

    # Create SpecList with custom cache TTL
    spec_list = SpecList(cache_ttl=5.0)

    # Verify cache TTL is set correctly
    assert spec_list._cache_ttl == 5.0, \
        f"Expected cache_ttl=5.0, got {spec_list._cache_ttl}"


def test_spec_list_old_cache_ttl_30_seconds():
    """
    Test to document the old behavior (30s cache) - this test SHOULD FAIL after fix.

    Before fix: cache_ttl defaults to 30.0
    After fix: cache_ttl defaults to 10.0
    """
    from lib.yoyo_tui.widgets.spec_list import SpecList

    # Create SpecList with default cache TTL
    spec_list = SpecList()

    # This assertion should FAIL after the fix (we want 10s, not 30s)
    assert spec_list._cache_ttl != 30.0, \
        "SpecList cache TTL should not be 30s anymore (should be 10s)"


@pytest.mark.asyncio
async def test_spec_list_cache_invalidation():
    """
    Test that SpecList cache can be manually invalidated.

    This ensures the cache system is working correctly.
    """
    from lib.yoyo_tui.widgets.spec_list import SpecList
    import tempfile

    with tempfile.TemporaryDirectory() as tmpdir:
        yoyo_dev_path = Path(tmpdir) / ".yoyo-dev"
        yoyo_dev_path.mkdir()

        # Create specs directory
        specs_dir = yoyo_dev_path / "specs"
        specs_dir.mkdir()

        # Create SpecList
        spec_list = SpecList(yoyo_dev_path=yoyo_dev_path, cache_ttl=10.0)

        # Load data (populates cache)
        specs = await spec_list._load_specs_async()

        # Verify cache exists
        assert 'specs' in spec_list._cache, "Cache should be populated"

        # Invalidate cache
        spec_list.invalidate_cache('specs')

        # Verify cache is cleared
        assert 'specs' not in spec_list._cache, "Cache should be invalidated"
