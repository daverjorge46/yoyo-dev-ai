"""
Error Detector service.

Proactively detects and surfaces errors from test failures, git conflicts,
and missing dependencies.
"""

import re
import subprocess
from pathlib import Path
from datetime import datetime
from typing import List, Optional

from ..models import DetectedError, ErrorType, EventType


class ErrorDetector:
    """
    Detects and surfaces errors from various sources.

    Error Types:
    - TEST: Test failures from pytest, unittest, etc.
    - GIT: Git conflicts and merge issues
    - DEPENDENCY: Missing Python modules or packages
    """

    def __init__(self, event_bus, yoyo_dev_path: Optional[Path] = None, max_errors: int = 10):
        """
        Initialize ErrorDetector.

        Args:
            event_bus: EventBus instance for publishing events
            yoyo_dev_path: Path to .yoyo-dev directory (defaults to cwd/.yoyo-dev)
            max_errors: Maximum number of errors to keep in memory (default: 10)
        """
        self.event_bus = event_bus
        self.yoyo_dev_path = yoyo_dev_path or Path.cwd() / ".yoyo-dev"
        self.max_errors = max_errors
        self._errors: List[DetectedError] = []

    def detect_all_errors(self) -> List[DetectedError]:
        """
        Run all error detection methods and return combined results.

        Returns:
            List of all detected errors
        """
        all_errors = []

        # Detect test failures
        test_errors = self._detect_test_failures_from_logs()
        all_errors.extend(test_errors)

        # Detect git conflicts
        git_errors = self.detect_git_conflicts()
        all_errors.extend(git_errors)

        # Detect missing dependencies
        dep_errors = self._detect_dependency_errors()
        all_errors.extend(dep_errors)

        # Store all errors
        for error in all_errors:
            self._store_error(error)

        return all_errors

    # ========================================================================
    # Test Failure Detection
    # ========================================================================

    def _detect_test_failures_from_logs(self) -> List[DetectedError]:
        """Detect test failures from log files."""
        errors = []

        # Look for pytest log files
        log_patterns = [
            self.yoyo_dev_path / "**" / "pytest.log",
            Path.cwd() / "pytest.log",
            Path.cwd() / ".pytest_cache" / "**" / "*.log",
        ]

        for pattern in log_patterns:
            # Use glob to find matching files
            parent = pattern.parent
            if parent.exists():
                for log_file in parent.glob(pattern.name):
                    if log_file.is_file():
                        file_errors = self._detect_test_failures_from_file(log_file)
                        errors.extend(file_errors)

        return errors

    def _detect_test_failures_from_file(self, log_file: Path) -> List[DetectedError]:
        """Detect test failures from a specific log file."""
        try:
            content = log_file.read_text()
            return self._detect_test_failures(content)
        except (FileNotFoundError, IOError):
            return []

    def _detect_test_failures(self, test_output: str) -> List[DetectedError]:
        """
        Detect test failures from test output.

        Supports pytest and unittest formats.
        """
        errors = []

        # Pattern 1: pytest FAILED lines
        # Example: FAILED tests/test_auth.py::test_login - AssertionError
        pytest_pattern = r"FAILED\s+([\w/._-]+)::([\w_]+)\s*-\s*(.+)"
        for match in re.finditer(pytest_pattern, test_output):
            file_path = match.group(1)
            test_name = match.group(2)
            error_type = match.group(3).strip()

            error = DetectedError(
                type=ErrorType.TEST,
                message=f"Test '{test_name}' failed: {error_type}",
                file=file_path,
                timestamp=datetime.now(),
                suggested_fix=f"/create-fix \"test failure in {test_name}\"",
                severity="high"
            )
            errors.append(error)

        # Pattern 2: unittest FAIL lines
        # Example: FAIL: test_authentication (__main__.TestAuth)
        unittest_pattern = r"FAIL:\s+([\w_]+)\s+\(([\w._]+)\)"
        for match in re.finditer(unittest_pattern, test_output):
            test_name = match.group(1)
            test_class = match.group(2)

            error = DetectedError(
                type=ErrorType.TEST,
                message=f"Test '{test_name}' in {test_class} failed",
                file=None,
                timestamp=datetime.now(),
                suggested_fix=f"/create-fix \"test failure in {test_name}\"",
                severity="high"
            )
            errors.append(error)

        # Pattern 3: Generic error patterns
        # Look for AssertionError, RuntimeError, etc.
        if "AssertionError" in test_output or "ERROR" in test_output:
            # Extract file info if available
            file_match = re.search(r"(tests/[\w/._-]+\.py)", test_output)
            file_path = file_match.group(1) if file_match else None

            if not errors:  # Only add generic error if no specific errors found
                error = DetectedError(
                    type=ErrorType.TEST,
                    message="Test failures detected in output",
                    file=file_path,
                    timestamp=datetime.now(),
                    suggested_fix="/create-fix \"test failures\"",
                    severity="medium"
                )
                errors.append(error)

        return errors

    # ========================================================================
    # Git Conflict Detection
    # ========================================================================

    def detect_git_conflicts(self) -> List[DetectedError]:
        """Detect git conflicts using git status command."""
        try:
            result = subprocess.run(
                ["git", "status"],
                capture_output=True,
                text=True,
                timeout=5
            )

            if result.returncode == 0:
                return self._detect_git_conflicts(result.stdout)
            else:
                return []

        except (subprocess.CalledProcessError, subprocess.TimeoutExpired, FileNotFoundError):
            return []

    def _detect_git_conflicts(self, git_output: str) -> List[DetectedError]:
        """Detect git conflicts from git status output."""
        errors = []

        # Check for conflict indicators
        conflict_indicators = [
            "Unmerged paths",
            "both modified:",
            "both added:",
            "both deleted:",
            "You have unmerged paths"
        ]

        has_conflicts = any(indicator in git_output for indicator in conflict_indicators)

        if has_conflicts:
            # Extract conflicted files
            conflict_pattern = r"both (?:modified|added|deleted):\s+([\w/._-]+)"
            conflicted_files = re.findall(conflict_pattern, git_output)

            if conflicted_files:
                for file_path in conflicted_files:
                    error = DetectedError(
                        type=ErrorType.GIT,
                        message=f"Merge conflict in {file_path}",
                        file=file_path,
                        timestamp=datetime.now(),
                        suggested_fix="/create-fix \"git conflicts\"",
                        severity="critical"
                    )
                    errors.append(error)
            else:
                # Generic conflict error
                error = DetectedError(
                    type=ErrorType.GIT,
                    message="Git merge conflicts detected",
                    file=None,
                    timestamp=datetime.now(),
                    suggested_fix="/create-fix \"git conflicts\"",
                    severity="critical"
                )
                errors.append(error)

        return errors

    # ========================================================================
    # Missing Dependency Detection
    # ========================================================================

    def _detect_dependency_errors(self) -> List[DetectedError]:
        """Detect missing dependencies from recent Python errors."""
        # In production, this would monitor Python process output
        # For now, we'll provide the detection logic only
        return []

    def _detect_missing_dependencies(self, error_output: str) -> List[DetectedError]:
        """
        Detect missing dependencies from error output.

        Args:
            error_output: Python error output or traceback

        Returns:
            List of dependency errors
        """
        errors = []

        # Pattern 1: ModuleNotFoundError
        # Example: ModuleNotFoundError: No module named 'textual'
        module_pattern = r"ModuleNotFoundError:\s*No module named\s+['\"](\w+)['\"]"
        for match in re.finditer(module_pattern, error_output):
            module_name = match.group(1)

            # Extract file path if available
            file_path = self._extract_file_path(error_output)

            error = DetectedError(
                type=ErrorType.DEPENDENCY,
                message=f"Missing Python module: {module_name}",
                file=file_path,
                timestamp=datetime.now(),
                suggested_fix=f"pip install {module_name}",
                severity="high"
            )
            errors.append(error)

        # Pattern 2: ImportError
        # Example: ImportError: cannot import name 'helper' from 'utils'
        import_pattern = r"ImportError:\s*cannot import name\s+['\"](\w+)['\"]"
        for match in re.finditer(import_pattern, error_output):
            name = match.group(1)

            file_path = self._extract_file_path(error_output)

            error = DetectedError(
                type=ErrorType.DEPENDENCY,
                message=f"Import error: cannot import '{name}'",
                file=file_path,
                timestamp=datetime.now(),
                suggested_fix=f"/create-fix \"import error for {name}\"",
                severity="medium"
            )
            errors.append(error)

        return errors

    # ========================================================================
    # Error Storage and Retrieval
    # ========================================================================

    def _store_error(self, error: DetectedError) -> None:
        """
        Store error and publish ERROR_DETECTED event.

        Args:
            error: DetectedError to store
        """
        # Add to errors list
        self._errors.append(error)

        # Keep only last N errors
        if len(self._errors) > self.max_errors:
            self._errors = self._errors[-self.max_errors:]

        # Sort by timestamp (newest first)
        self._errors.sort(key=lambda e: e.timestamp, reverse=True)

        # Publish event
        self.event_bus.publish(
            EventType.ERROR_DETECTED,
            data={
                "error": error,
                "type": error.type.value,
                "severity": error.severity
            },
            source="ErrorDetector"
        )

    def get_recent_errors(self, limit: Optional[int] = None) -> List[DetectedError]:
        """
        Get recent errors.

        Args:
            limit: Maximum number of errors to return (default: all)

        Returns:
            List of recent errors sorted by timestamp (newest first)
        """
        if limit:
            return self._errors[:limit]
        return self._errors.copy()

    def clear_errors(self) -> None:
        """Clear all stored errors."""
        self._errors.clear()

    # ========================================================================
    # Helper Methods
    # ========================================================================

    def _extract_file_path(self, text: str) -> Optional[str]:
        """
        Extract file path from error message or output.

        Args:
            text: Text to search for file path

        Returns:
            Extracted file path or None
        """
        # Common patterns for file paths
        patterns = [
            r"File ['\"]([^'\"]+)['\"]",  # File "path/to/file.py"
            r"(tests/[\w/._-]+\.py)",     # tests/test_file.py
            r"(src/[\w/._-]+\.py)",       # src/module.py
            r"(lib/[\w/._-]+\.py)",       # lib/utils.py
            r"both (?:modified|added):\s+([\w/._-]+)",  # git conflict
            r"([\w/._-]+\.py):\d+",       # file.py:42
        ]

        for pattern in patterns:
            match = re.search(pattern, text)
            if match:
                return match.group(1)

        return None
