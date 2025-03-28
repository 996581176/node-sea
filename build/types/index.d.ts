type Options = {
    disableExperimentalSEAWarning?: boolean;
    useSnapshot?: boolean;
    useCodeCache?: boolean;
    useSystemNode?: boolean;
    nodeVersion?: string;
    withIntl?: "none" | "full-icu" | "small-icu" | "system-icu";
    arch?: "x64";
    assets?: {
        [fileName: string]: string;
    };
    transpileOnly?: boolean;
    externals?: Array<any> | {
        [key: string]: string;
    };
};
export default function sea(script_entry_path: string, executable_path?: string, options?: Options): Promise<void>;
export {};
