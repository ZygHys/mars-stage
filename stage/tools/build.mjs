import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { build } from "esbuild";
function loadShowPacks(showsDir) {
  const indexPath = path.join(showsDir, "index.json");
  if (!fs.existsSync(indexPath)) return [];
  const index = JSON.parse(fs.readFileSync(indexPath, "utf8"));
  const packs = [];
  for (const entry of index.shows || []) {
    const file = path.resolve(showsDir, (entry.path || `./${entry.id}/show.json`).replace(/^\.\/shows\//, "./"));
    if (fs.existsSync(file)) {
      packs.push(JSON.parse(fs.readFileSync(file, "utf8")));
    }
  }
  return packs;
}
async function buildStage({
  stageDir,
  outFile,
  embedShows = true,
  showsDir = path.join(stageDir, "shows"),
  nodeModulesDir = path.join(stageDir, "node_modules")
} = {}) {
  const embeddedShows = embedShows ? loadShowPacks(showsDir) : [];
  const embeddedPath = path.join(stageDir, "src/show/embedded.js");
  const r = await build({
    entryPoints: [path.join(stageDir, "src/main.js")],
    bundle: true,
    format: "esm",
    minify: true,
    write: false,
    metafile: true,
    target: "es2022",
    legalComments: "none",
    alias: {
      three: path.join(nodeModulesDir, "three/build/three.module.js"),
      gsap: path.join(nodeModulesDir, "gsap/index.js")
    },
    plugins: [
      {
        name: "addons",
        setup(b) {
          b.onResolve({ filter: /^three\/addons\// }, (a) => ({
            path: path.join(nodeModulesDir, "three/examples/jsm", a.path.slice("three/addons/".length))
          }));
        }
      },
      {
        name: "embed-shows",
        setup(b) {
          b.onLoad({ filter: /src[\\/]show[\\/]embedded\.js$/ }, (args) => {
            if (path.resolve(args.path) !== embeddedPath) return null;
            return { contents: `export const EMBEDDED_SHOWS = ${JSON.stringify(embeddedShows)};`, loader: "js" };
          });
        }
      }
    ]
  });
  const js = r.outputFiles[0].text.replace(/<\/script/g, "<\\/script");
  let html = fs.readFileSync(path.join(stageDir, "index.html"), "utf8");
  html = html.replace(/<script id="live-dev">[\s\S]*?<\/script>\s*/, "");
  html = html.replace(/<script type="importmap">[\s\S]*?<\/script>\s*/, "");
  html = html.replace(/<script type="module" src="\.\/src\/main\.js"><\/script>/, () => `<script type="module">${js}<\/script>`);
  if (outFile) {
    fs.mkdirSync(path.dirname(outFile), { recursive: true });
    fs.writeFileSync(outFile, html);
  }
  const srcRoot = path.join(stageDir, "src");
  const directSrcFiles = Object.keys(r.metafile.inputs).map((p) => path.resolve(process.cwd(), p)).filter((abs) => abs.startsWith(srcRoot + path.sep) && fs.existsSync(abs)).map((abs) => path.relative(stageDir, abs)).sort();
  return { html, embeddedCount: embeddedShows.length, directSrcFiles, sizeBytes: Buffer.byteLength(html, "utf8") };
}
const isMain = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isMain) {
  const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
  const args = process.argv.slice(2);
  const embedShows = !args.includes("--no-embed-shows");
  const outIdx = args.indexOf("--out");
  const out = outIdx >= 0 && args[outIdx + 1] ? path.resolve(args[outIdx + 1]) : path.resolve(root, "..", "火星舞台_场地框架.html");
  const showsDir = fs.existsSync(path.join(root, "shows/index.json")) ? path.join(root, "shows") : path.resolve(root, "..", "shows");
  const res = await buildStage({ stageDir: root, outFile: out, embedShows, showsDir });
  console.log("wrote", out, (res.sizeBytes / 1e6).toFixed(2) + " MB", `(${res.embeddedCount} embedded shows, ${res.directSrcFiles.length} direct src files)`);
}
export {
  buildStage,
  loadShowPacks
};
