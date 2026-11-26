# 火星舞台 · 场地还原

华晨宇「火星 2.0」南京汤山音乐谷演唱会场地的浏览器三维还原（Three.js 单文件）。

在线打开：https://zyghys.github.io/mars-stage/

## 操作方式

- 无人机总览：WASD 前后左右 · 空格 / C 升降 · Q / E 转向 · 拖动控制云台
- 第一 / 第三人称：WASD 走 · Shift 跑 · 空格 跳 · 右下小地图点击传送
- 顶部“舞台 / 舞美 / 环境 / 显示 / 视频”可切换屏塔站位、圆环形态、节目包舞美、时间天气、夜景灯光与大屏视频

## 目录结构

- `index.html`：打包好的单文件离线网页（GitHub Pages 线上入口）
- `stage/`：打包直接依赖的源码与配置
  - `stage/index.html`：页面入口模板
  - `stage/src/`：三维场景、舞台结构、外围场地、天气夜景与舞美控制系统源码
  - `stage/shows/`：可插拔舞美节目包（`show.json`）
  - `stage/tools/build.mjs`：单文件打包脚本

## 本地打包

需要 Node.js 18+：

```bash
cd stage
npm ci
npm run build
```

执行后会将 `stage/` 中的源码与舞美节目包重新打包为根目录的 `index.html`。
