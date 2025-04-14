import { readFile, stat } from "fs/promises";
import ora from "ora";
import { homedir } from "os";
import { mkdir, writeFile, chmod } from "fs/promises";
import { join } from "path";
import debug from "debug";
// @ts-ignore
import ncc from "@vercel/ncc";
import { copyFileSync, existsSync, rmSync, writeFileSync } from "fs";
import AdmZip from "adm-zip";
import { extract } from "tar";

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

type Options = {
  /** 临时文件存放目录 */
  temp_dir: string;
  /** ts文件仅转译，不进行检查。默认为 `false` */
  transpileOnly?: boolean;
};

/** 打包ts/js到单文件 */
export async function nccPack(
  /** 入口文件路径（包括入口文件名及扩展名） */
  script_entry_path: string,
  options: Options
) {
  const { temp_dir, transpileOnly = false } = options;
  // 为ncc提供配置支持
  try {
    handleImportMeta(script_entry_path);
    const outputFilePath = join(temp_dir, "index.js");
    const { code } = await ncc(script_entry_path, {
      cache: false,
      minify: true,
      target: "es2024",
      quiet: true,
      esm: false,
      transpileOnly,
    });
    await spinner_log(`执行 ncc 打包，输出 ncc 打包文件到 ${outputFilePath}`, async () => {
      await writeFile(outputFilePath, code);
    });
    return outputFilePath;
  } catch (error) {
    throw error;
  }
}

/**获取指定平台 x64 node
 * @param useSystemNode node 版本号 如 `23.9.0`
 * @param nodeVersion node 版本号 如 `23.9.0`
 * @param target 目标平台
 * @param temp_dir node存放的目录
 * @param arch 架构
 * @param mirrorUrl 镜像下载地址 如：https://registry.npmmirror.com/-/binary/node/
 */
export async function get_node_executable(
  /** 临时文件存放目录 */
  temp_dir: string,
  /** 是否使用本地的node，默认为 `true` */
  useSystemNode: boolean = true,
  /** 要下载的 node 版本，默认为 `22.14.0` */
  nodeVersion: string = "22.14.0",
  /** 目标平台，默认为当前平台 */
  target: "win" | "darwin" | "linux" = process.platform as "win" | "darwin" | "linux",
  /** node 架构，默认为 `x64` */
  arch: "x64" | "arm64" = "x64",
  /** node 镜像下载地址 如：https://registry.npmmirror.com/-/binary/node/ */
  mirrorUrl?: string
) {
  if (useSystemNode) return process.execPath;
  const archiveBase = `node-v${nodeVersion}-${target}-${arch}`;
  const isWindows = archiveBase.includes("-win");

  const archiveFile = archiveBase + "." + (isWindows ? "zip" : "tar.gz");
  const archivePath = join(temp_dir, archiveFile);
  const execName = join(temp_dir, archiveBase);
  if (existsSync(execName)) {
    await spinner_log(`发现存在: ${archiveBase}`, async () => {});
    return execName;
  }

  if (existsSync(archivePath)) {
    await spinner_log(`找到现有文件: ${archiveFile}`, async () => {});
  } else {
    try {
      // https://registry.npmmirror.com/-/binary/node/
      const url = `${mirrorUrl || "https://nodejs.org/dist/"}v${nodeVersion}/${archiveFile}`;
      const response = await fetch(url);
      writeFileSync(archivePath, new Uint8Array(await response.arrayBuffer()));
    } catch {
      throw ["下载失败:", archiveBase];
    }
  }

  if (isWindows) {
    const zip = new AdmZip(archivePath);
    const data = zip.readFile(archiveBase + "/node.exe");
    if (!data) {
      throw ["缺少 node 可执行文件:", archiveBase];
    }

    writeFileSync(execName, data);
    return execName;
  } else {
    await extract({
      file: archivePath,
      gzip: true,
      cwd: join(temp_dir),
    });
    const extracted = join(temp_dir, archiveBase);
    return join(extracted, "bin/node");
  }
}

/**对使用ESM脚本的 `import.meta.dirname` 和 `import.meta.filename` 进行处理
 * @param script_entry_path 入口文件路径（包括入口文件名及扩展名）
 */
export async function handleImportMeta(script_entry_path: string) {
  let string = await readFile(script_entry_path, "utf-8");
  string = string.replaceAll("import.meta.dirname", "__dirname");
  string = string.replaceAll("import.meta.filename", "__filename");
  await writeFile(script_entry_path, string);
}
