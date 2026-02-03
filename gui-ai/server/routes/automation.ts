import { Hono } from 'hono';
import { getDatabase, generateId } from '../lib/database.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

export const automationRouter = new Hono();

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const TEMPLATES_DIR = path.join(__dirname, '../../templates');

// Load templates from JSON files
function loadTemplates() {
  const templates: any[] = [];

  if (!fs.existsSync(TEMPLATES_DIR)) {
    return getDefaultTemplates();
  }

  const categories = fs.readdirSync(TEMPLATES_DIR);
  for (const category of categories) {
    const categoryPath = path.join(TEMPLATES_DIR, category);
    if (fs.statSync(categoryPath).isDirectory()) {
      const files = fs.readdirSync(categoryPath).filter(f => f.endsWith('.json'));
      for (const file of files) {
        try {
          const content = fs.readFileSync(path.join(categoryPath, file), 'utf-8');
          templates.push(JSON.parse(content));
        } catch (error) {
          console.error(`Failed to load template ${file}:`, error);
        }
      }
    }
  }

  return templates.length > 0 ? templates : getDefaultTemplates();
}

function getDefaultTemplates() {
  return [
    {
      id: 'daily-email-digest',
      name: 'Daily Email Digest',
      description: 'Automatically summarize and categorize your inbox every morning',
      category: 'email',
      icon: '📧',
      complexity: 2,
      estimatedDuration: '5 minutes',
      requiredConnections: ['gmail'],
      steps: [
        {
          id: 'schedule',
          title: 'Schedule',
          description: 'When should the digest be generated?',
          fields: [
            { name: 'scheduleTime', label: 'Time', type: 'time', required: true, default: '08:00' },
            { name: 'scheduleDays', label: 'Days', type: 'multiselect', required: true, default: [1,2,3,4,5], options: [
              { value: '0', label: 'Sunday' }, { value: '1', label: 'Monday' },
              { value: '2', label: 'Tuesday' }, { value: '3', label: 'Wednesday' },
              { value: '4', label: 'Thursday' }, { value: '5', label: 'Friday' },
              { value: '6', label: 'Saturday' }
            ]},
          ],
        },
        {
          id: 'source',
          title: 'Email Source',
          description: 'Which emails should be included?',
          fields: [
            { name: 'timeRange', label: 'Include emails from', type: 'select', required: true, default: '24h', options: [
              { value: '24h', label: 'Last 24 hours' },
              { value: 'since_last', label: 'Since last digest' },
            ]},
          ],
        },
      ],
      defaultSchedule: { type: 'recurring', frequency: 'daily', time: '08:00', days: [1,2,3,4,5] },
      skill: 'email-digest',
      defaultParams: { timeRange: '24h' },
    },
    {
      id: 'meeting-prep',
      name: 'Meeting Preparation',
      description: 'Prepare briefings and notes before your meetings',
      category: 'calendar',
      icon: '📅',
      complexity: 3,
      estimatedDuration: '10 minutes',
      requiredConnections: ['gcalendar'],
      steps: [
        {
          id: 'timing',
          title: 'Timing',
          description: 'When to prepare the briefing?',
          fields: [
            { name: 'prepTime', label: 'Minutes before meeting', type: 'number', required: true, default: 30, validation: { min: 5, max: 120 } },
          ],
        },
        {
          id: 'content',
          title: 'Content',
          description: 'What to include in the briefing?',
          fields: [
            { name: 'includeAgenda', label: 'Include agenda', type: 'boolean', required: false, default: true },
            { name: 'includeParticipants', label: 'Include participant info', type: 'boolean', required: false, default: true },
            { name: 'includePrevNotes', label: 'Include previous meeting notes', type: 'boolean', required: false, default: true },
          ],
        },
      ],
      defaultSchedule: { type: 'triggered', trigger: { event: 'calendar_event_upcoming' } },
      skill: 'meeting-prep',
      defaultParams: { prepTime: 30, includeAgenda: true, includeParticipants: true, includePrevNotes: true },
    },
    {
      id: 'document-summarize',
      name: 'Document Summarizer',
      description: 'Automatically summarize new documents added to your Drive',
      category: 'documents',
      icon: '📄',
      complexity: 2,
      estimatedDuration: '2 minutes per doc',
      requiredConnections: ['gdrive'],
      steps: [
        {
          id: 'source',
          title: 'Source Folder',
          description: 'Which folder to watch?',
          fields: [
            { name: 'folderPath', label: 'Folder path', type: 'text', required: true, default: '/Documents', helpText: 'Path in Google Drive' },
          ],
        },
        {
          id: 'output',
          title: 'Summary Options',
          description: 'How should summaries be formatted?',
          fields: [
            { name: 'summaryLength', label: 'Summary length', type: 'select', required: true, default: 'medium', options: [
              { value: 'short', label: 'Short (1-2 paragraphs)' },
              { value: 'medium', label: 'Medium (3-5 paragraphs)' },
              { value: 'detailed', label: 'Detailed (full analysis)' },
            ]},
          ],
        },
      ],
      defaultSchedule: { type: 'triggered', trigger: { event: 'file_added' } },
      skill: 'document-summarize',
      defaultParams: { folderPath: '/Documents', summaryLength: 'medium' },
    },
    {
      id: 'weekly-report',
      name: 'Weekly Report Generator',
      description: 'Generate comprehensive weekly activity reports',
      category: 'reports',
      icon: '📊',
      complexity: 3,
      estimatedDuration: '15 minutes',
      requiredConnections: [],
      steps: [
        {
          id: 'schedule',
          title: 'Schedule',
          description: 'When to generate the report?',
          fields: [
            { name: 'dayOfWeek', label: 'Day', type: 'select', required: true, default: '5', options: [
              { value: '1', label: 'Monday' }, { value: '5', label: 'Friday' }, { value: '0', label: 'Sunday' },
            ]},
            { name: 'time', label: 'Time', type: 'time', required: true, default: '17:00' },
          ],
        },
        {
          id: 'content',
          title: 'Report Content',
          description: 'What to include in the report?',
          fields: [
            { name: 'includeTasks', label: 'Tasks completed', type: 'boolean', required: false, default: true },
            { name: 'includeMessages', label: 'Messages summary', type: 'boolean', required: false, default: true },
            { name: 'includeAutomations', label: 'Automation stats', type: 'boolean', required: false, default: true },
          ],
        },
      ],
      defaultSchedule: { type: 'recurring', frequency: 'weekly', days: [5], time: '17:00' },
      skill: 'weekly-report',
      defaultParams: { includeTasks: true, includeMessages: true, includeAutomations: true },
    },
    {
      id: 'research-assistant',
      name: 'Research Assistant',
      description: 'Automated research and summarization on topics',
      category: 'research',
      icon: '🔍',
      complexity: 4,
      estimatedDuration: '30 minutes',
      requiredConnections: [],
      steps: [
        {
          id: 'topic',
          title: 'Research Topic',
          description: 'What to research?',
          fields: [
            { name: 'topic', label: 'Topic', type: 'text', required: true, helpText: 'Enter the topic or keywords' },
            { name: 'depth', label: 'Research depth', type: 'select', required: true, default: 'standard', options: [
              { value: 'quick', label: 'Quick overview' },
              { value: 'standard', label: 'Standard research' },
              { value: 'deep', label: 'Deep dive' },
            ]},
          ],
        },
      ],
      defaultSchedule: { type: 'once' },
      skill: 'research-assistant',
      defaultParams: { depth: 'standard' },
    },
  ];
}

automationRouter.get('/templates', (c) => {
  const templates = loadTemplates();
  return c.json({ templates });
});

automationRouter.get('/templates/:id', (c) => {
  const templates = loadTemplates();
  const id = c.req.param('id');
  const template = templates.find(t => t.id === id);

  if (!template) {
    return c.json({ error: 'Template not found' }, 404);
  }

  return c.json({ template });
});

automationRouter.get('/active', (c) => {
  const db = getDatabase();
  const automations = db.prepare('SELECT * FROM automations ORDER BY created_at DESC').all();

  return c.json({
    automations: automations.map((a: any) => ({
      id: a.id,
      name: a.name,
      templateId: a.template_id,
      config: JSON.parse(a.config),
      schedule: a.schedule ? JSON.parse(a.schedule) : null,
      enabled: Boolean(a.enabled),
      lastRun: a.last_run ? new Date(a.last_run).toISOString() : null,
      nextRun: a.next_run ? new Date(a.next_run).toISOString() : null,
      createdAt: new Date(a.created_at).toISOString(),
    })),
  });
});

automationRouter.post('/create', async (c) => {
  const db = getDatabase();
  const body = await c.req.json();
  const id = generateId('auto_');
  const now = Date.now();

  const templates = loadTemplates();
  const template = templates.find(t => t.id === body.templateId);

  db.prepare(`
    INSERT INTO automations (id, name, template_id, config, schedule, enabled, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `).run(
    id,
    body.config.name || template?.name || 'Unnamed Automation',
    body.templateId,
    JSON.stringify(body.config),
    template?.defaultSchedule ? JSON.stringify(template.defaultSchedule) : null,
    1,
    now
  );

  return c.json({
    automation: {
      id,
      name: body.config.name || template?.name,
      templateId: body.templateId,
      config: body.config,
      enabled: true,
      createdAt: new Date(now).toISOString(),
    },
  }, 201);
});

automationRouter.put('/:id', async (c) => {
  const db = getDatabase();
  const id = c.req.param('id');
  const body = await c.req.json();

  const updates: string[] = [];
  const values: any[] = [];

  if (body.enabled !== undefined) {
    updates.push('enabled = ?');
    values.push(body.enabled ? 1 : 0);
  }

  if (body.config !== undefined) {
    updates.push('config = ?');
    values.push(JSON.stringify(body.config));
  }

  if (body.schedule !== undefined) {
    updates.push('schedule = ?');
    values.push(JSON.stringify(body.schedule));
  }

  if (updates.length > 0) {
    values.push(id);
    db.prepare(`UPDATE automations SET ${updates.join(', ')} WHERE id = ?`).run(...values);
  }

  return c.json({ success: true });
});

automationRouter.delete('/:id', (c) => {
  const db = getDatabase();
  const id = c.req.param('id');
  db.prepare('DELETE FROM automations WHERE id = ?').run(id);
  return c.json({ success: true });
});

automationRouter.post('/:id/run', async (c) => {
  const db = getDatabase();
  const id = c.req.param('id');

  // Update last_run
  db.prepare('UPDATE automations SET last_run = ? WHERE id = ?').run(Date.now(), id);

  // In a real implementation, this would trigger the automation via OpenClaw
  return c.json({ success: true, message: 'Automation triggered' });
});
