# routes-watcher

路由扫描工具，根据目录结构自动生成路由配置，用于实现约定式路由

## 何时使用

如果你希望在基于`webpack`构建的 web 项目中使用约定式路由的特性，你可以尝试`routes-watcher`。

如果你在使用`react`体系，那么可以尝试`routes-watcher`的`react-router`封装：[react-convention-routes](https://github.com/NicoKam/react-convention-router)

如果你已经在使用包含了约定式路由特性的框架(如：`umijs`, `nuxtjs`)，那么请不要考虑本工具。

## 如何使用

本工具可以配合 webpack 插件的编写。或者你可以在启动 webpack 进程的同时，执行 scanRoutes。

```javascript
import scanRoutes from 'routes-watcher';

scanRoutes({
  /* 配置你的页面根目录 */
  pageRoot: 'path/to/your/pageRoot',
  /* 配置忽略的匹配规则 */
  ignore: ['**/components/**', '**/layouts/**'],
  /* 配置需要扫描的文件内容(glob)，可以是*.js */
  files: ['index.js', 'index.ts', 'index.tsx', '_layout.js', '_layout.ts', '_layout.jsx', '_layout.tsx'],
  /* 进一步精确的对已扫描的内容进行过滤 */
  filter: (routePath) => {
    if (/[A-Z]/.test(routePath)) {
      return false;
    }
    if (routePath.includes('/.entry/')) {
      return false;
    }
    return true;
  },
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
  /* 是否监听路由变化，当watch为false时，只生成一次路由 */
  watch: true,
  /* 路由格式化，这里能够自顶向下处理每一个扫描到的路由信息 */
  formatter: (route, utils) => {
    
  },
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
- `files` `{string[]}` 扫描文件的匹配规则(glob)
- `ignore` `{string[]}` 扫描文件的忽略规则(glob)
- `filter` `{(filePath: string) => boolean}` 进一步过滤所有扫描到的文件内容
- `formatter` `{(route: RouteConfig, Utils) => RouteConfig}` 对路由(目录)信息进行自定义处理
  - `RouteConfig.path` `{string}` 当前路由(目录)名称
  - `RouteConfig.fullPath` `{string}` 从根目录到当前目录的完成路径
  - `RouteConfig.files` `{{[string]: string}}` 当前目录中匹配到的文件内容(以key-value记录)，其中key为无后缀文件名，value为从根目录到文件的路径。如：`{ index: 'home/index.js', _layout: 'home/_layout.tsx' }`
  - `RouteConfig.children` `{RouteConfig[]}` 子目录的路由信息（但不建议对`children`进行直接修改，因为自顶向下遍历，你会在之后访问到该子节点。一般用于获取子节点数量。
  - `Utils.pushChild` `{(RouteConfig) => void}` 向子目录添加一个路由配置（该配置不会参与到后续的遍历）
  - `Utils.toScript` `{(string) => string}` 为字符串添加标记，在生成路由配置时，该字符串将作为代码而不是字符串(通过JSON.stringify生成的内容，都会被视为一个字符串，而无法被执行)
  - `Utils.relativePageRoot` `{(string) => string}` 获得一个到根目录的相对路径，比如你需要自定义outputPath，那么你就可以计算outputPath到pageRoot再到页面的相对路径。
- `template` `{string}` 模板内容，其中至少包含字符串`@routeConfig`，以便工具将其替换为路由配置。
- `templateFile` `{string}` 模板文件路径，指向一个文件按，工具会读取文件的内容，用作`template`使用，如果你配置了该属性，则原有的`template`属性失效。
- `successTips` `{string}` 路由扫描完成后输出的提示信息
- `modifyRoutes` `{(RouteConfig[]) => RouteConfig[]}` 再路由格式化完成后，如果还需要对路由进行修改，则可以通过该方法进行
- `output` `{string | (string) => void}` 输出配置， 如果output为字符串类型，则代表路由配置文件输出的路径， 如果output为函数类型，则生成配置时会调用该方法，并传入路由配置字符串信息
