"""
SpecList Widget - Display recent specs and fixes with progress visualization.

Shows specifications and fixes in a data table with completion progress.
Uses Textual's DataTable widget for tabular display with sorting.
"""

from pathlib import Path
from textual.app import ComposeResult
from textual.widgets import DataTable, Static
from textual.widget import Widget
from textual.containers import Vertical


class SpecList(Widget):
    """
    Spec list widget for displaying recent specifications and fixes.

    Shows a data table with spec/fix information including progress.

    Attributes:
        yoyo_dev_path: Path to .yoyo-dev directory
    """

    def __init__(self, yoyo_dev_path: Path | None = None, *args, **kwargs):
        """
        Initialize SpecList widget.

        Args:
            yoyo_dev_path: Path to .yoyo-dev directory (defaults to ~/.yoyo-dev/.yoyo-dev)
        """
        super().__init__(*args, **kwargs)
        if yoyo_dev_path is None:
            self.yoyo_dev_path = Path.home() / '.yoyo-dev' / '.yoyo-dev'
        else:
            self.yoyo_dev_path = yoyo_dev_path

    def compose(self) -> ComposeResult:
        """
        Compose the spec list layout.

        Yields:
            DataTable with spec/fix information
        """
        with Vertical(id="spec-list-container"):
            # Title
            yield Static("[bold cyan]Specifications & Fixes[/bold cyan]", id="spec-list-title")

            # Data table
            table = DataTable(id="spec-table", show_cursor=False)
            table.add_columns("Name", "Type", "Progress", "Status")

            # Load spec data
            self._populate_table(table)

            yield table

    def _populate_table(self, table: DataTable) -> None:
        """
        Populate table with spec and fix data.

        Args:
            table: DataTable to populate
        """
        specs = self._load_specs()
        fixes = self._load_fixes()

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

    def _load_specs(self) -> list[dict]:
        """
        Load specifications from .yoyo-dev/specs directory.

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
                    import json
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

                except Exception:
                    pass

            specs.append({
                'name': spec_name,
                'progress': progress,
                'status': status
            })

        return specs[:5]  # Return most recent 5

    def _load_fixes(self) -> list[dict]:
        """
        Load fixes from .yoyo-dev/fixes directory.

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
                    import json
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

                except Exception:
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

    def load_specs(self) -> None:
        """Reload spec data and refresh the table."""
        try:
            table = self.query_one("#spec-table", DataTable)
            table.clear()
            self._populate_table(table)
        except Exception:
            # Table not mounted yet
            pass

    def refresh_data(self) -> None:
        """Refresh data (alias for load_specs)."""
        self.load_specs()
