import { basename, dirname, join } from 'path';
import { DirFileObject, FileObject, RouteConfig } from './defs';
import slash from 'slash';

export type ToRouteOptions = {
  extensions: string[] | Set<string>;
  filter: (obj: FileObject) => boolean;
  isLayout: (obj: FileObject) => boolean;
  componentPath: (obj: FileObject) => string;
  routePath: (obj: FileObject) => string;
};

const defaultRouteExt = new Set(['.js', '.jsx', '.ts', '.tsx', '.vue']);

const defaultToRouteOptions: ToRouteOptions = {
  extensions: defaultRouteExt,
  filter: () => true,
  isLayout: (obj) => obj.name === '_layout',
  componentPath: (obj) => '@/pages/' + obj.path,
  routePath: (obj) => {
    const bName = basename(obj.path, obj.extname);
    let routePath = '';
    if (obj.name === '_layout' || obj.name === 'index') {
      routePath = dirname(obj.path);
    } else {
      routePath = slash(join(dirname(obj.path), bName));
    }
    return '/' + (routePath === '.' ? '' : routePath);
  },
};

/**
 * Scan the directory tree and build routes config.
 * @param dirTree directory tree from scanDir()
 * @param root reference of root routes config
 * @param options
 */
function buildRoutes(dirTree: DirFileObject[], root: RouteConfig[], options: ToRouteOptions): void {
  const { isLayout, componentPath, filter, routePath, extensions } = options;

  const subRoot: RouteConfig[] = [];
  let layoutRoot: RouteConfig | null = null;
  for (let i = 0; i < dirTree.length; i++) {
    const obj = dirTree[i];

    if ('isFile' in obj) {
      // extensions filter
      if (extensions instanceof Set && extensions.size > 0 && !extensions.has(obj.extname)) continue;
      // custom filter
      if (false === filter(obj)) continue;
      const layout = isLayout(obj);
      if (layout) {
        // layout found
        layoutRoot = {
          path: routePath(obj),
          component: componentPath(obj),
          exact: false,
          children: [],
        };
      } else {
        // page only
        subRoot.push({
          path: routePath(obj),
          component: componentPath(obj),
          exact: true,
        });
      }
    } else {
      // Scan sub directory
      buildRoutes(obj.children || [], subRoot, options);
    }
  }

  if (layoutRoot != null) {
    // Take current routes to a deeper level(children) when there is a layout file exists.
    layoutRoot.children = subRoot;
    root.push(layoutRoot);
  } else {
    // Merge all routes to root. No layout.
    root.push(...subRoot);
  }
}

export default function toRoute(dirTree: DirFileObject[], options: Partial<ToRouteOptions> = {}) {
  const routeRoot: RouteConfig[] = [];

  const mergedOptions = {
    ...defaultToRouteOptions,
    ...options,
  };

  if (Array.isArray(mergedOptions.extensions)) {
    mergedOptions.extensions = new Set(mergedOptions.extensions);
  }

  buildRoutes(dirTree, routeRoot, mergedOptions);
  return routeRoot;
}
