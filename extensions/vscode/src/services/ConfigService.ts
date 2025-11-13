import * as vscode from 'vscode';
import { YoyoFileService } from './YoyoFileService';
import { Logger } from '../utils/Logger';
import * as yaml from 'js-yaml';

export interface YoyoConfig {
  yoyo_dev_version: string;
  agents: {
    claude_code: { enabled: boolean };
    cursor: { enabled: boolean };
  };
  multi_agent: {
    enabled: boolean;
    use_workflow_references: boolean;
  };
  workflows?: {
    task_execution?: {
      mode?: string;
      implementation_reports?: boolean;
      verification_reports?: boolean;
    };
  };
  specialized_agents?: Record<string, boolean>;
  design_system?: {
    enabled?: boolean;
    auto_validate?: boolean;
    accessibility_level?: string;
  };
  default_project_type?: string;
}

/**
 * Service for reading config.yml
 */
export class ConfigService {
  private logger: Logger;
  private fileService: YoyoFileService;
  private config: YoyoConfig | null = null;

  constructor(fileService: YoyoFileService) {
    this.logger = Logger.getInstance();
    this.fileService = fileService;
  }

  /**
   * Load config.yml
   */
  public async loadConfig(): Promise<YoyoConfig | null> {
    const content = await this.fileService.readFile('config.yml');

    if (!content) {
      this.logger.warn('config.yml not found');
      return null;
    }

    try {
      this.config = yaml.load(content) as YoyoConfig;
      this.logger.info('Config loaded successfully');
      return this.config;
    } catch (error) {
      this.logger.error('Failed to parse config.yml', error as Error);
      return null;
    }
  }

  /**
   * Get cached config (loads if not cached)
   */
  public async getConfig(): Promise<YoyoConfig | null> {
    if (!this.config) {
      await this.loadConfig();
    }
    return this.config;
  }

  /**
   * Reload config from disk
   */
  public async reloadConfig(): Promise<YoyoConfig | null> {
    this.config = null;
    return this.loadConfig();
  }

  /**
   * Get VS Code extension settings
   */
  public getExtensionConfig() {
    return vscode.workspace.getConfiguration('yoyoDev');
  }

  /**
   * Get specific setting value
   */
  public getSetting<T>(key: string, defaultValue: T): T {
    const config = this.getExtensionConfig();
    return config.get<T>(key, defaultValue);
  }

  /**
   * Get log level from settings
   */
  public getLogLevel(): string {
    return this.getSetting<string>('logLevel', 'info');
  }

  /**
   * Get auto-refresh setting
   */
  public getAutoRefresh(): boolean {
    return this.getSetting<boolean>('autoRefresh', true);
  }

  /**
   * Get terminal settings
   */
  public getTerminalSettings() {
    return {
      showOnExecute: this.getSetting<boolean>('terminal.showOnExecute', true),
      clearBeforeExecute: this.getSetting<boolean>('terminal.clearBeforeExecute', false),
    };
  }

  /**
   * Get git refresh interval
   */
  public getGitRefreshInterval(): number {
    return this.getSetting<number>('git.autoRefreshInterval', 5000);
  }

  /**
   * Get file watcher debounce delay
   */
  public getFileWatcherDebounce(): number {
    return this.getSetting<number>('fileWatcher.debounceDelay', 500);
  }

  /**
   * Get spec preference
   */
  public getSpecPreference(): boolean {
    return this.getSetting<boolean>('spec.preferLiteVersion', true);
  }

  /**
   * Dispose service
   */
  public dispose(): void {
    this.config = null;
  }
}
