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
        cache_manager: CacheManager
    ):
        """
        Initialize DataManager.

        Args:
            yoyo_dev_path: Path to .yoyo-dev directory
            event_bus: EventBus instance for pub/sub
            cache_manager: CacheManager instance for caching
        """
        self._yoyo_dev_path = yoyo_dev_path
        self._event_bus = event_bus
        self._cache_manager = cache_manager

        # Initialize empty state
        self._state = ApplicationState()
        self._state_lock = threading.Lock()

        # Product data cache (loaded once on initialize)
        self._mission: Optional[str] = None
        self._tech_stack: List[str] = []

        # Subscribe to file system events
        self._subscribe_to_events()

        logger.info(f"DataManager initialized with yoyo_dev_path: {yoyo_dev_path}")

    def _subscribe_to_events(self):
        """Subscribe to file system events from FileWatcher."""
        self._event_bus.subscribe(EventType.FILE_CHANGED, self._on_file_changed)
        self._event_bus.subscribe(EventType.FILE_CREATED, self._on_file_created)
        self._event_bus.subscribe(EventType.FILE_DELETED, self._on_file_deleted)

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
        with self._state_lock:
            specs = self._state.specs
            fixes = self._state.fixes

            # Count active specs (not completed)
            active_specs = len([s for s in specs if s.status != "complete"])

            # Count active fixes (not completed)
            active_fixes = len([f for f in fixes if f.status != "complete"])

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
        # TODO: Implement MCP monitoring when mcp_monitor service is available
        # For now, return None
        return None

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
                    "date": spec.created_date,
                    "title": spec.title,
                    "status": spec.status,
                    "progress": spec.progress
                })

            # Add fixes
            for fix in self._state.fixes:
                actions.append({
                    "type": "fix",
                    "name": fix.name,
                    "date": fix.created_date,
                    "title": fix.title,
                    "status": fix.status,
                    "progress": fix.progress
                })

            # Add recaps
            for recap in self._state.recaps:
                actions.append({
                    "type": "recap",
                    "name": recap.name,
                    "date": recap.created_date,
                    "title": recap.title,
                    "summary": recap.summary
                })

        # Sort by date (most recent first)
        actions.sort(key=lambda x: x["date"], reverse=True)

        # Return limited list
        return actions[:limit]

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
