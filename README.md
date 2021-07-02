# routes-watcher

路由扫描工具，根据目录结构自动生成路由配置，用于实现约定式路由

## 何时使用

如果你希望在基于`webpack`构建的 web 项目中使用约定式路由的特性，你可以尝试`routes-watcher`。

如果你在使用`react`体系，那么可以尝试`routes-watcher`的`react-router`封装：[react-convention-routes](https://github.com/NicoKam/react-convention-router)

如果你已经在使用包含了约定式路由特性的框架(如：`umijs`, `nuxtjs`)，那么请不要考虑本工具。

## 结构定义

### FileObject

```typescript
type FileObject = {
  /** 相对 page 根目录的路径 */
  path: string;
  /** 文件名 */
  name: string;
  isFile: true;
  /** 文件后缀 */
  extname: string;
};
```

## 如何使用

本工具可以配合 webpack 插件的编写。或者你可以在启动 webpack 进程的同时，执行 scanRoutes。

```typescript
import scanRoutes from 'routes-watcher';

scanRoutes({
  /* 配置你的页面根目录 */
  pageRoot: 'path/to/your/pageRoot',
  /* 使用正则配置需要包含的目录或内容，支持单个 正则表达式 或 正则表达式数组 */
  includes: [],
  /* 使用正则排除内容，支持单个 正则表达式 或 正则表达式数组 */
  excludes: /\/(node_modules|components|services|layouts)\//,
  /* 进一步精确的对已扫描的内容进行过滤 */
  filter: (pageFile: FileObject) => {
    if (/[A-Z]/.test(pageFile.path)) {
      return false;
    }
    if (pageFile.path.includes('/.entry/')) {
      return false;
    }
    return true;
  },

  /* 自定义路由生成配置 */

  /** 标记可用的文件后缀 */
  extensions: new Set(['.js', '.jsx', '.ts', '.tsx', '.vue']),
  /** 标记 layout 文件 */
  isLayout: (obj: FileObject) => obj.name === '_layout',
  /** 根据文件信息 生成组件路径 */
  componentPath: (obj: FileObject) => '@/pages/' + obj.path,
  /** 根据页面文件信息 生成路由地址 */
  routePath: (obj: FileObject) => {
    const bName = basename(obj.path, obj.extname);
    let routePath = '';
    if (obj.name === '_layout' || obj.name === 'index') {
      routePath = dirname(obj.path);
    } else {
      routePath = slash(join(dirname(obj.path), bName));
    }
    return '/' + (routePath === '.' ? '' : routePath);
  },
  /* 自定义路由生成配置 end */

  /* 模板内容，工具会读取该模板内容，并替换其中的 @routeConfig 字符串为路由配置 */
  template: 'export default @routeConfig;',
  /**
   * 可选：模板文件
   * 你可以选择一个文件作为模板文件，工具会读取该模板文件的内容，并替换其中的 @routeConfig 字符串为路由配置
   * 注：如果存在templateFile配置且内容读取正确，则template配置无效。
   */
  templateFile: '../RouteConfig.js.template',
  /**
   * 配置输出 {string|Function}
   * 如果output为字符串类型，则代表路由配置文件输出的路径
   * 如果output为函数类型，则生成配置时会通过该函数触发
   */
  output: defaultOutputPath,
  /* 对路由做最后的修改 */
  modifyRoutes: (routes) => {
    return routes;
  },
  /* 路由扫描完成的提示信息 */
  successTips: '[Success] Routes updated.',
});
```

## Options

`scanRoutes(Options)`

- `pageRoot` `{string}` 页面根目录，会基于该目录扫描所有符合条件的文件
- `filter` `{(filePath: string) => boolean}` 进一步过滤所有扫描到的文件内容
- `template` `{string}` 模板内容，其中至少包含字符串`@routeConfig`，以便工具将其替换为路由配置。
- `templateFile` `{string}` 模板文件路径，指向一个文件按，工具会读取文件的内容，用作`template`使用，如果你配置了该属性，则原有的`template`属性失效。
- `successTips` `{string}` 路由扫描完成后输出的提示信息
- `modifyRoutes` `{(RouteConfig[], Options) => RouteConfig[]}` 再路由格式化完成后，如果还需要对路由进行修改，则可以通过该方法进行
- `output` `{string | (string) => void}` 输出配置， 如果 output 为字符串类型，则代表路由配置文件输出的路径， 如果 output 为函数类型，则生成配置时会调用该方法，并传入路由配置字符串信息
