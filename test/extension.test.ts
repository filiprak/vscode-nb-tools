import assert from 'assert';
import path from 'path';
import fs from 'fs';
import PHPFmt from '../src/PHPFmt';
import { execSync } from 'child_process';
import {
  workspace as Workspace,
  window as Window,
  commands as Commands,
  extensions as Extensions,
  Extension
} from 'vscode';

const pkg: any = require('pjson');

suite('PHPFmt Test', () => {
  const extension = Extensions.getExtension(
    `${pkg.author}.${pkg.name}`
  ) as Extension<any>;

  test('extension should be present', () => {
    assert.ok(extension);
  });

  test('can activate', () => {
    return extension.activate().then(() => {
      assert.ok(true);
    });
  });

  test('can format with command', () => {
    const filePath: string = path.join(Workspace.rootPath!, 'ugly.php');

    return Workspace.openTextDocument(filePath).then(doc => {
      return Window.showTextDocument(doc).then(() =>
        Commands.executeCommand('editor.action.formatDocument').then(
          () => {
            execSync(
              `java -jar ${PHPFmt.getJarPath()} ${filePath} -o test-tmp/formatted.php`
            );
            const phpfmtFormatted: string = fs.readFileSync("test-tmp/formatted.php").toString();
            assert.equal(doc.getText(), phpfmtFormatted);
          },
          err => console.error(err)
        )
      );
    });
  });

  test('should register commands', () => {
    return Commands.getCommands(true).then(commands => {
      const foundCommands = commands.filter(value =>
        value.startsWith('phpfmt.')
      );

      assert.equal(foundCommands.length, pkg.contributes.commands.length);
    });
  });

  test('should commands work', () => {
    const commands = pkg.contributes.commands as Array<any>;
    commands
      .filter(value => !value.when)
      .forEach(command => Commands.executeCommand(command.command));
  });
});
