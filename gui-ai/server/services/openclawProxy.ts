import fs from 'fs';
import path from 'path';
import os from 'os';

const YOYO_AI_HOME = process.env.YOYO_AI_HOME || path.join(os.homedir(), '.yoyo-ai');
const OPENCLAW_PORT = process.env.OPENCLAW_PORT || '18789';
const TOKEN_FILE = path.join(YOYO_AI_HOME, '.gateway-token');

interface OpenClawResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
}

export class OpenClawProxy {
  private baseUrl: string;
  private token: string | null = null;

  constructor() {
    this.baseUrl = `http://127.0.0.1:${OPENCLAW_PORT}`;
    this.loadToken();
  }

  private loadToken(): void {
    try {
      if (fs.existsSync(TOKEN_FILE)) {
        this.token = fs.readFileSync(TOKEN_FILE, 'utf-8').trim();
      }
    } catch (error) {
      console.error('Failed to load OpenClaw token:', error);
    }
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<OpenClawResponse<T>> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...(options.headers as Record<string, string>),
    };

    if (this.token) {
      headers['Authorization'] = `Bearer ${this.token}`;
    }

    try {
      const response = await fetch(`${this.baseUrl}${endpoint}`, {
        ...options,
        headers,
        signal: AbortSignal.timeout(30000), // 30 second timeout
      });

      if (!response.ok) {
        return {
          success: false,
          error: `HTTP ${response.status}: ${response.statusText}`,
        };
      }

      const data = await response.json();
      return { success: true, data };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  async isHealthy(): Promise<boolean> {
    const result = await this.request('/health');
    return result.success;
  }

  async getStatus(): Promise<OpenClawResponse<{
    version: string;
    status: string;
    channels: string[];
  }>> {
    return this.request('/status');
  }

  // Chat/Agent methods
  async sendMessage(message: string, context?: Record<string, unknown>): Promise<OpenClawResponse<{
    response: string;
    suggestedActions?: Array<{ label: string; action: string }>;
  }>> {
    return this.request('/agent/message', {
      method: 'POST',
      body: JSON.stringify({ message, context }),
    });
  }

  async streamMessage(
    message: string,
    context?: Record<string, unknown>,
    onChunk?: (chunk: string) => void
  ): Promise<OpenClawResponse<string>> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'Accept': 'text/event-stream',
    };

    if (this.token) {
      headers['Authorization'] = `Bearer ${this.token}`;
    }

    try {
      const response = await fetch(`${this.baseUrl}/agent/message/stream`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ message, context }),
      });

      if (!response.ok || !response.body) {
        return { success: false, error: 'Stream failed' };
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let fullResponse = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value);
        fullResponse += chunk;
        onChunk?.(chunk);
      }

      return { success: true, data: fullResponse };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Stream error',
      };
    }
  }

  // Channels/Messaging methods
  async getChannels(): Promise<OpenClawResponse<Array<{
    id: string;
    type: string;
    name: string;
    connected: boolean;
  }>>> {
    return this.request('/channels');
  }

  async sendToChannel(
    channelId: string,
    target: string,
    message: string
  ): Promise<OpenClawResponse<{ messageId: string }>> {
    return this.request(`/channels/${channelId}/send`, {
      method: 'POST',
      body: JSON.stringify({ target, message }),
    });
  }

  async getChannelMessages(
    channelId: string,
    options?: { limit?: number; before?: string }
  ): Promise<OpenClawResponse<Array<{
    id: string;
    from: string;
    to: string;
    content: string;
    timestamp: string;
  }>>> {
    const params = new URLSearchParams();
    if (options?.limit) params.set('limit', String(options.limit));
    if (options?.before) params.set('before', options.before);

    return this.request(`/channels/${channelId}/messages?${params}`);
  }

  // Skills/Automation methods
  async listSkills(): Promise<OpenClawResponse<Array<{
    id: string;
    name: string;
    description: string;
    params: Record<string, unknown>;
  }>>> {
    return this.request('/skills');
  }

  async executeSkill(
    skillId: string,
    params: Record<string, unknown>
  ): Promise<OpenClawResponse<{
    taskId: string;
    status: string;
  }>> {
    return this.request(`/skills/${skillId}/execute`, {
      method: 'POST',
      body: JSON.stringify(params),
    });
  }

  async getTaskStatus(taskId: string): Promise<OpenClawResponse<{
    id: string;
    status: 'pending' | 'running' | 'completed' | 'failed';
    progress?: number;
    result?: unknown;
    error?: string;
  }>> {
    return this.request(`/tasks/${taskId}`);
  }

  // Connection/Auth methods
  async initiateOAuth(provider: string, redirectUrl: string): Promise<OpenClawResponse<{
    authUrl: string;
    state: string;
  }>> {
    return this.request('/connections/oauth/initiate', {
      method: 'POST',
      body: JSON.stringify({ provider, redirectUrl }),
    });
  }

  async completeOAuth(provider: string, code: string, state: string): Promise<OpenClawResponse<{
    connectionId: string;
    account: string;
  }>> {
    return this.request('/connections/oauth/complete', {
      method: 'POST',
      body: JSON.stringify({ provider, code, state }),
    });
  }

  async getConnections(): Promise<OpenClawResponse<Array<{
    id: string;
    provider: string;
    account: string;
    connected: boolean;
  }>>> {
    return this.request('/connections');
  }

  async disconnectConnection(connectionId: string): Promise<OpenClawResponse<void>> {
    return this.request(`/connections/${connectionId}`, {
      method: 'DELETE',
    });
  }
}

// Singleton instance
export const openclawProxy = new OpenClawProxy();
