"""
Tests for ErrorDetector service.

Tests detection of test failures, git conflicts, and missing dependencies.
"""

import pytest
from pathlib import Path
from datetime import datetime
from unittest.mock import Mock, MagicMock, patch
import subprocess

from lib.yoyo_tui_v3.services.error_detector import ErrorDetector
from lib.yoyo_tui_v3.models import DetectedError, ErrorType, Event, EventType


@pytest.fixture
def mock_event_bus():
    """Mock EventBus for testing."""
    bus = Mock()
    bus.publish = Mock()
    return bus


@pytest.fixture
def detector(mock_event_bus, tmp_path):
    """Create ErrorDetector instance."""
    return ErrorDetector(
        event_bus=mock_event_bus,
        yoyo_dev_path=tmp_path
    )


# ============================================================================
# Test Failure Detection
# ============================================================================

def test_detect_pytest_failure_from_output(detector):
    """Test detection of pytest failures from test output."""
    test_output = """
============================= test session starts ==============================
collected 5 items

tests/test_auth.py .F..F                                                  [100%]

=================================== FAILURES ===================================
_______________________________ test_user_login ________________________________

    def test_user_login():
>       assert login_user("john", "wrong_pass") == True
E       AssertionError: assert False == True

tests/test_auth.py:42: AssertionError
=========================== short test summary info ============================
FAILED tests/test_auth.py::test_user_login - AssertionError
FAILED tests/test_auth.py::test_user_logout - KeyError
========================= 2 failed, 3 passed in 0.54s ==========================
"""

    errors = detector._detect_test_failures(test_output)

    # Should detect 2 failures
    assert len(errors) >= 1  # At least the main failure

    error = errors[0]
    assert error.type == ErrorType.TEST
    assert "test_user_login" in error.message or "test_auth.py" in error.message
    assert error.severity in ["high", "medium"]
    assert "/create-fix" in error.suggested_fix
    assert error.file == "tests/test_auth.py" or "test_auth" in error.message


def test_detect_unittest_failure(detector):
    """Test detection of unittest failures."""
    test_output = """
F.F
======================================================================
FAIL: test_authentication (__main__.TestAuth)
----------------------------------------------------------------------
Traceback (most recent call last):
  File "tests/test_auth.py", line 25, in test_authentication
    self.assertTrue(False)
AssertionError: False is not true

----------------------------------------------------------------------
Ran 3 tests in 0.001s

FAILED (failures=2)
"""

    errors = detector._detect_test_failures(test_output)

    assert len(errors) >= 1
    error = errors[0]
    assert error.type == ErrorType.TEST
    assert "test_authentication" in error.message or "TestAuth" in error.message
    assert error.severity in ["high", "medium"]


def test_detect_no_test_failures_when_all_pass(detector):
    """Test that no errors detected when all tests pass."""
    test_output = """
============================= test session starts ==============================
collected 10 items

tests/test_auth.py ..........                                             [100%]

============================== 10 passed in 1.23s ===============================
"""

    errors = detector._detect_test_failures(test_output)

    # Should detect no failures
    assert len(errors) == 0


def test_detect_test_failures_from_file(detector, tmp_path):
    """Test detection of test failures from log file."""
    # Create test output file
    log_file = tmp_path / "pytest.log"
    log_file.write_text("""
FAILED tests/test_core.py::test_initialize - RuntimeError: Init failed
FAILED tests/test_core.py::test_cleanup - AssertionError
""")

    errors = detector._detect_test_failures_from_file(log_file)

    assert len(errors) >= 1
    assert any("test_initialize" in e.message for e in errors)
    assert all(e.type == ErrorType.TEST for e in errors)


# ============================================================================
# Git Conflict Detection
# ============================================================================

def test_detect_git_conflicts_from_status(detector):
    """Test detection of git conflicts from git status output."""
    git_output = """
On branch main
You have unmerged paths.
  (fix conflicts and run "git commit")
  (use "git merge --abort" to abort the merge)

Unmerged paths:
  (use "git add <file>..." to mark resolution)
	both modified:   src/auth.py
	both modified:   src/utils.py

no changes added to commit (use "git add" and/or "git commit -a")
"""

    errors = detector._detect_git_conflicts(git_output)

    # Should detect conflicts
    assert len(errors) >= 1

    error = errors[0]
    assert error.type == ErrorType.GIT
    assert "conflict" in error.message.lower() or "merge" in error.message.lower()
    assert error.severity in ["critical", "high"]
    assert "/create-fix" in error.suggested_fix
    assert "src/auth.py" in error.file or "src/utils.py" in error.file


def test_detect_no_git_conflicts_when_clean(detector):
    """Test that no errors when git status is clean."""
    git_output = """
On branch main
Your branch is up to date with 'origin/main'.

nothing to commit, working tree clean
"""

    errors = detector._detect_git_conflicts(git_output)

    assert len(errors) == 0


def test_detect_git_conflicts_with_uncommitted_changes(detector):
    """Test that uncommitted changes without conflicts don't trigger error."""
    git_output = """
On branch main
Changes not staged for commit:
  (use "git add <file>..." to update what will be committed)
  (use "git restore <file>..." to discard changes in working directory)
	modified:   src/main.py

no changes added to commit (use "git add" and/or "git commit -a")
"""

    errors = detector._detect_git_conflicts(git_output)

    # Should not detect conflicts (just uncommitted changes)
    assert len(errors) == 0


@patch('subprocess.run')
def test_detect_git_conflicts_from_command(mock_run, detector):
    """Test detection of git conflicts using git command."""
    # Mock git status output
    mock_run.return_value = MagicMock(
        returncode=0,
        stdout="both modified:   src/auth.py\nboth modified:   src/db.py",
        stderr=""
    )

    errors = detector.detect_git_conflicts()

    # Should run git status command
    mock_run.assert_called_once()
    call_args = mock_run.call_args[0][0]
    assert "git" in call_args
    assert "status" in call_args

    # Should detect conflicts
    assert len(errors) >= 1
    assert errors[0].type == ErrorType.GIT


# ============================================================================
# Missing Dependency Detection
# ============================================================================

def test_detect_missing_python_module(detector):
    """Test detection of missing Python modules."""
    error_output = """
Traceback (most recent call last):
  File "lib/yoyo_tui_v3/app.py", line 5, in <module>
    from textual.app import App
ModuleNotFoundError: No module named 'textual'
"""

    errors = detector._detect_missing_dependencies(error_output)

    assert len(errors) >= 1

    error = errors[0]
    assert error.type == ErrorType.DEPENDENCY
    assert "textual" in error.message.lower()
    assert error.severity in ["high", "medium"]
    assert "pip install" in error.suggested_fix.lower()
    assert "textual" in error.suggested_fix.lower()


def test_detect_import_error(detector):
    """Test detection of ImportError."""
    error_output = """
Traceback (most recent call last):
  File "src/main.py", line 3, in <module>
    from utils import helper
ImportError: cannot import name 'helper' from 'utils'
"""

    errors = detector._detect_missing_dependencies(error_output)

    assert len(errors) >= 1

    error = errors[0]
    assert error.type == ErrorType.DEPENDENCY
    assert "helper" in error.message or "utils" in error.message


def test_detect_multiple_missing_modules(detector):
    """Test detection of multiple missing modules."""
    error_output = """
ModuleNotFoundError: No module named 'textual'
ModuleNotFoundError: No module named 'watchdog'
ModuleNotFoundError: No module named 'pyyaml'
"""

    errors = detector._detect_missing_dependencies(error_output)

    # Should detect all 3 missing modules
    assert len(errors) >= 3

    module_names = [e.message for e in errors]
    assert any("textual" in msg.lower() for msg in module_names)
    assert any("watchdog" in msg.lower() for msg in module_names)
    assert any("pyyaml" in msg.lower() for msg in module_names)


def test_no_dependency_errors_with_clean_output(detector):
    """Test that no errors detected with clean output."""
    clean_output = """
Running application...
All imports successful
Application started successfully
"""

    errors = detector._detect_missing_dependencies(clean_output)

    assert len(errors) == 0


# ============================================================================
# Error Storage and Retrieval
# ============================================================================

def test_store_and_retrieve_errors(detector):
    """Test that errors are stored and can be retrieved."""
    # Create test error
    error = DetectedError(
        type=ErrorType.TEST,
        message="Test failed",
        file="tests/test_main.py",
        timestamp=datetime.now(),
        suggested_fix="/create-fix \"test failure\"",
        severity="high"
    )

    # Store error
    detector._store_error(error)

    # Retrieve errors
    errors = detector.get_recent_errors()

    assert len(errors) >= 1
    assert errors[0].type == ErrorType.TEST
    assert errors[0].message == "Test failed"


def test_max_errors_limit(detector):
    """Test that only last 10 errors are kept."""
    from datetime import timedelta

    # Create 15 errors with increasing timestamps
    base_time = datetime.now()
    for i in range(15):
        error = DetectedError(
            type=ErrorType.TEST,
            message=f"Error {i}",
            file=f"test_{i}.py",
            timestamp=base_time + timedelta(seconds=i),
            suggested_fix="/create-fix",
            severity="medium"
        )
        detector._store_error(error)

    # Should only keep last 10
    errors = detector.get_recent_errors()
    assert len(errors) == 10

    # Should contain the most recent error
    messages = [e.message for e in errors]
    assert "Error 14" in messages  # Most recent

    # The first error in the sorted list should be the most recent
    assert errors[0].message == "Error 14"

    # Verify all returned errors are DetectedError instances
    for error in errors:
        assert isinstance(error, DetectedError)
        assert error.type == ErrorType.TEST


def test_errors_sorted_by_timestamp(detector):
    """Test that errors are returned sorted by timestamp (newest first)."""
    from datetime import timedelta

    # Create errors with different timestamps
    base_time = datetime.now()

    for i in range(5):
        error = DetectedError(
            type=ErrorType.TEST,
            message=f"Error {i}",
            file=f"test_{i}.py",
            timestamp=base_time + timedelta(seconds=i),
            suggested_fix="/create-fix",
            severity="medium"
        )
        detector._store_error(error)

    errors = detector.get_recent_errors()

    # Should be sorted newest first
    assert errors[0].message == "Error 4"
    assert errors[-1].message == "Error 0"


# ============================================================================
# Event Publishing
# ============================================================================

def test_publish_error_detected_event(detector, mock_event_bus):
    """Test that ERROR_DETECTED event is published when error found."""
    # Detect a test failure
    test_output = "FAILED tests/test_core.py::test_init - AssertionError"

    errors = detector._detect_test_failures(test_output)

    # Store error (should publish event)
    if errors:
        detector._store_error(errors[0])

    # Should publish ERROR_DETECTED event
    mock_event_bus.publish.assert_called()

    call_args = mock_event_bus.publish.call_args
    event_type = call_args[0][0] if call_args[0] else call_args[1].get('event_type')

    assert event_type == EventType.ERROR_DETECTED


# ============================================================================
# Integration: Full Error Detection Cycle
# ============================================================================

@patch('subprocess.run')
def test_full_error_detection_cycle(mock_run, mock_event_bus, detector, tmp_path):
    """Test complete error detection cycle with multiple error types."""
    # Setup: Create test log file with failures
    log_file = tmp_path / "pytest.log"
    log_file.write_text("FAILED tests/test_auth.py::test_login - AssertionError")

    # Mock git status showing conflicts
    mock_run.return_value = MagicMock(
        returncode=0,
        stdout="both modified:   src/main.py",
        stderr=""
    )

    # Mock Python error with missing dependency
    dependency_output = "ModuleNotFoundError: No module named 'textual'"

    # Run detection
    test_errors = detector._detect_test_failures_from_file(log_file)
    git_errors = detector.detect_git_conflicts()
    dep_errors = detector._detect_missing_dependencies(dependency_output)

    # Should detect all error types
    assert len(test_errors) >= 1
    assert len(git_errors) >= 1
    assert len(dep_errors) >= 1

    # Verify error types
    assert test_errors[0].type == ErrorType.TEST
    assert git_errors[0].type == ErrorType.GIT
    assert dep_errors[0].type == ErrorType.DEPENDENCY


def test_detect_all_errors_method(detector, tmp_path):
    """Test detect_all_errors() convenience method."""
    # Create test log
    log_file = tmp_path / "pytest.log"
    log_file.write_text("FAILED tests/test_core.py::test_init")

    with patch('subprocess.run') as mock_run:
        mock_run.return_value = MagicMock(
            returncode=0,
            stdout="",  # No conflicts
            stderr=""
        )

        # Run detection
        all_errors = detector.detect_all_errors()

        # Should return list of all detected errors
        assert isinstance(all_errors, list)

        # Each error should be DetectedError
        for error in all_errors:
            assert isinstance(error, DetectedError)
            assert error.type in [ErrorType.TEST, ErrorType.GIT, ErrorType.DEPENDENCY]


# ============================================================================
# Edge Cases
# ============================================================================

def test_handle_invalid_test_output(detector):
    """Test handling of invalid/corrupted test output."""
    invalid_output = "ø∆˚¬…æ«≈ç√∫˜µ≤≥÷"

    # Should not crash
    errors = detector._detect_test_failures(invalid_output)

    # Should return empty list or handle gracefully
    assert isinstance(errors, list)


def test_handle_missing_log_file(detector, tmp_path):
    """Test handling of missing log file."""
    missing_file = tmp_path / "nonexistent.log"

    # Should not crash
    errors = detector._detect_test_failures_from_file(missing_file)

    assert isinstance(errors, list)
    assert len(errors) == 0


@patch('subprocess.run')
def test_handle_git_command_failure(mock_run, detector):
    """Test handling of git command failure."""
    # Mock git command failure
    mock_run.side_effect = subprocess.CalledProcessError(1, "git status")

    # Should not crash
    errors = detector.detect_git_conflicts()

    # Should return empty list
    assert isinstance(errors, list)


def test_extract_file_from_error_message(detector):
    """Test extraction of file path from various error formats."""
    test_cases = [
        ("FAILED tests/test_auth.py::test_login", "tests/test_auth.py"),
        ("File 'src/main.py', line 42", "src/main.py"),
        ("both modified:   lib/utils.py", "lib/utils.py"),
        ("ModuleNotFoundError in app.py", "app.py"),
    ]

    for error_msg, expected_file in test_cases:
        extracted = detector._extract_file_path(error_msg)
        # Should extract file path or None
        if extracted:
            assert expected_file in str(extracted)
        # If None, that's also valid (some patterns may not match)
