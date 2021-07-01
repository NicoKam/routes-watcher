var __rest = (this && this.__rest) || function (s, e) {
    var t = {};
    for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p) && e.indexOf(p) < 0)
        t[p] = s[p];
    if (s != null && typeof Object.getOwnPropertySymbols === "function")
        for (var i = 0, p = Object.getOwnPropertySymbols(s); i < p.length; i++) {
            if (e.indexOf(p[i]) < 0 && Object.prototype.propertyIsEnumerable.call(s, p[i]))
                t[p[i]] = s[p[i]];
        }
    return t;
};
import { existsSync, readFileSync, writeFileSync } from 'fs';
import { join, relative } from 'path';
import glob from 'glob';
import chokidar from 'chokidar';
const defaultPageRoot = join(process.cwd(), 'src/pages');
function run(config = { pageRoot: defaultPageRoot }) {
    const { pageRoot = defaultPageRoot, watch = false } = config;
    if (!pageRoot || !existsSync(pageRoot)) {
        throw new Error('Invalid config.pageRoot: ' + pageRoot);
    }
    if (watch) {
        chokidar
            .watch(pageRoot, {
            ignored: /([\\/]node_modules[\\/]|[\\/]path[\\/]|[\\/]children[\\/]|[\\/]components[\\/])/,
        })
            .on('all', ( /* eventName, filePath */) => {
            scanRoutesDebounce(Object.assign({}, config));
        });
    }
    else {
        scanRoutes(Object.assign({}, config));
    }
}
let scanTimer;
function scanRoutesDebounce(config) {
    clearTimeout(scanTimer);
    scanTimer = setTimeout(() => {
        scanRoutes(config);
    }, 200);
}
let lastConfig = '';
export function scanRoutes(config = { pageRoot: defaultPageRoot }) {
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
    formatter = (a) => a, 
    /** output template */
    template = 'export default @routeConfig;', 
    /** output template file, it will instead `config.template` */
    templateFile, 
    /** output path */
    output, successTips = '[Success] Routes updated.', watch, modifyRoutes = (r) => r, } = config;
    const pattern = `**/?(${patternFiles.join('|')})`;
    /** scan all files you need */
    const found = glob
        .sync(pattern, {
        cwd: pageRoot,
        ignore: ['**/node_modules/**', ...ignore],
    })
        .filter(filter);
    /** routes tree root */
    const routeConfig = [
        {
            path: '/',
            children: [],
            files: {},
        },
    ];
    /** create/find node by path group */
    const findParent = (pathGroup = []) => {
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
    found.forEach((filePath) => {
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
    function revRouter(routes, parentPath = '') {
        return routes.map((route) => {
            const { children = [], files = {} } = route;
            let { path: p } = route;
            if (p === '@') {
                p = '/';
            }
            const tempChildren = [];
            function pushChild(child, order) {
                if (order == null) {
                    tempChildren.push(child);
                }
                else if (order >= tempChildren.length) {
                    tempChildren[order] = child;
                }
                else {
                    tempChildren.splice(order, 0, child);
                }
            }
            function toScript(stringScript) {
                return `script$${stringScript}$`;
            }
            function relativePageRoot(currentPath) {
                return relative(currentPath, pageRoot);
            }
            const fullPath = parentPath === '/' || p === '/' ? `${parentPath}${p}` : `${parentPath}/${p}`;
            const newRoute = formatter({ path: p, fullPath, files, children }, {
                pushChild,
                toScript,
                relativePageRoot,
            });
            return Object.assign(Object.assign({ path: p }, newRoute), { children: [...tempChildren.filter((v) => v !== undefined), ...revRouter(children, fullPath)] });
        });
    }
    // pick 
    const { filter: v1, formatter: v2, modifyRoutes: v3 } = config, callbackConfig = __rest(config, ["filter", "formatter", "modifyRoutes"]);
    const newRoutes = modifyRoutes(revRouter(routeConfig), callbackConfig);
    const routesConfigStr = JSON.stringify(newRoutes, null, '  ').replace(/"script\$(.*)\$"/g, (arg1) => {
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
            }
            catch (e) {
                console.error(e);
            }
        }
        const routeConfigCode = templateStr.replace(/@routeConfig/g, routesConfigStr);
        /** output routes config */
        if (typeof output === 'function') {
            output(routesConfigStr, templateStr);
        }
        else if (typeof output === 'string') {
            const headerTips = '/* Warn: Do not change this file!!! */\n';
            writeFileSync(output, headerTips + routeConfigCode);
        }
        if (successTips) {
            console.log(successTips);
        }
    }
    else {
        /** routes not changed */
    }
}
export default run;
