import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';

export function activate(context: vscode.ExtensionContext) {

  context.subscriptions.push(
    vscode.commands.registerCommand('explicode.openFileInExplicode', (uri?: vscode.Uri) => {
      openExplicodePanel(context, uri);
    })
  );

  context.subscriptions.push(
    vscode.commands.registerCommand('explicode.openReact', () => {
      openExplicodePanel(context);
    })
  );
}

const IMAGE_MIME: Record<string, string> = {
  png: 'image/png', jpg: 'image/jpeg', jpeg: 'image/jpeg',
  gif: 'image/gif', svg: 'image/svg+xml', webp: 'image/webp',
};

// Scan file text for local image references and return them as base64 data URIs
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

function openExplicodePanel(context: vscode.ExtensionContext, fileUri?: vscode.Uri) {
  if (!fileUri) {
    const activeEditor = vscode.window.activeTextEditor;
    if (activeEditor) {
      fileUri = activeEditor.document.uri;
    }
  }

  const panel = vscode.window.createWebviewPanel(
    'reactPanel',
    'Explicode',
    vscode.ViewColumn.Two,
    {
      enableScripts: true,
      localResourceRoots: [
        vscode.Uri.joinPath(context.extensionUri, 'dist-webview'),
        ...(vscode.workspace.workspaceFolders
          ? vscode.workspace.workspaceFolders.map(folder => folder.uri)
          : [])
      ]
    }
  );

  panel.iconPath = {
    light: vscode.Uri.joinPath(context.extensionUri, 'images', 'favicon.svg'),
    dark:  vscode.Uri.joinPath(context.extensionUri, 'images', 'favicon.svg')
  };

  const distPath = path.join(context.extensionPath, 'dist-webview', 'index.html');
  let html = fs.readFileSync(distPath, 'utf8');

  html = html.replace(/(src|href)="(.+?)"/g, (_, attr, p) => {
    const file = vscode.Uri.file(path.join(context.extensionPath, 'dist-webview', p));
    return `${attr}="${panel.webview.asWebviewUri(file)}"`;
  });

  panel.webview.html = html;

  const sendFileToWebview = (targetUri?: vscode.Uri) => {
    let fileToSend: object | undefined;

    if (targetUri) {
      const fileContent = fs.readFileSync(targetUri.fsPath, 'utf8');
      const fileDir = path.dirname(targetUri.fsPath);
      fileToSend = {
        type: 'fileData',
        filePath: targetUri.fsPath,
        fileName: path.basename(targetUri.fsPath),
        fileText: fileContent,
        images: resolveLocalImages(fileContent, fileDir),
      };
    } else {
      const editor = vscode.window.activeTextEditor;
      if (editor) {
        const fileContent = editor.document.getText();
        const fileDir = path.dirname(editor.document.uri.fsPath);
        fileToSend = {
          type: 'fileData',
          filePath: editor.document.uri.fsPath,
          fileName: editor.document.uri.fsPath.split(/[/\\]/).pop() || '',
          fileText: fileContent,
          images: resolveLocalImages(fileContent, fileDir),
        };
      }
    }

    if (fileToSend) {
      panel.webview.postMessage(fileToSend);
    }
  };

  panel.webview.onDidReceiveMessage(async (message) => {
    if (message.type === 'requestFile') {
      sendFileToWebview(fileUri);
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
  });

  vscode.workspace.onDidChangeTextDocument(event => {
    if (vscode.window.activeTextEditor?.document === event.document) {
      sendFileToWebview();
    }
  });

  vscode.window.onDidChangeActiveTextEditor(editor => {
    if (editor) { sendFileToWebview(); }
  });

  sendFileToWebview(fileUri);
}

export function deactivate() {}