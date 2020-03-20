/* eslint-disable no-console */
const fs = require("fs");
const path = require("path");
const glob = require("glob");
const chokidar = require("chokidar");

function run(config = {}) {
  const {
    pageRoot = path.join(process.cwd(), "src/pages"),
    watch = false,
    ...otherConfig
  } = config;

  if (!pageRoot || !fs.existsSync(pageRoot)) {
    throw new Error("Invalid config.pageRoot.");
  }

  if (watch) {
    chokidar.watch(pageRoot, {
      ignored: /([\\/]node_modules[\\/]|[\\/]path[\\/]|[\\/]children[\\/]|[\\/]components[\\/])/,
    }).on("all", (/* eventName, filePath */) => {
      scanRoutesDebounce({ pageRoot, ...otherConfig });
    });
  } else {
    scanRoutes({ pageRoot, ...otherConfig });
  }
}

let scanTimer = null;

function scanRoutesDebounce(config) {
  clearTimeout(scanTimer);
  scanTimer = setTimeout(() => {
    scanRoutes(config);
  }, 200);
}

let lastConfig = "";

function scanRoutes(config = {}) {
  const {
    /* page root directory in your project */
    pageRoot,
    /* the file of page index */
    files: patternFiles = ["*.js"],
    /* ignore directories */
    ignore = ["**/components/**", "**/layouts/**"],
    /* format every routes node */
    formatter = a => a,
    /* output template */
    template = "export default @routeConfig;",
    /* output template file, it will instead `config.template` */
    templateFile,
    /* output path */
    output,
    successTips = "[Success] Routes updated.",
  } = config;


  const pattern = `**/?(${patternFiles.join("|")})`;
  /* scan all files you need */
  const found = glob.sync(pattern, {
    cwd: pageRoot,
    ignore: ["**/node_modules/**", "**/path/**", "**/children/**", ...ignore],
  });

  /* routes tree root */
  const routeConfig = [
    {
      path: "/",
      children: [],
      files: {},
    },
  ];

  /* create/find node by path group */
  const findParent = (pathGroup = []) => {
    let root = routeConfig[0];
    for (let i = 0; i < pathGroup.length; i += 1) {
      const p = pathGroup[i];
      if (!root.children[p]) {
        root.children[p] = {
          path: p,
          children: [],
          files: {},
        };
        root.children.push(root.children[p]);
      }
      root = root.children[p];
    }
    return root;
  };

  /* check all files */
  found.forEach((filePath) => {
    const fileGroup = filePath.split("/");
    const fileName = fileGroup.pop();

    /* get the parent node */
    const parent = findParent(fileGroup);
    /* add your file path to node */
    parent.files[fileName] = filePath;
  });

  /* format every route node */
  function revRouter(routes, parentPath = "") {
    return routes.map((route) => {
      const { children = [], files = {} } = route;
      let { path: p } = route;
      if (p === "@") {
        p = "/";
      }

      const tempChildren = [];

      function pushChild(child) {
        tempChildren.push(child);
      }

      /* mark this string and replace it to real script */
      function toScript(stringScript) {
        return `script$${stringScript}$`;
      }

      /* find the path relative to page root */
      function relativePageRoot(currentPath) {
        return path.relative(currentPath, pageRoot);
      }

      const fullPath = (parentPath === "/" || p === "/") ? `${parentPath}${p}` : `${parentPath}/${p}`;
      const newRoute = formatter({ path: p, fullPath, files }, {
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

  const newRoute = revRouter(routeConfig);

  const routesConfigStr = JSON.stringify(newRoute, null, "  ").replace(/"script\$(.*)\$"/g, (arg1) => {
    // eslint-disable-next-line no-eval
    const str = eval(arg1);
    return str.substr(7, str.length - 8);
  });
  if (lastConfig !== routesConfigStr) {
    lastConfig = routesConfigStr;

    /* output routes config */
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
    /* routes not changed */
  }
}


export default run;
