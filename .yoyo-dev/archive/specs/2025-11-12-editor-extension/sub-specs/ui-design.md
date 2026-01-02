# UI Design: Yoyo Dev Extension

## Overview
This document details the user interface design for the Yoyo Dev VS Code extension, including layout, visual hierarchy, interaction patterns, and user flows.

## Sidebar Layout

```
┌─────────────────────────────────────┐
│ YOYO DEV                      [⚙️ ]│ ← View title bar with settings
├─────────────────────────────────────┤
│ 📋 TASKS                      [▼] │ ← Collapsible section
│   📁 user-authentication (8/12)    │
│     ☑️ Setup auth schema            │
│     ☑️ Create user model            │
│     ⭕ Implement login endpoint     │ ← Unchecked task
│     ⭕ Add JWT middleware           │
│   📁 payment-integration (0/6)     │
│                                     │
│ 🗺️ ROADMAP                   [▼] │
│   Phase 1: Foundation (100%)       │
│   Phase 2: Core Features (60%)     │
│     ✓ User Authentication          │
│     ⚙️ Payment Integration          │ ← In progress
│     ⭕ Admin Dashboard              │ ← Not started
│   Phase 3: Scale (0%)              │
│                                     │
│ 📄 CURRENT SPEC              [▼] │
│   user-authentication              │
│   Status: Executing Tasks          │
│   Progress: 8/12 tasks (67%)       │
│   [View Spec] [Execute Tasks]      │ ← Quick actions
│                                     │
│ 🔀 GIT INFO                  [▼] │
│   Branch: feat/user-auth           │
│   Status: 3 uncommitted changes    │
│   Remote: 2 commits ahead          │
│   [Commit] [Push]                  │
└─────────────────────────────────────┘
```

## Tasks Tree View

### Visual Hierarchy
```
📁 Spec Name (completed/total)          ← Parent level
  ☑️ Completed task                      ← Leaf with checkmark
  ⭕ Uncompleted task                    ← Leaf with circle
  ⚙️ In-progress task                    ← Leaf with gear
  📦 Task with subtasks (2/4)           ← Parent task
    ☑️ Subtask 1
    ☑️ Subtask 2
    ⭕ Subtask 3
    ⭕ Subtask 4
```

### Icons
- `📁` Folder icon for spec groups
- `☑️` Check icon for completed tasks (theme icon: `check`)
- `⭕` Circle outline for uncompleted tasks (theme icon: `circle-outline`)
- `⚙️` Gear icon for in-progress tasks (theme icon: `gear`)
- `📦` Package icon for parent tasks (theme icon: `package`)

### Context Menu
Right-click on task:
```
┌─────────────────────────────┐
│ Execute Task               │
│ Mark as Complete           │
│ ──────────────────────────│
│ Open in Editor             │
│ Copy Task Name             │
│ ──────────────────────────│
│ Assign to Agent...         │
│ Set Dependencies...        │
└─────────────────────────────┘
```

### Hover Info
```
Task: Implement login endpoint
Assigned: implementer
Dependencies: Setup auth schema, Create user model
Files: src/auth/login.ts, tests/auth/login.test.ts
Parallel Safe: No
```

### Inline Actions (View Title)
```
TASKS [🔄 Refresh] [➕ Create Task] [⚡ Execute Next]
```

## Roadmap Tree View

### Visual Hierarchy
```
Phase 1: Foundation (100%)                 ← Phase with percentage
  ✓ Product Planning                        ← Completed feature
  ✓ Tech Stack Setup
Phase 2: Core Features (60%)
  ✓ User Authentication                     ← Completed
  ⚙️ Payment Integration                     ← In Progress (current spec)
  ⭕ Admin Dashboard                         ← Not Started
  ⭕ Email Notifications
Phase 3: Scale (0%)
  ⭕ Performance Optimization
  ⭕ Analytics Dashboard
```

### Icons
- `✓` Checkmark for completed features (theme icon: `pass-filled`)
- `⚙️` Gear for in-progress features (theme icon: `sync`)
- `⭕` Circle for not-started features (theme icon: `circle-large-outline`)

### Context Menu
Right-click on feature:
```
┌─────────────────────────────┐
│ Create Spec                │ ← Launch /create-spec
│ View Spec                  │ ← If spec exists
│ ──────────────────────────│
│ Edit Roadmap               │
│ Copy Feature Name          │
└─────────────────────────────┘
```

### Progress Indicators
```
Phase 2: Core Features
[████████░░░░░░░░░░░░] 60%
4/7 features complete
```

### Inline Actions
```
ROADMAP [🔄 Refresh] [📝 Edit] [➕ Add Phase]
```

## Current Spec Panel

### Layout
```
┌─────────────────────────────────────┐
│ 📄 user-authentication             │ ← Spec name (clickable)
├─────────────────────────────────────┤
│ Status: ⚙️ Executing Tasks          │
│ Created: 2025-11-08                │
│ Modified: 2025-11-12               │
│                                     │
│ Progress                            │
│ [████████████░░░░░░░] 67%          │
│ 8 of 12 tasks complete             │
│                                     │
│ Quick Actions                       │
│ [📄 View Spec]  [▶️ Execute]        │
│ [📝 Edit Spec]  [✅ Review]         │
└─────────────────────────────────────┘
```

### Empty State
```
┌─────────────────────────────────────┐
│ No active spec                      │
│                                     │
│ Get started:                        │
│ • Run "/plan-product" first        │
│ • Then "/create-new" for feature   │
│                                     │
│ [📘 View Docs]                      │
└─────────────────────────────────────┘
```

## Git Info Panel

### Layout
```
┌─────────────────────────────────────┐
│ 🔀 feat/user-auth                   │ ← Current branch
├─────────────────────────────────────┤
│ Working Directory                   │
│ ⚠️  3 modified files                │
│ ➕ 1 untracked file                 │
│                                     │
│ Remote Status                       │
│ ⬆️  2 commits ahead                 │
│ ⬇️  0 commits behind                │
│                                     │
│ [💾 Commit]  [⬆️ Push]              │
└─────────────────────────────────────┘
```

### Clean State
```
┌─────────────────────────────────────┐
│ 🔀 main                             │
├─────────────────────────────────────┤
│ ✅ Working directory clean          │
│ ✅ In sync with remote              │
│                                     │
│ [🔀 New Branch]                     │
└─────────────────────────────────────┘
```

## Spec Webview (Full Panel)

### Layout
```
┌────────────────┬──────────────────────────────────────┐
│ Navigation     │ # Specification: User Auth           │
│                │                                      │
│ 📌 Goal        │ ## Goal                              │
│ 👤 User Stories│ Build secure authentication system   │
│ 📋 Requirements│ with JWT tokens and role-based...    │
│ 🎨 Design      │                                      │
│ 💾 Database    │ ## User Stories                      │
│ 🔌 API         │ - As a user, I want to...            │
│ ❌ Out of Scope│                                      │
│                │ ## Specific Requirements             │
│                │                                      │
│                │ **Authentication Flow**              │
│                │ - JWT token generation               │
│                │ - Refresh token rotation             │
│                │                                      │
│                │ [Create Tasks] [Execute]             │
└────────────────┴──────────────────────────────────────┘
```

### Navigation Interaction
- Click section name → scroll to section
- Active section highlighted in navigation
- Sticky navigation stays visible while scrolling
- Collapse/expand navigation with toggle button

### Markdown Styling
- Headings use VS Code theme colors
- Code blocks with syntax highlighting
- Links clickable (open in browser or editor)
- Lists properly indented
- Tables formatted with borders
- Blockquotes styled with left border

## Status Bar Items

### Left Side (Workspace Scope)
```
┌──────────────────────────────────────────────────────┐
│ 📄 user-authentication  ⚙️ Executing  ...           │
└──────────────────────────────────────────────────────┘
    ↑                       ↑
    Current spec name       Workflow state
```

Workflow state icons:
- `📋` Planning (blue background)
- `⚙️` Executing (yellow background)
- `👁️` Review (orange background)
- `✅` Complete (green background)

### Right Side (File Scope)
```
┌──────────────────────────────────────────────────────┐
│ ...                             8/12 tasks  ⚙️ Yoyo  │
└──────────────────────────────────────────────────────┘
                                     ↑           ↑
                                     Progress    Extension active
```

### Click Behavior
- Click spec name → open spec in editor
- Click workflow state → show workflow details in Output Channel
- Click task progress → focus Tasks view
- Click extension icon → open sidebar

### Tooltip
```
Hover over "⚙️ Executing":
┌─────────────────────────────┐
│ Workflow: Executing Tasks   │
│ Current Step: 2/5           │
│ Agent: implementer          │
│ Started: 10:30 AM           │
│                             │
│ Click to view details       │
└─────────────────────────────┘
```

## Command Palette

### Command Format
```
> Yoyo Dev: Create New Feature
> Yoyo Dev: Execute Tasks
> Yoyo Dev: Plan Product
> Yoyo Dev: Review Code (Devil's Advocate)
```

### Categorization
All commands prefixed with "Yoyo Dev:" for grouping.

### Icons in Results
```
> 📋 Yoyo Dev: Plan Product
> ⚙️ Yoyo Dev: Create New Feature
> ▶️ Yoyo Dev: Execute Tasks
> 🐛 Yoyo Dev: Create Fix
> 👁️ Yoyo Dev: Review Code
```

### Command with Flags (Dropdown)
```
> Yoyo Dev: Execute Tasks
  ├─ Execute Tasks (Default)
  ├─ Execute Tasks (Devil's Advocate)
  ├─ Execute Tasks (Security Review)
  ├─ Execute Tasks (Performance Review)
  └─ Execute Tasks (Production Review)
```

## Context Menus

### Editor Context Menu (on .md files in .yoyo-dev/)
```
Right-click in spec.md:
┌─────────────────────────────┐
│ Cut                         │
│ Copy                        │
│ Paste                       │
│ ──────────────────────────│
│ Yoyo Dev                   │
│   ├─ Create Tasks          │
│   ├─ Execute Tasks         │
│   ├─ View in Sidebar       │
│   └─ Open Roadmap          │
└─────────────────────────────┘
```

### Explorer Context Menu (on folders)
```
Right-click on src/ folder:
┌─────────────────────────────┐
│ New File                    │
│ New Folder                  │
│ ──────────────────────────│
│ Yoyo Dev                   │
│   ├─ Create Spec Here      │
│   └─ Create Fix            │
└─────────────────────────────┘
```

### Tasks.md Context Menu (on task lines)
```
Right-click on "- [ ] Implement login":
┌─────────────────────────────┐
│ Execute This Task           │
│ Mark as Complete            │
│ ──────────────────────────│
│ Assign to Agent...          │
│ Set Dependencies...         │
└─────────────────────────────┘
```

## Settings Panel

### Configuration UI
```
Yoyo Dev Settings

Performance
  ☑️ Auto-refresh views on file changes
  File watcher debounce delay: [500] ms
  Maximum tree view items: [100]

Workflows
  Execution mode: ○ Automatic  ● Orchestrated
  ☑️ Generate implementation reports
  ☑️ Generate verification reports
  ☑️ Enable parallel execution

Design System
  ☑️ Enable design system validation
  ☑️ Auto-validate on save
  Accessibility level: [WCAG-AA ▼]
  ☑️ Dark mode support

Specialized Agents
  ☑️ context-fetcher
  ☑️ implementer
  ☑️ spec-shaper
  ☑️ tasks-list-creator
  ☑️ test-runner
  ☑️ git-workflow
  [Configure All...]

Advanced
  ☑️ Show MCP server status
  ☑️ Enable debug logging
  Output channel verbosity: [Info ▼]
```

## Notification Patterns

### Progress Notification
```
┌────────────────────────────────────┐
│ ⚙️ Executing Tasks                 │
│ Task 2 of 12: Implement login...   │
│ [████████░░░░░░░░░░░░] 16%        │
│                                    │
│ [Cancel]                  [Hide]  │
└────────────────────────────────────┘
```

### Success Notification
```
┌────────────────────────────────────┐
│ ✅ Task Execution Complete          │
│ All 12 tasks completed successfully│
│                                    │
│ [View Recap]    [Close]           │
└────────────────────────────────────┘
```

### Error Notification
```
┌────────────────────────────────────┐
│ ❌ Task Execution Failed            │
│ Error in task 5: Test failure      │
│                                    │
│ [View Logs]  [Retry]  [Close]     │
└────────────────────────────────────┘
```

### Info Notification
```
┌────────────────────────────────────┐
│ ℹ️ Yoyo Dev Update Available        │
│ Version 1.7.0 includes new features│
│                                    │
│ [Update Now]  [Release Notes]      │
└────────────────────────────────────┘
```

## Keyboard Shortcuts

### Default Bindings
| Shortcut | Command | Description |
|----------|---------|-------------|
| `Cmd+Shift+Y` | `yoyoDev.showSidebar` | Open Yoyo Dev sidebar |
| `Cmd+Shift+T` | `yoyoDev.focusTasks` | Focus tasks view |
| `Cmd+Shift+R` | `yoyoDev.focusRoadmap` | Focus roadmap view |
| `Cmd+Shift+E` | `yoyoDev.executeNext` | Execute next task |
| `Cmd+Shift+N` | `yoyoDev.createNew` | Create new spec |
| `Cmd+Shift+P → Yoyo` | Command Palette | Show all Yoyo commands |

### Customization
All shortcuts customizable via VS Code Keyboard Shortcuts editor (Cmd+K Cmd+S).

## Interaction Flows

### Flow 1: Create New Feature
1. User opens Command Palette (`Cmd+Shift+P`)
2. Types "Yoyo Dev: Create New"
3. Extension creates terminal, runs `claude /create-new`
4. User interacts with Claude in terminal
5. On completion (detected via state.json change):
   - Tasks view auto-refreshes with new spec
   - Roadmap updates with feature progress
   - Current Spec panel shows new spec
   - Success notification appears

### Flow 2: Execute Tasks
1. User clicks "Execute Tasks" button in Current Spec panel
2. Extension shows progress notification
3. Terminal opens with `claude /execute-tasks`
4. Real-time updates as tasks complete:
   - Task checkboxes update in tree view
   - Progress bar updates in Current Spec panel
   - Status bar shows current task number
5. On completion:
   - All views refresh
   - Success notification with recap link
   - Status bar shows "✅ Complete"

### Flow 3: Mark Task Complete
1. User right-clicks task in tree view
2. Selects "Mark as Complete"
3. Extension updates tasks.md file (adds `[x]`)
4. Tree view auto-refreshes (file watcher triggered)
5. Progress updates in Current Spec panel

### Flow 4: View Spec Content
1. User clicks spec name in Current Spec panel
2. Webview panel opens with spec.md content
3. Navigation sidebar shows spec sections
4. User clicks section name in navigation
5. Content scrolls to section
6. User clicks "Create Tasks" button
7. Extension runs `claude /create-tasks` in terminal

## Responsive Behavior

### Small Sidebar Width (< 300px)
- Hide button text, show icons only
- Collapse long spec names with ellipsis
- Single-column button layout
- Hide progress bars, show percentage only

### Large Sidebar Width (> 400px)
- Show full text labels
- Two-column button layout
- Show full progress bars
- Display additional metadata

### Dark Mode
- All colors use VS Code theme tokens
- Icons use appropriate theme variants
- Progress bars use theme background colors
- Hover states use theme highlight colors

## Accessibility

### Keyboard Navigation
- All interactive elements accessible via Tab
- Tree items navigate with arrow keys
- Context menus open with Shift+F10 or Menu key
- Enter activates default action

### Screen Reader Support
- All icons have aria-labels
- Progress bars announce percentage
- Status changes announced
- Button purposes clearly labeled

### Focus Indicators
- Visible focus ring on all interactive elements
- Focus ring uses VS Code theme colors
- Focus not trapped in webviews

### Color Contrast
- All text meets WCAG AA standards
- Icons distinguishable without color
- Status indicators use shape + color
- Error/warning/info use icons + text

## Error States

### No .yoyo-dev Directory
```
┌─────────────────────────────────────┐
│ ⚠️ No Yoyo Dev Project Detected     │
│                                     │
│ This workspace doesn't contain a   │
│ .yoyo-dev directory.                │
│                                     │
│ [Initialize Project]  [Learn More] │
└─────────────────────────────────────┘
```

### Claude CLI Not Found
```
┌─────────────────────────────────────┐
│ ⚠️ Claude Code CLI Not Installed    │
│                                     │
│ Yoyo Dev requires Claude Code CLI. │
│                                     │
│ [Install Claude]  [Documentation]  │
└─────────────────────────────────────┘
```

### Corrupted state.json
```
┌─────────────────────────────────────┐
│ ❌ State File Error                 │
│                                     │
│ Cannot parse .yoyo-dev/state.json   │
│                                     │
│ [Reset State]  [View File]         │
└─────────────────────────────────────┘
```

## Loading States

### Initial Load
```
┌─────────────────────────────────────┐
│ ⚙️ Loading Yoyo Dev...              │
│                                     │
│ Scanning workspace...               │
│ [████████████░░░░░░░] 60%          │
└─────────────────────────────────────┘
```

### View Refresh
```
TASKS [⚙️ Refreshing...]
  (Show spinner overlay)
```

### Spec Loading
```
┌─────────────────────────────────────┐
│ ⚙️ Loading specification...         │
│                                     │
│ Reading spec files...               │
└─────────────────────────────────────┘
```

## Animation & Transitions

### Subtle Animations
- Tree items expand/collapse with 200ms ease transition
- Progress bars animate with 300ms linear transition
- Success/error states fade in with 150ms
- Hover states transition color over 100ms

### No Animations
- Checkbox state changes (instant)
- Text updates (instant)
- File change refreshes (instant)

## Color Palette (Theme Tokens)

All colors use VS Code theme tokens:

### Status Colors
- `statusBar.debuggingBackground` - Executing state
- `testing.iconPassed` - Complete state
- `testing.iconFailed` - Error state
- `testing.iconQueued` - Planning state

### UI Elements
- `sideBar.background` - Panel backgrounds
- `sideBarTitle.foreground` - Panel titles
- `sideBarSectionHeader.background` - Section headers
- `button.background` - Action buttons
- `button.hoverBackground` - Button hover
- `input.background` - Input fields
- `list.hoverBackground` - Tree item hover
- `list.activeSelectionBackground` - Tree item selection

### Icons
- `icon.foreground` - Default icon color
- `errorForeground` - Error icons
- `notificationsWarningIcon.foreground` - Warning icons
- `notificationsInfoIcon.foreground` - Info icons
