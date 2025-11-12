import * as vscode from 'vscode';
import { Container } from './container';

/**
 * Extension activation entry point
 * Called when extension is activated (workspace contains .yoyo-dev or command invoked)
 */
export function activate(context: vscode.ExtensionContext) {
  const startTime = Date.now();

  console.log('Yoyo Dev extension activating...');

  // Initialize dependency injection container
  Container.initialize(context);

  // Register a simple command to verify activation
  const disposable = vscode.commands.registerCommand('yoyoDev.help', () => {
    vscode.window.showInformationMessage('Yoyo Dev Extension is active!');
  });

  context.subscriptions.push(disposable);

  // Register container for disposal
  context.subscriptions.push({
    dispose: () => Container.instance.dispose()
  });

  const activationTime = Date.now() - startTime;
  console.log(`Yoyo Dev extension activated in ${activationTime}ms`);

  // Log warning if activation took too long
  if (activationTime > 100) {
    console.warn(`⚠️  Activation time (${activationTime}ms) exceeds 100ms target`);
  }
}

/**
 * Extension deactivation entry point
 * Called when extension is deactivated
 */
export function deactivate() {
  console.log('Yoyo Dev extension deactivating...');
  // Container disposal is handled automatically via context.subscriptions
}
