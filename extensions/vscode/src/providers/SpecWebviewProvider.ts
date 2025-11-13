import * as vscode from 'vscode';
import { YoyoFileService } from '../services/YoyoFileService';
import { Logger } from '../utils/Logger';

/**
 * Provider for spec webview panel
 */
export class SpecWebviewProvider {
  private logger: Logger;
  private fileService: YoyoFileService;
  private panel: vscode.WebviewPanel | undefined;

  constructor(
    private readonly extensionUri: vscode.Uri,
    fileService: YoyoFileService
  ) {
    this.logger = Logger.getInstance();
    this.fileService = fileService;
  }

  /**
   * Show spec in webview
   */
  public async showSpec(specName: string): Promise<void> {
    this.logger.info(`Opening spec webview for: ${specName}`);

    // Create or reveal webview
    if (this.panel) {
      this.panel.reveal(vscode.ViewColumn.One);
    } else {
      this.panel = vscode.window.createWebviewPanel(
        'yoyoDevSpec',
        `Spec: ${specName}`,
        vscode.ViewColumn.One,
        {
          enableScripts: true,
          retainContextWhenHidden: true,
          localResourceRoots: [
            vscode.Uri.joinPath(this.extensionUri, 'dist'),
          ],
        }
      );

      this.panel.onDidDispose(() => {
        this.panel = undefined;
      });
    }

    // Load spec content
    const specPath = `specs/${specName}/spec-lite.md`;
    const content = await this.fileService.readFile(specPath);

    if (!content) {
      this.panel.webview.html = this.getErrorHtml('Spec not found');
      return;
    }

    // Update webview content
    this.panel.webview.html = this.getWebviewHtml();

    // Send content to webview
    this.panel.webview.postMessage({
      type: 'updateContent',
      content: content,
      title: specName,
    });
  }

  /**
   * Get webview HTML
   */
  private getWebviewHtml(): string {
    const scriptUri = this.panel!.webview.asWebviewUri(
      vscode.Uri.joinPath(this.extensionUri, 'dist', 'webview.js')
    );

    return `<!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <meta http-equiv="Content-Security-Policy" content="default-src 'none'; script-src ${this.panel!.webview.cspSource}; style-src ${this.panel!.webview.cspSource} 'unsafe-inline';">
      <title>Yoyo Dev Spec</title>
      <style>
        body {
          padding: 0;
          margin: 0;
          background-color: var(--vscode-editor-background);
          color: var(--vscode-editor-foreground);
        }
        h1, h2, h3, h4, h5, h6 {
          color: var(--vscode-foreground);
        }
        a {
          color: var(--vscode-textLink-foreground);
        }
        code {
          background-color: var(--vscode-textCodeBlock-background);
          padding: 2px 4px;
          border-radius: 3px;
        }
        pre {
          background-color: var(--vscode-textCodeBlock-background);
          padding: 10px;
          border-radius: 5px;
          overflow-x: auto;
        }
      </style>
    </head>
    <body>
      <div id="root"></div>
      <script src="${scriptUri}"></script>
    </body>
    </html>`;
  }

  /**
   * Get error HTML
   */
  private getErrorHtml(message: string): string {
    return `<!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Error</title>
      <style>
        body {
          padding: 20px;
          font-family: var(--vscode-font-family);
          background-color: var(--vscode-editor-background);
          color: var(--vscode-editor-foreground);
        }
      </style>
    </head>
    <body>
      <h1>Error</h1>
      <p>${message}</p>
    </body>
    </html>`;
  }

  /**
   * Dispose provider
   */
  public dispose(): void {
    this.panel?.dispose();
  }
}
