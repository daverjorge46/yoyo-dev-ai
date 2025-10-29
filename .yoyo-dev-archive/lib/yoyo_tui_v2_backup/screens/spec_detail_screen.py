"""
SpecDetailScreen - Display detailed view of a specification or fix.

Shows spec/fix details including:
- Spec name and type (spec/fix)
- Creation date and status
- Full spec content from spec.md or spec-lite.md
- Sub-specs (technical-spec, api-spec, database-schema)
- Associated tasks progress
"""

import json
from pathlib import Path
from typing import Optional, List, Dict, Any
from textual.app import ComposeResult
from textual.screen import Screen
from textual.widgets import Header, Footer, Static, Markdown, TabbedContent, TabPane
from textual.containers import Vertical, Container
from textual.binding import Binding


class SpecDetailScreen(Screen):
    """
    Spec detail screen displaying specification or fix details.

    Shows comprehensive spec information including main content,
    sub-specs, and associated task progress. Supports tabbed navigation
    between different spec sections.
    """

    BINDINGS = [
        Binding("escape", "dismiss", "Back to Main"),
        Binding("q", "dismiss", "Back to Main"),
    ]

    def __init__(
        self,
        spec_folder: Path,
        spec_type: str = "spec",
        *args,
        **kwargs
    ):
        """
        Initialize SpecDetailScreen.

        Args:
            spec_folder: Path to spec/fix folder (e.g., .yoyo-dev/specs/2025-10-15-feature)
            spec_type: Type of spec ("spec" or "fix")
        """
        super().__init__(*args, **kwargs)
        self.spec_folder = spec_folder
        self.spec_type = spec_type
        self.spec_name = spec_folder.name
        self.state_data = self._load_state()

    def compose(self) -> ComposeResult:
        """
        Compose the spec detail screen layout.

        Yields:
            Header, tabbed content area, and Footer
        """
        yield Header()

        # Main content container
        with Vertical(id="spec-detail-container", classes="panel"):
            # Title section
            yield Static(
                self._get_title(),
                id="spec-detail-title"
            )

            # Metadata section
            yield Static(
                self._get_metadata(),
                id="spec-metadata",
                classes="dim"
            )

            # Progress overview (if tasks exist)
            if self._has_tasks():
                yield Static(
                    self._get_progress_overview(),
                    id="spec-progress-overview"
                )

            # Tabbed content area
            with TabbedContent(id="spec-tabs"):
                # Main spec tab
                with TabPane("Overview", id="tab-overview"):
                    yield Markdown(
                        self._get_spec_content(),
                        id="spec-overview-content"
                    )

                # Sub-specs tabs (if they exist)
                if self._has_technical_spec():
                    with TabPane("Technical Spec", id="tab-technical"):
                        yield Markdown(
                            self._get_technical_spec(),
                            id="spec-technical-content"
                        )

                if self._has_api_spec():
                    with TabPane("API Spec", id="tab-api"):
                        yield Markdown(
                            self._get_api_spec(),
                            id="spec-api-content"
                        )

                if self._has_database_schema():
                    with TabPane("Database Schema", id="tab-database"):
                        yield Markdown(
                            self._get_database_schema(),
                            id="spec-database-content"
                        )

                # Decisions tab (if decisions.md exists)
                if self._has_decisions():
                    with TabPane("Decisions", id="tab-decisions"):
                        yield Markdown(
                            self._get_decisions(),
                            id="spec-decisions-content"
                        )

                # Tasks tab (if tasks.md exists)
                if self._has_tasks():
                    with TabPane("Tasks", id="tab-tasks"):
                        yield Markdown(
                            self._get_tasks(),
                            id="spec-tasks-content"
                        )

        yield Footer()

    def _get_title(self) -> str:
        """
        Get formatted title for the detail screen.

        Returns:
            Formatted title string with rich markup
        """
        icon = "📄" if self.spec_type == "spec" else "🔧"
        display_name = self._get_display_name()
        type_label = "Specification" if self.spec_type == "spec" else "Fix"

        return f"[bold cyan]{icon} {type_label}: {display_name}[/bold cyan]"

    def _get_display_name(self) -> str:
        """
        Get clean display name without date prefix.

        Returns:
            Display name (e.g., "feature-name" instead of "2025-10-15-feature-name")
        """
        parts = self.spec_name.split('-', 3)
        if len(parts) >= 4:
            # Has date prefix (YYYY-MM-DD-name)
            return parts[3]
        return self.spec_name

    def _get_metadata(self) -> str:
        """
        Get formatted metadata.

        Returns:
            Creation date, status, and folder path
        """
        created_date = self._get_created_date()
        status = self._get_status()

        return (
            f"📅 Created: {created_date}  |  "
            f"Status: {status}  |  "
            f"📁 {self.spec_folder}"
        )

    def _get_created_date(self) -> str:
        """
        Extract creation date from folder name.

        Returns:
            Date string (YYYY-MM-DD) or "Unknown"
        """
        parts = self.spec_name.split('-', 3)
        if len(parts) >= 3:
            # Try to extract YYYY-MM-DD
            try:
                return f"{parts[0]}-{parts[1]}-{parts[2]}"
            except Exception:
                pass
        return "Unknown"

    def _get_status(self) -> str:
        """
        Get current status from state.json.

        Returns:
            Formatted status string with color
        """
        if not self.state_data:
            return "[dim]Not Started[/dim]"

        if self.state_data.get("execution_completed"):
            return "[green]✓ Complete[/green]"
        elif self.state_data.get("execution_started"):
            return "[cyan]⟳ In Progress[/cyan]"
        elif self.state_data.get("spec_approved"):
            return "[yellow]◆ Planning[/yellow]"
        else:
            return "[dim]○ Not Started[/dim]"

    def _get_progress_overview(self) -> str:
        """
        Get formatted progress overview from tasks.

        Returns:
            Progress summary with completion stats
        """
        if not self.state_data:
            return ""

        completed = len(self.state_data.get("completed_tasks", []))
        all_tasks = self.state_data.get("all_tasks", [])
        total = len(all_tasks)

        if total == 0:
            return ""

        progress_pct = int((completed / total) * 100) if total > 0 else 0

        # Calculate progress bar
        bar_width = 30
        filled = int((progress_pct / 100) * bar_width)
        bar = "█" * filled + "░" * (bar_width - filled)

        # Color based on progress
        if progress_pct == 100:
            color = "green"
        elif progress_pct >= 50:
            color = "cyan"
        elif progress_pct > 0:
            color = "yellow"
        else:
            color = "dim"

        return (
            f"[{color}]{bar} {progress_pct}%[/{color}]\n"
            f"Completed: {completed}/{total} tasks"
        )

    def _load_state(self) -> Optional[Dict[str, Any]]:
        """
        Load state.json from spec folder.

        Returns:
            State data dictionary or None if not found
        """
        state_file = self.spec_folder / "state.json"

        if not state_file.exists():
            return None

        try:
            with open(state_file, 'r') as f:
                return json.load(f)
        except (json.JSONDecodeError, IOError):
            return None

    def _get_spec_content(self) -> str:
        """
        Get main spec content from spec-lite.md or spec.md.

        Returns:
            Spec content as markdown string
        """
        # Try spec-lite.md first (condensed version)
        spec_lite = self.spec_folder / "spec-lite.md"
        if spec_lite.exists():
            try:
                return spec_lite.read_text()
            except IOError:
                pass

        # Fall back to spec.md (or analysis.md for fixes)
        if self.spec_type == "fix":
            spec_file = self.spec_folder / "analysis.md"
        else:
            spec_file = self.spec_folder / "spec.md"

        if spec_file.exists():
            try:
                return spec_file.read_text()
            except IOError:
                pass

        return "_No spec content found_"

    def _has_technical_spec(self) -> bool:
        """Check if technical-spec.md exists."""
        return (self.spec_folder / "sub-specs" / "technical-spec.md").exists()

    def _get_technical_spec(self) -> str:
        """Get technical spec content."""
        spec_file = self.spec_folder / "sub-specs" / "technical-spec.md"
        try:
            return spec_file.read_text()
        except IOError:
            return "_Error loading technical spec_"

    def _has_api_spec(self) -> bool:
        """Check if api-spec.md exists."""
        return (self.spec_folder / "sub-specs" / "api-spec.md").exists()

    def _get_api_spec(self) -> str:
        """Get API spec content."""
        spec_file = self.spec_folder / "sub-specs" / "api-spec.md"
        try:
            return spec_file.read_text()
        except IOError:
            return "_Error loading API spec_"

    def _has_database_schema(self) -> bool:
        """Check if database-schema.md exists."""
        return (self.spec_folder / "sub-specs" / "database-schema.md").exists()

    def _get_database_schema(self) -> str:
        """Get database schema content."""
        spec_file = self.spec_folder / "sub-specs" / "database-schema.md"
        try:
            return spec_file.read_text()
        except IOError:
            return "_Error loading database schema_"

    def _has_decisions(self) -> bool:
        """Check if decisions.md exists."""
        return (self.spec_folder / "decisions.md").exists()

    def _get_decisions(self) -> str:
        """Get decisions content."""
        decisions_file = self.spec_folder / "decisions.md"
        try:
            return decisions_file.read_text()
        except IOError:
            return "_Error loading decisions_"

    def _has_tasks(self) -> bool:
        """Check if tasks.md exists."""
        return (self.spec_folder / "tasks.md").exists()

    def _get_tasks(self) -> str:
        """Get tasks content."""
        tasks_file = self.spec_folder / "tasks.md"
        try:
            return tasks_file.read_text()
        except IOError:
            return "_Error loading tasks_"

    def action_dismiss(self) -> None:
        """Close the detail screen and return to main dashboard."""
        self.app.pop_screen()
