import * as vscode from 'vscode';
import { HicCustomEditorProvider } from './hicCustomEditor';
import { HicRangeServer } from './hicRangeServer';

let rangeServer: HicRangeServer | undefined;

export async function activate(context: vscode.ExtensionContext): Promise<void> {
  rangeServer = new HicRangeServer({
    debugLogging: vscode.workspace.getConfiguration('hicInVscode').get<boolean>('debugLogging', false)
  });

  context.subscriptions.push(rangeServer);

  const provider = new HicCustomEditorProvider(context, rangeServer);
  context.subscriptions.push(
    vscode.window.registerCustomEditorProvider(HicCustomEditorProvider.viewType, provider, {
      webviewOptions: {
        retainContextWhenHidden: true
      },
      supportsMultipleEditorsPerDocument: false
    })
  );

  context.subscriptions.push(
    vscode.commands.registerCommand('hicInVscode.openHicViewer', (uri?: vscode.Uri) => provider.openHicViewer(uri)),
    vscode.commands.registerCommand('hicInVscode.copyCurrentLocus', () => provider.copyCurrentLocus()),
    vscode.commands.registerCommand('hicInVscode.copyViewerState', () => provider.copyViewerState()),
    vscode.commands.registerCommand('hicInVscode.reloadHicFile', () => provider.reloadHicFile()),
    vscode.commands.registerCommand('hicInVscode.openExternalJuiceboxDesktop', () => provider.openExternalJuiceboxDesktop())
  );
}

export async function deactivate(): Promise<void> {
  await rangeServer?.dispose();
  rangeServer = undefined;
}

