import { promises as fs } from 'fs';
import { basename, extname, join } from 'path';
import slash from 'slash';
import { DirFileObject } from './defs';

export type ScanDirOptions = {
  ignore?: RegExp | RegExp[];
};

type ScanOptions = {
  ignore: RegExp[];
  rootPath: string;
};

async function scan(path: string = '', name = '', options: ScanOptions): Promise<DirFileObject | false> {
  const { ignore, rootPath } = options;
  const curPath = slash(join(path, name));
  const fullPath = slash(join(rootPath, curPath));
  const stat = await fs.stat(fullPath);
  if (name[0] === '.') {
    return false;
  }

  if (stat.isFile()) {
    const shouldIgnore = ignore.some((reg) => {
      return reg.test(fullPath);
    });

    if (shouldIgnore) {
      return false;
    }

    const ext = extname(curPath);

    return {
      name: basename(curPath, ext),
      path: curPath,
      isFile: true,
      suffix: ext,
    };
  } else if (stat.isDirectory()) {
    const dirRes = await fs.readdir(fullPath);
    const children: DirFileObject[] = await Promise.all(dirRes.map(async (name) => scan(curPath, name, options))).then(
      (res) => res.filter((res) => !!res) as DirFileObject[],
    );
    return {
      path: curPath,
      name,
      isDirectory: true,
      children,
    };
  }

  return false;
}

/**
 * scan directory into tree data
 * @param rootPath root directory
 * @param options
 * @returns
 */
export default async function scanDir(rootPath: string, options: ScanDirOptions = {}): Promise<DirFileObject[]> {
  const { ignore: _ignore } = options;
  const ignore: RegExp[] = [];
  if (_ignore) {
    if (Array.isArray(_ignore)) {
      ignore.push(..._ignore);
    } else {
      ignore.push(_ignore);
    }
  }
  const root = await scan('', '', {
    ignore,
    rootPath,
  });

  if (root != false && 'isDirectory' in root) {
    return root.children;
  }

  return [];
}
