# Yoyo Dev GUI

Browser-based dashboard for Yoyo Dev framework.

## Architecture

```
gui/
├── server/              # Hono backend
│   ├── index.ts         # Server entry point
│   ├── routes/          # API routes
│   │   ├── status.ts    # Project status endpoints
│   │   ├── specs.ts     # Specifications endpoints
│   │   ├── tasks.ts     # Tasks endpoints
│   │   ├── memory.ts    # Memory system endpoints
│   │   └── skills.ts    # Skills system endpoints
│   └── services/        # Business logic
│       ├── project.ts   # Project info service
│       ├── specs.ts     # Specs service
│       └── memory.ts    # Memory service
│
├── client/              # React frontend
│   ├── src/
│   │   ├── App.tsx
│   │   ├── components/  # UI components
│   │   ├── pages/       # Page components
│   │   ├── hooks/       # Custom hooks
│   │   └── api/         # API client
│   ├── index.html
│   └── vite.config.ts
│
└── package.json         # Shared dependencies
```

## API Endpoints

### Status
- `GET /api/status` - Overall project status
- `GET /api/status/framework` - Framework status
- `GET /api/status/memory` - Memory system status

### Specifications
- `GET /api/specs` - List all specifications
- `GET /api/specs/:id` - Get specification details
- `GET /api/specs/:id/tasks` - Get tasks for a spec

### Tasks
- `GET /api/tasks` - List all tasks (across specs)
- `GET /api/tasks/:specId/:taskId` - Get task details
- `PATCH /api/tasks/:specId/:taskId` - Update task status

### Memory
- `GET /api/memory` - List all memory blocks
- `GET /api/memory/:type` - Get specific block (project, persona, user)
- `PUT /api/memory/:type` - Update memory block

### Skills
- `GET /api/skills` - List all skills
- `GET /api/skills/stats` - Get aggregate statistics
- `GET /api/skills/:id` - Get skill details

## Running

```bash
# Development
yoyo gui --dev

# Production
yoyo gui

# Custom port
yoyo gui --port 3001
```

## Tech Stack

- **Backend**: Hono + Node.js
- **Frontend**: React 18 + Vite + Tailwind CSS
- **State**: TanStack Query (React Query)
- **Icons**: Lucide React
