import * as vscode from 'vscode';
import { Logger } from '../utils/Logger';
import { Container } from '../container';

/**
 * Service for managing Yoyo Dev terminal
 */
export class TerminalService {
  private logger: Logger;
  private terminal: vscode.Terminal | undefined;
  private readonly TERMINAL_NAME = 'Yoyo Dev';

  constructor() {
    this.logger = Logger.getInstance();

    // Listen for terminal disposal
    vscode.window.onDidCloseTerminal((closedTerminal) => {
      if (closedTerminal === this.terminal) {
        this.logger.info('Yoyo Dev terminal was closed');
        this.terminal = undefined;
      }
    });
  }

  /**
   * Get or create Yoyo Dev terminal
   */
  public getTerminal(): vscode.Terminal {
    if (!this.terminal) {
      this.terminal = vscode.window.createTerminal({
        name: this.TERMINAL_NAME,
        iconPath: new vscode.ThemeIcon('rocket'),
      });
      this.logger.info('Created Yoyo Dev terminal');
    }

    return this.terminal;
  }

  /**
   * Execute command in terminal
   */
  public executeCommand(command: string, show?: boolean): void {
    const terminal = this.getTerminal();

    // Get terminal settings from configuration
    const config = vscode.workspace.getConfiguration('yoyoDev');
    const showOnExecute = config.get<boolean>('terminal.showOnExecute', true);
    const clearBeforeExecute = config.get<boolean>('terminal.clearBeforeExecute', false);

    // Use provided show parameter or fall back to config
    const shouldShow = show !== undefined ? show : showOnExecute;

    if (clearBeforeExecute) {
      terminal.sendText('clear');
    }

    if (shouldShow) {
      terminal.show(true); // Show but don't take focus
    }

    terminal.sendText(command);
    this.logger.info(`Executed in terminal: ${command}`);

    // Show notification for workflow commands
    if (command.startsWith('/')) {
      const { workflowName, flags } = this.parseCommand(command);
      const flagsText = flags.length > 0 ? ` with ${flags.join(', ')}` : '';
      Container.instance.notificationService.showInfo(
        `Starting workflow: ${workflowName}${flagsText}`
      );
    }
  }

  /**
   * Parse command into workflow name and flags
   */
  private parseCommand(command: string): { workflowName: string; flags: string[] } {
    const parts = command.split(/\s+/);
    const baseCommand = parts[0];
    const flags = parts.slice(1).filter(p => p.startsWith('--'));

    // Extract workflow name from base command
    const match = baseCommand.match(/^\/([a-z-]+)/);
    const workflowName = match
      ? match[1].split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')
      : command;

    return { workflowName, flags };
  }

  /**
   * Extract workflow name from command (legacy - kept for compatibility)
   */
  private extractWorkflowName(command: string): string {
    return this.parseCommand(command).workflowName;
  }

  /**
   * Execute command with confirmation
   */
  public async executeWithConfirmation(
    command: string,
    confirmationMessage?: string
  ): Promise<boolean> {
    const message = confirmationMessage || `Execute: ${command}?`;
    const choice = await vscode.window.showInformationMessage(
      message,
      { modal: false },
      'Execute',
      'Cancel'
    );

    if (choice === 'Execute') {
      this.executeCommand(command);
      return true;
    }

    return false;
  }

  /**
   * Clear terminal
   */
  public clear(): void {
    const terminal = this.getTerminal();
    terminal.sendText('clear');
    this.logger.info('Cleared Yoyo Dev terminal');
  }

  /**
   * Show terminal
   */
  public show(): void {
    const terminal = this.getTerminal();
    terminal.show();
  }

  /**
   * Dispose terminal
   */
  public dispose(): void {
    if (this.terminal) {
      this.terminal.dispose();
      this.terminal = undefined;
      this.logger.info('Disposed Yoyo Dev terminal');
    }
  }
}
