/**
 * Headless Mode
 *
 * Non-interactive mode for CI/CD and scripting.
 * Supports text, JSON, and stream-JSON output formats.
 */

import type { CLIState, OutputFormat, ExitCode } from './types.js';
import { MemoryService } from '../memory/index.js';

// =============================================================================
// Types
// =============================================================================

/**
 * Headless execution result.
 */
interface HeadlessResult {
  success: boolean;
  model: string;
  prompt: string;
  response: string;
  memory?: {
    enabled: boolean;
    blocks?: string[];
  };
  error?: string;
  exitCode: number;
}

/**
 * Stream event types for stream-json output.
 */
type StreamEvent =
  | { type: 'start'; model: string; timestamp: string }
  | { type: 'text'; content: string }
  | { type: 'memory'; blocks: string[] }
  | { type: 'end'; success: boolean; exitCode: number };

// =============================================================================
// Output Formatters
// =============================================================================

/**
 * Output as plain text.
 */
function outputText(result: HeadlessResult): void {
  if (result.success) {
    console.log(result.response);
  } else {
    console.error(`Error: ${result.error}`);
  }
}

/**
 * Output as JSON.
 */
function outputJson(result: HeadlessResult): void {
  console.log(JSON.stringify(result, null, 2));
}

/**
 * Output as stream-json (one JSON object per line).
 */
function outputStreamJson(result: HeadlessResult): void {
  // Start event
  const startEvent: StreamEvent = {
    type: 'start',
    model: result.model,
    timestamp: new Date().toISOString(),
  };
  console.log(JSON.stringify(startEvent));

  // Memory event (if available)
  if (result.memory?.blocks && result.memory.blocks.length > 0) {
    const memoryEvent: StreamEvent = {
      type: 'memory',
      blocks: result.memory.blocks,
    };
    console.log(JSON.stringify(memoryEvent));
  }

  // Text event
  const textEvent: StreamEvent = {
    type: 'text',
    content: result.success ? result.response : `Error: ${result.error}`,
  };
  console.log(JSON.stringify(textEvent));

  // End event
  const endEvent: StreamEvent = {
    type: 'end',
    success: result.success,
    exitCode: result.exitCode,
  };
  console.log(JSON.stringify(endEvent));
}

// =============================================================================
// Headless Executor
// =============================================================================

/**
 * Execute in headless mode.
 *
 * @param state - CLI state
 * @returns Exit code
 */
export async function runHeadless(state: CLIState): Promise<ExitCode> {
  const { args, config } = state;
  const prompt = args.prompt;

  // Validate prompt
  if (!prompt) {
    console.error('Error: --prompt is required in headless mode');
    return 1 as ExitCode;
  }

  let memoryService: MemoryService | null = null;
  let memoryBlocks: string[] = [];

  try {
    // Initialize memory if enabled
    if (config.memory.enabled) {
      try {
        memoryService = new MemoryService({
          projectRoot: args.cwd,
          globalPath: config.memory.globalPath,
        });
        memoryService.initialize();

        // Load memory
        const memory = memoryService.loadAllMemory();
        memoryBlocks = Object.keys(memory).filter(
          (k) => memory[k as keyof typeof memory]
        );
      } catch (error) {
        // Memory initialization failure is not fatal in headless mode
        if (args.verbose) {
          console.error(`Warning: Memory initialization failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
      }
    }

    // TODO: Send to AI (Phase 3)
    // For now, return a placeholder response
    const response = `Processing: "${prompt}"\n\nAI integration coming in Phase 3...`;

    const result: HeadlessResult = {
      success: true,
      model: state.model,
      prompt,
      response,
      memory: {
        enabled: config.memory.enabled,
        blocks: memoryBlocks,
      },
      exitCode: 0,
    };

    // Output based on format
    outputResult(result, args.output);

    return 0 as ExitCode;
  } catch (error) {
    const result: HeadlessResult = {
      success: false,
      model: state.model,
      prompt: prompt ?? '',
      response: '',
      error: error instanceof Error ? error.message : 'Unknown error',
      exitCode: 1,
    };

    outputResult(result, args.output);

    return 1 as ExitCode;
  } finally {
    // Cleanup
    if (memoryService) {
      memoryService.close();
    }
  }
}

/**
 * Output result in the specified format.
 */
function outputResult(result: HeadlessResult, format: OutputFormat): void {
  switch (format) {
    case 'json':
      outputJson(result);
      break;
    case 'stream-json':
      outputStreamJson(result);
      break;
    case 'text':
    default:
      outputText(result);
      break;
  }
}
