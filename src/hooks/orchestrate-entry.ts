#!/usr/bin/env node
/**
 * Orchestration Hook Entry Point
 * @version 6.2.0
 * @description Claude Code UserPromptSubmit hook for intent classification and routing
 *
 * This script runs before Claude processes user input:
 * 1. Reads hook input from stdin (JSON)
 * 2. Classifies user intent
 * 3. Routes to appropriate agent
 * 4. Outputs context to stdout (injected before user message)
 *
 * CRITICAL: This script must NEVER block the user.
 * All errors exit with code 0 to pass through unchanged.
 */

import { IntentClassifier } from '../orchestration/intent-classifier';
import { OrchestrationRouter } from '../orchestration/router';
import { OutputFormatter } from '../orchestration/output-formatter';
import { ConfigLoader } from '../orchestration/config-loader';
import { execSync } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';

/**
 * Claude Code hook input format
 */
interface HookInput {
  session_id: string;
  transcript_path: string;
  cwd: string;
  hook_event_name: string;
  prompt: string;
}

/**
 * Read all data from stdin
 */
async function readStdin(): Promise<string> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    const timeout = setTimeout(() => {
      reject(new Error('stdin read timeout'));
    }, 3000);

    process.stdin.on('data', (chunk) => {
      chunks.push(chunk);
    });

    process.stdin.on('end', () => {
      clearTimeout(timeout);
      resolve(Buffer.concat(chunks).toString('utf-8'));
    });

    process.stdin.on('error', (err) => {
      clearTimeout(timeout);
      reject(err);
    });
  });
}

/**
 * Get project state for context enrichment
 */
function getProjectState(cwd: string): { activeSpec?: string; currentTask?: string; gitBranch?: string } {
  const state: { activeSpec?: string; currentTask?: string; gitBranch?: string } = {};

  try {
    // Get git branch
    const branch = execSync('git rev-parse --abbrev-ref HEAD', {
      cwd,
      encoding: 'utf-8',
      stdio: ['pipe', 'pipe', 'pipe'],
    }).trim();
    if (branch) {
      state.gitBranch = branch;
    }
  } catch {
    // Ignore git errors
  }

  try {
    // Find most recent spec with state.json
    const specsDir = path.join(cwd, '.yoyo-dev', 'specs');
    if (fs.existsSync(specsDir)) {
      const specs = fs.readdirSync(specsDir)
        .filter((d) => fs.statSync(path.join(specsDir, d)).isDirectory())
        .sort()
        .reverse();

      for (const specDir of specs) {
        const stateFile = path.join(specsDir, specDir, 'state.json');
        if (fs.existsSync(stateFile)) {
          const stateData = JSON.parse(fs.readFileSync(stateFile, 'utf-8'));
          if (stateData.current_phase !== 'completed') {
            state.activeSpec = stateData.spec_name || specDir;
            if (stateData.active_task) {
              state.currentTask = stateData.active_task;
            }
            break;
          }
        }
      }
    }
  } catch {
    // Ignore state loading errors
  }

  return state;
}

/**
 * Parse hook input from stdin
 */
function parseInput(raw: string): HookInput {
  const parsed = JSON.parse(raw);

  // Validate required fields
  if (typeof parsed.prompt !== 'string') {
    throw new Error('Missing or invalid prompt field');
  }

  return {
    session_id: parsed.session_id ?? '',
    transcript_path: parsed.transcript_path ?? '',
    cwd: parsed.cwd ?? process.cwd(),
    hook_event_name: parsed.hook_event_name ?? 'UserPromptSubmit',
    prompt: parsed.prompt,
  };
}

/**
 * Main hook execution
 */
async function main(): Promise<void> {
  // Read and parse stdin
  const rawInput = await readStdin();

  // Handle empty input (pass through)
  if (!rawInput.trim()) {
    process.exit(0);
  }

  const input = parseInput(rawInput);

  // Load configuration from project root
  const configLoader = new ConfigLoader(input.cwd);
  const config = configLoader.load();

  // Check if orchestration is disabled
  if (!config.enabled || !config.globalMode) {
    process.exit(0); // Pass through unchanged
  }

  // Initialize orchestration components
  const classifier = new IntentClassifier({
    confidenceThreshold: config.confidenceThreshold,
    maxLatencyMs: config.intentClassification.maxLatencyMs,
  });

  const router = new OrchestrationRouter(config.routing);

  const formatter = new OutputFormatter({
    showPrefixes: config.showPrefixes,
  });

  // Classify intent
  const classification = classifier.classify(input.prompt);

  // Check bypass conditions (slash commands, "directly:" prefix)
  if (!classification.shouldOrchestrate) {
    process.exit(0); // Pass through unchanged
  }

  // Route to appropriate agent
  const routing = router.route(classification, input.prompt);

  // Get project state for context enrichment
  const projectState = getProjectState(input.cwd);

  // Format output context (context enrichment only, not agent switching)
  const context = formatter.formatRoutingContext(classification, routing, projectState);

  // Output context to stdout (will be injected before user's message)
  process.stdout.write(context);
  process.exit(0);
}

// Run main with comprehensive error handling
main().catch((error) => {
  // Log error to stderr for debugging (visible in Claude Code debug mode)
  console.error(`[orchestration-hook] Error: ${error.message}`);

  // CRITICAL: Always exit 0 to never block the user
  // Errors pass through silently, allowing Claude to process the message normally
  process.exit(0);
});
