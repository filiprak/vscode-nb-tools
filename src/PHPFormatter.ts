import {
  workspace as Workspace,
  window as Window,
  WorkspaceFolder
} from 'vscode';
import path from 'path';
import fs from 'fs';
import os from 'os';
import { execSync } from 'child_process';
import findUp from 'find-up';
import INbToolsConfig from './INbToolsConfig';
import Widget from './Widget';

class PHPFormatter {
  private widget: Widget;
  private config: INbToolsConfig = {} as any;
  private args: Array<string> = [];

  public constructor() {
    this.loadSettings();
    this.widget = Widget.getInstance();
  }

  public static getJarPath(): string {
    return path.resolve(path.dirname(__filename), '..', '..', 'bin/nb-fmt.jar');
  }

  public loadSettings(): void {
    this.config = Workspace.getConfiguration('nbtools') as any;
    this.args.length = 0;

    if (this.config.custom_arguments !== '') {
      this.args.push(this.config.custom_arguments);
      return;
    }
  }

  public getWidget(): Widget {
    return this.widget;
  }

  public getConfig(): INbToolsConfig {
    return this.config;
  }

  private getArgs(fileName: string): Array<string> {
    const args: Array<string> = this.args.slice(0);
    args.push(`"${fileName}"`);
    return args;
  }

  public format(text: string): Promise<string> {
    return new Promise<string>((resolve, reject) => {
      let iniPath: string | undefined;

      const execOptions = { cwd: '' };

      if (Window.activeTextEditor) {
        execOptions.cwd = path.dirname(
          Window.activeTextEditor.document.fileName
        );

        const workspaceFolders: WorkspaceFolder[] | undefined = Workspace.workspaceFolders;

        if (workspaceFolders) {
          iniPath = findUp.sync('.nbtools.ini', {
            cwd: execOptions.cwd
          });
          const origIniPath = iniPath;

          for (let workspaceFolder of workspaceFolders) {
            if (
              origIniPath &&
              origIniPath.startsWith(workspaceFolder.uri.fsPath)
            ) {
              break;
            } else {
              iniPath = undefined;
            }
          }
        }
      }

      // try {
      //   const stdout: Buffer = execSync(`${this.config.java_bin} -version`);

      //   if (Number(stdout.toString()) < 50600 && Number(stdout.toString()) > 80000) {
      //     return reject(new Error('nbtools: PHP version < 5.6 or > 8.0'));
      //   }
      // } catch (err) {
      //   return reject(
      //     new Error(`nbtools: java_bin "${this.config.java_bin}" is invalid`)
      //   );
      // }

      const tmpDir: string = os.tmpdir();

      const tmpFileName: string = path.normalize(
        `${tmpDir}/temp-${Math.random()
          .toString(36)
          .replace(/[^a-z]+/g, '')
          .substr(0, 10)}.php`
      );

      try {
        fs.writeFileSync(tmpFileName, text);

      } catch (err) {
        this.widget.addToOutput(err.message);
        return reject(
          new Error(`nbtools: Cannot create tmp file in "${tmpDir}"`)
        );
      }

      // test whether the php file has syntax error
      // try {
      //   execSync(`${this.config.java_bin} -l ${tmpFileName}`, execOptions);
      // } catch (err) {
      //   this.widget.addToOutput(err.message);
      //   Window.setStatusBarMessage(
      //     'nbtools: Format failed - syntax errors found',
      //     4500
      //   );
      //   return reject();
      // }

      const args: Array<string> = this.getArgs(tmpFileName);
      args.unshift(`"${PHPFormatter.getJarPath()}"`);

      let formatCmd: string;

      if (!iniPath) {
        formatCmd = `${this.config.java_bin} -jar ${args.join(' ')}`;
      } else {
        formatCmd = `${this.config.java_bin} -jar ${args.join(' ')} --config=${iniPath}`;
      }

      this.widget.addToOutput(formatCmd);

      try {
        execSync(formatCmd, execOptions);

      } catch (err) {
        this.widget.addToOutput(err.message).show();
        return reject(new Error('nbtools: Execute nbtools cli failed'));
      }

      const formatted: string = fs.readFileSync(tmpFileName, 'utf-8');
      try {
        fs.unlinkSync(tmpFileName);
      } catch (err) { }

      if (formatted.length > 0) {
        resolve(formatted);
      } else {
        reject();
      }
    });
  }
}

export default PHPFormatter;
