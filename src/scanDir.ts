import { promises as fs } from 'fs';
import { basename, extname, join } from 'path';
import slash from 'slash';
import { DirFileObject } from './defs';

export type ScanDirOptions = {
  includes?: RegExp | RegExp[];
  excludes?: RegExp | RegExp[];
};

type ScanOptions = {
  includes: RegExp[];
  excludes: RegExp[];
  rootPath: string;
};

/**
 * Scan and build directory tree
 * @param dir relative parent directory
 * @param name current filename
 * @param options
 * @returns
 */
async function scan(dir: string = '', options: ScanOptions): Promise<DirFileObject | false> {
  const { excludes, includes, rootPath } = options;
  const name = basename(dir);
  const fullPath = slash(join(rootPath, dir));
  const stat = await fs.stat(fullPath);

  // ignore filename starts with '.'
  if (name[0] === '.') {
    return false;
  }

  if (stat.isFile()) {
    const isValid = includes.every((reg) => reg.test(fullPath)) && !excludes.some((reg) => reg.test(fullPath));

    if (!isValid) {
      return false;
    }

    const ext = extname(dir);

    return {
      name: basename(dir, ext),
      path: dir,
      isFile: true,
      suffix: ext,
    };
  } else if (stat.isDirectory()) {
    const dirRes = await fs.readdir(fullPath);
    const children: DirFileObject[] = await Promise.all(
      dirRes.map(async (name) => scan(slash(join(dir, name)), options)),
    ).then((res) => res.filter((res) => !!res) as DirFileObject[]);
    return {
      path: dir,
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
  const { excludes: _excludes, includes: _includes } = options;
  const includes: RegExp[] = [];
  const excludes: RegExp[] = [];
  if (_includes) {
    if (Array.isArray(_includes)) {
      includes.push(..._includes);
    } else {
      includes.push(_includes);
    }
  }
  if (_excludes) {
    if (Array.isArray(_excludes)) {
      excludes.push(..._excludes);
    } else {
      excludes.push(_excludes);
    }
  }
  const root = await scan('', {
    includes,
    excludes,
    rootPath,
  });

  if (root != false && 'isDirectory' in root) {
    return root.children;
  }

  return [];
}
