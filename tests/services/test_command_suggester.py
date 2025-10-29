"""
Tests for IntelligentCommandSuggester service.

Tests all 9 suggestion rules for context-aware command recommendations.
"""

import pytest
from pathlib import Path
from datetime import datetime
from unittest.mock import Mock, MagicMock

from lib.yoyo_tui_v3.services.command_suggester import IntelligentCommandSuggester
from lib.yoyo_tui_v3.models import (
    CommandSuggestion,
    Spec,
    Fix,
    Task,
    TaskStatus,
    SpecStatus,
    DetectedError,
    ErrorType,
    GitStatus,
)


@pytest.fixture
def mock_data_manager():
    """Mock DataManager for testing."""
    manager = Mock()
    manager.get_active_work = Mock(return_value=None)
    manager.get_all_specs = Mock(return_value=[])
    manager.get_all_fixes = Mock(return_value=[])
    manager.get_git_status = Mock(return_value=GitStatus(
        current_branch="main",
        has_uncommitted_changes=False,
        has_conflicts=False
    ))
    manager.get_recent_errors = Mock(return_value=[])
    return manager


@pytest.fixture
def mock_event_bus():
    """Mock EventBus for testing."""
    return Mock()


@pytest.fixture
def suggester(mock_data_manager):
    """Create IntelligentCommandSuggester instance without EventBus."""
    return IntelligentCommandSuggester(data_manager=mock_data_manager)


@pytest.fixture
def suggester_with_event_bus(mock_data_manager, mock_event_bus):
    """Create IntelligentCommandSuggester instance with EventBus."""
    return IntelligentCommandSuggester(
        data_manager=mock_data_manager,
        event_bus=mock_event_bus
    )


# ============================================================================
# Rule 1: No Active Spec/Fix
# ============================================================================

def test_rule1_no_product_docs_suggests_plan_product(suggester, mock_data_manager, tmp_path):
    """Rule 1a: No active work + no product docs → suggest /plan-product."""
    # Setup: No active work, no product docs
    mock_data_manager.get_active_work.return_value = None
    suggester.yoyo_dev_path = tmp_path

    # Product path doesn't exist
    product_path = tmp_path / "product"
    assert not product_path.exists()

    suggestions = suggester.generate_suggestions()

    # Should suggest /plan-product
    assert len(suggestions) > 0
    assert any(
        s.command == "/plan-product" and
        "mission" in s.reason.lower()
        for s in suggestions
    )


def test_rule1_with_product_docs_suggests_create_new(suggester, mock_data_manager, tmp_path):
    """Rule 1b: No active work + product docs exist → suggest /create-new."""
    # Setup: No active work, product docs exist
    mock_data_manager.get_active_work.return_value = None
    suggester.yoyo_dev_path = tmp_path

    # Create product docs
    product_path = tmp_path / "product"
    product_path.mkdir()
    (product_path / "mission.md").write_text("# Mission\nBuild awesome software")

    suggestions = suggester.generate_suggestions()

    # Should suggest /create-new
    assert len(suggestions) > 0
    assert any(
        s.command == "/create-new" and
        "feature" in s.reason.lower()
        for s in suggestions
    )


def test_rule1_existing_codebase_no_yoyo_suggests_analyze(suggester, mock_data_manager, tmp_path):
    """Rule 1c: Existing codebase but no yoyo-dev → suggest /analyze-product."""
    # Setup: No active work, codebase exists, no product docs
    mock_data_manager.get_active_work.return_value = None
    suggester.yoyo_dev_path = tmp_path

    # Simulate existing codebase (e.g., src/ directory)
    src_path = tmp_path.parent / "src"
    src_path.mkdir(exist_ok=True)
    (src_path / "main.py").write_text("print('hello')")

    # No product directory
    product_path = tmp_path / "product"
    assert not product_path.exists()

    suggestions = suggester.generate_suggestions()

    # Should suggest /analyze-product
    assert len(suggestions) > 0
    assert any(
        s.command == "/analyze-product" and
        "analyze" in s.reason.lower()
        for s in suggestions
    )


# ============================================================================
# Rule 2: Spec Created, No Tasks
# ============================================================================

def test_rule2_spec_created_no_tasks_suggests_create_tasks(suggester, mock_data_manager):
    """Rule 2: Spec created but no tasks → suggest /create-tasks."""
    # Setup: Active spec with no tasks
    spec = Spec(
        name="user-authentication",
        date="2025-10-29",
        path=Path("/tmp/specs/2025-10-29-user-authentication"),
        status=SpecStatus.IN_PROGRESS,
        tasks=[],
        progress=0.0
    )

    active_work = {
        "type": "spec",
        "name": "user-authentication",
        "path": spec.path,
        "tasks": [],
        "progress": 0.0,
        "status": "in_progress"
    }

    mock_data_manager.get_active_work.return_value = active_work

    suggestions = suggester.generate_suggestions()

    # Should suggest /create-tasks
    assert len(suggestions) > 0
    assert any(
        s.command == "/create-tasks" and
        "task" in s.reason.lower()
        for s in suggestions
    )


# ============================================================================
# Rule 3: Tasks Created, Not Started
# ============================================================================

def test_rule3_tasks_created_not_started_suggests_execute_tasks(suggester, mock_data_manager):
    """Rule 3: Tasks created but not started → suggest /execute-tasks."""
    # Setup: Active spec with pending tasks
    tasks = [
        Task(
            id="1",
            title="Setup database",
            subtasks=["1.1 Create schema", "1.2 Run migrations"],
            status=TaskStatus.PENDING
        ),
        Task(
            id="2",
            title="Build API",
            subtasks=["2.1 Create endpoints", "2.2 Add validation"],
            status=TaskStatus.PENDING
        ),
    ]

    active_work = {
        "type": "spec",
        "name": "user-authentication",
        "path": Path("/tmp/specs/2025-10-29-user-authentication"),
        "tasks": tasks,
        "progress": 0.0,
        "status": "pending"
    }

    mock_data_manager.get_active_work.return_value = active_work

    suggestions = suggester.generate_suggestions()

    # Should suggest /execute-tasks
    assert len(suggestions) > 0
    assert any(
        s.command == "/execute-tasks" and
        ("execut" in s.reason.lower() or "start" in s.reason.lower())
        for s in suggestions
    )

    # Priority should be high (1 or 2)
    execute_suggestion = next(s for s in suggestions if s.command == "/execute-tasks")
    assert execute_suggestion.priority <= 2


# ============================================================================
# Rule 4: Tasks In Progress
# ============================================================================

def test_rule4_tasks_in_progress_suggests_continue(suggester, mock_data_manager):
    """Rule 4a: Tasks in progress → suggest continue working."""
    # Setup: Active spec with in-progress tasks
    tasks = [
        Task(
            id="1",
            title="Setup database",
            subtasks=["1.1 Create schema", "1.2 Run migrations"],
            status=TaskStatus.COMPLETED
        ),
        Task(
            id="2",
            title="Build API",
            subtasks=["2.1 Create endpoints", "2.2 Add validation"],
            status=TaskStatus.IN_PROGRESS
        ),
        Task(
            id="3",
            title="Add tests",
            subtasks=["3.1 Unit tests", "3.2 Integration tests"],
            status=TaskStatus.PENDING
        ),
    ]

    active_work = {
        "type": "spec",
        "name": "user-authentication",
        "path": Path("/tmp/specs/2025-10-29-user-authentication"),
        "tasks": tasks,
        "progress": 33.3,
        "status": "in_progress"
    }

    mock_data_manager.get_active_work.return_value = active_work

    suggestions = suggester.generate_suggestions()

    # Should suggest continuing work
    assert len(suggestions) > 0
    assert any(
        "continue" in s.reason.lower() or "keep working" in s.reason.lower()
        for s in suggestions
    )


def test_rule4_many_tasks_completed_suggests_review(suggester, mock_data_manager):
    """Rule 4b: Many tasks completed → suggest /review --devil."""
    # Setup: Active spec with mostly completed tasks
    tasks = [
        Task(id="1", title="Task 1", subtasks=["1.1"], status=TaskStatus.COMPLETED),
        Task(id="2", title="Task 2", subtasks=["2.1"], status=TaskStatus.COMPLETED),
        Task(id="3", title="Task 3", subtasks=["3.1"], status=TaskStatus.COMPLETED),
        Task(id="4", title="Task 4", subtasks=["4.1"], status=TaskStatus.IN_PROGRESS),
    ]

    active_work = {
        "type": "spec",
        "name": "user-authentication",
        "path": Path("/tmp/specs/2025-10-29-user-authentication"),
        "tasks": tasks,
        "progress": 75.0,
        "status": "in_progress"
    }

    mock_data_manager.get_active_work.return_value = active_work

    suggestions = suggester.generate_suggestions()

    # Should suggest /review --devil when >70% complete
    assert any(
        s.command == "/review --devil" and
        "review" in s.reason.lower()
        for s in suggestions
    )


# ============================================================================
# Rule 5: Tasks Completed, No PR
# ============================================================================

def test_rule5_tasks_completed_no_pr_suggests_execute_tasks(suggester, mock_data_manager):
    """Rule 5: All tasks completed but no PR → suggest /execute-tasks (post-execution)."""
    # Setup: All tasks completed, no PR yet
    tasks = [
        Task(id="1", title="Task 1", subtasks=["1.1"], status=TaskStatus.COMPLETED),
        Task(id="2", title="Task 2", subtasks=["2.1"], status=TaskStatus.COMPLETED),
        Task(id="3", title="Task 3", subtasks=["3.1"], status=TaskStatus.COMPLETED),
    ]

    active_work = {
        "type": "spec",
        "name": "user-authentication",
        "path": Path("/tmp/specs/2025-10-29-user-authentication"),
        "tasks": tasks,
        "progress": 100.0,
        "status": "completed"
    }

    mock_data_manager.get_active_work.return_value = active_work

    # Simulate no PR created yet (would be in state.json)
    suggestions = suggester.generate_suggestions()

    # Should suggest /execute-tasks to finish post-execution steps
    assert any(
        s.command == "/execute-tasks" and
        ("post" in s.reason.lower() or "pr" in s.reason.lower())
        for s in suggestions
    )


# ============================================================================
# Rule 6: PR Created
# ============================================================================

def test_rule6_pr_created_suggests_next_feature(suggester, mock_data_manager):
    """Rule 6: PR created → suggest /create-new for next feature."""
    # Setup: Completed spec with PR
    tasks = [
        Task(id="1", title="Task 1", subtasks=["1.1"], status=TaskStatus.COMPLETED),
    ]

    spec = Spec(
        name="user-authentication",
        date="2025-10-29",
        path=Path("/tmp/specs/2025-10-29-user-authentication"),
        status=SpecStatus.COMPLETED,
        tasks=tasks,
        progress=100.0,
        pr_url="https://github.com/user/repo/pull/123"
    )

    active_work = {
        "type": "spec",
        "name": "user-authentication",
        "path": spec.path,
        "tasks": tasks,
        "progress": 100.0,
        "status": "completed",
        "pr_url": "https://github.com/user/repo/pull/123"  # Add pr_url to trigger Rule 6
    }

    mock_data_manager.get_active_work.return_value = active_work

    suggestions = suggester.generate_suggestions()

    # Should suggest /create-new for next feature
    assert any(
        s.command == "/create-new" and
        ("next" in s.reason.lower() or "feature" in s.reason.lower())
        for s in suggestions
    )


# ============================================================================
# Rule 7: Test Failures Detected
# ============================================================================

def test_rule7_test_failures_suggests_create_fix(suggester, mock_data_manager):
    """Rule 7: Test failures detected → suggest /create-fix."""
    # Setup: No active work, but test failures detected
    mock_data_manager.get_active_work.return_value = None

    error = DetectedError(
        type=ErrorType.TEST,
        message="AssertionError in test_user_login",
        file="tests/test_auth.py",
        timestamp=datetime.now(),
        suggested_fix="/create-fix \"test failure in test_user_login\"",
        severity="high"
    )

    mock_data_manager.get_recent_errors.return_value = [error]

    suggestions = suggester.generate_suggestions()

    # Should suggest /create-fix for test failures
    assert any(
        "/create-fix" in s.command and
        "test" in s.reason.lower()
        for s in suggestions
    )

    # Priority should be high for test failures
    fix_suggestion = next(s for s in suggestions if "/create-fix" in s.command)
    assert fix_suggestion.priority <= 2


# ============================================================================
# Rule 8: Git Conflicts Detected
# ============================================================================

def test_rule8_git_conflicts_suggests_create_fix(suggester, mock_data_manager):
    """Rule 8: Git conflicts detected → suggest /create-fix."""
    # Setup: No active work, git conflicts detected
    mock_data_manager.get_active_work.return_value = None

    error = DetectedError(
        type=ErrorType.GIT,
        message="Merge conflict in src/auth.py",
        file="src/auth.py",
        timestamp=datetime.now(),
        suggested_fix="/create-fix \"git conflicts\"",
        severity="critical"
    )

    mock_data_manager.get_recent_errors.return_value = [error]

    # Also set git status to show conflicts
    mock_data_manager.get_git_status.return_value = GitStatus(
        current_branch="main",
        has_uncommitted_changes=True,
        has_conflicts=True
    )

    suggestions = suggester.generate_suggestions()

    # Should suggest /create-fix for git conflicts
    assert any(
        "/create-fix" in s.command and
        ("git" in s.reason.lower() or "conflict" in s.reason.lower())
        for s in suggestions
    )

    # Priority should be critical
    fix_suggestion = next(s for s in suggestions if "/create-fix" in s.command)
    assert fix_suggestion.priority == 1  # Highest priority


# ============================================================================
# Rule 9: Missing Dependencies Detected
# ============================================================================

def test_rule9_missing_dependencies_suggests_install(suggester, mock_data_manager):
    """Rule 9: Missing dependencies → suggest installation command."""
    # Setup: Dependency error detected
    mock_data_manager.get_active_work.return_value = None

    error = DetectedError(
        type=ErrorType.DEPENDENCY,
        message="ModuleNotFoundError: No module named 'textual'",
        file="lib/yoyo_tui_v3/app.py",
        timestamp=datetime.now(),
        suggested_fix="pip install textual",
        severity="high"
    )

    mock_data_manager.get_recent_errors.return_value = [error]

    suggestions = suggester.generate_suggestions()

    # Should suggest pip install command
    assert any(
        "pip install" in s.command or "install" in s.reason.lower()
        for s in suggestions
    )

    # Should show which dependency is missing
    dep_suggestion = next(s for s in suggestions if "install" in s.reason.lower())
    assert "textual" in dep_suggestion.reason.lower() or "textual" in dep_suggestion.command


# ============================================================================
# Integration Tests
# ============================================================================

def test_suggestions_sorted_by_priority(suggester, mock_data_manager):
    """Test that suggestions are returned sorted by priority (1=highest)."""
    # Setup: Multiple errors and active work
    tasks = [
        Task(id="1", title="Task 1", subtasks=["1.1"], status=TaskStatus.IN_PROGRESS),
    ]

    active_work = {
        "type": "spec",
        "name": "test-spec",
        "path": Path("/tmp/specs/2025-10-29-test-spec"),
        "tasks": tasks,
        "progress": 20.0,
        "status": "in_progress"
    }

    mock_data_manager.get_active_work.return_value = active_work

    # Add critical error
    error = DetectedError(
        type=ErrorType.GIT,
        message="Merge conflict",
        file="src/main.py",
        timestamp=datetime.now(),
        suggested_fix="/create-fix \"git conflicts\"",
        severity="critical"
    )
    mock_data_manager.get_recent_errors.return_value = [error]
    mock_data_manager.get_git_status.return_value = GitStatus(
        current_branch="main",
        has_uncommitted_changes=True,
        has_conflicts=True
    )

    suggestions = suggester.generate_suggestions()

    # Should have multiple suggestions
    assert len(suggestions) >= 2

    # Should be sorted by priority (ascending: 1, 2, 3...)
    priorities = [s.priority for s in suggestions]
    assert priorities == sorted(priorities)

    # Critical error should be first
    assert suggestions[0].priority == 1
    assert "conflict" in suggestions[0].reason.lower()


def test_max_suggestions_limit(suggester, mock_data_manager):
    """Test that max 5 suggestions are returned."""
    # Setup: Create scenario that would generate many suggestions
    # This tests the limit enforced by the service

    # Multiple errors
    errors = [
        DetectedError(
            type=ErrorType.TEST,
            message=f"Test {i} failed",
            file=f"tests/test_{i}.py",
            timestamp=datetime.now(),
            suggested_fix=f"/create-fix \"test {i}\"",
            severity="medium"
        )
        for i in range(10)
    ]
    mock_data_manager.get_recent_errors.return_value = errors

    suggestions = suggester.generate_suggestions()

    # Should limit to 5 suggestions
    assert len(suggestions) <= 5


def test_suggestions_have_required_fields(suggester, mock_data_manager):
    """Test that all suggestions have required fields."""
    # Setup: Basic scenario
    mock_data_manager.get_active_work.return_value = None
    suggester.yoyo_dev_path = Path("/tmp/.yoyo-dev")

    suggestions = suggester.generate_suggestions()

    # All suggestions should have required fields
    for suggestion in suggestions:
        assert isinstance(suggestion, CommandSuggestion)
        assert suggestion.command  # Not empty
        assert suggestion.reason  # Not empty
        assert isinstance(suggestion.priority, int)
        assert 1 <= suggestion.priority <= 5
        assert suggestion.icon  # Not empty (emoji)


def test_empty_state_returns_valid_suggestions(suggester, mock_data_manager):
    """Test that even with no data, suggester returns helpful suggestions."""
    # Setup: Completely empty state
    mock_data_manager.get_active_work.return_value = None
    mock_data_manager.get_all_specs.return_value = []
    mock_data_manager.get_all_fixes.return_value = []
    mock_data_manager.get_recent_errors.return_value = []
    suggester.yoyo_dev_path = Path("/tmp/.yoyo-dev")

    suggestions = suggester.generate_suggestions()

    # Should still return at least one suggestion
    assert len(suggestions) > 0

    # Should suggest getting started (plan-product or create-new or analyze-product)
    assert any(
        "plan" in s.command.lower() or "create" in s.command.lower() or "analyze" in s.command.lower()
        for s in suggestions
    )


# ============================================================================
# EventBus Integration Tests
# ============================================================================

def test_event_published_on_generate_suggestions(suggester_with_event_bus, mock_data_manager, mock_event_bus, tmp_path):
    """Test that COMMAND_SUGGESTIONS_UPDATED event is published when suggestions are generated."""
    from lib.yoyo_tui_v3.models import EventType

    # Setup: Basic scenario
    mock_data_manager.get_active_work.return_value = None
    suggester_with_event_bus.yoyo_dev_path = tmp_path

    suggestions = suggester_with_event_bus.generate_suggestions()

    # Verify event was published
    mock_event_bus.publish.assert_called_once()

    # Verify event type
    call_args = mock_event_bus.publish.call_args
    assert call_args[1]["event_type"] == EventType.COMMAND_SUGGESTIONS_UPDATED

    # Verify event data contains suggestions
    event_data = call_args[1]["data"]
    assert "suggestions" in event_data
    assert "count" in event_data
    assert event_data["count"] == len(suggestions)
    assert len(event_data["suggestions"]) == len(suggestions)

    # Verify event source
    assert call_args[1]["source"] == "IntelligentCommandSuggester"


def test_event_data_structure(suggester_with_event_bus, mock_data_manager, mock_event_bus, tmp_path):
    """Test that event data has correct structure."""
    from lib.yoyo_tui_v3.models import EventType

    # Setup: Create scenario with known suggestions
    tasks = [
        Task(id="1", title="Task 1", subtasks=["1.1"], status=TaskStatus.PENDING),
    ]

    active_work = {
        "type": "spec",
        "name": "test-spec",
        "path": Path("/tmp/specs/2025-10-29-test-spec"),
        "tasks": tasks,
        "progress": 0.0,
        "status": "pending"
    }

    mock_data_manager.get_active_work.return_value = active_work
    suggester_with_event_bus.yoyo_dev_path = tmp_path

    suggestions = suggester_with_event_bus.generate_suggestions()

    # Get published event data
    call_args = mock_event_bus.publish.call_args
    event_data = call_args[1]["data"]

    # Verify each suggestion in event data has required fields
    for suggestion_dict in event_data["suggestions"]:
        assert "command" in suggestion_dict
        assert "reason" in suggestion_dict
        assert "priority" in suggestion_dict
        assert "icon" in suggestion_dict

        # Verify data types
        assert isinstance(suggestion_dict["command"], str)
        assert isinstance(suggestion_dict["reason"], str)
        assert isinstance(suggestion_dict["priority"], int)
        assert isinstance(suggestion_dict["icon"], str)


def test_no_event_published_without_event_bus(suggester, mock_data_manager, tmp_path):
    """Test that no event is published when EventBus is not configured."""
    # Setup: Suggester without EventBus
    mock_data_manager.get_active_work.return_value = None
    suggester.yoyo_dev_path = tmp_path

    # Should not raise error
    suggestions = suggester.generate_suggestions()

    # Should still return suggestions
    assert len(suggestions) > 0


def test_event_published_for_different_scenarios(suggester_with_event_bus, mock_data_manager, mock_event_bus, tmp_path):
    """Test that events are published for different suggestion scenarios."""
    from lib.yoyo_tui_v3.models import EventType

    scenarios = [
        # Scenario 1: No active work
        {
            "active_work": None,
            "errors": [],
        },
        # Scenario 2: Active work with tasks
        {
            "active_work": {
                "type": "spec",
                "name": "test-spec",
                "path": Path("/tmp/specs/2025-10-29-test-spec"),
                "tasks": [Task(id="1", title="Task 1", subtasks=["1.1"], status=TaskStatus.PENDING)],
                "progress": 0.0,
                "status": "pending"
            },
            "errors": [],
        },
        # Scenario 3: Test errors present
        {
            "active_work": None,
            "errors": [
                DetectedError(
                    type=ErrorType.TEST,
                    message="Test failed",
                    file="test.py",
                    timestamp=datetime.now(),
                    suggested_fix="/create-fix",
                    severity="high"
                )
            ],
        },
    ]

    for i, scenario in enumerate(scenarios):
        mock_event_bus.reset_mock()
        mock_data_manager.get_active_work.return_value = scenario["active_work"]
        mock_data_manager.get_recent_errors.return_value = scenario["errors"]
        suggester_with_event_bus.yoyo_dev_path = tmp_path

        suggestions = suggester_with_event_bus.generate_suggestions()

        # Verify event was published for each scenario
        assert mock_event_bus.publish.call_count == 1, f"Scenario {i+1} failed"

        # Verify event data matches suggestions
        call_args = mock_event_bus.publish.call_args
        event_data = call_args[1]["data"]
        assert event_data["count"] == len(suggestions), f"Scenario {i+1} count mismatch"
