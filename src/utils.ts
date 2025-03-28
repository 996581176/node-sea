import { stat } from "fs/promises";
import ora from "ora";
import { homedir } from "os";
import { mkdir, writeFile, chmod } from "fs/promises";
import { join } from "path";
import debug from "debug";
// @ts-ignore
import ncc from "@vercel/ncc";

const log = debug("sea");

/** Check if file exists */
export async function is_file_exists(path: string) {
  try {
    return (await stat(path)).isFile();
  } catch (e) {
    return false;
  }
}

/** Check if directory exists */
export async function is_directory_exists(path: string) {
  try {
    return (await stat(path)).isDirectory();
  } catch (e) {
    return false;
  }
}

/** Show spinner while running async_callback */
export async function spinner_log(message: string, callback: () => Promise<any>) {
  const spinner = ora(message).start();
  try {
    const result = await callback();
    spinner.succeed();
    return result;
  } catch (e) {
    spinner.fail();
    throw e;
  }
}

/** Get node executable path */
export async function get_node_executable(
  {
    useSystemNode,
    nodeVersion,
    arch,
    withIntl,
  }: {
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
  } = {
    useSystemNode: true,
    nodeVersion: "v20.11.0",
    arch: "x64",
    withIntl: "small-icu",
  }
): Promise<string> {
  if (useSystemNode) {
    return process.execPath;
  }
  const platform_mapping = {
    win32: "windows",
    linux: "linux",
    darwin: "macos",
  };
  // check if the node_executable exists in the local cache directory in ~/.node-sea
  const cache_directory = join(homedir(), ".node-sea");
  if (!(await is_directory_exists(cache_directory))) {
    await mkdir(cache_directory, { recursive: true });
  }
  // node-${{ matrix.platform }}-${{ matrix.arch }}-${{ github.event.inputs.node_tag }}-with-intl-${{ matrix.with-intl }}
  const node_executable_filename = `node-${
    platform_mapping[process.platform as keyof typeof platform_mapping]
  }-${arch}-v${nodeVersion}-with-intl-${withIntl}${process.platform === "win32" ? ".exe" : ""}`;
  const expected_node_executable_path = join(cache_directory, node_executable_filename);
  if (await is_file_exists(expected_node_executable_path)) {
    log(`找到缓存的节点可执行文件，在 ${expected_node_executable_path}`);
    return expected_node_executable_path;
  }
  log(`从 github release 或指定的镜像 url 下载节点可执行文件`);
  // download the node executable from github release or specified mirror url named NODE_SEA_NODE_MIRROR_URL
  const download_url_prefix =
    process.env["NODE_SEA_NODE_MIRROR_URL"] ??
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
      download_spinner.text = `[${((received_length / content_length) * 100).toFixed(
        2
      )}%] Downloading node executable ...`;
    }
    download_spinner.succeed(`[100.00%] Download node executable completed!`);
    let chunks_all = new Uint8Array(received_length); // (4.1)
    let position = 0;
    for (let chunk of chunks) {
      chunks_all.set(chunk, position); // (4.2)
      position += chunk.length;
    }
    await writeFile(expected_node_executable_path, chunks_all);
    await chmod(expected_node_executable_path, 0o755);
    return expected_node_executable_path;
  } catch (error) {
    throw new Error(
      `Failed to download node executable from ${download_url_prefix}${node_executable_filename}`
    );
  }
}

type Options = {
  /** 临时文件存放目录 */
  temp_dir: string;
  /** ts文件仅转译，不进行检查。默认为 `false` */
  transpileOnly?: boolean;
  /**外部依赖
   * @see https://webpack.js.org/configuration/externals/#root
   */
  externals?: Array<any> | { [key: string]: string };
};

/** 打包ts/js到单文件 */
export async function nccPack(
  /** 入口文件路径（包括入口文件名及扩展名） */
  script_entry_path: string,
  options: Options
) {
  const { temp_dir, transpileOnly = false, externals = [] } = options;
  // 为ncc提供配置支持
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
  } catch (error) {
    throw error;
  }
}
