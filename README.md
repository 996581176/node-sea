## Node.js SEA 打包工具

基于 [https://github.com/liudonghua123/node-sea](https://github.com/liudonghua123/node-sea) 扩展，支持了使用 `ncc`​ 进行打包，跨平台生成时使用的 `Node` 二进制使用官方编译文件。

[Node SEA 官方文档](https://nodejs.org/api/single-executable-applications.html)

捆绑 `assets`​ 的功能暂时还未使用过。

未对二进制文件的签名进行任何处理，因此打包过程中会出现 `warning: The signature seems corrupted!` 警告，此警告不影响生成文件。（该警告见：[https://github.com/nodejs/postject/issues/75](https://github.com/nodejs/postject/issues/75)）

```bash
npm i @northegg/node-sea
```

‍
