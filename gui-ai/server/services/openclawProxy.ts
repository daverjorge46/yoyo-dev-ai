import fs from 'fs';
import path from 'path';
import os from 'os';
import { spawn, exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

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

  /**
   * Check if OpenClaw gateway is running using the CLI
   */
  async isHealthy(): Promise<boolean> {
    try {
      const { stdout } = await execAsync('openclaw health', {
        timeout: 15000,
        env: { ...process.env, PATH: process.env.PATH },
      });
      // If health returns without error and contains "WhatsApp" or any channel info, it's healthy
      return stdout.includes('WhatsApp') || stdout.includes('Gateway') || stdout.includes('Agents');
    } catch (error) {
      console.error('OpenClaw health check failed:', error);
      return false;
    }
  }

  /**
   * Get OpenClaw status using the CLI
   */
  async getStatus(): Promise<OpenClawResponse<{
    version: string;
    status: string;
    channels: string[];
    whatsapp?: { linked: boolean; phone?: string };
  }>> {
    try {
      const { stdout } = await execAsync('openclaw health', {
        timeout: 15000,
        env: { ...process.env, PATH: process.env.PATH },
      });

      // Parse the health output
      const whatsappMatch = stdout.match(/WhatsApp:\s*(\w+)/i);
      const phoneMatch = stdout.match(/Web Channel:\s*(\+\d+)/);

      const status = {
        version: '2026.x',
        status: 'running',
        channels: [] as string[],
        whatsapp: undefined as { linked: boolean; phone?: string } | undefined,
      };

      if (whatsappMatch) {
        status.channels.push('whatsapp');
        status.whatsapp = {
          linked: whatsappMatch[1].toLowerCase() === 'linked',
          phone: phoneMatch ? phoneMatch[1] : undefined,
        };
      }

      return { success: true, data: status };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to get status',
      };
    }
  }

  /**
   * Send a message to the OpenClaw agent using the CLI
   */
  async sendMessage(
    message: string,
    context?: Record<string, unknown> & { model?: string }
  ): Promise<OpenClawResponse<{
    response: string;
    suggestedActions?: Array<{ label: string; action: string }>;
  }>> {
    return new Promise((resolve) => {
      // Escape message for shell
      const escapedMessage = message.replace(/"/g, '\\"').replace(/\$/g, '\\$').replace(/`/g, '\\`');

      // Use openclaw agent command with default agent
      // --agent main uses the main agent session
      // --session-id creates a GUI-specific session
      const sessionId = 'yoyo-ai-gui';
      const args = [
        'agent',
        '--message', message,
        '--session-id', sessionId,
        '--json',
      ];

      // Add model parameter if specified
      if (context?.model) {
        args.push('--model', context.model);
      }

      const agentProcess = spawn('openclaw', args, {
        timeout: 120000, // 2 minute timeout
        env: { ...process.env, PATH: process.env.PATH },
      });

      let stdout = '';
      let stderr = '';

      agentProcess.stdout.on('data', (data) => {
        stdout += data.toString();
      });

      agentProcess.stderr.on('data', (data) => {
        stderr += data.toString();
      });

      agentProcess.on('close', (code) => {
        if (code === 0 && stdout) {
          try {
            // Try to parse JSON output from openclaw agent --json
            const jsonMatch = stdout.match(/\{[\s\S]*\}/);
            if (jsonMatch) {
              const result = JSON.parse(jsonMatch[0]);

              // Extract the actual text response from OpenClaw's nested structure
              let responseText = '';

              // OpenClaw returns: { result: { payloads: [{ text: "..." }] } }
              if (result.result?.payloads?.[0]?.text) {
                responseText = result.result.payloads[0].text;
              }
              // Fallback to other possible formats
              else if (result.response) {
                responseText = result.response;
              }
              else if (result.content) {
                responseText = result.content;
              }
              else if (result.message) {
                responseText = result.message;
              }
              else {
                // Last resort: use the whole output
                responseText = stdout.trim();
              }

              resolve({
                success: true,
                data: {
                  response: responseText,
                  suggestedActions: result.suggestedActions,
                },
              });
            } else {
              // No JSON, use raw output
              resolve({
                success: true,
                data: {
                  response: stdout.trim(),
                },
              });
            }
          } catch {
            // JSON parse failed, use raw output
            resolve({
              success: true,
              data: {
                response: stdout.trim(),
              },
            });
          }
        } else {
          resolve({
            success: false,
            error: stderr || `Command exited with code ${code}`,
          });
        }
      });

      agentProcess.on('error', (error) => {
        resolve({
          success: false,
          error: error.message,
        });
      });

      // Timeout after 2 minutes
      setTimeout(() => {
        agentProcess.kill();
        resolve({
          success: false,
          error: 'Request timed out',
        });
      }, 120000);
    });
  }

  /**
   * Stream a message to the OpenClaw agent (falls back to non-streaming)
   */
  async streamMessage(
    message: string,
    context?: Record<string, unknown>,
    onChunk?: (chunk: string) => void
  ): Promise<OpenClawResponse<string>> {
    // For now, just use the regular sendMessage
    // Streaming would require WebSocket implementation
    const result = await this.sendMessage(message, context);
    if (result.success && result.data) {
      onChunk?.(result.data.response);
      return { success: true, data: result.data.response };
    }
    return { success: false, error: result.error };
  }

  /**
   * Get channels status using CLI
   */
  async getChannels(): Promise<OpenClawResponse<Array<{
    id: string;
    type: string;
    name: string;
    connected: boolean;
  }>>> {
    try {
      const { stdout } = await execAsync('openclaw health', {
        timeout: 15000,
        env: { ...process.env, PATH: process.env.PATH },
      });

      const channels = [];

      // Parse WhatsApp status
      const whatsappMatch = stdout.match(/WhatsApp:\s*(\w+)/i);
      if (whatsappMatch) {
        const phoneMatch = stdout.match(/Web Channel:\s*(\+\d+)/);
        channels.push({
          id: 'whatsapp-1',
          type: 'whatsapp',
          name: 'WhatsApp',
          connected: whatsappMatch[1].toLowerCase() === 'linked',
          phone: phoneMatch ? phoneMatch[1] : undefined,
        });
      }

      return { success: true, data: channels };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to get channels',
      };
    }
  }

  /**
   * Get sessions using CLI
   */
  async getSessions(): Promise<OpenClawResponse<Array<{
    id: string;
    kind: string;
    age: string;
    model: string;
    tokens: string;
  }>>> {
    try {
      const { stdout } = await execAsync('openclaw sessions --json 2>/dev/null', {
        timeout: 10000,
      });

      try {
        const result = JSON.parse(stdout);
        return { success: true, data: result.sessions || [] };
      } catch {
        // Parse text output if JSON fails
        return { success: true, data: [] };
      }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to get sessions',
      };
    }
  }

  // Legacy methods for compatibility (not implemented via CLI)
  async sendToChannel(
    channelId: string,
    target: string,
    message: string
  ): Promise<OpenClawResponse<{ messageId: string }>> {
    return {
      success: false,
      error: 'Direct channel messaging not implemented in GUI. Use the CLI: openclaw message send',
    };
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
    return { success: false, error: 'Not implemented' };
  }

  async listSkills(): Promise<OpenClawResponse<Array<{
    id: string;
    name: string;
    description: string;
    params: Record<string, unknown>;
  }>>> {
    return { success: false, error: 'Not implemented' };
  }

  async executeSkill(
    skillId: string,
    params: Record<string, unknown>
  ): Promise<OpenClawResponse<{
    taskId: string;
    status: string;
  }>> {
    return { success: false, error: 'Not implemented' };
  }

  async getTaskStatus(taskId: string): Promise<OpenClawResponse<{
    id: string;
    status: 'pending' | 'running' | 'completed' | 'failed';
    progress?: number;
    result?: unknown;
    error?: string;
  }>> {
    return { success: false, error: 'Not implemented' };
  }

  async initiateOAuth(provider: string, redirectUrl: string): Promise<OpenClawResponse<{
    authUrl: string;
    state: string;
  }>> {
    return { success: false, error: 'Not implemented' };
  }

  async completeOAuth(provider: string, code: string, state: string): Promise<OpenClawResponse<{
    connectionId: string;
    account: string;
  }>> {
    return { success: false, error: 'Not implemented' };
  }

  async getConnections(): Promise<OpenClawResponse<Array<{
    id: string;
    provider: string;
    account: string;
    connected: boolean;
  }>>> {
    return { success: false, error: 'Not implemented' };
  }

  async disconnectConnection(connectionId: string): Promise<OpenClawResponse<void>> {
    return { success: false, error: 'Not implemented' };
  }
}

// Singleton instance
export const openclawProxy = new OpenClawProxy();
