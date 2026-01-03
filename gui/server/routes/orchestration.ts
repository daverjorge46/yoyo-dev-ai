/**
 * Orchestration API Routes
 *
 * Provides orchestration system configuration and visualization data.
 */

import { Hono } from 'hono';
import { existsSync, readFileSync } from 'fs';
import { join } from 'path';
import * as yaml from 'js-yaml';
import type { Variables } from '../types.js';

export const orchestrationRoutes = new Hono<{ Variables: Variables }>();

// =============================================================================
// Types
// =============================================================================

interface IntentRoute {
  intent: string;
  agent: string;
  confidence: number;
  mode: 'background' | 'blocking' | 'auto-delegate' | 'escalation' | 'delegation' | 'primary' | 'direct';
  description: string;
}

interface OrchestrationConfig {
  enabled: boolean;
  globalMode: boolean;
  confidenceThreshold: number;
  routes: IntentRoute[];
  agents: string[];
}

// =============================================================================
// Default Configuration
// =============================================================================

const DEFAULT_ROUTES: IntentRoute[] = [
  {
    intent: 'research',
    agent: 'alma-librarian',
    confidence: 0.6,
    mode: 'background',
    description: 'External research, documentation lookup, best practices',
  },
  {
    intent: 'codebase',
    agent: 'alvaro-explore',
    confidence: 0.6,
    mode: 'blocking',
    description: 'Internal codebase search, pattern matching, file discovery',
  },
  {
    intent: 'frontend',
    agent: 'dave-engineer',
    confidence: 0.6,
    mode: 'auto-delegate',
    description: 'UI changes, styling, visual components, accessibility',
  },
  {
    intent: 'debug',
    agent: 'arthas-oracle',
    confidence: 0.7,
    mode: 'escalation',
    description: 'Strategic decisions, architecture guidance, failure analysis',
  },
  {
    intent: 'documentation',
    agent: 'angeles-writer',
    confidence: 0.6,
    mode: 'delegation',
    description: 'README files, technical documentation, guides',
  },
  {
    intent: 'planning',
    agent: 'yoyo-ai',
    confidence: 0.5,
    mode: 'primary',
    description: 'Task planning, feature design, workflow orchestration',
  },
  {
    intent: 'implementation',
    agent: 'yoyo-ai',
    confidence: 0.5,
    mode: 'primary',
    description: 'Code implementation, feature development',
  },
  {
    intent: 'general',
    agent: '-',
    confidence: 0,
    mode: 'direct',
    description: 'General queries handled directly without delegation',
  },
];

// =============================================================================
// Helpers
// =============================================================================

function getConfigPath(projectRoot: string): string {
  return join(projectRoot, '.yoyo-dev', 'config.yml');
}

function loadOrchestrationConfig(projectRoot: string): OrchestrationConfig {
  const configPath = getConfigPath(projectRoot);

  let config: OrchestrationConfig = {
    enabled: true,
    globalMode: true,
    confidenceThreshold: 0.6,
    routes: DEFAULT_ROUTES,
    agents: [
      'yoyo-ai',
      'arthas-oracle',
      'alma-librarian',
      'alvaro-explore',
      'dave-engineer',
      'angeles-writer',
    ],
  };

  if (existsSync(configPath)) {
    try {
      const content = readFileSync(configPath, 'utf-8');
      const parsed = yaml.load(content) as Record<string, unknown>;

      if (parsed?.orchestration) {
        const orch = parsed.orchestration as Record<string, unknown>;
        config.enabled = orch.enabled !== false;
        config.globalMode = orch.global_mode !== false;
        config.confidenceThreshold = (orch.confidence_threshold as number) || 0.6;
      }
    } catch (error) {
      console.error('Failed to load orchestration config:', error);
    }
  }

  return config;
}

/**
 * Generate Mermaid flowchart for orchestration visualization
 */
function generateMermaidFlow(routes: IntentRoute[]): string {
  const lines: string[] = [
    'graph LR',
    '    A[User Input] --> B{Intent Classifier}',
  ];

  // Define agent nodes with short IDs
  const agentIds: Record<string, string> = {
    'yoyo-ai': 'Y',
    'arthas-oracle': 'O',
    'alma-librarian': 'L',
    'alvaro-explore': 'E',
    'dave-engineer': 'D',
    'angeles-writer': 'W',
    '-': 'X',
  };

  const agentLabels: Record<string, string> = {
    'yoyo-ai': 'Yoyo AI',
    'arthas-oracle': 'Oracle',
    'alma-librarian': 'Librarian',
    'alvaro-explore': 'Explorer',
    'dave-engineer': 'Frontend',
    'angeles-writer': 'Writer',
    '-': 'Direct',
  };

  // Add agent nodes
  const addedAgents = new Set<string>();
  for (const route of routes) {
    const agentId = agentIds[route.agent] || route.agent[0].toUpperCase();
    if (!addedAgents.has(route.agent)) {
      addedAgents.add(route.agent);
      const label = agentLabels[route.agent] || route.agent;
      lines.push(`    ${agentId}[${label}]`);
    }
  }

  // Add edges from classifier to agents
  for (const route of routes) {
    const agentId = agentIds[route.agent] || route.agent[0].toUpperCase();
    lines.push(`    B -->|${route.intent}| ${agentId}`);
  }

  // Add Yoyo-AI delegation arrows
  lines.push('    Y --> L');
  lines.push('    Y --> E');
  lines.push('    Y --> D');
  lines.push('    Y --> O');
  lines.push('    Y --> W');

  // Style nodes
  lines.push('    style Y fill:#f9a825,stroke:#f57f17');
  lines.push('    style O fill:#7e57c2,stroke:#5e35b1');
  lines.push('    style L fill:#26a69a,stroke:#00897b');
  lines.push('    style E fill:#42a5f5,stroke:#1e88e5');
  lines.push('    style D fill:#ef5350,stroke:#e53935');
  lines.push('    style W fill:#66bb6a,stroke:#43a047');

  return lines.join('\n');
}

// =============================================================================
// Routes
// =============================================================================

/**
 * GET /api/orchestration/config - Get orchestration configuration
 */
orchestrationRoutes.get('/config', (c) => {
  const projectRoot = c.get('projectRoot') || process.cwd();
  const config = loadOrchestrationConfig(projectRoot);

  return c.json(config);
});

/**
 * GET /api/orchestration/flow - Get Mermaid flowchart for visualization
 */
orchestrationRoutes.get('/flow', (c) => {
  const projectRoot = c.get('projectRoot') || process.cwd();
  const config = loadOrchestrationConfig(projectRoot);
  const mermaid = generateMermaidFlow(config.routes);

  return c.json({
    mermaid,
    routes: config.routes,
  });
});

/**
 * GET /api/orchestration/routes - Get routing rules table
 */
orchestrationRoutes.get('/routes', (c) => {
  const projectRoot = c.get('projectRoot') || process.cwd();
  const config = loadOrchestrationConfig(projectRoot);

  return c.json({
    routes: config.routes,
    confidenceThreshold: config.confidenceThreshold,
  });
});
