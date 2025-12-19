/**
 * MCP Status API Routes
 *
 * Provides MCP (Model Context Protocol) server status.
 */

import { Hono } from 'hono';
import { exec } from 'child_process';
import { promisify } from 'util';
import { readFile } from 'fs/promises';
import { join } from 'path';
import { existsSync } from 'fs';
import type { Variables } from '../types.js';

const execAsync = promisify(exec);

const mcpRoutes = new Hono<{ Variables: Variables }>();

interface MCPServer {
  name: string;
  status: 'running' | 'stopped' | 'unknown';
  image?: string;
  tag?: string;
}

interface MCPStatus {
  available: boolean;
  gateway: string | null;
  clientConnected: boolean;
  servers: MCPServer[];
  lastCheck: string;
  error: string | null;
}

/**
 * Check if Docker is available
 */
async function isDockerAvailable(): Promise<boolean> {
  try {
    await execAsync('docker --version');
    return true;
  } catch {
    return false;
  }
}

/**
 * Check if Docker MCP is available
 */
async function isMCPAvailable(): Promise<boolean> {
  try {
    await execAsync('docker mcp --help');
    return true;
  } catch {
    return false;
  }
}

/**
 * Get list of enabled MCP servers
 */
async function getMCPServers(): Promise<MCPServer[]> {
  try {
    const { stdout } = await execAsync('docker mcp server ls --format json');

    // Parse JSON output
    const lines = stdout.trim().split('\n').filter(Boolean);
    const servers: MCPServer[] = [];

    for (const line of lines) {
      try {
        const server = JSON.parse(line);
        servers.push({
          name: server.Name || server.name,
          status: 'running', // If listed, assume running
          image: server.Image || server.image,
          tag: server.Tag || server.tag || 'latest',
        });
      } catch {
        // Skip malformed lines
      }
    }

    return servers;
  } catch (error: any) {
    // Try non-JSON format
    try {
      const { stdout } = await execAsync('docker mcp server ls');
      const lines = stdout.trim().split('\n').slice(1); // Skip header
      const servers: MCPServer[] = [];

      for (const line of lines) {
        const parts = line.trim().split(/\s+/);
        if (parts.length >= 1) {
          servers.push({
            name: parts[0],
            status: 'running',
            image: parts[1] || undefined,
            tag: parts[2] || 'latest',
          });
        }
      }

      return servers;
    } catch {
      return [];
    }
  }
}

/**
 * Check if Claude is connected as MCP client
 */
async function isClaudeConnected(): Promise<boolean> {
  try {
    const { stdout } = await execAsync('docker mcp client list');
    return stdout.toLowerCase().includes('claude');
  } catch {
    return false;
  }
}

/**
 * GET /api/mcp - Get MCP status
 */
mcpRoutes.get('/', async (c) => {
  const projectRoot = c.get('projectRoot') as string || process.cwd();

  const status: MCPStatus = {
    available: false,
    gateway: null,
    clientConnected: false,
    servers: [],
    lastCheck: new Date().toISOString(),
    error: null,
  };

  try {
    // Check Docker availability
    const dockerAvailable = await isDockerAvailable();
    if (!dockerAvailable) {
      status.error = 'Docker not available';
      return c.json(status);
    }

    // Check MCP availability
    const mcpAvailable = await isMCPAvailable();
    if (!mcpAvailable) {
      status.error = 'Docker MCP Toolkit not enabled';
      return c.json(status);
    }

    status.available = true;
    status.gateway = 'docker';

    // Get MCP servers
    status.servers = await getMCPServers();

    // Check if Claude is connected
    status.clientConnected = await isClaudeConnected();

    // Check for .mcp.json in project
    const mcpConfigPath = join(projectRoot, '.mcp.json');
    if (existsSync(mcpConfigPath)) {
      try {
        const configContent = await readFile(mcpConfigPath, 'utf-8');
        const config = JSON.parse(configContent);
        if (config.mcpServers?.MCP_DOCKER) {
          status.gateway = 'docker';
        }
      } catch {
        // Ignore config read errors
      }
    }

    return c.json(status);
  } catch (error: any) {
    console.error('[MCP] Error:', error);
    status.error = error.message || 'Failed to get MCP status';
    return c.json(status);
  }
});

export { mcpRoutes };
