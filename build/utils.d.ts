/** Check if file exists */
export declare function is_file_exists(path: string): Promise<boolean>;
/** Check if directory exists */
export declare function is_directory_exists(path: string): Promise<boolean>;
/** Show spinner while running async_callback */
export declare function spinner_log(message: string, callback: () => Promise<any>): Promise<any>;
/** Get node executable path */
export declare function get_node_executable({ useSystemNode, nodeVersion, arch, withIntl, }?: {
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
}): Promise<string>;
type Options = {
    /** 临时文件存放目录 */
    temp_dir: string;
    /** ts文件仅转译，不进行检查。默认为 `false` */
    transpileOnly?: boolean;
    /**外部依赖
     * @see https://webpack.js.org/configuration/externals/#root
     */
    externals?: Array<any> | {
        [key: string]: string;
    };
};
/** 打包ts/js到单文件 */
export declare function nccPack(
/** 入口文件路径（包括入口文件名及扩展名） */
script_entry_path: string, options: Options): Promise<string>;
export {};
