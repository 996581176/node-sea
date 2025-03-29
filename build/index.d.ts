type Options = {
    /** 关闭实验性警告。默认为 `true` */
    disableExperimentalSEAWarning?: boolean;
    /**启动快照支持。默认为 `false`，生成跨平台 SEA 时必须为 `false`。
     *
     * 当 useSnapshot 为 `true` 时，主脚本必须调用 `v8.startupSnapshot.setDeserializeMainFunction()` API 来配置用户启动最终可执行文件时需要运行的代码
     */
    useSnapshot?: boolean;
    /**V8 代码缓存支持。默认为 `false`，生成跨平台 SEA 时必须为 `false`。
     *
     * 注意：当 useCodeCache 为 true 时，动态导入 `import()` 不起作用。
     * */
    useCodeCache?: boolean;
    /** 是否使用本地的node，默认为 `true`
     *
     * 如不使用本地的node则去 https://github.com/liudonghua123/node-sea/releases 页面根据 `platform`、`arch`、`nodeVersion`、`withIntl` 参数查找下载
     * */
    useSystemNode?: boolean;
    /** 要下载的 node 版本，默认为 `v20.11.0` */
    nodeVersion?: string;
    /**node国际化版本，默认为 `small-icu`。
     * @see https://nodejs.cn/api/intl.html#options-for-building-nodejs
     */
    withIntl?: "none" | "full-icu" | "small-icu" | "system-icu";
    /** node 架构，默认为 `x64` */
    arch?: "x64";
    /**资源文件
     * @see https://nodejs.cn/api/single-executable-applications.html#资源
     */
    assets?: {
        [fileName: string]: string;
    };
    /** ts文件仅转译，不进行检查。默认为 `false` */
    transpileOnly?: boolean;
    /**外部依赖
     * @see https://webpack.js.org/configuration/externals/#root
     */
    externals?: Array<any> | {
        [key: string]: string;
    };
};
export default function sea(
/** 入口文件路径（包括入口文件名及扩展名） */
script_entry_path: string, 
/** 输出可执行文件路径（包括文件名及扩展名）。默认输出目录为 script_entry_path 目录下的 `dist` 文件夹，没有则会新建 `dist` 文件夹 */
executable_path?: string, options?: Options): Promise<void>;
export {};
