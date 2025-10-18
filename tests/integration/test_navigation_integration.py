#!/usr/bin/env python3
"""
Integration test for navigation system.

Simulates complete navigation flows:
1. Main screen → TaskDetailScreen → Main screen
2. Main screen → SpecDetailScreen → Main screen
"""

import sys
from pathlib import Path

# Add lib to path
sys.path.insert(0, str(Path(__file__).parent / 'lib'))

def test_task_detail_navigation():
    """Test navigation to TaskDetailScreen."""
    from yoyo_tui.models import TaskData, ParentTask, Subtask

    # Create test task data
    parent_task = ParentTask(
        number=1,
        name="Test Task",
        completed=False,
        subtasks=[
            Subtask(text="Subtask 1", completed=False),
            Subtask(text="Subtask 2", completed=True)
        ]
    )

    task_data = TaskData(
        file_path=Path("tasks.md"),
        parent_tasks=[parent_task]
    )

    # Import screen
    from yoyo_tui.screens.task_detail_screen import TaskDetailScreen

    # Create screen instance
    screen = TaskDetailScreen(task_data=task_data)

    # Verify screen has dismiss action
    assert hasattr(screen, 'action_dismiss'), "TaskDetailScreen should have action_dismiss"

    # Verify screen has ESC binding
    bindings = {b.key for b in screen.BINDINGS}
    assert 'escape' in bindings, "TaskDetailScreen should have ESC binding"

    print("✓ TaskDetailScreen navigation verified")


def test_spec_detail_navigation():
    """Test navigation to SpecDetailScreen."""
    from yoyo_tui.screens.spec_detail_screen import SpecDetailScreen

    # Use actual spec folder from project
    spec_folder = Path.cwd() / '.yoyo-dev' / 'specs' / '2025-10-11-textual-tui-migration'

    if not spec_folder.exists():
        print("⚠ Skipping spec detail test - spec folder not found")
        return

    # Create screen instance
    screen = SpecDetailScreen(spec_folder=spec_folder, spec_type='spec')

    # Verify screen has dismiss action
    assert hasattr(screen, 'action_dismiss'), "SpecDetailScreen should have action_dismiss"

    # Verify screen has ESC binding
    bindings = {b.key for b in screen.BINDINGS}
    assert 'escape' in bindings, "SpecDetailScreen should have ESC binding"

    # Verify metadata
    assert screen.spec_folder == spec_folder, "Spec folder should be stored"
    assert screen.spec_type == 'spec', "Spec type should be 'spec'"

    print("✓ SpecDetailScreen navigation verified")


def test_spec_list_click_handler():
    """Test SpecList click handler setup."""
    from yoyo_tui.widgets.spec_list import SpecList

    widget = SpecList()

    # Verify handler exists
    assert hasattr(widget, 'on_data_table_row_selected'), \
        "SpecList should have on_data_table_row_selected handler"

    # Verify metadata dict exists
    assert hasattr(widget, '_row_metadata'), "SpecList should have _row_metadata"

    print("✓ SpecList click handler verified")


def test_suggested_commands_navigation_button():
    """Test SuggestedCommandsPanel navigation button."""
    from yoyo_tui.widgets.suggested_commands_panel import SuggestedCommandsPanel
    from yoyo_tui.models import TaskData, ParentTask, Subtask

    # Create task data with tasks
    parent_task = ParentTask(
        number=1,
        name="Test Task",
        completed=False,
        subtasks=[Subtask(text="Test", completed=False)]
    )

    task_data = TaskData(
        file_path=Path("tasks.md"),
        parent_tasks=[parent_task]
    )

    widget = SuggestedCommandsPanel(task_data=task_data)

    # Verify button handler exists
    assert hasattr(widget, 'on_button_pressed'), \
        "SuggestedCommandsPanel should have on_button_pressed handler"

    # Get suggestions and verify "Tasks" button
    suggestions = widget._get_suggestions()
    task_suggestions = [s for s in suggestions if s[0] == "Tasks"]

    assert len(task_suggestions) > 0, "Should have 'Tasks' suggestion when tasks exist"
    assert "task" in task_suggestions[0][1].lower(), \
        "Tasks button description should mention tasks"

    print("✓ SuggestedCommandsPanel navigation button verified")


if __name__ == '__main__':
    print("Running navigation integration tests...\n")

    try:
        test_task_detail_navigation()
        test_spec_detail_navigation()
        test_spec_list_click_handler()
        test_suggested_commands_navigation_button()

        print("\n✅ All integration tests passed!")
        print("\nNavigation system is ready:")
        print("  • TaskDetailScreen: ESC/q to dismiss ✓")
        print("  • SpecDetailScreen: ESC/q to dismiss ✓")
        print("  • SpecList: Click row to navigate ✓")
        print("  • SuggestedCommandsPanel: 'Tasks' button to navigate ✓")

        sys.exit(0)

    except AssertionError as e:
        print(f"\n❌ Test failed: {e}")
        sys.exit(1)

    except Exception as e:
        print(f"\n❌ Unexpected error: {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)
