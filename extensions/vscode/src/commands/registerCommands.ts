import * as vscode from 'vscode';
import { Container } from '../container';
import { Logger } from '../utils/Logger';

/**
 * Flag option for quick pick
 */
interface FlagOption {
  label: string;
  description: string;
  flag: string;
}

/**
 * Show multi-select quick pick for command flags
 */
async function selectFlags(
  title: string,
  options: FlagOption[],
  canPickMany: boolean = true
): Promise<string[]> {
  const items = options.map(opt => ({
    label: opt.label,
    description: opt.description,
    picked: false,
    flag: opt.flag,
  }));

  // Add "No flags" option at the start
  const noFlagsItem = {
    label: '$(dash) No flags',
    description: 'Run command without flags',
    picked: false,
    flag: '',
  };

  const selected = await vscode.window.showQuickPick(
    [noFlagsItem, ...items],
    {
      title,
      placeHolder: 'Select flags (or choose "No flags" to skip)',
      canPickMany,
    }
  );

  if (!selected) {
    return []; // Cancelled
  }

  if (canPickMany) {
    const selectedArray = selected as typeof items;
    return selectedArray
      .filter(item => item.flag !== '')
      .map(item => item.flag);
  } else {
    const selectedItem = selected as typeof items[0];
    return selectedItem.flag ? [selectedItem.flag] : [];
  }
}

/**
 * Build command string with flags
 */
function buildCommand(baseCommand: string, flags: string[]): string {
  if (flags.length === 0) {
    return baseCommand;
  }
  return `${baseCommand} ${flags.join(' ')}`;
}

/**
 * Register all Yoyo Dev workflow commands
 */
export function registerCommands(context: vscode.ExtensionContext): void {
  const logger = Logger.getInstance();

  // Helper to execute command using TerminalService
  const executeClaudeCommand = async (command: string, commandName: string) => {
    logger.info(`Executing command: ${commandName}`);
    Container.instance.terminalService.executeCommand(command);
  };

  // Product Commands (no flags)
  context.subscriptions.push(
    vscode.commands.registerCommand('yoyoDev.planProduct', async () => {
      await executeClaudeCommand('/plan-product', 'Plan Product');
    })
  );

  context.subscriptions.push(
    vscode.commands.registerCommand('yoyoDev.analyzeProduct', async () => {
      await executeClaudeCommand('/analyze-product', 'Analyze Product');
    })
  );

  // Feature Commands with flags
  context.subscriptions.push(
    vscode.commands.registerCommand('yoyoDev.createNew', async () => {
      const flags = await selectFlags('Create New Feature', [
        { label: '--lite', description: 'Lightweight mode - skip detailed spec', flag: '--lite' },
        { label: '--monitor', description: 'Start task monitor in split pane', flag: '--monitor' },
        { label: '--no-questions', description: 'Skip clarifying questions', flag: '--no-questions' },
      ]);

      if (flags !== undefined) {
        const command = buildCommand('/create-new', flags);
        await executeClaudeCommand(command, 'Create New Feature');
      }
    })
  );

  context.subscriptions.push(
    vscode.commands.registerCommand('yoyoDev.createSpec', async () => {
      const flags = await selectFlags('Create Specification', [
        { label: '--no-questions', description: 'Skip clarifying questions', flag: '--no-questions' },
      ]);

      if (flags !== undefined) {
        const command = buildCommand('/create-spec', flags);
        await executeClaudeCommand(command, 'Create Specification');
      }
    })
  );

  context.subscriptions.push(
    vscode.commands.registerCommand('yoyoDev.createTasks', async () => {
      const flags = await selectFlags('Create Tasks', [
        { label: '--master', description: 'Use MASTER-TASKS.md format', flag: '--master' },
        { label: '--parallel', description: 'Auto-analyze for parallel execution', flag: '--parallel' },
      ]);

      if (flags !== undefined) {
        const command = buildCommand('/create-tasks', flags);
        await executeClaudeCommand(command, 'Create Tasks');
      }
    })
  );

  context.subscriptions.push(
    vscode.commands.registerCommand('yoyoDev.executeTasks', async () => {
      const flags = await selectFlags('Execute Tasks', [
        { label: '--all', description: 'Run all tasks without pausing', flag: '--all' },
        { label: '--parallel', description: 'Enable parallel execution', flag: '--parallel' },
        { label: '--sequential', description: 'Force sequential execution', flag: '--sequential' },
        { label: '--monitor', description: 'Launch task monitor', flag: '--monitor' },
        { label: '--design-mode', description: 'Enable design system validation', flag: '--design-mode' },
        { label: '--devil', description: 'Apply devil\'s advocate review', flag: '--devil' },
        { label: '--security', description: 'Apply security review', flag: '--security' },
        { label: '--performance', description: 'Apply performance review', flag: '--performance' },
      ]);

      if (flags !== undefined) {
        // Check if user wants to run specific task
        const taskNumber = await vscode.window.showInputBox({
          title: 'Execute Specific Task',
          prompt: 'Enter task number (e.g., 2) or leave empty for all tasks',
          placeHolder: 'Task number (optional)',
        });

        let allFlags = [...flags];
        if (taskNumber && taskNumber.trim()) {
          allFlags.push(`--task=${taskNumber.trim()}`);
        }

        const command = buildCommand('/execute-tasks', allFlags);
        await executeClaudeCommand(command, 'Execute Tasks');
      }
    })
  );

  // Fix Commands
  context.subscriptions.push(
    vscode.commands.registerCommand('yoyoDev.createFix', async () => {
      const flags = await selectFlags('Create Fix', [
        { label: '--quick', description: 'Skip investigation, go straight to fix', flag: '--quick' },
        { label: '--monitor', description: 'Start with task monitor', flag: '--monitor' },
      ]);

      if (flags !== undefined) {
        const command = buildCommand('/create-fix', flags);
        await executeClaudeCommand(command, 'Create Fix');
      }
    })
  );

  // Advanced Commands
  context.subscriptions.push(
    vscode.commands.registerCommand('yoyoDev.orchestrateTasks', async () => {
      await executeClaudeCommand('/orchestrate-tasks', 'Orchestrate Tasks');
    })
  );

  context.subscriptions.push(
    vscode.commands.registerCommand('yoyoDev.review', async () => {
      // Prompt for review mode (single select)
      const mode = await vscode.window.showQuickPick(
        [
          { label: '--devil', description: 'Find what will break, challenge assumptions' },
          { label: '--security', description: 'Audit for vulnerabilities, auth issues' },
          { label: '--performance', description: 'Check bottlenecks, memory leaks' },
          { label: '--production', description: 'Verify production readiness' },
          { label: '--premortem', description: 'Analyze why feature will fail before building' },
          { label: '--quality', description: 'Check maintainability, test coverage' },
        ],
        {
          placeHolder: 'Select review mode',
          title: 'Yoyo Dev: Review Code',
        }
      );

      if (mode) {
        await executeClaudeCommand(`/review ${mode.label}`, `Review (${mode.label})`);
      }
    })
  );

  // Design Commands
  context.subscriptions.push(
    vscode.commands.registerCommand('yoyoDev.designInit', async () => {
      const flags = await selectFlags('Initialize Design System', [
        { label: '--analyze', description: 'Analyze existing codebase first', flag: '--analyze' },
        { label: '--minimal', description: 'Create minimal design token set', flag: '--minimal' },
        { label: '--wcag-aaa', description: 'Use WCAG AAA standards (stricter)', flag: '--wcag-aaa' },
      ]);

      if (flags !== undefined) {
        const command = buildCommand('/design-init', flags);
        await executeClaudeCommand(command, 'Initialize Design System');
      }
    })
  );

  context.subscriptions.push(
    vscode.commands.registerCommand('yoyoDev.designAudit', async () => {
      const flags = await selectFlags('Audit Design', [
        { label: '--colors', description: 'Audit colors only', flag: '--colors' },
        { label: '--spacing', description: 'Audit spacing only', flag: '--spacing' },
        { label: '--contrast', description: 'Audit contrast only', flag: '--contrast' },
        { label: '--focus', description: 'Audit focus states only', flag: '--focus' },
        { label: '--critical-only', description: 'Show only critical violations', flag: '--critical-only' },
      ]);

      if (flags !== undefined) {
        const command = buildCommand('/design-audit', flags);
        await executeClaudeCommand(command, 'Audit Design');
      }
    })
  );

  context.subscriptions.push(
    vscode.commands.registerCommand('yoyoDev.designFix', async () => {
      const flags = await selectFlags('Fix Design', [
        { label: '--colors', description: 'Fix color violations only', flag: '--colors' },
        { label: '--spacing', description: 'Fix spacing violations only', flag: '--spacing' },
        { label: '--contrast', description: 'Fix contrast violations only', flag: '--contrast' },
        { label: '--focus', description: 'Fix focus state violations only', flag: '--focus' },
        { label: '--monitor', description: 'Start with task monitor', flag: '--monitor' },
      ]);

      if (flags !== undefined) {
        const command = buildCommand('/design-fix', flags);
        await executeClaudeCommand(command, 'Fix Design');
      }
    })
  );

  context.subscriptions.push(
    vscode.commands.registerCommand('yoyoDev.designComponent', async () => {
      // First ask for pattern type
      const pattern = await vscode.window.showQuickPick(
        [
          { label: 'No pattern', description: 'Create component without base pattern', value: '' },
          { label: 'button', description: 'Button component pattern', value: '--pattern=button' },
          { label: 'card', description: 'Card component pattern', value: '--pattern=card' },
          { label: 'form', description: 'Form component pattern', value: '--pattern=form' },
          { label: 'navigation', description: 'Navigation component pattern', value: '--pattern=navigation' },
          { label: 'layout', description: 'Layout component pattern', value: '--pattern=layout' },
        ],
        {
          title: 'Create Design Component',
          placeHolder: 'Select base pattern (optional)',
        }
      );

      if (pattern === undefined) {
        return; // Cancelled
      }

      // Then ask about strict mode
      const strict = await vscode.window.showQuickPick(
        [
          { label: 'Normal mode', description: 'Allow minor violations', value: '' },
          { label: '--strict', description: 'Zero violations allowed (blocks merge)', value: '--strict' },
        ],
        {
          title: 'Validation Mode',
          placeHolder: 'Select validation strictness',
        }
      );

      if (strict === undefined) {
        return; // Cancelled
      }

      const flags = [pattern.value, strict.value].filter(f => f !== '');
      const command = buildCommand('/design-component', flags);
      await executeClaudeCommand(command, 'Create Design Component');
    })
  );

  // Utility Commands
  context.subscriptions.push(
    vscode.commands.registerCommand('yoyoDev.containerize', async () => {
      const appType = await vscode.window.showQuickPick(
        [
          { label: '--node', description: 'Node.js application', value: '--node' },
          { label: '--python', description: 'Python application', value: '--python' },
          { label: '--java', description: 'Java application', value: '--java' },
          { label: '--go', description: 'Go application', value: '--go' },
        ],
        {
          title: 'Containerize Application',
          placeHolder: 'Select application type',
        }
      );

      if (!appType) {
        return; // Cancelled
      }

      const multiStage = await vscode.window.showQuickPick(
        [
          { label: 'Standard build', description: 'Single-stage Dockerfile', value: '' },
          { label: '--multi-stage', description: 'Multi-stage build for smaller images', value: '--multi-stage' },
        ],
        {
          title: 'Build Type',
          placeHolder: 'Select build type',
        }
      );

      if (multiStage === undefined) {
        return; // Cancelled
      }

      const flags = [appType.value, multiStage.value].filter(f => f !== '');
      const command = buildCommand('/containerize-application', flags);
      await executeClaudeCommand(command, 'Containerize Application');
    })
  );

  context.subscriptions.push(
    vscode.commands.registerCommand('yoyoDev.improveSkills', async () => {
      await executeClaudeCommand('/improve-skills', 'Improve Skills');
    })
  );

  logger.info('Registered 16 Yoyo Dev workflow commands with flag support');
}
