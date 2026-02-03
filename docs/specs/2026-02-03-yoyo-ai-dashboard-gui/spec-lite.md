# YoYo AI Dashboard GUI - Spec Lite

## Overview

**YoYo AI Workspace** - A comprehensive dashboard GUI replacing OpenClaw's default control panel. Same design system as yoyo-dev GUI, focused on user experience.

## Tech Stack

- **Frontend**: React 18 + TypeScript + Vite (same as yoyo-dev GUI)
- **Backend**: Hono 4 + Node.js
- **Styling**: Tailwind CSS (shared config with yoyo-dev)
- **State**: Zustand + React Query + Context
- **Real-time**: WebSocket

## Core Features

### 1. Dashboard
- Analytics (messages, tasks, automations)
- Task overview (pending/running/completed)
- Quick actions widget
- Connection status
- Recent activity feed

### 2. Enhanced Chat
- Voice input (hold-to-record)
- Document attachments
- Message streaming
- Suggested actions
- Chat history

### 3. Tasks
- Kanban board (Queued/Running/Completed/Failed)
- Task types: Manual, Scheduled, Triggered, Suggested
- Pause/Resume/Cancel controls
- Progress tracking

### 4. Automation Center
- Template catalog (Email, Calendar, Documents, Research, Reports, General)
- Step-by-step wizard configuration
- Schedule builder
- Automation history

### 5. Quick Actions
- AI-suggested proactive actions
- Execute/Schedule/Modify/Dismiss
- Confidence indicators
- Learning from dismissals

### 6. Documents
- View from connected services
- Upload for AI context
- Summarize/Ask AI features
- Document preview

### 7. Messages
- Unified inbox (SMS, WhatsApp, Email, Slack)
- Channel views
- AI-assisted replies

### 8. Connections
- Service integration management
- Connection status
- Activity logs
- Service-specific panels

## Directory Structure

```
gui-ai/
├── client/src/
│   ├── pages/          (8 pages)
│   ├── components/     (layout, chat, tasks, automation, etc.)
│   ├── hooks/          (useOpenClaw, useChat, useTasks, etc.)
│   ├── stores/         (Zustand stores)
│   └── types/
├── server/
│   ├── routes/         (API endpoints)
│   └── services/       (OpenClaw proxy, task executor, etc.)
└── templates/          (Automation templates JSON)
```

## API Endpoints

```
/api/status              - Gateway status
/api/chat/*              - Chat operations
/api/tasks/*             - Task management
/api/automation/*        - Automation CRUD
/api/quick-actions/*     - Proactive suggestions
/api/documents/*         - Document management
/api/messages/*          - Messaging hub
/api/connections/*       - Service integrations
/api/analytics/*         - Usage stats
```

## Ports

- YoYo AI Workspace: 5174 (dev) / 3457 (prod)
- OpenClaw Gateway: 18789

## Phases

1. Foundation (setup, layout, routing)
2. Dashboard & Chat (core interactions)
3. Tasks & Automation (template system)
4. Quick Actions & Connections
5. Documents & Messages
6. Polish & Integration
