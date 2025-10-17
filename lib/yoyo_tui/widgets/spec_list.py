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
import time
from pathlib import Path
from typing import Dict, List, Optional, Tuple

from textual.app import ComposeResult
from textual.widgets import DataTable, Static
from textual.widget import Widget
from textual.containers import Vertical


class SpecList(Widget):
    """
    Spec list widget for displaying recent specifications and fixes.

    Shows a data table with spec/fix information including progress.

    Features:
    - Async file I/O to prevent blocking UI during startup
    - TTL-based caching (30s default) to reduce file operations
    - Loading state displayed while data loads asynchronously

    Attributes:
        yoyo_dev_path: Path to .yoyo-dev directory
        _cache: TTL-based cache for spec/fix data
        _cache_ttl: Cache time-to-live in seconds
    """

    def __init__(
        self,
        yoyo_dev_path: Path | None = None,
        cache_ttl: float = 30.0,
        *args,
        **kwargs
    ):
        """
        Initialize SpecList widget.

        Args:
            yoyo_dev_path: Path to .yoyo-dev directory (defaults to ~/.yoyo-dev/.yoyo-dev)
            cache_ttl: Cache time-to-live in seconds (default: 30s)
        """
        super().__init__(*args, **kwargs)
        if yoyo_dev_path is None:
            self.yoyo_dev_path = Path.home() / '.yoyo-dev' / '.yoyo-dev'
        else:
            self.yoyo_dev_path = yoyo_dev_path

        # Caching configuration
        self._cache_ttl = cache_ttl
        self._cache: Dict[str, Tuple[float, List[dict]]] = {}
        self._is_loading = False

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
            table = DataTable(id="spec-table", show_cursor=False)
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
        # Add specs
        for spec in specs:
            table.add_row(
                spec['name'],
                "[cyan]spec[/cyan]",
                self._format_progress(spec['progress']),
                self._format_status(spec['status'])
            )

        # Add fixes
        for fix in fixes:
            table.add_row(
                fix['name'],
                "[yellow]fix[/yellow]",
                self._format_progress(fix['progress']),
                self._format_status(fix['status'])
            )

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

        if not specs_dir.exists():
            return specs

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
                'status': status
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

        if not fixes_dir.exists():
            return fixes

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
                'status': status
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
