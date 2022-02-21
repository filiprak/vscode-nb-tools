import { ExtensionContext } from 'vscode';
import NbTools from './NbTools';

export function activate(context: ExtensionContext): void {
  const provider: NbTools = new NbTools();

  context.subscriptions.push(
    provider.onDidChangeConfiguration(),
    provider.formatCommand(),
    provider.documentFormattingEditProvider(),
    provider.documentRangeFormattingEditProvider(),
    ...provider.statusBarItem()
  );
}
