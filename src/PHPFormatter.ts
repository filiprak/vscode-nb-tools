import {
  workspace as Workspace,
  window as Window,
} from 'vscode';
import path from 'path';
import fs from 'fs';
import os from 'os';
import { execSync } from 'child_process';
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

    if (this.config.java_custom_args !== '') {
      this.args.push(this.config.java_custom_args);
    }
    if (this.config.php_formatter_config !== null) {
      this.args.push(`-c=${JSON.stringify(this.config.php_formatter_config)}`);
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
    args.push(`-m="text/x-php5"`);
    args.push(`"${fileName}"`);
    return args;
  }

  public format(text: string, start: number, end: number): Promise<string> {
    return new Promise<string>((resolve, reject) => {
      const execOptions = { cwd: '' };

      if (Window.activeTextEditor) {
        execOptions.cwd = path.dirname(
          Window.activeTextEditor.document.fileName
        );
      }

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

      const args: Array<string> = this.getArgs(tmpFileName);

      if (start >= 0) {
        args.push(`-s=${start}`);
      }

      if (end >= 0) {
        args.push(`-e=${end}`);
      }

      let formatCmd: string;

      formatCmd = `${this.config.java_bin} -XX:TieredStopAtLevel=1 -XX:CICompilerCount=1 -XX:+UseSerialGC -Xmx512m -XX:-UsePerfData -jar "${PHPFormatter.getJarPath()}" ${args.join(' ')}`;

      this.widget.addToOutput(formatCmd);

      try {
        const start = Date.now();
        const stdout: string = execSync(formatCmd, execOptions).toString();
        const stop = Date.now();

        if (stdout) {
          this.widget.addToOutput(stdout);
        }

        Window.setStatusBarMessage(
          `nbtools: Reformatting time: ${((stop - start) / 1000).toFixed(3)}s`,
          4500
        );

      } catch (err) {
        if (err.status == "10") {
          this.widget.addToOutput(err.message + "[exit code: " + err.status + "]");
          Window.setStatusBarMessage(
            'nbtools: Format failed - syntax errors found',
            4500
          );
          return reject();
        } else {
          this.widget.addToOutput(err.message + "[exit code: " + err.status + "]").show();
          return reject(new Error('nbtools: Execute java nbtools failed. Please ensure you have java installed.'));
        }
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
