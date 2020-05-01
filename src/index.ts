/* eslint-disable no-console */
import fs from "fs";
import path from "path";
import glob from "glob";
import chokidar from "chokidar";
import Timeout = NodeJS.Timeout;

export interface RouteConfig {
  /** routePath */
  path: string,
  /** route full path */
  fullPath?: string,
  /** file cache */
  files?: { [key: string]: string },
  exact?: boolean,
  children?: Array<RouteConfig>,
  component?: string,
  childCache?: { [key: string]: RouteConfig },
}

export interface IConfig {
  /** Path of your convention routes root. */
  pageRoot?: string,
  /** Use chokidar to watch pageRoot? */
  watch?: boolean,
  /** The file in the routes root you want to scanned (glob) */
  files?: Array<string>,
  /** Ignored path (glob) */
  ignore?: Array<string>,
  /**
   * Format every routes node
   * @param routeConfig
   * @param utils
   */
  formatter?: (routeConfig: RouteConfig, utils: {
    /**
     * Push routeConfig to children
     * @param child
     */
    pushChild: (child: RouteConfig) => void
    /**
     * Mark this string and replace it to real script
     * @param stringScript
     */
    toScript: (stringScript: string) => string
    /**
     * Find the path relative to page root
     * @param currentPath
     */
    relativePageRoot: (currentPath: string) => string
  }) => RouteConfig,
  /** output template */
  template?: string,
  /** output template file path, it will instead `config.template` */
  templateFile?: string,
  /** Log tips when creation completed */
  successTips?: string,
  /** output path */
  output?: string | ((outputStr: string) => void),
}

const defaultPageRoot = path.join(process.cwd(), "src/pages");

function run(config: IConfig = {pageRoot: defaultPageRoot}) {
  const {
    pageRoot = defaultPageRoot,
    watch = false,
    ...otherConfig
  } = config;

  if (!pageRoot || !fs.existsSync(pageRoot)) {
    throw new Error("Invalid config.pageRoot: " + pageRoot);
  }

  if (watch) {
    chokidar.watch(pageRoot, {
      ignored: /([\\/]node_modules[\\/]|[\\/]path[\\/]|[\\/]children[\\/]|[\\/]components[\\/])/,
    }).on("all", (/* eventName, filePath */) => {
      scanRoutesDebounce({pageRoot, ...otherConfig});
    });
  } else {
    scanRoutes({pageRoot, ...otherConfig});
  }
}

let scanTimer: Timeout;

function scanRoutesDebounce(config: IConfig) {
  clearTimeout(scanTimer);
  scanTimer = setTimeout(() => {
    scanRoutes(config);
  }, 200);
}

let lastConfig: string = "";

export function scanRoutes(config: IConfig = {pageRoot: defaultPageRoot}) {
  const {
    /** page root directory in your project */
    pageRoot = defaultPageRoot,
    files: patternFiles = ["*.js", "*.ts"],
    /** ignore directories */
    ignore = ["**/components/**", "**/layouts/**"],
    /** format every routes node */
    formatter = (a: any) => a,
    /** output template */
    template = "export default @routeConfig;",
    /** output template file, it will instead `config.template` */
    templateFile,
    /** output path */
    output,
    successTips = "[Success] Routes updated.",
  } = config;


  const pattern = `**/?(${patternFiles.join("|")})`;
  /** scan all files you need */
  const found = glob.sync(pattern, {
    cwd: pageRoot,
    ignore: ["**/node_modules/**", ...ignore],
  });

  /** routes tree root */
  const routeConfig: Array<RouteConfig> = [
    {
      path: "/",
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
      if (root.childCache[p] != null) {
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
    const fileGroup = filePath.split("/");
    const fullFileName = fileGroup.pop();
    if (fullFileName) {
      const fileName = fullFileName.substr(0, fullFileName.lastIndexOf("."));

      /* get the parent node */
      const parent = findParent(fileGroup);
      /* add your file path to node */
      if (parent.files) {
        parent.files[fileName] = filePath;
      }
    }
  });

  /** format every route node */
  function revRouter(routes: Array<RouteConfig>, parentPath: string = ""): Array<RouteConfig> {
    return routes.map((route): RouteConfig => {
      const {children = [], files = {}} = route;
      let {path: p} = route;
      if (p === "@") {
        p = "/";
      }

      const tempChildren: Array<RouteConfig> = [];

      function pushChild(child: RouteConfig): void {
        tempChildren.push(child);
      }

      function toScript(stringScript: string): string {
        return `script$${stringScript}$`;
      }

      function relativePageRoot(currentPath: string): string {
        return path.relative(currentPath, pageRoot);
      }

      const fullPath: string = (parentPath === "/" || p === "/") ? `${parentPath}${p}` : `${parentPath}/${p}`;
      const newRoute = formatter({path: p, fullPath, files}, {
        pushChild,
        toScript,
        relativePageRoot,
      });
      return {
        path: p,
        ...newRoute,
        children: [...tempChildren, ...revRouter(children, fullPath)],
      };
    });
  }

  const newRoutes: Array<RouteConfig> = revRouter(routeConfig);

  const routesConfigStr: string = JSON.stringify(newRoutes, null, "  ").replace(/"script\$(.*)\$"/g, (arg1) => {
    // eslint-disable-next-line no-eval
    const str = eval(arg1);
    return str.substr(7, str.length - 8);
  });
  if (lastConfig !== routesConfigStr) {
    lastConfig = routesConfigStr;

    /** output routes config */
    if (typeof output === "function") {
      output(routesConfigStr);
    } else if (typeof output === "string") {
      let templateStr = template;
      if (templateFile) {
        try {
          templateStr = fs.readFileSync(templateFile).toString();
        } catch (e) {
          console.error(e);
        }
      }

      const routeConfigCode = templateStr
        .replace(/@routeConfig/g, routesConfigStr);

      const headerTips = "/* Warn: Do not change this file!!! */\n";

      fs.writeFileSync(output, headerTips + routeConfigCode);
    }

    if (successTips) {
      console.log(successTips);
    }

  } else {
    /** routes not changed */
  }
}


export default run;
