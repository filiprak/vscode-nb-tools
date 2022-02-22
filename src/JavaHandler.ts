import INbToolsConfig from "./INbToolsConfig";
import NbTools from "./NbTools";
import {
    workspace as Workspace,
    window as Window,
} from 'vscode';
import findJavaHome from 'find-java-home';
import path from "path";
import fs from "fs";


export default class JavaHandler {
    private config: INbToolsConfig = {} as any;
    private javaHome: string = "";
    private javaBin: string = "";
    private detectingPromise: Promise<string> | null = null;

    public getJavaBin(): string {
        if (!this.javaBin) {
            if (fs.existsSync(path.resolve(this.javaHome, 'bin', 'java'))) {
                return path.resolve(this.javaHome, 'bin', 'java');
            } else if (fs.existsSync(path.resolve(this.javaHome, 'bin', 'java.exe'))) {
                return path.resolve(this.javaHome, 'bin', 'java.exe');
            } else {
                return 'java';
            }
        }
        return 'java';
    }

    public onConfigChanged(): void {
        const newConfig = Workspace.getConfiguration('nbtools') as any;
        const oldConfig = this.config;

        if (newConfig.java_bin !== oldConfig.java_bin) {
            if (newConfig.java_bin === 'auto' || !String(newConfig.java_bin).trim()) {
                this
                    .autoDetectHome()
                    .then(path => {
                        this.javaHome = path;
                    })
                    .catch(err => {
                        Window.showErrorMessage("nbtools: Failed to autodetect java");
                        NbTools.output("Failed to autodetect java: " + err.message);
                    });
            } else {
                this.javaHome = newConfig.java_bin;
            }
        }

        this.config = newConfig;
    }

    public autoDetectHome(): Promise<string> {
        if (!this.detectingPromise) {
            this.detectingPromise = new Promise((resolve, reject) => {
                findJavaHome({ allowJre: true } as any, (err: any, home: string) => {
                    if (err) {
                        reject(err);
                    } else {
                        resolve(home);
                        Window.showInformationMessage("nbtools: Detected java: " + home);
                    }
                });
            });
        }
        return this.detectingPromise;
    }

}
