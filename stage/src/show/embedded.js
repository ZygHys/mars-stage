// 开发模式下为空数组，运行时由 show/engine.js 从 ./shows/index.json 动态热加载。
// 单文件打包（tools/build.mjs）时由 esbuild 插件自动替换为 stage/shows/*/show.json 的完整内嵌数据。
export const EMBEDDED_SHOWS = [];
