"""
SpecList Widget - Display recent specs and fixes with progress visualization.

Shows specifications and fixes in a data table with completion progress.
Uses Textual's DataTable widget for tabular display with sorting.

Features:
- Async file I/O to prevent blocking UI during startup
- TTL-based caching to reduce file system operations
- FileWatcher integration for cache invalidation
"""

import asyncio
import json
import logging
import time
from pathlib import Path
from typing import Dict, List, Optional, Tuple

from textual.app import ComposeResult
from textual.widgets import DataTable, Static
from textual.widget import Widget
from textual.containers import Vertical

from ..screens.spec_detail_screen import SpecDetailScreen

logger = logging.getLogger(__name__)


class SpecList(Widget):
    """
    Spec list widget for displaying recent specifications and fixes.

    Shows a data table with spec/fix information including progress.

    Features:
    - Async file I/O to prevent blocking UI during startup
    - TTL-based caching (10s default, reduced from 30s for faster updates)
    - Loading state displayed while data loads asynchronously

    Attributes:
        yoyo_dev_path: Path to .yoyo-dev directory
        _cache: TTL-based cache for spec/fix data
        _cache_ttl: Cache time-to-live in seconds (default: 10s)
    """

    def __init__(
        self,
        yoyo_dev_path: Path | None = None,
        cache_ttl: float = 10.0,
        *args,
        **kwargs
    ):
        """
        Initialize SpecList widget.

        Args:
            yoyo_dev_path: Path to .yoyo-dev directory (defaults to <cwd>/.yoyo-dev)
            cache_ttl: Cache time-to-live in seconds (default: 10s, reduced from 30s for faster updates)
        """
        super().__init__(*args, **kwargs)
        if yoyo_dev_path is None:
            self.yoyo_dev_path = Path.cwd() / '.yoyo-dev'
        else:
            self.yoyo_dev_path = yoyo_dev_path

        # Log path resolution for debugging
        logger.debug(f"SpecList initialized with yoyo_dev_path: {self.yoyo_dev_path}")

        # Caching configuration
        self._cache_ttl = cache_ttl
        self._cache: Dict[str, Tuple[float, List[dict]]] = {}
        self._is_loading = False

        # Store spec/fix metadata for navigation
        # Maps row index to (spec_folder, spec_type) tuple
        self._row_metadata: Dict[int, Tuple[Path, str]] = {}

    def compose(self) -> ComposeResult:
        """
        Compose the spec list layout.

        Shows loading placeholder initially, then updates with real data
        after async file I/O completes.

        Yields:
            DataTable with spec/fix information
        """
        with Vertical(id="spec-list-container"):
            # Title
            yield Static("[bold cyan]Specifications & Fixes[/bold cyan]", id="spec-list-title")

            # Data table with loading placeholder
            # Enable cursor so rows are clickable
            table = DataTable(id="spec-table", show_cursor=True)
            table.add_columns("Name", "Type", "Progress", "Status")

            # Show loading state initially
            table.add_row(
                "[dim italic]Loading specs...[/dim italic]",
                "[dim]—[/dim]",
                "[dim]—[/dim]",
                "[dim]—[/dim]"
            )

            yield table

    def on_mount(self) -> None:
        """
        Called when widget is mounted.

        Triggers async data loading after initial render.
        """
        # Schedule async data load
        asyncio.create_task(self._load_and_populate_async())

    async def _load_and_populate_async(self) -> None:
        """
        Load spec/fix data asynchronously and update table.

        Runs file I/O in background thread to prevent blocking UI.
        Uses cache to avoid redundant file operations.
        """
        if self._is_loading:
            return  # Already loading

        self._is_loading = True

        try:
            # Load data asynchronously (in parallel)
            specs_task = asyncio.create_task(self._load_specs_async())
            fixes_task = asyncio.create_task(self._load_fixes_async())

            # Wait for both to complete
            specs, fixes = await asyncio.gather(specs_task, fixes_task)

            # Update table with loaded data
            try:
                table = self.query_one("#spec-table", DataTable)
                table.clear()
                self._populate_table_with_data(table, specs, fixes)
            except Exception:
                # Table not mounted yet or query failed
                pass

        finally:
            self._is_loading = False

    def _populate_table_with_data(
        self,
        table: DataTable,
        specs: List[dict],
        fixes: List[dict]
    ) -> None:
        """
        Populate table with loaded spec and fix data.

        Args:
            table: DataTable to populate
            specs: List of spec dictionaries
            fixes: List of fix dictionaries
        """
        # Clear metadata mapping
        self._row_metadata.clear()

        # Add specs
        for idx, spec in enumerate(specs):
            table.add_row(
                spec['name'],
                "[cyan]spec[/cyan]",
                self._format_progress(spec['progress']),
                self._format_status(spec['status'])
            )
            # Store metadata for navigation (row_index -> (folder_path, type))
            self._row_metadata[idx] = (spec['folder'], 'spec')

        # Add fixes
        for idx, fix in enumerate(fixes):
            row_idx = len(specs) + idx  # Offset by number of specs
            table.add_row(
                fix['name'],
                "[yellow]fix[/yellow]",
                self._format_progress(fix['progress']),
                self._format_status(fix['status'])
            )
            # Store metadata for navigation
            self._row_metadata[row_idx] = (fix['folder'], 'fix')

        # If no data, show placeholder
        if len(specs) == 0 and len(fixes) == 0:
            table.add_row(
                "[dim]No specs or fixes found[/dim]",
                "[dim]—[/dim]",
                "[dim]—[/dim]",
                "[dim]—[/dim]"
            )

    async def _load_specs_async(self) -> List[dict]:
        """
        Load specifications asynchronously with caching.

        Runs file I/O in background thread. Uses TTL cache to avoid
        redundant file operations.

        Returns:
            List of spec dictionaries with name, progress, status
        """
        cache_key = 'specs'

        # Check cache
        if cache_key in self._cache:
            timestamp, cached_data = self._cache[cache_key]
            age = time.time() - timestamp

            # Return cached result if fresh
            if age < self._cache_ttl:
                return cached_data

        # Cache miss or expired - load from disk in background thread
        specs = await asyncio.to_thread(self._load_specs_sync)

        # Store in cache
        self._cache[cache_key] = (time.time(), specs)

        return specs

    async def _load_fixes_async(self) -> List[dict]:
        """
        Load fixes asynchronously with caching.

        Runs file I/O in background thread. Uses TTL cache to avoid
        redundant file operations.

        Returns:
            List of fix dictionaries with name, progress, status
        """
        cache_key = 'fixes'

        # Check cache
        if cache_key in self._cache:
            timestamp, cached_data = self._cache[cache_key]
            age = time.time() - timestamp

            # Return cached result if fresh
            if age < self._cache_ttl:
                return cached_data

        # Cache miss or expired - load from disk in background thread
        fixes = await asyncio.to_thread(self._load_fixes_sync)

        # Store in cache
        self._cache[cache_key] = (time.time(), fixes)

        return fixes

    def _load_specs_sync(self) -> List[dict]:
        """
        Load specifications from .yoyo-dev/specs directory (synchronous).

        This is the blocking version that runs in a background thread.

        Returns:
            List of spec dictionaries with name, progress, status
        """
        specs = []
        specs_dir = self.yoyo_dev_path / 'specs'

        # Validate specs directory exists
        if not specs_dir.exists():
            logger.debug(f"Specs directory does not exist: {specs_dir}")
            return specs

        # Validate it's a directory
        if not specs_dir.is_dir():
            logger.error(f"Specs path is not a directory: {specs_dir}")
            return specs

        logger.debug(f"Loading specs from: {specs_dir}")
        # Find all spec folders
        for spec_folder in sorted(specs_dir.iterdir(), reverse=True):
            if not spec_folder.is_dir():
                continue

            # Extract spec name from folder
            spec_name = spec_folder.name

            # Try to read state.json for progress
            state_file = spec_folder / 'state.json'
            progress = 0
            status = "Not Started"

            if state_file.exists():
                try:
                    with open(state_file) as f:
                        state_data = json.load(f)

                    # Calculate progress from completed_tasks
                    completed = len(state_data.get('completed_tasks', []))
                    # Estimate total tasks (rough heuristic)
                    total = max(completed + 1, 10)  # Minimum 10 tasks assumed
                    progress = int((completed / total) * 100)

                    # Determine status
                    if state_data.get('execution_completed'):
                        status = "Complete"
                    elif state_data.get('execution_started'):
                        status = "In Progress"
                    else:
                        status = "Planning"

                except json.JSONDecodeError:
                    # Corrupted state.json - log and skip
                    # Using print to stderr for logging (no logger available)
                    import sys
                    print(f"Warning: Corrupted state.json in {spec_folder.name}", file=sys.stderr)
                except Exception:
                    # Other errors (permissions, etc.) - skip silently
                    pass

            specs.append({
                'name': spec_name,
                'progress': progress,
                'status': status,
                'folder': spec_folder  # Add folder path for navigation
            })

        return specs[:5]  # Return most recent 5

    def _load_fixes_sync(self) -> List[dict]:
        """
        Load fixes from .yoyo-dev/fixes directory (synchronous).

        This is the blocking version that runs in a background thread.

        Returns:
            List of fix dictionaries with name, progress, status
        """
        fixes = []
        fixes_dir = self.yoyo_dev_path / 'fixes'

        # Validate fixes directory exists
        if not fixes_dir.exists():
            logger.debug(f"Fixes directory does not exist: {fixes_dir}")
            return fixes

        # Validate it's a directory
        if not fixes_dir.is_dir():
            logger.error(f"Fixes path is not a directory: {fixes_dir}")
            return fixes

        logger.debug(f"Loading fixes from: {fixes_dir}")
        # Find all fix folders
        for fix_folder in sorted(fixes_dir.iterdir(), reverse=True):
            if not fix_folder.is_dir():
                continue

            # Extract fix name from folder
            fix_name = fix_folder.name

            # Try to read state.json for progress
            state_file = fix_folder / 'state.json'
            progress = 0
            status = "Not Started"

            if state_file.exists():
                try:
                    with open(state_file) as f:
                        state_data = json.load(f)

                    # Calculate progress
                    completed = len(state_data.get('completed_tasks', []))
                    total = max(completed + 1, 5)  # Fixes typically have fewer tasks
                    progress = int((completed / total) * 100)

                    # Determine status
                    if state_data.get('execution_completed'):
                        status = "Complete"
                    elif state_data.get('execution_started'):
                        status = "In Progress"
                    else:
                        status = "Planning"

                except json.JSONDecodeError:
                    # Corrupted state.json - log and skip
                    # Using print to stderr for logging (no logger available)
                    import sys
                    print(f"Warning: Corrupted state.json in {fix_folder.name}", file=sys.stderr)
                except Exception:
                    # Other errors (permissions, etc.) - skip silently
                    pass

            fixes.append({
                'name': fix_name,
                'progress': progress,
                'status': status,
                'folder': fix_folder  # Add folder path for navigation
            })

        return fixes[:5]  # Return most recent 5

    def _format_progress(self, progress: int) -> str:
        """
        Format progress as colored percentage bar.

        Args:
            progress: Progress percentage (0-100)

        Returns:
            Formatted progress string
        """
        if progress == 0:
            return "[dim]0%[/dim]"
        elif progress < 50:
            return f"[yellow]{progress}%[/yellow]"
        elif progress < 100:
            return f"[cyan]{progress}%[/cyan]"
        else:
            return f"[green]{progress}%[/green]"

    def _format_status(self, status: str) -> str:
        """
        Format status with color coding.

        Args:
            status: Status string

        Returns:
            Formatted status string
        """
        if status == "Complete":
            return "[green]✓ Complete[/green]"
        elif status == "In Progress":
            return "[cyan]⟳ In Progress[/cyan]"
        elif status == "Planning":
            return "[yellow]◆ Planning[/yellow]"
        else:
            return "[dim]○ Not Started[/dim]"

    def invalidate_cache(self, cache_key: Optional[str] = None) -> None:
        """
        Invalidate cache to force reload on next access.

        Args:
            cache_key: Specific cache key to invalidate ('specs' or 'fixes').
                      If None, invalidates entire cache.
        """
        if cache_key is None:
            self._cache.clear()
        else:
            self._cache.pop(cache_key, None)

    def load_specs(self) -> None:
        """
        Reload spec data and refresh the table.

        Invalidates cache and triggers async reload.
        """
        # Invalidate cache to force fresh load
        self.invalidate_cache()

        # Trigger async reload
        asyncio.create_task(self._load_and_populate_async())

    def refresh_data(self) -> None:
        """Refresh data (alias for load_specs)."""
        self.load_specs()

    def on_data_table_row_selected(self, event: DataTable.RowSelected) -> None:
        """
        Handle row selection in the spec/fix table.

        Navigates to SpecDetailScreen for the selected spec or fix.

        Args:
            event: Row selection event with row_key
        """
        try:
            # Get the row index from the event
            table = event.data_table
            row_key = event.row_key

            # Get row index from row_key
            # Row keys are RowKey objects, need to get the index
            rows = list(table.rows.keys())
            if row_key not in rows:
                return

            row_index = rows.index(row_key)

            # Get metadata for this row
            if row_index not in self._row_metadata:
                # No metadata (probably the placeholder row)
                return

            spec_folder, spec_type = self._row_metadata[row_index]

            # Navigate to SpecDetailScreen
            self.app.push_screen(
                SpecDetailScreen(
                    spec_folder=spec_folder,
                    spec_type=spec_type
                )
            )

        except Exception as e:
            logger.error(f"Error handling row selection: {e}")
            self.app.notify("Could not open spec details", severity="error", timeout=2)
