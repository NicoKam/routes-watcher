import { basename, dirname, join } from 'path';
import { DirFileObject, FileObject, RouteConfig } from './defs';
import slash from 'slash';

export type ToRouteOptions = {
  filter: (obj: FileObject) => boolean;
  isLayout: (obj: FileObject) => boolean;
  componentPath: (obj: FileObject) => string;
  routePath: (obj: FileObject) => string;
};

const defaultRouteExt = new Set(['.js', '.jsx', '.ts', '.tsx']);

const defaultToRouteOptions: ToRouteOptions = {
  filter: (obj) => defaultRouteExt.has(obj.suffix),
  isLayout: (obj) => obj.name === '_layout',
  componentPath: (obj) => '@/pages/' + slash(join(dirname(obj.path), basename(obj.path, obj.suffix))),
  routePath: (obj) => {
    const bName = basename(obj.path, obj.suffix);
    if (obj.name === '_layout' || obj.name === 'index') {
      return '/' + dirname(obj.path);
    }
    return '/' + slash(join(dirname(obj.path), bName));
  },
};

function revTree(dirTree: DirFileObject[], root: RouteConfig[], options: ToRouteOptions, level = 0): void {
  const { isLayout, componentPath, filter, routePath } = options;

  const subRoot: RouteConfig[] = [];
  let layoutRoot: RouteConfig | null = null;
  for (let i = 0; i < dirTree.length; i++) {
    const obj = dirTree[i];

    if ('isFile' in obj) {
      if (false === filter(obj)) continue;
      const layout = isLayout(obj);
      /* layout found */
      if (layout) {
        layoutRoot = {
          path: routePath(obj),
          component: componentPath(obj),
          exact: false,
          children: [],
        };
      } else {
        /* page only */
        subRoot.push({
          path: routePath(obj),
          component: componentPath(obj),
          exact: true,
        });
      }
    } else {
      revTree(obj.children || [], subRoot, options, level + 1);
    }
  }

  if (layoutRoot != null) {
    layoutRoot.children = subRoot;
    root.push(layoutRoot);
  } else {
    root.push(...subRoot);
  }
}

export default function toRoute(dirTree: DirFileObject[], options: Partial<ToRouteOptions> = {}) {
  const routeRoot: RouteConfig[] = [];
  revTree(dirTree, routeRoot, {
    ...defaultToRouteOptions,
    ...options,
  });
  return routeRoot;
}
