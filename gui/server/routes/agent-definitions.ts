/**
 * Agent Definitions API Routes
 *
 * CRUD operations for agent definition files in .claude/agents/
 */

import { Hono } from 'hono';
import { existsSync, readdirSync, readFileSync, writeFileSync, unlinkSync } from 'fs';
import { join } from 'path';
import type { Variables } from '../types.js';
import type { Agent, AgentSummary, AgentListResponse, AgentStats, AgentCreateRequest, AgentUpdateRequest } from '../../shared/types/agent.js';
import { parseAgentFile, toAgentSummary, generateAgentMarkdown, nameToId } from '../lib/agent-parser.js';

export const agentDefinitionsRoutes = new Hono<{ Variables: Variables }>();

// =============================================================================
// Helpers
// =============================================================================

function getAgentsDir(projectRoot: string): string {
  return join(projectRoot, '.claude', 'agents');
}

function getAgentPath(projectRoot: string, id: string): string {
  return join(getAgentsDir(projectRoot), `${id}.md`);
}

/**
 * Read all agents from the .claude/agents/ directory
 */
function getAllAgents(projectRoot: string): Agent[] {
  const agentsDir = getAgentsDir(projectRoot);

  if (!existsSync(agentsDir)) {
    return [];
  }

  const files = readdirSync(agentsDir).filter(
    (f) => f.endsWith('.md') && !f.startsWith('.')
  );

  const agents: Agent[] = [];

  for (const file of files) {
    const filePath = join(agentsDir, file);
    try {
      const content = readFileSync(filePath, 'utf-8');
      const agent = parseAgentFile(content, file, filePath);
      agents.push(agent);
    } catch (error) {
      console.error(`Failed to parse agent file ${file}:`, error);
    }
  }

  // Sort by name
  return agents.sort((a, b) => a.name.localeCompare(b.name));
}

/**
 * Calculate aggregate statistics from agents
 */
function calculateStats(agents: Agent[]): AgentStats {
  const byMode = { primary: 0, subagent: 0 };
  const byModel: Record<string, number> = {};
  let tempSum = 0;

  for (const agent of agents) {
    // Count by mode
    if (agent.mode === 'Primary') {
      byMode.primary++;
    } else {
      byMode.subagent++;
    }

    // Count by model
    byModel[agent.model] = (byModel[agent.model] || 0) + 1;

    // Sum temperatures
    tempSum += agent.temperature;
  }

  return {
    total: agents.length,
    byMode,
    byModel,
    avgTemperature: agents.length > 0 ? tempSum / agents.length : 0,
  };
}

// =============================================================================
// Routes
// =============================================================================

/**
 * GET /api/agent-definitions - List all agent definitions
 */
agentDefinitionsRoutes.get('/', (c) => {
  const projectRoot = c.get('projectRoot') || process.cwd();
  const agents = getAllAgents(projectRoot);
  const summaries: AgentSummary[] = agents.map(toAgentSummary);
  const stats = calculateStats(agents);

  const response: AgentListResponse = {
    agents: summaries,
    count: agents.length,
    stats,
  };

  return c.json(response);
});

/**
 * GET /api/agent-definitions/:id - Get a specific agent
 */
agentDefinitionsRoutes.get('/:id', (c) => {
  const projectRoot = c.get('projectRoot') || process.cwd();
  const id = c.req.param('id');
  const agentPath = getAgentPath(projectRoot, id);

  if (!existsSync(agentPath)) {
    return c.json({ error: 'Agent not found' }, 404);
  }

  try {
    const content = readFileSync(agentPath, 'utf-8');
    const agent = parseAgentFile(content, `${id}.md`, agentPath);
    return c.json(agent);
  } catch (error) {
    return c.json({ error: 'Failed to parse agent file' }, 500);
  }
});

/**
 * POST /api/agent-definitions - Create a new agent
 */
agentDefinitionsRoutes.post('/', async (c) => {
  const projectRoot = c.get('projectRoot') || process.cwd();
  const body = await c.req.json<AgentCreateRequest>();

  // Validate required fields
  if (!body.name || !body.description || !body.content) {
    return c.json({ error: 'Name, description, and content are required' }, 400);
  }

  // Generate ID from name
  const id = nameToId(body.name);

  // Check if agent already exists
  const agentPath = getAgentPath(projectRoot, id);
  if (existsSync(agentPath)) {
    return c.json({ error: 'Agent with this name already exists' }, 409);
  }

  // Generate markdown content
  const markdown = generateAgentMarkdown({
    name: body.name,
    description: body.description,
    model: body.model || 'claude-sonnet-4-20250514',
    temperature: body.temperature ?? 0.7,
    mode: body.mode || 'Subagent',
    content: body.content,
    outputPrefix: body.outputPrefix,
    fallbackModel: body.fallbackModel,
  });

  // Ensure agents directory exists
  const agentsDir = getAgentsDir(projectRoot);
  if (!existsSync(agentsDir)) {
    const { mkdirSync } = await import('fs');
    mkdirSync(agentsDir, { recursive: true });
  }

  // Write file
  try {
    writeFileSync(agentPath, markdown, 'utf-8');
    const agent = parseAgentFile(markdown, `${id}.md`, agentPath);
    return c.json({ success: true, agent }, 201);
  } catch (error) {
    return c.json({ error: 'Failed to create agent file' }, 500);
  }
});

/**
 * PUT /api/agent-definitions/:id - Update an agent
 */
agentDefinitionsRoutes.put('/:id', async (c) => {
  const projectRoot = c.get('projectRoot') || process.cwd();
  const id = c.req.param('id');
  const agentPath = getAgentPath(projectRoot, id);

  if (!existsSync(agentPath)) {
    return c.json({ error: 'Agent not found' }, 404);
  }

  const body = await c.req.json<AgentUpdateRequest>();

  // Read existing agent
  const existingContent = readFileSync(agentPath, 'utf-8');
  const existingAgent = parseAgentFile(existingContent, `${id}.md`, agentPath);

  // Merge updates
  const updated = {
    name: body.name ?? existingAgent.name,
    description: body.description ?? existingAgent.description,
    model: body.model ?? existingAgent.model,
    temperature: body.temperature ?? existingAgent.temperature,
    mode: body.mode ?? existingAgent.mode,
    content: body.content ?? existingAgent.content,
    outputPrefix: body.outputPrefix ?? existingAgent.outputPrefix,
    fallbackModel: body.fallbackModel ?? existingAgent.fallbackModel,
  };

  // Generate new markdown
  const markdown = generateAgentMarkdown(updated);

  try {
    writeFileSync(agentPath, markdown, 'utf-8');
    const agent = parseAgentFile(markdown, `${id}.md`, agentPath);
    return c.json({ success: true, agent });
  } catch (error) {
    return c.json({ error: 'Failed to update agent file' }, 500);
  }
});

/**
 * DELETE /api/agent-definitions/:id - Delete an agent
 */
agentDefinitionsRoutes.delete('/:id', (c) => {
  const projectRoot = c.get('projectRoot') || process.cwd();
  const id = c.req.param('id');

  // Protect yoyo-ai from deletion
  if (id === 'yoyo-ai') {
    return c.json({ error: 'Cannot delete the primary orchestrator agent' }, 403);
  }

  const agentPath = getAgentPath(projectRoot, id);

  if (!existsSync(agentPath)) {
    return c.json({ error: 'Agent not found' }, 404);
  }

  try {
    unlinkSync(agentPath);
    return c.json({ success: true, message: 'Agent deleted successfully' });
  } catch (error) {
    return c.json({ error: 'Failed to delete agent file' }, 500);
  }
});

/**
 * POST /api/agent-definitions/:id/duplicate - Duplicate an agent
 */
agentDefinitionsRoutes.post('/:id/duplicate', (c) => {
  const projectRoot = c.get('projectRoot') || process.cwd();
  const id = c.req.param('id');
  const sourcePath = getAgentPath(projectRoot, id);

  if (!existsSync(sourcePath)) {
    return c.json({ error: 'Agent not found' }, 404);
  }

  // Generate new ID
  let newId = `${id}-copy`;
  let counter = 1;
  while (existsSync(getAgentPath(projectRoot, newId))) {
    counter++;
    newId = `${id}-copy-${counter}`;
  }

  const newPath = getAgentPath(projectRoot, newId);

  try {
    // Read source content
    const sourceContent = readFileSync(sourcePath, 'utf-8');
    const sourceAgent = parseAgentFile(sourceContent, `${id}.md`, sourcePath);

    // Generate new content with updated name
    const newMarkdown = generateAgentMarkdown({
      name: `${sourceAgent.name} Copy${counter > 1 ? ` ${counter}` : ''}`,
      description: sourceAgent.description,
      model: sourceAgent.model,
      temperature: sourceAgent.temperature,
      mode: sourceAgent.mode,
      content: sourceAgent.content,
      outputPrefix: sourceAgent.outputPrefix,
      fallbackModel: sourceAgent.fallbackModel,
    });

    writeFileSync(newPath, newMarkdown, 'utf-8');
    const newAgent = parseAgentFile(newMarkdown, `${newId}.md`, newPath);

    return c.json({ success: true, agent: newAgent }, 201);
  } catch (error) {
    return c.json({ error: 'Failed to duplicate agent' }, 500);
  }
});

/**
 * POST /api/agent-definitions/import - Import an agent from uploaded content
 */
agentDefinitionsRoutes.post('/import', async (c) => {
  const projectRoot = c.get('projectRoot') || process.cwd();
  const body = await c.req.json<{ content: string; filename?: string }>();

  if (!body.content) {
    return c.json({ error: 'Content is required' }, 400);
  }

  // Parse the content to get the agent name
  const tempAgent = parseAgentFile(body.content, body.filename || 'temp.md', '');

  // Generate ID from name
  const id = nameToId(tempAgent.name);

  // Check if agent already exists
  const agentPath = getAgentPath(projectRoot, id);
  if (existsSync(agentPath)) {
    return c.json({ error: 'Agent with this name already exists', existingId: id }, 409);
  }

  // Ensure agents directory exists
  const agentsDir = getAgentsDir(projectRoot);
  if (!existsSync(agentsDir)) {
    const { mkdirSync } = await import('fs');
    mkdirSync(agentsDir, { recursive: true });
  }

  try {
    writeFileSync(agentPath, body.content, 'utf-8');
    const agent = parseAgentFile(body.content, `${id}.md`, agentPath);
    return c.json({ success: true, agent }, 201);
  } catch (error) {
    return c.json({ error: 'Failed to import agent' }, 500);
  }
});

/**
 * GET /api/agent-definitions/templates - Get available agent templates
 */
agentDefinitionsRoutes.get('/templates', (c) => {
  const templates = [
    {
      id: 'research-agent',
      name: 'Research Agent',
      description: 'Agent specialized in external research and documentation lookup',
      content: `## Identity

You are a **Research Agent** specializing in finding and synthesizing information from external sources.

## Core Responsibilities

1. **Documentation Research** - Find official docs, guides, and references
2. **Best Practices** - Identify industry standards and patterns
3. **Technology Comparison** - Evaluate different solutions

## Tool Access

- WebSearch - Search the web for information
- WebFetch - Fetch and analyze web pages
- Read - Read local documentation`,
      defaultValues: {
        model: 'claude-sonnet-4-20250514',
        temperature: 0.3,
        mode: 'Subagent' as const,
      },
    },
    {
      id: 'code-reviewer',
      name: 'Code Reviewer',
      description: 'Agent specialized in reviewing code for quality, security, and best practices',
      content: `## Identity

You are a **Code Reviewer** specializing in code quality analysis.

## Core Responsibilities

1. **Code Quality** - Identify bugs, code smells, and anti-patterns
2. **Security Review** - Find security vulnerabilities
3. **Best Practices** - Ensure code follows project standards

## Review Focus Areas

- Error handling
- Input validation
- Performance implications
- Maintainability`,
      defaultValues: {
        model: 'claude-sonnet-4-20250514',
        temperature: 0.1,
        mode: 'Subagent' as const,
      },
    },
    {
      id: 'documentation-writer',
      name: 'Documentation Writer',
      description: 'Agent specialized in creating clear, comprehensive documentation',
      content: `## Identity

You are a **Documentation Writer** specializing in technical writing.

## Core Responsibilities

1. **API Documentation** - Document endpoints, parameters, responses
2. **User Guides** - Create step-by-step instructions
3. **README Files** - Write project overviews

## Writing Style

- Clear and concise
- Include code examples
- Use consistent formatting`,
      defaultValues: {
        model: 'claude-sonnet-4-20250514',
        temperature: 0.5,
        mode: 'Subagent' as const,
      },
    },
  ];

  return c.json({ templates });
});
