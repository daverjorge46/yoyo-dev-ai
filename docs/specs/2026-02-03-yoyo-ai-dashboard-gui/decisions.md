# YoYo AI Dashboard GUI - Technical Decisions

## Decision Log

### D001: Separate GUI Directory vs. Monorepo

**Decision**: Create `gui-ai/` as a separate directory parallel to `gui/`

**Rationale**:
- Clear separation of concerns (dev tools vs. AI assistant workspace)
- Independent deployment cycles
- Different port allocation (5174/3457 vs. 5173/3456)
- Easier to maintain and evolve independently
- Can share design system via symlinks without tight coupling

**Alternatives Considered**:
- Monorepo with shared packages - Added complexity
- Single GUI with mode switching - Confusing UX, harder to maintain

---

### D002: Design System Sharing Strategy

**Decision**: Symlink `tailwind.config.js` and adapt `index.css`

**Rationale**:
- Ensures identical colors, fonts, and spacing
- Changes to design system propagate automatically
- Reduced duplication
- Allows for GUI-specific component classes if needed

**Implementation**:
```bash
cd gui-ai
ln -s ../gui/tailwind.config.js tailwind.config.js
```

---

### D003: OpenClaw Integration Approach

**Decision**: Backend proxy to OpenClaw gateway, not direct frontend calls

**Rationale**:
- Security: Token not exposed to browser
- Flexibility: Can add caching, transformation, error handling
- Consistency: All API calls through our backend
- Future-proofing: Easy to swap or augment OpenClaw

**Implementation**:
- `OpenClawProxy` service in backend
- Read token from `~/.yoyo-ai/.gateway-token`
- All OpenClaw calls go through `/api/*` routes

---

### D004: State Management Architecture

**Decision**: Zustand for UI state, React Query for server state, Context for global config

**Rationale**:
- Same pattern as yoyo-dev GUI (developer familiarity)
- Zustand: Lightweight, no boilerplate, great DevTools
- React Query: Automatic caching, refetching, optimistic updates
- Context: Simple for auth/theme/WebSocket (rarely changes)

**Store Allocation**:
| Store | Type | Purpose |
|-------|------|---------|
| chatStore | Zustand | Active chat session, typing state |
| taskStore | Zustand | Task UI state, selected task |
| automationStore | Zustand | Wizard state, selected template |
| notificationStore | Zustand | Toast queue, alerts |
| Server data | React Query | Tasks, automations, messages, etc. |
| Auth/Theme/WS | Context | Global, rarely-changing state |

---

### D005: Voice Recording Implementation

**Decision**: Native Web Audio API + MediaRecorder

**Rationale**:
- No external dependencies
- Good browser support (Chrome, Firefox, Edge, Safari)
- Full control over recording quality
- Can implement waveform visualization with Web Audio API

**Technical Details**:
- Format: WebM/Opus (best compression) with WAV fallback
- Max duration: 120 seconds (configurable)
- Real-time waveform using AnalyserNode
- Transcription: Either client-side (Web Speech API) or server-side via OpenClaw

---

### D006: Template Schema Design

**Decision**: JSON-based templates with typed schema

**Rationale**:
- Easy to create and edit
- Version controlled
- Can be contributed by users
- Strongly typed in TypeScript

**Schema Highlights**:
- Declarative field definitions
- Built-in validation rules
- Default values
- Help text for guidance
- Mapping to OpenClaw skills

---

### D007: Quick Actions Suggestion Algorithm

**Decision**: Rule-based + pattern learning hybrid

**Rationale**:
- Rules: Predictable, explainable suggestions
- Learning: Adapts to user preferences over time
- Dismissal tracking to avoid repeating unwanted suggestions

**Initial Rules**:
- Unread email threshold → suggest digest
- Multiple emails from same sender → suggest summary
- Calendar gap before meeting → suggest prep
- Document without summary → suggest summarize
- Repeated manual task → suggest automation

---

### D008: Database Choice

**Decision**: SQLite via better-sqlite3 (same as yoyo-dev GUI)

**Rationale**:
- No separate database server needed
- File-based, easy backup
- Good for local-first applications
- Proven in yoyo-dev GUI
- Sufficient for single-user workstation

**Tables**:
- `chat_history` - Conversation persistence
- `tasks` - Task state and results
- `automations` - Saved automation configs
- `quick_actions` - Suggestion history
- `documents` - Document metadata

---

### D009: WebSocket vs. Polling

**Decision**: WebSocket for real-time, with polling fallback

**Rationale**:
- Real-time updates for tasks, chat, suggestions
- Lower latency than polling
- Reduced server load
- Fallback ensures reliability

**Events**:
- Task progress updates
- Chat message streaming
- New quick action suggestions
- Connection status changes

---

### D010: Port Allocation

**Decision**: 5174 (dev) / 3457 (prod) for YoYo AI Workspace

**Rationale**:
- Clear separation from yoyo-dev GUI (5173/3456)
- Sequential numbering for easy memory
- No conflict with OpenClaw gateway (18789)

**Full Port Map**:
| Service | Dev Port | Prod Port |
|---------|----------|-----------|
| YoYo Dev GUI | 5173 | 3456 |
| YoYo AI Workspace | 5174 | 3457 |
| OpenClaw Gateway | 18789 | 18789 |

---

### D011: Authentication Strategy

**Decision**: Rely on OpenClaw gateway token + optional session

**Rationale**:
- Single source of truth (OpenClaw token)
- No additional auth system to maintain
- Optional session for preferences/UI state
- Secure: Token stored in file, read by backend only

**Implementation**:
- Backend reads `~/.yoyo-ai/.gateway-token` on startup
- Frontend never sees token
- Optional: Browser session for UI preferences

---

### D012: File Attachment Handling

**Decision**: Upload to backend, store temporarily, reference in chat

**Rationale**:
- Files processed server-side for AI context
- Not persisting large files in SQLite
- Temporary storage with TTL
- Can extract text from PDFs, images (OCR later)

**Flow**:
1. User drops file
2. Upload to `/api/chat/upload`
3. Server stores in temp directory
4. Returns reference ID
5. Chat message includes reference
6. AI can access file via reference
7. Files cleaned up after 24h

---

### D013: Automation Execution Model

**Decision**: Job queue with persistent state

**Rationale**:
- Survives server restart
- Can pause/resume
- Progress tracking
- Error recovery
- Audit trail

**Components**:
- `TaskExecutor`: Runs individual tasks
- `AutomationEngine`: Schedules recurring tasks
- `QuickActionEngine`: Generates and manages suggestions
- All persist state to SQLite

---

## Open Decisions

### OD001: Mobile Support

**Status**: Deferred

**Options**:
1. Responsive web design (phase 1)
2. PWA with offline support (phase 2)
3. Native mobile app (future)

**Current Plan**: Start with responsive desktop, evaluate mobile needs later.

---

### OD002: Multi-User Support

**Status**: Deferred

**Options**:
1. Single-user (current)
2. Multi-user with shared instance
3. Multi-tenant with isolated data

**Current Plan**: Single-user for initial release. Architecture allows for multi-user later.

---

### OD003: Notification System

**Status**: Pending

**Options**:
1. In-app only (toasts)
2. Browser notifications
3. System notifications (via OpenClaw)
4. All of the above

**Recommendation**: Start with in-app + browser notifications, add system later.
