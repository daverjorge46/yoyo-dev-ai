# YoYoAI Workspace GUI

A modern, glass-morphism styled React application for interacting with the YoYoAI assistant via the OpenClaw gateway.

## Features

- 💬 **Real-time Chat** - WebSocket-powered messaging with YoYo
- 📁 **Session Management** - Create, view, and manage chat sessions
- 🌐 **Gateway Status** - Live connection status monitoring
- 📎 **File Attachments** - Send images and documents
- 🌓 **Dark/Light Mode** - Toggle between themes
- 📱 **Responsive Design** - Works on desktop, tablet, and mobile
- 🔮 **Glass-morphism UI** - Modern, beautiful interface

## Tech Stack

- React 18 + TypeScript
- Vite (build tool)
- Tailwind CSS (styling)
- React Query (data fetching)
- Zustand (state management)
- React Router (navigation)
- WebSocket (real-time communication)

## Quick Start

### 1. Install Dependencies

```bash
npm install
```

### 2. Configure Environment

Copy the example environment file and configure as needed:

```bash
cp .env.example .env
```

Edit `.env` to set your OpenClaw gateway URL and token.

### 3. Start Development Server

```bash
npm run dev
```

The app will be available at `http://localhost:5173`

### 4. Build for Production

```bash
npm run build
```

## Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `VITE_GATEWAY_URL` | OpenClaw gateway URL | `http://localhost:18789` |
| `VITE_GATEWAY_TOKEN` | Gateway authentication token | - |
| `VITE_WS_URL` | WebSocket URL (derived from gateway) | `ws://localhost:18789` |

## Project Structure

```
src/
├── components/          # Reusable UI components
│   ├── layout/         # Layout components (Sidebar, Header)
│   ├── chat/           # Chat-specific components
│   └── ui/             # Generic UI components
├── hooks/              # Custom React hooks
├── services/           # API and WebSocket services
├── stores/             # Zustand state stores
├── types/              # TypeScript type definitions
├── pages/              # Route pages
├── utils/              # Utility functions
└── styles/             # Global styles
```

## API Endpoints

The app connects to the OpenClaw gateway:

- `GET /api/sessions` - List chat sessions
- `POST /api/sessions` - Create new session
- `GET /api/sessions/:id/messages` - Get session messages
- `POST /api/sessions/:id/messages` - Send message
- `GET /api/gateway/status` - Gateway health/status
- `WS /ws` - WebSocket for real-time updates

## Color Scheme

- **Primary Cyan**: `#0891b2`
- **Primary Purple**: `#7c3aed`
- **Background Dark**: `#0f172a`
- **Background Light**: `#f8fafc`

## License

MIT - YoYoAI Project
