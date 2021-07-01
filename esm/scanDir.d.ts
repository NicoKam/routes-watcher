export declare type DirObject = {
    path: string;
    isFile: boolean;
    isDirectory: boolean;
    children?: DirObject[];
};
export declare type ScanDirOptions = {
    ignore?: RegExp | RegExp[];
};
export default function scanDir(rootPath: string, options?: ScanDirOptions): Promise<false | DirObject>;
