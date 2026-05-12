import * as childProcess from 'child_process';
import * as path from 'path';
import * as vscode from 'vscode';
import { HicViewerBootstrap, HicViewerSettings, HicViewerSnapshot } from './hicTypes';
import { HicFileRegistration, HicRangeServer } from './hicRangeServer';
import { buildErrorHtml, buildHicViewerHtml } from './webviewHtml';

const VIEW_TYPE = 'hicInVscode.hicEditor';

interface HicViewerMessage {
  type: 'ready' | 'state' | 'reload' | 'reset' | 'copy-locus' | 'copy-state' | 'open-external';
  snapshot?: HicViewerSnapshot;
}

export class HicDocument implements vscode.CustomDocument {
  constructor(public readonly uri: vscode.Uri) {}
  dispose(): void {}
}

class HicViewerSession {
  public latestSnapshot?: HicViewerSnapshot;

  constructor(
    public readonly document: HicDocument,
    public readonly panel: vscode.WebviewPanel,
    public readonly registration: { dispose(): void },
    private readonly provider: HicCustomEditorProvider
  ) {}

  dispose(): void {
    this.registration.dispose();
  }

  setSnapshot(snapshot: HicViewerSnapshot): void {
    this.latestSnapshot = snapshot;
    this.provider.rememberSession(this);
  }

  postMessage(message: unknown): Thenable<boolean> {
    return this.panel.webview.postMessage(message);
  }
}

export class HicCustomEditorProvider implements vscode.CustomReadonlyEditorProvider<HicDocument> {
  public static readonly viewType = VIEW_TYPE;

  private readonly sessions = new Map<string, HicViewerSession>();
  private activeSession?: HicViewerSession;

  constructor(
    private readonly context: vscode.ExtensionContext,
    private readonly rangeServer: HicRangeServer
  ) {}

  async openCustomDocument(uri: vscode.Uri, _openContext: vscode.CustomDocumentOpenContext, _token: vscode.CancellationToken): Promise<HicDocument> {
    return new HicDocument(uri);
  }

  async resolveCustomEditor(document: HicDocument, webviewPanel: vscode.WebviewPanel, _token: vscode.CancellationToken): Promise<void> {
    const config = vscode.workspace.getConfiguration('hicInVscode');
    const settings: HicViewerSettings = {
      defaultNormalization: config.get<string>('defaultNormalization', 'NONE'),
      defaultResolution: config.get<number | null>('defaultResolution', null),
      enableLocalRangeServer: config.get<boolean>('enableLocalRangeServer', true),
      enableExternalTracks: config.get<boolean>('enableExternalTracks', false),
      maxCacheSizeMb: config.get<number>('maxCacheSizeMb', 256),
      debugLogging: config.get<boolean>('debugLogging', false)
    };

    let stat: vscode.FileStat | undefined;
    try {
      stat = await vscode.workspace.fs.stat(document.uri);
    } catch (error) {
      webviewPanel.webview.html = buildErrorHtml(
        'Could not open file',
        'The file could not be read from the workspace.',
        error instanceof Error ? error.message : String(error)
      );
      return;
    }

    if (stat.size === 0) {
      webviewPanel.webview.html = buildErrorHtml(
        'Empty HIC file',
        'The selected file is empty, so there is no contact map to render.',
        documentLabel(document.uri)
      );
      return;
    }

    if (document.uri.scheme !== 'file') {
      webviewPanel.webview.html = buildErrorHtml(
        'Unsupported URI',
        'This viewer currently opens local file URIs only.',
        document.uri.toString()
      );
      return;
    }

    if (!settings.enableLocalRangeServer) {
      webviewPanel.webview.html = buildErrorHtml(
        'Local range server disabled',
        'The HIC viewer needs the local range server to stream `.hic` byte ranges without loading the full file.',
        'Enable hicInVscode.enableLocalRangeServer to open local HIC files.'
      );
      return;
    }

    let registration: HicFileRegistration;
    try {
      registration = await this.rangeServer.registerFile(document.uri);
    } catch (error) {
      webviewPanel.webview.html = buildErrorHtml(
        'Could not bind local range server',
        'The viewer could not create a temporary localhost file route.',
        error instanceof Error ? error.message : String(error)
      );
      return;
    }

    webviewPanel.webview.options = {
      enableScripts: true,
      localResourceRoots: [
        vscode.Uri.joinPath(this.context.extensionUri, 'media'),
        vscode.Uri.joinPath(this.context.extensionUri, 'node_modules', 'juicebox.js', 'dist'),
        vscode.Uri.joinPath(this.context.extensionUri, 'node_modules', 'font-awesome'),
        vscode.Uri.joinPath(this.context.extensionUri, 'node_modules', '@vscode', 'codicons', 'dist')
      ],
      portMapping: []
    };

    const bootstrap: HicViewerBootstrap = {
      file: {
        uri: document.uri.toString(),
        url: registration.url,
        name: path.basename(document.uri.fsPath)
      },
      settings,
      assets: {
        juiceboxModuleUri: '',
        juiceboxCssUri: '',
        viewScriptUri: '',
        viewStyleUri: '',
        fontAwesomeCssUri: '',
        codiconCssUri: ''
      }
    };

    webviewPanel.webview.html = buildHicViewerHtml(webviewPanel.webview, this.context.extensionUri, bootstrap);

    const session = new HicViewerSession(document, webviewPanel, registration, this);
    this.sessions.set(document.uri.toString(), session);
    this.activeSession = session;

    webviewPanel.onDidDispose(() => {
      this.sessions.delete(document.uri.toString());
      registration.dispose();
      if (this.activeSession === session) {
        this.activeSession = undefined;
      }
    });

    webviewPanel.onDidChangeViewState((event) => {
      if (event.webviewPanel.active) {
        this.activeSession = session;
      }
    });

    webviewPanel.webview.onDidReceiveMessage(async (message: HicViewerMessage) => {
      switch (message.type) {
        case 'ready':
          this.activeSession = session;
          break;
        case 'state':
          if (message.snapshot) {
            session.setSnapshot(message.snapshot);
          }
          break;
        case 'copy-locus':
          await this.copyCurrentLocus(session);
          break;
        case 'copy-state':
          await this.copyViewerState(session);
          break;
        case 'reload':
          await session.postMessage({ type: 'reload' });
          break;
        case 'reset':
          await session.postMessage({ type: 'reset' });
          break;
        case 'open-external':
          await this.openExternalJuiceboxDesktop(session);
          break;
      }
    });
  }

  async openHicViewer(uri?: vscode.Uri): Promise<void> {
    const target = uri ?? (await this.pickFileUri());
    if (!target) {
      return;
    }

    if (target.scheme !== 'file') {
      void vscode.window.showErrorMessage('This viewer currently opens local file URIs only.');
      return;
    }

    await vscode.commands.executeCommand('vscode.openWith', target, HicCustomEditorProvider.viewType);
  }

  async copyCurrentLocus(session = this.getActiveSession()): Promise<void> {
    const locus = session?.latestSnapshot?.locus?.trim();
    if (!locus) {
      void vscode.window.showWarningMessage('No locus is available yet.');
      return;
    }

    await vscode.env.clipboard.writeText(locus);
    void vscode.window.showInformationMessage('Current locus copied.');
  }

  async copyViewerState(session = this.getActiveSession()): Promise<void> {
    const snapshot = session?.latestSnapshot;
    if (!snapshot) {
      void vscode.window.showWarningMessage('No viewer state is available yet.');
      return;
    }

    const payload = JSON.stringify(snapshot, null, 2);
    await vscode.env.clipboard.writeText(payload);
    void vscode.window.showInformationMessage('Viewer state copied.');
  }

  async reloadHicFile(session = this.getActiveSession()): Promise<void> {
    if (!session) {
      void vscode.window.showWarningMessage('No open HIC viewer is active.');
      return;
    }

    await session.postMessage({ type: 'reload' });
  }

  async openExternalJuiceboxDesktop(session = this.getActiveSession()): Promise<void> {
    if (!session) {
      void vscode.window.showWarningMessage('No open HIC viewer is active.');
      return;
    }

    const config = vscode.workspace.getConfiguration('hicInVscode');
    const jarPath = config.get<string>('externalJuiceboxJar', '').trim();
    const javaExecutable = config.get<string>('javaExecutable', 'java').trim() || 'java';

    if (!jarPath) {
      void vscode.window.showWarningMessage('Set hicInVscode.externalJuiceboxJar to use the external Juicebox fallback.');
      return;
    }

    const filePath = session.document.uri.fsPath;
    const child = childProcess.spawn(javaExecutable, ['-jar', jarPath, filePath], {
      detached: true,
      stdio: 'ignore',
      windowsHide: true
    });

    child.once('error', (error) => {
      void vscode.window.showErrorMessage(`Could not launch Juicebox Desktop: ${error.message}`);
    });
    child.unref();
  }

  rememberSession(session: HicViewerSession): void {
    this.sessions.set(session.document.uri.toString(), session);
    this.activeSession = session;
  }

  getActiveSession(): HicViewerSession | undefined {
    if (this.activeSession) {
      return this.activeSession;
    }

    const activeTab = vscode.window.tabGroups.activeTabGroup.activeTab;
    if (activeTab?.input instanceof vscode.TabInputCustom && activeTab.input.viewType === VIEW_TYPE) {
      return this.sessions.get(activeTab.input.uri.toString());
    }

    return undefined;
  }

  private async pickFileUri(): Promise<vscode.Uri | undefined> {
    const pick = await vscode.window.showOpenDialog({
      canSelectMany: false,
      openLabel: 'Open HIC file',
      filters: {
        HIC: ['hic']
      }
    });

    return pick?.[0];
  }
}

function documentLabel(uri: vscode.Uri): string {
  return `${uri.scheme}:${uri.fsPath}`;
}
