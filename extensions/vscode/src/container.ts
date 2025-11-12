import * as vscode from 'vscode';

/**
 * Dependency Injection Container with lazy loading for service management.
 * Follows singleton pattern to ensure <100ms activation time.
 */
export class Container {
  private static _instance: Container | undefined;
  private _context: vscode.ExtensionContext;

  // Lazy-loaded services
  private _fileService: any | undefined;
  private _claudeService: any | undefined;
  private _gitService: any | undefined;
  private _stateService: any | undefined;
  private _configService: any | undefined;

  private constructor(context: vscode.ExtensionContext) {
    this._context = context;
  }

  /**
   * Initialize the container (called once during extension activation)
   */
  public static initialize(context: vscode.ExtensionContext): void {
    if (Container._instance) {
      throw new Error('Container already initialized');
    }
    Container._instance = new Container(context);
  }

  /**
   * Get the singleton container instance
   */
  public static get instance(): Container {
    if (!Container._instance) {
      throw new Error('Container not initialized. Call Container.initialize() first.');
    }
    return Container._instance;
  }

  /**
   * Get the extension context
   */
  public get context(): vscode.ExtensionContext {
    return this._context;
  }

  /**
   * Lazy-loaded file service (will be implemented in Task Group 3)
   */
  public get fileService(): any {
    if (!this._fileService) {
      // TODO: Implement in Task 3.1
      this._fileService = {
        // Placeholder
        dispose: () => {}
      };
    }
    return this._fileService;
  }

  /**
   * Lazy-loaded Claude CLI service (will be implemented in Task Group 7)
   */
  public get claudeService(): any {
    if (!this._claudeService) {
      // TODO: Implement in Task 7.1
      this._claudeService = {
        // Placeholder
        dispose: () => {}
      };
    }
    return this._claudeService;
  }

  /**
   * Lazy-loaded Git service (will be implemented in Task Group 9)
   */
  public get gitService(): any {
    if (!this._gitService) {
      // TODO: Implement in Task 9.1
      this._gitService = {
        // Placeholder
        dispose: () => {}
      };
    }
    return this._gitService;
  }

  /**
   * Lazy-loaded state service (will be implemented in Task Group 2)
   */
  public get stateService(): any {
    if (!this._stateService) {
      // TODO: Implement in Task 2.4
      this._stateService = {
        // Placeholder
        dispose: () => {}
      };
    }
    return this._stateService;
  }

  /**
   * Lazy-loaded config service (will be implemented in Task Group 3)
   */
  public get configService(): any {
    if (!this._configService) {
      // TODO: Implement in Task 3.2
      this._configService = {
        // Placeholder
        dispose: () => {}
      };
    }
    return this._configService;
  }

  /**
   * Dispose all services (called during extension deactivation)
   */
  public dispose(): void {
    // Dispose services in reverse order of creation
    this._configService?.dispose();
    this._stateService?.dispose();
    this._gitService?.dispose();
    this._claudeService?.dispose();
    this._fileService?.dispose();

    // Clear references
    this._configService = undefined;
    this._stateService = undefined;
    this._gitService = undefined;
    this._claudeService = undefined;
    this._fileService = undefined;

    // Clear singleton instance
    Container._instance = undefined;
  }
}
