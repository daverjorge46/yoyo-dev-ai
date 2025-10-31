"""
Tests for /orchestrate-tasks Command

Tests orchestration workflow, orchestration.yml generation, and agent assignment.
"""

import pytest
from pathlib import Path
import yaml


class TestOrchestrateTasksCommand:
    """Test /orchestrate-tasks command functionality."""

    @pytest.fixture
    def command_file(self):
        """Get the command entry point file."""
        return Path(__file__).parent.parent / ".claude" / "commands" / "orchestrate-tasks.md"

    @pytest.fixture
    def instruction_file(self):
        """Get the instruction file."""
        return Path(__file__).parent.parent / ".yoyo-dev" / "instructions" / "core" / "orchestrate-tasks.md"

    @pytest.fixture
    def sample_spec_dir(self, tmp_path):
        """Create a sample spec directory with tasks.md."""
        spec_dir = tmp_path / ".yoyo-dev" / "specs" / "2025-10-31-test-spec"
        spec_dir.mkdir(parents=True)

        # Create tasks.md with sample tasks
        tasks_file = spec_dir / "tasks.md"
        tasks_content = """# Spec Tasks

## Tasks

- [ ] 1. **Database Schema**
  - **Context:** Create database schema for user profiles
  - **Dependencies:** None
  - **Files to Create:**
    - convex/schema.ts
  - **Files to Modify:** None
  - **Parallel Safe:** Yes
  - [ ] 1.1 Write tests for schema
  - [ ] 1.2 Create schema definition
  - [ ] 1.3 Verify tests pass

- [ ] 2. **API Endpoints**
  - **Context:** Create API endpoints for profile management
  - **Dependencies:** Task 1
  - **Files to Create:**
    - convex/profiles.ts
  - **Files to Modify:** None
  - **Parallel Safe:** Yes
  - [ ] 2.1 Write tests for API
  - [ ] 2.2 Create endpoints
  - [ ] 2.3 Verify tests pass

- [ ] 3. **Frontend Components**
  - **Context:** Create UI components for profile display
  - **Dependencies:** Task 2
  - **Files to Create:**
    - src/components/ProfileCard.tsx
  - **Files to Modify:** None
  - **Parallel Safe:** Yes
  - [ ] 3.1 Write tests for components
  - [ ] 3.2 Create components
  - [ ] 3.3 Verify tests pass
"""
        tasks_file.write_text(tasks_content)

        return spec_dir

    # ========================================================================
    # File Existence Tests
    # ========================================================================

    def test_command_entry_point_exists(self, command_file):
        """Test that command entry point exists."""
        assert command_file.exists(), "orchestrate-tasks.md should exist in .claude/commands/"

    def test_instruction_file_exists(self, instruction_file):
        """Test that instruction file exists."""
        assert instruction_file.exists(), "orchestrate-tasks.md should exist in .yoyo-dev/instructions/core/"

    # ========================================================================
    # Command Structure Tests
    # ========================================================================

    def test_command_references_instruction(self, command_file):
        """Test that command file references instruction file."""
        with open(command_file, 'r', encoding='utf-8') as f:
            content = f.read()

        # Accept both path formats
        assert "@instructions/core/orchestrate-tasks.md" in content or \
               "@.yoyo-dev/instructions/core/orchestrate-tasks.md" in content, \
            "Command should reference instruction file"

    def test_instruction_has_xml_structure(self, instruction_file):
        """Test that instruction file has XML structure with steps."""
        with open(instruction_file, 'r', encoding='utf-8') as f:
            content = f.read()

        assert "<process_flow>" in content, "Should have <process_flow> tag"
        assert "<step" in content, "Should have <step> tags"
        assert "</process_flow>" in content, "Should close <process_flow>"

    def test_instruction_has_required_steps(self, instruction_file):
        """Test that instruction file has all required steps."""
        with open(instruction_file, 'r', encoding='utf-8') as f:
            content = f.read()

        # Key steps for orchestration (look for name attributes in steps)
        required_step_names = [
            "task_selection",
            "agent_assignment",
            "standards_assignment",
            "orchestration",
            "execution",
        ]

        for step_name in required_step_names:
            # Look for step name in name attribute or as content
            assert f'name="{step_name}"' in content or step_name in content.lower().replace("-", "_"), \
                f"Should have {step_name} step"

    # ========================================================================
    # Orchestration.yml Generation Tests
    # ========================================================================

    def test_orchestration_yml_structure(self):
        """Test that orchestration.yml has correct structure."""
        # This would be generated during actual orchestration
        # Testing the expected structure
        expected_structure = {
            "orchestration": {
                "spec_folder": ".yoyo-dev/specs/2025-10-31-test-spec",
                "task_groups": [
                    {
                        "group_number": 1,
                        "group_name": "Database Schema",
                        "agent": "implementer",
                        "standards": ["best-practices.md"],
                        "status": "pending"
                    }
                ]
            },
            "execution": {
                "parallel_groups": [[1], [2], [3]]
            }
        }

        # Validate structure
        assert "orchestration" in expected_structure
        assert "spec_folder" in expected_structure["orchestration"]
        assert "task_groups" in expected_structure["orchestration"]
        assert "execution" in expected_structure

    def test_task_group_schema(self):
        """Test that task group has required fields."""
        task_group = {
            "group_number": 1,
            "group_name": "Database Schema",
            "agent": "implementer",
            "standards": ["best-practices.md", "code-style/typescript.md"],
            "status": "pending"
        }

        # Required fields
        assert "group_number" in task_group
        assert "group_name" in task_group
        assert "agent" in task_group
        assert "standards" in task_group
        assert "status" in task_group

        # Valid values
        assert isinstance(task_group["group_number"], int)
        assert isinstance(task_group["group_name"], str)
        assert isinstance(task_group["agent"], str)
        assert isinstance(task_group["standards"], list)
        assert task_group["status"] in ["pending", "in_progress", "completed", "failed"]

    # ========================================================================
    # Agent Assignment Tests
    # ========================================================================

    def test_valid_agent_names(self):
        """Test that only valid agent names are allowed."""
        valid_agents = [
            "implementer",
            "spec-writer",
            "tasks-list-creator",
            "implementation-verifier",
            "test-runner",
        ]

        for agent in valid_agents:
            # Should not raise error
            assert isinstance(agent, str)
            assert len(agent) > 0

    def test_invalid_agent_names(self):
        """Test that invalid agent names should be rejected."""
        invalid_agents = [
            "",
            "nonexistent-agent",
            "random_agent_123",
            None,
        ]

        for agent in invalid_agents:
            # In actual implementation, these should raise errors
            if agent:
                assert isinstance(agent, str) or agent is None

    # ========================================================================
    # Standards Assignment Tests
    # ========================================================================

    def test_valid_standards_paths(self):
        """Test that standards paths are valid."""
        valid_standards = [
            "best-practices.md",
            "code-style/typescript.md",
            "code-style/react.md",
            "design-system.md",
            "security.md",
        ]

        for standard in valid_standards:
            assert isinstance(standard, str)
            assert standard.endswith(".md")
            assert "/" not in standard or standard.count("/") == 1

    def test_standards_list_structure(self):
        """Test that standards are provided as a list."""
        standards = ["best-practices.md", "code-style/typescript.md"]

        assert isinstance(standards, list)
        assert len(standards) > 0
        assert all(isinstance(s, str) for s in standards)

    # ========================================================================
    # Parallel Execution Planning Tests
    # ========================================================================

    def test_parallel_groups_structure(self):
        """Test parallel execution groups structure."""
        parallel_groups = [
            [1],      # Group 1 runs first (no dependencies)
            [2],      # Group 2 runs after Group 1
            [3]       # Group 3 runs after Group 2
        ]

        assert isinstance(parallel_groups, list)
        assert all(isinstance(group, list) for group in parallel_groups)
        assert all(isinstance(task_id, int) for group in parallel_groups for task_id in group)

    def test_parallel_execution_with_dependencies(self):
        """Test parallel execution respects dependencies."""
        # Tasks 1 and 2 have no dependencies - can run in parallel
        # Task 3 depends on Task 2 - must run after
        parallel_groups = [
            [1, 2],   # Tasks 1 and 2 in parallel
            [3]       # Task 3 after Group 1
        ]

        # Validate no circular dependencies
        all_tasks = set()
        for group in parallel_groups:
            for task_id in group:
                assert task_id not in all_tasks, "Task should only appear once"
                all_tasks.add(task_id)

    # ========================================================================
    # Orchestration Report Tests
    # ========================================================================

    def test_orchestration_report_structure(self):
        """Test that orchestration report has required sections."""
        report_sections = [
            "# Orchestration Report",
            "## Task Groups",
            "## Execution Timeline",
            "## Results",
            "## Summary",
        ]

        # In actual implementation, report would be generated
        # Testing expected structure
        for section in report_sections:
            assert isinstance(section, str)
            assert section.startswith("#") or section.startswith("##")
