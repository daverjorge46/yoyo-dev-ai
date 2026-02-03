# YoYo AI Dashboard GUI - Task Breakdown

## Phase 1: Foundation

### 1.1 Project Setup
- [ ] Create `gui-ai/` directory structure
- [ ] Initialize package.json with dependencies
- [ ] Configure Vite with TypeScript
- [ ] Set up tsconfig.json (client + server)
- [ ] Create symlink to gui/tailwind.config.js
- [ ] Copy and adapt index.css from gui/
- [ ] Configure PostCSS

### 1.2 Layout System
- [ ] Create PanelLayout component (port from gui/)
- [ ] Create Sidebar component with navigation
- [ ] Create DetailPanel component
- [ ] Create ResizablePanel component
- [ ] Implement PanelLayoutContext
- [ ] Set up React Router with 8 routes

### 1.3 Backend Foundation
- [ ] Create Hono server entry point
- [ ] Configure middleware (logger, CORS)
- [ ] Create WebSocket endpoint
- [ ] Implement WebSocket manager
- [ ] Create status route
- [ ] Create health check route

### 1.4 OpenClaw Integration
- [ ] Create OpenClawProxy service
- [ ] Read gateway token from ~/.yoyo-ai/.gateway-token
- [ ] Implement connection health check
- [ ] Create gateway status endpoint
- [ ] Test connectivity to port 18789

### 1.5 Common Components
- [ ] Create Button component
- [ ] Create Badge component
- [ ] Create SearchInput component
- [ ] Create Modal component
- [ ] Create LoadingSpinner component
- [ ] Create EmptyState component
- [ ] Create ConfirmDialog component

---

## Phase 2: Dashboard & Chat

### 2.1 Dashboard Page
- [ ] Create Dashboard page layout
- [ ] Build AnalyticsCard widget
- [ ] Build TaskSummaryWidget
- [ ] Build RecentActivityWidget
- [ ] Build ConnectionsWidget
- [ ] Build QuickActionsWidget (preview)
- [ ] Implement dashboard data fetching

### 2.2 Analytics API
- [ ] Create /api/analytics/summary endpoint
- [ ] Create /api/analytics/activity endpoint
- [ ] Create /api/analytics/usage endpoint
- [ ] Implement analytics data aggregation

### 2.3 Chat Page
- [ ] Create Chat page layout
- [ ] Build ChatContainer component
- [ ] Build ChatMessage component
- [ ] Build ChatInput component
- [ ] Implement markdown rendering
- [ ] Implement code block syntax highlighting
- [ ] Add copy-to-clipboard for code blocks

### 2.4 Voice Recording
- [ ] Create VoiceRecorder component
- [ ] Implement MediaRecorder API
- [ ] Add waveform visualization
- [ ] Create recording UI (timer, cancel, send)
- [ ] Create /api/chat/voice endpoint
- [ ] Implement voice-to-text (or pass to OpenClaw)

### 2.5 File Attachments
- [ ] Create AttachmentPreview component
- [ ] Create FileDropzone for drag-drop
- [ ] Implement file upload to /api/chat/upload
- [ ] Create MessageAttachment display
- [ ] Support images, PDFs, documents

### 2.6 Chat Streaming
- [ ] Implement SSE/streaming for chat responses
- [ ] Create useChatStream hook
- [ ] Add typing indicator
- [ ] Implement message chunking display

### 2.7 Chat Persistence
- [ ] Create chat_history SQLite table
- [ ] Create /api/chat/history endpoint
- [ ] Implement chat load on page mount
- [ ] Add clear history functionality

---

## Phase 3: Tasks & Automation

### 3.1 Task Data Model
- [ ] Create tasks SQLite table
- [ ] Define Task TypeScript types
- [ ] Create taskStore (Zustand)
- [ ] Create useTasks hook

### 3.2 Task API
- [ ] Create GET /api/tasks
- [ ] Create GET /api/tasks/:id
- [ ] Create POST /api/tasks
- [ ] Create PUT /api/tasks/:id
- [ ] Create DELETE /api/tasks/:id
- [ ] Create POST /api/tasks/:id/pause
- [ ] Create POST /api/tasks/:id/resume

### 3.3 Tasks Page
- [ ] Create Tasks page layout
- [ ] Build TaskBoard component (Kanban)
- [ ] Build TaskColumn component
- [ ] Build TaskCard component
- [ ] Implement drag-drop with dnd-kit
- [ ] Build TaskDetailPanel
- [ ] Add task filtering/search

### 3.4 Task Executor
- [ ] Create TaskExecutor service
- [ ] Implement task queue
- [ ] Integrate with OpenClaw skills
- [ ] Emit WebSocket progress events
- [ ] Handle task completion/failure

### 3.5 Automation Data Model
- [ ] Create automations SQLite table
- [ ] Define Automation TypeScript types
- [ ] Create automationStore
- [ ] Create useAutomation hook

### 3.6 Template System
- [ ] Create templates/ directory
- [ ] Define template JSON schema
- [ ] Create 15+ initial templates:
  - [ ] Email: daily-digest, auto-reply, follow-up
  - [ ] Calendar: meeting-prep, schedule-optimizer
  - [ ] Documents: summarize, organize
  - [ ] Research: market-research, competitor-analysis
  - [ ] Reports: weekly-summary, analytics
  - [ ] General: task-breakdown, report-generation

### 3.7 Automation API
- [ ] Create GET /api/automation/templates
- [ ] Create GET /api/automation/templates/:id
- [ ] Create GET /api/automation/active
- [ ] Create POST /api/automation/create
- [ ] Create PUT /api/automation/:id
- [ ] Create DELETE /api/automation/:id
- [ ] Create POST /api/automation/:id/run

### 3.8 Automation Page
- [ ] Create Automation page layout
- [ ] Build TemplatesCatalog component
- [ ] Build TemplateCard component
- [ ] Build TemplateWizard component
- [ ] Implement multi-step wizard flow
- [ ] Build ScheduleBuilder component
- [ ] Build AutomationHistory component

### 3.9 Automation Engine
- [ ] Create AutomationEngine service
- [ ] Implement cron-style scheduler
- [ ] Handle recurring schedules
- [ ] Handle triggered automations
- [ ] Integrate with TaskExecutor

---

## Phase 4: Quick Actions & Connections

### 4.1 Quick Actions Data Model
- [ ] Create quick_actions SQLite table
- [ ] Define QuickAction TypeScript types
- [ ] Create quickActionStore
- [ ] Create useQuickActions hook

### 4.2 Quick Actions API
- [ ] Create GET /api/quick-actions
- [ ] Create POST /api/quick-actions/:id/execute
- [ ] Create POST /api/quick-actions/:id/schedule
- [ ] Create POST /api/quick-actions/:id/dismiss
- [ ] Create PUT /api/quick-actions/:id/modify

### 4.3 Quick Actions Engine
- [ ] Create QuickActionEngine service
- [ ] Implement suggestion generation logic
- [ ] Integrate with OpenClaw for context
- [ ] Learn from dismissal patterns
- [ ] Emit WebSocket suggestion events

### 4.4 Quick Actions UI
- [ ] Build QuickActionSuggestion component
- [ ] Create suggestion card layout
- [ ] Implement execute/schedule/modify/dismiss actions
- [ ] Add animation for new suggestions
- [ ] Integrate with Dashboard widget

### 4.5 Connections Data Model
- [ ] Define Connection TypeScript types
- [ ] Create useConnections hook
- [ ] Map OpenClaw channels to connections

### 4.6 Connections API
- [ ] Create GET /api/connections
- [ ] Create GET /api/connections/:id
- [ ] Create POST /api/connections/:id/refresh
- [ ] Create DELETE /api/connections/:id
- [ ] Create GET /api/connections/:id/activity

### 4.7 Connections Page
- [ ] Create Connections page layout
- [ ] Build ConnectionList component
- [ ] Build ConnectionCard component
- [ ] Build ConnectionDetail component
- [ ] Build AddConnectionModal component

### 4.8 Service-Specific Panels
- [ ] Build EmailPanel component
- [ ] Build DrivePanel component
- [ ] Build CalendarPanel component
- [ ] Build custom panel framework

---

## Phase 5: Documents & Messages

### 5.1 Documents Data Model
- [ ] Create documents SQLite table
- [ ] Define Document TypeScript types
- [ ] Create useDocuments hook

### 5.2 Documents API
- [ ] Create GET /api/documents
- [ ] Create GET /api/documents/:id
- [ ] Create POST /api/documents/upload
- [ ] Create POST /api/documents/:id/summarize
- [ ] Create POST /api/documents/:id/ask

### 5.3 Documents Page
- [ ] Create Documents page layout
- [ ] Build DocumentList component
- [ ] Build DocumentCard component
- [ ] Build DocumentUpload component
- [ ] Build DocumentViewer component
- [ ] Implement document search

### 5.4 Messages Data Model
- [ ] Define Message TypeScript types
- [ ] Define Channel TypeScript types
- [ ] Create useMessages hook

### 5.5 Messages API
- [ ] Create GET /api/messages/channels
- [ ] Create GET /api/messages/:channel
- [ ] Create POST /api/messages/:channel/send
- [ ] Create GET /api/messages/search

### 5.6 Messages Page
- [ ] Create Messages page layout
- [ ] Build ChannelSelector component
- [ ] Build MessageList component
- [ ] Build ConversationView component
- [ ] Build MessageComposer component
- [ ] Implement AI-assisted replies

---

## Phase 6: Polish & Integration

### 6.1 Error Handling
- [ ] Create global error boundary
- [ ] Implement toast notifications
- [ ] Add retry logic for failed requests
- [ ] Handle WebSocket disconnection gracefully

### 6.2 Loading States
- [ ] Create skeleton loaders for all pages
- [ ] Add loading states to all data fetching
- [ ] Implement optimistic updates

### 6.3 Performance
- [ ] Implement React.memo for expensive components
- [ ] Add virtualization for long lists
- [ ] Optimize bundle size
- [ ] Add code splitting for routes

### 6.4 Accessibility
- [ ] Add ARIA labels to all interactive elements
- [ ] Ensure keyboard navigation works
- [ ] Test with screen reader
- [ ] Add focus indicators

### 6.5 Testing
- [ ] Set up Vitest configuration
- [ ] Write unit tests for hooks
- [ ] Write unit tests for services
- [ ] Write component tests
- [ ] Write E2E tests for critical flows

### 6.6 Launcher Integration
- [ ] Update setup/yoyo-ai.sh with --dashboard flag
- [ ] Create development mode launcher
- [ ] Create production build script
- [ ] Configure port 3457 for production

### 6.7 Documentation
- [ ] Write README.md for gui-ai/
- [ ] Document API endpoints
- [ ] Document template creation
- [ ] Update main README with new GUI info

### 6.8 Production Build
- [ ] Configure Vite production build
- [ ] Set up static file serving
- [ ] Create startup script
- [ ] Test production deployment

---

## Summary

| Phase | Tasks | Estimated |
|-------|-------|-----------|
| Phase 1: Foundation | 25 tasks | Week 1-2 |
| Phase 2: Dashboard & Chat | 28 tasks | Week 3-4 |
| Phase 3: Tasks & Automation | 36 tasks | Week 5-6 |
| Phase 4: Quick Actions & Connections | 26 tasks | Week 7-8 |
| Phase 5: Documents & Messages | 20 tasks | Week 9-10 |
| Phase 6: Polish & Integration | 26 tasks | Week 11-12 |
| **Total** | **161 tasks** | **12 weeks** |
