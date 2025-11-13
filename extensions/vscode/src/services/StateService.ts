import * as vscode from 'vscode';

/**
 * State management service using VS Code workspace state
 */
export class StateService {
  private context: vscode.ExtensionContext;

  constructor(context: vscode.ExtensionContext) {
    this.context = context;
  }

  /**
   * Get value from workspace state
   */
  public get<T>(key: string, defaultValue?: T): T | undefined {
    const value = this.context.workspaceState.get<T>(key);
    return value !== undefined ? value : defaultValue;
  }

  /**
   * Set value in workspace state
   */
  public async set<T>(key: string, value: T): Promise<void> {
    await this.context.workspaceState.update(key, value);
  }

  /**
   * Get value from global state
   */
  public getGlobal<T>(key: string, defaultValue?: T): T | undefined {
    const value = this.context.globalState.get<T>(key);
    return value !== undefined ? value : defaultValue;
  }

  /**
   * Set value in global state
   */
  public async setGlobal<T>(key: string, value: T): Promise<void> {
    await this.context.globalState.update(key, value);
  }

  /**
   * Clear all workspace state
   */
  public async clearWorkspace(): Promise<void> {
    const keys = this.context.workspaceState.keys();
    for (const key of keys) {
      await this.context.workspaceState.update(key, undefined);
    }
  }

  /**
   * Get all workspace state keys
   */
  public getKeys(): readonly string[] {
    return this.context.workspaceState.keys();
  }

  /**
   * Dispose (no-op, state persists automatically)
   */
  public dispose(): void {
    // No cleanup needed
  }
}
