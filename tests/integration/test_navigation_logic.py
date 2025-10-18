#!/usr/bin/env python3
"""
Unit tests for navigation logic (non-interactive).

Verifies:
1. SpecList stores metadata correctly
2. SuggestedCommandsPanel creates "Tasks" button when tasks exist
3. Button handlers have correct navigation logic
"""

import sys
from pathlib import Path

# Add lib to path
sys.path.insert(0, str(Path(__file__).parent / 'lib'))

def test_spec_list_metadata():
    """Test that SpecList populates metadata correctly."""
    from yoyo_tui.widgets.spec_list import SpecList

    # Create widget
    widget = SpecList()

    # Verify metadata dict exists
    assert hasattr(widget, '_row_metadata'), "SpecList should have _row_metadata attribute"
    assert isinstance(widget._row_metadata, dict), "_row_metadata should be a dict"

    print("✓ SpecList metadata structure verified")


def test_suggested_commands_button_creation():
    """Test that SuggestedCommandsPanel creates proper button suggestions."""
    from yoyo_tui.widgets.suggested_commands_panel import SuggestedCommandsPanel
    from yoyo_tui.models import TaskData, ParentTask, Subtask

    # Create task data with incomplete tasks
    parent_task = ParentTask(
        number=1,
        name="Test Task",
        completed=False,
        subtasks=[
            Subtask(text="Subtask 1", completed=False)
        ]
    )

    task_data = TaskData(
        file_path=Path("tasks.md"),
        parent_tasks=[parent_task]
    )

    # Create widget
    widget = SuggestedCommandsPanel(task_data=task_data)

    # Get suggestions
    suggestions = widget._get_suggestions()

    # Verify "Tasks" button is suggested when tasks exist
    task_button_found = False
    for cmd, desc, shortcut in suggestions:
        if cmd == "Tasks":
            task_button_found = True
            assert "task" in desc.lower(), "Tasks button description should mention tasks"
            break

    assert task_button_found, "Tasks button should be in suggestions when tasks exist"

    print("✓ SuggestedCommandsPanel creates 'Tasks' button correctly")


def test_navigation_button_logic():
    """Test that button logic distinguishes navigation vs execution."""
    from yoyo_tui.widgets.suggested_commands_panel import SuggestedCommandsPanel

    widget = SuggestedCommandsPanel()
    suggestions = widget._get_suggestions()

    # Check that "Tasks" and Yoyo Dev commands are handled
    for cmd, desc, shortcut in suggestions[:5]:
        # Should create button for "/" commands or "Tasks"
        should_create_button = cmd.startswith("/") or cmd == "Tasks"

        # Non-button items start with "Press"
        is_hint = cmd.startswith("Press")

        # One or the other should be true
        assert should_create_button or is_hint, f"Command '{cmd}' should either be a button or hint"

    print("✓ Button creation logic verified")


if __name__ == '__main__':
    print("Testing navigation logic...\n")

    try:
        test_spec_list_metadata()
        test_suggested_commands_button_creation()
        test_navigation_button_logic()

        print("\n✅ All navigation tests passed!")
        sys.exit(0)

    except AssertionError as e:
        print(f"\n❌ Test failed: {e}")
        sys.exit(1)

    except Exception as e:
        print(f"\n❌ Unexpected error: {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)
