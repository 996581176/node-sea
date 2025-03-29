export declare function is_file_exists(path: string): Promise<boolean>;
export declare function is_directory_exists(path: string): Promise<boolean>;
export declare function spinner_log(message: string, callback: () => Promise<any>): Promise<any>;
export declare function get_node_executable({ useSystemNode, nodeVersion, arch, withIntl, }?: {
    useSystemNode?: boolean;
    nodeVersion?: string;
    withIntl?: "none" | "full-icu" | "small-icu" | "system-icu";
    arch?: "x64";
}): Promise<string>;
type Options = {
    temp_dir: string;
    transpileOnly?: boolean;
    externals?: Array<any> | {
        [key: string]: string;
    };
};
export declare function nccPack(script_entry_path: string, options: Options): Promise<string>;
export {};
