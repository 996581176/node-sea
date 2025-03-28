import { stat } from "fs/promises";
import ora from "ora";
import { homedir } from "os";
import { mkdir, writeFile, chmod } from "fs/promises";
import { dirname, join } from "path";
import debug from "debug";import { find } from "new-find-package-json";
import editJsonFile from "edit-json-file";
import ncc from "@vercel/ncc";

const log = debug("sea");

/**
 * Check if file exists
 * @param {string} path
 * @returns
 */
export async function is_file_exists(path) {
  try {
    return (await stat(path)).isFile();
  } catch (e) {
    return false;
  }
}

/**
 * Check if directory exists
 * @param {string} path
 * @returns
 */
export async function is_directory_exists(path) {
  try {
    return (await stat(path)).isDirectory();
  } catch (e) {
    return false;
  }
}

/**
 * Show spinner while running async_callback
 * @typedef {() => Promise<any>} async_callback
 * @param {string} message
 * @param {async_callback} [callback]
 * @returns
 */
export async function spinner_log(message, callback) {
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

/**Get node executable path
 * @param {object} options
 * @param {boolean} [options.useSystemNode=true] 是否使用本地的node，如不启用则去 https://github.com/liudonghua123/node-sea/releases 页面根据 `platform`、`arch`、`nodeVersion`、`withIntl` 参数查找下载
 * @param {string} [options.nodeVersion="v20.11.0"] e.g. `v20.11.0`
 * @param {"none" | "full-icu" | "small-icu" | "system-icu"} [options.withIntl="small-icu"] node国际化版本，默认为 `small-icu`。https://nodejs.cn/api/intl.html#options-for-building-nodejs
 * @param {"x64"} [options.arch] 平台架构
 * @returns {Promise<string>} the path to node executable
 */
export async function get_node_executable(
  { useSystemNode, nodeVersion, arch, withIntl } = {
    useSystemNode: true,
    nodeVersion: "v20.11.0",
    arch: "x64",
    withIntl: "small-icu",
  }
) {
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
    platform_mapping[process.platform]
  }-${arch}-v${nodeVersion}-with-intl-${withIntl}${process.platform === "win32" ? ".exe" : ""}`;
  const expected_node_executable_path = join(cache_directory, node_executable_filename);
  if (await is_file_exists(expected_node_executable_path)) {
    log(`找到缓存的节点可执行文件，在 ${expected_node_executable_path}`);
    return expected_node_executable_path;
  }
  log(`从 github release 或指定的镜像 url 下载节点可执行文件`);
  // download the node executable from github release or specified mirror url named NODE_SEA_NODE_MIRROR_URL
  const download_url_prefix =
    process.env.NODE_SEA_NODE_MIRROR_URL ??
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

/**打包ts/js到单文件
 * @param {string} script_entry_path 入口文件路径（包括入口文件名及扩展名）
 * @param {string} temp_dir 临时文件存放目录
 */
export async function nccPack(script_entry_path, temp_dir) {
  // 为ncc提供配置支持
  const dir = dirname(script_entry_path);
  const findPackageJson = find(dir);
  const jsonInfo = await findPackageJson.next();
  let file = null;
  let typeOrigin = null;
  if (!jsonInfo.done) {
    file = editJsonFile(jsonInfo.value, {
      autosave: true,
      stringify_eol: true,
    });
    typeOrigin = file.get("type");
    if (typeOrigin === "module") {
      await spinner_log(`目标项目为 ${typeOrigin} 类型，临时修改为 commonjs 类型`, () => true);
      file.set("type", "commonjs");
    }
  }

  try {
    const outputFilePath = `${temp_dir}\\index.js`;
    const { code } = await ncc(script_entry_path, {
      cache: false,
      minify: true,
      target: "es2015",
      quiet: true,
    });
    await spinner_log(`执行 ncc 打包，输出 ncc 打包文件到 ${outputFilePath}`, async () => {
      await writeFile(outputFilePath, code);
    });
    return outputFilePath;
  } catch (error) {
    throw error;
  } finally {
    if (typeOrigin === "module") {
      file.set("type", "module");
      await spinner_log(`恢复目标项目为 ${typeOrigin} 类型`, () => true);
    }
  }
}
