import * as vscode from 'vscode';
import { StateService } from './services/StateService';
import { YoyoFileService } from './services/YoyoFileService';
import { ConfigService } from './services/ConfigService';
import { GitService } from './services/GitService';
import { TerminalService } from './services/TerminalService';

/**
 * Dependency Injection Container with lazy loading for service management.
 * Follows singleton pattern to ensure <100ms activation time.
 */
export class Container {
  private static _instance: Container | undefined;
  private _context: vscode.ExtensionContext;

  // Lazy-loaded services
  private _fileService: YoyoFileService | undefined;
  private _terminalService: TerminalService | undefined;
  private _gitService: GitService | undefined;
  private _stateService: StateService | undefined;
  private _configService: ConfigService | undefined;

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
   * Lazy-loaded file service
   */
  public get fileService(): YoyoFileService {
    if (!this._fileService) {
      this._fileService = new YoyoFileService();
    }
    return this._fileService;
  }

  /**
   * Lazy-loaded Terminal service
   */
  public get terminalService(): TerminalService {
    if (!this._terminalService) {
      this._terminalService = new TerminalService();
    }
    return this._terminalService;
  }

  /**
   * Lazy-loaded Git service
   */
  public get gitService(): GitService {
    if (!this._gitService) {
      this._gitService = new GitService();
    }
    return this._gitService;
  }

  /**
   * Lazy-loaded state service
   */
  public get stateService(): StateService {
    if (!this._stateService) {
      this._stateService = new StateService(this._context);
    }
    return this._stateService;
  }

  /**
   * Lazy-loaded config service
   */
  public get configService(): ConfigService {
    if (!this._configService) {
      this._configService = new ConfigService(this.fileService);
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
    this._terminalService?.dispose();
    this._fileService?.dispose();

    // Clear references
    this._configService = undefined;
    this._stateService = undefined;
    this._gitService = undefined;
    this._terminalService = undefined;
    this._fileService = undefined;

    // Clear singleton instance
    Container._instance = undefined;
  }
}
