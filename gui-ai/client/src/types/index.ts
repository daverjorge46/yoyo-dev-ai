// Task types
export interface Task {
  id: string;
  name: string;
  description?: string;
  type: 'manual' | 'scheduled' | 'triggered' | 'suggested';
  status: 'queued' | 'running' | 'completed' | 'failed' | 'paused';
  progress: number;
  config?: Record<string, unknown>;
  result?: Record<string, unknown>;
  error?: string;
  createdAt: string;
  updatedAt: string;
  scheduledAt?: string;
  completedAt?: string;
}

// Automation types
export interface AutomationTemplate {
  id: string;
  name: string;
  description: string;
  category: 'email' | 'calendar' | 'documents' | 'research' | 'reports' | 'general';
  icon: string;
  complexity: 1 | 2 | 3 | 4 | 5;
  estimatedDuration: string;
  requiredConnections: string[];
  steps: TemplateStep[];
  defaultSchedule?: Schedule;
  skill: string;
  defaultParams: Record<string, unknown>;
}

export interface TemplateStep {
  id: string;
  title: string;
  description: string;
  fields: TemplateField[];
}

export interface TemplateField {
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

export interface Schedule {
  type: 'once' | 'recurring' | 'triggered';
  frequency?: 'hourly' | 'daily' | 'weekly' | 'monthly';
  time?: string;
  days?: number[];
  dayOfMonth?: number;
  trigger?: {
    event: string;
    conditions?: Record<string, unknown>;
  };
}

export interface Automation {
  id: string;
  name: string;
  templateId: string;
  config: Record<string, unknown>;
  schedule?: Schedule;
  enabled: boolean;
  lastRun?: string;
  nextRun?: string;
  createdAt: string;
}

// Quick Action types
export interface QuickAction {
  id: string;
  type: string;
  title: string;
  description: string;
  confidence: number;
  params?: Record<string, unknown>;
  status: 'pending' | 'executed' | 'scheduled' | 'dismissed';
  createdAt: string;
  actionedAt?: string;
}

// Chat types
export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  attachments?: Attachment[];
  suggestedActions?: SuggestedAction[];
  timestamp: string;
}

export interface Attachment {
  id: string;
  name: string;
  type: string;
  size: number;
  url?: string;
}

export interface SuggestedAction {
  id: string;
  label: string;
  action: string;
  params?: Record<string, unknown>;
}

// Document types
export interface Document {
  id: string;
  name: string;
  source: 'upload' | 'drive' | 'email' | 'generated';
  connectionId?: string;
  path?: string;
  size: number;
  mimeType: string;
  summary?: string;
  createdAt: string;
  modifiedAt: string;
}

// Message types
export interface Channel {
  id: string;
  type: 'sms' | 'whatsapp' | 'email' | 'slack' | 'teams';
  name: string;
  connected: boolean;
  unreadCount: number;
}

export interface Message {
  id: string;
  channelId: string;
  from: string;
  to: string;
  content: string;
  timestamp: string;
  read: boolean;
}

// Connection types
export interface Connection {
  id: string;
  type: 'email' | 'calendar' | 'storage' | 'messaging' | 'tasks' | 'other';
  provider: string;
  name: string;
  account?: string;
  connected: boolean;
  permissions: string[];
  lastSync?: string;
  stats?: {
    itemsProcessed?: number;
    actionsToday?: number;
  };
}

// Analytics types
export interface AnalyticsSummary {
  messagesProcessed: number;
  tasksCompleted: number;
  automationsRun: number;
  period: 'today' | 'week' | 'month';
}

export interface ActivityItem {
  id: string;
  type: 'task' | 'automation' | 'message' | 'connection';
  title: string;
  description?: string;
  timestamp: string;
  status?: 'success' | 'warning' | 'error';
}

// API response types
export interface ApiResponse<T> {
  data?: T;
  error?: string;
  message?: string;
}
