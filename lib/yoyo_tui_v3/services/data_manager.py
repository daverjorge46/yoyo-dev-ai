"""
DataManager Service - Centralized State Management

Provides:
- Centralized state store (specs, fixes, tasks, recaps, execution_progress)
- Event-driven updates via EventBus
- Cache integration for performance
- Thread-safe state access
- Query API for UI components

Architecture:
- Subscribes to FILE_CHANGED/CREATED/DELETED events from FileWatcher
- Emits STATE_UPDATED events when state changes
- Uses CacheManager for parsed data caching
- All parsers loaded on initialization
"""

import logging
import threading
from pathlib import Path
from typing import List, Optional, Dict
from datetime import datetime

from ..models import (
    ApplicationState,
    SpecData,
    FixData,
    TaskData,
    RecapData,
    ExecutionProgress,
    GitStatus,
    ProjectStats,
    MCPServerStatus,
    Event,
    EventType
)
from .event_bus import EventBus
from .cache_manager import CacheManager
from ..parsers.spec_parser import SpecParser
from ..parsers.fix_parser import FixParser
from ..parsers.recap_parser import RecapParser
from ..parsers.progress_parser import ProgressParser
from ..parsers.task_parser import TaskParser
from ..parsers.mission_parser import MissionParser
from ..parsers.tech_stack_parser import TechStackParser
from ..parsers.roadmap_parser import RoadmapParser

logger = logging.getLogger(__name__)


class DataManager:
    """
    Centralized data manager for TUI dashboard.

    Manages all application state with event-driven updates and caching.
    Thread-safe with automatic cache invalidation on file changes.
    """

    def __init__(
        self,
        yoyo_dev_path: Path,
        event_bus: EventBus,
        cache_manager: CacheManager,
        command_suggester=None,
        error_detector=None,
        mcp_monitor=None
    ):
        """
        Initialize DataManager.

        Args:
            yoyo_dev_path: Path to .yoyo-dev directory
            event_bus: EventBus instance for pub/sub
            cache_manager: CacheManager instance for caching
            command_suggester: IntelligentCommandSuggester instance (optional)
            error_detector: ErrorDetector instance (optional)
            mcp_monitor: MCPServerMonitor instance (optional)
        """
        self._yoyo_dev_path = yoyo_dev_path
        self._event_bus = event_bus
        self._cache_manager = cache_manager
        self.command_suggester = command_suggester
        self.error_detector = error_detector
        self.mcp_monitor = mcp_monitor

        # Initialize empty state
        self._state = ApplicationState()
        self._state_lock = threading.Lock()

        # Product data cache (loaded once on initialize)
        self._mission: Optional[str] = None
        self._tech_stack: List[str] = []

        # Track event subscriptions for cleanup
        self._subscriptions = []

        # Subscribe to file system events
        self._subscribe_to_events()

        logger.info(f"DataManager initialized with yoyo_dev_path: {yoyo_dev_path}")

    def _subscribe_to_events(self):
        """Subscribe to file system events from FileWatcher."""
        self._subscriptions.append((EventType.FILE_CHANGED, self._on_file_changed))
        self._event_bus.subscribe(EventType.FILE_CHANGED, self._on_file_changed)

        self._subscriptions.append((EventType.FILE_CREATED, self._on_file_created))
        self._event_bus.subscribe(EventType.FILE_CREATED, self._on_file_created)

        self._subscriptions.append((EventType.FILE_DELETED, self._on_file_deleted))
        self._event_bus.subscribe(EventType.FILE_DELETED, self._on_file_deleted)

    def cleanup(self) -> None:
        """
        Clean up resources and unsubscribe from events.

        Should be called when DataManager is being shut down to prevent memory leaks.
        """
        # Unsubscribe all event handlers
        for event_type, handler in self._subscriptions:
            self._event_bus.unsubscribe(event_type, handler)
        self._subscriptions.clear()

        logger.info("DataManager cleanup complete")

    @property
    def state(self) -> ApplicationState:
        """Get current application state (thread-safe read)."""
        with self._state_lock:
            return self._state

    def initialize(self) -> None:
        """
        Initialize data by loading all specs, fixes, and recaps from file system.

        Loads:
        - All specs from .yoyo-dev/specs/
        - All fixes from .yoyo-dev/fixes/
        - All recaps from .yoyo-dev/recaps/
        - Execution progress (if exists)
        - Product files (mission, tech stack)

        Emits STATE_UPDATED event after loading.
        """
        logger.info("Initializing DataManager - loading all data...")

        with self._state_lock:
            # Load specs
            self._state.specs = self._load_all_specs()
            logger.debug(f"Loaded {len(self._state.specs)} specs")

            # Load fixes
            self._state.fixes = self._load_all_fixes()
            logger.debug(f"Loaded {len(self._state.fixes)} fixes")

            # Load recaps
            self._state.recaps = self._load_all_recaps()
            logger.debug(f"Loaded {len(self._state.recaps)} recaps")

            # Load execution progress
            self._state.execution_progress = self._load_execution_progress()

            # Update timestamp
            self._state.last_updated = datetime.now()

        # Load product files (outside lock for better performance)
        self._load_product_files()

        # Emit STATE_UPDATED event
        self._event_bus.publish(
            EventType.STATE_UPDATED,
            {"source": "initialize", "specs_count": len(self._state.specs)},
            source="DataManager"
        )

        logger.info("DataManager initialization complete")

    def _load_product_files(self) -> None:
        """
        Load product files (mission, tech stack) with caching.

        Called during initialize() to load product context.
        """
        product_path = self._yoyo_dev_path / "product"

        # Load mission statement
        cache_key = "mission"
        cached_mission = self._cache_manager.get(cache_key)

        if cached_mission is not None:
            self._mission = cached_mission
            logger.debug("Cache hit for mission")
        else:
            self._mission = MissionParser.parse(product_path)
            if self._mission is not None:
                self._cache_manager.set(cache_key, self._mission)
                logger.debug("Parsed and cached mission")

        # Load tech stack
        cache_key = "tech_stack"
        cached_tech_stack = self._cache_manager.get(cache_key)

        if cached_tech_stack is not None:
            self._tech_stack = cached_tech_stack
            logger.debug("Cache hit for tech_stack")
        else:
            self._tech_stack = TechStackParser.parse(product_path)
            if self._tech_stack:
                self._cache_manager.set(cache_key, self._tech_stack)
                logger.debug(f"Parsed and cached {len(self._tech_stack)} tech items")

    def _load_all_specs(self) -> List[SpecData]:
        """
        Load all specs from .yoyo-dev/specs/.

        Returns:
            List of SpecData (empty if directory doesn't exist)
        """
        specs = []
        specs_dir = self._yoyo_dev_path / "specs"

        if not specs_dir.exists():
            return specs

        try:
            for spec_folder in specs_dir.iterdir():
                if not spec_folder.is_dir():
                    continue

                # Check cache first
                cache_key = f"spec:{spec_folder.name}"
                cached = self._cache_manager.get(cache_key)

                if cached is not None:
                    specs.append(cached)
                    logger.debug(f"Cache hit for spec: {spec_folder.name}")
                    continue

                # Parse spec
                spec_data = SpecParser.parse(spec_folder)

                if spec_data is not None:
                    specs.append(spec_data)
                    # Cache the result
                    self._cache_manager.set(cache_key, spec_data)
                    logger.debug(f"Parsed and cached spec: {spec_folder.name}")

        except (OSError, PermissionError) as e:
            logger.error(f"Error loading specs: {e}")

        return specs

    def _load_all_fixes(self) -> List[FixData]:
        """
        Load all fixes from .yoyo-dev/fixes/.

        Returns:
            List of FixData (empty if directory doesn't exist)
        """
        fixes = []
        fixes_dir = self._yoyo_dev_path / "fixes"

        if not fixes_dir.exists():
            return fixes

        try:
            for fix_folder in fixes_dir.iterdir():
                if not fix_folder.is_dir():
                    continue

                # Check cache first
                cache_key = f"fix:{fix_folder.name}"
                cached = self._cache_manager.get(cache_key)

                if cached is not None:
                    fixes.append(cached)
                    logger.debug(f"Cache hit for fix: {fix_folder.name}")
                    continue

                # Parse fix
                fix_data = FixParser.parse(fix_folder)

                if fix_data is not None:
                    fixes.append(fix_data)
                    # Cache the result
                    self._cache_manager.set(cache_key, fix_data)
                    logger.debug(f"Parsed and cached fix: {fix_folder.name}")

        except (OSError, PermissionError) as e:
            logger.error(f"Error loading fixes: {e}")

        return fixes

    def _load_all_recaps(self) -> List[RecapData]:
        """
        Load all recaps from .yoyo-dev/recaps/.

        Returns:
            List of RecapData (empty if directory doesn't exist)
        """
        recaps = []
        recaps_dir = self._yoyo_dev_path / "recaps"

        if not recaps_dir.exists():
            return recaps

        try:
            for recap_file in recaps_dir.iterdir():
                if not recap_file.is_file() or not recap_file.suffix == ".md":
                    continue

                # Check cache first
                cache_key = f"recap:{recap_file.name}"
                cached = self._cache_manager.get(cache_key)

                if cached is not None:
                    recaps.append(cached)
                    logger.debug(f"Cache hit for recap: {recap_file.name}")
                    continue

                # Parse recap
                recap_data = RecapParser.parse(recap_file)

                if recap_data is not None:
                    recaps.append(recap_data)
                    # Cache the result
                    self._cache_manager.set(cache_key, recap_data)
                    logger.debug(f"Parsed and cached recap: {recap_file.name}")

        except (OSError, PermissionError) as e:
            logger.error(f"Error loading recaps: {e}")

        return recaps

    def _load_execution_progress(self) -> Optional[ExecutionProgress]:
        """
        Load execution progress from .yoyo-dev/.cache/execution-progress.json.

        Returns:
            ExecutionProgress if file exists, None otherwise
        """
        progress_file = self._yoyo_dev_path / ".cache" / "execution-progress.json"

        if not progress_file.exists():
            return None

        # Check cache first
        cache_key = "execution_progress"
        cached = self._cache_manager.get(cache_key)

        if cached is not None:
            logger.debug("Cache hit for execution progress")
            return cached

        # Parse progress
        progress = ProgressParser.parse(progress_file)

        # Cache the result
        self._cache_manager.set(cache_key, progress)

        return progress

    # ============================================================================
    # Query API
    # ============================================================================

    def get_all_specs(self) -> List[SpecData]:
        """Get all specs (thread-safe)."""
        with self._state_lock:
            return self._state.specs.copy()

    def get_spec_by_name(self, name: str) -> Optional[SpecData]:
        """
        Get spec by name.

        Args:
            name: Clean spec name (without date prefix)

        Returns:
            SpecData if found, None otherwise
        """
        with self._state_lock:
            for spec in self._state.specs:
                if spec.name == name:
                    return spec
        return None

    def get_all_fixes(self) -> List[FixData]:
        """Get all fixes (thread-safe)."""
        with self._state_lock:
            return self._state.fixes.copy()

    def get_fix_by_name(self, name: str) -> Optional[FixData]:
        """
        Get fix by name.

        Args:
            name: Clean fix name (without date prefix)

        Returns:
            FixData if found, None otherwise
        """
        with self._state_lock:
            for fix in self._state.fixes:
                if fix.name == name:
                    return fix
        return None

    def get_all_tasks(self) -> List[TaskData]:
        """Get all tasks (thread-safe)."""
        with self._state_lock:
            return self._state.tasks.copy()

    def get_task_by_id(self, task_id: str, spec_name: str) -> Optional[TaskData]:
        """
        Get task by ID and spec name.

        Args:
            task_id: Task identifier
            spec_name: Spec name the task belongs to

        Returns:
            TaskData if found, None otherwise
        """
        with self._state_lock:
            for task in self._state.tasks:
                if task.id == task_id and task.spec_name == spec_name:
                    return task
            return None

    def get_all_recaps(self) -> List[RecapData]:
        """Get all recaps (thread-safe)."""
        with self._state_lock:
            return self._state.recaps.copy()

    def get_execution_progress(self) -> Optional[ExecutionProgress]:
        """Get current execution progress (thread-safe)."""
        with self._state_lock:
            return self._state.execution_progress

    def get_mission_statement(self) -> Optional[str]:
        """
        Get mission statement from product files.

        Returns:
            Mission statement string (first paragraph, max 100 chars), or None if not found
        """
        return self._mission

    def get_tech_stack_summary(self) -> List[str]:
        """
        Get tech stack summary from product files.

        Returns:
            List of technology names (empty list if not found)
        """
        return self._tech_stack

    def get_project_stats(self) -> Optional[ProjectStats]:
        """
        Get project statistics (specs, fixes, tasks, errors).

        Returns:
            ProjectStats with current counts, or None if no data available
        """
        from ..models import SpecStatus

        with self._state_lock:
            specs = self._state.specs
            fixes = self._state.fixes

            # Count active specs (not completed)
            active_specs = len([s for s in specs if s.status != SpecStatus.COMPLETED])

            # Count active fixes (not completed)
            active_fixes = len([f for f in fixes if f.status != SpecStatus.COMPLETED])

            # Count pending tasks from all specs and fixes
            pending_tasks = 0
            for spec in specs:
                if hasattr(spec, 'total_tasks') and hasattr(spec, 'completed_tasks'):
                    pending_tasks += (spec.total_tasks - spec.completed_tasks)

            for fix in fixes:
                if hasattr(fix, 'total_tasks') and hasattr(fix, 'completed_tasks'):
                    pending_tasks += (fix.total_tasks - fix.completed_tasks)

            # Recent errors (placeholder - would need error detection)
            recent_errors = 0

            return ProjectStats(
                active_specs=active_specs,
                active_fixes=active_fixes,
                pending_tasks=pending_tasks,
                recent_errors=recent_errors
            )

    def get_mcp_status(self) -> Optional[MCPServerStatus]:
        """
        Get MCP server connection status.

        Returns:
            MCPServerStatus if available, None otherwise
        """
        if self.mcp_monitor is not None:
            return self.mcp_monitor.get_status()
        return None

    def get_active_work(self) -> Optional['ActiveWork']:
        """
        Get current active work (spec or fix with incomplete tasks).

        Finds the most recent spec or fix that has incomplete tasks (progress < 100%).
        Returns None if no active work is found.

        Returns:
            ActiveWork with most recent active item, or None if no active work
        """
        from ..models import ActiveWork

        with self._state_lock:
            # Collect all items with incomplete tasks
            active_items = []

            # Check specs for incomplete tasks
            for spec in self._state.specs:
                if spec.progress < 100:
                    # Parse tasks from tasks.md
                    tasks_file = spec.path / "tasks.md"
                    tasks = self._parse_tasks_to_task_list(tasks_file)

                    active_items.append({
                        'type': 'spec',
                        'name': spec.name,
                        'date': spec.date,
                        'path': spec.path,
                        'tasks': tasks,
                        'progress': spec.progress,
                        'status': spec.status.value if hasattr(spec.status, 'value') else str(spec.status)
                    })
                    logger.debug(f"Found active spec: {spec.name} (progress: {spec.progress}%)")

            # Check fixes for incomplete tasks
            for fix in self._state.fixes:
                if fix.progress < 100:
                    # Parse tasks from tasks.md
                    tasks_file = fix.path / "tasks.md"
                    tasks = self._parse_tasks_to_task_list(tasks_file)

                    active_items.append({
                        'type': 'fix',
                        'name': fix.name,
                        'date': fix.date,
                        'path': fix.path,
                        'tasks': tasks,
                        'progress': fix.progress,
                        'status': fix.status.value if hasattr(fix.status, 'value') else str(fix.status)
                    })
                    logger.debug(f"Found active fix: {fix.name} (progress: {fix.progress}%)")

            # Return None if no active items found
            if not active_items:
                logger.debug("No active work found (all tasks complete or no specs/fixes)")
                return None

            # Sort by date (most recent first)
            active_items.sort(key=lambda x: x['date'], reverse=True)

            # Get most recent item
            most_recent = active_items[0]

            logger.info(f"Active work: {most_recent['type']} '{most_recent['name']}' ({most_recent['progress']:.1f}% complete)")

            # Transform to ActiveWork model
            return ActiveWork(
                type=most_recent['type'],
                name=most_recent['name'],
                path=most_recent['path'],
                tasks=most_recent['tasks'],
                progress=most_recent['progress'],
                status=most_recent['status']
            )

    def _parse_tasks_to_task_list(self, tasks_file: Path) -> List['Task']:
        """
        Parse tasks.md file and convert to List[Task].

        Args:
            tasks_file: Path to tasks.md

        Returns:
            List of Task objects (empty list if file doesn't exist)
        """
        from ..models import Task, TaskStatus

        if not tasks_file.exists():
            logger.warning(f"tasks.md not found: {tasks_file}")
            return []

        try:
            # Parse tasks.md content directly
            with open(tasks_file, 'r') as f:
                content = f.read()

            # Use TaskParser's internal parsing method
            parent_tasks = TaskParser._parse_parent_tasks(content)

            tasks = []
            for parent_task in parent_tasks:
                # Convert subtasks to list of strings
                subtask_strings = [st.text for st in parent_task.subtasks]

                # Determine task status based on completion
                if parent_task.completed:
                    status = TaskStatus.COMPLETED
                elif any(st.completed for st in parent_task.subtasks):
                    status = TaskStatus.IN_PROGRESS
                else:
                    status = TaskStatus.PENDING

                # Create Task object
                task = Task(
                    id=f"task-{parent_task.number}",
                    title=parent_task.name,
                    subtasks=subtask_strings,
                    status=status
                )

                tasks.append(task)

            logger.debug(f"Parsed {len(tasks)} tasks from {tasks_file}")
            return tasks

        except Exception as e:
            logger.error(f"Error parsing tasks from {tasks_file}: {e}")
            return []

    def get_recent_actions(self, limit: int = 10) -> List[Dict]:
        """
        Get recent actions (specs, fixes, recaps) in chronological order.

        Aggregates all items by creation date and returns most recent.

        Args:
            limit: Maximum number of items to return

        Returns:
            List of dicts with keys: type, name, date, title
        """
        actions = []

        with self._state_lock:
            # Add specs
            for spec in self._state.specs:
                actions.append({
                    "type": "spec",
                    "name": spec.name,
                    "date": spec.date,
                    "title": getattr(spec, 'title', spec.name),
                    "status": spec.status.value if hasattr(spec.status, 'value') else spec.status,
                    "progress": spec.progress
                })

            # Add fixes
            for fix in self._state.fixes:
                actions.append({
                    "type": "fix",
                    "name": fix.name,
                    "date": fix.date,
                    "title": getattr(fix, 'title', fix.name),
                    "status": fix.status.value if hasattr(fix.status, 'value') else fix.status,
                    "progress": fix.progress
                })

            # Add recaps
            for recap in self._state.recaps:
                actions.append({
                    "type": "recap",
                    "name": recap.get('name', 'unknown'),
                    "date": recap.get('created_date', 'unknown'),
                    "title": recap.get('title', 'unknown'),
                    "summary": recap.get('summary', '')
                })

        # Sort by date (most recent first)
        actions.sort(key=lambda x: x["date"], reverse=True)

        # Return limited list
        return actions[:limit]

    def get_recent_history(self, count: int = 10) -> List['HistoryEntry']:
        """
        Get recent history combining specs, fixes, and recaps as HistoryEntry objects.

        Transforms all data sources into HistoryEntry view models with chronological
        ordering (most recent first). Used by history_panel widget.

        Args:
            count: Maximum number of entries to return (default: 10)

        Returns:
            List of HistoryEntry objects sorted by timestamp (most recent first)
        """
        from ..models import HistoryEntry, ActionType, SpecStatus

        history_entries = []

        with self._state_lock:
            # Transform specs to HistoryEntry
            for spec in self._state.specs:
                try:
                    # Parse date string to datetime
                    timestamp = self._parse_date_to_datetime(spec.date)

                    # Determine success based on status (handle enum)
                    status_value = spec.status.value if hasattr(spec.status, 'value') else spec.status
                    success = status_value == "completed"

                    # Create description
                    description = f"Spec: {spec.name}"

                    # Create details with status and progress
                    details = f"Status: {status_value}, Progress: {spec.progress:.0f}%"

                    entry = HistoryEntry(
                        timestamp=timestamp,
                        action_type=ActionType.SPEC,
                        description=description,
                        success=success,
                        details=details
                    )
                    history_entries.append(entry)

                except Exception as e:
                    logger.warning(f"Error transforming spec '{spec.name}' to HistoryEntry: {e}")
                    continue

            # Transform fixes to HistoryEntry
            for fix in self._state.fixes:
                try:
                    # Parse date string to datetime
                    timestamp = self._parse_date_to_datetime(fix.date)

                    # Determine success based on status (handle enum)
                    status_value = fix.status.value if hasattr(fix.status, 'value') else fix.status
                    success = status_value == "completed"

                    # Create description
                    description = f"Fix: {fix.name}"

                    # Create details with status and progress
                    details = f"Status: {status_value}, Progress: {fix.progress:.0f}%"

                    entry = HistoryEntry(
                        timestamp=timestamp,
                        action_type=ActionType.FIX,
                        description=description,
                        success=success,
                        details=details
                    )
                    history_entries.append(entry)

                except Exception as e:
                    logger.warning(f"Error transforming fix '{fix.name}' to HistoryEntry: {e}")
                    continue

            # Transform recaps to HistoryEntry
            for recap in self._state.recaps:
                try:
                    # Parse date string to datetime
                    # Recaps are dicts with 'created_date' key
                    date_str = recap.get('created_date', 'unknown')
                    timestamp = self._parse_date_to_datetime(date_str)

                    # Recaps are always successful
                    success = True

                    # Create description
                    recap_name = recap.get('name', 'unknown')
                    description = f"Recap: {recap_name}"

                    # Create details with summary
                    summary = recap.get('summary', '')
                    details = summary if summary else None

                    entry = HistoryEntry(
                        timestamp=timestamp,
                        action_type=ActionType.COMMAND,  # Recaps are command outputs
                        description=description,
                        success=success,
                        details=details
                    )
                    history_entries.append(entry)

                except Exception as e:
                    logger.warning(f"Error transforming recap to HistoryEntry: {e}")
                    continue

        # Sort by timestamp (most recent first)
        history_entries.sort(key=lambda x: x.timestamp, reverse=True)

        # Limit results to count parameter
        limited_entries = history_entries[:count] if count > 0 else []

        logger.debug(f"get_recent_history: Returning {len(limited_entries)} entries (requested: {count})")

        return limited_entries

    def _parse_date_to_datetime(self, date_str: str) -> datetime:
        """
        Parse date string to datetime object.

        Handles YYYY-MM-DD format. Falls back to current datetime if parsing fails.

        Args:
            date_str: Date string in YYYY-MM-DD format

        Returns:
            datetime object
        """
        try:
            # Parse YYYY-MM-DD format
            return datetime.strptime(date_str, "%Y-%m-%d")
        except (ValueError, TypeError) as e:
            logger.warning(f"Error parsing date '{date_str}': {e}. Using current datetime.")
            # Fallback to current datetime
            return datetime.now()

    def refresh_all(self) -> None:
        """
        Refresh all data from file system.

        Reloads specs, fixes, recaps, execution progress, and product files.
        Emits STATE_UPDATED event after refresh.
        """
        logger.info("Refreshing all data...")

        with self._state_lock:
            self._state.specs = self._load_all_specs()
            self._state.fixes = self._load_all_fixes()
            self._state.recaps = self._load_all_recaps()
            self._state.execution_progress = self._load_execution_progress()
            self._state.last_updated = datetime.now()

        # Reload product files
        self._load_product_files()

        # Emit STATE_UPDATED event
        self._event_bus.publish(
            EventType.STATE_UPDATED,
            {"source": "refresh_all"},
            source="DataManager"
        )

        logger.info("Refresh complete")

    # ============================================================================
    # Event Handlers
    # ============================================================================

    def _on_file_changed(self, event: Event) -> None:
        """
        Handle FILE_CHANGED event.

        Invalidates cache and re-parses affected file.

        Args:
            event: FILE_CHANGED event with file_path in data
        """
        file_path_str = event.data.get("file_path")
        if not file_path_str:
            return

        file_path = Path(file_path_str)
        logger.debug(f"File changed: {file_path}")

        # Determine file type and handle accordingly
        if "/specs/" in str(file_path):
            self._handle_spec_change(file_path)
        elif "/fixes/" in str(file_path):
            self._handle_fix_change(file_path)
        elif "/recaps/" in str(file_path):
            self._handle_recap_change(file_path)
        elif "execution-progress.json" in str(file_path):
            self._handle_progress_change(file_path)
        elif "/product/" in str(file_path):
            self._handle_product_change(file_path)

    def _on_file_created(self, event: Event) -> None:
        """
        Handle FILE_CREATED event.

        Parses new file and adds to state.

        Args:
            event: FILE_CREATED event with file_path in data
        """
        file_path_str = event.data.get("file_path")
        if not file_path_str:
            return

        file_path = Path(file_path_str)
        logger.debug(f"File created: {file_path}")

        # Determine file type and handle accordingly
        if "/specs/" in str(file_path):
            self._handle_spec_change(file_path)
        elif "/fixes/" in str(file_path):
            self._handle_fix_change(file_path)
        elif "/recaps/" in str(file_path):
            self._handle_recap_change(file_path)
        elif "/product/" in str(file_path):
            self._handle_product_change(file_path)

    def _on_file_deleted(self, event: Event) -> None:
        """
        Handle FILE_DELETED event.

        Removes item from state.

        Args:
            event: FILE_DELETED event with file_path in data
        """
        file_path_str = event.data.get("file_path")
        if not file_path_str:
            return

        file_path = Path(file_path_str)
        logger.debug(f"File deleted: {file_path}")

        # Determine file type and handle accordingly
        if "/specs/" in str(file_path):
            self._handle_spec_deletion(file_path)
        elif "/fixes/" in str(file_path):
            self._handle_fix_deletion(file_path)
        elif "/recaps/" in str(file_path):
            self._handle_recap_deletion(file_path)

    def _handle_spec_change(self, file_path: Path) -> None:
        """Handle spec file change/creation."""
        # Find spec folder
        spec_folder = self._find_parent_folder(file_path, "specs")
        if not spec_folder:
            return

        # Invalidate cache
        cache_key = f"spec:{spec_folder.name}"
        self._cache_manager.invalidate(cache_key)

        # Re-parse spec
        spec_data = SpecParser.parse(spec_folder)
        if spec_data is None:
            return

        # Update state
        with self._state_lock:
            # Remove old version (if exists)
            self._state.specs = [s for s in self._state.specs if s.name != spec_data.name]
            # Add new version
            self._state.specs.append(spec_data)
            self._state.last_updated = datetime.now()

        # Cache the new version
        self._cache_manager.set(cache_key, spec_data)

        # Emit STATE_UPDATED event
        self._event_bus.publish(
            EventType.STATE_UPDATED,
            {"source": "spec_change", "spec_name": spec_data.name},
            source="DataManager"
        )

        logger.info(f"Updated spec: {spec_data.name}")

    def _handle_fix_change(self, file_path: Path) -> None:
        """Handle fix file change/creation."""
        # Find fix folder
        fix_folder = self._find_parent_folder(file_path, "fixes")
        if not fix_folder:
            return

        # Invalidate cache
        cache_key = f"fix:{fix_folder.name}"
        self._cache_manager.invalidate(cache_key)

        # Re-parse fix
        fix_data = FixParser.parse(fix_folder)
        if fix_data is None:
            return

        # Update state
        with self._state_lock:
            # Remove old version (if exists)
            self._state.fixes = [f for f in self._state.fixes if f.name != fix_data.name]
            # Add new version
            self._state.fixes.append(fix_data)
            self._state.last_updated = datetime.now()

        # Cache the new version
        self._cache_manager.set(cache_key, fix_data)

        # Emit STATE_UPDATED event
        self._event_bus.publish(
            EventType.STATE_UPDATED,
            {"source": "fix_change", "fix_name": fix_data.name},
            source="DataManager"
        )

        logger.info(f"Updated fix: {fix_data.name}")

    def _handle_recap_change(self, file_path: Path) -> None:
        """Handle recap file change/creation."""
        if not file_path.suffix == ".md":
            return

        # Invalidate cache
        cache_key = f"recap:{file_path.name}"
        self._cache_manager.invalidate(cache_key)

        # Re-parse recap
        recap_data = RecapParser.parse(file_path)
        if recap_data is None:
            return

        # Update state
        with self._state_lock:
            # Remove old version (if exists)
            self._state.recaps = [r for r in self._state.recaps if r.name != recap_data.name]
            # Add new version
            self._state.recaps.append(recap_data)
            self._state.last_updated = datetime.now()

        # Cache the new version
        self._cache_manager.set(cache_key, recap_data)

        # Emit STATE_UPDATED event
        self._event_bus.publish(
            EventType.STATE_UPDATED,
            {"source": "recap_change", "recap_name": recap_data.name},
            source="DataManager"
        )

        logger.info(f"Updated recap: {recap_data.name}")

    def _handle_progress_change(self, file_path: Path) -> None:
        """Handle execution progress file change."""
        # Invalidate cache
        self._cache_manager.invalidate("execution_progress")

        # Re-parse progress
        progress = ProgressParser.parse(file_path)

        # Update state
        with self._state_lock:
            self._state.execution_progress = progress
            self._state.last_updated = datetime.now()

        # Cache the new version
        self._cache_manager.set("execution_progress", progress)

        # Emit STATE_UPDATED event
        self._event_bus.publish(
            EventType.STATE_UPDATED,
            {"source": "progress_change"},
            source="DataManager"
        )

        logger.info("Updated execution progress")

    def _handle_product_change(self, file_path: Path) -> None:
        """Handle product file change (mission, tech-stack, roadmap)."""
        # Invalidate product caches
        if "mission" in str(file_path):
            self._cache_manager.invalidate("mission")
        elif "tech-stack" in str(file_path):
            self._cache_manager.invalidate("tech_stack")

        # Reload product files
        self._load_product_files()

        # Emit STATE_UPDATED event
        self._event_bus.publish(
            EventType.STATE_UPDATED,
            {"source": "product_change"},
            source="DataManager"
        )

        logger.info(f"Updated product file: {file_path.name}")

    def _handle_spec_deletion(self, file_path: Path) -> None:
        """Handle spec file deletion."""
        # Find spec folder
        spec_folder = self._find_parent_folder(file_path, "specs")
        if not spec_folder:
            return

        # Get spec name from folder
        spec_name = SpecParser._extract_clean_name(spec_folder.name)

        # Invalidate cache
        cache_key = f"spec:{spec_folder.name}"
        self._cache_manager.invalidate(cache_key)

        # Remove from state
        with self._state_lock:
            self._state.specs = [s for s in self._state.specs if s.name != spec_name]
            self._state.last_updated = datetime.now()

        # Emit STATE_UPDATED event
        self._event_bus.publish(
            EventType.STATE_UPDATED,
            {"source": "spec_deletion", "spec_name": spec_name},
            source="DataManager"
        )

        logger.info(f"Removed spec: {spec_name}")

    def _handle_fix_deletion(self, file_path: Path) -> None:
        """Handle fix file deletion."""
        # Find fix folder
        fix_folder = self._find_parent_folder(file_path, "fixes")
        if not fix_folder:
            return

        # Get fix name from folder
        fix_name = FixParser._extract_clean_name(fix_folder.name)

        # Invalidate cache
        cache_key = f"fix:{fix_folder.name}"
        self._cache_manager.invalidate(cache_key)

        # Remove from state
        with self._state_lock:
            self._state.fixes = [f for f in self._state.fixes if f.name != fix_name]
            self._state.last_updated = datetime.now()

        # Emit STATE_UPDATED event
        self._event_bus.publish(
            EventType.STATE_UPDATED,
            {"source": "fix_deletion", "fix_name": fix_name},
            source="DataManager"
        )

        logger.info(f"Removed fix: {fix_name}")

    def _handle_recap_deletion(self, file_path: Path) -> None:
        """Handle recap file deletion."""
        if not file_path.suffix == ".md":
            return

        # Get recap name from filename
        recap_name = RecapParser._extract_clean_name(file_path.stem)

        # Invalidate cache
        cache_key = f"recap:{file_path.name}"
        self._cache_manager.invalidate(cache_key)

        # Remove from state
        with self._state_lock:
            self._state.recaps = [r for r in self._state.recaps if r.name != recap_name]
            self._state.last_updated = datetime.now()

        # Emit STATE_UPDATED event
        self._event_bus.publish(
            EventType.STATE_UPDATED,
            {"source": "recap_deletion", "recap_name": recap_name},
            source="DataManager"
        )

        logger.info(f"Removed recap: {recap_name}")

    def _find_parent_folder(self, file_path: Path, folder_type: str) -> Optional[Path]:
        """
        Find parent folder for a file (spec or fix folder).

        Args:
            file_path: Path to file
            folder_type: Type of folder ("specs" or "fixes")

        Returns:
            Path to parent folder, or None if not found
        """
        # Walk up the path to find the folder
        for parent in file_path.parents:
            if parent.parent.name == folder_type:
                return parent

        return None

    # ========================================================================
    # Service Integration Methods
    # ========================================================================

    def get_command_suggestions(self):
        """
        Get intelligent command suggestions from CommandSuggester service.

        Returns:
            List of CommandSuggestion objects, or empty list if service unavailable
        """
        if self.command_suggester is None:
            logger.warning("CommandSuggester service not available")
            return []

        try:
            # Generate suggestions based on current state
            # CommandSuggester will call back to get_active_work() internally
            suggestions = self.command_suggester.generate_suggestions()

            return suggestions
        except Exception as e:
            logger.error(f"Error getting command suggestions: {e}")
            return []

    def get_recent_errors(self, limit: int = 5):
        """
        Get recent detected errors from ErrorDetector service.

        Args:
            limit: Maximum number of errors to return (default: 5)

        Returns:
            List of DetectedError objects, or empty list if service unavailable
        """
        if self.error_detector is None:
            logger.warning("ErrorDetector service not available")
            return []

        try:
            # Get recent errors from error detector
            errors = self.error_detector.get_recent_errors(limit=limit)

            return errors
        except Exception as e:
            logger.error(f"Error getting recent errors: {e}")
            return []
