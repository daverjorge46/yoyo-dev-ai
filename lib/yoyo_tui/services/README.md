# Yoyo TUI Services

Core services layer for the Yoyo Dev TUI dashboard.

## Architecture Overview

The services layer implements an event-driven architecture with three core components:

```
┌─────────────────────────────────────────────────────────────┐
│                     TUI Dashboard (UI Layer)                │
│                   Subscribes to STATE_UPDATED                │
└─────────────────────┬───────────────────────────────────────┘
                      │
                      ▼
┌─────────────────────────────────────────────────────────────┐
│                      DataManager                            │
│  • Centralized state (specs, fixes, tasks, recaps)          │
│  • Query API for UI components                              │
│  • Cache integration                                        │
│  • Event emission on state changes                          │
└───────┬─────────────┬───────────────────────┬───────────────┘
        │             │                       │
        ▼             ▼                       ▼
┌──────────────┐ ┌──────────────┐  ┌──────────────────────┐
│  EventBus    │ │ CacheManager │  │  Parsers             │
│  (Pub/Sub)   │ │  (TTL Cache) │  │  • SpecParser        │
│              │ │              │  │  • FixParser         │
│              │ │              │  │  • RecapParser       │
│              │ │              │  │  • ProgressParser    │
│              │ │              │  │  • TaskParser        │
└──────────────┘ └──────────────┘  └──────────────────────┘
        ▲
        │ FILE_CHANGED/CREATED/DELETED events
        │
┌───────┴────────────────────────────────────────────────────┐
│                     FileWatcher                            │
│  • Watches .yoyo-dev directory                             │
│  • Debounces file changes (100ms)                          │
│  • Filters ignored patterns (.pyc, __pycache__, etc.)      │
│  • Emits events via EventBus                               │
└────────────────────────────────────────────────────────────┘
```

## Core Services

### EventBus (`event_bus.py`)

Thread-safe pub/sub event system for decoupled component communication.

**Features:**
- Subscribe/unsubscribe to event types
- Synchronous event delivery
- Exception isolation (one handler failure doesn't affect others)
- Optional event logging for debugging

**Usage:**
```python
from lib.yoyo_tui.services.event_bus import EventBus
from lib.yoyo_tui.models import EventType

bus = EventBus(enable_logging=True)

# Subscribe
def on_state_updated(event):
    print(f"State updated: {event.data}")

bus.subscribe(EventType.STATE_UPDATED, on_state_updated)

# Publish
bus.publish(
    EventType.STATE_UPDATED,
    {"spec_count": 5},
    source="DataManager"
)

# Unsubscribe
bus.unsubscribe(EventType.STATE_UPDATED, on_state_updated)
```

**Event Types:**
- `FILE_CHANGED` - File modified in .yoyo-dev
- `FILE_CREATED` - New file created
- `FILE_DELETED` - File deleted
- `STATE_UPDATED` - Application state changed
- `TASK_COMPLETED` - Task marked complete
- `SPEC_CREATED` - New spec created
- `FIX_CREATED` - New fix created

### CacheManager (`cache_manager.py`)

TTL-based cache with statistics tracking.

**Features:**
- Key-value cache with automatic expiration
- Thread-safe operations
- Statistics tracking (hits, misses, invalidations)
- Pattern-based invalidation
- Manual cleanup of expired entries

**Usage:**
```python
from lib.yoyo_tui.services.cache_manager import CacheManager

cache = CacheManager(default_ttl=300)  # 5 minutes

# Set
cache.set("spec:my-feature", spec_data, ttl=600)

# Get
spec = cache.get("spec:my-feature")  # None if expired or not found

# Invalidate
cache.invalidate("spec:my-feature")
cache.invalidate_pattern("spec:")  # All specs
cache.invalidate_all()

# Statistics
stats = cache.get_stats()
print(f"Hits: {stats.hits}, Misses: {stats.misses}, Size: {stats.size}")

# Cleanup
removed = cache.cleanup_expired()
```

**Default TTL:** 300 seconds (5 minutes)

### DataManager (`data_manager.py`)

Centralized state management with event-driven updates.

**Features:**
- Single source of truth for application state
- Automatic cache integration
- File system event handling
- Thread-safe state access
- Query API for UI components

**Usage:**
```python
from pathlib import Path
from lib.yoyo_tui.services.data_manager import DataManager
from lib.yoyo_tui.services.event_bus import EventBus
from lib.yoyo_tui.services.cache_manager import CacheManager

bus = EventBus()
cache = CacheManager()
data_manager = DataManager(
    yoyo_dev_path=Path(".yoyo-dev"),
    event_bus=bus,
    cache_manager=cache
)

# Initialize (load all data)
data_manager.initialize()

# Query API
specs = data_manager.get_all_specs()
spec = data_manager.get_spec_by_name("my-feature")
fixes = data_manager.get_all_fixes()
recaps = data_manager.get_all_recaps()
recent = data_manager.get_recent_actions(limit=10)

# Refresh data
data_manager.refresh_all()

# State property (read-only)
state = data_manager.state
print(f"Loaded {len(state.specs)} specs")
```

**Event Emission:**
- Emits `STATE_UPDATED` when state changes
- UI components subscribe to stay in sync

### FileWatcher (`file_watcher.py`)

Watches .yoyo-dev directory for file changes.

**Features:**
- Debouncing (100ms window to batch rapid changes)
- Smart filtering (ignores .pyc, __pycache__, .git, etc.)
- Event emission via EventBus
- Thread-safe operation

**Usage:**
```python
from pathlib import Path
from lib.yoyo_tui.services.file_watcher import FileWatcher
from lib.yoyo_tui.services.event_bus import EventBus

bus = EventBus()
watcher = FileWatcher(
    watch_path=Path(".yoyo-dev"),
    event_bus=bus
)

# Start watching (runs in background thread)
watcher.start()

# Stop watching
watcher.stop()
```

**Ignored Patterns:**
- `*.pyc`, `__pycache__`, `.git`, `.cache`
- `*.swp`, `*.tmp`, `.DS_Store`

## Parsers

All parsers follow defensive parsing principles: return `None` (or empty object) on error, log errors but don't crash.

### SpecParser (`spec_parser.py`)

Parses spec folders to extract `SpecData`.

**Extracts:**
- Folder name (date, clean name)
- Title from `spec.md` (first H1)
- Status from `state.json`
- Tasks from `tasks.md` (progress calculation)
- Sub-spec files (technical-spec, database-schema, api-spec)

**Usage:**
```python
from pathlib import Path
from lib.yoyo_tui.services.spec_parser import SpecParser

spec_data = SpecParser.parse(Path(".yoyo-dev/specs/2025-10-23-my-feature"))
if spec_data:
    print(f"Spec: {spec_data.title}, Progress: {spec_data.progress}%")
```

### FixParser (`fix_parser.py`)

Parses fix folders to extract `FixData`.

**Extracts:**
- Folder name (date, clean name)
- Title from `analysis.md` (first H1)
- Problem summary
- Status from `state.json`
- Tasks from `tasks.md`

**Usage:**
```python
from pathlib import Path
from lib.yoyo_tui.services.fix_parser import FixParser

fix_data = FixParser.parse(Path(".yoyo-dev/fixes/2025-10-16-bug-fix"))
if fix_data:
    print(f"Fix: {fix_data.title}, Status: {fix_data.status}")
```

### RecapParser (`recap_parser.py`)

Parses recap markdown files to extract `RecapData`.

**Extracts:**
- File name (date, clean name)
- Title (first H1)
- Summary (text after "## Summary" heading)
- PR links
- Change counts

**Usage:**
```python
from pathlib import Path
from lib.yoyo_tui.services.recap_parser import RecapParser

recap_data = RecapParser.parse(Path(".yoyo-dev/recaps/2025-10-17-feature.md"))
if recap_data:
    print(f"Recap: {recap_data.title}")
    print(f"Summary: {recap_data.summary}")
```

### ProgressParser (`progress_parser.py`)

Parses `execution-progress.json` to extract `ExecutionProgress`.

**Format:**
```json
{
  "current_spec": "my-feature",
  "current_task": 3,
  "total_tasks": 10,
  "started_at": "2025-10-23T10:00:00",
  "estimated_completion": "2025-10-23T14:00:00",
  "phase": "implementation"
}
```

**Usage:**
```python
from pathlib import Path
from lib.yoyo_tui.services.progress_parser import ProgressParser

progress = ProgressParser.parse(Path(".yoyo-dev/.cache/execution-progress.json"))
print(f"Working on: {progress.current_spec}, Task {progress.current_task}/{progress.total_tasks}")
```

### TaskParser (`task_parser.py`)

Parses `tasks.md` to extract task progress.

**Usage:**
```python
from pathlib import Path
from lib.yoyo_tui.services.task_parser import TaskParser

progress = TaskParser.parse_progress(Path(".yoyo-dev/specs/my-feature/tasks.md"))
print(f"Progress: {progress}%")

tasks = TaskParser.parse_tasks(Path(".yoyo-dev/specs/my-feature/tasks.md"))
for task in tasks:
    print(f"Task {task.number}: {task.title} [{task.status}]")
```

## Event Flow Examples

### File Change Detection

```
1. User saves spec.md
2. FileWatcher detects change (after 100ms debounce)
3. FileWatcher emits FILE_CHANGED event via EventBus
4. DataManager receives event
5. DataManager invalidates cache for that spec
6. DataManager re-parses spec using SpecParser
7. DataManager updates state
8. DataManager emits STATE_UPDATED event
9. UI components receive STATE_UPDATED and re-render
```

### New Spec Creation

```
1. /create-new command creates spec folder
2. FileWatcher detects new folder/files
3. FileWatcher emits FILE_CREATED events
4. DataManager receives events
5. DataManager parses new spec
6. DataManager adds to state
7. DataManager emits STATE_UPDATED
8. UI updates to show new spec
```

## Thread Safety

All services use `threading.Lock` for thread-safe operations:

- **EventBus**: Lock protects handler list modifications
- **CacheManager**: Lock protects cache dictionary operations
- **DataManager**: Lock protects state updates
- **FileWatcher**: Lock protects event handler state

## Performance Characteristics

**Startup Time:**
- Initial load: < 500ms (10 specs, 10 fixes, 10 recaps)
- Cold start (no cache): ~300-400ms
- Warm start (cache hits): ~100-150ms

**File Change Latency:**
- Detection: < 100ms (debounce window)
- Parse + Update: < 50ms per file
- Total: < 200ms from save to UI update

**Cache Hit Rate:**
- Target: > 80% on steady-state usage
- Typical: 85-90% with default TTL (300s)

**Memory Usage:**
- Baseline: ~10MB (services + parsers)
- With 50 specs/fixes: ~50-60MB
- Cache overhead: ~5-10MB

## Error Handling

All parsers implement defensive error handling:

1. **File not found**: Return `None` or empty object
2. **Corrupt JSON**: Log error, return `None`
3. **Missing fields**: Use defaults where possible
4. **Permission errors**: Log error, continue with other files

DataManager continues operating even if some files fail to parse.

## Testing

**Unit Tests:**
- `tests/test_event_bus.py` - EventBus functionality
- `tests/test_cache_manager.py` - Cache operations
- `tests/test_data_manager.py` - State management
- `tests/test_spec_parser.py` - Spec parsing
- `tests/test_fix_parser.py` - Fix parsing
- `tests/test_recap_parser.py` - Recap parsing
- `tests/test_progress_parser.py` - Progress parsing
- `tests/test_file_watcher.py` - File watching

**Integration Tests:**
- `tests/test_integration_end_to_end.py` - Full flow
- `tests/test_integration_cache.py` - Cache invalidation

**Run Tests:**
```bash
python -m pytest tests/ -v
```

## Logging

All services use Python's `logging` module:

```python
import logging

logging.basicConfig(level=logging.DEBUG)
logger = logging.getLogger(__name__)
```

**Log Levels:**
- `DEBUG`: File operations, cache hits/misses, event details
- `INFO`: Initialization, major operations
- `ERROR`: Parsing failures, file errors

## Future Enhancements

**Phase 1b (TUI Core UI Rebuild):**
- Reactive widgets subscribing to DataManager events
- Real-time dashboard updates
- Visual state indicators

**Phase 2 (Advanced Features):**
- Background execution monitoring
- Test result tracking
- Git integration (branch/commit info)

**Phase 3 (Intelligence):**
- Predictive caching
- Smart refresh (only changed data)
- Performance analytics
