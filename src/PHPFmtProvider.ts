import {
  workspace as Workspace,
  window as Window,
  commands as Commands,
  languages as Languages,
  Position,
  Range,
  TextEdit,
  Disposable,
  DocumentSelector
} from 'vscode';
import PHPFormatter from './PHPFormatter';
import Widget from './Widget';

export default class PHPFmtProvider {
  private fmt: PHPFormatter;
  private widget: Widget;
  private documentSelector: DocumentSelector;

  public constructor(formatter: PHPFormatter) {
    this.fmt = formatter;
    this.widget = this.fmt.getWidget();
    this.documentSelector = [
      { language: 'php', scheme: 'file' },
      { language: 'php', scheme: 'untitled' }
    ];
  }

  public onDidChangeConfiguration(): Disposable {
    return Workspace.onDidChangeConfiguration(() => {
      this.fmt.loadSettings();
    });
  }

  public formatCommand(): Disposable {
    return Commands.registerTextEditorCommand('nbtools.format', textEditor => {
      if (textEditor.document.languageId === 'php') {
        Commands.executeCommand('editor.action.formatDocument');
      }
    });
  }

  public documentFormattingEditProvider(): Disposable {
    return Languages.registerDocumentFormattingEditProvider(
      this.documentSelector,
      {
        provideDocumentFormattingEdits: document => {
          return new Promise<any>((resolve, reject) => {
            const originalText: string = document.getText();
            const lastLine = document.lineAt(document.lineCount - 1);
            const fullRange: Range = new Range(
              new Position(0, 0),
              lastLine.range.end
            );

            this.fmt
              .format(originalText, -1, -1)
              .then((text: string) => {
                if (text !== originalText) {
                  resolve([new TextEdit(fullRange, text)]);
                } else {
                  reject();
                }
              })
              .catch(err => {
                if (err instanceof Error) {
                  Window.showErrorMessage(err.message);
                  this.widget.addToOutput(err.message);
                }
                reject();
              });
          });
        }
      }
    );
  }

  public documentRangeFormattingEditProvider(): Disposable {
    return Languages.registerDocumentRangeFormattingEditProvider(
      this.documentSelector,
      {
        provideDocumentRangeFormattingEdits: (document, range) => {
          return new Promise<any>((resolve, reject) => {
            const originalText: string = document.getText();
            const lastLine = document.lineAt(document.lineCount - 1);
            const fullRange: Range = new Range(
              new Position(0, 0),
              lastLine.range.end
            );

            this.fmt
              .format(originalText, document.offsetAt(range.start), document.offsetAt(range.end))
              .then((text: string) => {
                if (text !== originalText) {
                  resolve([new TextEdit(fullRange, text)]);
                } else {
                  reject();
                }
              })
              .catch(err => {
                if (err instanceof Error) {
                  Window.showErrorMessage(err.message);
                  this.widget.addToOutput(err.message);
                }
                reject();
              });
          });
        }
      }
    );
  }

  public statusBarItem(): Disposable[] {
    return [
      Window.onDidChangeActiveTextEditor(editor => {
        if (typeof this.statusBarItem !== 'undefined') {
          this.widget.toggleStatusBarItem(editor);
        }
      }),
      Commands.registerCommand('nbtools.openOutput', () => {
        this.widget.getOutputChannel().show();
      })
    ];
  }
}
