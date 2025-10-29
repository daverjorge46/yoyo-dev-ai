"""
ProjectOverview Widget - Display project context and mission.

Shows project name, mission summary, current tech stack, and roadmap phase.
Reads from .yoyo-dev/product/ directory for mission and tech stack info.
"""

import logging
from pathlib import Path
from textual.app import ComposeResult
from textual.widgets import Static
from textual.widget import Widget
from textual.containers import Vertical

logger = logging.getLogger(__name__)


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
            product_path: Path to .yoyo-dev/product directory (defaults to <cwd>/.yoyo-dev/product)
        """
        super().__init__(*args, **kwargs)
        if product_path is None:
            self.product_path = Path.cwd() / '.yoyo-dev' / 'product'
        else:
            self.product_path = product_path

        # Log path resolution for debugging
        logger.debug(f"ProjectOverview initialized with product_path: {self.product_path}")

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
        # Validate product path exists
        if not self.product_path.exists():
            logger.debug(f"Product path does not exist: {self.product_path}")
            return f"[dim]No product context found at:[/dim]\n[dim]{self.product_path}[/dim]"

        # Validate it's a directory
        if not self.product_path.is_dir():
            logger.error(f"Product path is not a directory: {self.product_path}")
            return f"[red]Error: Not a directory:[/red]\n[dim]{self.product_path}[/dim]"

        logger.debug(f"Loading project context from: {self.product_path}")
        lines = []

        # Project name (from directory name or mission-lite.md)
        project_name = self._get_project_name()
        if project_name:
            lines.append(f"[bold cyan]📦 {project_name}[/bold cyan]")
        else:
            lines.append("[dim]📦 Project: Unknown[/dim]")

        # Mission summary
        mission_summary = self._get_mission_summary()
        if mission_summary:
            lines.append(f"\n[yellow]Mission:[/yellow]")
            lines.append(f"[dim]{mission_summary}[/dim]")

        # Key features
        key_features = self._get_key_features()
        if key_features:
            lines.append(f"\n[yellow]Features:[/yellow]")
            for feature in key_features:
                lines.append(f"[dim]• {feature}[/dim]")

        # Tech stack
        tech_stack = self._get_tech_stack()
        if tech_stack:
            lines.append(f"\n[yellow]Stack:[/yellow]")
            lines.append(f"[dim]{tech_stack}[/dim]")

        # Current phase (from roadmap.md)
        current_phase = self._get_current_phase()
        if current_phase:
            lines.append(f"\n[yellow]Phase:[/yellow]")
            lines.append(f"[dim]{current_phase}[/dim]")

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
                    if line.startswith('# '):
                        # Get next non-heading line that starts with **Mission**:
                        if i + 1 < len(lines):
                            next_line = lines[i + 1]
                            if next_line.startswith('**Mission**:'):
                                # Extract mission text after the label
                                summary = next_line.replace('**Mission**:', '').strip()
                                # Truncate to ~100 chars
                                if len(summary) > 100:
                                    return summary[:97] + "..."
                                return summary
        except Exception:
            pass

        return ""

    def _get_key_features(self) -> list[str]:
        """
        Get key features from mission-lite.md Solution section.

        Returns:
            List of key features (max 4) or empty list
        """
        mission_lite_file = self.product_path / 'mission-lite.md'
        if not mission_lite_file.exists():
            return []

        try:
            with open(mission_lite_file) as f:
                content = f.read()
                features = []
                in_solution_section = False

                for line in content.split('\n'):
                    line_stripped = line.strip()

                    # Detect Solution section
                    if line_stripped.startswith('## Solution'):
                        in_solution_section = True
                        continue

                    # Stop at next section
                    if in_solution_section and line_stripped.startswith('##'):
                        break

                    # Extract bullet points in Solution section
                    if in_solution_section and line_stripped.startswith('- '):
                        # Remove leading dash and trim
                        feature = line_stripped[2:].strip()
                        # Remove markdown emphasis
                        feature = feature.replace('**', '').replace('*', '')
                        # Truncate long features
                        if len(feature) > 50:
                            feature = feature[:47] + "..."
                        if feature:
                            features.append(feature)

                # Return first 4 features
                return features[:4]
        except Exception as e:
            logger.debug(f"Error parsing key features: {e}")
            pass

        return []

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
                in_relevant_section = False
                # Skip generic terms
                skip_terms = {'Platform', 'Status', 'Runtime', 'Languages'}

                for line in content.split('\n'):
                    line_stripped = line.strip()

                    # Detect Core Technologies or TUI Dashboard Stack sections
                    if line_stripped in ('## Core Technologies', '## TUI Dashboard Stack'):
                        in_relevant_section = True
                        continue

                    # Stop at non-relevant level-2 sections (##)
                    if in_relevant_section and line_stripped.startswith('## ') and not any(s in line_stripped for s in ['Core Technologies', 'TUI Dashboard', 'Workflow']):
                        in_relevant_section = False

                    # Extract technologies in format: **Tech Name**
                    # Tech lines start with ** and may contain versions/URLs in parentheses
                    if in_relevant_section and line_stripped.startswith('**'):
                        # Extract text between first ** pair
                        if '**' in line_stripped[2:]:
                            end_pos = line_stripped.index('**', 2)
                            tech = line_stripped[2:end_pos].strip()
                            # Remove version numbers and URLs (keep just the name)
                            tech = tech.split()[0]  # Take first word
                            # Skip generic terms
                            if tech and tech not in techs and tech not in skip_terms:
                                techs.append(tech)

                # Return first 4 techs
                if techs:
                    return ", ".join(techs[:4])
        except Exception as e:
            logger.debug(f"Error parsing tech stack: {e}")
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

    def reload_context(self) -> None:
        """
        Reload project context and refresh display.

        This method provides the same functionality as load_context()
        but with a distinct name to avoid conflicts with Widget.refresh().
        """
        self.load_context()
