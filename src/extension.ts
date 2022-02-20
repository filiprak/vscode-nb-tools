import { ExtensionContext } from 'vscode';
import PHPFormatter from './PHPFormatter';
import PHPFmtProvider from './PHPFmtProvider';

export function activate(context: ExtensionContext): void {
  const provider: PHPFmtProvider = new PHPFmtProvider(new PHPFormatter());

  context.subscriptions.push(
    provider.onDidChangeConfiguration(),
    provider.formatCommand(),
    provider.documentFormattingEditProvider(),
    provider.documentRangeFormattingEditProvider(),
    ...provider.statusBarItem()
  );
}
