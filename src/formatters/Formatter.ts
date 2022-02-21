import path from 'path';
import NbTools from '../NbTools';
import Widget from '../Widget';


export default abstract class Formatter {

    public static getJarPath(): string {
        return path.resolve(path.dirname(__filename), '..', '..', '..', 'bin/nb-fmt.jar');
    }

    public static getWidget(): Widget {
        return NbTools.getWidget();
    }

    public abstract onConfigChanged(): void;
    public abstract reformat(text: string, start: number, end: number): Promise<string>;

}