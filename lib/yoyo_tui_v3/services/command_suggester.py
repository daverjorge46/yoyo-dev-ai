"""
Intelligent Command Suggester service.

Analyzes project state and generates context-aware command suggestions
based on 9 intelligence rules.
"""

from pathlib import Path
from typing import List, Optional
from datetime import datetime

from ..models import (
    ActiveWork,
    CommandSuggestion,
    Task,
    TaskStatus,
    SpecStatus,
    DetectedError,
    ErrorType,
    EventType,
)


class IntelligentCommandSuggester:
    """
    Analyzes project state and suggests next actions.

    Intelligence Rules:
    1. No Active Spec/Fix → suggest /plan-product, /create-new, or /analyze-product
    2. Spec Created, No Tasks → suggest /create-tasks
    3. Tasks Created, Not Started → suggest /execute-tasks
    4. Tasks In Progress → suggest continue or /review --devil
    5. Tasks Completed, No PR → suggest /execute-tasks (post-execution)
    6. PR Created → suggest /create-new (next feature)
    7. Test Failures Detected → suggest /create-fix
    8. Git Conflicts Detected → suggest /create-fix
    9. Missing Dependencies → suggest install command
    """

    def __init__(self, data_manager, event_bus=None, yoyo_dev_path: Optional[Path] = None):
        """
        Initialize IntelligentCommandSuggester.

        Args:
            data_manager: DataManager instance for accessing project state
            event_bus: Optional EventBus for publishing suggestion updates
            yoyo_dev_path: Path to .yoyo-dev directory (defaults to cwd/.yoyo-dev)
        """
        self.data_manager = data_manager
        self.event_bus = event_bus
        self.yoyo_dev_path = yoyo_dev_path or Path.cwd() / ".yoyo-dev"

    def generate_suggestions(self) -> List[CommandSuggestion]:
        """
        Generate context-aware command suggestions.

        Returns:
            List of CommandSuggestion objects sorted by priority (1=highest)
        """
        suggestions: List[CommandSuggestion] = []

        # Get current project state
        active_work = self.data_manager.get_active_work()
        recent_errors = self.data_manager.get_recent_errors() if hasattr(self.data_manager, 'get_recent_errors') else []
        git_status = self.data_manager.get_git_status() if hasattr(self.data_manager, 'get_git_status') else None

        # Rule 7: Test Failures (highest priority if present)
        test_error_suggestions = self._rule7_test_failures(recent_errors)
        suggestions.extend(test_error_suggestions)

        # Rule 8: Git Conflicts (critical priority)
        git_conflict_suggestions = self._rule8_git_conflicts(recent_errors, git_status)
        suggestions.extend(git_conflict_suggestions)

        # Rule 9: Missing Dependencies
        dependency_suggestions = self._rule9_missing_dependencies(recent_errors)
        suggestions.extend(dependency_suggestions)

        # Rules 1-6: Based on active work state
        if active_work is None:
            # Rule 1: No Active Spec/Fix
            no_work_suggestions = self._rule1_no_active_work()
            suggestions.extend(no_work_suggestions)
        else:
            # Determine which rule applies based on active work state
            tasks = active_work.tasks
            progress = active_work.progress
            status = active_work.status
            pr_url = getattr(active_work, 'pr_url', None)  # Use getattr for optional field

            if not tasks:
                # Rule 2: Spec Created, No Tasks
                suggestions.extend(self._rule2_spec_created_no_tasks(active_work))
            elif all(t.status == TaskStatus.PENDING for t in tasks):
                # Rule 3: Tasks Created, Not Started
                suggestions.extend(self._rule3_tasks_not_started(active_work))
            elif any(t.status == TaskStatus.IN_PROGRESS for t in tasks):
                # Rule 4: Tasks In Progress
                suggestions.extend(self._rule4_tasks_in_progress(active_work, progress))
            elif all(t.status == TaskStatus.COMPLETED for t in tasks) and not pr_url:
                # Rule 5: Tasks Completed, No PR
                suggestions.extend(self._rule5_tasks_completed_no_pr(active_work))
            elif pr_url:
                # Rule 6: PR Created
                suggestions.extend(self._rule6_pr_created(active_work))

        # Sort by priority (1=highest) and limit to 5
        suggestions.sort(key=lambda s: s.priority)
        final_suggestions = suggestions[:5]

        # Publish event if EventBus is configured
        if self.event_bus:
            self.event_bus.publish(
                event_type=EventType.COMMAND_SUGGESTIONS_UPDATED,
                data={
                    "suggestions": [
                        {
                            "command": s.command,
                            "reason": s.reason,
                            "priority": s.priority,
                            "icon": s.icon
                        }
                        for s in final_suggestions
                    ],
                    "count": len(final_suggestions)
                },
                source="IntelligentCommandSuggester"
            )

        return final_suggestions

    # ========================================================================
    # Rule Implementations
    # ========================================================================

    def _rule1_no_active_work(self) -> List[CommandSuggestion]:
        """Rule 1: No Active Spec/Fix - suggest getting started."""
        suggestions = []

        product_path = self.yoyo_dev_path / "product"
        product_exists = product_path.exists() and (product_path / "mission.md").exists()

        # Check if codebase exists (look for common source directories in parent of yoyo-dev)
        base_dir = self.yoyo_dev_path.parent
        codebase_exists = any(
            (base_dir / dir_name).exists() and (base_dir / dir_name).is_dir()
            for dir_name in ["src", "lib", "app", "components"]
        )

        if not product_exists and codebase_exists:
            # Rule 1c: Existing codebase, no yoyo-dev
            suggestions.append(CommandSuggestion(
                command="/analyze-product",
                reason="Analyze existing codebase and set up Yoyo Dev",
                priority=1,
                icon="🔍"
            ))
        elif not product_exists:
            # Rule 1a: No product docs
            suggestions.append(CommandSuggestion(
                command="/plan-product",
                reason="Set mission and roadmap for new product",
                priority=1,
                icon="🚀"
            ))
        else:
            # Rule 1b: Product docs exist
            suggestions.append(CommandSuggestion(
                command="/create-new",
                reason="Create a new feature specification",
                priority=1,
                icon="✨"
            ))

        return suggestions

    def _rule2_spec_created_no_tasks(self, active_work: ActiveWork) -> List[CommandSuggestion]:
        """Rule 2: Spec Created, No Tasks - suggest /create-tasks."""
        return [
            CommandSuggestion(
                command="/create-tasks",
                reason=f"Break down '{active_work.name}' into tasks",
                priority=1,
                icon="📋"
            )
        ]

    def _rule3_tasks_not_started(self, active_work: ActiveWork) -> List[CommandSuggestion]:
        """Rule 3: Tasks Created, Not Started - suggest /execute-tasks."""
        task_count = len(active_work.tasks)
        return [
            CommandSuggestion(
                command="/execute-tasks",
                reason=f"Start executing {task_count} tasks for '{active_work.name}'",
                priority=1,
                icon="⚡"
            )
        ]

    def _rule4_tasks_in_progress(self, active_work: ActiveWork, progress: float) -> List[CommandSuggestion]:
        """Rule 4: Tasks In Progress - suggest continue or review."""
        suggestions = []

        # Rule 4a: Continue working
        current_task = next(
            (t for t in active_work.tasks if t.status == TaskStatus.IN_PROGRESS),
            None
        )

        if current_task:
            suggestions.append(CommandSuggestion(
                command="/execute-tasks",
                reason=f"Continue working on Task {current_task.id}: {current_task.title}",
                priority=2,
                icon="💪"
            ))

        # Rule 4b: Suggest review if >70% complete
        if progress > 70.0:
            suggestions.append(CommandSuggestion(
                command="/review --devil",
                reason=f"Review code before final tasks ({progress:.0f}% complete)",
                priority=3,
                icon="🔍"
            ))

        return suggestions

    def _rule5_tasks_completed_no_pr(self, active_work: ActiveWork) -> List[CommandSuggestion]:
        """Rule 5: Tasks Completed, No PR - suggest post-execution steps."""
        return [
            CommandSuggestion(
                command="/execute-tasks",
                reason=f"Complete post-execution steps (tests, PR) for '{active_work.name}'",
                priority=1,
                icon="🎯"
            )
        ]

    def _rule6_pr_created(self, active_work: ActiveWork) -> List[CommandSuggestion]:
        """Rule 6: PR Created - suggest next feature."""
        return [
            CommandSuggestion(
                command="/create-new",
                reason=f"PR merged for '{active_work.name}' - start next feature",
                priority=2,
                icon="🎉"
            )
        ]

    def _rule7_test_failures(self, recent_errors: List[DetectedError]) -> List[CommandSuggestion]:
        """Rule 7: Test Failures Detected - suggest /create-fix."""
        suggestions = []

        test_errors = [e for e in recent_errors if e.type == ErrorType.TEST]

        if test_errors:
            # Get most recent test error
            latest_error = test_errors[0]

            # Extract test name from message if possible
            test_name = self._extract_test_name(latest_error.message)

            suggestions.append(CommandSuggestion(
                command=f"/create-fix \"test failure in {test_name}\"" if test_name else "/create-fix \"test failures\"",
                reason=f"Fix test failure: {latest_error.message[:50]}...",
                priority=1,
                icon="❌"
            ))

        return suggestions

    def _rule8_git_conflicts(
        self,
        recent_errors: List[DetectedError],
        git_status
    ) -> List[CommandSuggestion]:
        """Rule 8: Git Conflicts Detected - suggest /create-fix."""
        suggestions = []

        # Check both errors and git status
        has_conflict_error = any(e.type == ErrorType.GIT for e in recent_errors)
        has_conflicts = git_status and git_status.has_conflicts

        if has_conflict_error or has_conflicts:
            suggestions.append(CommandSuggestion(
                command="/create-fix \"git conflicts\"",
                reason="Resolve merge conflicts in working directory",
                priority=1,  # Critical priority
                icon="⚠️"
            ))

        return suggestions

    def _rule9_missing_dependencies(self, recent_errors: List[DetectedError]) -> List[CommandSuggestion]:
        """Rule 9: Missing Dependencies - suggest installation."""
        suggestions = []

        dependency_errors = [e for e in recent_errors if e.type == ErrorType.DEPENDENCY]

        if dependency_errors:
            latest_error = dependency_errors[0]

            # Extract package name from error message
            package_name = self._extract_package_name(latest_error.message)

            if "pip" in latest_error.suggested_fix.lower():
                # Python dependency
                suggestions.append(CommandSuggestion(
                    command=latest_error.suggested_fix,
                    reason=f"Install missing Python package: {package_name}",
                    priority=2,
                    icon="📦"
                ))
            else:
                # Other dependency type
                suggestions.append(CommandSuggestion(
                    command=latest_error.suggested_fix,
                    reason=f"Install missing dependency: {package_name}",
                    priority=2,
                    icon="📦"
                ))

        return suggestions

    # ========================================================================
    # Helper Methods
    # ========================================================================

    def _extract_test_name(self, error_message: str) -> Optional[str]:
        """Extract test name from error message."""
        # Common patterns:
        # - "test_user_login failed"
        # - "FAILED tests/test_auth.py::test_user_login"
        # - "AssertionError in test_user_login"

        import re

        # Try to find test_* pattern
        match = re.search(r"test_\w+", error_message)
        if match:
            return match.group(0)

        return None

    def _extract_package_name(self, error_message: str) -> str:
        """Extract package name from dependency error message."""
        # Common patterns:
        # - "ModuleNotFoundError: No module named 'textual'"
        # - "ImportError: cannot import name 'foo' from 'bar'"

        import re

        # Try to find module name in quotes
        match = re.search(r"['\"](\w+)['\"]", error_message)
        if match:
            return match.group(1)

        return "unknown"
