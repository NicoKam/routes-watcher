import { existsSync, readFileSync, writeFileSync } from 'fs';
import { join, relative } from 'path';
import glob from 'glob';
import chokidar from 'chokidar';
import Timeout = NodeJS.Timeout;

export interface RouteConfig {
  /** routePath */
  path: string;
  /** route full path */
  fullPath?: string;
  /** file cache */
  files?: { [key: string]: string };
  exact?: boolean;
  children?: Array<RouteConfig>;
  component?: string;
  childCache?: { [key: string]: RouteConfig };
}

export interface IConfig {
  /** Path of your convention routes root. */
  pageRoot?: string;
  /** Use chokidar to watch pageRoot? */
  watch?: boolean;
  /** The file in the routes root you want to scanned (glob) */
  files?: Array<string>;
  /** filter after all file was scanned */
  filter?: (value: string, index: number, array: Array<string>) => boolean;
  /** Ignored path (glob) */
  ignore?: Array<string>;
  /**
   * Format every routes node
   * @param routeConfig
   * @param utils
   */
  formatter?: (
    routeConfig: RouteConfig,
    utils: {
      /**
       * Push routeConfig to children
       * @param child
       */
      pushChild: (child: RouteConfig, order?: number) => void;
      /**
       * Mark this string and replace it to real script
       * @param stringScript
       */
      toScript: (stringScript: string) => string;
      /**
       * Find the path relative to page root
       * @param currentPath
       */
      relativePageRoot: (currentPath: string) => string;
    },
  ) => RouteConfig;
  /** output template */
  template?: string;
  /** output template file path, it will instead `config.template` */
  templateFile?: string;
  /** Log tips when creation completed */
  successTips?: string;
  /** output path */
  output?: string | ((outputStr: string, templateStr: string) => void);
  /* modify routes before output */
  modifyRoutes?: (
    routes: Array<RouteConfig>,
    options: Omit<IConfig, 'modifyRoutes' | 'formatter' | 'filter'>,
  ) => Array<RouteConfig>;
}

const defaultPageRoot = join(process.cwd(), 'src/pages');

function run(config: IConfig = { pageRoot: defaultPageRoot }) {
  const { pageRoot = defaultPageRoot, watch = false } = config;

  if (!pageRoot || !existsSync(pageRoot)) {
    throw new Error('Invalid config.pageRoot: ' + pageRoot);
  }

  if (watch) {
    chokidar
      .watch(pageRoot, {
        ignored: /([\\/]node_modules[\\/]|[\\/]path[\\/]|[\\/]children[\\/]|[\\/]components[\\/])/,
      })
      .on('all', (/* eventName, filePath */) => {
        scanRoutesDebounce({ ...config });
      });
  } else {
    scanRoutes({ ...config });
  }
}

let scanTimer: Timeout;

function scanRoutesDebounce(config: IConfig) {
  clearTimeout(scanTimer);
  scanTimer = setTimeout(() => {
    scanRoutes(config);
  }, 200);
}

let lastConfig: string = '';

export function scanRoutes(config: IConfig = { pageRoot: defaultPageRoot }) {
  const {
    /** page root directory in your project */
    pageRoot = defaultPageRoot,
    /** The glob rules */
    files: patternFiles = ['*.js', '*.ts'],
    /** filter after all file was scanned */
    filter = () => true,
    /** ignore directories */
    ignore = ['**/components/**', '**/layouts/**'],
    /** format every routes node */
    formatter = (a: any) => a,
    /** output template */
    template = 'export default @routeConfig;',
    /** output template file, it will instead `config.template` */
    templateFile,
    /** output path */
    output,
    successTips = '[Success] Routes updated.',
    watch,
    modifyRoutes = (r) => r,
  } = config;

  const pattern = `**/?(${patternFiles.join('|')})`;
  /** scan all files you need */
  const found = glob
    .sync(pattern, {
      cwd: pageRoot,
      ignore: ['**/node_modules/**', ...ignore],
    })
    .filter(filter);

  /** routes tree root */
  const routeConfig: Array<RouteConfig> = [
    {
      path: '/',
      children: [],
      files: {},
    },
  ];

  /** create/find node by path group */
  const findParent = (pathGroup: Array<string> = []): RouteConfig => {
    let root = routeConfig[0];
    for (let i = 0; i < pathGroup.length; i += 1) {
      const p = pathGroup[i];
      if (!root.childCache) {
        root.childCache = {};
      }
      if (!root.childCache[p]) {
        root.childCache[p] = {
          path: p,
          children: [],
          files: {},
        };
        if (root.children) {
          root.children.push(root.childCache[p]);
        }
      }
      root = root.childCache[p];
    }
    return root;
  };

  /** check all files */
  found.forEach((filePath: string) => {
    const fileGroup = filePath.split('/');
    const fullFileName = fileGroup.pop();
    if (fullFileName) {
      const fileName = fullFileName.substr(0, fullFileName.lastIndexOf('.'));

      /* get the parent node */
      const parent = findParent(fileGroup);
      /* add your file path to node */
      if (parent.files) {
        parent.files[fileName] = filePath;
      }
    }
  });

  /** format every route node */
  function revRouter(routes: Array<RouteConfig>, parentPath: string = ''): Array<RouteConfig> {
    return routes.map(
      (route): RouteConfig => {
        const { children = [], files = {} } = route;
        let { path: p } = route;
        if (p === '@') {
          p = '/';
        }

        const tempChildren: Array<RouteConfig> = [];

        function pushChild(child: RouteConfig, order?: number): void {
          if (order == null) {
            tempChildren.push(child);
          } else if (order >= tempChildren.length) {
            tempChildren[order] = child;
          } else {
            tempChildren.splice(order, 0, child);
          }
        }

        function toScript(stringScript: string): string {
          return `script$${stringScript}$`;
        }

        function relativePageRoot(currentPath: string): string {
          return relative(currentPath, pageRoot);
        }

        const fullPath: string = parentPath === '/' || p === '/' ? `${parentPath}${p}` : `${parentPath}/${p}`;
        const newRoute = formatter(
          { path: p, fullPath, files, children },
          {
            pushChild,
            toScript,
            relativePageRoot,
          },
        );
        return {
          path: p,
          ...newRoute,
          children: [...tempChildren.filter((v) => v !== undefined), ...revRouter(children, fullPath)],
        };
      },
    );
  }

  // pick 
  const { filter: v1, formatter: v2, modifyRoutes: v3, ...callbackConfig } = config;

  const newRoutes: Array<RouteConfig> = modifyRoutes(revRouter(routeConfig), callbackConfig);

  const routesConfigStr: string = JSON.stringify(newRoutes, null, '  ').replace(/"script\$(.*)\$"/g, (arg1) => {
    // eslint-disable-next-line no-eval
    const str = eval(arg1);
    return str.substr(7, str.length - 8);
  });

  if ((!watch && typeof output === 'function') || lastConfig !== routesConfigStr) {
    lastConfig = routesConfigStr;

    let templateStr = template;
    if (templateFile) {
      try {
        templateStr = readFileSync(templateFile).toString();
      } catch (e) {
        console.error(e);
      }
    }

    const routeConfigCode = templateStr.replace(/@routeConfig/g, routesConfigStr);

    /** output routes config */
    if (typeof output === 'function') {
      output(routesConfigStr, templateStr);
    } else if (typeof output === 'string') {
      const headerTips = '/* Warn: Do not change this file!!! */\n';
      writeFileSync(output, headerTips + routeConfigCode);
    }

    if (successTips) {
      console.log(successTips);
    }
  } else {
    /** routes not changed */
  }
}

export default run;
