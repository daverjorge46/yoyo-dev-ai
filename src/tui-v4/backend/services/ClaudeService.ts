/**
 * Claude Service
 *
 * Manages Claude Code subprocess for chat integration:
 * - Spawns Claude Code with --print flag for streaming output
 * - Parses JSON responses
 * - Handles tool approval requests
 * - Manages connection state and reconnection
 */

import { spawn, ChildProcess } from 'child_process';
import { EventEmitter } from 'events';
import type { ChatMessage, ToolCall } from '../state-manager.js';

// =============================================================================
// Types
// =============================================================================

export interface ClaudeServiceEvents {
  connected: () => void;
  disconnected: () => void;
  message: (message: ChatMessage) => void;
  toolApproval: (tool: ToolCall, messageId: string) => void;
  error: (error: Error) => void;
  thinking: (isThinking: boolean) => void;
}

interface StreamChunk {
  type: 'assistant' | 'tool_use' | 'tool_result' | 'error' | 'done';
  content?: string;
  tool?: {
    id: string;
    name: string;
    input: Record<string, unknown>;
  };
  result?: string;
  error?: string;
}

// =============================================================================
// Claude Service Class
// =============================================================================

export class ClaudeService extends EventEmitter {
  private process: ChildProcess | null = null;
  private isConnected: boolean = false;
  private currentMessageId: string | null = null;
  private buffer: string = '';
  private reconnectAttempts: number = 0;
  private maxReconnectAttempts: number = 3;
  private workingDirectory: string;

  constructor(workingDirectory: string = process.cwd()) {
    super();
    this.workingDirectory = workingDirectory;
  }

  /**
   * Check if Claude Code CLI is installed
   */
  async isClaudeInstalled(): Promise<boolean> {
    try {
      const { exec } = await import('child_process');
      const { promisify } = await import('util');
      const execAsync = promisify(exec);

      await execAsync('which claude');
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Connect to Claude Code subprocess
   */
  async connect(): Promise<boolean> {
    if (this.isConnected) {
      return true;
    }

    const installed = await this.isClaudeInstalled();
    if (!installed) {
      this.emit('error', new Error('Claude Code CLI is not installed'));
      return false;
    }

    try {
      // Spawn claude with --print for machine-readable output
      this.process = spawn('claude', ['--print'], {
        cwd: this.workingDirectory,
        stdio: ['pipe', 'pipe', 'pipe'],
        env: {
          ...process.env,
          // Disable colors for easier parsing
          NO_COLOR: '1',
          FORCE_COLOR: '0',
        },
      });

      this.setupEventHandlers();
      this.isConnected = true;
      this.reconnectAttempts = 0;
      this.emit('connected');

      return true;
    } catch (error) {
      this.emit('error', error instanceof Error ? error : new Error(String(error)));
      return false;
    }
  }

  /**
   * Setup event handlers for the subprocess
   */
  private setupEventHandlers(): void {
    if (!this.process) return;

    // Handle stdout (main output)
    this.process.stdout?.on('data', (data: Buffer) => {
      this.handleOutput(data.toString());
    });

    // Handle stderr (errors and debug info)
    this.process.stderr?.on('data', (data: Buffer) => {
      const text = data.toString();
      // Claude Code sometimes writes progress to stderr
      if (text.includes('Thinking') || text.includes('Working')) {
        this.emit('thinking', true);
      }
    });

    // Handle process exit
    this.process.on('exit', (code, signal) => {
      this.handleDisconnect(code, signal);
    });

    // Handle errors
    this.process.on('error', (error) => {
      this.emit('error', error);
      this.handleDisconnect(null, null);
    });
  }

  /**
   * Handle output from Claude process
   */
  private handleOutput(data: string): void {
    this.buffer += data;

    // Process complete lines
    const lines = this.buffer.split('\n');
    this.buffer = lines.pop() || ''; // Keep incomplete line in buffer

    for (const line of lines) {
      if (!line.trim()) continue;
      this.parseLine(line);
    }
  }

  /**
   * Parse a single line of output
   */
  private parseLine(line: string): void {
    // Try to parse as JSON first
    try {
      const chunk: StreamChunk = JSON.parse(line);
      this.handleChunk(chunk);
      return;
    } catch {
      // Not JSON, treat as plain text response
    }

    // Handle plain text output (Claude's response)
    if (this.currentMessageId) {
      const message: ChatMessage = {
        id: this.currentMessageId,
        role: 'assistant',
        content: line,
        timestamp: new Date().toISOString(),
        isStreaming: true,
      };
      this.emit('message', message);
    }
  }

  /**
   * Handle parsed JSON chunk
   */
  private handleChunk(chunk: StreamChunk): void {
    switch (chunk.type) {
      case 'assistant':
        this.emit('thinking', false);
        if (chunk.content) {
          const message: ChatMessage = {
            id: this.currentMessageId || this.generateId(),
            role: 'assistant',
            content: chunk.content,
            timestamp: new Date().toISOString(),
          };
          this.emit('message', message);
        }
        break;

      case 'tool_use':
        if (chunk.tool) {
          const tool: ToolCall = {
            id: chunk.tool.id,
            name: chunk.tool.name,
            parameters: chunk.tool.input,
            status: 'pending',
          };
          this.emit('toolApproval', tool, this.currentMessageId || '');
        }
        break;

      case 'tool_result':
        // Tool result received - update status
        break;

      case 'error':
        const errorMessage: ChatMessage = {
          id: this.generateId(),
          role: 'system',
          content: `Error: ${chunk.error || 'Unknown error'}`,
          timestamp: new Date().toISOString(),
        };
        this.emit('message', errorMessage);
        break;

      case 'done':
        this.emit('thinking', false);
        this.currentMessageId = null;
        break;
    }
  }

  /**
   * Handle disconnect
   */
  private handleDisconnect(code: number | null, signal: string | null): void {
    this.isConnected = false;
    this.process = null;
    this.emit('disconnected');

    // Attempt reconnection if not graceful exit
    if (code !== 0 && this.reconnectAttempts < this.maxReconnectAttempts) {
      this.reconnectAttempts++;
      setTimeout(() => this.connect(), 1000 * this.reconnectAttempts);
    }
  }

  /**
   * Send a message to Claude
   */
  async sendMessage(content: string): Promise<void> {
    if (!this.isConnected || !this.process?.stdin) {
      throw new Error('Not connected to Claude');
    }

    // Generate new message ID
    this.currentMessageId = this.generateId();
    this.emit('thinking', true);

    // Write message to stdin
    this.process.stdin.write(content + '\n');
  }

  /**
   * Approve a tool call
   */
  async approveTool(toolId: string): Promise<void> {
    if (!this.isConnected || !this.process?.stdin) {
      throw new Error('Not connected to Claude');
    }

    // Send approval (y for yes)
    this.process.stdin.write('y\n');
  }

  /**
   * Deny a tool call
   */
  async denyTool(toolId: string): Promise<void> {
    if (!this.isConnected || !this.process?.stdin) {
      throw new Error('Not connected to Claude');
    }

    // Send denial (n for no)
    this.process.stdin.write('n\n');
  }

  /**
   * Disconnect from Claude
   */
  disconnect(): void {
    if (this.process) {
      this.process.kill('SIGTERM');
      this.process = null;
    }
    this.isConnected = false;
    this.emit('disconnected');
  }

  /**
   * Check if connected
   */
  getIsConnected(): boolean {
    return this.isConnected;
  }

  /**
   * Generate unique ID
   */
  private generateId(): string {
    return `msg_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
  }
}

// Singleton instance
let claudeServiceInstance: ClaudeService | null = null;

export function getClaudeService(workingDirectory?: string): ClaudeService {
  if (!claudeServiceInstance) {
    claudeServiceInstance = new ClaudeService(workingDirectory);
  }
  return claudeServiceInstance;
}

export const claudeService = new ClaudeService();
