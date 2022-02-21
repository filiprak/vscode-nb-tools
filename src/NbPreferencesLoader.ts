import yauzl, { Entry } from 'yauzl';
import { parseStringPromise } from 'xml2js';
import { INbToolsConfigPHPFormatterPrefs } from './INbToolsConfig';


class XMLPreferences {
    private ok: boolean = false;
    private path?: string;
    private xml?: string;

    constructor(path?: string, xml?: string) {
        if (xml) {
            this.ok = true;
        }
        this.xml = xml;
        this.path = path;
    }

    public isValid(): boolean {
        return this.ok;
    }

    public getPath(): string | null {
        return this.path || null;
    }

    public getXml(): string | null {
        return this.xml || null;
    }

    public parse(): Promise<any> {
        if (!this.isValid()) {
            return Promise.reject(new Error("Invalid xml file"));
        } else {
            return parseStringPromise(this.xml || "");
        }
    }
}

class NbPreferencesLoader {
    private filterPrefValue(str: any): string | number | boolean {
        str = String(str);

        if (str.toLowerCase() === "true") {
            return true;
        }

        if (str.toLowerCase() === "false") {
            return false;
        }

        const intParsed = parseInt(str);
        const floatParsed = parseFloat(str);

        if (String(intParsed) === str) {
            return intParsed;

        } if (String(floatParsed) === str) {
            return floatParsed;

        } else {
            return str;
        }
    }

    public loadPHPFormatterPrefs(zipFilename: string): Promise<INbToolsConfigPHPFormatterPrefs> {

        return this
            .loadFiles(zipFilename, [
                /Editors.Preferences.(.+)-CustomPreferences\.xml/,
                /Editors.text.x-php5.Preferences.(.+)-CustomPreferences\.xml/,
            ])
            .then((files: XMLPreferences[]) => {
                return Promise
                    .all([
                        files[0].isValid() ? files[0].parse() : {},
                        files[1].isValid() ? files[1].parse() : {},
                    ])
                    .then((parsed) => {
                        try {
                            let phpPrefs: any = {};
                            const parsedEditorXml: any = parsed[0];
                            const parsedPhpXml: any = parsed[1];

                            if (
                                parsedEditorXml['editor-preferences'] &&
                                parsedEditorXml['editor-preferences']['entry']
                            ) {
                                phpPrefs = parsedEditorXml['editor-preferences']['entry'].reduce((acc: any, entry: any) => {
                                    acc[entry.$.name] = this.filterPrefValue(entry.value[0]);
                                    return acc;
                                }, {});
                            }

                            if (
                                parsedPhpXml['editor-preferences'] &&
                                parsedPhpXml['editor-preferences']['entry']
                            ) {
                                parsedPhpXml['editor-preferences']['entry'].forEach((entry: any) => {
                                    phpPrefs[entry.$.name] = this.filterPrefValue(entry.value[0]);
                                }, {});
                            }

                            return phpPrefs;

                        } catch (err) {
                            return Promise.reject(err);
                        }
                    });
            })
    }

    public loadFiles(zipFilename: string, filenameRegexes: RegExp[]): Promise<XMLPreferences[]> {

        return new Promise((resolve, reject) => {
            const resultFiles: XMLPreferences[] = filenameRegexes.map(() => {
                return new XMLPreferences();
            });
            let matched: { [idx: string]: boolean } = {};

            if (filenameRegexes.length < 1) {
                resolve(resultFiles);
            }

            yauzl.open(zipFilename, { lazyEntries: true }, (err, zipfile) => {
                if (err || !zipfile) {
                    reject(err);
                    return;
                }

                zipfile.readEntry();
                zipfile
                    .on("entry", (entry: Entry) => {
                        let matchedRegexIdx: number = -1;

                        filenameRegexes.forEach((regex, idx) => {
                            if (regex.test(entry.fileName)) {
                                matchedRegexIdx = idx;
                                return false;
                            }
                        });

                        if (matchedRegexIdx < 0) {
                            zipfile.readEntry();
                        } else {
                            zipfile.openReadStream(entry, function (err, readStream) {
                                if (err || !readStream) {
                                    reject(err);
                                    return;
                                };

                                let xml: string = "";

                                readStream.on("data", function (chunk) {
                                    xml += chunk.toString();
                                });

                                readStream.on("error", function (err) {
                                    zipfile.close();
                                    reject(err);
                                });

                                readStream.on("end", function () {
                                    resultFiles[matchedRegexIdx] = new XMLPreferences(entry.fileName, xml);

                                    matched[matchedRegexIdx] = true;

                                    if (Object.keys(matched).length < filenameRegexes.length) {
                                        zipfile.readEntry();
                                    } else {
                                        resolve(resultFiles);
                                    }
                                });
                            });
                        }
                    })
                    .once("error", (err) => {
                        zipfile.close();
                        reject(err);
                    })
                    .once("end", () => {
                        resolve(resultFiles);
                        zipfile.close();
                    });
            });
        });
    }
}

const loader = new NbPreferencesLoader();

loader
    .loadPHPFormatterPrefs('testProject/nb_config.zip')
    .then((prefs: INbToolsConfigPHPFormatterPrefs) => {
        console.log(prefs);
    })
    .catch((err) => {
        console.error("Loading error:");
        console.error(err);
    });
