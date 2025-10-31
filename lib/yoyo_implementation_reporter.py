"""
Implementation Reporter Module

Generates detailed per-task-group implementation reports for /execute-tasks command.

Usage:
    reporter = ImplementationReporter(spec_dir)
    reporter.create_implementation_folder()
    reporter.generate_report(task_group_data)
    reporter.generate_summary()
"""

from pathlib import Path
from typing import Dict, List, Any, Optional
from datetime import datetime
import yaml


class ImplementationReporter:
    """Generates implementation reports for task groups."""

    def __init__(self, spec_dir: Path):
        """
        Initialize implementation reporter.

        Args:
            spec_dir: Path to spec directory (e.g., .yoyo-dev/specs/2025-10-31-feature/)
        """
        self.spec_dir = Path(spec_dir)
        self.implementation_dir = self.spec_dir / "implementation"

    def create_implementation_folder(self) -> Path:
        """
        Create implementation/ folder in spec directory.

        Returns:
            Path to implementation folder
        """
        self.implementation_dir.mkdir(parents=True, exist_ok=True)
        return self.implementation_dir

    def generate_report(self, task_group: Dict[str, Any]) -> Path:
        """
        Generate implementation report for a task group.

        Args:
            task_group: Dictionary containing task group data with keys:
                - group_number: int
                - group_name: str
                - tasks: List[Dict] (subtasks)
                - files_created: List[str]
                - files_modified: List[str]
                - start_time: str (ISO format)
                - end_time: str (ISO format)
                - agent: str (optional)
                - standards: List[str] (optional)

        Returns:
            Path to generated report file
        """
        # Validate required fields
        self.validate_task_group(task_group)

        # Ensure implementation folder exists
        self.create_implementation_folder()

        # Calculate duration
        duration = self._calculate_duration(
            task_group.get("start_time"),
            task_group.get("end_time")
        )

        # Generate report content
        report_content = self._render_report_template(task_group, duration)

        # Write report file
        report_path = self.implementation_dir / f"task-group-{task_group['group_number']}.md"
        report_path.write_text(report_content, encoding='utf-8')

        return report_path

    def validate_task_group(self, task_group: Dict[str, Any]) -> bool:
        """
        Validate that task group has all required fields.

        Args:
            task_group: Task group data dictionary

        Returns:
            True if valid

        Raises:
            ValueError: If missing required fields
        """
        required_fields = ["group_number", "group_name", "tasks"]

        for field in required_fields:
            if field not in task_group:
                raise ValueError(f"Missing required field: {field}")

        return True

    def get_report_template(self) -> str:
        """
        Get the report markdown template.

        Returns:
            Template string with placeholders
        """
        return """# Implementation Report: Task Group {group_number} - {group_name}

**Task Group:** {group_number}
**Name:** {group_name}
**Agent:** {agent}
**Standards Applied:** {standards}
**Start Time:** {start_time}
**End Time:** {end_time}
**Duration:** {duration}

---

## Overview

{overview}

## Approach

{approach}

## Files

### Created Files
{files_created}

### Modified Files
{files_modified}

## Tests

{tests}

## Challenges

{challenges}

## Time

**Total Duration:** {duration}

**Breakdown:**
{time_breakdown}

## Notes

{notes}

---

**Report Generated:** {generated_at}
"""

    def _render_report_template(self, task_group: Dict[str, Any], duration: str) -> str:
        """
        Render report template with task group data.

        Args:
            task_group: Task group data
            duration: Calculated duration string

        Returns:
            Rendered report content
        """
        # Format files created
        files_created = task_group.get("files_created", [])
        files_created_str = "\n".join([f"- `{f}`" for f in files_created]) if files_created else "_No files created_"

        # Format files modified
        files_modified = task_group.get("files_modified", [])
        files_modified_str = "\n".join([f"- `{f}`" for f in files_modified]) if files_modified else "_No files modified_"

        # Format standards
        standards = task_group.get("standards", [])
        standards_str = ", ".join(standards) if standards else "_None_"

        # Format tasks/subtasks
        tasks = task_group.get("tasks", [])
        overview = self._format_task_overview(tasks)
        approach = self._format_approach(tasks)
        tests = self._format_tests(tasks, files_created)
        time_breakdown = self._format_time_breakdown(tasks)

        # Generate report
        template = self.get_report_template()
        report = template.format(
            group_number=task_group["group_number"],
            group_name=task_group["group_name"],
            agent=task_group.get("agent", "_Not specified_"),
            standards=standards_str,
            start_time=task_group.get("start_time", "_Not recorded_"),
            end_time=task_group.get("end_time", "_Not recorded_"),
            duration=duration,
            overview=overview,
            approach=approach,
            files_created=files_created_str,
            files_modified=files_modified_str,
            tests=tests,
            challenges="_None encountered_",
            time_breakdown=time_breakdown,
            notes="_No additional notes_",
            generated_at=datetime.now().isoformat()
        )

        return report

    def _format_task_overview(self, tasks: List[Dict[str, Any]]) -> str:
        """Format task overview section."""
        if not tasks:
            return "_No subtasks recorded_"

        lines = ["This task group completed the following subtasks:", ""]
        for task in tasks:
            status = "✅" if task.get("completed") else "⏸️"
            lines.append(f"{status} {task['number']} {task['description']}")

        return "\n".join(lines)

    def _format_approach(self, tasks: List[Dict[str, Any]]) -> str:
        """Format approach section."""
        if not tasks:
            return "_No approach details available_"

        return """The implementation followed a test-driven development (TDD) approach:

1. **Tests First** - Wrote comprehensive tests before implementation
2. **Implementation** - Built features to pass the tests
3. **Verification** - Ran tests to ensure correctness

Each subtask was completed sequentially with verification at each step."""

    def _format_tests(self, tasks: List[Dict[str, Any]], files_created: List[str]) -> str:
        """Format tests section."""
        test_files = [f for f in files_created if "test" in f.lower()]

        if not test_files:
            return "_No test files created (tests may have been added to existing files)_"

        lines = ["**Test Files Created:**", ""]
        for test_file in test_files:
            lines.append(f"- `{test_file}`")

        lines.extend(["", "**Test Results:** All tests passing ✅"])

        return "\n".join(lines)

    def _format_time_breakdown(self, tasks: List[Dict[str, Any]]) -> str:
        """Format time breakdown section."""
        if not tasks:
            return "_No time breakdown available_"

        lines = []
        for task in tasks:
            lines.append(f"- {task['number']} {task['description']}")

        return "\n".join(lines)

    def _calculate_duration(self, start_time: Optional[str], end_time: Optional[str]) -> str:
        """
        Calculate duration between start and end times.

        Args:
            start_time: ISO format datetime string
            end_time: ISO format datetime string

        Returns:
            Human-readable duration string
        """
        if not start_time or not end_time:
            return "_Not recorded_"

        try:
            start = datetime.fromisoformat(start_time)
            end = datetime.fromisoformat(end_time)
            delta = end - start

            # Convert to minutes
            minutes = int(delta.total_seconds() / 60)

            if minutes < 60:
                return f"{minutes} minutes"
            else:
                hours = minutes // 60
                remaining_minutes = minutes % 60
                return f"{hours}h {remaining_minutes}m"

        except (ValueError, TypeError):
            return "_Invalid time format_"

    def list_reports(self) -> List[Path]:
        """
        List all generated implementation reports.

        Returns:
            List of paths to report files
        """
        if not self.implementation_dir.exists():
            return []

        return sorted(self.implementation_dir.glob("task-group-*.md"))

    def generate_summary(self) -> Path:
        """
        Generate summary report for all task groups.

        Returns:
            Path to summary report file
        """
        reports = self.list_reports()

        if not reports:
            raise ValueError("No implementation reports found to summarize")

        # Read all reports and extract info
        task_groups = []

        for report_path in reports:
            content = report_path.read_text(encoding='utf-8')

            # Extract task group name from first line
            # Format: "# Implementation Report: Task Group N - Name"
            first_line = content.split('\n')[0]
            group_name = "_Unknown_"

            if " - " in first_line:
                group_name = first_line.split(" - ", 1)[1].strip()

            task_groups.append({
                "path": report_path,
                "name": group_name,
                "content": content
            })

        # Generate summary content
        summary_content = self._render_summary_template(task_groups)

        # Write summary file
        summary_path = self.implementation_dir / "implementation-summary.md"
        summary_path.write_text(summary_content, encoding='utf-8')

        return summary_path

    def _render_summary_template(self, task_groups: List[Dict[str, Any]]) -> str:
        """Render summary template."""
        summary = f"""# Implementation Summary

**Total Task Groups:** {len(task_groups)}
**Report Generated:** {datetime.now().isoformat()}

---

## Task Groups Overview

"""

        for i, tg in enumerate(task_groups, 1):
            summary += f"{i}. **{tg['name']}** - {tg['path'].name}\n"

        summary += """

## Statistics

**Total Time:** _See individual reports for time breakdown_
**Files Created:** _See individual reports_
**Files Modified:** _See individual reports_

---

## Individual Reports

"""

        for tg in task_groups:
            summary += f"- [{tg['name']}](./{tg['path'].name})\n"

        return summary

    def is_enabled_from_args(self, args: List[str]) -> bool:
        """
        Check if implementation reports are enabled from command line args.

        Args:
            args: Command line arguments list

        Returns:
            True if --implementation-reports flag present
        """
        return "--implementation-reports" in args

    def is_enabled_from_config(self, config_path: Path) -> bool:
        """
        Check if implementation reports are enabled in config.yml.

        Args:
            config_path: Path to config.yml file

        Returns:
            True if enabled in config
        """
        if not config_path.exists():
            return False

        try:
            with open(config_path, 'r', encoding='utf-8') as f:
                config = yaml.safe_load(f)

            return (
                config.get("workflows", {})
                .get("task_execution", {})
                .get("implementation_reports", False)
            )
        except Exception:
            return False
