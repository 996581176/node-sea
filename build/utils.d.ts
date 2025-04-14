/** Check if file exists */
export declare function is_file_exists(path: string): Promise<boolean>;
/** Check if directory exists */
export declare function is_directory_exists(path: string): Promise<boolean>;
/** Show spinner while running async_callback */
export declare function spinner_log(message: string, callback: () => Promise<any>): Promise<any>;
type Options = {
    /** 临时文件存放目录 */
    temp_dir: string;
    /** ts文件仅转译，不进行检查。默认为 `false` */
    transpileOnly?: boolean;
};
/** 打包ts/js到单文件 */
export declare function nccPack(
/** 入口文件路径（包括入口文件名及扩展名） */
script_entry_path: string, options: Options): Promise<string>;
/**获取指定平台 x64 node
 * @param useSystemNode node 版本号 如 `23.9.0`
 * @param nodeVersion node 版本号 如 `23.9.0`
 * @param target 目标平台
 * @param temp_dir node存放的目录
 * @param arch 架构
 * @param mirrorUrl 镜像下载地址 如：https://registry.npmmirror.com/-/binary/node/
 */
export declare function get_node_executable(
/** 临时文件存放目录 */
temp_dir: string, 
/** 是否使用本地的node，默认为 `true` */
useSystemNode?: boolean, 
/** 要下载的 node 版本，默认为 `22.14.0` */
nodeVersion?: string, 
/** 目标平台，默认为当前平台 */
target?: "win" | "darwin" | "linux", 
/** node 架构，默认为 `x64` */
arch?: "x64" | "arm64", 
/** node 镜像下载地址 如：https://registry.npmmirror.com/-/binary/node/ */
mirrorUrl?: string): Promise<string>;
/**对使用ESM脚本的 `import.meta.dirname` 和 `import.meta.filename` 进行处理
 * @param script_entry_path 入口文件路径（包括入口文件名及扩展名）
 */
export declare function handleImportMeta(script_entry_path: string): Promise<void>;
export {};
