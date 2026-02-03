# YoYo AI Dashboard GUI - Implementation Plan

> **Version**: 1.0.0
> **Created**: 2026-02-03
> **Status**: Planning

## Executive Summary

This document outlines the implementation plan for **YoYo AI Workspace** - a comprehensive dashboard GUI that replaces the default OpenClaw control panel with a user-experience focused interface. The GUI will maintain the same design language, colors, and styling as the existing yoyo-dev GUI while providing a rich workspace for interacting with the AI assistant.

### Core Principles

1. **Same Design System**: Identical colors, typography, and component patterns as yoyo-dev GUI
2. **User Experience Focus**: Not configuration, but daily interaction and productivity
3. **OpenClaw Gateway Integration**: Direct connection to the gateway on port 18789
4. **Enhanced Chat**: Voice input, document attachments, rich interactions
5. **Automation First**: Template-driven tasks with proactive AI suggestions

---

## 1. Architecture Overview

### 1.1 High-Level Architecture

```
┌─────────────────────────────────────────────────────────────────────────┐
│                        YoYo AI Workspace (Browser)                       │
│  ┌───────────┬────────────────────────────────────────┬──────────────┐  │
│  │  Sidebar  │           Main Content Area            │ Detail Panel │  │
│  │           │                                        │              │  │
│  │ Dashboard │  Dashboard / Chat / Tasks / etc.       │  Context     │  │
│  │ Chat      │                                        │  Details     │  │
│  │ Tasks     │                                        │  Actions     │  │
│  │ Automation│                                        │              │  │
│  │ Documents │                                        │              │  │
│  │ Messages  │                                        │              │  │
│  │ Connects  │                                        │              │  │
│  └───────────┴────────────────────────────────────────┴──────────────┘  │
└─────────────────────────────────────────────────────────────────────────┘
         │                        │                           │
         │    WebSocket + REST    │     Real-time Events      │
         └────────────────────────┼───────────────────────────┘
                                  │
                    ┌─────────────▼─────────────┐
                    │   YoYo AI Backend (Hono)  │
                    │   Port: 5174              │
                    │                           │
                    │  • API routes             │
                    │  • WebSocket manager      │
                    │  • OpenClaw proxy         │
                    │  • State management       │
                    └─────────────┬─────────────┘
                                  │
                    ┌─────────────▼─────────────┐
                    │  OpenClaw Gateway         │
                    │  Port: 18789              │
                    │                           │
                    │  • Messaging channels     │
                    │  • AI agent               │
                    │  • Skills execution       │
                    │  • Connected services     │
                    └───────────────────────────┘
```

### 1.2 Technology Stack

| Layer | Technology | Rationale |
|-------|------------|-----------|
| **Frontend** | React 18 + TypeScript + Vite | Same as yoyo-dev GUI |
| **Backend** | Hono 4 + Node.js | Same as yoyo-dev GUI |
| **State** | Zustand + React Query + Context | Same patterns |
| **Styling** | Tailwind CSS 3 | Shared design system |
| **Real-time** | WebSocket | Live updates |
| **Icons** | Lucide React | Same icon library |
| **Animations** | Framer Motion | Same animations |
| **Audio** | Web Audio API + MediaRecorder | Voice input |
| **Drag & Drop** | dnd-kit | Task management |

### 1.3 Directory Structure

```
gui-ai/                              # New GUI directory (parallel to gui/)
├── client/                          # React frontend
│   ├── src/
│   │   ├── main.tsx                # Entry point
│   │   ├── App.tsx                 # Root with routing
│   │   ├── index.css               # Tailwind + shared styles
│   │   │
│   │   ├── pages/                  # Main views (8 pages)
│   │   │   ├── Dashboard.tsx       # Analytics & overview
│   │   │   ├── Chat.tsx            # Enhanced AI chat
│   │   │   ├── Tasks.tsx           # Task management
│   │   │   ├── Automation.tsx      # Templates & scheduling
│   │   │   ├── Documents.tsx       # Document management
│   │   │   ├── Messages.tsx        # Messaging hub
│   │   │   ├── Connections.tsx     # Service integrations
│   │   │   └── Settings.tsx        # User preferences
│   │   │
│   │   ├── components/
│   │   │   ├── layout/             # Panel layout (shared patterns)
│   │   │   │   ├── PanelLayout.tsx
│   │   │   │   ├── Sidebar.tsx
│   │   │   │   ├── DetailPanel.tsx
│   │   │   │   └── ResizablePanel.tsx
│   │   │   │
│   │   │   ├── dashboard/          # Dashboard widgets
│   │   │   │   ├── AnalyticsCard.tsx
│   │   │   │   ├── TaskSummaryWidget.tsx
│   │   │   │   ├── RecentActivityWidget.tsx
│   │   │   │   ├── ConnectionsWidget.tsx
│   │   │   │   └── QuickActionsWidget.tsx
│   │   │   │
│   │   │   ├── chat/               # Enhanced chat
│   │   │   │   ├── ChatContainer.tsx
│   │   │   │   ├── ChatMessage.tsx
│   │   │   │   ├── ChatInput.tsx
│   │   │   │   ├── VoiceRecorder.tsx
│   │   │   │   ├── AttachmentPreview.tsx
│   │   │   │   ├── MessageAttachment.tsx
│   │   │   │   └── SuggestedActions.tsx
│   │   │   │
│   │   │   ├── tasks/              # Task management
│   │   │   │   ├── TaskBoard.tsx
│   │   │   │   ├── TaskColumn.tsx
│   │   │   │   ├── TaskCard.tsx
│   │   │   │   ├── TaskDetailPanel.tsx
│   │   │   │   └── TaskScheduler.tsx
│   │   │   │
│   │   │   ├── automation/         # Automation system
│   │   │   │   ├── TemplatesCatalog.tsx
│   │   │   │   ├── TemplateCard.tsx
│   │   │   │   ├── TemplateWizard.tsx
│   │   │   │   ├── ScheduleBuilder.tsx
│   │   │   │   ├── QuickActionSuggestion.tsx
│   │   │   │   └── AutomationHistory.tsx
│   │   │   │
│   │   │   ├── documents/          # Document management
│   │   │   │   ├── DocumentList.tsx
│   │   │   │   ├── DocumentCard.tsx
│   │   │   │   ├── DocumentViewer.tsx
│   │   │   │   └── DocumentUpload.tsx
│   │   │   │
│   │   │   ├── messages/           # Messaging hub
│   │   │   │   ├── MessageList.tsx
│   │   │   │   ├── ConversationView.tsx
│   │   │   │   ├── ChannelSelector.tsx
│   │   │   │   └── MessageComposer.tsx
│   │   │   │
│   │   │   ├── connections/        # Service integrations
│   │   │   │   ├── ConnectionList.tsx
│   │   │   │   ├── ConnectionCard.tsx
│   │   │   │   ├── ConnectionDetail.tsx
│   │   │   │   ├── EmailPanel.tsx
│   │   │   │   ├── DrivePanel.tsx
│   │   │   │   ├── CalendarPanel.tsx
│   │   │   │   └── AddConnectionModal.tsx
│   │   │   │
│   │   │   └── common/             # Shared UI components
│   │   │       ├── SearchInput.tsx
│   │   │       ├── Badge.tsx
│   │   │       ├── Button.tsx
│   │   │       ├── Modal.tsx
│   │   │       ├── Dropdown.tsx
│   │   │       ├── LoadingSpinner.tsx
│   │   │       ├── EmptyState.tsx
│   │   │       └── ConfirmDialog.tsx
│   │   │
│   │   ├── hooks/                  # Custom React hooks
│   │   │   ├── useOpenClaw.ts      # Gateway connection
│   │   │   ├── useWebSocket.ts     # WebSocket management
│   │   │   ├── useChat.ts          # Chat state
│   │   │   ├── useTasks.ts         # Task management
│   │   │   ├── useAutomation.ts    # Automation state
│   │   │   ├── useConnections.ts   # Service connections
│   │   │   ├── useVoiceRecording.ts# Voice input
│   │   │   └── useNotifications.ts # Toast/push notifications
│   │   │
│   │   ├── stores/                 # Zustand stores
│   │   │   ├── chatStore.ts
│   │   │   ├── taskStore.ts
│   │   │   ├── automationStore.ts
│   │   │   └── notificationStore.ts
│   │   │
│   │   ├── contexts/               # React contexts
│   │   │   ├── WebSocketContext.tsx
│   │   │   ├── AuthContext.tsx
│   │   │   └── ThemeContext.tsx
│   │   │
│   │   ├── types/                  # TypeScript definitions
│   │   │   ├── chat.ts
│   │   │   ├── task.ts
│   │   │   ├── automation.ts
│   │   │   ├── connection.ts
│   │   │   └── api.ts
│   │   │
│   │   └── lib/                    # Utilities
│   │       ├── api.ts              # API client
│   │       ├── openclawClient.ts   # OpenClaw gateway client
│   │       ├── formatters.ts
│   │       └── validators.ts
│   │
│   ├── index.html
│   └── vite.config.ts
│
├── server/                          # Hono backend
│   ├── index.ts                    # Server entry
│   ├── types.ts
│   │
│   ├── routes/                     # API endpoints
│   │   ├── status.ts               # Health & status
│   │   ├── chat.ts                 # Chat API
│   │   ├── tasks.ts                # Task management
│   │   ├── automation.ts           # Automation API
│   │   ├── templates.ts            # Template catalog
│   │   ├── documents.ts            # Document management
│   │   ├── messages.ts             # Messaging
│   │   ├── connections.ts          # Service integrations
│   │   ├── quick-actions.ts        # Proactive suggestions
│   │   └── analytics.ts            # Usage analytics
│   │
│   ├── services/                   # Business logic
│   │   ├── websocket.ts            # WebSocket manager
│   │   ├── openclawProxy.ts        # OpenClaw gateway proxy
│   │   ├── taskExecutor.ts         # Task execution engine
│   │   ├── automationEngine.ts     # Automation scheduler
│   │   ├── quickActionEngine.ts    # Proactive suggestions
│   │   └── connectionManager.ts    # Service connections
│   │
│   └── lib/                        # Server utilities
│       ├── database.ts             # SQLite persistence
│       └── logger.ts
│
├── shared/                         # Shared code
│   └── types/
│       └── index.ts
│
├── templates/                      # Automation templates
│   ├── email/
│   │   ├── daily-digest.json
│   │   ├── auto-reply.json
│   │   └── follow-up.json
│   ├── calendar/
│   │   ├── meeting-prep.json
│   │   └── schedule-optimizer.json
│   ├── documents/
│   │   ├── summarize.json
│   │   └── organize.json
│   ├── research/
│   │   ├── market-research.json
│   │   └── competitor-analysis.json
│   └── general/
│       ├── task-breakdown.json
│       └── report-generation.json
│
├── package.json
├── tailwind.config.js              # SYMLINK to ../gui/tailwind.config.js
├── tsconfig.json
├── vite.config.ts
└── README.md
```

---

## 2. Design System

### 2.1 Shared Configuration

The yoyo-ai GUI will use the **exact same design system** as yoyo-dev GUI by:

1. **Symlink tailwind.config.js**: Share colors, typography, animations
2. **Copy index.css base**: Same component classes (terminal-card, etc.)
3. **Same icon library**: Lucide React with consistent usage
4. **Same animation library**: Framer Motion patterns

### 2.2 Color Palette (from yoyo-dev)

```css
/* Primary - Orange */
--primary-500: #E85D04;
--primary-400: #fb923c;
--primary-600: #d45500;

/* Accent - Gold */
--accent-500: #D29922;
--accent-400: #fbbf24;

/* Terminal (dark theme) */
--terminal-bg: #0d1117;
--terminal-card: #161b22;
--terminal-elevated: #21262d;
--terminal-border: #30363d;
--terminal-text: #e6edf3;
--terminal-text-secondary: #8b949e;

/* Semantic */
--success: #22c55e;
--warning: #D29922;
--error: #ef4444;
--info: #3b82f6;
```

### 2.3 Typography

```css
font-family: 'JetBrains Mono', 'Fira Code', monospace;
font-size-base: 14px;
line-height: 22px;
```

### 2.4 Component Patterns

All components follow yoyo-dev patterns:
- `terminal-card` - Base card styling
- `terminal-card-hover` - Hover effects
- `terminal-card-accent` - Orange left border
- `terminal-card-accent-gold` - Gold left border

---

## 3. Core Features

### 3.1 Dashboard

**Purpose**: Central hub showing analytics, recent activity, and quick actions.

**Widgets**:

| Widget | Description |
|--------|-------------|
| **Analytics Summary** | Messages sent, tasks completed, automation runs (daily/weekly/monthly) |
| **Task Overview** | Pending/Running/Completed task counts with progress |
| **Recent Activity** | Timeline of recent AI actions and user interactions |
| **Quick Actions** | AI-suggested proactive actions awaiting approval |
| **Connection Status** | Health status of connected services |
| **Upcoming Scheduled** | Next scheduled automations |

**Layout**:
```
┌─────────────────────────────────────────────────────────────┐
│  Dashboard                                       [Refresh]  │
├─────────────────────┬─────────────────────┬────────────────┤
│  Analytics          │  Tasks Overview     │ Quick Actions  │
│  ┌───────────────┐  │  ┌───────────────┐  │ ┌────────────┐ │
│  │ Messages: 142 │  │  │ Pending: 5    │  │ │ [Approve]  │ │
│  │ Tasks: 28     │  │  │ Running: 2    │  │ │ [Schedule] │ │
│  │ Auto: 12      │  │  │ Done: 45      │  │ │ [Modify]   │ │
│  └───────────────┘  │  └───────────────┘  │ └────────────┘ │
├─────────────────────┴─────────────────────┴────────────────┤
│  Recent Activity                                            │
│  ┌─────────────────────────────────────────────────────────┐│
│  │ • 2m ago: Email digest generated                        ││
│  │ • 15m ago: Document summarized                          ││
│  │ • 1h ago: Meeting prep completed                        ││
│  └─────────────────────────────────────────────────────────┘│
├─────────────────────────────────────────────────────────────┤
│  Connected Services              Scheduled Tasks            │
│  ┌──────────────────────┐       ┌──────────────────────────┐│
│  │ ✓ Gmail              │       │ Tomorrow 9am: Daily brief││
│  │ ✓ Google Drive       │       │ Mon 8am: Weekly summary  ││
│  │ ○ Calendar (setup)   │       │ Feb 15: Report deadline  ││
│  └──────────────────────┘       └──────────────────────────┘│
└─────────────────────────────────────────────────────────────┘
```

### 3.2 Enhanced Chat

**Purpose**: Rich AI chat interface with voice and attachments.

**Features**:

| Feature | Description |
|---------|-------------|
| **Voice Input** | Hold-to-record microphone with transcription |
| **Document Attachments** | Drag-drop files for AI context |
| **Suggested Actions** | Inline action buttons in AI responses |
| **Code Blocks** | Syntax-highlighted code with copy button |
| **Message Threading** | Reply to specific messages |
| **Rich Formatting** | Markdown rendering with tables, lists |
| **Chat History** | Searchable conversation history |
| **Export** | Export conversation as Markdown/PDF |

**Chat Input Bar**:
```
┌─────────────────────────────────────────────────────────────┐
│ [📎 Attach] ┌──────────────────────────────────┐ [🎤] [➤] │
│             │ Type your message...              │           │
│             └──────────────────────────────────┘           │
│ Attachments: [doc.pdf ×] [image.png ×]                     │
└─────────────────────────────────────────────────────────────┘
```

**Voice Recording UI**:
```
┌─────────────────────────────────────────────────────────────┐
│              🔴 Recording... 0:05                           │
│              ████████░░░░░░░░░░                             │
│              [Cancel]     [Send]                            │
└─────────────────────────────────────────────────────────────┘
```

### 3.3 Tasks Management

**Purpose**: View and manage AI tasks with Kanban-style board.

**Columns**:
1. **Queued** - Tasks waiting to be executed
2. **Running** - Currently executing tasks
3. **Completed** - Successfully finished tasks
4. **Failed** - Tasks that encountered errors

**Task Card**:
```
┌─────────────────────────────────────────┐
│ 📧 Send Weekly Report                   │
│ Scheduled: Mon 9:00 AM                  │
├─────────────────────────────────────────┤
│ Progress: ████████░░ 80%                │
│ Subtasks: 4/5 completed                 │
├─────────────────────────────────────────┤
│ [View] [Pause] [Cancel]                 │
└─────────────────────────────────────────┘
```

**Task Types**:
- **Manual** - User-initiated one-time tasks
- **Scheduled** - Recurring automated tasks
- **Triggered** - Event-driven tasks
- **Suggested** - AI-proposed proactive tasks

### 3.4 Automation Center

**Purpose**: Template catalog and scheduling for autonomous tasks.

#### 3.4.1 Template Catalog

**Categories**:
- 📧 **Email** - Digest, auto-reply, follow-up, filtering
- 📅 **Calendar** - Meeting prep, scheduling, reminders
- 📄 **Documents** - Summarize, organize, generate
- 🔍 **Research** - Market research, competitor analysis
- 📊 **Reports** - Weekly summaries, analytics
- 🔧 **General** - Task breakdown, data processing

**Template Card**:
```
┌─────────────────────────────────────────┐
│ 📧 Daily Email Digest                   │
│                                         │
│ Automatically summarize and categorize  │
│ your inbox every morning at 8 AM.       │
│                                         │
│ Complexity: ●●○○○ Easy                  │
│ Est. Time: ~5 minutes                   │
├─────────────────────────────────────────┤
│ [Configure] [Preview] [Use Template]    │
└─────────────────────────────────────────┘
```

#### 3.4.2 Template Wizard

Step-by-step configuration:

```
Step 1 of 4: Basic Configuration
─────────────────────────────────────────
Template: Daily Email Digest

Name your automation:
┌─────────────────────────────────────────┐
│ My Morning Digest                       │
└─────────────────────────────────────────┘

Description (optional):
┌─────────────────────────────────────────┐
│ Summarize important emails before I     │
│ start my workday                        │
└─────────────────────────────────────────┘

                         [Cancel] [Next →]
```

```
Step 2 of 4: Schedule
─────────────────────────────────────────
When should this run?

○ Once (run immediately)
● Recurring

  Frequency: [Daily ▼]
  Time: [08:00 AM ▼]
  Days: [Mon] [Tue] [Wed] [Thu] [Fri] [ ] [ ]

○ Triggered (on event)

                       [← Back] [Next →]
```

```
Step 3 of 4: Parameters
─────────────────────────────────────────
Configure email digest settings:

Include emails from:
● Last 24 hours
○ Since last digest
○ Custom: [_____] hours

Categories to include:
☑ Important/Starred
☑ From contacts
☑ With attachments
☐ Newsletters
☐ Promotions

Output format:
● Summary bullets
○ Full preview
○ Category groups

                       [← Back] [Next →]
```

```
Step 4 of 4: Review & Activate
─────────────────────────────────────────
Review your automation:

Name: My Morning Digest
Schedule: Daily at 8:00 AM (Mon-Fri)
Email Source: Last 24 hours
Categories: Important, Contacts, Attachments
Output: Summary bullets

Estimated execution time: ~5 minutes

☑ Enable notifications when complete
☐ Require approval before sending

               [← Back] [Save Draft] [Activate]
```

#### 3.4.3 Proactive Quick Actions

**Purpose**: AI-suggested actions based on context.

**Suggestion Card**:
```
┌─────────────────────────────────────────┐
│ 💡 Suggested Action                     │
├─────────────────────────────────────────┤
│ I noticed 15 unread emails from your    │
│ project team. Would you like me to:     │
│                                         │
│ • Summarize the key points              │
│ • Draft responses to urgent items       │
│ • Create tasks from action items        │
├─────────────────────────────────────────┤
│ Confidence: High (based on patterns)    │
├─────────────────────────────────────────┤
│ [Execute Now] [Schedule] [Modify] [✕]   │
└─────────────────────────────────────────┘
```

**Action Types**:
- **Immediate** - Execute right now
- **Scheduled** - Add to schedule
- **Modified** - Adjust parameters then execute
- **Dismissed** - Don't show again (learns preference)

### 3.5 Documents

**Purpose**: Manage documents that AI has access to or created.

**Features**:
- View documents from connected services (Drive, etc.)
- Upload documents for AI context
- View AI-generated documents
- Full-text search across documents
- Document preview with highlighting

**Document Card**:
```
┌─────────────────────────────────────────┐
│ 📄 Q4 Financial Report.pdf              │
│                                         │
│ Source: Google Drive                    │
│ Modified: Feb 1, 2026                   │
│ Size: 2.4 MB                            │
├─────────────────────────────────────────┤
│ [View] [Summarize] [Ask AI] [Download]  │
└─────────────────────────────────────────┘
```

### 3.6 Messages

**Purpose**: Centralized view of all messaging channels.

**Features**:
- View messages from all channels (SMS, WhatsApp, Email, etc.)
- Send messages through connected channels
- Conversation threading
- AI-assisted replies
- Message search

**Channel List**:
```
┌─────────────────────────────────────────┐
│ Channels                                │
├─────────────────────────────────────────┤
│ 📱 SMS           3 new                  │
│ 💬 WhatsApp      12 unread              │
│ 📧 Email         45 unread              │
│ 💼 Slack         Connected              │
└─────────────────────────────────────────┘
```

### 3.7 Connections

**Purpose**: Manage connected services and view their status.

**Connected Service Card**:
```
┌─────────────────────────────────────────┐
│ 📧 Gmail                     ● Connected│
│ user@company.com                        │
├─────────────────────────────────────────┤
│ Permissions:                            │
│ ✓ Read emails                           │
│ ✓ Send emails                           │
│ ✓ Manage labels                         │
├─────────────────────────────────────────┤
│ Recent Activity:                        │
│ • 142 emails processed today            │
│ • 5 auto-replies sent                   │
│ • Last sync: 2 minutes ago              │
├─────────────────────────────────────────┤
│ [Open Gmail] [View Logs] [Disconnect]   │
└─────────────────────────────────────────┘
```

**Service Types**:
- 📧 **Email**: Gmail, Outlook
- 📁 **Storage**: Google Drive, Dropbox, OneDrive
- 📅 **Calendar**: Google Calendar, Outlook Calendar
- 💬 **Messaging**: SMS, WhatsApp, Slack, Teams
- 📋 **Tasks**: Todoist, Asana, Trello
- 🔗 **Other**: Custom webhooks, APIs

---

## 4. API Design

### 4.1 Backend Routes

```typescript
// Status & Health
GET  /api/status                    // Gateway status, connected services
GET  /api/health                    // Server health check

// Chat
GET  /api/chat/history              // Conversation history
POST /api/chat/message              // Send message
POST /api/chat/voice                // Upload voice recording
GET  /api/chat/suggestions          // Get suggested responses

// Tasks
GET  /api/tasks                     // List all tasks
GET  /api/tasks/:id                 // Get task details
POST /api/tasks                     // Create manual task
PUT  /api/tasks/:id                 // Update task
DELETE /api/tasks/:id               // Cancel task
POST /api/tasks/:id/pause           // Pause running task
POST /api/tasks/:id/resume          // Resume paused task

// Automation
GET  /api/automation/templates      // List template catalog
GET  /api/automation/templates/:id  // Get template details
GET  /api/automation/active         // List active automations
POST /api/automation/create         // Create from template
PUT  /api/automation/:id            // Update automation
DELETE /api/automation/:id          // Delete automation
POST /api/automation/:id/run        // Run automation now

// Quick Actions
GET  /api/quick-actions             // Get pending suggestions
POST /api/quick-actions/:id/execute // Execute suggestion
POST /api/quick-actions/:id/schedule// Schedule suggestion
POST /api/quick-actions/:id/dismiss // Dismiss suggestion
PUT  /api/quick-actions/:id/modify  // Modify and execute

// Documents
GET  /api/documents                 // List documents
GET  /api/documents/:id             // Get document
POST /api/documents/upload          // Upload document
POST /api/documents/:id/summarize   // Summarize document
POST /api/documents/:id/ask         // Ask AI about document

// Messages
GET  /api/messages/channels         // List connected channels
GET  /api/messages/:channel         // Get messages from channel
POST /api/messages/:channel/send    // Send message
GET  /api/messages/search           // Search all messages

// Connections
GET  /api/connections               // List all connections
GET  /api/connections/:id           // Get connection details
POST /api/connections/:id/refresh   // Refresh connection
DELETE /api/connections/:id         // Disconnect service
GET  /api/connections/:id/activity  // Get recent activity

// Analytics
GET  /api/analytics/summary         // Dashboard summary stats
GET  /api/analytics/activity        // Recent activity feed
GET  /api/analytics/usage           // Usage over time
```

### 4.2 WebSocket Events

```typescript
// Client → Server
{ type: 'subscribe', channel: 'tasks' }
{ type: 'subscribe', channel: 'chat' }
{ type: 'subscribe', channel: 'quick-actions' }
{ type: 'ping' }

// Server → Client
{ type: 'connected', payload: { clientId, timestamp } }
{ type: 'pong' }

// Task Events
{ type: 'task:created', payload: { task } }
{ type: 'task:updated', payload: { taskId, changes } }
{ type: 'task:progress', payload: { taskId, progress, message } }
{ type: 'task:completed', payload: { taskId, result } }
{ type: 'task:failed', payload: { taskId, error } }

// Chat Events
{ type: 'chat:message', payload: { message } }
{ type: 'chat:typing', payload: { isTyping } }
{ type: 'chat:stream', payload: { chunk } }

// Quick Action Events
{ type: 'quick-action:suggested', payload: { action } }
{ type: 'quick-action:executed', payload: { actionId, result } }

// Connection Events
{ type: 'connection:status', payload: { connectionId, status } }
{ type: 'connection:activity', payload: { connectionId, activity } }
```

### 4.3 OpenClaw Gateway Proxy

The backend will proxy requests to the OpenClaw gateway:

```typescript
// server/services/openclawProxy.ts
export class OpenClawProxy {
  private baseUrl: string;
  private token: string;

  constructor() {
    this.baseUrl = `http://127.0.0.1:${process.env.OPENCLAW_PORT || 18789}`;
    this.token = process.env.OPENCLAW_GATEWAY_TOKEN || '';
  }

  async sendMessage(message: string, attachments?: File[]) {
    // Proxy to OpenClaw agent
  }

  async getChannels() {
    // Get connected messaging channels
  }

  async sendToChannel(channel: string, target: string, message: string) {
    // Send message via channel
  }

  async executeSkill(skillName: string, params: object) {
    // Execute OpenClaw skill
  }
}
```

---

## 5. Template System

### 5.1 Template Schema

```typescript
interface AutomationTemplate {
  id: string;
  name: string;
  description: string;
  category: 'email' | 'calendar' | 'documents' | 'research' | 'reports' | 'general';
  icon: string;
  complexity: 1 | 2 | 3 | 4 | 5;
  estimatedDuration: string;

  // Required connections
  requiredConnections: string[];

  // Configuration steps
  steps: TemplateStep[];

  // Default schedule
  defaultSchedule?: Schedule;

  // OpenClaw skill to execute
  skill: string;

  // Default parameters
  defaultParams: Record<string, unknown>;
}

interface TemplateStep {
  id: string;
  title: string;
  description: string;
  fields: TemplateField[];
}

interface TemplateField {
  name: string;
  label: string;
  type: 'text' | 'number' | 'select' | 'multiselect' | 'boolean' | 'time' | 'date' | 'schedule';
  required: boolean;
  default?: unknown;
  options?: { value: string; label: string }[];
  validation?: {
    min?: number;
    max?: number;
    pattern?: string;
  };
  helpText?: string;
}

interface Schedule {
  type: 'once' | 'recurring' | 'triggered';
  // For recurring
  frequency?: 'hourly' | 'daily' | 'weekly' | 'monthly';
  time?: string;
  days?: number[]; // 0-6 for weekly
  dayOfMonth?: number;
  // For triggered
  trigger?: {
    event: string;
    conditions?: Record<string, unknown>;
  };
}
```

### 5.2 Example Template

```json
{
  "id": "daily-email-digest",
  "name": "Daily Email Digest",
  "description": "Automatically summarize and categorize your inbox every morning",
  "category": "email",
  "icon": "📧",
  "complexity": 2,
  "estimatedDuration": "5 minutes",
  "requiredConnections": ["gmail"],
  "steps": [
    {
      "id": "schedule",
      "title": "Schedule",
      "description": "When should the digest be generated?",
      "fields": [
        {
          "name": "scheduleTime",
          "label": "Time",
          "type": "time",
          "required": true,
          "default": "08:00"
        },
        {
          "name": "scheduleDays",
          "label": "Days",
          "type": "multiselect",
          "required": true,
          "default": [1, 2, 3, 4, 5],
          "options": [
            { "value": "0", "label": "Sunday" },
            { "value": "1", "label": "Monday" },
            { "value": "2", "label": "Tuesday" },
            { "value": "3", "label": "Wednesday" },
            { "value": "4", "label": "Thursday" },
            { "value": "5", "label": "Friday" },
            { "value": "6", "label": "Saturday" }
          ]
        }
      ]
    },
    {
      "id": "source",
      "title": "Email Source",
      "description": "Which emails should be included?",
      "fields": [
        {
          "name": "timeRange",
          "label": "Include emails from",
          "type": "select",
          "required": true,
          "default": "24h",
          "options": [
            { "value": "24h", "label": "Last 24 hours" },
            { "value": "since_last", "label": "Since last digest" },
            { "value": "custom", "label": "Custom time range" }
          ]
        },
        {
          "name": "categories",
          "label": "Categories",
          "type": "multiselect",
          "required": true,
          "default": ["important", "contacts"],
          "options": [
            { "value": "important", "label": "Important/Starred" },
            { "value": "contacts", "label": "From contacts" },
            { "value": "attachments", "label": "With attachments" },
            { "value": "newsletters", "label": "Newsletters" },
            { "value": "promotions", "label": "Promotions" }
          ]
        }
      ]
    },
    {
      "id": "output",
      "title": "Output Format",
      "description": "How should the digest be formatted?",
      "fields": [
        {
          "name": "format",
          "label": "Format",
          "type": "select",
          "required": true,
          "default": "summary",
          "options": [
            { "value": "summary", "label": "Summary bullets" },
            { "value": "preview", "label": "Full preview" },
            { "value": "grouped", "label": "Category groups" }
          ]
        },
        {
          "name": "maxItems",
          "label": "Maximum items",
          "type": "number",
          "required": false,
          "default": 20,
          "validation": { "min": 5, "max": 100 }
        }
      ]
    }
  ],
  "defaultSchedule": {
    "type": "recurring",
    "frequency": "daily",
    "time": "08:00",
    "days": [1, 2, 3, 4, 5]
  },
  "skill": "email-digest",
  "defaultParams": {
    "timeRange": "24h",
    "categories": ["important", "contacts"],
    "format": "summary",
    "maxItems": 20
  }
}
```

---

## 6. Implementation Phases

### Phase 1: Foundation (Week 1-2)

**Goals**: Project setup, design system, basic layout

**Tasks**:
1. Create `gui-ai/` directory structure
2. Set up Vite + React + TypeScript
3. Configure Tailwind with shared design system
4. Implement PanelLayout with sidebar
5. Create routing structure
6. Set up Hono backend with basic routes
7. Implement WebSocket connection
8. Create OpenClaw gateway proxy service

**Deliverables**:
- Working development environment
- Basic navigation between pages
- Connection to OpenClaw gateway verified

### Phase 2: Dashboard & Chat (Week 3-4)

**Goals**: Core user interaction features

**Tasks**:
1. Build Dashboard page with widgets
2. Implement analytics summary
3. Create enhanced Chat interface
4. Add voice recording functionality
5. Implement file attachments
6. Build message streaming
7. Add chat history persistence

**Deliverables**:
- Functional Dashboard with real data
- Chat with voice and attachments working

### Phase 3: Tasks & Automation (Week 5-6)

**Goals**: Task management and automation system

**Tasks**:
1. Build Tasks Kanban board
2. Implement task state management
3. Create Automation Center page
4. Build template catalog UI
5. Implement template wizard
6. Create schedule builder component
7. Build automation engine service

**Deliverables**:
- Task management fully functional
- Template system working end-to-end

### Phase 4: Quick Actions & Connections (Week 7-8)

**Goals**: Proactive AI and service integrations

**Tasks**:
1. Build Quick Actions suggestion system
2. Create suggestion cards UI
3. Implement action execution flow
4. Build Connections page
5. Create service connection cards
6. Implement connection activity views
7. Add service-specific panels (Email, Drive, etc.)

**Deliverables**:
- Proactive suggestions working
- All connection types supported

### Phase 5: Documents & Messages (Week 9-10)

**Goals**: Document and messaging features

**Tasks**:
1. Build Documents page
2. Implement document upload
3. Add document preview/viewer
4. Create document AI features (summarize, ask)
5. Build Messages hub
6. Implement channel views
7. Add message composition
8. Create conversation threading

**Deliverables**:
- Document management complete
- Messaging hub functional

### Phase 6: Polish & Integration (Week 11-12)

**Goals**: Refinement, testing, deployment

**Tasks**:
1. Performance optimization
2. Error handling improvements
3. Loading states and skeletons
4. Accessibility improvements
5. End-to-end testing
6. Integration with yoyo-ai launcher
7. Documentation
8. Production build configuration

**Deliverables**:
- Production-ready GUI
- Integration with `yoyo-ai --dashboard` command

---

## 7. Integration Points

### 7.1 Launcher Integration

Update `setup/yoyo-ai.sh` to launch the new GUI:

```bash
# New dashboard command
yoyo-ai --dashboard    # Launch YoYo AI Workspace (new GUI)
yoyo-ai --dashboard-dev # Launch in development mode

# Legacy OpenClaw dashboard (deprecated)
yoyo-ai --openclaw-ui   # Launch original OpenClaw control panel
```

### 7.2 Port Configuration

```
YoYo Dev GUI:      http://localhost:5173 (dev) / 3456 (prod)
YoYo AI Workspace: http://localhost:5174 (dev) / 3457 (prod)
OpenClaw Gateway:  http://localhost:18789
```

### 7.3 Theme Injection

The existing theme injection system (`setup/openclaw-theme/`) remains for the OpenClaw control panel. The new GUI uses the shared Tailwind config directly.

---

## 8. Success Metrics

### User Experience
- [ ] Dashboard loads in <2 seconds
- [ ] Chat responses stream in real-time
- [ ] Voice recording works on all major browsers
- [ ] File attachments support common formats
- [ ] All views are responsive (desktop, tablet)

### Functionality
- [ ] All 7 core pages implemented
- [ ] Template catalog with 15+ templates
- [ ] Quick actions suggestion system working
- [ ] All connection types supported
- [ ] Full task lifecycle management

### Integration
- [ ] OpenClaw gateway proxy working
- [ ] WebSocket events for all features
- [ ] Launcher integration complete
- [ ] Shared design system consistent

---

## 9. Open Questions

1. **Authentication**: Should the GUI have its own auth or rely entirely on OpenClaw gateway token?
2. **Offline Support**: Should we cache data for offline viewing?
3. **Mobile**: Should we plan for a mobile-responsive design or native app later?
4. **Notifications**: Browser notifications for task completion and suggestions?
5. **Multi-user**: Will this need to support team/organization accounts?

---

## Appendix A: Component Specifications

### A.1 VoiceRecorder Component

```typescript
interface VoiceRecorderProps {
  onRecordingComplete: (audioBlob: Blob, duration: number) => void;
  onTranscription?: (text: string) => void;
  maxDuration?: number; // seconds, default 120
  showWaveform?: boolean;
}
```

### A.2 TemplateWizard Component

```typescript
interface TemplateWizardProps {
  template: AutomationTemplate;
  onComplete: (config: AutomationConfig) => void;
  onCancel: () => void;
  initialValues?: Partial<AutomationConfig>;
}
```

### A.3 QuickActionCard Component

```typescript
interface QuickActionCardProps {
  action: QuickAction;
  onExecute: () => void;
  onSchedule: () => void;
  onModify: () => void;
  onDismiss: () => void;
}
```

---

## Appendix B: Database Schema

```sql
-- Local SQLite for GUI state persistence

CREATE TABLE chat_history (
  id TEXT PRIMARY KEY,
  role TEXT NOT NULL,
  content TEXT NOT NULL,
  attachments TEXT, -- JSON array
  timestamp INTEGER NOT NULL
);

CREATE TABLE tasks (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  type TEXT NOT NULL,
  status TEXT NOT NULL,
  progress INTEGER DEFAULT 0,
  config TEXT, -- JSON
  result TEXT, -- JSON
  error TEXT,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,
  scheduled_at INTEGER,
  completed_at INTEGER
);

CREATE TABLE automations (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  template_id TEXT NOT NULL,
  config TEXT NOT NULL, -- JSON
  schedule TEXT, -- JSON
  enabled INTEGER DEFAULT 1,
  last_run INTEGER,
  next_run INTEGER,
  created_at INTEGER NOT NULL
);

CREATE TABLE quick_actions (
  id TEXT PRIMARY KEY,
  type TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  confidence REAL NOT NULL,
  params TEXT, -- JSON
  status TEXT DEFAULT 'pending',
  created_at INTEGER NOT NULL,
  actioned_at INTEGER
);

CREATE TABLE documents (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  source TEXT NOT NULL,
  connection_id TEXT,
  path TEXT,
  size INTEGER,
  mime_type TEXT,
  summary TEXT,
  created_at INTEGER NOT NULL,
  modified_at INTEGER NOT NULL
);
```

---

*End of Implementation Plan*
