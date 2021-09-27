import chokidar, { WatchOptions } from 'chokidar';
import { existsSync, readFileSync, writeFileSync } from 'fs';
import { join } from 'path';
import { RouteConfig } from './defs';
import scanDir, { ScanDirOptions } from './scanDir';
import toRoute, { ToRouteOptions } from './toRoute';

export interface IConfig {
  /** Path of your convention routes root. */
  pageRoot?: string;
  /** filter after all file was scanned */
  filter?: ToRouteOptions['filter'];
  componentPath?: ToRouteOptions['componentPath'];
  extensions?: ToRouteOptions['extensions'];
  isLayout?: ToRouteOptions['isLayout'];
  routePath?: ToRouteOptions['routePath'];
  childrenKey?: ToRouteOptions['childrenKey'];
  /** Regexp to match file fullpath */
  includes?: ScanDirOptions['includes'];
  /** Regexp to ignore file fullpath */
  excludes?: ScanDirOptions['excludes'];
  /** output template */
  template?: string;
  /** output template file path, it will instead `config.template` */
  templateFile?: string;
  /** Log tips when creation completed */
  successTips?: string;
  /** output path */
  output?: string | ((outputStr: string, templateStr: string) => void);
  /** modify routes finally */
  modifyRoutes?: (routes: RouteConfig[]) => any;
}

const defaultPageRoot = join(process.cwd(), 'src/pages');

export default function watchDir(config: IConfig & { watchOptions?: WatchOptions }) {
  const { pageRoot = defaultPageRoot, watchOptions } = config;

  if (!pageRoot || !existsSync(pageRoot)) {
    throw new Error('Invalid config.pageRoot: ' + pageRoot);
  }

  chokidar
    .watch(pageRoot, {
      ignored: /([\\/]node_modules[\\/]|[\\/]path[\\/]|[\\/]children[\\/]|[\\/]components[\\/])/,
      ...watchOptions,
    })
    .on('all', (/* eventName, filePath */) => {
      scanRoutesDebounce({ ...config });
    });
}

let scanTimer: NodeJS.Timeout;

function scanRoutesDebounce(config: IConfig) {
  clearTimeout(scanTimer);
  scanTimer = setTimeout(() => {
    scanRoutes(config);
  }, 200);
}

let lastRoutesStr: string = '';

export async function scanRoutes(config: IConfig): Promise<RouteConfig[]> {
  const {
    /** page root directory in your project */
    pageRoot = defaultPageRoot,
    includes,
    excludes,
    /** output template */
    template = 'export default @routeConfig;',
    /** output template file, it will instead `config.template` */
    templateFile,
    /** output path */
    output,
    successTips = '[Success] Routes updated.',
    modifyRoutes = (v) => v,
    // other toRoute options
    ...toRouteOptions
  } = config;

  // Scan and build directory tree
  const dirTree = await scanDir(pageRoot, {
    includes,
    excludes,
  });

  // build routes
  let routes = await toRoute(dirTree, toRouteOptions);
  routes = modifyRoutes(routes);

  const routesStringify: string = JSON.stringify(routes, null, 2).replace(/"script\$(.*)\$"/g, (arg1) => {
    // eslint-disable-next-line no-eval
    const str = eval(arg1);
    return str.substr(7, str.length - 8);
  });

  if (typeof output === 'function' || lastRoutesStr !== routesStringify) {
    lastRoutesStr = routesStringify;

    let templateStr = template;
    if (templateFile) {
      try {
        templateStr = readFileSync(templateFile).toString();
      } catch (e) {
        console.error(e);
      }
    }

    const routeConfigCode = templateStr.replace(/@routeConfig/g, routesStringify);

    /** output routes config */
    if (typeof output === 'function') {
      output(routesStringify, templateStr);
    } else if (typeof output === 'string') {
      const headerTips = '/* Warn: Do not change this file!!! */\n';
      writeFileSync(output, headerTips + routeConfigCode);
    }

    if (successTips) {
      console.log(successTips);
    }
  }
  return routes;
}
