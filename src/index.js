import { exec as exec_origin } from "child_process";
import util from "util";
import { basename, dirname, join, resolve } from "path";
import { copyFile, writeFile, mkdir } from "fs/promises";
import { fileURLToPath } from "url";
import {
  is_directory_exists,
  is_file_exists,
  spinner_log,
  get_node_executable,
  pack,
} from "./utils.js";
import ora from "ora";
import { rimraf } from "rimraf";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// promisify exec, let exec block until the process exits
const exec = util.promisify(exec_origin);

/**从入口脚本创建单个可执行应用程序（SEA）注意：未对macOS二进制文件签名做处理
 *
 * See also https://nodejs.cn/api/single-executable-applications.html
 * @param {string} script_entry_path 入口文件路径（包括入口文件名及扩展名）
 * @param {string} executable_path 输出可执行文件路径（包括文件名及扩展名）
 * @param {object} options
 * @param {boolean} [options.disableExperimentalSEAWarning=true] 关闭实验性警告。默认为 `true`
 * @param {boolean} [options.useSnapshot=false] 启动快照支持。默认为 `false`，生成跨平台 SEA 时必须为 `false`。当 useSnapshot 为 true 时，主脚本必须调用 `v8.startupSnapshot.setDeserializeMainFunction()` API 来配置用户启动最终可执行文件时需要运行的代码
 * @param {boolean} [options.useCodeCache=false] V8 代码缓存支持。默认为 `false`，生成跨平台 SEA 时必须为 `false`。注意：当 useCodeCache 为 true 时，动态导入 `import()` 不起作用。
 * @param {boolean} [options.useSystemNode=true] 是否使用本地的node，如不启用则去 https://github.com/liudonghua123/node-sea/releases 页面根据 `platform`、`arch`、`nodeVersion`、`withIntl` 参数查找下载
 * @param {string} [options.nodeVersion="v20.11.0"] e.g. `v20.11.0`
 * @param {"none" | "full-icu" | "small-icu" | "system-icu"} [options.withIntl="small-icu"] node国际化版本，默认为 `small-icu`。https://nodejs.cn/api/intl.html#options-for-building-nodejs
 * @param {"x64"} [options.arch] 平台架构
 */
export default async function sea(
  script_entry_path,
  executable_path,
  {
    disableExperimentalSEAWarning,
    useSnapshot,
    useCodeCache,
    useSystemNode,
    nodeVersion,
    withIntl,
    arch,
  } = {
    disableExperimentalSEAWarning: true,
    useSnapshot: false,
    useCodeCache: false,
    useSystemNode: true,
    nodeVersion: "v20.11.0",
    withIntl: "small-icu",
    arch: "c",
  }
) {
  // normalize the script_entry_path and executable_path
  script_entry_path = resolve(process.cwd(), script_entry_path);
  executable_path = resolve(process.cwd(), executable_path);
  // check if script_entry_path exists and is a file
  if (!(await is_file_exists(script_entry_path))) {
    throw new Error(`Script entry path ${script_entry_path} does not exist`);
  }
  // check if executable directory exists
  if (!(await is_directory_exists(dirname(executable_path)))) {
    throw new Error(`Executable directory ${dirname(executable_path)} does not exist`);
  }
  // check if executable_path exists
  if (await is_file_exists(executable_path)) {
    console.warn(`Executable path ${executable_path} already exists, will be overwritten`);
  }
  // check node version, needs to be at least 20.0.0
  if (process.version < "v20.0.0") {
    throw new Error(
      `System Node version ${process.version} is too old, needs to be at least v20.0.0`
    );
  }
  // get the node executable
  const node_executable = await get_node_executable({ useSystemNode, nodeVersion, withIntl, arch });
  // copy the executable as the output executable
  await copyFile(node_executable, executable_path);
  // create a temporary directory for the processing work
  const temp_dir = join(__dirname, "../.temp");
  // create the temporary directory if it does not exist
  if (!(await is_directory_exists(temp_dir))) {
    await mkdir(temp_dir);
  }
  // change working directory to temp_dir
  process.chdir(temp_dir);
  /** 调用ncc打包文件 */
  const packFilePath = await pack(script_entry_path, temp_dir);
  // Create a configuration file building a blob that can be injected into the single executable application
  const preparation_blob_path = join(temp_dir, "sea-prep.blob");
  const sea_config_path = join(temp_dir, "sea-config.json");
  const sea_config = {
    main: packFilePath,
    output: preparation_blob_path,
    disableExperimentalSEAWarning,
    useSnapshot,
    useCodeCache,
  };
  await spinner_log(`Writing configuration file into ${sea_config_path}`, async () => {
    await writeFile(sea_config_path, JSON.stringify(sea_config));
  });
  // Generate the blob to be injected
  await spinner_log(`Generating blob into ${preparation_blob_path}`, async () => {
    await exec(`node --experimental-sea-config "${sea_config_path}"`);
  });
  // Inject the blob into the copied binary by running postject
  await spinner_log(`Injecting blob into ${basename(executable_path)}`, async () => {
    await exec(
      `npx postject "${executable_path}" NODE_SEA_BLOB "${preparation_blob_path}" --sentinel-fuse NODE_SEA_FUSE_fce680ab2cc467b6e072b8b5df1996b2`
    );
  });
  // Remove the temporary directory
  await spinner_log(`Removing all the files in temporary directory ${temp_dir}`, async () => {
    await rimraf(temp_dir);
  });
  ora(`All done!`).succeed();
}
