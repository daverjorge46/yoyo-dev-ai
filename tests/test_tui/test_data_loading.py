"""
Tests for TUI Data Loading Functionality.

This test suite verifies that the TUI correctly loads and displays real data
from the project's .yoyo-dev directory, including:
- Tasks from tasks.md or specs
- Specifications from .yoyo-dev/specs/
- Progress data calculation
- Widget data population

These tests follow TDD principles - they define expected behavior before implementation.
EXPECTED: All tests should FAIL initially (red phase), then pass after implementation (green phase).
"""

import pytest
from pathlib import Path
from lib.yoyo_tui.services.task_parser import TaskParser
from lib.yoyo_tui.screens.main import MainScreen
from lib.yoyo_tui.widgets.task_tree import TaskTree
from lib.yoyo_tui.widgets.progress_panel import ProgressPanel
from lib.yoyo_tui.widgets.spec_list import SpecList
from lib.yoyo_tui.models import TaskData, ParentTask, Subtask


class TestTaskParserProjectDiscovery:
    """Test TaskParser's ability to find and load tasks.md from current project."""

    def test_find_tasks_in_current_directory(self, tmp_path, monkeypatch):
        """
        Test that TaskParser finds tasks.md in current working directory.

        Expected: TaskParser should discover tasks.md in cwd
        Actual: TaskParser.parse() requires explicit path (no auto-discovery)

        FAIL: TaskParser doesn't have a find_tasks() method yet
        """
        # Create a mock project with tasks.md
        monkeypatch.chdir(tmp_path)
        tasks_file = tmp_path / "tasks.md"
        tasks_file.write_text("""
## Task 1: Feature implementation

- [x] 1.1 Write tests
- [ ] 1.2 Implement feature
- [ ] 1.3 Verify tests pass
""")

        # Expected: TaskParser.find_tasks() should auto-discover tasks.md
        # Actual: This method doesn't exist yet
        from lib.yoyo_tui.services.task_parser import TaskParser

        task_data = TaskParser.find_and_parse_tasks()

        assert task_data is not None, "Should find tasks.md in current directory"
        assert task_data.total_tasks == 1
        assert task_data.total_subtasks == 3
        assert task_data.completed_subtasks == 1
        assert task_data.file_path == tasks_file

    def test_find_tasks_in_spec_directory(self, tmp_path, monkeypatch):
        """
        Test that TaskParser finds tasks.md in active spec directory.

        Expected: Should check .yoyo-dev/specs/**/tasks.md and find most recent
        Actual: No logic for spec discovery exists

        FAIL: No find_tasks_in_specs() method
        """
        monkeypatch.chdir(tmp_path)

        # Create spec structure
        spec_dir = tmp_path / ".yoyo-dev" / "specs" / "2025-10-17-feature-x"
        spec_dir.mkdir(parents=True)
        tasks_file = spec_dir / "tasks.md"
        tasks_file.write_text("""
## Task 1: Implement feature X

- [x] 1.1 Write tests
- [x] 1.2 Implement
- [ ] 1.3 Deploy
""")

        # Expected: TaskParser should find most recent spec's tasks.md
        from lib.yoyo_tui.services.task_parser import TaskParser

        task_data = TaskParser.find_and_parse_tasks()

        assert task_data is not None, "Should find tasks.md in spec directory"
        assert task_data.total_tasks == 1
        assert task_data.completed_subtasks == 2
        assert task_data.file_path == tasks_file

    def test_find_tasks_prefers_cwd_over_specs(self, tmp_path, monkeypatch):
        """
        Test that tasks.md in cwd takes precedence over spec tasks.

        Expected: If both cwd/tasks.md and spec/tasks.md exist, prefer cwd
        Actual: No priority logic exists

        FAIL: No preference logic implemented
        """
        monkeypatch.chdir(tmp_path)

        # Create tasks.md in cwd
        cwd_tasks = tmp_path / "tasks.md"
        cwd_tasks.write_text("""
## Task 1: CWD task

- [ ] 1.1 Task in cwd
""")

        # Create tasks.md in spec
        spec_dir = tmp_path / ".yoyo-dev" / "specs" / "2025-10-17-feature"
        spec_dir.mkdir(parents=True)
        spec_tasks = spec_dir / "tasks.md"
        spec_tasks.write_text("""
## Task 1: Spec task

- [ ] 1.1 Task in spec
""")

        # Expected: Should prefer cwd tasks.md
        from lib.yoyo_tui.services.task_parser import TaskParser

        task_data = TaskParser.find_and_parse_tasks()

        assert task_data.file_path == cwd_tasks, "Should prefer tasks.md in cwd"

    def test_return_empty_when_no_tasks_found(self, tmp_path, monkeypatch):
        """
        Test that TaskParser returns empty TaskData when no tasks.md found.

        Expected: Return TaskData.empty() gracefully
        Actual: Method doesn't exist yet

        FAIL: No find_and_parse_tasks() method
        """
        monkeypatch.chdir(tmp_path)
        # No tasks.md anywhere

        from lib.yoyo_tui.services.task_parser import TaskParser

        task_data = TaskParser.find_and_parse_tasks()

        assert task_data == TaskData.empty()


class TestMainScreenDataLoading:
    """Test MainScreen's ability to load and pass real data to widgets."""

    def test_mainscreen_loads_real_task_data_on_mount(self, tmp_path, monkeypatch):
        """
        Test that MainScreen loads real TaskData on mount (not empty).

        Expected: on_mount() should discover and load tasks.md automatically
        Actual: MainScreen passes TaskData.empty() to widgets

        FAIL: MainScreen.on_mount() doesn't load data yet
        """
        monkeypatch.chdir(tmp_path)

        # Create tasks.md
        tasks_file = tmp_path / "tasks.md"
        tasks_file.write_text("""
## Task 1: Build feature

- [x] 1.1 Write tests
- [ ] 1.2 Implement
""")

        from lib.yoyo_tui.app import YoyoDevApp

        # Create app and get MainScreen
        app = YoyoDevApp()
        screen = MainScreen()

        # Simulate mount
        screen.on_mount()

        # Expected: MainScreen should have loaded real task data
        # Actual: No data loading happens in on_mount() yet
        assert hasattr(screen, 'task_data'), "MainScreen should have task_data attribute"
        assert screen.task_data != TaskData.empty(), "Should load real data, not empty"
        assert screen.task_data.total_tasks == 1
        assert screen.task_data.total_subtasks == 2

    def test_mainscreen_passes_data_to_task_tree_widget(self, tmp_path, monkeypatch):
        """
        Test that MainScreen passes loaded TaskData to TaskTree widget.

        Expected: TaskTree widget receives real TaskData, not empty
        Actual: TaskTree initialized with TaskData.empty()

        FAIL: MainScreen doesn't update widgets after loading data
        """
        monkeypatch.chdir(tmp_path)

        # Create tasks.md
        tasks_file = tmp_path / "tasks.md"
        tasks_file.write_text("""
## Task 1: Feature A

- [x] 1.1 Done
- [ ] 1.2 Todo

## Task 2: Feature B

- [ ] 2.1 Todo
""")

        from lib.yoyo_tui.app import YoyoDevApp

        app = YoyoDevApp()
        screen = MainScreen()
        screen.on_mount()

        # Get TaskTree widget
        task_tree = screen.query_one(TaskTree)

        # Expected: TaskTree should have real data
        # Actual: TaskTree still has empty data
        assert task_tree.task_data != TaskData.empty(), "TaskTree should receive real data"
        assert task_tree.task_data.total_tasks == 2
        assert len(task_tree.task_data.parent_tasks) == 2

    def test_mainscreen_passes_data_to_progress_panel_widget(self, tmp_path, monkeypatch):
        """
        Test that MainScreen passes loaded TaskData to ProgressPanel widget.

        Expected: ProgressPanel widget receives real TaskData with progress
        Actual: ProgressPanel initialized with empty TaskData

        FAIL: ProgressPanel doesn't receive loaded data
        """
        monkeypatch.chdir(tmp_path)

        # Create tasks.md with partial progress
        tasks_file = tmp_path / "tasks.md"
        tasks_file.write_text("""
## Task 1: Feature implementation

- [x] 1.1 Write tests
- [x] 1.2 Implement
- [ ] 1.3 Deploy
- [ ] 1.4 Verify
""")

        from lib.yoyo_tui.app import YoyoDevApp

        app = YoyoDevApp()
        screen = MainScreen()
        screen.on_mount()

        # Get ProgressPanel widget
        progress_panel = screen.query_one(ProgressPanel)

        # Expected: ProgressPanel should show 50% progress (2/4 complete)
        # Actual: ProgressPanel shows 0% (empty data)
        assert progress_panel.task_data != TaskData.empty(), "ProgressPanel should receive real data"
        assert progress_panel.task_data.total_subtasks == 4
        assert progress_panel.task_data.completed_subtasks == 2
        assert progress_panel.task_data.progress == 50


class TestTaskTreeDataDisplay:
    """Test TaskTree widget's ability to display loaded task data."""

    def test_task_tree_displays_parent_tasks(self, tmp_path):
        """
        Test that TaskTree displays parent tasks from loaded TaskData.

        Expected: Tree should show parent task nodes
        Actual: Tree shows "No tasks available" because data is empty

        FAIL: TaskTree receives empty data from MainScreen
        """
        # Create TaskData with parent tasks
        task_data = TaskData(
            file_path=tmp_path / "tasks.md",
            parent_tasks=[
                ParentTask(number=1, name="Feature A", completed=False, subtasks=[
                    Subtask(text="1.1 Test", completed=True),
                    Subtask(text="1.2 Implement", completed=False)
                ]),
                ParentTask(number=2, name="Feature B", completed=True, subtasks=[
                    Subtask(text="2.1 Test", completed=True),
                    Subtask(text="2.2 Implement", completed=True)
                ])
            ],
            total_tasks=2,
            completed_tasks=1,
            total_subtasks=4,
            completed_subtasks=3,
            progress=75
        )

        # Create TaskTree with real data
        task_tree = TaskTree(task_data=task_data)

        # Expected: Task tree should have 2 parent tasks
        # Actual: Would show "No tasks available" if data was empty
        assert task_tree.task_data.total_tasks == 2
        assert len(task_tree.task_data.parent_tasks) == 2
        assert task_tree.task_data.parent_tasks[0].name == "Feature A"
        assert task_tree.task_data.parent_tasks[1].name == "Feature B"

    def test_task_tree_displays_subtasks(self, tmp_path):
        """
        Test that TaskTree displays subtasks under parent tasks.

        Expected: Tree should show subtask nodes under each parent
        Actual: Subtasks not rendered when data is empty

        FAIL: TaskTree receives empty data
        """
        # Create TaskData with subtasks
        task_data = TaskData(
            file_path=tmp_path / "tasks.md",
            parent_tasks=[
                ParentTask(number=1, name="Build API", completed=False, subtasks=[
                    Subtask(text="1.1 Write tests for endpoints", completed=True),
                    Subtask(text="1.2 Implement GET /users", completed=True),
                    Subtask(text="1.3 Implement POST /users", completed=False),
                    Subtask(text="1.4 Add validation", completed=False)
                ])
            ],
            total_tasks=1,
            completed_tasks=0,
            total_subtasks=4,
            completed_subtasks=2,
            progress=50
        )

        task_tree = TaskTree(task_data=task_data)

        # Expected: Should show all 4 subtasks
        parent = task_tree.task_data.parent_tasks[0]
        assert len(parent.subtasks) == 4
        assert parent.subtasks[0].text == "1.1 Write tests for endpoints"
        assert parent.subtasks[0].completed is True
        assert parent.subtasks[2].completed is False

    def test_task_tree_shows_completion_indicators(self, tmp_path):
        """
        Test that TaskTree shows correct completion indicators (✓/○ for parents, [x]/[ ] for subtasks).

        Expected: Completed tasks marked with ✓, incomplete with ○
        Actual: Indicators not shown when no data loaded

        FAIL: Empty data means no indicators displayed
        """
        task_data = TaskData(
            file_path=tmp_path / "tasks.md",
            parent_tasks=[
                ParentTask(number=1, name="Completed Task", completed=True, subtasks=[
                    Subtask(text="1.1 Done", completed=True)
                ]),
                ParentTask(number=2, name="Incomplete Task", completed=False, subtasks=[
                    Subtask(text="2.1 Todo", completed=False)
                ])
            ],
            total_tasks=2,
            completed_tasks=1,
            total_subtasks=2,
            completed_subtasks=1,
            progress=50
        )

        task_tree = TaskTree(task_data=task_data)

        # Verify completion status is preserved
        assert task_tree.task_data.parent_tasks[0].completed is True
        assert task_tree.task_data.parent_tasks[1].completed is False
        assert task_tree.task_data.parent_tasks[0].subtasks[0].completed is True
        assert task_tree.task_data.parent_tasks[1].subtasks[0].completed is False


class TestProgressPanelDataDisplay:
    """Test ProgressPanel widget's ability to display progress data."""

    def test_progress_panel_displays_task_progress(self, tmp_path):
        """
        Test that ProgressPanel displays correct task completion percentage.

        Expected: Should show "2/3 tasks complete (66%)"
        Actual: Shows "0/0 tasks complete (0%)" with empty data

        FAIL: ProgressPanel receives empty TaskData
        """
        task_data = TaskData(
            file_path=tmp_path / "tasks.md",
            parent_tasks=[
                ParentTask(number=1, name="Task 1", completed=True),
                ParentTask(number=2, name="Task 2", completed=True),
                ParentTask(number=3, name="Task 3", completed=False)
            ],
            total_tasks=3,
            completed_tasks=2,
            total_subtasks=0,
            completed_subtasks=0,
            progress=66
        )

        progress_panel = ProgressPanel(task_data=task_data)

        # Expected: Should calculate correct percentages
        assert progress_panel._calculate_task_progress() == pytest.approx(66.67, rel=1e-1)
        assert progress_panel.task_data.total_tasks == 3
        assert progress_panel.task_data.completed_tasks == 2

    def test_progress_panel_displays_subtask_progress(self, tmp_path):
        """
        Test that ProgressPanel displays correct subtask completion percentage.

        Expected: Should show "7/10 subtasks complete (70%)"
        Actual: Shows "0/0 subtasks complete (0%)" with empty data

        FAIL: ProgressPanel receives empty TaskData
        """
        task_data = TaskData(
            file_path=tmp_path / "tasks.md",
            parent_tasks=[
                ParentTask(number=1, name="Task 1", completed=False, subtasks=[
                    Subtask(text="1.1", completed=True),
                    Subtask(text="1.2", completed=True),
                    Subtask(text="1.3", completed=True)
                ]),
                ParentTask(number=2, name="Task 2", completed=False, subtasks=[
                    Subtask(text="2.1", completed=True),
                    Subtask(text="2.2", completed=True),
                    Subtask(text="2.3", completed=True),
                    Subtask(text="2.4", completed=True)
                ]),
                ParentTask(number=3, name="Task 3", completed=False, subtasks=[
                    Subtask(text="3.1", completed=False),
                    Subtask(text="3.2", completed=False),
                    Subtask(text="3.3", completed=False)
                ])
            ],
            total_tasks=3,
            completed_tasks=0,
            total_subtasks=10,
            completed_subtasks=7,
            progress=70
        )

        progress_panel = ProgressPanel(task_data=task_data)

        # Expected: Should calculate correct subtask percentages
        assert progress_panel._calculate_subtask_progress() == pytest.approx(70.0, rel=1e-1)
        assert progress_panel.task_data.total_subtasks == 10
        assert progress_panel.task_data.completed_subtasks == 7

    def test_progress_panel_displays_zero_progress_when_no_tasks(self, tmp_path):
        """
        Test that ProgressPanel gracefully handles empty task data.

        Expected: Should show "0/0 tasks (0%)" without crashing
        Actual: This currently works, but verifying it continues to work

        PASS: This should pass (testing graceful degradation)
        """
        task_data = TaskData.empty()

        progress_panel = ProgressPanel(task_data=task_data)

        # Should handle empty data gracefully
        assert progress_panel._calculate_task_progress() == 0.0
        assert progress_panel._calculate_subtask_progress() == 0.0


class TestSpecListDataDisplay:
    """Test SpecList widget's ability to display specs from .yoyo-dev/specs/."""

    def test_spec_list_loads_specs_from_directory(self, tmp_path):
        """
        Test that SpecList discovers and loads specs from .yoyo-dev/specs/.

        Expected: Should find all spec directories and display them
        Actual: SpecList._load_specs() returns empty list if no state.json

        FAIL: SpecList might not find specs without proper directory structure
        """
        # Create spec directories
        yoyo_dev = tmp_path / ".yoyo-dev"
        specs_dir = yoyo_dev / "specs"
        specs_dir.mkdir(parents=True)

        # Create spec folders
        spec1 = specs_dir / "2025-10-15-feature-a"
        spec1.mkdir()
        (spec1 / "spec.md").write_text("# Feature A")

        spec2 = specs_dir / "2025-10-16-feature-b"
        spec2.mkdir()
        (spec2 / "spec.md").write_text("# Feature B")

        spec3 = specs_dir / "2025-10-17-feature-c"
        spec3.mkdir()
        (spec3 / "spec.md").write_text("# Feature C")

        # Create SpecList pointing to this directory
        spec_list = SpecList(yoyo_dev_path=yoyo_dev)

        # Expected: Should find all 3 specs
        specs = spec_list._load_specs()

        assert len(specs) >= 3, "Should find all 3 spec directories"
        assert any(s['name'] == "2025-10-15-feature-a" for s in specs)
        assert any(s['name'] == "2025-10-16-feature-b" for s in specs)
        assert any(s['name'] == "2025-10-17-feature-c" for s in specs)

    def test_spec_list_loads_fixes_from_directory(self, tmp_path):
        """
        Test that SpecList discovers and loads fixes from .yoyo-dev/fixes/.

        Expected: Should find all fix directories and display them
        Actual: SpecList._load_fixes() returns empty list if no state.json

        FAIL: SpecList might not find fixes without proper directory structure
        """
        # Create fix directories
        yoyo_dev = tmp_path / ".yoyo-dev"
        fixes_dir = yoyo_dev / "fixes"
        fixes_dir.mkdir(parents=True)

        # Create fix folders
        fix1 = fixes_dir / "2025-10-15-bug-fix-a"
        fix1.mkdir()
        (fix1 / "analysis.md").write_text("# Bug Fix A")

        fix2 = fixes_dir / "2025-10-17-performance-fix"
        fix2.mkdir()
        (fix2 / "analysis.md").write_text("# Performance Fix")

        # Create SpecList pointing to this directory
        spec_list = SpecList(yoyo_dev_path=yoyo_dev)

        # Expected: Should find all 2 fixes
        fixes = spec_list._load_fixes()

        assert len(fixes) >= 2, "Should find all 2 fix directories"
        assert any(f['name'] == "2025-10-15-bug-fix-a" for f in fixes)
        assert any(f['name'] == "2025-10-17-performance-fix" for f in fixes)

    def test_spec_list_reads_state_json_for_progress(self, tmp_path):
        """
        Test that SpecList reads state.json to determine spec/fix progress.

        Expected: Should parse state.json and calculate progress percentage
        Actual: Logic exists but might not work correctly

        PARTIAL: Tests if state.json parsing works as expected
        """
        import json

        # Create spec with state.json
        yoyo_dev = tmp_path / ".yoyo-dev"
        specs_dir = yoyo_dev / "specs"
        specs_dir.mkdir(parents=True)

        spec_dir = specs_dir / "2025-10-17-feature-x"
        spec_dir.mkdir()

        # Create state.json with progress
        state = {
            "execution_started": True,
            "execution_completed": False,
            "completed_tasks": ["task1", "task2", "task3"],
            "current_task": "task4"
        }
        (spec_dir / "state.json").write_text(json.dumps(state))

        # Create SpecList
        spec_list = SpecList(yoyo_dev_path=yoyo_dev)

        # Expected: Should calculate progress from completed_tasks
        specs = spec_list._load_specs()

        assert len(specs) >= 1
        spec = next(s for s in specs if s['name'] == "2025-10-17-feature-x")
        assert spec['progress'] > 0, "Should calculate progress from state.json"
        assert spec['status'] == "In Progress", "Should detect in-progress status"

    def test_spec_list_handles_missing_state_json_gracefully(self, tmp_path):
        """
        Test that SpecList handles specs without state.json gracefully.

        Expected: Should show "Not Started" status and 0% progress
        Actual: Should work, but verifying graceful handling

        PASS: This should pass (testing graceful degradation)
        """
        # Create spec without state.json
        yoyo_dev = tmp_path / ".yoyo-dev"
        specs_dir = yoyo_dev / "specs"
        specs_dir.mkdir(parents=True)

        spec_dir = specs_dir / "2025-10-17-new-spec"
        spec_dir.mkdir()
        (spec_dir / "spec.md").write_text("# New Spec")
        # No state.json

        # Create SpecList
        spec_list = SpecList(yoyo_dev_path=yoyo_dev)

        # Expected: Should handle gracefully
        specs = spec_list._load_specs()

        assert len(specs) >= 1
        spec = next(s for s in specs if s['name'] == "2025-10-17-new-spec")
        assert spec['progress'] == 0, "Should default to 0% progress"
        assert spec['status'] == "Not Started", "Should default to 'Not Started'"


class TestDataLoadingIntegration:
    """Integration tests for complete data loading workflow."""

    def test_end_to_end_data_loading(self, tmp_path, monkeypatch):
        """
        Test complete end-to-end data loading workflow.

        Expected: TUI should discover tasks, load data, and populate all widgets
        Actual: TUI shows empty state because data loading not implemented

        FAIL: This is the main integration test - should fail until everything works
        """
        monkeypatch.chdir(tmp_path)

        # Create complete project structure
        yoyo_dev = tmp_path / ".yoyo-dev"
        specs_dir = yoyo_dev / "specs"
        specs_dir.mkdir(parents=True)

        # Create tasks.md in cwd
        tasks_file = tmp_path / "tasks.md"
        tasks_file.write_text("""
## Task 1: Build User Authentication

- [x] 1.1 Write tests for auth service
- [x] 1.2 Implement JWT token generation
- [ ] 1.3 Add password hashing
- [ ] 1.4 Create login endpoint
- [ ] 1.5 Add session management

## Task 2: Build User Profile Page

- [ ] 2.1 Write tests for profile component
- [ ] 2.2 Create profile UI
- [ ] 2.3 Add profile editing
""")

        # Create spec
        spec_dir = specs_dir / "2025-10-17-user-system"
        spec_dir.mkdir()
        (spec_dir / "spec.md").write_text("# User System")

        # Create app and screen
        from lib.yoyo_tui.app import YoyoDevApp

        app = YoyoDevApp()
        screen = MainScreen()

        # Simulate mounting
        screen.on_mount()

        # Expected: All widgets should have loaded data
        # Actual: All widgets still have empty data

        # Verify TaskTree has data
        task_tree = screen.query_one(TaskTree)
        assert task_tree.task_data != TaskData.empty(), "TaskTree should have loaded data"
        assert task_tree.task_data.total_tasks == 2, "Should load both parent tasks"
        assert task_tree.task_data.total_subtasks == 8, "Should load all subtasks"

        # Verify ProgressPanel has data
        progress_panel = screen.query_one(ProgressPanel)
        assert progress_panel.task_data != TaskData.empty(), "ProgressPanel should have loaded data"
        assert progress_panel.task_data.completed_subtasks == 2, "Should show 2 completed subtasks"
        assert progress_panel.task_data.progress == 25, "Should calculate 25% progress (2/8)"

        # Verify SpecList has data
        spec_list = screen.query_one(SpecList)
        specs = spec_list._load_specs()
        assert len(specs) >= 1, "SpecList should find spec directory"
        assert any(s['name'] == "2025-10-17-user-system" for s in specs)
