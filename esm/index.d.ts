export interface RouteConfig {
    /** routePath */
    path: string;
    /** route full path */
    fullPath?: string;
    /** file cache */
    files?: {
        [key: string]: string;
    };
    exact?: boolean;
    children?: Array<RouteConfig>;
    component?: string;
    childCache?: {
        [key: string]: RouteConfig;
    };
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
    formatter?: (routeConfig: RouteConfig, utils: {
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
    }) => RouteConfig;
    /** output template */
    template?: string;
    /** output template file path, it will instead `config.template` */
    templateFile?: string;
    /** Log tips when creation completed */
    successTips?: string;
    /** output path */
    output?: string | ((outputStr: string, templateStr: string) => void);
    modifyRoutes?: (routes: Array<RouteConfig>, options: Omit<IConfig, 'modifyRoutes' | 'formatter' | 'filter'>) => Array<RouteConfig>;
}
declare function run(config?: IConfig): void;
export declare function scanRoutes(config?: IConfig): void;
export default run;
