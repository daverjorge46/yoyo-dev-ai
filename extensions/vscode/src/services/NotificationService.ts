import * as vscode from 'vscode';
import { Logger } from '../utils/Logger';

/**
 * Service for managing notifications and progress indicators
 */
export class NotificationService {
  private logger: Logger;
  private activeProgress: Map<string, vscode.Progress<{ message?: string; increment?: number }>> = new Map();

  constructor() {
    this.logger = Logger.getInstance();
  }

  /**
   * Show progress notification for long-running workflow
   */
  public async showWorkflowProgress(
    workflowName: string,
    task: (progress: vscode.Progress<{ message?: string; increment?: number }>) => Promise<void>
  ): Promise<void> {
    await vscode.window.withProgress(
      {
        location: vscode.ProgressLocation.Notification,
        title: `Yoyo Dev: ${workflowName}`,
        cancellable: true,
      },
      async (progress, token) => {
        this.activeProgress.set(workflowName, progress);

        token.onCancellationRequested(() => {
          this.logger.warn(`Workflow cancelled: ${workflowName}`);
          this.showWarning(`Workflow "${workflowName}" was cancelled`);
        });

        try {
          await task(progress);
        } finally {
          this.activeProgress.delete(workflowName);
        }
      }
    );
  }

  /**
   * Update progress message
   */
  public updateProgress(workflowName: string, message: string, increment?: number): void {
    const progress = this.activeProgress.get(workflowName);
    if (progress) {
      progress.report({ message, increment });
      this.logger.debug(`Progress update [${workflowName}]: ${message}`);
    }
  }

  /**
   * Show success notification with action
   */
  public async showSuccess(
    message: string,
    actionLabel?: string,
    action?: () => void
  ): Promise<void> {
    this.logger.info(`Success: ${message}`);

    if (actionLabel && action) {
      const result = await vscode.window.showInformationMessage(message, actionLabel);
      if (result === actionLabel) {
        action();
      }
    } else {
      vscode.window.showInformationMessage(message);
    }
  }

  /**
   * Show error notification with action
   */
  public async showError(
    message: string,
    actionLabel?: string,
    action?: () => void
  ): Promise<void> {
    this.logger.error(message);

    if (actionLabel && action) {
      const result = await vscode.window.showErrorMessage(message, actionLabel);
      if (result === actionLabel) {
        action();
      }
    } else {
      vscode.window.showErrorMessage(message);
    }
  }

  /**
   * Show warning notification
   */
  public showWarning(message: string): void {
    this.logger.warn(message);
    vscode.window.showWarningMessage(message);
  }

  /**
   * Show info notification
   */
  public showInfo(message: string): void {
    this.logger.info(message);
    vscode.window.showInformationMessage(message);
  }

  /**
   * Dispose service
   */
  public dispose(): void {
    this.activeProgress.clear();
  }
}
