/**
 * Help API Routes
 *
 * Provides documentation content and search functionality.
 */

import { Hono } from 'hono';
import Fuse from 'fuse.js';
import type { Variables } from '../types.js';
import type { HelpSection, HelpArticle, HelpSearchResult, HelpSearchResponse, HelpSectionsResponse } from '../../shared/types/help.js';

export const helpRoutes = new Hono<{ Variables: Variables }>();

// =============================================================================
// Help Content Data
// =============================================================================

const helpSections: HelpSection[] = [
  {
    id: 'getting-started',
    title: 'Getting Started',
    icon: 'Rocket',
    defaultOpen: true,
    articles: [
      {
        id: 'what-is-yoyo',
        title: 'What is Yoyo Dev?',
        type: 'text',
        content: `Yoyo Dev is an AI-assisted development framework that provides:

- **Structured Workflows** - Consistent processes for product planning, specification, and task execution
- **Multi-Agent Orchestration** - Specialized agents for research, code exploration, frontend, documentation
- **Claude Code Integration** - Seamless CLI tool integration with slash commands
- **Persistent Memory** - Context preservation across sessions
- **Browser GUI** - Real-time dashboard for monitoring and management`,
      },
      {
        id: 'quick-start',
        title: 'Quick Start',
        type: 'text',
        content: `**1. Install Yoyo Dev in your project:**
\`\`\`bash
curl -fsSL https://raw.githubusercontent.com/yourusername/yoyo-dev/main/setup/install.sh | bash
\`\`\`

**2. Launch the development environment:**
\`\`\`bash
yoyo
\`\`\`

**3. Start building with AI:**
\`\`\`
/create-new "Add user authentication"
\`\`\`

The framework will guide you through specification, task breakdown, and implementation.`,
      },
      {
        id: 'prerequisites',
        title: 'Prerequisites',
        type: 'text',
        content: `- **Node.js** 18+ (required)
- **Claude Code CLI** (recommended for full integration)
- **Git** (for version control features)
- **Modern terminal** with ANSI color support`,
      },
    ],
  },
  {
    id: 'installation',
    title: 'Installation',
    icon: 'Download',
    articles: [
      {
        id: 'install-script',
        title: 'Installation Script',
        type: 'command',
        content: `# Basic installation
./install.sh

# With Claude Code integration
./install.sh --claude-code

# Skip CLAUDE.md generation
./install.sh --no-claude-md

# Skip MCP server setup
./install.sh --no-auto-mcp`,
      },
      {
        id: 'update-script',
        title: 'Updating Yoyo Dev',
        type: 'command',
        content: `# Update to latest version
yoyo-update

# Keep all customizations
yoyo-update --no-overwrite

# Regenerate project CLAUDE.md
yoyo-update --regenerate-claude

# Skip MCP verification
yoyo-update --skip-mcp-check`,
      },
      {
        id: 'global-commands',
        title: 'Global Commands',
        type: 'text',
        content: `After installation, these commands are available globally:

- \`yoyo\` - Launch Claude Code with GUI dashboard
- \`yoyo-gui\` - Launch browser GUI only (no Claude Code)
- \`yoyo-update\` - Update Yoyo Dev framework`,
      },
    ],
  },
  {
    id: 'commands',
    title: 'Commands Reference',
    icon: 'Terminal',
    articles: [
      {
        id: 'product-commands',
        title: 'Product Planning',
        type: 'command',
        content: `/plan-product
  Create product mission, roadmap, and tech-stack docs

/analyze-product
  Analyze existing codebase and create documentation`,
      },
      {
        id: 'feature-commands',
        title: 'Feature Creation',
        type: 'command',
        content: `/create-new "feature description"
  Full workflow: spec + tasks + ready for execution

/create-spec "feature description"
  Create detailed feature specification

/create-tasks
  Generate task breakdown from existing spec`,
      },
      {
        id: 'execution-commands',
        title: 'Task Execution',
        type: 'command',
        content: `/execute-tasks
  Execute tasks with TDD approach (default: Yoyo-AI orchestrator)

/execute-tasks --orchestrator legacy
  Use legacy v4.0 linear workflow

/orchestrate-tasks
  Advanced multi-agent orchestration with manual assignment`,
      },
      {
        id: 'fix-commands',
        title: 'Bug Fixing',
        type: 'command',
        content: `/create-fix "bug description"
  Systematic bug fix workflow with root cause analysis`,
      },
      {
        id: 'status-commands',
        title: 'Status & Listings',
        type: 'command',
        content: `/yoyo-status
  Display project status dashboard

/specs
  List all specifications

/spec [name]
  View specific spec details

/fixes
  List all bug fix records

/fix [name]
  View specific fix details

/tasks
  Show tasks for current spec`,
      },
      {
        id: 'research-commands',
        title: 'Research & Oracle',
        type: 'command',
        content: `/research "topic"
  Background research (docs, GitHub, web)

/consult-oracle
  Strategic architecture advice or debug complex issues`,
      },
      {
        id: 'design-commands',
        title: 'Design System',
        type: 'command',
        content: `/design-init
  Initialize design system with tokens and Tailwind config

/design-audit
  Audit design system compliance

/design-fix
  Fix design violations from audit

/design-component
  Create UI component with validation`,
      },
      {
        id: 'utility-commands',
        title: 'Utility Commands',
        type: 'command',
        content: `/yoyo-init
  Initialize Yoyo Dev in current project

/yoyo-help
  Display all commands and usage

/yoyo-cleanup
  Professional project cleanup

/yoyo-review [--devil|--security|--performance|--production]
  Critical code review with specific focus

/improve-skills
  Optimize Claude Code skill descriptions`,
      },
    ],
  },
  {
    id: 'workflows',
    title: 'Workflows',
    icon: 'GitBranch',
    articles: [
      {
        id: 'feature-workflow',
        title: 'Feature Development Flow',
        type: 'diagram',
        content: `graph LR
    A[/create-new] --> B[Spec Creation]
    B --> C[Task Breakdown]
    C --> D[/execute-tasks]
    D --> E[Implementation]
    E --> F[Testing]
    F --> G[Commit]`,
      },
      {
        id: 'bug-fix-workflow',
        title: 'Bug Fix Flow',
        type: 'diagram',
        content: `graph LR
    A[/create-fix] --> B[Analysis]
    B --> C[Root Cause]
    C --> D[Solution Design]
    D --> E[Implementation]
    E --> F[Verification]`,
      },
      {
        id: 'orchestration-workflow',
        title: 'Multi-Agent Orchestration',
        type: 'diagram',
        content: `graph TD
    A[User Input] --> B{Intent Classifier}
    B -->|Research| C[alma-librarian]
    B -->|Codebase| D[alvaro-explore]
    B -->|Frontend| E[dave-engineer]
    B -->|Debug| F[arthas-oracle]
    B -->|Docs| G[angeles-writer]
    B -->|Default| H[yoyo-ai]
    H --> I[Delegation]
    I --> C
    I --> D
    I --> E`,
      },
    ],
  },
  {
    id: 'agents',
    title: 'Agents',
    icon: 'Bot',
    articles: [
      {
        id: 'agent-overview',
        title: 'Agent Architecture',
        type: 'text',
        content: `Yoyo Dev uses specialized agents for different tasks:

**Primary Orchestrator:**
- \`yoyo-ai\` - Coordinates work, manages task execution, delegates to specialists

**Specialist Agents:**
- \`arthas-oracle\` - Strategic advisor, architecture decisions, failure analysis
- \`alma-librarian\` - External research, documentation, best practices
- \`alvaro-explore\` - Internal codebase search, pattern matching
- \`dave-engineer\` - Frontend/UI specialist, styling, accessibility
- \`angeles-writer\` - Technical documentation, READMEs, guides

**How Delegation Works:**
1. User input classified by intent (<10ms)
2. High-confidence intents routed to specialists
3. Low-confidence handled directly by yoyo-ai
4. Failure recovery escalates to arthas-oracle after 3 attempts`,
      },
      {
        id: 'agent-customization',
        title: 'Customizing Agents',
        type: 'text',
        content: `Agent definitions are stored in \`.claude/agents/*.md\`

Each agent file contains:
- YAML frontmatter (name, description)
- Model and temperature settings
- Mode (Primary/Subagent)
- System prompt and instructions
- Tool access permissions

Use the Agents page in the GUI to view, edit, or create agents.`,
      },
    ],
  },
  {
    id: 'ralph',
    title: 'Ralph (Autonomous)',
    icon: 'Zap',
    articles: [
      {
        id: 'ralph-overview',
        title: 'What is Ralph?',
        type: 'text',
        content: `Ralph enables continuous autonomous development cycles with Claude Code.

**Key Features:**
- Rate limiting (100 calls/hour default)
- Circuit breaker (3 stalls = stop)
- Exit detection (completion signals)
- Auto-install on first use

**Safety Features:**
- Never commits without human review
- Stops on repeated failures
- Respects project boundaries`,
      },
      {
        id: 'ralph-usage',
        title: 'Using Ralph',
        type: 'command',
        content: `# Start Ralph with a command
yoyo --ralph execute-tasks

# Create spec autonomously
yoyo --ralph create-spec "feature"

# Fix bugs autonomously
yoyo --ralph create-fix "bug"

# With monitor mode
yoyo --ralph execute-tasks --ralph-monitor`,
      },
      {
        id: 'ralph-commands',
        title: 'Ralph Commands',
        type: 'command',
        content: `/ralph-status
  Check Ralph status and metrics

/ralph-stop
  Stop Ralph execution

/ralph-config
  Configure Ralph settings`,
      },
    ],
  },
  {
    id: 'memory',
    title: 'Memory System',
    icon: 'Database',
    articles: [
      {
        id: 'memory-overview',
        title: 'Memory Architecture',
        type: 'text',
        content: `Yoyo Dev uses a persistent memory system:

**Storage:**
- SQLite database for structured data
- JSON files for configuration
- Markdown for human-readable context

**Memory Scopes:**
- \`global\` - Shared across all projects
- \`project\` - Specific to current project

**Memory Blocks:**
- \`persona\` - AI personality and behavior
- \`project\` - Project-specific context
- \`user\` - User preferences
- \`corrections\` - Error patterns and fixes`,
      },
      {
        id: 'memory-commands',
        title: 'Memory Commands',
        type: 'command',
        content: `/yoyo-ai-memory
  Initialize or view memory system status`,
      },
    ],
  },
  {
    id: 'skills',
    title: 'Skills System',
    icon: 'Sparkles',
    articles: [
      {
        id: 'skills-overview',
        title: 'How Skills Work',
        type: 'text',
        content: `Skills are learned patterns that improve AI effectiveness:

**Skill Learning:**
1. Successful patterns captured automatically
2. Keywords and triggers identified
3. Success rate tracked over time
4. Skills refined based on usage

**Skill Files:**
Located in \`.claude/skills/*.md\`, each containing:
- Keywords and triggers
- Success conditions
- Implementation patterns
- Usage examples`,
      },
      {
        id: 'skills-management',
        title: 'Managing Skills',
        type: 'text',
        content: `Use the Skills page in the GUI to:
- View all learned skills
- Edit skill definitions
- Track success rates
- Delete unused skills

Command:
\`\`\`
/improve-skills
  Optimize skill descriptions for better triggering
\`\`\``,
      },
    ],
  },
  {
    id: 'gui',
    title: 'GUI Dashboard',
    icon: 'Layout',
    articles: [
      {
        id: 'gui-overview',
        title: 'Dashboard Overview',
        type: 'text',
        content: `The browser GUI provides real-time monitoring and management:

**Pages:**
- **Dashboard** - Project status, quick actions
- **Specs** - Feature specifications
- **Fixes** - Bug fix records
- **Tasks** - Current task status
- **Roadmap** - Product roadmap visualization
- **Chat** - Codebase Q&A
- **Memory** - Memory system browser
- **Skills** - Skill management
- **Recaps** - Session summaries
- **Patterns** - Code patterns
- **Agents** - Agent management
- **Help** - This documentation`,
      },
      {
        id: 'gui-launch',
        title: 'Launching the GUI',
        type: 'command',
        content: `# With Claude Code (recommended)
yoyo

# GUI only (no Claude Code)
yoyo-gui

# Access at
http://localhost:5173  # Development
http://localhost:3456  # Production`,
      },
      {
        id: 'gui-features',
        title: 'Key Features',
        type: 'text',
        content: `**Real-time Updates:**
- WebSocket connection for live data
- Automatic refresh on file changes

**Theme:**
- Terminal-style dark mode
- Syntax highlighting for code

**Responsive:**
- Works on desktop and mobile
- Collapsible sidebar navigation`,
      },
    ],
  },
];

// =============================================================================
// Search Index
// =============================================================================

interface SearchableItem {
  sectionId: string;
  sectionTitle: string;
  articleId: string;
  articleTitle: string;
  content: string;
  type: HelpArticle['type'];
}

function buildSearchIndex(): SearchableItem[] {
  const items: SearchableItem[] = [];

  for (const section of helpSections) {
    for (const article of section.articles) {
      items.push({
        sectionId: section.id,
        sectionTitle: section.title,
        articleId: article.id,
        articleTitle: article.title,
        content: article.content,
        type: article.type,
      });
    }
  }

  return items;
}

const searchIndex = buildSearchIndex();

const fuse = new Fuse(searchIndex, {
  keys: [
    { name: 'articleTitle', weight: 2 },
    { name: 'content', weight: 1 },
    { name: 'sectionTitle', weight: 0.5 },
  ],
  threshold: 0.3,
  includeScore: true,
  ignoreLocation: true,
});

// =============================================================================
// Routes
// =============================================================================

/**
 * GET /api/help/sections - Get all help sections
 */
helpRoutes.get('/sections', (c) => {
  let commandCount = 0;
  for (const section of helpSections) {
    for (const article of section.articles) {
      if (article.type === 'command') {
        commandCount++;
      }
    }
  }

  const response: HelpSectionsResponse = {
    sections: helpSections,
    commandCount,
    lastUpdated: new Date().toISOString(),
  };

  return c.json(response);
});

/**
 * GET /api/help/search - Search help content
 */
helpRoutes.get('/search', (c) => {
  const query = c.req.query('q');

  if (!query || query.length < 2) {
    return c.json({
      query: query || '',
      results: [],
      totalMatches: 0,
    } as HelpSearchResponse);
  }

  const results = fuse.search(query, { limit: 20 });

  const searchResults: HelpSearchResult[] = results.map((result) => {
    // Extract excerpt around the match
    const content = result.item.content;
    const queryLower = query.toLowerCase();
    const contentLower = content.toLowerCase();
    const matchIndex = contentLower.indexOf(queryLower);

    let excerpt: string;
    if (matchIndex >= 0) {
      const start = Math.max(0, matchIndex - 50);
      const end = Math.min(content.length, matchIndex + query.length + 100);
      excerpt = (start > 0 ? '...' : '') + content.slice(start, end) + (end < content.length ? '...' : '');
    } else {
      excerpt = content.slice(0, 150) + (content.length > 150 ? '...' : '');
    }

    return {
      sectionId: result.item.sectionId,
      sectionTitle: result.item.sectionTitle,
      articleId: result.item.articleId,
      articleTitle: result.item.articleTitle,
      excerpt,
      score: 1 - (result.score || 0),
      type: result.item.type,
    };
  });

  const response: HelpSearchResponse = {
    query,
    results: searchResults,
    totalMatches: results.length,
  };

  return c.json(response);
});

/**
 * GET /api/help/section/:id - Get a specific section
 */
helpRoutes.get('/section/:id', (c) => {
  const id = c.req.param('id');
  const section = helpSections.find((s) => s.id === id);

  if (!section) {
    return c.json({ error: 'Section not found' }, 404);
  }

  return c.json(section);
});
