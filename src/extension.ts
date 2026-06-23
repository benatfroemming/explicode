// src/extension.ts
import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';

const IMAGE_MIME: Record<string, string> = {
  png: 'image/png', jpg: 'image/jpeg', jpeg: 'image/jpeg',
  gif: 'image/gif', svg: 'image/svg+xml', webp: 'image/webp',
};

function resolveLocalImages(fileText: string, fileDir: string): Record<string, string> {
  const images: Record<string, string> = {};
  const re = /!\[.*?\]\((.+?)\)/g;
  let match;
  while ((match = re.exec(fileText)) !== null) {
    const src = match[1].trim();
    if (/^https?:\/\//.test(src) || src.startsWith('data:')) { continue; }
    const imgPath = path.isAbsolute(src) ? src : path.resolve(fileDir, src);
    if (!fs.existsSync(imgPath)) { continue; }
    const ext = path.extname(imgPath).slice(1).toLowerCase();
    const mime = IMAGE_MIME[ext];
    if (!mime) { continue; }
    try {
      const data = fs.readFileSync(imgPath).toString('base64');
      images[src] = `data:${mime};base64,${data}`;
    } catch { /* skip unreadable */ }
  }
  return images;
}

class ExplicodeViewProvider implements vscode.WebviewViewProvider {
  public static readonly viewType = 'explicode.panel';
  private _view?: vscode.WebviewView;
  private _pendingAnchor?: string;
  private _pendingAnchorForWebview?: string | null;

  constructor(private readonly context: vscode.ExtensionContext) {}

  resolveWebviewView(webviewView: vscode.WebviewView) {
    this._view = webviewView;

    webviewView.webview.options = {
      enableScripts: true,
      localResourceRoots: [
        vscode.Uri.joinPath(this.context.extensionUri, 'dist-webview'),
        ...(vscode.workspace.workspaceFolders?.map(f => f.uri) ?? []),
      ],
    };

    const distPath = path.join(this.context.extensionPath, 'dist-webview', 'index.html');
    let html = fs.readFileSync(distPath, 'utf8');
    html = html.replace(/(src|href)="(.+?)"/g, (_, attr, p) => {
      const file = vscode.Uri.file(
        path.join(this.context.extensionPath, 'dist-webview', p)
      );
      return `${attr}="${webviewView.webview.asWebviewUri(file)}"`;
    });
    webviewView.webview.html = html;

    // Send current file on load
    this.sendActiveFile();

    // Mirror active editor changes
    this.context.subscriptions.push(
      vscode.window.onDidChangeActiveTextEditor(editor => {
        if (editor && editor.document.uri.scheme === 'file') {
          this.sendActiveFile(editor);
        }
      })
    );

    // Mirror live edits
    this.context.subscriptions.push(
      vscode.workspace.onDidChangeTextDocument(e => {
        if (e.document === vscode.window.activeTextEditor?.document) {
          this.sendActiveFile();
        }
      })
    );

    webviewView.webview.onDidReceiveMessage(async (message) => {
      if (message.type === 'requestFile') {
        this.sendActiveFile();
      }

      if (message.type === 'open-link' && message.url) {
        vscode.env.openExternal(vscode.Uri.parse(message.url));
      }

      if (message.type === 'save-file') {
        try {
          const { content, fileName, fileType } = message;
          const filters: { [key: string]: string[] } = { 'All Files': ['*'] };
          if (fileType === 'html')     { filters['HTML Files']     = ['html']; }
          if (fileType === 'markdown') { filters['Markdown Files'] = ['md'];   }
          const uri = await vscode.window.showSaveDialog({
            defaultUri: vscode.Uri.file(fileName),
            filters,
          });
          if (uri) {
            await vscode.workspace.fs.writeFile(uri, Buffer.from(content, 'utf8'));
            vscode.window.showInformationMessage(`File saved: ${path.basename(uri.fsPath)}`);
          }
        } catch (error) {
          vscode.window.showErrorMessage(
            `Failed to save file: ${error instanceof Error ? error.message : 'Unknown error'}`
          );
        }
      }

      if (message.type === 'open-relative-file' && message.href) {
        const activeFile = vscode.window.activeTextEditor?.document.uri.fsPath;
        if (!activeFile) { return; }
        const [filePart, anchor] = (message.href as string).split('#');
        const targetPath = path.resolve(path.dirname(activeFile), filePart);
        if (fs.existsSync(targetPath)) {
          const doc = await vscode.workspace.openTextDocument(vscode.Uri.file(targetPath));
          await vscode.window.showTextDocument(doc);
          this._pendingAnchor = anchor;
          this._pendingAnchorForWebview = anchor;
        }
      }

      if (message.type === 'render-complete') {
        if (this._pendingAnchor) {
          this._view?.webview.postMessage({ type: 'scroll-to-anchor', anchor: this._pendingAnchor });
          this._pendingAnchor = undefined;
        }
      }

    });
  }

  public sendFile(uri: vscode.Uri) {
    if (!this._view) { return; }
    const filePath = uri.fsPath;
    let fileContent: string;
    try {
      fileContent = fs.readFileSync(filePath, 'utf8');
    } catch { return; }
    const fileDir = path.dirname(filePath);
    this._view.webview.postMessage({
      type: 'fileData',
      filePath,
      fileName: path.basename(filePath),
      fileText: fileContent,
      images: resolveLocalImages(fileContent, fileDir),
    });
  }

  public sendActiveFile(editor?: vscode.TextEditor) {
    if (!this._view) { return; }
    const target = editor ?? vscode.window.activeTextEditor;
    if (!target || target.document.uri.scheme !== 'file') { return; }
    const filePath = target.document.uri.fsPath;
    const fileContent = target.document.getText();
    const fileDir = path.dirname(filePath);
    this._view.webview.postMessage({
      type: 'fileData',
      filePath,
      fileName: path.basename(filePath),
      fileText: fileContent,
      images: resolveLocalImages(fileContent, fileDir),
      anchor: this._pendingAnchorForWebview,
      scrollToTop: this._pendingAnchorForWebview === null,
    });
    this._pendingAnchorForWebview = undefined;
  }

  public show() {
    this._view?.show(true);
  }
}

export function activate(context: vscode.ExtensionContext) {
  const provider = new ExplicodeViewProvider(context);

  context.subscriptions.push(
    vscode.window.registerWebviewViewProvider(
      ExplicodeViewProvider.viewType,
      provider,
      { webviewOptions: { retainContextWhenHidden: true } }
    )
  );

  context.subscriptions.push(
    vscode.commands.registerCommand('explicode.openReact', () => {
      vscode.commands.executeCommand('explicode.panel.focus');
    })
  );

  context.subscriptions.push(
    vscode.commands.registerCommand('explicode.openFileInExplicode', (uri?: vscode.Uri) => {
      vscode.commands.executeCommand('explicode.panel.focus');
      if (uri) { provider.sendFile(uri); }
    })
  );
}

export function deactivate() {}