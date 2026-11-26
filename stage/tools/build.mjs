// 打包成单个 HTML：node tools/build.mjs  →  ../index.html（双击即可打开，不需要网络）
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { build } from 'esbuild';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const out = path.resolve(root, '..', 'index.html');

// 扫描 stage/shows/ 目录下的全部独立舞美资源包，打包成离线内嵌节目单（同时仍支持运行时导入外部 show.json）
function loadShowPacks() {
  const showsDir = path.join(root, 'shows');
  const indexPath = path.join(showsDir, 'index.json');
  if (!fs.existsSync(indexPath)) return [];
  const index = JSON.parse(fs.readFileSync(indexPath, 'utf8'));
  const packs = [];
  for (const entry of index.shows || []) {
    const file = path.resolve(showsDir, (entry.path || `./${entry.id}/show.json`).replace(/^\.\/shows\//, './'));
    if (fs.existsSync(file)) {
      packs.push(JSON.parse(fs.readFileSync(file, 'utf8')));
    }
  }
  return packs;
}

const embeddedShows = loadShowPacks();
const embeddedPath = path.join(root, 'src/show/embedded.js');

const r = await build({
  entryPoints: [path.join(root, 'src/main.js')],
  bundle: true, format: 'esm', minify: true, write: false, target: 'es2022', legalComments: 'none',
  alias: { three: path.join(root, 'node_modules/three/build/three.module.js') },
  plugins: [
    { name: 'addons', setup(b) { b.onResolve({ filter: /^three\/addons\// }, (a) => ({ path: path.join(root, 'node_modules/three/examples/jsm', a.path.slice('three/addons/'.length)) })); } },
    {
      name: 'embed-shows',
      setup(b) {
        b.onLoad({ filter: /src[\\/]show[\\/]embedded\.js$/ }, (args) => {
          if (path.resolve(args.path) !== embeddedPath) return null;
          return { contents: `export const EMBEDDED_SHOWS = ${JSON.stringify(embeddedShows)};`, loader: 'js' };
        });
      },
    },
  ],
});
const js = r.outputFiles[0].text.replace(/<\/script/g, '<\\/script');

let html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
html = html.replace(/<script id="live-dev">[\s\S]*?<\/script>\s*/, '');
html = html.replace(/<script type="importmap">[\s\S]*?<\/script>\s*/, '');
html = html.replace(/<script type="module" src="\.\/src\/main\.js"><\/script>/, () => `<script type="module">${js}</script>`);
fs.writeFileSync(out, html);
console.log('wrote', out, (fs.statSync(out).size / 1e6).toFixed(2) + ' MB', `(${embeddedShows.length} shows)`);
