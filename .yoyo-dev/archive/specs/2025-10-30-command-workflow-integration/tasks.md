# Spec Tasks

These are the tasks to be completed for the spec detailed in @.yoyo-dev/specs/2025-10-30-command-workflow-integration/spec.md

> Created: 2025-10-31
> Status: Ready for Implementation

## Tasks

- [ ] 1. **Fix TUI Dashboard Issues (Already Completed)**
  - **Context:** Users reported keyboard shortcuts not working and tech stack display too verbose. This was blocking TUI usability.
  - **Dependencies:** None
  - **Files to Create:**
    - lib/yoyo_tui_v3/screens/help_screen.py
    - lib/yoyo_tui_v3/screens/commands_screen.py
    - lib/yoyo_tui_v3/screens/git_screen.py
    - lib/yoyo_tui_v3/screens/tasks_screen.py
    - lib/yoyo_tui_v3/screens/specs_screen.py
    - lib/yoyo_tui_v3/screens/history_screen.py
  - **Files to Modify:**
    - lib/yoyo_tui_v3/widgets/project_overview.py
    - lib/yoyo_tui_v3/screens/main_dashboard.py
  - **Parallel Safe:** N/A (already completed)
  - [x] 1.1 Investigate keyboard shortcuts not working
  - [x] 1.2 Create modal screens for Help, Commands, Git, Tasks, Specs, History
  - [x] 1.3 Update action methods in main_dashboard.py
  - [x] 1.4 Fix Tech Stack display to show only 5 main technologies
  - [x] 1.5 Test all keyboard shortcuts
  - [x] 1.6 Verify fixes work correctly

- [x] 2. **Create Workflow Reference System**
  - **Context:** Enable agents to reference reusable workflow files using `{{workflows/*}}` syntax. This is the foundation for modular workflows.
  - **Dependencies:** None
  - **Files to Create:**
    - lib/yoyo_workflow_expander.py (workflow expansion logic)
    - tests/test_workflow_expander.py
  - **Files to Modify:**
    - .yoyo-dev/claude-code/agents/* (add workflow references)
  - **Parallel Safe:** Yes
  - [x] 2.1 Write tests for workflow expansion logic
  - [x] 2.2 Create workflow expander module with reference parsing
  - [x] 2.3 Implement nested workflow expansion (max 3 levels)
  - [x] 2.4 Add cycle detection to prevent infinite loops
  - [x] 2.5 Test with sample agent files
  - [x] 2.6 Verify all tests pass

- [x] 3. **Add 7 New Specialized Agents**
  - **Context:** New agents provide modular, reusable components for spec creation, implementation, and verification workflows.
  - **Dependencies:** Task 2 (workflow reference system)
  - **Files to Create:**
    - .yoyo-dev/claude-code/agents/spec-initializer.md
    - .yoyo-dev/claude-code/agents/spec-shaper.md
    - .yoyo-dev/claude-code/agents/spec-writer.md
    - .yoyo-dev/claude-code/agents/tasks-list-creator.md
    - .yoyo-dev/claude-code/agents/implementer.md
    - .yoyo-dev/claude-code/agents/implementation-verifier.md
    - .yoyo-dev/claude-code/agents/product-planner.md
    - tests/test_new_agents.py
  - **Files to Modify:**
    - .yoyo-dev/config.yml (register new agents)
  - **Parallel Safe:** Yes (after Task 2)
  - [x] 3.1 Write tests for agent registration
  - [x] 3.2 Create spec-initializer agent with YAML frontmatter
  - [x] 3.3 Create spec-shaper agent with workflow references
  - [x] 3.4 Create spec-writer agent with workflow references
  - [x] 3.5 Create tasks-list-creator agent
  - [x] 3.6 Create implementer agent with workflow references
  - [x] 3.7 Create implementation-verifier agent
  - [x] 3.8 Create product-planner agent with workflow references
  - [x] 3.9 Register all agents in config.yml
  - [x] 3.10 Verify all tests pass

- [x] 4. **Create `/orchestrate-tasks` Command**
  - **Context:** Advanced orchestration for complex scenarios where users need manual control over agent assignment and standards per task group.
  - **Dependencies:** Task 3 (new agents)
  - **Files to Create:**
    - .claude/commands/orchestrate-tasks.md
    - .yoyo-dev/instructions/core/orchestrate-tasks.md
    - tests/test_orchestrate_tasks.py
  - **Files to Modify:** None
  - **Parallel Safe:** Yes (after Task 3)
  - [x] 4.1 Write tests for orchestration workflow
  - [x] 4.2 Create command entry point
  - [x] 4.3 Create instruction file with XML structure
  - [x] 4.4 Implement task group selection logic
  - [x] 4.5 Implement agent assignment per group
  - [x] 4.6 Implement standards assignment per group
  - [x] 4.7 Create orchestration.yml generation
  - [x] 4.8 Add orchestration report generation
  - [x] 4.9 Verify all tests pass

- [x] 5. **Create `/improve-skills` Command**
  - **Context:** Optimize Claude Code Skills for better discoverability and triggering reliability.
  - **Dependencies:** None
  - **Files to Create:**
    - .claude/commands/improve-skills.md
    - .yoyo-dev/instructions/core/improve-skills.md
    - tests/test_improve_skills.py
  - **Files to Modify:** None
  - **Parallel Safe:** Yes
  - [x] 5.1 Write tests for skills optimization
  - [x] 5.2 Create command entry point
  - [x] 5.3 Create instruction file with XML structure
  - [x] 5.4 Implement .claude/skills/ directory scanning
  - [x] 5.5 Implement skill description analysis and rewriting
  - [x] 5.6 Add "When to use this skill" section generation
  - [x] 5.7 Create optimization report
  - [x] 5.8 Add user review and approval flow
  - [x] 5.9 Verify all tests pass

- [x] 6. **Add Implementation Tracking (Optional Feature)**
  - **Context:** Add --implementation-reports flag to /execute-tasks for detailed per-task-group reports.
  - **Dependencies:** None
  - **Files to Create:**
    - lib/yoyo_implementation_reporter.py
    - tests/test_implementation_reporter.py
  - **Files to Modify:**
    - .yoyo-dev/instructions/core/execute-tasks.md (add flag support)
  - **Parallel Safe:** Yes
  - [x] 6.1 Write tests for implementation reporter
  - [x] 6.2 Create implementation reporter module
  - [x] 6.3 Add --implementation-reports flag handling
  - [x] 6.4 Implement implementation/ folder creation
  - [x] 6.5 Create per-task-group report template
  - [x] 6.6 Add report generation logic
  - [x] 6.7 Verify all tests pass

- [x] 7. **Add Verification Workflows**
  - **Context:** Systematic verification before marking tasks complete, integrated into post-execution phase.
  - **Dependencies:** Task 2 (workflow reference system)
  - **Files to Create:**
    - workflows/implementation/verification/verify-functionality.md
    - workflows/implementation/verification/verify-tests.md
    - workflows/implementation/verification/verify-accessibility.md
    - workflows/implementation/verification/verify-performance.md
    - workflows/implementation/verification/verify-security.md
    - workflows/implementation/verification/verify-documentation.md
    - tests/test_verification_workflows.py
  - **Files to Modify:**
    - .yoyo-dev/instructions/core/post-execution-tasks.md
    - .yoyo-dev/claude-code/agents/implementation-verifier.md
  - **Parallel Safe:** Yes (after Task 2)
  - [x] 7.1 Write tests for verification workflows
  - [x] 7.2 Create verify-functionality workflow
  - [x] 7.3 Create verify-tests workflow
  - [x] 7.4 Create verify-accessibility workflow
  - [x] 7.5 Create verify-performance workflow
  - [x] 7.6 Create verify-security workflow
  - [x] 7.7 Create verify-documentation workflow
  - [x] 7.8 Integrate into post-execution-tasks.md
  - [x] 7.9 Update implementation-verifier agent
  - [x] 7.10 Verify all tests pass

- [x] 8. **Update Configuration and Documentation**
  - **Context:** Update config.yml with new options and CLAUDE.md with comprehensive documentation for all new features.
  - **Dependencies:** Tasks 2-7 (all features complete)
  - **Files to Create:** None
  - **Files to Modify:**
    - .yoyo-dev/config.yml
    - CLAUDE.md
  - **Parallel Safe:** No (depends on all previous tasks)
  - [x] 8.1 Add multi-agent section to config.yml
  - [x] 8.2 Add workflows section to config.yml
  - [x] 8.3 Add agents configuration to config.yml
  - [x] 8.4 Add skills optimization section to config.yml
  - [x] 8.5 Update CLAUDE.md with "Advanced Orchestration" section
  - [x] 8.6 Update CLAUDE.md with "Workflow System" section
  - [x] 8.7 Add workflow reference syntax examples
  - [x] 8.8 Add when to use /execute-tasks vs /orchestrate-tasks guidance
  - [x] 8.9 Create workflow composition examples

- [x] 9. **Integration Testing and Bug Fixes**
  - **Context:** Comprehensive testing to ensure all features work together without regressions.
  - **Dependencies:** Task 8 (all features complete and documented)
  - **Files to Create:**
    - tests/integration/test_workflow_system.py
    - tests/integration/test_new_commands.py
    - tests/integration/test_agent_integration.py
  - **Files to Modify:** None
  - **Parallel Safe:** No (final integration phase)
  - [x] 9.1 Test existing commands (regression testing)
  - [x] 9.2 Test /orchestrate-tasks command end-to-end
  - [x] 9.3 Test /improve-skills command end-to-end
  - [x] 9.4 Test workflow reference expansion
  - [x] 9.5 Test new agents independently
  - [x] 9.6 Test implementation reports feature
  - [x] 9.7 Test verification workflows
  - [x] 9.8 Fix any bugs discovered
  - [x] 9.9 Verify all tests pass
  - [x] 9.10 Performance testing (workflow expansion < 100ms)

## Notes

- **Task 1 is already completed** as part of fixing TUI dashboard issues before starting the main spec implementation.
- **Parallel execution possible** for Tasks 2, 3, 5, and 6 after their dependencies are met.
- **Task 4 depends on Task 3** (needs new agents).
- **Task 7 depends on Task 2** (needs workflow reference system).
- **Task 8 depends on all previous tasks** (final configuration and documentation).
- **Task 9 is the final integration phase** and must run after everything else.
