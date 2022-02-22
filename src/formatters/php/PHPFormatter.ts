import {
  workspace as Workspace,
  window as Window,
} from 'vscode';
import path from 'path';
import fs from 'fs';
import os from 'os';
import { execSync } from 'child_process';
import INbToolsConfig from '../../INbToolsConfig';
import Formatter from '../Formatter';
import NbTools from '../../NbTools';
import NbPreferencesLoader from '../../NbPreferencesLoader';
import JavaHandler from '../../JavaHandler';


class PHPFormatter extends Formatter {
  private config: INbToolsConfig = {} as any;
  private codeStyle: object | null = null;

  public constructor() {
    super();
  }

  public onConfigChanged(): void {
    const newConfig = Workspace.getConfiguration('nbtools') as any;
    const oldConfig = this.config;

    if (newConfig.nb_config_zipfile !== oldConfig.nb_config_zipfile) {
      if (newConfig.nb_config_zipfile) {
        this
          .loadConfigFromZipfile(newConfig.nb_config_zipfile)
          .then(prefs => {
            Window.setStatusBarMessage(
              `nbtools: Succesfully loaded php formatter config`,
              4500
            );

            this.codeStyle = prefs;
          })
          .catch(err => {
            this.codeStyle = null;

            Window.showErrorMessage("nbtools: Failed to load php formatter config zip file");
            NbTools.output("Failed to load php formatter config: " + err.message);
          });

      } else {
        this.codeStyle = null;
      }
    }

    this.config = newConfig;
  }

  public getConfig(): INbToolsConfig {
    return this.config;
  }

  public loadConfigFromZipfile(zipFilename: string): Promise<any> {
    return (new NbPreferencesLoader())
      .loadPHPFormatterPrefs(zipFilename);
  }

  private getArgs(fileNameToFormat: string): Array<string> {
    const args: Array<string> = [];

    if (this.config.java_custom_args !== '') {
      args.push(this.config.java_custom_args);
    }
    if (this.codeStyle !== null) {
      args.push(`-c=${JSON.stringify(this.codeStyle)}`);
    }

    args.push(`-m="text/x-php5"`);
    args.push(`"${fileNameToFormat}"`);

    return args;
  }

  public reformat(text: string, start: number, end: number): Promise<string> {
    return new Promise<string>((resolve, reject) => {
      const execOptions = { cwd: '' };

      if (Window.activeTextEditor) {
        execOptions.cwd = path.dirname(
          Window.activeTextEditor.document.fileName
        );
      }

      const tmpDir: string = os.tmpdir();
      const tmpFileName: string = path.normalize(
        `${tmpDir}/nbtools-temp-${Math.random()
          .toString(36)
          .replace(/[^a-z]+/g, '')
          .substr(0, 10)}.php`
      );

      try {
        fs.writeFileSync(tmpFileName, text);

      } catch (err) {
        NbTools.output(err.message);
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

      formatCmd = `${JavaHandler.getJavaBin()} -XX:TieredStopAtLevel=1 -XX:CICompilerCount=1 -XX:+UseSerialGC -Xmx512m -XX:-UsePerfData -jar "${PHPFormatter.getJarPath()}" ${args.join(' ')}`;

      NbTools.output(formatCmd);

      try {
        const start = Date.now();
        const stdout: string = execSync(formatCmd, execOptions).toString();
        const stop = Date.now();

        if (stdout) {
          NbTools.output(stdout);
        }

        Window.setStatusBarMessage(
          `nbtools: Reformatting time: ${((stop - start) / 1000).toFixed(3)}s`,
          4500
        );

      } catch (err) {
        if (err.status == "10") {
          NbTools.output(err.message + "[exit code: " + err.status + "]");
          Window.setStatusBarMessage(
            'nbtools: Format failed - syntax errors found',
            4500
          );
          return reject();
        } else {
          NbTools.output(err.message + "[exit code: " + err.status + "]").show();
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
