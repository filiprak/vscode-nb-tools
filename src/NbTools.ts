import {
  workspace as Workspace,
  window as Window,
  commands as Commands,
  languages as Languages,
  Position,
  Range,
  TextEdit,
  Disposable,
  DocumentSelector,
  OutputChannel
} from 'vscode';
import Formatter from './formatters/Formatter';
import PHPFormatter from './formatters/php/PHPFormatter';
import Widget from './Widget';

export default class NbTools {
  private static readonly formatters: { [languageId: string]: Formatter } = {
    'php': new PHPFormatter()
  };
  private static readonly widget: Widget = Widget.getInstance();
  private static readonly documentSelector: DocumentSelector = [
    { language: 'php', scheme: 'file' },
    { language: 'php', scheme: 'untitled' }
  ];

  public constructor() {
    this.notifyFormattersConfigChanged();
  }

  public static getWidget(): Widget {
    return this.widget;
  }

  public static output(message: string): OutputChannel {
    return this.widget.addToOutput(message);
  }

  public static getFormatter(languageId: string): Formatter {
    if (this.supportsFormatting(languageId)) {
      return this.formatters[languageId];
    } else {
      throw new Error(`Formatter for language ${languageId} is not supported`);
    }
  }

  public static supportsFormatting(languageId: string): boolean {
    return !!this.formatters[languageId];
  }

  private notifyFormattersConfigChanged(): void {
    for (const languageId in NbTools.formatters) {
      const formatter = NbTools.formatters[languageId];
      formatter.onConfigChanged();
    }
  }

  public onDidChangeConfiguration(): Disposable {
    return Workspace.onDidChangeConfiguration(() => {
      this.notifyFormattersConfigChanged();
    });
  }

  public formatCommand(): Disposable {
    return Commands.registerTextEditorCommand('nbtools.format', textEditor => {
      if (NbTools.supportsFormatting(textEditor.document.languageId)) {
        Commands.executeCommand('editor.action.formatDocument');
      }
    });
  }

  public documentFormattingEditProvider(): Disposable {
    return Languages.registerDocumentFormattingEditProvider(
      NbTools.documentSelector,
      {
        provideDocumentFormattingEdits: document => {
          return new Promise<any>((resolve, reject) => {
            const originalText: string = document.getText();
            const lastLine = document.lineAt(document.lineCount - 1);
            const fullRange: Range = new Range(
              new Position(0, 0),
              lastLine.range.end
            );

            NbTools
              .getFormatter(document.languageId)
              .reformat(originalText, -1, -1)
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
                  NbTools.widget.addToOutput(err.message);
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
      NbTools.documentSelector,
      {
        provideDocumentRangeFormattingEdits: (document, range) => {
          return new Promise<any>((resolve, reject) => {
            const originalText: string = document.getText();
            const lastLine = document.lineAt(document.lineCount - 1);
            const fullRange: Range = new Range(
              new Position(0, 0),
              lastLine.range.end
            );

            NbTools
              .getFormatter(document.languageId)
              .reformat(originalText, document.offsetAt(range.start), document.offsetAt(range.end))
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
                  NbTools.output(err.message);
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
          NbTools.getWidget().toggleStatusBarItem(editor);
        }
      }),
      Commands.registerCommand('nbtools.openOutput', () => {
        NbTools.getWidget().getOutputChannel().show();
      })
    ];
  }
}
