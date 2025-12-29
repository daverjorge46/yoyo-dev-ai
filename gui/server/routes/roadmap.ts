/**
 * Roadmap API Routes
 *
 * Parses roadmap.md and provides structured phase/item data
 * with links to specs and fixes.
 */

import { Hono } from 'hono';
import { existsSync, readFileSync, readdirSync, writeFileSync } from 'fs';
import { join } from 'path';
import type { Variables } from '../types.js';

export const roadmapRoutes = new Hono<{ Variables: Variables }>();

// =============================================================================
// Types
// =============================================================================

interface RoadmapItem {
  id: string;
  number: number;
  title: string;
  completed: boolean;
  effort: 'XS' | 'S' | 'M' | 'L' | 'XL' | null;
  description?: string;
  subItems?: string[];
  linkedSpec?: string;
  linkedFix?: string;
}

interface RoadmapPhase {
  id: string;
  number: number;
  title: string;
  status: 'completed' | 'in_progress' | 'pending';
  statusText: string;
  goal: string;
  sections: RoadmapSection[];
  itemCount: number;
  completedCount: number;
  progress: number;
}

interface RoadmapSection {
  title: string;
  items: RoadmapItem[];
}

interface RoadmapData {
  title: string;
  overview: string;
  phases: RoadmapPhase[];
  totalItems: number;
  completedItems: number;
  overallProgress: number;
}

interface PhaseBlock {
  startLine: number;
  endLine: number;
  content: string[];
  phaseNumber: number;
  title: string;
}

// =============================================================================
// Helpers
// =============================================================================

function parseEffort(text: string): RoadmapItem['effort'] {
  const match = text.match(/`(XS|S|M|L|XL)`/);
  return match ? (match[1] as RoadmapItem['effort']) : null;
}

function parseStatus(statusText: string): RoadmapPhase['status'] {
  const lower = statusText.toLowerCase();
  if (lower.includes('completed') || lower.includes('✅')) return 'completed';
  if (lower.includes('progress') || lower.includes('current')) return 'in_progress';
  return 'pending';
}

function findLinkedSpec(title: string, specs: string[]): string | undefined {
  const titleLower = title.toLowerCase();
  return specs.find(specId => {
    const specName = specId.replace(/^\d{4}-\d{2}-\d{2}-/, '').toLowerCase();
    return titleLower.includes(specName) || specName.includes(titleLower.split(' ')[0]);
  });
}

function findLinkedFix(title: string, fixes: string[]): string | undefined {
  const titleLower = title.toLowerCase();
  return fixes.find(fixId => {
    const fixName = fixId.replace(/^\d{4}-\d{2}-\d{2}-/, '').toLowerCase();
    return titleLower.includes(fixName) || fixName.includes(titleLower.split(' ')[0]);
  });
}

function parseRoadmap(content: string, specs: string[], fixes: string[]): RoadmapData {
  const lines = content.split('\n');
  const phases: RoadmapPhase[] = [];

  let title = '';
  let overview = '';
  let currentPhase: RoadmapPhase | null = null;
  let currentSection: RoadmapSection | null = null;
  let inOverview = false;
  let itemCounter = 0;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const trimmed = line.trim();

    // Title (# heading)
    if (trimmed.startsWith('# ') && !title) {
      title = trimmed.slice(2);
      continue;
    }

    // Overview section
    if (trimmed === '## Transformation Overview' || trimmed === '## Overview') {
      inOverview = true;
      continue;
    }

    if (inOverview && trimmed.startsWith('---')) {
      inOverview = false;
      continue;
    }

    if (inOverview && trimmed) {
      overview += (overview ? '\n' : '') + trimmed;
      continue;
    }

    // Phase heading (## Phase N: Title)
    const phaseMatch = trimmed.match(/^## Phase (\d+): (.+)$/);
    if (phaseMatch) {
      if (currentPhase) {
        // Calculate phase stats
        currentPhase.itemCount = currentPhase.sections.reduce((sum, s) => sum + s.items.length, 0);
        currentPhase.completedCount = currentPhase.sections.reduce(
          (sum, s) => sum + s.items.filter(item => item.completed).length, 0
        );
        currentPhase.progress = currentPhase.itemCount > 0
          ? Math.round((currentPhase.completedCount / currentPhase.itemCount) * 100)
          : 0;
        phases.push(currentPhase);
      }

      currentPhase = {
        id: `phase-${phaseMatch[1]}`,
        number: parseInt(phaseMatch[1]),
        title: phaseMatch[2],
        status: 'pending',
        statusText: '',
        goal: '',
        sections: [],
        itemCount: 0,
        completedCount: 0,
        progress: 0,
      };
      currentSection = null;
      continue;
    }

    if (!currentPhase) continue;

    // Status line
    if (trimmed.startsWith('**Status**:')) {
      currentPhase.statusText = trimmed.replace('**Status**:', '').trim();
      currentPhase.status = parseStatus(currentPhase.statusText);
      continue;
    }

    // Goal line
    if (trimmed.startsWith('**Goal**:')) {
      currentPhase.goal = trimmed.replace('**Goal**:', '').trim();
      continue;
    }

    // Section heading (### Section Title)
    if (trimmed.startsWith('### ')) {
      currentSection = {
        title: trimmed.slice(4),
        items: [],
      };
      currentPhase.sections.push(currentSection);
      continue;
    }

    // Item line (numbered with checkbox)
    const itemMatch = trimmed.match(/^(\d+)\.\s+\[([ x])\]\s+\*\*(.+?)\*\*\s*(?:—|-)?\s*(.*)$/);
    if (itemMatch && currentSection) {
      itemCounter++;
      const item: RoadmapItem = {
        id: `item-${itemCounter}`,
        number: parseInt(itemMatch[1]),
        title: itemMatch[3],
        completed: itemMatch[2] === 'x',
        effort: parseEffort(itemMatch[4] || ''),
        description: itemMatch[4]?.replace(/`(XS|S|M|L|XL)`/, '').trim() || undefined,
        linkedSpec: findLinkedSpec(itemMatch[3], specs),
        linkedFix: findLinkedFix(itemMatch[3], fixes),
      };
      currentSection.items.push(item);
      continue;
    }

    // Simple checkbox item without bold
    const simpleItemMatch = trimmed.match(/^(\d+)\.\s+\[([ x])\]\s+(.+)$/);
    if (simpleItemMatch && currentSection) {
      itemCounter++;
      const item: RoadmapItem = {
        id: `item-${itemCounter}`,
        number: parseInt(simpleItemMatch[1]),
        title: simpleItemMatch[3].replace(/`(XS|S|M|L|XL)`/, '').trim(),
        completed: simpleItemMatch[2] === 'x',
        effort: parseEffort(simpleItemMatch[3]),
        linkedSpec: findLinkedSpec(simpleItemMatch[3], specs),
        linkedFix: findLinkedFix(simpleItemMatch[3], fixes),
      };
      currentSection.items.push(item);
      continue;
    }

    // Sub-item (indented with -)
    if (trimmed.startsWith('- ') && currentSection && currentSection.items.length > 0) {
      const lastItem = currentSection.items[currentSection.items.length - 1];
      if (!lastItem.subItems) lastItem.subItems = [];
      lastItem.subItems.push(trimmed.slice(2));
    }
  }

  // Push last phase
  if (currentPhase) {
    currentPhase.itemCount = currentPhase.sections.reduce((sum, s) => sum + s.items.length, 0);
    currentPhase.completedCount = currentPhase.sections.reduce(
      (sum, s) => sum + s.items.filter(item => item.completed).length, 0
    );
    currentPhase.progress = currentPhase.itemCount > 0
      ? Math.round((currentPhase.completedCount / currentPhase.itemCount) * 100)
      : 0;
    phases.push(currentPhase);
  }

  // Calculate totals
  const totalItems = phases.reduce((sum, p) => sum + p.itemCount, 0);
  const completedItems = phases.reduce((sum, p) => sum + p.completedCount, 0);
  const overallProgress = totalItems > 0 ? Math.round((completedItems / totalItems) * 100) : 0;

  return {
    title,
    overview,
    phases,
    totalItems,
    completedItems,
    overallProgress,
  };
}

/**
 * Extract phase blocks from roadmap content for reordering
 */
function extractPhaseBlocks(content: string): { header: string[]; phases: PhaseBlock[]; footer: string[] } {
  const lines = content.split('\n');
  const phases: PhaseBlock[] = [];
  const header: string[] = [];
  const footer: string[] = [];

  let currentPhase: PhaseBlock | null = null;
  let inPhases = false;
  let afterPhases = false;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const trimmed = line.trim();

    // Check for phase heading
    const phaseMatch = trimmed.match(/^## Phase (\d+): (.+)$/);
    if (phaseMatch) {
      inPhases = true;
      afterPhases = false;

      // Save previous phase
      if (currentPhase) {
        currentPhase.endLine = i - 1;
        phases.push(currentPhase);
      }

      currentPhase = {
        startLine: i,
        endLine: i,
        content: [line],
        phaseNumber: parseInt(phaseMatch[1]),
        title: phaseMatch[2],
      };
      continue;
    }

    // Check for non-phase ## heading (marks end of phases)
    if (trimmed.startsWith('## ') && !trimmed.match(/^## Phase \d+:/)) {
      if (currentPhase) {
        currentPhase.endLine = i - 1;
        phases.push(currentPhase);
        currentPhase = null;
      }
      afterPhases = true;
      inPhases = false;
    }

    // Collect lines
    if (!inPhases && !afterPhases) {
      header.push(line);
    } else if (currentPhase) {
      currentPhase.content.push(line);
    } else if (afterPhases) {
      footer.push(line);
    }
  }

  // Save last phase
  if (currentPhase) {
    currentPhase.endLine = lines.length - 1;
    phases.push(currentPhase);
  }

  return { header, phases, footer };
}

/**
 * Reorder phases in roadmap content
 */
function reorderPhasesInContent(
  content: string,
  activeId: string,
  overId: string
): string {
  const { header, phases, footer } = extractPhaseBlocks(content);

  // Find indices
  const activePhaseNum = parseInt(activeId.replace('phase-', ''));
  const overPhaseNum = parseInt(overId.replace('phase-', ''));

  const activeIndex = phases.findIndex(p => p.phaseNumber === activePhaseNum);
  const overIndex = phases.findIndex(p => p.phaseNumber === overPhaseNum);

  if (activeIndex === -1 || overIndex === -1 || activeIndex === overIndex) {
    return content; // No change needed
  }

  // Reorder phases array
  const [movedPhase] = phases.splice(activeIndex, 1);
  phases.splice(overIndex, 0, movedPhase);

  // Renumber phases and update content
  const renumberedPhases = phases.map((phase, index) => {
    const newNumber = index; // Start from 0 to preserve Phase 0, 1, 2... pattern
    const oldHeading = phase.content[0];
    const newHeading = oldHeading.replace(
      /^(## Phase )\d+(:)/,
      `$1${newNumber}$2`
    );

    return {
      ...phase,
      phaseNumber: newNumber,
      content: [newHeading, ...phase.content.slice(1)],
    };
  });

  // Reconstruct content
  const newLines = [
    ...header,
    ...renumberedPhases.flatMap(p => p.content),
    ...footer,
  ];

  return newLines.join('\n');
}

/**
 * Update phase title in roadmap content
 */
function updatePhaseTitleInContent(
  content: string,
  phaseId: string,
  newTitle: string
): string {
  const lines = content.split('\n');
  const phaseNum = parseInt(phaseId.replace('phase-', ''));

  for (let i = 0; i < lines.length; i++) {
    const match = lines[i].match(/^(## Phase )(\d+)(: ).+$/);
    if (match && parseInt(match[2]) === phaseNum) {
      lines[i] = `${match[1]}${match[2]}${match[3]}${newTitle}`;
      break;
    }
  }

  return lines.join('\n');
}

function getSpecs(projectRoot: string): string[] {
  const specsPath = join(projectRoot, '.yoyo-dev', 'specs');
  if (!existsSync(specsPath)) return [];

  try {
    return readdirSync(specsPath, { withFileTypes: true })
      .filter(d => d.isDirectory())
      .map(d => d.name);
  } catch {
    return [];
  }
}

function getFixes(projectRoot: string): string[] {
  const fixesPath = join(projectRoot, '.yoyo-dev', 'fixes');
  if (!existsSync(fixesPath)) return [];

  try {
    return readdirSync(fixesPath, { withFileTypes: true })
      .filter(d => d.isDirectory())
      .map(d => d.name);
  } catch {
    return [];
  }
}

// =============================================================================
// Routes
// =============================================================================

// GET /api/roadmap - Get parsed roadmap data
roadmapRoutes.get('/', (c) => {
  const projectRoot = c.get('projectRoot') || process.cwd();
  const roadmapPath = join(projectRoot, '.yoyo-dev', 'product', 'roadmap.md');

  if (!existsSync(roadmapPath)) {
    return c.json({
      error: 'Roadmap not found',
      path: roadmapPath,
    }, 404);
  }

  const content = readFileSync(roadmapPath, 'utf-8');
  const specs = getSpecs(projectRoot);
  const fixes = getFixes(projectRoot);
  const roadmap = parseRoadmap(content, specs, fixes);

  return c.json(roadmap);
});

// GET /api/roadmap/raw - Get raw roadmap content
roadmapRoutes.get('/raw', (c) => {
  const projectRoot = c.get('projectRoot') || process.cwd();
  const roadmapPath = join(projectRoot, '.yoyo-dev', 'product', 'roadmap.md');

  if (!existsSync(roadmapPath)) {
    return c.json({ error: 'Roadmap not found' }, 404);
  }

  const content = readFileSync(roadmapPath, 'utf-8');
  return c.json({ content, path: roadmapPath });
});

// GET /api/roadmap/phase/:id - Get specific phase details
roadmapRoutes.get('/phase/:id', (c) => {
  const projectRoot = c.get('projectRoot') || process.cwd();
  const phaseId = c.req.param('id');
  const roadmapPath = join(projectRoot, '.yoyo-dev', 'product', 'roadmap.md');

  if (!existsSync(roadmapPath)) {
    return c.json({ error: 'Roadmap not found' }, 404);
  }

  const content = readFileSync(roadmapPath, 'utf-8');
  const specs = getSpecs(projectRoot);
  const fixes = getFixes(projectRoot);
  const roadmap = parseRoadmap(content, specs, fixes);

  const phase = roadmap.phases.find(p => p.id === phaseId || p.id === `phase-${phaseId}`);
  if (!phase) {
    return c.json({ error: 'Phase not found' }, 404);
  }

  return c.json(phase);
});

// PATCH /api/roadmap/phases/reorder - Reorder phases
roadmapRoutes.patch('/phases/reorder', async (c) => {
  const projectRoot = c.get('projectRoot') || process.cwd();
  const roadmapPath = join(projectRoot, '.yoyo-dev', 'product', 'roadmap.md');

  if (!existsSync(roadmapPath)) {
    return c.json({ error: 'Roadmap not found' }, 404);
  }

  const body = await c.req.json<{ activeId: string; overId: string }>();
  const { activeId, overId } = body;

  if (!activeId || !overId) {
    return c.json({ error: 'Missing activeId or overId' }, 400);
  }

  try {
    const content = readFileSync(roadmapPath, 'utf-8');
    const newContent = reorderPhasesInContent(content, activeId, overId);

    if (newContent !== content) {
      writeFileSync(roadmapPath, newContent, 'utf-8');
    }

    // Return updated roadmap data
    const specs = getSpecs(projectRoot);
    const fixes = getFixes(projectRoot);
    const roadmap = parseRoadmap(newContent, specs, fixes);

    return c.json(roadmap);
  } catch (error) {
    console.error('Failed to reorder phases:', error);
    return c.json({ error: 'Failed to reorder phases' }, 500);
  }
});

// PATCH /api/roadmap/phases/:id - Update phase (name, status, etc.)
roadmapRoutes.patch('/phases/:id', async (c) => {
  const projectRoot = c.get('projectRoot') || process.cwd();
  const phaseId = c.req.param('id');
  const roadmapPath = join(projectRoot, '.yoyo-dev', 'product', 'roadmap.md');

  if (!existsSync(roadmapPath)) {
    return c.json({ error: 'Roadmap not found' }, 404);
  }

  const body = await c.req.json<{ name?: string; status?: string }>();
  const { name } = body;

  if (!name) {
    return c.json({ error: 'No update fields provided' }, 400);
  }

  try {
    const content = readFileSync(roadmapPath, 'utf-8');
    const newContent = updatePhaseTitleInContent(content, phaseId, name);

    if (newContent !== content) {
      writeFileSync(roadmapPath, newContent, 'utf-8');
    }

    // Return updated phase
    const specs = getSpecs(projectRoot);
    const fixes = getFixes(projectRoot);
    const roadmap = parseRoadmap(newContent, specs, fixes);
    const phase = roadmap.phases.find(p => p.id === phaseId || p.id === `phase-${phaseId}`);

    if (!phase) {
      return c.json({ error: 'Phase not found after update' }, 404);
    }

    return c.json({ phase });
  } catch (error) {
    console.error('Failed to update phase:', error);
    return c.json({ error: 'Failed to update phase' }, 500);
  }
});

// GET /api/roadmap/specs - Get specs linked to roadmap phases
roadmapRoutes.get('/specs', (c) => {
  const projectRoot = c.get('projectRoot') || process.cwd();
  const roadmapPath = join(projectRoot, '.yoyo-dev', 'product', 'roadmap.md');

  if (!existsSync(roadmapPath)) {
    return c.json({ error: 'Roadmap not found' }, 404);
  }

  const content = readFileSync(roadmapPath, 'utf-8');
  const specs = getSpecs(projectRoot);
  const fixes = getFixes(projectRoot);
  const roadmap = parseRoadmap(content, specs, fixes);

  // Collect all linked specs from roadmap items
  const linkedSpecs: Array<{ specId: string; phaseId: string; itemTitle: string }> = [];

  for (const phase of roadmap.phases) {
    for (const section of phase.sections) {
      for (const item of section.items) {
        if (item.linkedSpec) {
          linkedSpecs.push({
            specId: item.linkedSpec,
            phaseId: phase.id,
            itemTitle: item.title,
          });
        }
      }
    }
  }

  return c.json({ linkedSpecs, totalSpecs: specs.length });
});
