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
    private static javaHome: string = "";
    private static javaBin: string = "";
    private detectingPromise: Promise<string> | null = null;

    public static getJavaBin(): string {
        return JavaHandler.javaBin || 'java';
    }

    public static getJavaHome(): string {
        return JavaHandler.javaHome;
    }

    private static findJavaBin(javaHome?: string): string {
        if (javaHome) {
            if (fs.existsSync(path.resolve(javaHome, 'bin', 'java.exe'))) {
                return `"${path.resolve(javaHome, 'bin', 'java.exe')}"`;
            } else if (fs.existsSync(path.resolve(javaHome, 'bin', 'java'))) {
                return `"${path.resolve(javaHome, 'bin', 'java')}"`;
            } else {
                return 'java';
            }
        } else {
            return 'java';
        }
    }

    public onConfigChanged(): void {
        const newConfig = Workspace.getConfiguration('nbtools') as any;
        const oldConfig = this.config;

        if (newConfig.java_bin !== oldConfig.java_bin) {
            if (newConfig.java_bin === 'auto' || !String(newConfig.java_bin).trim()) {
                this
                    .autoDetectHome()
                    .then(path => {
                        JavaHandler.javaHome = path;
                        JavaHandler.javaBin = JavaHandler.findJavaBin(path);
                    })
                    .catch(err => {
                        JavaHandler.javaHome = "";
                        JavaHandler.javaBin = JavaHandler.findJavaBin("");
                        Window.showErrorMessage("nbtools: Failed to autodetect java");
                        NbTools.output("Failed to autodetect java: " + err.message);
                    })
                    .finally(() => {
                        this.detectingPromise = null;
                    });
            } else {
                JavaHandler.javaBin = newConfig.java_bin;
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
