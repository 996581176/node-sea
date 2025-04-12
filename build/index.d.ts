type Options = {
    /** 输出可执行文件路径（包括文件名及扩展名）。默认输出目录为 script_entry_path 目录下的 `dist` 文件夹，没有则会新建 `dist` 文件夹 */
    executable_path?: string;
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
     * 如不使用本地的 node 则去 node 官方或者提供的镜像地址根据 `nodeVersion`、`arch`、`target` 参数查找下载
     * */
    useSystemNode?: boolean;
    /** 要下载的 node 版本，默认为 `22.14.0` */
    nodeVersion?: string;
    /** node 架构，默认为 `x64` */
    arch?: "x64" | "arm64";
    /** 目标平台，默认为当前平台 */
    target?: "win" | "darwin" | "linux";
    /**资源文件
     * @see https://nodejs.cn/api/single-executable-applications.html#资源
     */
    assets?: {
        [fileName: string]: string;
    };
    /** ts文件仅转译，不进行检查。默认为 `false` */
    transpileOnly?: boolean;
    /** node 镜像下载地址 如：https://registry.npmmirror.com/-/binary/node/ */
    mirrorUrl?: string;
};
export default function sea(
/** 入口文件路径（包括入口文件名及扩展名） */
script_entry_path: string, options?: Options): Promise<void>;
export {};
