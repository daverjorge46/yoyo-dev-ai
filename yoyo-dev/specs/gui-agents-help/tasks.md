# Task Breakdown: GUI Agents Management & Help Pages

## Overview

Total Tasks: 54 (organized into 7 task groups)

This feature adds two new pages to the Yoyo Dev GUI:
1. **Agents Page** - Manage 22+ agent definitions with CRUD operations, orchestration visualization
2. **Help Page** - Hierarchical documentation with search, diagrams, and command reference

## Dependencies

New npm packages required:
- `mermaid` - Flowchart/diagram rendering
- `fuse.js` - Fuzzy search for Help page
- `js-yaml` - YAML frontmatter parsing
- `react-dropzone` - File import for agents

## Reference Patterns

- **List+Detail Pattern**: `gui/client/src/pages/Skills.tsx`
- **File-based CRUD API**: `gui/server/routes/skills.ts`
- **Sidebar Navigation**: `gui/client/src/components/layout/CollapsibleSidebar.tsx`
- **Agent File Format**: `.claude/agents/*.md` (YAML frontmatter + markdown body)

---

## Task List

### Foundation Layer

#### Task Group 1: Dependencies and Type Definitions
**Dependencies:** None
**Estimated Time:** 1-2 hours

- [ ] 1.0 Complete foundation layer
  - [ ] 1.1 Write 4 focused tests for type definitions and parsing
    - Test Agent interface serialization/deserialization
    - Test HelpSection type structure
    - Test YAML frontmatter extraction
    - Test markdown content parsing
  - [ ] 1.2 Install required npm dependencies
    - `npm install mermaid fuse.js js-yaml react-dropzone`
    - `npm install -D @types/js-yaml`
    - Verify peer dependency compatibility
  - [ ] 1.3 Create Agent type definitions
    - Path: `gui/shared/types/agent.ts`
    - Fields: id, name, description, model, temperature, mode, version, content
    - Include AgentSummary interface for list view
    - Include AgentCreateRequest, AgentUpdateRequest types
  - [ ] 1.4 Create Help type definitions
    - Path: `gui/shared/types/help.ts`
    - Fields: HelpSection, HelpArticle, HelpSearchResult
    - Include nested section structure for hierarchy
  - [ ] 1.5 Create agent markdown parser utility
    - Path: `gui/server/lib/agent-parser.ts`
    - Parse YAML frontmatter with js-yaml
    - Extract: name, description, model, temperature, mode, version
    - Handle missing fields gracefully
    - Follow pattern from `gui/server/routes/skills.ts` parseSkillFile()
  - [ ] 1.6 Run foundation tests to verify types compile
    - Run ONLY tests from 1.1
    - Verify TypeScript compilation passes
    - Verify parser handles sample agent file

**Acceptance Criteria:**
- All 4 foundation tests pass
- Types export correctly from shared module
- Parser correctly extracts agent metadata from `.claude/agents/yoyo-ai.md`
- No TypeScript errors

---

### Backend Layer

#### Task Group 2: Agent Management API
**Dependencies:** Task Group 1
**Estimated Time:** 2-3 hours

- [ ] 2.0 Complete Agent Management API
  - [ ] 2.1 Write 6 focused tests for agent CRUD operations
    - Test GET /api/agent-definitions (list all)
    - Test GET /api/agent-definitions/:id (get single)
    - Test POST /api/agent-definitions (create new)
    - Test PUT /api/agent-definitions/:id (update)
    - Test DELETE /api/agent-definitions/:id (delete)
    - Test POST /api/agent-definitions/:id/duplicate (duplicate)
  - [ ] 2.2 Create agent definitions routes file
    - Path: `gui/server/routes/agent-definitions.ts`
    - Follow pattern from `gui/server/routes/skills.ts`
    - Use Hono router with Variables type
  - [ ] 2.3 Implement GET /api/agent-definitions endpoint
    - Read all `.md` files from `.claude/agents/`
    - Parse each with agent-parser utility
    - Return sorted list with count
    - Include stats: totalAgents, byModel, byMode
  - [ ] 2.4 Implement GET /api/agent-definitions/:id endpoint
    - Read specific agent file by ID (filename without .md)
    - Return full content plus parsed metadata
    - Return 404 if not found
  - [ ] 2.5 Implement POST /api/agent-definitions endpoint
    - Accept name, description, model, temperature, mode, content
    - Generate YAML frontmatter from fields
    - Create new .md file in `.claude/agents/`
    - Generate ID from sanitized name
    - Return created agent
  - [ ] 2.6 Implement PUT /api/agent-definitions/:id endpoint
    - Update existing agent file
    - Regenerate frontmatter from form fields
    - Preserve content section
    - Return 404 if not found
  - [ ] 2.7 Implement DELETE /api/agent-definitions/:id endpoint
    - Remove agent file
    - Return 404 if not found
    - Prevent deletion of yoyo-ai (primary agent)
  - [ ] 2.8 Implement POST /api/agent-definitions/:id/duplicate endpoint
    - Clone existing agent with new ID (original-name-copy)
    - Update name field in frontmatter
    - Return new agent
  - [ ] 2.9 Register routes in server index
    - Add to `gui/server/index.ts`
    - Mount at `/api/agent-definitions`
  - [ ] 2.10 Run API tests to verify endpoints
    - Run ONLY tests from 2.1
    - Verify CRUD operations work
    - Verify error responses are correct

**Acceptance Criteria:**
- All 6 API tests pass
- CRUD operations work with actual agent files
- Proper error handling for missing files
- yoyo-ai agent cannot be deleted

---

#### Task Group 3: Orchestration Config & Help Content API
**Dependencies:** Task Group 2
**Estimated Time:** 1-2 hours

- [ ] 3.0 Complete Orchestration & Help APIs
  - [ ] 3.1 Write 4 focused tests for orchestration and help endpoints
    - Test GET /api/orchestration/config (routing config)
    - Test GET /api/orchestration/flow (mermaid diagram data)
    - Test GET /api/help/sections (all sections)
    - Test GET /api/help/search?q=query (fuzzy search)
  - [ ] 3.2 Create orchestration routes file
    - Path: `gui/server/routes/orchestration.ts`
    - Extract routing rules from `.claude/hooks/orchestrate.cjs` or config
  - [ ] 3.3 Implement GET /api/orchestration/config endpoint
    - Return agent routing configuration
    - Include: intent types, agent mappings, confidence thresholds
    - Parse from `.yoyo-dev/config.yml` if available
  - [ ] 3.4 Implement GET /api/orchestration/flow endpoint
    - Return Mermaid-compatible flowchart definition
    - Show: User Input -> Intent Classification -> Agent Routing
    - Include all agent nodes and routing paths
  - [ ] 3.5 Create help routes file
    - Path: `gui/server/routes/help.ts`
  - [ ] 3.6 Implement GET /api/help/sections endpoint
    - Return hierarchical help content structure
    - 9 sections: Getting Started, Installation, Commands, Workflows, Agents, Ralph, Memory, Skills, GUI
    - Include nested articles with IDs for deep linking
  - [ ] 3.7 Implement GET /api/help/search endpoint
    - Accept query parameter `q`
    - Use fuse.js for fuzzy matching across all help content
    - Return ranked results with section, title, excerpt
  - [ ] 3.8 Register orchestration and help routes
    - Mount at `/api/orchestration` and `/api/help`
  - [ ] 3.9 Run orchestration and help API tests
    - Run ONLY tests from 3.1
    - Verify config returns valid structure
    - Verify search returns ranked results

**Acceptance Criteria:**
- All 4 API tests pass
- Orchestration config reflects actual routing rules
- Help search returns relevant results
- Mermaid flow diagram is valid syntax

---

### Frontend Components Layer

#### Task Group 4: Shared UI Components
**Dependencies:** Task Group 1
**Estimated Time:** 2-3 hours

- [ ] 4.0 Complete shared UI components
  - [ ] 4.1 Write 6 focused tests for UI components
    - Test MermaidDiagram renders flowchart
    - Test CommandBlock renders with copy button
    - Test Accordion expand/collapse behavior
    - Test SearchInput debounce and callback
    - Test StatCard displays value correctly
    - Test FileDropzone accepts/rejects files
  - [ ] 4.2 Create MermaidDiagram component
    - Path: `gui/client/src/components/common/MermaidDiagram.tsx`
    - Props: definition (string), className
    - Initialize mermaid with dark mode support
    - Handle render errors gracefully
    - Re-render on definition change
  - [ ] 4.3 Create CommandBlock component
    - Path: `gui/client/src/components/common/CommandBlock.tsx`
    - Props: command, language, description
    - Copy to clipboard button with success feedback
    - Syntax highlighting (use existing terminal styles)
    - Match terminal-code CSS class patterns
  - [ ] 4.4 Create Accordion component
    - Path: `gui/client/src/components/common/Accordion.tsx`
    - Props: items (array of {id, title, content}), allowMultiple
    - Animated expand/collapse with chevron rotation
    - Keyboard navigation (Enter/Space to toggle)
    - aria-expanded, aria-controls attributes
  - [ ] 4.5 Create SearchInput component
    - Path: `gui/client/src/components/common/SearchInput.tsx`
    - Props: value, onChange, placeholder, debounceMs
    - Debounced onChange callback (300ms default)
    - Clear button when value present
    - Search icon prefix
    - Follow pattern from Skills.tsx search input
  - [ ] 4.6 Create FileDropzone component
    - Path: `gui/client/src/components/common/FileDropzone.tsx`
    - Use react-dropzone
    - Props: onDrop, accept, maxFiles
    - Drag-over visual feedback
    - Accept .md files only for agent import
    - Error messaging for rejected files
  - [ ] 4.7 Create AgentCard component
    - Path: `gui/client/src/components/agents/AgentCard.tsx`
    - Props: agent, onSelect, selected, onEdit, onDelete
    - Display: name, description, model badge, temperature
    - Mode indicator (primary/secondary badge)
    - Hover actions (edit, duplicate, delete)
    - Follow SkillCard pattern from Skills.tsx
  - [ ] 4.8 Run component tests
    - Run ONLY tests from 4.1
    - Verify all components render without errors
    - Verify accessibility attributes present

**Acceptance Criteria:**
- All 6 component tests pass
- MermaidDiagram renders valid diagrams
- CommandBlock copies to clipboard
- Accordion animates smoothly
- Components follow existing terminal/dark mode styling

---

#### Task Group 5: Agent Page Components
**Dependencies:** Task Group 4
**Estimated Time:** 2-3 hours

- [ ] 5.0 Complete Agents page components
  - [ ] 5.1 Write 5 focused tests for Agents page components
    - Test AgentFormEditor generates valid markdown
    - Test AgentDetailView displays all fields
    - Test OrchestrationVisualization renders diagram
    - Test AgentStats displays counts correctly
    - Test AgentList filters by search term
  - [ ] 5.2 Create AgentFormEditor component
    - Path: `gui/client/src/components/agents/AgentFormEditor.tsx`
    - Form fields: name, description, model (select), temperature (slider), mode (select), version
    - Content textarea for markdown body
    - Preview toggle (rendered markdown)
    - Auto-generates YAML frontmatter from form fields
    - Validation: name required, temperature 0-2 range
  - [ ] 5.3 Create AgentDetailView component
    - Path: `gui/client/src/components/agents/AgentDetailView.tsx`
    - Props: agentId, onDeleted, onEdit
    - Display all agent metadata in structured layout
    - Render markdown content with ReactMarkdown
    - Edit/Delete/Duplicate action buttons
    - Delete confirmation modal
    - Follow SkillDetailView pattern from Skills.tsx
  - [ ] 5.4 Create OrchestrationVisualization component
    - Path: `gui/client/src/components/agents/OrchestrationVisualization.tsx`
    - Fetch orchestration flow from API
    - Render with MermaidDiagram component
    - Include routing table below diagram
    - Show: Intent -> Agent -> Confidence threshold
  - [ ] 5.5 Create AgentStats component
    - Path: `gui/client/src/components/agents/AgentStats.tsx`
    - 4 stat cards: Total Agents, Primary Agents, Models Used, Avg Temperature
    - Follow StatCard pattern from Skills.tsx
    - Calculate stats from agent list
  - [ ] 5.6 Create AgentList component
    - Path: `gui/client/src/components/agents/AgentList.tsx`
    - Responsive grid: 1 col mobile, 2 col tablet, 3 col desktop
    - Search/filter bar
    - Filter by model, mode
    - Empty state when no agents match
  - [ ] 5.7 Create AgentImportModal component
    - Path: `gui/client/src/components/agents/AgentImportModal.tsx`
    - FileDropzone for .md files
    - Preview parsed agent metadata
    - Confirm import button
    - Handle duplicate ID conflict
  - [ ] 5.8 Run agent component tests
    - Run ONLY tests from 5.1
    - Verify form generates valid agent markdown
    - Verify detail view renders all fields

**Acceptance Criteria:**
- All 5 agent component tests pass
- Form editor generates valid YAML frontmatter
- Detail view displays all agent information
- Orchestration diagram renders correctly
- Grid is responsive across breakpoints

---

### Pages Layer

#### Task Group 6: Agents and Help Pages
**Dependencies:** Task Groups 4, 5
**Estimated Time:** 2-3 hours

- [ ] 6.0 Complete page implementations
  - [ ] 6.1 Write 4 focused tests for page functionality
    - Test Agents page loads agent list
    - Test Agents page CRUD workflow (create, edit, delete)
    - Test Help page loads sections
    - Test Help page search filters content
  - [ ] 6.2 Create Agents page
    - Path: `gui/client/src/pages/Agents.tsx`
    - Layout: Stats row -> Orchestration section -> Agent grid
    - Collapsible orchestration visualization section
    - Create New Agent button (opens editor modal)
    - Import from file button (opens import modal)
    - List/detail split view (1/3 list, 2/3 detail on desktop)
    - Follow Skills.tsx page structure
  - [ ] 6.3 Implement Agents page API integration
    - useQuery for agent list with react-query
    - useMutation for create/update/delete
    - Optimistic updates for better UX
    - Error toast notifications
    - Loading states with skeleton
  - [ ] 6.4 Create Help page
    - Path: `gui/client/src/pages/Help.tsx`
    - Layout: Search bar -> TOC sidebar + Content area
    - Sticky TOC sidebar (desktop only, hidden on mobile)
    - 9 collapsible sections with Accordion component
    - Each section contains articles with markdown content
    - Command blocks with copy functionality
    - Mermaid diagrams for workflow sections
  - [ ] 6.5 Implement Help page search
    - Search bar at top with debounced input
    - Fuzzy search via API (fuse.js on backend)
    - Highlight matching results
    - Jump to section/article on result click
    - Clear search restores full content
  - [ ] 6.6 Implement Help page deep linking
    - URL hash for section anchors (#installation, #commands)
    - Auto-scroll to section on page load
    - Update URL on section navigation
  - [ ] 6.7 Add Help page content
    - Getting Started: Quick start guide, prerequisites
    - Installation: Manual, automated, MCP setup
    - Commands: All slash commands with examples
    - Workflows: Spec creation, task execution (with diagrams)
    - Agents: Agent overview, orchestration explanation
    - Ralph: Configuration, best practices
    - Memory: System overview, querying
    - Skills: Skill learning, usage
    - GUI: Dashboard features, navigation
  - [ ] 6.8 Run page tests
    - Run ONLY tests from 6.1
    - Verify pages load without errors
    - Verify CRUD workflow works end-to-end

**Acceptance Criteria:**
- All 4 page tests pass
- Agents page displays all 22+ agents in grid
- CRUD operations work with proper feedback
- Help page renders all 9 sections
- Search filters content correctly
- Deep links work for bookmarking

---

### Integration Layer

#### Task Group 7: Navigation, Routing, and Polish
**Dependencies:** Task Group 6
**Estimated Time:** 1-2 hours

- [ ] 7.0 Complete integration and polish
  - [ ] 7.1 Write 3 focused tests for integration
    - Test sidebar navigation includes Agents and Help links
    - Test routing to /agents and /help works
    - Test dark mode styling on new pages
  - [ ] 7.2 Update sidebar navigation
    - Add Agents item (icon: Users or Bot from lucide-react)
    - Add Help item (icon: HelpCircle from lucide-react)
    - Position: Agents after Skills, Help at bottom
    - Update navItems array in CollapsibleSidebar.tsx
  - [ ] 7.3 Add routes to App.tsx
    - Import Agents and Help pages
    - Add Route for /agents
    - Add Route for /help
  - [ ] 7.4 Verify dark mode styling
    - Test all new components in dark mode
    - Use terminal-* CSS classes consistently
    - Ensure Mermaid diagrams use dark theme
    - Verify contrast ratios meet accessibility
  - [ ] 7.5 Add loading and error states
    - Skeleton loaders for agent cards
    - Error boundaries for page failures
    - Toast notifications for API errors
    - Empty states with call-to-action
  - [ ] 7.6 Responsive design verification
    - Mobile (320px-768px): Single column, collapsed TOC
    - Tablet (768px-1024px): Two column grid
    - Desktop (1024px+): Three column grid, visible TOC
    - Test on actual device sizes
  - [ ] 7.7 Accessibility audit
    - Keyboard navigation for all interactive elements
    - aria-labels on icon buttons
    - Focus management in modals
    - Screen reader testing for Mermaid diagrams (alt text)
  - [ ] 7.8 Run integration tests
    - Run ONLY tests from 7.1
    - Verify navigation works
    - Verify pages accessible via direct URL

**Acceptance Criteria:**
- All 3 integration tests pass
- Sidebar shows Agents and Help links
- Direct navigation to /agents and /help works
- Dark mode renders correctly
- Responsive breakpoints work as specified

---

## Testing Summary

#### Task Group 8: Test Review & Gap Analysis
**Dependencies:** Task Groups 1-7
**Estimated Time:** 1-2 hours

- [ ] 8.0 Review existing tests and fill critical gaps only
  - [ ] 8.1 Review tests from Task Groups 1-7
    - Task 1.1: 4 tests (types, parsing)
    - Task 2.1: 6 tests (agent CRUD API)
    - Task 3.1: 4 tests (orchestration, help API)
    - Task 4.1: 6 tests (shared components)
    - Task 5.1: 5 tests (agent components)
    - Task 6.1: 4 tests (pages)
    - Task 7.1: 3 tests (integration)
    - **Total existing: 32 tests**
  - [ ] 8.2 Analyze test coverage gaps for THIS feature only
    - Identify critical user workflows lacking coverage
    - Focus on end-to-end: Create agent -> Edit -> Delete
    - Focus on Help page: Search -> Navigate -> Copy command
    - Skip edge cases, performance, browser-specific
  - [ ] 8.3 Write up to 8 additional strategic tests maximum
    - E2E: Full agent CRUD workflow
    - E2E: Help page search and navigation
    - E2E: Agent import from file
    - E2E: Orchestration visualization loads
    - Integration: Form validation errors display
    - Integration: Delete confirmation prevents accidental deletion
    - Integration: Help deep linking works on page load
    - Integration: Responsive layout switches correctly
  - [ ] 8.4 Run feature-specific tests only
    - Run all tests from groups 1-7 plus new tests from 8.3
    - Expected total: ~40 tests maximum
    - Do NOT run entire application test suite
    - Verify all critical workflows pass

**Acceptance Criteria:**
- All ~40 feature-specific tests pass
- Critical user workflows are covered
- No more than 8 additional tests added
- Testing focused exclusively on Agents and Help features

---

## Execution Order

Recommended implementation sequence:

```
1. Foundation (Task Group 1)
   - Types, dependencies, parser utility
   - No dependencies, can start immediately

2. Agent Management API (Task Group 2)
   - Requires: Task Group 1
   - Core CRUD functionality

3. Orchestration & Help API (Task Group 3)
   - Requires: Task Group 2 (shared patterns)
   - Additional endpoints

4. Shared UI Components (Task Group 4)
   - Requires: Task Group 1 (types)
   - Can parallel with Task Groups 2-3

5. Agent Page Components (Task Group 5)
   - Requires: Task Group 4
   - Agent-specific UI

6. Pages (Task Group 6)
   - Requires: Task Groups 2-5
   - Full page implementation

7. Integration & Polish (Task Group 7)
   - Requires: Task Group 6
   - Navigation, routing, accessibility

8. Test Review (Task Group 8)
   - Requires: Task Groups 1-7
   - Gap analysis and final verification
```

### Parallel Execution Opportunities

```
Timeline:
Day 1: Task Group 1 (Foundation)
Day 1-2: Task Groups 2-3 (Backend) + Task Group 4 (Components) [PARALLEL]
Day 2-3: Task Group 5 (Agent Components)
Day 3: Task Group 6 (Pages)
Day 4: Task Group 7 (Integration) + Task Group 8 (Testing)
```

---

## File Manifest

### New Files to Create

**Backend:**
- `gui/server/lib/agent-parser.ts`
- `gui/server/routes/agent-definitions.ts`
- `gui/server/routes/orchestration.ts`
- `gui/server/routes/help.ts`

**Types:**
- `gui/shared/types/agent.ts`
- `gui/shared/types/help.ts`

**Components:**
- `gui/client/src/components/common/MermaidDiagram.tsx`
- `gui/client/src/components/common/CommandBlock.tsx`
- `gui/client/src/components/common/Accordion.tsx`
- `gui/client/src/components/common/SearchInput.tsx`
- `gui/client/src/components/common/FileDropzone.tsx`
- `gui/client/src/components/agents/AgentCard.tsx`
- `gui/client/src/components/agents/AgentFormEditor.tsx`
- `gui/client/src/components/agents/AgentDetailView.tsx`
- `gui/client/src/components/agents/OrchestrationVisualization.tsx`
- `gui/client/src/components/agents/AgentStats.tsx`
- `gui/client/src/components/agents/AgentList.tsx`
- `gui/client/src/components/agents/AgentImportModal.tsx`

**Pages:**
- `gui/client/src/pages/Agents.tsx`
- `gui/client/src/pages/Help.tsx`

### Files to Modify

- `gui/server/index.ts` - Register new routes
- `gui/client/src/App.tsx` - Add routes
- `gui/client/src/components/layout/CollapsibleSidebar.tsx` - Add nav items
- `package.json` - Add dependencies

---

## Notes

- Follow existing patterns from Skills.tsx and skills.ts for consistency
- Use terminal-* CSS classes for dark mode compatibility
- All agent CRUD operates on `.claude/agents/*.md` files
- The yoyo-ai agent should be protected from deletion
- Mermaid diagrams require initialization with dark mode detection
- Help content should be maintainable (consider separate markdown files)
