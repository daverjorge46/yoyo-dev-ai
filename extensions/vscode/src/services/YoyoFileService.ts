import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs/promises';
import { Logger } from '../utils/Logger';

/**
 * Service for reading .yoyo-dev files
 */
export class YoyoFileService {
  private logger: Logger;
  private yoyoDevPath: string | null = null;

  constructor() {
    this.logger = Logger.getInstance();
    this.findYoyoDevPath();
  }

  /**
   * Find .yoyo-dev directory in workspace
   */
  private findYoyoDevPath(): void {
    const workspaceFolders = vscode.workspace.workspaceFolders;
    if (!workspaceFolders || workspaceFolders.length === 0) {
      this.logger.warn('No workspace folder found');
      return;
    }

    const rootPath = workspaceFolders[0].uri.fsPath;
    this.yoyoDevPath = path.join(rootPath, '.yoyo-dev');
    this.logger.info(`Yoyo Dev path: ${this.yoyoDevPath}`);
  }

  /**
   * Get .yoyo-dev path
   */
  public getYoyoDevPath(): string | null {
    return this.yoyoDevPath;
  }

  /**
   * Read file from .yoyo-dev directory
   */
  public async readFile(relativePath: string): Promise<string | null> {
    if (!this.yoyoDevPath) {
      this.logger.error('Yoyo Dev path not found');
      return null;
    }

    const filePath = path.join(this.yoyoDevPath, relativePath);

    try {
      const content = await fs.readFile(filePath, 'utf-8');
      return content;
    } catch (error) {
      this.logger.error(`Failed to read file: ${filePath}`, error as Error);
      return null;
    }
  }

  /**
   * Check if file exists
   */
  public async fileExists(relativePath: string): Promise<boolean> {
    if (!this.yoyoDevPath) {
      return false;
    }

    const filePath = path.join(this.yoyoDevPath, relativePath);

    try {
      await fs.access(filePath);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * List all spec directories
   */
  public async listSpecs(): Promise<string[]> {
    if (!this.yoyoDevPath) {
      return [];
    }

    const specsPath = path.join(this.yoyoDevPath, 'specs');

    try {
      const entries = await fs.readdir(specsPath, { withFileTypes: true });
      return entries
        .filter((entry) => entry.isDirectory())
        .map((entry) => entry.name)
        .sort()
        .reverse(); // Most recent first
    } catch (error) {
      this.logger.error('Failed to list specs', error as Error);
      return [];
    }
  }

  /**
   * Get path to spec directory
   */
  public getSpecPath(specName: string): string | null {
    if (!this.yoyoDevPath) {
      return null;
    }
    return path.join(this.yoyoDevPath, 'specs', specName);
  }

  /**
   * Get path to product directory
   */
  public getProductPath(): string | null {
    if (!this.yoyoDevPath) {
      return null;
    }
    return path.join(this.yoyoDevPath, 'product');
  }

  /**
   * Dispose service
   */
  public dispose(): void {
    // No cleanup needed
  }
}
