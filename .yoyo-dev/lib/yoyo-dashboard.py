#!/usr/bin/env python3
"""
Yoyo Dev Dashboard - Rich TUI Status Display

Shows real-time project status, tasks, and specifications with live file watching.
Replaces yoyo-status.sh with better UX and real-time updates.

Configuration:
  YOYO_STATUS_REFRESH - Custom refresh interval (fallback if file watching fails)

Examples:
  yoyo-dashboard.py                    # Default settings
  yoyo-dashboard.py --refresh-interval 5
  yoyo-dashboard.py --no-watch         # Disable file watching
"""

import argparse
import json
import os
import re
import sys
import time
from dataclasses import dataclass
from datetime import datetime
from pathlib import Path
from typing import Optional

# Check dependencies before importing
def check_dependencies():
    """Check if required dependencies are available."""
    missing = []

    try:
        import rich
    except ImportError:
        missing.append("rich")

    try:
        import watchdog
    except ImportError:
        missing.append("watchdog")

    try:
        import yaml
    except ImportError:
        missing.append("pyyaml")

    if missing:
        print(f"Error: Missing required dependencies: {', '.join(missing)}")
        print(f"\nInstall with: pip3 install {' '.join(missing)}")
        print("Or run: ~/.yoyo-dev/setup/install-dashboard-deps.sh")
        sys.exit(1)

# Check dependencies first
check_dependencies()

# Now safe to import
from rich.console import Console
from rich.layout import Layout
from rich.live import Live
from rich.panel import Panel
from rich.progress import BarColumn, Progress, TextColumn
from rich.table import Table
from rich.text import Text
from watchdog.events import FileSystemEventHandler
from watchdog.observers import Observer
import yaml


# ============================================================================
# Data Structures
# ============================================================================

@dataclass
class TaskData:
    """Represents current active task data."""
    task_name: str
    task_file: str
    total_tasks: int
    completed_tasks: int
    total_subtasks: int
    completed_subtasks: int
    progress: int  # 0-100
    recent_completed: list[str]  # Last 2 completed
    upcoming: list[str]  # Next 5 incomplete
    current_phase: str
    next_action: str


@dataclass
class SpecData:
    """Represents a spec or fix."""
    spec_name: str
    spec_type: str  # "spec" or "fix"
    completion: int  # 0-100
    status: str  # "pending", "in_progress", "complete"
    created_date: str


@dataclass
class DashboardState:
    """Complete dashboard state."""
    active_task: Optional[TaskData]
    recent_specs: list[SpecData]
    project_mission: str
    last_update: datetime
    is_updating: bool


# ============================================================================
# Parser Classes
# ============================================================================

class StateParser:
    """Parses state.json files from specs and fixes."""

    @staticmethod
    def parse(state_file: Path) -> Optional[dict]:
        """
        Parse state.json file.

        Args:
            state_file: Path to state.json

        Returns:
            Parsed state dict or None if file doesn't exist/is malformed
        """
        if not state_file.exists():
            return None

        try:
            with open(state_file, 'r') as f:
                return json.load(f)
        except (json.JSONDecodeError, IOError):
            return None

    @staticmethod
    def get_current_phase(state_file: Path) -> str:
        """
        Get current workflow phase from state.json.

        Args:
            state_file: Path to state.json

        Returns:
            Current phase or empty string if not found
        """
        state = StateParser.parse(state_file)
        if state:
            return state.get('current_phase', '')
        return ''


class TaskParser:
    """Parses tasks.md and MASTER-TASKS.md files."""

    @staticmethod
    def parse(task_file: Path) -> Optional[TaskData]:
        """
        Parse task file and extract task data.

        Args:
            task_file: Path to tasks.md or MASTER-TASKS.md

        Returns:
            TaskData or None if file doesn't exist
        """
        if not task_file.exists():
            return None

        try:
            with open(task_file, 'r') as f:
                content = f.read()

            # Count tasks and subtasks
            total_tasks = len(re.findall(r'^##\s+Task', content, re.MULTILINE))
            completed_tasks_matches = re.findall(r'^##\s+Task.*✅', content, re.MULTILINE)
            completed_tasks = len(completed_tasks_matches)

            total_subtasks = len(re.findall(r'^-\s+\[[x ]\]', content, re.MULTILINE))
            completed_subtasks = len(re.findall(r'^-\s+\[x\]', content, re.MULTILINE))

            # Calculate progress
            progress = 0
            if total_subtasks > 0:
                progress = int((completed_subtasks * 100) / total_subtasks)

            # Extract recently completed (last 2)
            completed_lines = re.findall(r'^-\s+\[x\]\s+(.+)$', content, re.MULTILINE)
            recent_completed = completed_lines[-2:] if len(completed_lines) >= 2 else completed_lines

            # Extract upcoming incomplete (next 5)
            incomplete_lines = re.findall(r'^-\s+\[\s\]\s+(.+)$', content, re.MULTILINE)
            upcoming = incomplete_lines[:5]

            # Get task name from directory
            task_name = task_file.parent.name

            # Get current phase from state.json
            state_file = task_file.parent / 'state.json'
            current_phase = StateParser.get_current_phase(state_file)

            # Determine next action
            next_action = TaskParser._determine_next_action(
                current_phase, completed_subtasks, total_subtasks
            )

            return TaskData(
                task_name=task_name,
                task_file=str(task_file),
                total_tasks=total_tasks,
                completed_tasks=completed_tasks,
                total_subtasks=total_subtasks,
                completed_subtasks=completed_subtasks,
                progress=progress,
                recent_completed=recent_completed,
                upcoming=upcoming,
                current_phase=current_phase,
                next_action=next_action
            )

        except IOError:
            return None

    @staticmethod
    def _determine_next_action(phase: str, completed: int, total: int) -> str:
        """Determine the next action based on phase and completion."""
        if phase == 'completed' or (completed == total and total > 0):
            return "✓ Complete - Ready for review/merge"
        elif phase in ['ready_for_execution', 'implementation']:
            return "/execute-tasks - Continue implementation"
        elif phase:
            return "/execute-tasks - Start implementation"
        else:
            if completed < total:
                return "/execute-tasks - Continue implementation"
            else:
                return "✓ Complete - Ready for review/merge"


class SpecParser:
    """Discovers and parses spec/fix folders."""

    @staticmethod
    def discover_specs(base_dir: Path) -> list[SpecData]:
        """
        Discover all specs and fixes in .yoyo-dev directory.

        Args:
            base_dir: Base project directory

        Returns:
            List of SpecData sorted by date (most recent first)
        """
        specs = []

        yoyo_dev = base_dir / '.yoyo-dev'
        if not yoyo_dev.exists():
            return specs

        # Scan specs folder
        specs_dir = yoyo_dev / 'specs'
        if specs_dir.exists():
            for spec_folder in specs_dir.iterdir():
                if spec_folder.is_dir():
                    spec_data = SpecParser._parse_spec_folder(spec_folder, 'spec')
                    if spec_data:
                        specs.append(spec_data)

        # Scan fixes folder
        fixes_dir = yoyo_dev / 'fixes'
        if fixes_dir.exists():
            for fix_folder in fixes_dir.iterdir():
                if fix_folder.is_dir():
                    spec_data = SpecParser._parse_spec_folder(fix_folder, 'fix')
                    if spec_data:
                        specs.append(spec_data)

        # Sort by date (most recent first)
        specs.sort(key=lambda s: s.created_date, reverse=True)

        return specs[:3]  # Return only most recent 3

    @staticmethod
    def _parse_spec_folder(folder: Path, spec_type: str) -> Optional[SpecData]:
        """Parse a single spec/fix folder."""
        # Find task file
        task_file = None
        if (folder / 'MASTER-TASKS.md').exists():
            task_file = folder / 'MASTER-TASKS.md'
        elif (folder / 'tasks.md').exists():
            task_file = folder / 'tasks.md'

        # Calculate completion
        completion = 0
        if task_file:
            completion = SpecParser._calculate_completion(task_file)

        # Determine status
        status = 'pending'
        if completion == 100:
            status = 'complete'
        elif completion > 0:
            status = 'in_progress'

        # Extract date from folder name (YYYY-MM-DD-name format)
        folder_name = folder.name
        date_match = re.match(r'^(\d{4}-\d{2}-\d{2})', folder_name)
        created_date = date_match.group(1) if date_match else ''

        return SpecData(
            spec_name=folder_name,
            spec_type=spec_type,
            completion=completion,
            status=status,
            created_date=created_date
        )

    @staticmethod
    def _calculate_completion(task_file: Path) -> int:
        """Calculate completion percentage from task file."""
        try:
            with open(task_file, 'r') as f:
                content = f.read()

            total = len(re.findall(r'^-\s+\[[x ]\]', content, re.MULTILINE))
            completed = len(re.findall(r'^-\s+\[x\]', content, re.MULTILINE))

            if total == 0:
                return 0

            return int((completed * 100) / total)

        except IOError:
            return 0


# ============================================================================
# File Watcher
# ============================================================================

class DashboardFileHandler(FileSystemEventHandler):
    """Handles file system events for dashboard updates."""

    def __init__(self, callback):
        self.callback = callback
        self.last_update = time.time()
        self.debounce_interval = 0.5  # seconds

    def on_modified(self, event):
        """Handle file modification events."""
        if event.is_directory:
            return

        # Only watch specific files
        filename = Path(event.src_path).name
        if filename in ['state.json', 'tasks.md', 'MASTER-TASKS.md']:
            # Debounce rapid changes
            now = time.time()
            if now - self.last_update > self.debounce_interval:
                self.last_update = now
                self.callback()


# ============================================================================
# Main Dashboard Class
# ============================================================================

class YoyoDashboard:
    """Main dashboard controller."""

    def __init__(self, refresh_interval: int = 10, file_watching: bool = True):
        self.refresh_interval = refresh_interval
        self.file_watching = file_watching
        self.console = Console()
        self.state: Optional[DashboardState] = None
        self.observer: Optional[Observer] = None
        self.base_dir = Path.cwd()

    def run(self):
        """Main dashboard loop."""
        try:
            # Initial render
            self.update_state()

            # Start file watching if enabled
            if self.file_watching:
                self.start_file_watching()

            # Live update loop
            with Live(self.render(), console=self.console, refresh_per_second=1) as live:
                while True:
                    if not self.file_watching:
                        # Poll-based updates
                        time.sleep(self.refresh_interval)
                        self.update_state()
                    else:
                        # File watching handles updates
                        time.sleep(0.1)

                    live.update(self.render())

        except KeyboardInterrupt:
            self.console.print("\n[dim]Dashboard stopped.[/dim]")
            if self.observer:
                self.observer.stop()
                self.observer.join()

    def update_state(self):
        """Update dashboard state from files."""
        # Find active tasks
        active_task = self._find_active_task()

        # Discover recent specs
        recent_specs = SpecParser.discover_specs(self.base_dir)

        # Get project mission (optional)
        project_mission = self._get_project_mission()

        # Update state
        self.state = DashboardState(
            active_task=active_task,
            recent_specs=recent_specs,
            project_mission=project_mission,
            last_update=datetime.now(),
            is_updating=False
        )

    def _find_active_task(self) -> Optional[TaskData]:
        """Find the most recent active task."""
        yoyo_dev = self.base_dir / '.yoyo-dev'
        if not yoyo_dev.exists():
            return None

        # Check specs folder
        specs_dir = yoyo_dev / 'specs'
        if specs_dir.exists():
            for spec_folder in sorted(specs_dir.iterdir(), reverse=True):
                if spec_folder.is_dir():
                    task_file = spec_folder / 'tasks.md'
                    if not task_file.exists():
                        task_file = spec_folder / 'MASTER-TASKS.md'

                    if task_file.exists():
                        task_data = TaskParser.parse(task_file)
                        if task_data and task_data.progress < 100:
                            return task_data

        # Check fixes folder
        fixes_dir = yoyo_dev / 'fixes'
        if fixes_dir.exists():
            for fix_folder in sorted(fixes_dir.iterdir(), reverse=True):
                if fix_folder.is_dir():
                    task_file = fix_folder / 'tasks.md'
                    if not task_file.exists():
                        task_file = fix_folder / 'MASTER-TASKS.md'

                    if task_file.exists():
                        task_data = TaskParser.parse(task_file)
                        if task_data and task_data.progress < 100:
                            return task_data

        return None

    def _get_project_mission(self) -> str:
        """Get project mission from mission-lite.md."""
        mission_file = self.base_dir / '.yoyo-dev' / 'product' / 'mission-lite.md'
        if mission_file.exists():
            try:
                with open(mission_file, 'r') as f:
                    # Read first line (usually the mission)
                    first_line = f.readline().strip()
                    # Remove markdown heading
                    return first_line.lstrip('#').strip()
            except IOError:
                return ""
        return ""

    def render(self):
        """Render complete dashboard layout."""
        if not self.state:
            return Panel("Dashboard initializing...", style="cyan")

        # Create layout
        layout = self._create_layout()

        return layout

    def _create_layout(self):
        """Create complete dashboard layout."""
        from rich.console import Group

        # Build all panels
        header = self._render_header()
        task_panel = self._render_task_panel()
        spec_panel = self._render_spec_panel()
        footer = self._render_footer()

        # Combine into group
        return Group(header, task_panel, spec_panel, footer)

    def _render_header(self):
        """Render header panel with branding."""
        timestamp = self.state.last_update.strftime("%H:%M:%S")

        header_text = Text()
        header_text.append("YOYO DEV - PROJECT STATUS", style="bold cyan")

        info_text = Text()
        info_text.append(f"Last updated: {timestamp} ", style="dim")
        if self.file_watching:
            info_text.append("(live updates) ⟳", style="dim green")
        else:
            info_text.append(f"(refreshes every {self.refresh_interval}s)", style="dim")

        return Panel(
            Group(header_text, info_text),
            style="cyan",
            padding=(0, 1)
        )

    def _render_task_panel(self):
        """Render task panel with progress display."""
        if not self.state.active_task:
            return Panel(
                self._render_getting_started(),
                title="[yellow]🚀 Getting Started[/yellow]",
                border_style="yellow",
                padding=(1, 2)
            )

        task = self.state.active_task

        # Progress bar
        progress = Progress(
            TextColumn("[bold]{task.description}"),
            BarColumn(complete_style="green", finished_style="green"),
            TextColumn("[bold]{task.percentage:>3.0f}%"),
            expand=False
        )
        progress_task = progress.add_task(
            task.task_name,
            total=100,
            completed=task.progress
        )

        # Task info
        task_info = Text()
        task_info.append(f"Tasks: {task.completed_tasks}/{task.total_tasks} complete\n", style="dim")
        task_info.append(f"Subtasks: {task.completed_subtasks}/{task.total_subtasks} complete", style="dim")

        # Recently completed
        completed_section = Text()
        if task.recent_completed:
            completed_section.append("Recently completed:\n", style="dim")
            for item in task.recent_completed:
                completed_section.append("  ✓ ", style="green")
                completed_section.append(f"{item}\n", style="dim")

        # Upcoming tasks
        upcoming_section = Text()
        if task.upcoming:
            if task.recent_completed:
                upcoming_section.append("\n")
            upcoming_section.append("Up next:\n", style="dim")
            for item in task.upcoming:
                upcoming_section.append("  ○ ", style="yellow")
                upcoming_section.append(f"{item}\n")

            # Show remaining count if more than 5
            total_remaining = task.total_subtasks - task.completed_subtasks
            if total_remaining > 5:
                upcoming_section.append(f"\n  ... and {total_remaining - 5} more", style="dim")
        elif task.completed_subtasks == task.total_subtasks and task.total_subtasks > 0:
            upcoming_section.append("\n")
            upcoming_section.append("✓ All tasks completed!", style="green bold")

        # Task file path
        file_path = Text()
        file_path.append(f"\nTask file: {task.task_file}", style="dim")

        # Next action
        next_action = Text()
        next_action.append("\n\nNext Action:\n", style="bold cyan")
        if "✓" in task.next_action:
            next_action.append(f"  {task.next_action}", style="green")
        else:
            next_action.append(f"  {task.next_action}", style="green")

        return Panel(
            Group(
                progress,
                task_info,
                completed_section,
                upcoming_section,
                file_path,
                next_action
            ),
            title="[green]📋 Active Task[/green]",
            border_style="green",
            padding=(1, 2)
        )

    def _render_spec_panel(self):
        """Render specs panel with status list."""
        if not self.state.recent_specs:
            return Panel(
                Text("No specifications found", style="dim"),
                title="[blue]📄 Recent Specifications[/blue]",
                border_style="blue",
                padding=(1, 2)
            )

        spec_list = Text()
        for spec in self.state.recent_specs:
            spec_list.append("  • ", style="cyan")
            spec_list.append(spec.spec_name)

            # Status with color coding
            if spec.completion == 100:
                spec_list.append(f" [Complete {spec.completion}%]", style="green")
            elif spec.completion > 0:
                spec_list.append(f" [In Progress {spec.completion}%]", style="yellow")
            else:
                spec_list.append(f" [Pending {spec.completion}%]", style="dim")

            spec_list.append("\n")

        return Panel(
            spec_list,
            title="[blue]📄 Recent Specifications[/blue]",
            border_style="blue",
            padding=(1, 2)
        )

    def _render_footer(self):
        """Render footer with smart insights."""
        footer_text = Text()
        footer_text.append("💡 Quick Tips:\n", style="bold cyan")
        footer_text.append("• Use ", style="dim")
        footer_text.append("/execute-tasks", style="cyan")
        footer_text.append(" to continue implementation\n", style="dim")

        if self.file_watching:
            footer_text.append("• Live updates via file watching (no polling delay)\n", style="dim")
        else:
            footer_text.append(f"• Progress updates every {self.refresh_interval} seconds automatically\n", style="dim")

        footer_text.append("• Press ", style="dim")
        footer_text.append("Ctrl+C", style="cyan")
        footer_text.append(" to exit dashboard", style="dim")

        return Panel(footer_text, border_style="dim", padding=(0, 2))

    def _render_getting_started(self):
        """Render getting started guide when no active tasks."""
        guide = Text()
        guide.append("No active tasks found. Start your workflow:\n\n", style="dim")
        guide.append("  1. ", style="cyan bold")
        guide.append("/create-new", style="green")
        guide.append(' "feature name"\n', style="white")
        guide.append("     Creates spec + tasks in one workflow\n\n", style="dim")

        guide.append("  2. ", style="cyan bold")
        guide.append("/create-fix", style="green")
        guide.append(' "problem description"\n', style="white")
        guide.append("     Systematic bug fix workflow\n\n", style="dim")

        guide.append("  3. ", style="cyan bold")
        guide.append("/create-spec", style="green")
        guide.append("\n", style="white")
        guide.append("     Create detailed spec only (no tasks)", style="dim")

        return guide

    def start_file_watching(self):
        """Start file watching for real-time updates."""
        yoyo_dev = self.base_dir / '.yoyo-dev'
        if not yoyo_dev.exists():
            return

        # Create event handler
        event_handler = DashboardFileHandler(self.update_state)

        # Create observer
        self.observer = Observer()

        # Watch specs and fixes directories
        specs_dir = yoyo_dev / 'specs'
        if specs_dir.exists():
            self.observer.schedule(event_handler, str(specs_dir), recursive=True)

        fixes_dir = yoyo_dev / 'fixes'
        if fixes_dir.exists():
            self.observer.schedule(event_handler, str(fixes_dir), recursive=True)

        # Start observer
        self.observer.start()


# ============================================================================
# Main Entry Point
# ============================================================================

def parse_args():
    """Parse command-line arguments."""
    parser = argparse.ArgumentParser(
        description="Yoyo Dev Dashboard - Real-time project status display"
    )
    parser.add_argument(
        "--refresh-interval",
        type=int,
        default=int(os.environ.get("YOYO_STATUS_REFRESH", "10")),
        help="Refresh interval in seconds (default: 10, only used if file watching disabled)"
    )
    parser.add_argument(
        "--no-watch",
        action="store_true",
        help="Disable file watching (use polling instead)"
    )
    return parser.parse_args()


def main():
    """Main entry point."""
    args = parse_args()

    dashboard = YoyoDashboard(
        refresh_interval=args.refresh_interval,
        file_watching=not args.no_watch
    )

    dashboard.run()


if __name__ == "__main__":
    main()
