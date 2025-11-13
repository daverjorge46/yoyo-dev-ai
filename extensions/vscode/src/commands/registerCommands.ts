import * as vscode from 'vscode';
import { Container } from '../container';
import { Logger } from '../utils/Logger';

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

  // Product Commands
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

  // Feature Commands
  context.subscriptions.push(
    vscode.commands.registerCommand('yoyoDev.createNew', async () => {
      await executeClaudeCommand('/create-new', 'Create New Feature');
    })
  );

  context.subscriptions.push(
    vscode.commands.registerCommand('yoyoDev.createSpec', async () => {
      await executeClaudeCommand('/create-spec', 'Create Specification');
    })
  );

  context.subscriptions.push(
    vscode.commands.registerCommand('yoyoDev.createTasks', async () => {
      await executeClaudeCommand('/create-tasks', 'Create Tasks');
    })
  );

  context.subscriptions.push(
    vscode.commands.registerCommand('yoyoDev.executeTasks', async () => {
      await executeClaudeCommand('/execute-tasks', 'Execute Tasks');
    })
  );

  // Fix Commands
  context.subscriptions.push(
    vscode.commands.registerCommand('yoyoDev.createFix', async () => {
      await executeClaudeCommand('/create-fix', 'Create Fix');
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
      // Prompt for review mode
      const mode = await vscode.window.showQuickPick(
        ['--devil', '--security', '--performance', '--production', '--quality'],
        {
          placeHolder: 'Select review mode',
          title: 'Yoyo Dev: Review Code',
        }
      );

      if (mode) {
        await executeClaudeCommand(`/review ${mode}`, `Review (${mode})`);
      }
    })
  );

  // Design Commands
  context.subscriptions.push(
    vscode.commands.registerCommand('yoyoDev.designInit', async () => {
      await executeClaudeCommand('/design-init', 'Initialize Design System');
    })
  );

  context.subscriptions.push(
    vscode.commands.registerCommand('yoyoDev.designAudit', async () => {
      await executeClaudeCommand('/design-audit', 'Audit Design');
    })
  );

  context.subscriptions.push(
    vscode.commands.registerCommand('yoyoDev.designFix', async () => {
      await executeClaudeCommand('/design-fix', 'Fix Design');
    })
  );

  context.subscriptions.push(
    vscode.commands.registerCommand('yoyoDev.designComponent', async () => {
      await executeClaudeCommand('/design-component', 'Create Design Component');
    })
  );

  // Utility Commands
  context.subscriptions.push(
    vscode.commands.registerCommand('yoyoDev.containerize', async () => {
      await executeClaudeCommand('/containerize-application', 'Containerize Application');
    })
  );

  context.subscriptions.push(
    vscode.commands.registerCommand('yoyoDev.improveSkills', async () => {
      await executeClaudeCommand('/improve-skills', 'Improve Skills');
    })
  );

  logger.info('Registered 16 Yoyo Dev workflow commands');
}
