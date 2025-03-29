import sea from "./build/index.js";

sea("./test/index.ts", undefined, {
  transpileOnly: true,
  useSystemNode: false,
  nodeVersion: "23.10.0",
  mirrorUrl: "https://registry.npmmirror.com/-/binary/node/",
});

// 使用下载的 node 二进制文件
// sea("./test/index.ts", undefined, {
//   transpileOnly: true,
//   useSystemNode: false,
//   nodeVersion: "23.10.0",
//   mirrorUrl: "https://registry.npmmirror.com/-/binary/node/",
// });
