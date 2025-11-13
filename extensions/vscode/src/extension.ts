import * as vscode from 'vscode';
import { Container } from './container';
import { EventBus, YoyoEvent } from './utils/EventBus';
import { Logger } from './utils/Logger';
import { FileWatcher } from './utils/FileWatcher';
import { TaskTreeDataProvider } from './providers/TaskTreeDataProvider';
import { RoadmapTreeDataProvider } from './providers/RoadmapTreeDataProvider';
import { SpecWebviewProvider } from './providers/SpecWebviewProvider';
import { GitInfoProvider } from './providers/GitInfoProvider';
import { registerCommands } from './commands/registerCommands';

/**
 * Extension activation entry point
 * Called when extension is activated (workspace contains .yoyo-dev or command invoked)
 */
export async function activate(context: vscode.ExtensionContext) {
  const startTime = Date.now();

  // Initialize logger first
  const logger = Logger.getInstance();
  logger.info('Yoyo Dev extension activating...');

  // Initialize dependency injection container
  Container.initialize(context);

  // Initialize file service and wait for it
  await Container.instance.fileService.initialize();

  // Set context based on whether .yoyo-dev was found
  const yoyoDevPath = Container.instance.fileService.getYoyoDevPath();
  const isYoyoDevActive = yoyoDevPath !== null;
  vscode.commands.executeCommand('setContext', 'yoyoDevActive', isYoyoDevActive);

  if (isYoyoDevActive) {
    logger.info(`✓ Yoyo Dev project detected at: ${yoyoDevPath}`);
  } else {
    logger.warn('✗ No .yoyo-dev folder found in workspace. Please open a Yoyo Dev project.');
  }

  // Initialize event bus
  const eventBus = EventBus.getInstance();
  logger.debug('EventBus initialized');

  // Initialize file watcher
  const fileWatcher = new FileWatcher();
  logger.debug('FileWatcher initialized');

  // Register logger, event bus, and file watcher for disposal
  context.subscriptions.push(logger, eventBus, fileWatcher);

  // Initialize task tree view
  const taskTreeDataProvider = new TaskTreeDataProvider(Container.instance.fileService);
  const taskTreeView = vscode.window.createTreeView('yoyoDevTasks', {
    treeDataProvider: taskTreeDataProvider,
    showCollapseAll: true,
  });
  context.subscriptions.push(taskTreeView);
  logger.debug('Task tree view registered');

  // Register task tree commands
  context.subscriptions.push(
    vscode.commands.registerCommand('yoyoDev.refreshTasks', () => {
      logger.info('Refreshing task tree');
      taskTreeDataProvider.refresh();
    })
  );

  context.subscriptions.push(
    vscode.commands.registerCommand('yoyoDev.toggleTaskComplete', (item) => {
      logger.info(`Toggle task complete: ${item.task.id}`);
      vscode.window.showInformationMessage(
        `Task toggle not yet implemented: ${item.task.title}`
      );
      // TODO: Implement task completion toggling (write to tasks.md)
    })
  );

  // Initialize roadmap tree view
  const roadmapTreeDataProvider = new RoadmapTreeDataProvider(Container.instance.fileService);
  const roadmapTreeView = vscode.window.createTreeView('yoyoDevRoadmap', {
    treeDataProvider: roadmapTreeDataProvider,
    showCollapseAll: true,
  });
  context.subscriptions.push(roadmapTreeView);
  logger.debug('Roadmap tree view registered');

  // Register roadmap tree commands
  context.subscriptions.push(
    vscode.commands.registerCommand('yoyoDev.refreshRoadmap', () => {
      logger.info('Refreshing roadmap tree');
      roadmapTreeDataProvider.refresh();
    })
  );

  // Initialize status bar
  const statusBarItem = vscode.window.createStatusBarItem(
    vscode.StatusBarAlignment.Left,
    100
  );
  statusBarItem.command = 'yoyoDev.openSpec';
  context.subscriptions.push(statusBarItem);

  // Update status bar with current spec info
  const updateStatusBar = async () => {
    const currentSpec = taskTreeDataProvider.getCurrentSpec();
    if (!currentSpec) {
      statusBarItem.text = '$(folder) Yoyo Dev: No active spec';
      statusBarItem.tooltip = 'No specification found';
      statusBarItem.show();
      return;
    }

    // Try to read state.json for workflow info
    const stateContent = await Container.instance.fileService.readFile(
      `specs/${currentSpec}/state.json`
    );

    if (stateContent) {
      const { StateParser } = await import('./parsers/StateParser');
      const stateParser = new StateParser();
      const state = stateParser.parse(stateContent);

      if (state) {
        const phase = state.current_phase || 'unknown';
        const taskId = state.active_task || '';
        statusBarItem.text = `$(rocket) ${currentSpec} - ${phase}`;
        statusBarItem.tooltip = `Spec: ${currentSpec}\nPhase: ${phase}\nActive Task: ${taskId}`;
      } else {
        statusBarItem.text = `$(rocket) ${currentSpec}`;
        statusBarItem.tooltip = `Active Spec: ${currentSpec}`;
      }
    } else {
      statusBarItem.text = `$(rocket) ${currentSpec}`;
      statusBarItem.tooltip = `Active Spec: ${currentSpec}`;
    }

    statusBarItem.show();
  };

  // Initial status bar update
  updateStatusBar();

  // Update status bar on task/spec changes
  EventBus.getInstance().on(YoyoEvent.TASK_UPDATED, updateStatusBar);
  EventBus.getInstance().on(YoyoEvent.SPEC_CHANGED, updateStatusBar);
  EventBus.getInstance().on(YoyoEvent.WORKFLOW_STATE_CHANGED, updateStatusBar);

  // Register openSpec command (for status bar click)
  context.subscriptions.push(
    vscode.commands.registerCommand('yoyoDev.openSpec', async () => {
      const currentSpec = taskTreeDataProvider.getCurrentSpec();
      if (!currentSpec) {
        vscode.window.showInformationMessage('No active specification');
        return;
      }

      const specPath = Container.instance.fileService.getSpecPath(currentSpec);
      if (!specPath) {
        return;
      }

      // Get spec preference from settings
      const config = vscode.workspace.getConfiguration('yoyoDev');
      const preferLite = config.get<boolean>('spec.preferLiteVersion', true);

      // Determine file priority based on preference
      const specLitePath = `${specPath}/spec-lite.md`;
      const specFullPath = `${specPath}/spec.md`;
      const primaryPath = preferLite ? specLitePath : specFullPath;
      const fallbackPath = preferLite ? specFullPath : specLitePath;

      try {
        const uri = vscode.Uri.file(primaryPath);
        const doc = await vscode.workspace.openTextDocument(uri);
        await vscode.window.showTextDocument(doc);
        logger.info(`Opened spec: ${currentSpec}`);
      } catch {
        try {
          const uri = vscode.Uri.file(fallbackPath);
          const doc = await vscode.workspace.openTextDocument(uri);
          await vscode.window.showTextDocument(doc);
          logger.info(`Opened spec: ${currentSpec}`);
        } catch (error) {
          vscode.window.showErrorMessage(`Could not open spec: ${currentSpec}`);
          logger.error('Failed to open spec', error as Error);
        }
      }
    })
  );

  // Initialize spec webview provider
  const specWebviewProvider = new SpecWebviewProvider(
    context.extensionUri,
    Container.instance.fileService
  );
  context.subscriptions.push(specWebviewProvider);

  // Register command to view spec in webview
  context.subscriptions.push(
    vscode.commands.registerCommand('yoyoDev.viewSpec', async () => {
      const currentSpec = taskTreeDataProvider.getCurrentSpec();
      if (!currentSpec) {
        vscode.window.showInformationMessage('No active specification');
        return;
      }
      await specWebviewProvider.showSpec(currentSpec);
    })
  );

  // Initialize git info tree view
  const gitInfoProvider = new GitInfoProvider(Container.instance.gitService);
  const gitTreeView = vscode.window.createTreeView('yoyoDevGit', {
    treeDataProvider: gitInfoProvider,
  });
  context.subscriptions.push(gitTreeView);
  logger.debug('Git info tree view registered');

  // Register all 16 workflow commands
  registerCommands(context);
  logger.debug('Workflow commands registered');

  // Register help command
  context.subscriptions.push(
    vscode.commands.registerCommand('yoyoDev.help', () => {
      vscode.window.showInformationMessage(
        'Yoyo Dev Extension Active!\n\n' +
        'Use Command Palette (Cmd+Shift+P) and search "Yoyo Dev" to see all commands.\n\n' +
        'Views: Check the Yoyo Dev sidebar for Tasks and Roadmap.'
      );
      logger.info('Help command invoked');
    })
  );

  // Register container for disposal
  context.subscriptions.push({
    dispose: () => Container.instance.dispose()
  });

  const activationTime = Date.now() - startTime;
  logger.info(`Yoyo Dev extension activated in ${activationTime}ms`);

  // Log warning if activation took too long
  if (activationTime > 100) {
    logger.warn(`⚠️  Activation time (${activationTime}ms) exceeds 100ms target`);
  }
}

/**
 * Extension deactivation entry point
 * Called when extension is deactivated
 */
export function deactivate() {
  Logger.getInstance().info('Yoyo Dev extension deactivating...');
  // Disposal handled automatically via context.subscriptions
}
