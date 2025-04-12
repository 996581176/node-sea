import { exec as exec_origin } from "child_process";
import util from "util";
import { basename, dirname, extname, join, resolve } from "path";
import { copyFile, writeFile, mkdir, readFile } from "fs/promises";
import { is_directory_exists, is_file_exists, spinner_log, get_node_executable, nccPack, } from "./utils.js";
import ora from "ora";
import { rimraf } from "rimraf";
import { randomUUID } from "crypto";
// @ts-ignore
import { inject } from "postject";
// promisify exec, let exec block until the process exits
const exec = util.promisify(exec_origin);
export default async function sea(
/** 入口文件路径（包括入口文件名及扩展名） */
script_entry_path, options = {}) {
    const { disableExperimentalSEAWarning = true, useSnapshot = false, useCodeCache = false, useSystemNode = true, nodeVersion = "22.14.0", arch = "x64", target = process.platform.includes("win")
        ? "win"
        : process.platform, assets = undefined, transpileOnly = false, mirrorUrl, executable_name, } = options;
    let { executable_path } = options;
    const startDir = process.cwd();
    // normalize the script_entry_path and executable_path
    script_entry_path = resolve(process.cwd(), script_entry_path);
    if (executable_path) {
        executable_path = resolve(process.cwd(), executable_path);
    }
    else {
        console.warn("使用默认输出目录");
        executable_path = resolve(dirname(process.argv[1]), `./dist/${executable_name ? executable_name : basename(script_entry_path, extname(script_entry_path))}${target === "win" ? ".exe" : ""}`);
        if (await is_directory_exists(dirname(executable_path))) {
            console.warn("默认输出目录 dist 已存在");
        }
        else {
            await spinner_log("创建输出文件目录 dist", async () => {
                await mkdir(dirname(executable_path));
            });
        }
    }
    // check if script_entry_path exists and is a file
    if (!(await is_file_exists(script_entry_path))) {
        throw new Error(`脚本文件 ${script_entry_path} 不存在`);
    }
    // check if executable directory exists
    if (!(await is_directory_exists(dirname(executable_path)))) {
        throw new Error(`输出执行文件目录 ${dirname(executable_path)} 不存在`);
    }
    // check if executable_path exists
    if (await is_file_exists(executable_path)) {
        console.warn(`可执行文件 ${executable_path} 已存在, 将被覆盖`);
    }
    // check node version, needs to be at least 20.0.0
    if (process.version < "v20.0.0") {
        throw new Error(`系统 Node 版本 ${process.version} 太老了, 至少需要 v20.0.0`);
    }
    const uuid = randomUUID();
    // create a temporary directory for the processing work
    const temp_dir = resolve(dirname(executable_path), `./${uuid}`);
    // create the temporary directory if it does not exist
    if (!(await is_directory_exists(temp_dir))) {
        await spinner_log(`创建临时目录 ${temp_dir}`, async () => {
            await mkdir(temp_dir);
        });
    }
    try {
        // 获取 node 可执行文件
        const node_executable = await spinner_log(`${useSystemNode ? "使用系统安装的 node" : `下载 node-v${nodeVersion}-${target}-${arch}`}`, async () => {
            return await get_node_executable(temp_dir, useSystemNode, nodeVersion, target, arch, mirrorUrl);
        });
        // 复制可执行文件作为输出可执行文件
        await copyFile(node_executable, executable_path);
        // 将工作目录更改为temp_dir
        process.chdir(temp_dir);
        /** 调用ncc打包文件 */
        const packFilePath = await nccPack(script_entry_path, { temp_dir, transpileOnly });
        if (!packFilePath)
            return;
        // Create a configuration file building a blob that can be injected into the single executable application
        const preparation_blob_path = join(temp_dir, "sea-prep.blob");
        const sea_config_path = join(temp_dir, "sea-config.json");
        const sea_config = {
            main: packFilePath,
            output: preparation_blob_path,
            disableExperimentalSEAWarning,
            useSnapshot,
            useCodeCache,
            assets,
        };
        await spinner_log(`将配置文件写入 ${sea_config_path}`, async () => {
            await writeFile(sea_config_path, JSON.stringify(sea_config));
        });
        // Generate the blob to be injected
        await spinner_log(`生成blob到 ${preparation_blob_path}`, async () => {
            await exec(`node --experimental-sea-config "${sea_config_path}"`);
        });
        // Inject the blob into the copied binary by running postject
        await spinner_log(`将 blob 注入 ${basename(executable_path)}`, async () => {
            const blob = await readFile(preparation_blob_path);
            await inject(executable_path, "NODE_SEA_BLOB", blob, {
                machoSegmentName: "NODE_SEA",
                sentinelFuse: "NODE_SEA_FUSE_fce680ab2cc467b6e072b8b5df1996b2",
            });
        });
        // Remove the temporary directory
        await spinner_log(`删除临时目录 ${temp_dir}`, async () => {
            process.chdir(startDir);
            await rimraf(temp_dir);
        });
        ora("All done!").succeed();
    }
    catch (error) {
        await spinner_log(`删除临时目录 ${temp_dir}`, async () => {
            process.chdir(startDir);
            await rimraf(temp_dir);
        });
        ora("打包出错!").fail();
        console.log(error);
    }
}
