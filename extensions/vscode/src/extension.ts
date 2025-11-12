import * as vscode from 'vscode';
import { Container } from './container';
import { EventBus } from './utils/EventBus';
import { Logger } from './utils/Logger';
import { FileWatcher } from './utils/FileWatcher';

/**
 * Extension activation entry point
 * Called when extension is activated (workspace contains .yoyo-dev or command invoked)
 */
export function activate(context: vscode.ExtensionContext) {
  const startTime = Date.now();

  // Initialize logger first
  const logger = Logger.getInstance();
  logger.info('Yoyo Dev extension activating...');

  // Initialize dependency injection container
  Container.initialize(context);

  // Initialize event bus
  const eventBus = EventBus.getInstance();
  logger.debug('EventBus initialized');

  // Initialize file watcher
  const fileWatcher = new FileWatcher();
  logger.debug('FileWatcher initialized');

  // Register logger, event bus, and file watcher for disposal
  context.subscriptions.push(logger, eventBus, fileWatcher);

  // TODO: Register commands (Task 8.1)
  // TODO: Register tree views (Tasks 5.1, 6.1)

  // Register simple help command for now
  const disposable = vscode.commands.registerCommand('yoyoDev.help', () => {
    vscode.window.showInformationMessage('Yoyo Dev Extension is active!');
    logger.info('Help command invoked');
  });

  context.subscriptions.push(disposable);

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
