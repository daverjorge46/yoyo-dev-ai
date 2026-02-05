// OpenClaw Gateway WebSocket RPC Protocol Types
// Reverse-engineered from OpenClaw Control UI source

// --- Frame Types ---

export interface RequestFrame {
  type: 'req';
  id: string;
  method: string;
  params?: unknown;
}

export interface ResponseFrame {
  type: 'res';
  id: string;
  ok: boolean;
  payload?: unknown;
  error?: GatewayError;
}

export interface EventFrame {
  type: 'event';
  event: string;
  payload?: unknown;
  seq?: number;
  stateVersion?: {
    presence: number;
    health: number;
  };
}

export type Frame = RequestFrame | ResponseFrame | EventFrame;

export interface GatewayError {
  code: string;
  message: string;
  details?: unknown;
  retryable?: boolean;
  retryAfterMs?: number;
}

// --- Connection Types ---

export interface ConnectParams {
  minProtocol: number;
  maxProtocol: number;
  client: ClientInfo;
  caps: string[];
  role: string;
  scopes: string[];
  auth: AuthParams;
}

export interface ClientInfo {
  id: string;
  displayName: string;
  version: string;
  platform: string;
  mode: string;
  instanceId: string;
}

export interface AuthParams {
  token: string;
}

export interface HelloPayload {
  server?: {
    version?: string;
    host?: string;
    connId?: string;
  };
  policy?: {
    tickIntervalMs: number;
  };
}

// --- Connection State ---

export type ConnectionState = 'disconnected' | 'connecting' | 'connected' | 'error';

// --- Event Types ---

export interface TickEvent {
  ts: number;
}

export interface ChatEvent {
  runId: string;
  sessionKey: string;
  seq: number;
  state: 'delta' | 'final' | 'aborted' | 'error';
  message?: {
    role: string;
    content: string;
  };
  usage?: {
    inputTokens: number;
    outputTokens: number;
  };
  toolCalls?: ToolCall[];
}

export interface AgentEvent {
  runId: string;
  seq: number;
  stream: string;
  ts: number;
  data: unknown;
}

export interface ToolCall {
  id: string;
  name: string;
  arguments: string;
  result?: string;
}

// --- RPC Method Types ---

// Health
export interface HealthResponse {
  ok: boolean;
  version?: string;
  uptime?: number;
  [key: string]: unknown;
}

// Status
export interface StatusResponse {
  version?: string;
  uptime?: number;
  gateway?: {
    bindAddress?: string;
    port?: number;
  };
  agents?: {
    defaults?: {
      model?: {
        primary?: string;
        fallback?: string[];
      };
    };
    list?: Array<{
      id?: string;
      key?: string;
      model?: string;
    }>;
    defaultId?: string;
  };
  [key: string]: unknown;
}

// Agents
export interface Agent {
  id: string;
  key: string;
  name?: string;
  isDefault?: boolean;
  identity?: {
    name?: string;
    avatar?: string;
  };
  model?: string;
  heartbeatInterval?: string;
  sessionStore?: string;
  channels?: string[];
  skills?: string[];
  tools?: AgentTool[];
  cronJobs?: CronJob[];
  [key: string]: unknown;
}

export interface AgentsListResponse {
  agents: Agent[];
  defaultId?: string;
  mainKey?: string;
  scope?: string;
}

export interface AgentFile {
  path: string;
  size?: number;
  modifiedAt?: string;
  [key: string]: unknown;
}

export interface AgentFilesListResponse {
  files: AgentFile[];
}

export interface AgentFileGetResponse {
  path: string;
  content: string;
  [key: string]: unknown;
}

export interface AgentTool {
  name: string;
  description?: string;
  parameters?: unknown;
  [key: string]: unknown;
}

// Sessions
export interface Session {
  key: string;
  id?: string;
  agentId?: string;
  model?: string;
  messageCount?: number;
  tokenUsage?: {
    input?: number;
    output?: number;
    total?: number;
  };
  lastActivity?: string;
  createdAt?: string;
  label?: string;
  [key: string]: unknown;
}

export interface SessionsListParams {
  limit?: number;
  activeMinutes?: number;
  includeGlobal?: boolean;
  includeUnknown?: boolean;
  label?: string;
  agentId?: string;
  search?: string;
}

export interface SessionsListResponse {
  sessions: Session[];
}

export interface SessionPreviewResponse {
  messages: Array<{
    role: string;
    content: string;
    timestamp?: string;
  }>;
}

// Channels
export interface Channel {
  type: string;
  name?: string;
  status: 'connected' | 'disconnected' | 'error' | 'unknown';
  account?: string;
  phone?: string;
  username?: string;
  authAge?: string;
  configured?: boolean;
  linked?: boolean;
  running?: boolean;
  connected?: boolean;
  [key: string]: unknown;
}

export interface ChannelsStatusParams {
  probe?: boolean;
  timeoutMs?: number;
}

export interface ChannelsStatusResponse {
  /** Gateway returns channels as an object keyed by channel type, e.g. { whatsapp: { ... } } */
  channels: Record<string, Omit<Channel, 'type'>> | Channel[];
  channelMeta?: Array<{ id: string; label: string; [key: string]: unknown }>;
  [key: string]: unknown;
}

/** Convert the gateway channels response (object or array) into a normalized Channel array */
export function normalizeChannels(raw: ChannelsStatusResponse['channels'] | undefined): Channel[] {
  if (!raw) return [];
  if (Array.isArray(raw)) return raw;
  return Object.entries(raw).map(([type, data]) => ({
    ...data,
    type,
    status: data.connected ? 'connected' as const
      : data.running ? 'disconnected' as const
      : 'unknown' as const,
  }));
}

// Models
export interface Model {
  id: string;
  name?: string;
  provider?: string;
  capabilities?: {
    vision?: boolean;
    tools?: boolean;
    streaming?: boolean;
  };
  contextWindow?: number;
  [key: string]: unknown;
}

export interface ModelsListResponse {
  models: Model[];
}

// Skills
export interface Skill {
  name: string;
  description?: string;
  enabled?: boolean;
  version?: string;
  commands?: string[];
  [key: string]: unknown;
}

export interface SkillsStatusResponse {
  skills: Skill[];
  [key: string]: unknown;
}

export interface SkillsBinsResponse {
  bins: Skill[];
  [key: string]: unknown;
}

// Cron
export interface CronJob {
  id?: string;
  name: string;
  expression?: string;
  schedule?: string;
  enabled?: boolean;
  agentId?: string;
  command?: string;
  nextRun?: string;
  lastRun?: string;
  lastResult?: string;
  [key: string]: unknown;
}

export interface CronListResponse {
  jobs: CronJob[];
}

export interface CronStatusResponse {
  running: boolean;
  jobCount: number;
  [key: string]: unknown;
}

export interface CronRunsResponse {
  runs: Array<{
    id: string;
    jobId: string;
    startedAt: string;
    completedAt?: string;
    duration?: number;
    status: 'success' | 'failure' | 'running';
    output?: string;
  }>;
}

// System Presence
export interface PresenceClient {
  id: string;
  displayName?: string;
  mode?: string;
  connectedAt?: string;
  [key: string]: unknown;
}

export interface SystemPresenceResponse {
  clients: PresenceClient[];
}

// Logs
export interface LogsResponse {
  entries: LogEntry[];
  cursor?: string;
}

export interface LogEntry {
  timestamp: string;
  level: string;
  message: string;
  source?: string;
  [key: string]: unknown;
}

// Chat
export interface ChatSendParams {
  sessionKey: string;
  message: string;
  idempotencyKey: string;
  deliver?: boolean;
  attachments?: unknown[];
  model?: string;
}

export interface ChatSendResponse {
  runId: string;
  sessionKey: string;
  [key: string]: unknown;
}

export interface ChatHistoryParams {
  sessionKey: string;
  limit?: number;
}

export interface ChatHistoryResponse {
  messages: Array<{
    role: string;
    content: string;
    timestamp?: string;
    toolCalls?: ToolCall[];
  }>;
}

// Config
export interface ConfigGetResponse {
  value: unknown;
  schema?: unknown;
}

// Gateway Token (our Hono endpoint)
export interface GatewayTokenResponse {
  token: string;
  gatewayUrl: string;
}
