import { stat } from "fs/promises";
import ora from "ora";
import { homedir } from "os";
import { mkdir, writeFile, chmod } from "fs/promises";
import { join } from "path";
import debug from "debug";
import ncc from "@vercel/ncc";
const log = debug("sea");
export async function is_file_exists(path) {
    try {
        return (await stat(path)).isFile();
    }
    catch (e) {
        return false;
    }
}
export async function is_directory_exists(path) {
    try {
        return (await stat(path)).isDirectory();
    }
    catch (e) {
        return false;
    }
}
export async function spinner_log(message, callback) {
    const spinner = ora(message).start();
    try {
        const result = await callback();
        spinner.succeed();
        return result;
    }
    catch (e) {
        spinner.fail();
        throw e;
    }
}
export async function get_node_executable({ useSystemNode, nodeVersion, arch, withIntl, } = {
    useSystemNode: true,
    nodeVersion: "v20.11.0",
    arch: "x64",
    withIntl: "small-icu",
}) {
    if (useSystemNode) {
        return process.execPath;
    }
    const platform_mapping = {
        win32: "windows",
        linux: "linux",
        darwin: "macos",
    };
    const cache_directory = join(homedir(), ".node-sea");
    if (!(await is_directory_exists(cache_directory))) {
        await mkdir(cache_directory, { recursive: true });
    }
    const node_executable_filename = `node-${platform_mapping[process.platform]}-${arch}-v${nodeVersion}-with-intl-${withIntl}${process.platform === "win32" ? ".exe" : ""}`;
    const expected_node_executable_path = join(cache_directory, node_executable_filename);
    if (await is_file_exists(expected_node_executable_path)) {
        log(`找到缓存的节点可执行文件，在 ${expected_node_executable_path}`);
        return expected_node_executable_path;
    }
    log(`从 github release 或指定的镜像 url 下载节点可执行文件`);
    const download_url_prefix = process.env["NODE_SEA_NODE_MIRROR_URL"] ??
        `https://github.com/liudonghua123/node-sea/releases/download/node/`;
    try {
        const download_spinner = ora(`[ 0.00%] 下载 node 可执行文件 ...`).start();
        log(`尝试从 ${`${download_url_prefix}${node_executable_filename}`} 下载文件`);
        const response = await fetch(`${download_url_prefix}${node_executable_filename}`);
        const content_length = +(response.headers.get("Content-Length") ?? 0);
        const reader = response.body?.getReader();
        if (!reader) {
            throw new Error(`Failed to get reader from response body`);
        }
        let received_length = 0;
        let chunks = [];
        while (true) {
            const { done, value } = await reader.read();
            if (done) {
                break;
            }
            chunks.push(value);
            received_length += value.length;
            download_spinner.text = `[${((received_length / content_length) * 100).toFixed(2)}%] Downloading node executable ...`;
        }
        download_spinner.succeed(`[100.00%] Download node executable completed!`);
        let chunks_all = new Uint8Array(received_length);
        let position = 0;
        for (let chunk of chunks) {
            chunks_all.set(chunk, position);
            position += chunk.length;
        }
        await writeFile(expected_node_executable_path, chunks_all);
        await chmod(expected_node_executable_path, 0o755);
        return expected_node_executable_path;
    }
    catch (error) {
        throw new Error(`Failed to download node executable from ${download_url_prefix}${node_executable_filename}`);
    }
}
export async function nccPack(script_entry_path, options) {
    const { temp_dir, transpileOnly = false, externals = [] } = options;
    try {
        const outputFilePath = `${temp_dir}\\index.js`;
        const { code } = await ncc(script_entry_path, {
            cache: false,
            minify: true,
            target: "es2024",
            quiet: true,
            esm: false,
            transpileOnly,
            externals,
        });
        await spinner_log(`执行 ncc 打包，输出 ncc 打包文件到 ${outputFilePath}`, async () => {
            await writeFile(outputFilePath, code);
        });
        return outputFilePath;
    }
    catch (error) {
        throw error;
    }
}
