"""
ProjectOverview Widget - Display project context and mission.

Shows project name, mission summary, current tech stack, and roadmap phase.
Reads from .yoyo-dev/product/ directory for mission and tech stack info.
"""

from pathlib import Path
from textual.app import ComposeResult
from textual.widgets import Static
from textual.widget import Widget
from textual.containers import Vertical


class ProjectOverview(Widget):
    """
    Project overview widget for displaying project context.

    Shows project name, mission, tech stack, and current phase.
    Reads from .yoyo-dev/product/ files for content.

    Attributes:
        product_path: Path to .yoyo-dev/product directory
    """

    def __init__(self, product_path: Path | None = None, *args, **kwargs):
        """
        Initialize ProjectOverview widget.

        Args:
            product_path: Path to .yoyo-dev/product directory (defaults to ~/.yoyo-dev/.yoyo-dev/product)
        """
        super().__init__(*args, **kwargs)
        if product_path is None:
            self.product_path = Path.home() / '.yoyo-dev' / '.yoyo-dev' / 'product'
        else:
            self.product_path = product_path

    def compose(self) -> ComposeResult:
        """
        Compose the project overview layout.

        Yields:
            Static widget with project information
        """
        with Vertical(id="project-overview-container"):
            # Title
            yield Static("[bold cyan]Project Overview[/bold cyan]", id="project-overview-title")

            # Content
            content_text = self._generate_overview_text()
            yield Static(content_text, id="project-overview-content")

    def _generate_overview_text(self) -> str:
        """
        Generate formatted project overview text.

        Returns:
            Formatted overview string with rich markup
        """
        # Check if product directory exists
        if not self.product_path.exists():
            return "[dim]No product context found[/dim]"

        lines = []

        # Project name (from directory name or mission-lite.md)
        project_name = self._get_project_name()
        if project_name:
            lines.append(f"[cyan]📦 Project:[/cyan] {project_name}")
        else:
            lines.append("[dim]📦 Project: Unknown[/dim]")

        # Mission summary
        mission_summary = self._get_mission_summary()
        if mission_summary:
            lines.append(f"\n[cyan]🎯 Mission:[/cyan]\n{mission_summary}")

        # Tech stack
        tech_stack = self._get_tech_stack()
        if tech_stack:
            lines.append(f"\n[cyan]⚙️  Tech Stack:[/cyan]\n{tech_stack}")

        # Current phase (from roadmap.md)
        current_phase = self._get_current_phase()
        if current_phase:
            lines.append(f"\n[cyan]📍 Phase:[/cyan] {current_phase}")

        if not lines:
            return "[dim]Loading project context...[/dim]"

        return "\n".join(lines)

    def _get_project_name(self) -> str:
        """
        Get project name from mission-lite.md or directory.

        Returns:
            Project name or empty string
        """
        # Try mission-lite.md first
        mission_lite_file = self.product_path / 'mission-lite.md'
        if mission_lite_file.exists():
            try:
                with open(mission_lite_file) as f:
                    content = f.read()
                    # Look for "# Project Name" pattern
                    for line in content.split('\n'):
                        if line.startswith('# '):
                            return line[2:].strip()
            except Exception:
                pass

        # Fallback to parent directory name
        try:
            return self.product_path.parent.parent.name
        except Exception:
            return ""

    def _get_mission_summary(self) -> str:
        """
        Get mission summary from mission-lite.md.

        Returns:
            Mission summary (first 100 chars) or empty string
        """
        mission_lite_file = self.product_path / 'mission-lite.md'
        if not mission_lite_file.exists():
            return ""

        try:
            with open(mission_lite_file) as f:
                content = f.read()
                # Find first paragraph after heading
                lines = [l.strip() for l in content.split('\n') if l.strip()]
                for i, line in enumerate(lines):
                    if line.startswith('#'):
                        # Get next non-heading line
                        if i + 1 < len(lines) and not lines[i + 1].startswith('#'):
                            summary = lines[i + 1]
                            # Truncate to ~80 chars
                            if len(summary) > 80:
                                return summary[:77] + "..."
                            return summary
        except Exception:
            pass

        return ""

    def _get_tech_stack(self) -> str:
        """
        Get primary tech stack from tech-stack.md.

        Returns:
            Tech stack summary or empty string
        """
        tech_stack_file = self.product_path / 'tech-stack.md'
        if not tech_stack_file.exists():
            return ""

        try:
            with open(tech_stack_file) as f:
                content = f.read()
                # Look for primary technologies
                techs = []
                for line in content.split('\n'):
                    line = line.strip()
                    # Look for bullet points with tech names
                    if line.startswith('- **') or line.startswith('* **'):
                        # Extract tech name between ** markers
                        start = line.find('**') + 2
                        end = line.find('**', start)
                        if end > start:
                            tech = line[start:end]
                            techs.append(tech)

                # Return first 3 techs
                if techs:
                    return ", ".join(techs[:3])
        except Exception:
            pass

        return ""

    def _get_current_phase(self) -> str:
        """
        Get current phase from roadmap.md.

        Returns:
            Current phase name or empty string
        """
        roadmap_file = self.product_path / 'roadmap.md'
        if not roadmap_file.exists():
            return ""

        try:
            with open(roadmap_file) as f:
                content = f.read()
                # Look for phase markers (## Phase X: Name)
                for line in content.split('\n'):
                    if line.startswith('## Phase'):
                        # Extract phase name
                        phase = line[3:].strip()
                        # Check if this phase has uncompleted items
                        # For now, just return first phase found
                        return phase
        except Exception:
            pass

        return ""

    def load_context(self) -> None:
        """Reload project context and refresh display."""
        try:
            content = self.query_one("#project-overview-content", Static)
            overview_text = self._generate_overview_text()
            content.update(overview_text)
        except Exception:
            # Widget not mounted yet
            pass

    def refresh(self) -> None:
        """Refresh context (alias for load_context)."""
        self.load_context()
