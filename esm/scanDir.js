var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
import slash from 'slash';
import { join } from 'path';
import { promises as fs } from 'fs';
function scan(path, name = '', options) {
    return __awaiter(this, void 0, void 0, function* () {
        const { ignore } = options;
        const fullPath = slash(join(path, name));
        const stat = yield fs.stat(fullPath);
        if (name[0] === '.') {
            return false;
        }
        const shouldIgnore = ignore.some((reg) => {
            return reg.test(fullPath);
        });
        if (shouldIgnore) {
            return false;
        }
        if (stat.isFile()) {
            if (name.indexOf('.') < 0)
                return false;
            return {
                path: fullPath,
                isFile: true,
                isDirectory: false,
            };
        }
        else if (stat.isDirectory()) {
            const dirRes = yield fs.readdir(fullPath);
            const children = yield Promise.all(dirRes.map((name) => __awaiter(this, void 0, void 0, function* () { return scan(fullPath, name, options); }))).then((res) => res.filter((res) => !!res));
            return {
                path: fullPath,
                isFile: false,
                isDirectory: true,
                children,
            };
        }
        return false;
    });
}
export default function scanDir(rootPath, options = {}) {
    const { ignore: _ignore } = options;
    const ignore = [];
    if (_ignore) {
        if (Array.isArray(_ignore)) {
            ignore.push(..._ignore);
        }
        else {
            ignore.push(_ignore);
        }
    }
    return scan(rootPath, '', {
        ignore,
    });
}
console.time('scan');
scanDir('.', {
    ignore: /node_modules\//,
}).then((res) => {
    console.timeEnd('scan');
    console.log(JSON.stringify(res, null, 2));
});
