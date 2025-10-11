# Yoyo Dev Test Suite

Comprehensive test suite for the Yoyo Dev framework performance optimizations.

## Test Organization

### Unit Tests (Root Level)
Tests for individual utilities and functions:

- `test-parse-utils-mission.sh` - Mission extraction from mission-lite.md
- `test-parse-utils-tech-stack.sh` - Tech stack parsing from multiple sources
- `test-parse-utils-cache.sh` - Caching mechanism with TTL
- `test-refresh-interval.sh` - Status refresh interval configuration
- `test-env-override.sh` - Environment variable override behavior
- `test-env-override-simple.sh` - Simplified env override tests

### Integration Tests (integration/)
Tests for complete launcher workflows:

- `test-launcher-v2-integration.sh` - Standard launcher with parse-utils
- `test-tmux-integration.sh` - Visual mode launcher with parse-utils

### Performance Tests (fixes/2025-10-11-performance-bottlenecks/tests/)
Benchmarking and validation tests:

- `test_task_counting.sh` - Task counting performance (grep vs awk)
- `test_yoyo_status_integration.sh` - Full yoyo-status.sh integration
- `test_yoyo_status_simple.sh` - Simplified status tests

## Running Tests

### Run All Unit Tests
```bash
cd /home/yoga999/.yoyo-dev/tests
for test in test-*.sh; do
    echo "Running $test..."
    ./"$test"
done
```

### Run Integration Tests
```bash
cd /home/yoga999/.yoyo-dev/tests/integration
for test in test-*.sh; do
    echo "Running $test..."
    ./"$test"
done
```

### Run Performance Benchmarks
```bash
cd /home/yoga999/.yoyo-dev/.yoyo-dev/fixes/2025-10-11-performance-bottlenecks
./benchmark.sh
```

## Test Results

All tests passing as of 2025-10-11:
- ✅ Parse utilities (mission, tech stack, caching)
- ✅ Launcher integration (v2, tmux)
- ✅ Status monitoring (task counting, refresh)
- ✅ Performance benchmarks (9ms startup, 3ms refresh, 0% CPU)

## Performance Achievements

- **Startup time:** 300ms → 9ms (97% improvement)
- **Status refresh:** 50ms → 3ms (94% improvement)
- **Idle CPU:** 2-5% → 0% (100% reduction)
