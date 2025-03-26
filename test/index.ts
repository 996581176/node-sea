console.log("test", "🚀*****************");
console.log("程序正在运行，按任意键退出...");
process.stdin.setRawMode(true);
process.stdin.resume();
process.stdin.on("data", () => process.exit());
