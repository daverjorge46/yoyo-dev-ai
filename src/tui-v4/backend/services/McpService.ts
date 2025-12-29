/**
 * MCP Service
 *
 * Detects MCP server connections via Docker MCP Gateway.
 * TODO: Full implementation with docker mcp server ls parsing
 */

import { exec } from 'child_process';
import { promisify } from 'util';
import type { McpStatus } from '../state-manager.js';

const execAsync = promisify(exec);

export class McpService {
  async getStatus(): Promise<McpStatus> {
    try {
      const { stdout } = await execAsync('docker mcp server ls 2>/dev/null');
      const serverCount = stdout.split('\n').filter(line => line.trim() && !line.includes('NAME')).length;

      return {
        serverCount,
        connected: serverCount > 0,
      };
    } catch {
      return { serverCount: 0, connected: false };
    }
  }
}

export const mcpService = new McpService();
