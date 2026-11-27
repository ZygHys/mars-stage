import * as THREE from "three";
import { mergeGeometries } from "three/addons/utils/BufferGeometryUtils.js";
import { LAYOUT } from "../layout.js";
import { drawMarsLogo, rng } from "../textures.js";
import { muhlyDetail } from "./muhly-texture.js";
const cache = {};
const mat = (color, extra = {}) => cache[color + JSON.stringify(extra)] ||= new THREE.MeshStandardMaterial({ color, roughness: 0.8, ...extra });
function mesh(geo, m, x = 0, y = 0, z = 0) {
  const o = new THREE.Mesh(geo, m);
  o.position.set(x, y, z);
  o.castShadow = o.receiveShadow = true;
  return o;
}
const box = (w, h, d, m, x, y, z) => mesh(new THREE.BoxGeometry(w, h, d), m, x, y, z);
const sstep = (a, b, x) => {
  const t = Math.min(1, Math.max(0, (x - a) / (b - a)));
  return t * t * (3 - 2 * t);
};
const hash = (n) => {
  const s = Math.sin(n * 127.1) * 43758.5453;
  return s - Math.floor(s);
};
const noise = (x) => {
  const i = Math.floor(x), f = x - i, u = f * f * (3 - 2 * f);
  return hash(i) * (1 - u) + hash(i + 1) * u;
};
const h2 = (i, j) => hash(i * 157.31 + j * 311.7);
const noise2 = (x, z) => {
  const i = Math.floor(x), j = Math.floor(z), fx = x - i, fz = z - j, u = fx * fx * (3 - 2 * fx), v = fz * fz * (3 - 2 * fz);
  return (h2(i, j) * (1 - u) + h2(i + 1, j) * u) * (1 - v) + (h2(i, j + 1) * (1 - u) + h2(i + 1, j + 1) * u) * v;
};
const fbm2 = (x, z) => 0.55 * noise2(x, z) + 0.3 * noise2(x * 2.1 + 5, z * 2.1 + 9) + 0.15 * noise2(x * 4.3 + 13, z * 4.3 + 2);
const PIT = { x: -430, z: -60, hw: 38, hh: 95, floor: -4, rim: 42 };
const bowlLine = (lx) => -80 + 11e-4 * lx * lx;
const GRID = { x: -700, z: -320, width: 1160, depth: 660, cols: 290, rows: 230 };
const plazaStairs = { x: 62, front: 40.8, width: 60, tread: 2.25, rise: 0.19, count: 6 };
const plazaGrade = 0.03;
const terraceBend = (x) => 10 * Math.sin(x / 40);
function flowerCover(x, z) {
  const edge = sstep(49, 64, z) * sstep(225, 203, z + terraceBend(x) * 0.65) * sstep(228, 195, Math.abs(x - 30));
  const thinning = fbm2(x / 11 + 3, z / 5) + 0.08 * Math.sin((z + terraceBend(x)) / 4);
  return edge * (1 - 0.19 * sstep(0.6, 0.81, thinning));
}
function makeHeight(base) {
  return (lx, lz) => {
    const dome = Math.max(0.1, 1 - ((lx + 120) / 640) ** 2);
    const mountain = base + (72 + 45 * sstep(-90, -250, lz) - 40 * sstep(-260, -330, lz)) * dome + 26 * (noise(lx / 60 + 2) - 0.5) * dome;
    const t = Math.max(0, lz - 48 + terraceBend(lx) * sstep(48, 69, lz));
    const level = Math.floor(t / 26), along = t - level * 26;
    const terr = lz < 48 ? base - plazaGrade * Math.max(0, lz) : Math.max(base - 27, base - 1.44 - 3.75 * level - 0.085 * along - 1.54 * sstep(11, 26, along));
    const pinkZone = sstep(250, 200, Math.abs(lx - 30));
    const meadow = base * (1 - sstep(10, 330, lz));
    const terraceFoot = terr * (1 - sstep(214, 340, lz));
    const front = THREE.MathUtils.lerp(meadow, terraceFoot, pinkZone);
    const lc = bowlLine(lx), inBowl = sstep(180, 135, Math.abs(lx - 10));
    const foot = base + 12, top = foot + 52 * (0.72 + 0.45 * noise(lx / 16 + 3.3) + 0.1 * noise(lx / 4 + 1.1));
    const dz = lc - lz;
    const cliffSteps = 0.5 * sstep(0, 4, dz) + 0.3 * sstep(7, 10, dz) + 0.2 * sstep(13, 15, dz);
    const bowl = lz > lc ? base + (foot - base) * sstep(0, lc, lz) : foot + (top - foot) * cliffSteps + Math.max(0, mountain - top) * sstep(16, 80, dz);
    const slope = base + (mountain - base) * sstep(0, -190, lz);
    let y = lz >= 0 ? front : THREE.MathUtils.lerp(slope, bowl, inBowl);
    if (lz < 0 && lz > -6) y = THREE.MathUtils.lerp(front, y, sstep(0, -6, lz));
    const stairs = plazaStairs, depth = stairs.count * stairs.tread, run = stairs.front - lz;
    if (run > 0 && run < depth + 16) {
      const bank = 1 - sstep(stairs.width / 2, stairs.width / 2 + 9, Math.abs(lx - stairs.x));
      const rise = stairs.count * stairs.rise - depth * plazaGrade - 0.045;
      y += rise * bank * Math.min(1, run / depth) * (1 - sstep(depth + 2, depth + 16, run));
    }
    const px = lx - PIT.x, pz = lz - PIT.z;
    const hill = (base + PIT.rim) * sstep(1, 0.55, Math.hypot(px / 170, pz / 210));
    y = Math.max(y, hill);
    const floor = base + PIT.floor;
    const side = Math.abs(px) - PIT.hw - 10 * sstep(42, 100, pz);
    const rimDistance = Math.max(side, -pz - PIT.hh);
    const mouth = 1 - sstep(178, 235, pz);
    if (rimDistance < 24 && mouth > 0) {
      const bed = THREE.MathUtils.lerp(floor, meadow, sstep(83, 233, pz));
      const rim = 0.55 * sstep(0, 7, rimDistance) + 0.45 * sstep(7, 22, rimDistance);
      y = THREE.MathUtils.lerp(y, bed, (1 - rim) * mouth);
    }
    if (px > 28 && px < 130) {
      const branchZ = 25 - 0.12 * (px - 36);
      const opening = sstep(28, 40, px) * (1 - sstep(94, 130, px)) * sstep(25, 6, Math.abs(pz - branchZ));
      y = THREE.MathUtils.lerp(y, floor + 0.025 * (px - 36), opening);
    }
    const edge = sstep(-700, -620, lx) * sstep(460, 400, lx);
    return Math.max(-2, y * edge - 2 * (1 - edge));
  };
}
function meshHeight(base) {
  const { x, z, width, depth, cols, rows } = GRID;
  const raw = makeHeight(base), stride = cols + 1, heights = new Float32Array(stride * (rows + 1));
  for (let j = 0; j <= rows; j++) for (let i = 0; i <= cols; i++) {
    heights[j * stride + i] = raw(x + width * i / cols, z + depth * j / rows);
  }
  return (lx, lz) => {
    const u = THREE.MathUtils.clamp((lx - x) / width * cols, 0, cols);
    const v = THREE.MathUtils.clamp((lz - z) / depth * rows, 0, rows);
    const i = Math.min(Math.floor(u), cols - 1), j = Math.min(Math.floor(v), rows - 1), at = j * stride + i;
    const dx = u - i, dz = v - j, a = heights[at], b = heights[at + 1], c = heights[at + stride], d = heights[at + stride + 1];
    return dx + dz <= 1 ? a + (b - a) * dx + (c - a) * dz : d + (c - d) * (1 - dx) + (b - d) * (1 - dz);
  };
}
function mapGrassDetail(shader, useMaterialMap) {
  const varyings = "varying vec4 grassUv; varying float grassMix;\n";
  shader.vertexShader = varyings + `
    vec2 grassHash(vec2 cell) {
      vec2 n = vec2(dot(cell,vec2(31.7,79.1)), dot(cell,vec2(65.3,19.9)));
      return fract(sin(n)*17253.43);
    }
    vec2 grassNoise(vec2 p) {
      vec2 i = floor(p), f = fract(p);
      f = f*f*(3.-2.*f);
      return mix(mix(grassHash(i),grassHash(i+vec2(1,0)),f.x),
                 mix(grassHash(i+vec2(0,1)),grassHash(i+vec2(1,1)),f.x), f.y);
    }
  ` + shader.vertexShader.replace("#include <begin_vertex>", `
    #include <begin_vertex>
    vec2 meadowPos = position.xz;
    vec2 drift = grassNoise(meadowPos/12.3);
    vec2 bendUv = grassNoise(meadowPos/5.7 + drift);
    grassUv.xy = mat2(.91,.42,-.42,.91)*meadowPos / vec2(3.8,3.1) + 1.7*drift + .43*bendUv;
    grassUv.zw = mat2(.68,-.73,.73,.68)*meadowPos / vec2(2.7,3.7) + 1.24*bendUv.yx - drift;
    grassMix = smoothstep(.14,.86,drift.y);
  `);
  shader.fragmentShader = varyings + `
    float grassDetailAt(sampler2D detail) {
      return mix(texture2D(detail,grassUv.xy).r, texture2D(detail,grassUv.zw).r, grassMix);
    }
  ` + shader.fragmentShader;
  if (useMaterialMap) {
    shader.fragmentShader = shader.fragmentShader.replace(
      "#include <map_fragment>",
      "vec4 sampledDiffuseColor = vec4(vec3(grassDetailAt(map)),1.); diffuseColor *= sampledDiffuseColor;"
    );
  }
}
function terrain(H, pathsTexture, fineGrass) {
  const { x: x0, z: z0, width, depth, cols, rows } = GRID;
  const geo = new THREE.PlaneGeometry(width, depth, cols, rows);
  geo.rotateX(-Math.PI / 2);
  geo.translate(x0 + width / 2, 0, z0 + depth / 2);
  const P = geo.attributes.position, col = new Float32Array(P.count * 3), stoneWeight = new Float32Array(P.count), c = new THREE.Color();
  const rock = new THREE.Color(11117980), rockPink = new THREE.Color(11900548), rockDark = new THREE.Color(7301730), forest = new THREE.Color(2242079), forestLit = new THREE.Color(5204531), dirt = new THREE.Color(11903356), dryGrass = new THREE.Color(11565431), grass = new THREE.Color(7374414), lawn = new THREE.Color(7315532), meadow = new THREE.Color(6518859);
  for (let i = 0; i < P.count; i++) {
    const x = P.getX(i), z = P.getZ(i);
    P.setY(i, H(x, z));
  }
  geo.computeVertexNormals();
  const N = geo.attributes.normal;
  for (let i = 0; i < P.count; i++) {
    const x = P.getX(i), z = P.getZ(i), steep = 1 - N.getY(i), n = fbm2(x / 14, z / 14);
    const px = Math.abs(x - PIT.x) - PIT.hw, pz = Math.abs(z - PIT.z) - PIT.hh;
    const inCut = Math.abs(x - PIT.x) < 75 && z < PIT.z + 95 || Math.abs(x - 10) < 170 && z < bowlLine(x) + 1 && z > bowlLine(x) - 30;
    stoneWeight[i] = inCut ? sstep(0.085, 0.42, steep) : 0;
    if (stoneWeight[i] > 0.25 || steep > 0.42) c.copy(rock).lerp(rockPink, sstep(0.42, 0.7, fbm2(x / 45, z / 30 + 5))).lerp(rockDark, 0.45 * noise2(x / 2.4, P.getY(i) / 9) + 0.2 * n);
    else if (px < 0 && pz < 0) c.copy(lawn).lerp(grass, n * 0.4);
    else if (z < 0 && z > bowlLine(x) + 2 && Math.abs(x - 10) < 160) c.copy(grass).lerp(forest, sstep(0.45, 0.68, n));
    else if (z < 0 || Math.abs(x) > 300) c.copy(forest).lerp(forestLit, n);
    else if (z < 48 && Math.abs(x - 10) < 120) c.copy(dirt).lerp(grass, 0.14 + 0.51 * sstep(0.26, 0.72, n));
    else c.copy(meadow).lerp(forest, n * 0.42).lerp(dryGrass, flowerCover(x, z) * (0.65 + 0.3 * n));
    col[i * 3] = c.r;
    col[i * 3 + 1] = c.g;
    col[i * 3 + 2] = c.b;
  }
  geo.setAttribute("color", new THREE.BufferAttribute(col, 3));
  geo.setAttribute("stoneWeight", new THREE.BufferAttribute(stoneWeight, 1));
  const m = new THREE.Mesh(geo, new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 1 }));
  m.material.onBeforeCompile = (shader) => {
    shader.uniforms.grassDetail = { value: fineGrass };
    shader.vertexShader = "attribute float stoneWeight; varying float rockMask; varying vec3 crag;\n" + shader.vertexShader.replace("#include <begin_vertex>", "#include <begin_vertex>\nrockMask=stoneWeight;crag=position;");
    shader.fragmentShader = `uniform sampler2D grassDetail; varying float rockMask; varying vec3 crag;
      float cragHash(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.54);}
      float cragNoise(vec2 p){vec2 i=floor(p), f=fract(p); f=f*f*(3.-2.*f);return mix(mix(cragHash(i),cragHash(i+vec2(1,0)),f.x),mix(cragHash(i+vec2(0,1)),cragHash(i+vec2(1,1)),f.x),f.y);}
    ` + shader.fragmentShader.replace("#include <color_fragment>", `
      #include <color_fragment>
      float field = smoothstep(50.,65.,crag.z) * (1.-smoothstep(204.,224.,crag.z))
                  * (1.-smoothstep(194.,227.,abs(crag.x-30.)));
      float stubble = cragNoise(crag.xz*vec2(2.3,1.6) + cragNoise(crag.xz*.45));
      float blades = grassDetailAt(grassDetail);
      float plaza = smoothstep(-2.,2.,crag.z) * (1.-smoothstep(45.,51.,crag.z))
                  * (1.-smoothstep(116.,123.,abs(crag.x-10.)));
      if (plaza > 0.) {
        float tufts = cragNoise(crag.xz*1.8 + vec2(stubble, -stubble));
        vec2 fibreUv = mat2(.82,.57,-.57,.82)*crag.xz / .85;
        float fibre = texture2D(grassDetail, fibreUv + vec2(.20*tufts,.16*stubble)).r;
        float wear = smoothstep(.52,.78, .54*cragNoise(crag.xz*.34) + .46*tufts);
        diffuseColor.rgb = mix(diffuseColor.rgb * vec3(.94,1.,.83), vec3(.31,.225,.138), plaza*wear*.68)
                         * mix(1., .60+.46*tufts+.39*fibre, plaza);
      }
      vec2 stemCoord = vec2(.89*crag.x+.45*crag.z, .89*crag.z-.45*crag.x);
      float stem = cragNoise(stemCoord*vec2(20.,3.2) + stubble);
      vec3 roots = mix(vec3(.29,.22,.14),vec3(.48,.29,.22),stubble) * (.52 + .55*blades + .38*stem);
      diffuseColor.rgb = mix(diffuseColor.rgb, roots, field*.73);
      vec2 face = vec2(crag.x*.76+crag.z*.68,crag.y);
      float fold=cragNoise(face*.14), fine=cragNoise(face*vec2(3.2,1.9));
      float seams=smoothstep(.37,.68,cragNoise(face*vec2(.71,.27)+3.1*fold));
      diffuseColor.rgb *= mix(1.,.82+.31*seams+.16*fine+.18*fold,rockMask);
    `);
    mapGrassDetail(shader, false);
    addPathMask(shader, pathsTexture, "diffuseColor.rgb = mix(diffuseColor.rgb, vec3(.61,.53,.44), pathInk);");
  };
  m.receiveShadow = true;
  m.userData.dynamic = true;
  return m;
}
function ribbon(H, pts, w, m) {
  const pos = [], idx = [];
  pts.forEach(([x, z], i) => {
    const [ax, az] = pts[Math.max(0, i - 1)], [bx, bz] = pts[Math.min(pts.length - 1, i + 1)], dx = bx - ax, dz = bz - az, l = Math.hypot(dx, dz) || 1, nx = -dz / l, nz = dx / l;
    for (const s of [-1, 1]) {
      const px = x + nx * w * s / 2, pz = z + nz * w * s / 2;
      pos.push(px, H(px, pz) + 0.25, pz);
    }
    if (i) {
      const k = i * 2;
      idx.push(k - 2, k - 1, k, k - 1, k + 1, k);
    }
  });
  const g = new THREE.BufferGeometry();
  g.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
  g.setIndex(idx);
  g.computeVertexNormals();
  const o = new THREE.Mesh(g, m);
  o.receiveShadow = true;
  return o;
}
const PATH_BOUNDS = [-201, 45, 464, 190];
function makePathTexture(paths) {
  const canvas = document.createElement("canvas");
  canvas.width = 4096;
  canvas.height = 1536;
  const ctx = canvas.getContext("2d"), [x, z, width, depth] = PATH_BOUNDS;
  ctx.fillStyle = "#000";
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.scale(canvas.width / width, canvas.height / depth);
  ctx.translate(-x, -z);
  ctx.strokeStyle = "#fff";
  ctx.lineCap = ctx.lineJoin = "round";
  ctx.lineWidth = 3;
  for (const line of paths) {
    ctx.beginPath();
    ctx.moveTo(...line[0]);
    for (const point of line.slice(1)) ctx.lineTo(...point);
    ctx.stroke();
  }
  const t = new THREE.CanvasTexture(canvas);
  t.flipY = false;
  t.anisotropy = 8;
  return t;
}
function addPathMask(shader, texture, operation) {
  shader.uniforms.campPaths = { value: texture };
  shader.vertexShader = "varying vec2 vPathUv;\n" + shader.vertexShader.replace(
    "#include <project_vertex>",
    "vPathUv = (transformed.xz - vec2(-201.,45.)) / vec2(464.,190.);\n#include <project_vertex>"
  );
  shader.fragmentShader = "uniform sampler2D campPaths; varying vec2 vPathUv;\n" + shader.fragmentShader.replace(
    "#include <alphamap_fragment>",
    "float pathInk = texture2D(campPaths,vPathUv).r;\n" + operation + "\n#include <alphamap_fragment>"
  );
}
function pinkMuhly(H, paths, pathsTexture, fineGrass) {
  const spacing = 0.91, cols = Math.ceil(456 / spacing), rows = Math.ceil(176 / spacing);
  const shelters = [...CAMP.eggs, ...CAMP.aframes, CAMP.home];
  const segments = paths.flatMap((path) => path.slice(1).map(([bx, bz], i) => {
    const [ax, az] = path[i], dx = bx - ax, dz = bz - az;
    return { ax, az, dx, dz, length2: dx * dx + dz * dz, loX: Math.min(ax, bx) - 5.1, hiX: Math.max(ax, bx) + 5.1, loZ: Math.min(az, bz) - 5.1, hiZ: Math.max(az, bz) + 5.1 };
  }));
  const bedCover = (x, z) => {
    let cover = flowerCover(x, z);
    if (!cover) return 0;
    for (const { ax, az, dx, dz, length2, loX, hiX, loZ, hiZ } of segments) {
      if (x < loX || x > hiX || z < loZ || z > hiZ) continue;
      const t = THREE.MathUtils.clamp(((x - ax) * dx + (z - az) * dz) / length2, 0, 1);
      const fringe = noise2(x / 2.1, z / 1.6);
      const edge = 1.54 + 0.16 * fringe;
      const depth = 0.58 + 0.85 * noise2(x / 7, z / 5);
      cover = Math.min(cover, sstep(edge, edge + depth, Math.hypot(x - ax - t * dx, z - az - t * dz)));
    }
    for (const [sx, sz] of shelters) cover *= sstep(1.75, 2.65, Math.hypot(sx - x, sz - z));
    return cover;
  };
  const mound = (x, z) => {
    const bend = 6 * noise2(x / 17, z / 13);
    return 0.36 + 0.4 * fbm2((0.84 * x + 0.54 * z + bend) / 5.1, (0.84 * z - 0.54 * x - bend) / 3.4) + 0.13 * noise2((x - bend) / 2.6, (z + bend) / 1.9);
  };
  const surface = new THREE.PlaneGeometry(456, 176, cols, rows).rotateX(-Math.PI / 2).translate(30, 0, 137);
  const points = surface.attributes.position, colors = [], keep = [], coverages = [];
  const shade = new THREE.Color("#c88298"), rose = new THREE.Color("#ef9ebb"), fresh = new THREE.Color("#a09769"), c = new THREE.Color();
  for (let i = 0; i < points.count; i++) {
    const x = points.getX(i), z = points.getZ(i), cover = bedCover(x, z), h = mound(x, z);
    points.setY(i, H(x, z) + 0.035 + cover * h);
    c.copy(fresh).lerp(shade, sstep(0.12, 0.67, cover)).lerp(rose, cover * sstep(0.48, 0.87, h));
    colors.push(c.r, c.g, c.b);
    coverages.push(cover);
  }
  const triangles = surface.index.array;
  for (let i = 0; i < triangles.length; i += 3) {
    const a = triangles[i], b = triangles[i + 1], c2 = triangles[i + 2];
    if (Math.max(coverages[a], coverages[b], coverages[c2]) > 0.035) keep.push(a, b, c2);
  }
  surface.setAttribute("cover", new THREE.Float32BufferAttribute(coverages, 1));
  surface.setIndex(keep);
  surface.setAttribute("color", new THREE.Float32BufferAttribute(colors, 3));
  surface.computeVertexNormals();
  const size = 256, pixels = new Uint8Array(size * size), random = rng(926);
  for (let i = 0; i < pixels.length; i++) pixels[i] = Math.floor(random() * 256);
  const grains = new THREE.DataTexture(pixels, size, size, THREE.RedFormat);
  grains.wrapS = grains.wrapT = THREE.RepeatWrapping;
  grains.magFilter = THREE.LinearFilter;
  grains.minFilter = THREE.LinearMipmapLinearFilter;
  grains.generateMipmaps = true;
  grains.needsUpdate = true;
  const bedMaterial = new THREE.MeshLambertMaterial({ vertexColors: true, map: fineGrass });
  bedMaterial.onBeforeCompile = (shader) => {
    shader.uniforms.grains = { value: grains };
    shader.vertexShader = "attribute float cover; varying float vDensity; varying vec3 vGrassUp;\n" + shader.vertexShader.replace(
      "#include <defaultnormal_vertex>",
      "#include <defaultnormal_vertex>\nvDensity = cover; vGrassUp = normalize(mat3(viewMatrix) * vec3(0.,1.,0.));"
    );
    shader.fragmentShader = "uniform sampler2D grains; varying float vDensity; varying vec3 vGrassUp;\n" + shader.fragmentShader.replace(
      "#include <color_fragment>",
      "#include <color_fragment>\nfloat fiber = sampledDiffuseColor.r;\nfloat seed = texture2D(grains, grassUv.zw * 1.3).r;\nfloat fringe = smoothstep(.025, .73, vDensity);\nif (fringe < .78 * seed + .22 * fiber) discard;\nfloat grazing = 1. - smoothstep(.05,.55,abs(dot(normalize(vViewPosition), vGrassUp)));\ndiffuseColor.rgb = mix(diffuseColor.rgb, vec3(.80,.46,.57) * sampledDiffuseColor.rgb,  .70 * grazing * smoothstep(.20,.82,vDensity)) * 1.42;"
    );
    mapGrassDetail(shader, true);
    addPathMask(shader, pathsTexture, "if (pathInk > .02) discard;");
  };
  const canopy = new THREE.Mesh(surface, bedMaterial);
  canopy.receiveShadow = true;
  canopy.userData.dynamic = true;
  canopy.userData.skipAoDepth = true;
  const silk = new THREE.MeshLambertMaterial({ vertexColors: true, map: fineGrass, side: THREE.DoubleSide });
  const layers = 6;
  silk.onBeforeCompile = (shader) => {
    shader.uniforms.grains = { value: grains };
    shader.vertexShader = "attribute float cover; varying float vLayer; varying float vCover; varying vec3 vUp;\n" + shader.vertexShader.replace("#include <begin_vertex>", `
      #include <begin_vertex>
      vLayer = (float(gl_InstanceID) + 1.) / ${layers.toFixed(1)};
      vCover = cover;
      vUp = normalize(mat3(viewMatrix) * vec3(0.,1.,0.));
      float bend = .07 + .15*grassMix;
      transformed.xz += cover * vLayer*vLayer * vec2(bend, .065);
      transformed.y += cover * vLayer * (.23 + .10*bendUv.x);
    `);
    shader.fragmentShader = "uniform sampler2D grains; varying float vLayer; varying float vCover; varying vec3 vUp;\n" + shader.fragmentShader.replace("#include <color_fragment>", `
      #include <color_fragment>
      float plume = texture2D(grains, grassUv.xy * 1.3).r;
      float tuft = texture2D(grains, grassUv.zw * .12).r;
      if (smoothstep(.02,.82,vCover) < .85*plume+.15*tuft || plume + .24*(tuft-.5) < .25 + .55*vLayer) discard;
      float grazing = 1.-smoothstep(.05,.55, abs(dot(normalize(vViewPosition), vUp)));
      vec3 tip = vec3(.90,.48,.61) * sampledDiffuseColor.rgb;
      diffuseColor.rgb = mix(diffuseColor.rgb, tip, .15 + .62*grazing + .17*vLayer);
      diffuseColor.rgb *= 1.32+.30*plume;
    `);
    mapGrassDetail(shader, true);
    addPathMask(shader, pathsTexture, "if (pathInk > .02) discard;");
  };
  const stalks = new THREE.InstancedMesh(surface, silk, layers);
  for (let i = 0; i < layers; i++) stalks.setMatrixAt(i, new THREE.Matrix4());
  stalks.name = "营地粉黛乱子草";
  stalks.userData.skipAoDepth = true;
  stalks.receiveShadow = true;
  const group = new THREE.Group();
  group.add(canopy, stalks);
  const fibers = [], fiberColors = [], dye = new THREE.Color();
  function filament(x, y, z, dx, dy, dz, w) {
    fibers.push(x - w, y, z, x + w, y, z, x + dx, y + dy, z + dz);
    for (let k = 0; k < 3; k++) fiberColors.push(dye.r, dye.g, dye.b);
  }
  for (let i = 0; i < 90; i++) {
    const x = (random() - 0.5) * 2.35, z = (random() - 0.5) * 2.35, h = 0.23 + random() * 0.3, dx = 0.05 + random() * 0.16, dz = (random() - 0.42) * 0.14;
    dye.set(i % 10 === 0 ? 11706497 : i % 3 ? 14788277 : 15778503);
    filament(x, 0, z, dx, h, dz, 6e-3);
    for (let k = 0; k < 7; k++) {
      const t = 0.42 + k * 0.075;
      filament(x + dx * t, h * t, z + dz * t, (k % 2 ? 1 : -1) * (0.02 + random() * 0.034) + dx * 0.14, 0.055 + random() * 0.055, dz * 0.25, 4e-3);
    }
  }
  for (let i = 0; i < 75; i++) {
    const angle = random() * Math.PI * 2, spread = 0.12 + random() * 0.32;
    const x = (random() - 0.5) * 1.2, z = (random() - 0.5) * 1.2;
    dye.set(i % 3 ? 10984562 : 11969416);
    filament(x, -0.3, z, Math.sin(angle) * spread, 0.23 + random() * 0.27, Math.cos(angle) * spread, 0.011);
  }
  const fiberGeo = new THREE.BufferGeometry();
  fiberGeo.setAttribute("position", new THREE.Float32BufferAttribute(fibers, 3));
  fiberGeo.setAttribute("color", new THREE.Float32BufferAttribute(fiberColors, 3));
  const n = new Float32Array(fibers.length);
  for (let i = 1; i < n.length; i += 3) n[i] = 1;
  fiberGeo.setAttribute("normal", new THREE.BufferAttribute(n, 3));
  const fiberMat = new THREE.MeshLambertMaterial({ vertexColors: true, side: THREE.DoubleSide });
  fiberMat.onBeforeCompile = (shader) => {
    shader.fragmentShader = shader.fragmentShader.replace(
      "#include <normal_fragment_begin>",
      "#include <normal_fragment_begin>\nnormal *= faceDirection;"
    );
  };
  const tileSize = 24, mtx = new THREE.Matrix4(), q = new THREE.Quaternion(), up = new THREE.Vector3(0, 1, 0);
  const scale = new THREE.Vector3(1, 1, 1), position = new THREE.Vector3();
  for (let z = 49; z < 225; z += tileSize) for (let x = -198; x < 258; x += tileSize) {
    const matrices = [];
    for (let i = 0; i < tileSize * tileSize; i++) {
      const px = x + random() * tileSize, pz = z + random() * tileSize, cover = bedCover(px, pz);
      if (cover < 0.015 || cover > 0.78 && random() > 0.23) continue;
      const width = (0.36 + 0.64 * cover) * (0.7 + 0.55 * random());
      scale.set(width, (0.4 + 0.6 * cover) * (0.74 + 0.5 * random()), width);
      position.set(px - x - tileSize / 2, H(px, pz) + 0.035 + cover * mound(px, pz), pz - z - tileSize / 2);
      matrices.push(mtx.compose(position, q.setFromAxisAngle(up, (random() - 0.5) * 4.1), scale).clone());
    }
    if (!matrices.length) continue;
    const clumps = new THREE.InstancedMesh(fiberGeo, fiberMat, matrices.length);
    matrices.forEach((m, i) => clumps.setMatrixAt(i, m));
    clumps.userData.skipAoDepth = true;
    const lod = new THREE.LOD();
    lod.position.set(x + tileSize / 2, H(x + tileSize / 2, z + tileSize / 2), z + tileSize / 2);
    clumps.position.y = -lod.position.y;
    lod.addLevel(clumps, 0);
    lod.addLevel(new THREE.Group(), 36, 0.1);
    group.add(lod);
  }
  return group;
}
function sign(base) {
  const g = new THREE.Group();
  g.position.y = base;
  const L = 70, white = mat(15921644, { roughness: 0.5 }), steel = mat(9059884, { roughness: 0.7 });
  for (let i = 0; i < 18; i++) {
    const x2 = -L / 2 + 2 + i * (L - 4) / 17;
    for (const z of [0, -5]) g.add(box(0.7, 7, 0.7, white, x2, 3.5, z));
  }
  g.add(box(L, 0.6, 6, steel, 0, 7.2, -2.5));
  const frame2 = mat(12368563, { roughness: 0.84 });
  for (let i = 0; i <= 20; i++) g.add(box(0.082, 11, 0.082, frame2, -L / 2 + i * L / 20, 13, -1.2));
  for (let k = 0; k < 6; k++) g.add(box(L, 0.09, 0.09, frame2, 0, 7.8 + k * 2.11, -1.2));
  const c = document.createElement("canvas");
  c.width = 2048;
  c.height = 300;
  const x = c.getContext("2d");
  x.fillStyle = "#ffffff";
  x.textAlign = "center";
  x.textBaseline = "alphabetic";
  x.font = 'bold 300px "Didot", "Bodoni 72", "Bodoni MT", "Playfair Display", "Times New Roman", serif';
  const metrics = x.measureText("MARS CONCERT");
  const ys = 291 / (metrics.actualBoundingBoxAscent + metrics.actualBoundingBoxDescent);
  x.setTransform(2034 / metrics.width, 0, 0, ys, 1024, 4 + metrics.actualBoundingBoxAscent * ys);
  x.fillText("MARS CONCERT", 0, 0);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 8;
  const letters = new THREE.MeshStandardMaterial({ map: tex, alphaTest: 0.24, roughness: 0.35, emissive: 16777215, emissiveMap: tex, emissiveIntensity: 0.12, side: THREE.DoubleSide });
  letters.userData.nightMap = tex;
  letters.userData.illuminatedLandmark = true;
  const face = mesh(new THREE.PlaneGeometry(L, L * 300 / 2048), letters, 0, 7.5 + L * 300 / 4096, 0.6);
  face.name = "MARS CONCERT 字牌";
  face.castShadow = false;
  face.userData.dynamic = true;
  g.add(face);
  const arch = mesh(new THREE.CircleGeometry(2.6, 20, 0, Math.PI), mat(1710618, { side: THREE.DoubleSide }), 0, -0.6, 3);
  g.add(arch);
  g.add(box(10, 3.2, 1, mat(10196361), -6.5, 1, 2.6));
  g.add(box(10, 3.2, 1, mat(10196361), 6.5, 1, 2.6));
  return g;
}
function eggHut(decorated) {
  const g = new THREE.Group(), shell = mat(10077929, { roughness: 0.62, side: THREE.DoubleSide });
  const blue = mat(3304624), pale = mat(12048615);
  const outline = [[0, 0.97], [0.08, 1.17], [0.26, 1.43], [0.48, 1.45], [0.7, 1.22], [0.89, 0.8], [1, 0.68]];
  const radius = (t) => {
    const i = outline.findIndex((p) => p[0] >= t), [a, r] = outline[Math.max(0, i - 1)], [b, s] = outline[i];
    return r + (s - r) * sstep(a, b + 1e-8, t);
  };
  const pos = [], index = [], rows = 120, cols = 80, height = 3.95, base = 0.33;
  for (let j = 0; j <= rows; j++) for (let i = 0; i <= cols; i++) {
    const t = j / rows, a = (i / cols - 0.5) * Math.PI * 2;
    const r = radius(t) + 0.038 * Math.cos(j * Math.PI);
    pos.push(r * Math.sin(a), base + t * height, r * Math.cos(a));
    if (i === cols || j === rows) continue;
    const ax = (i + 0.5) / cols * Math.PI * 2 - Math.PI, x = radius(t) * Math.sin(ax);
    if (!decorated && Math.abs(ax) < 0.72 && Math.abs(x) < 0.62 && t * height < 1.15 + Math.sqrt(Math.max(0, 0.62 ** 2 - x * x))) continue;
    const k = j * (cols + 1) + i;
    index.push(k, k + 1, k + cols + 1, k + 1, k + cols + 2, k + cols + 1);
  }
  const shellGeo = new THREE.BufferGeometry();
  shellGeo.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
  shellGeo.setIndex(index);
  shellGeo.computeVertexNormals();
  g.add(mesh(shellGeo, shell));
  if (!decorated) g.add(box(1.46, 2.3, 0.07, mat(1583931), 0, 1.18, 0.05));
  for (let i = 0; i < 11; i++) {
    const a = i * 2 * Math.PI / 11, span = 0.6 + 0.36 * Math.sin(i * 2.3) ** 2, top = base + height;
    const point = (r, y) => new THREE.Vector3(Math.sin(a) * r, y, Math.cos(a) * r);
    const curve = new THREE.CubicBezierCurve3(point(0.43, top - 0.04), point(0.56, top + 0.72), point(0.9, top + 1.05), point(0.68 + span, top + 0.1 + 0.37 * Math.cos(i * 1.6)));
    g.add(mesh(new THREE.TubeGeometry(curve, 12, 0.048, 6, false), blue));
    const end = curve.getPoint(1);
    g.add(mesh(new THREE.SphereGeometry(0.052, 8, 6), pale, end.x, end.y, end.z));
  }
  if (decorated) {
    for (let i = 0; i < 32; i++) {
      const a = i * 2 * Math.PI / 32, limb = mesh(new THREE.CylinderGeometry(0.035, 0.044, 0.46, 6), blue, 1.02 * Math.sin(a), 0.22, 1.02 * Math.cos(a));
      g.add(limb);
    }
    const label = document.createElement("canvas");
    label.width = 512;
    label.height = 80;
    const ctx = label.getContext("2d");
    ctx.fillStyle = "#de8526";
    ctx.font = "bold 54px Georgia";
    ctx.textAlign = "center";
    ctx.fillText("MARS CONCERT", 256, 58);
    const map = new THREE.CanvasTexture(label);
    map.colorSpace = THREE.SRGBColorSpace;
    const badge = mesh(new THREE.CylinderGeometry(1.49, 1.49, 0.42, 48, 1, true, -0.97, 1.94), new THREE.MeshLambertMaterial({ map, alphaTest: 0.3 }), 0, 1.63, 0);
    g.add(badge);
    for (const side of [-1, 1]) for (let j = 0; j < 8; j++) {
      const a = j * Math.PI / 4, petal = mesh(new THREE.SphereGeometry(0.13, 8, 6), mat(j % 2 ? 16497189 : 15374615), side * 1.17 + 0.13 * Math.cos(a), 1.7 + 0.16 * Math.sin(a), 0.91);
      petal.scale.set(0.68, 1.18, 0.45);
      petal.rotation.z = a - Math.PI / 2;
      g.add(petal);
    }
  }
  return g;
}
function aFrame() {
  const g = new THREE.Group(), profile = new THREE.Shape();
  const points = [[-2.05, 0], [-2.05, 1.94], [-0.1, 4.65], [0.12, 4.65], [2.05, 1.94], [2.05, 0], [0.54, 0], [0.54, 2.05], [-0.54, 2.05], [-0.54, 0]];
  points.forEach(([x, y], i) => i ? profile.lineTo(x, y) : profile.moveTo(x, y));
  profile.closePath();
  const geo = new THREE.ExtrudeGeometry(profile, { depth: 0.95, bevelEnabled: true, bevelThickness: 0.065, bevelSize: 0.065, bevelSegments: 2 });
  geo.translate(0, 0, -0.48);
  g.add(mesh(geo, mat(15854563)));
  return g;
}
function homeHouse() {
  const g = new THREE.Group(), white = mat(16117217), red = mat(9908010);
  function wing(x, w, h, d) {
    const wall = new THREE.Shape([[-w / 2, 0], [w / 2, 0], [w / 2, h], [0, h + 0.64], [-w / 2, h]].map((v) => new THREE.Vector2(...v)));
    const geo = new THREE.ExtrudeGeometry(wall, { depth: d, bevelEnabled: false });
    geo.translate(x, 0, -d / 2);
    g.add(mesh(geo, white));
    for (const s of [-1, 1]) {
      const roof = box(Math.hypot(w / 2 + 0.08, 0.67), 0.1, d + 0.16, red, x + s * w / 4, h + 0.34, 0);
      roof.rotation.z = -s * Math.atan2(0.64, w / 2);
      g.add(roof);
    }
    g.add(box(0.78, 0.81, 0.06, red, x, h - 0.54, d / 2 + 0.034), box(0.66, 0.69, 0.05, mat(3157033), x, h - 0.54, d / 2 + 0.073));
  }
  wing(-0.54, 1.6, 2.56, 1.6);
  wing(0.75, 1.02, 1.88, 1.75);
  g.add(box(0.36, 0.6, 0.42, red, 0.15, 2.85, -0.22));
  const c = document.createElement("canvas");
  c.width = 384;
  c.height = 180;
  const ctx = c.getContext("2d");
  ctx.fillStyle = "#762d30";
  ctx.textAlign = "center";
  for (const [label, y] of [["BACK", 46], ["TO THE MARS", 97], ["欢迎回家", 150]]) {
    ctx.font = "bold 44px Georgia, serif";
    ctx.fillText(label, 192, y);
  }
  const map = new THREE.CanvasTexture(c);
  map.colorSpace = THREE.SRGBColorSpace;
  g.add(mesh(new THREE.PlaneGeometry(1.43, 0.85), new THREE.MeshLambertMaterial({ map, alphaTest: 0.3 }), 0, 0.7, 0.9));
  for (const s of [-1, 1]) for (let i = 0; i < 8; i++) {
    const x = s * (1.68 + 0.33 * i), h = 0.62 + 0.45 * (0.5 + 0.5 * Math.sin(i * 0.55));
    g.add(box(0.13, h, 0.09, white, x, h / 2, -1.15), mesh(new THREE.ConeGeometry(0.1, 0.19, 4), white, x, h + 0.08, -1.15));
  }
  return g;
}
function umbrellaShade() {
  const g = new THREE.Group();
  g.add(box(0.35, 5.2, 0.35, mat(5918018), 0, 2.6, 0));
  const m = mesh(new THREE.ConeGeometry(5.6, 1.8, 4, 1, true), mat(5127987, { side: THREE.DoubleSide }), 0, 5.4, 0);
  m.rotation.x = Math.PI;
  m.rotation.y = Math.PI / 4;
  g.add(m);
  return g;
}
function bellTent() {
  const g = new THREE.Group();
  g.add(mesh(new THREE.ConeGeometry(2.3, 3, 14), mat(15987178)));
  g.children[0].position.y = 1.5;
  g.add(box(0.06, 3.4, 0.06, mat(9075302), 0, 1.7, 0));
  return g;
}
function starTent(r) {
  const g = new THREE.Group(), n = 8, pts = [];
  for (let i = 0; i < n * 2; i++) {
    const a = i / (n * 2) * Math.PI * 2, rr = i % 2 ? r * 0.45 : r;
    pts.push(new THREE.Vector2(Math.cos(a) * rr, Math.sin(a) * rr));
  }
  const geo = new THREE.ShapeGeometry(new THREE.Shape(pts));
  geo.rotateX(-Math.PI / 2);
  const top = mesh(geo, mat(16184816, { side: THREE.DoubleSide }), 0, 4.2, 0);
  g.add(top);
  g.add(box(0.2, 5.5, 0.2, mat(12434872), 0, 2.75, 0));
  for (let i = 0; i < n; i++) {
    const a = i / n * Math.PI * 2;
    g.add(box(0.12, 2.6, 0.12, mat(12434872), Math.cos(a) * r, 1.3, Math.sin(a) * r));
  }
  return g;
}
function campStage() {
  const g = new THREE.Group();
  g.add(box(16, 1.4, 9, mat(12070954), 0, 0.7, 0));
  g.add(box(16, 6, 0.4, mat(15921386), 0, 4.4, -4.2));
  for (const x of [-7.8, 7.8]) g.add(box(0.4, 8, 0.4, mat(2237222), x, 4, -3.6));
  g.add(box(16.4, 0.5, 9.4, mat(2763568), 0, 8, -0.2));
  return g;
}
function campStall(w = 6) {
  const g = new THREE.Group();
  g.add(box(w, 2.6, 2.4, mat(12070954), 0, 1.3, 0));
  const aw = box(w, 0.1, 1.6, mat(15987178), 0, 2.4, 1.9);
  aw.rotation.x = 0.25;
  g.add(aw);
  g.add(box(w - 1, 0.9, 0.08, mat(2827814), 0, 1.6, 1.22));
  return g;
}
function canteen() {
  const g = new THREE.Group();
  const divisions = 64, oval = 0.84;
  const radiusPoint = (r, angle, y) => new THREE.Vector3(r * Math.sin(angle), y, r * oval * Math.cos(angle));
  const plan = (left, right, depth, r, path = new THREE.Shape()) => {
    const z = depth / 2;
    path.moveTo(left + r, -z);
    path.lineTo(right - r, -z);
    path.quadraticCurveTo(right, -z, right, -z + r);
    path.lineTo(right, z - r);
    path.quadraticCurveTo(right, z, right - r, z);
    path.lineTo(left + r, z);
    path.quadraticCurveTo(left, z, left, z - r);
    path.lineTo(left, -z + r);
    path.quadraticCurveTo(left, -z, left + r, -z);
    return path;
  };
  const slab = (shape, height, material, y) => {
    const geo = new THREE.ExtrudeGeometry(shape, { depth: height, bevelEnabled: false, curveSegments: 5 });
    geo.rotateX(-Math.PI / 2);
    return mesh(geo, material, 0, y, 0);
  };
  const texture = (width, height, draw) => {
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    draw(canvas.getContext("2d"), width, height);
    const tex = new THREE.CanvasTexture(canvas);
    tex.colorSpace = THREE.SRGBColorSpace;
    tex.anisotropy = 8;
    return tex;
  };
  const band = (section, material, start = 0, end = Math.PI * 2, segments = divisions) => {
    const positions = [], uv = [], indices = [];
    for (let row = 0; row < section.length; row++) {
      const [r, y, rockBreak = 0] = section[row];
      for (let i = 0; i <= segments; i++) {
        const t = i / segments;
        const angle = THREE.MathUtils.lerp(start, end, t);
        const ledge = Math.sin(angle * 11) * 0.36 + Math.cos(angle * 17) * 0.25 + (hash(i % segments * 19) - 0.5) * 0.46;
        const p = radiusPoint(r + rockBreak * ledge, angle, y);
        positions.push(p.x, p.y, p.z);
        uv.push(t, row / (section.length - 1));
        if (row + 1 < section.length && i < segments) {
          const a = row * (segments + 1) + i, b = a + segments + 1;
          indices.push(a, a + 1, b, a + 1, b + 1, b);
        }
      }
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
    geo.setAttribute("uv", new THREE.Float32BufferAttribute(uv, 2));
    geo.setIndex(indices);
    geo.computeVertexNormals();
    const object = mesh(geo, material);
    g.add(object);
    return object;
  };
  const stone = texture(1024, 256, (ctx, w, h) => {
    ctx.fillStyle = "#483f35";
    ctx.fillRect(0, 0, w, h);
    for (let row = 0; row < 3; row++) for (let i = -1; i < 26; i++) {
      const seed = row * 67 + i * 7;
      const x = (i + row % 2 * 0.44 + (hash(seed + 2) - 0.5) * 0.25) * w / 25, y = row * h / 3;
      const tone = 32 + hash(seed) * 17;
      ctx.fillStyle = `hsl(${27 + hash(seed + 2) * 12} 17% ${tone}%)`;
      ctx.beginPath();
      ctx.moveTo(x + 2, y + 2 + hash(seed + 4) * 14);
      ctx.lineTo(x + 34, y - 3 + hash(seed + 6) * 20);
      ctx.lineTo(x + 39, y + h * 0.18);
      ctx.lineTo(x + 35, y + h / 3 - 9);
      ctx.lineTo(x + 12, y + h / 3 - 4 - hash(seed + 8) * 13);
      ctx.lineTo(x + 4, y + h * 0.2);
      ctx.closePath();
      ctx.fill();
      ctx.strokeStyle = "rgba(40,35,31,0.40)";
      ctx.beginPath();
      ctx.moveTo(x + 25, y + 8);
      ctx.lineTo(x + 17, y + 38);
      ctx.lineTo(x + 20, y + 58);
      ctx.stroke();
    }
  });
  band([[16.05, -2, 1.4], [16, 0.45, 1.15], [16.23, 2.75, 0.62]], new THREE.MeshStandardMaterial({ map: stone, roughness: 0.98 }));
  band([[16, 2.65], [19.35, 2.95], [21.6, 3.62], [21.6, 3.82], [19, 3.82]], mat(4541769));
  band([[21.62, 3.755], [21.63, 3.865]], mat(13028550));
  band([[21.62, 3.87], [19.03, 3.9]], mat(5464924));
  const transom = mat(4410954, { roughness: 0.48, metalness: 0.26 });
  const windowBottom = 4.9, windowSplit = 6.41, windowTop = 9.45, lowRadius = 18.98, highRadius = 20.35;
  const splitRadius = THREE.MathUtils.mapLinear(windowSplit, windowBottom, windowTop, lowRadius, highRadius);
  const glass = [5602675, 6063484, 7443338, 5865082].map((color) => mat(color, { roughness: 0.3, metalness: 0.08 }));
  band([[lowRadius, 3.9], [lowRadius, windowBottom]], mat(5465439));
  band([[lowRadius, windowBottom], [splitRadius, windowSplit]], mat(3427398, { roughness: 0.34 }));
  const full = Math.PI * 2, bay = full / divisions;
  for (let i = 0; i < divisions; i++) {
    const a = i * bay, stop = a + bay;
    band([[splitRadius, windowSplit], [highRadius, windowTop]], glass[(i * 13 + Math.floor(i / 7)) % glass.length], a, stop, 1);
    const mullion = box(0.09, 1, 0.1, transom, 0, 0, 0);
    const bottom = radiusPoint(lowRadius + 0.035, a, windowBottom);
    const top = radiusPoint(highRadius + 0.035, a, windowTop);
    mullion.position.copy(bottom).lerp(top, 0.5);
    mullion.scale.y = bottom.distanceTo(top);
    mullion.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), top.sub(bottom).normalize());
    g.add(mullion);
  }
  const glassMarks = texture(1024, 192, (ctx, w, h) => {
    ctx.fillStyle = "#b6c9bf";
    for (let i = 0; i < 32; i++) {
      ctx.beginPath();
      ctx.arc(18 + hash(i * 13) * (w - 36), 26 + hash(i * 19 + 3) * (h - 58), 2 + hash(i * 9 + 5) * 4, 0, full);
      ctx.fill();
    }
    ctx.fillStyle = "#953342";
    ctx.font = '700 78px "PingFang SC", "Noto Sans CJK SC", sans-serif';
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    [..."火星食堂"].forEach((letter, i) => ctx.fillText(letter, (0.325 + i * 0.11) * w, h * 0.37));
  });
  const marks = band(
    [[lowRadius + 0.027, windowBottom], [highRadius + 0.027, windowTop]],
    new THREE.MeshStandardMaterial({ map: glassMarks, alphaTest: 0.42, roughness: 0.78 }),
    -4 * bay,
    14 * bay,
    18
  );
  marks.castShadow = false;
  band([[19.49, 6.38], [19.53, 6.49]], transom);
  band([[20.4, 9.37], [22.66, 9.64], [22.66, 9.8]], mat(11450549));
  const roof = texture(1024, 128, (ctx, w, h) => {
    ctx.fillStyle = "#cdd4d1";
    ctx.fillRect(0, 0, w, h);
    ctx.strokeStyle = "#8f9996";
    ctx.lineWidth = 1;
    for (let i = 0; i < divisions; i++) ctx.strokeRect(i * w / divisions, 1, w / divisions, h - 2);
    ctx.beginPath();
    ctx.moveTo(0, h * 0.49);
    ctx.lineTo(w, h * 0.49);
    ctx.stroke();
  });
  const deck = texture(1024, 128, (ctx, w, h) => {
    for (let j = 0; j < 24; j++) {
      const y = j * h / 24;
      ctx.fillStyle = `hsl(29 24% ${34 + hash(j * 11) * 12}%)`;
      ctx.fillRect(0, y, w, h / 24);
      ctx.fillStyle = "rgba(28,21,15,0.26)";
      ctx.fillRect(0, y, w, 1);
      for (let x = j % 3 * 8; x < w; x += 26) ctx.fillRect(x, y, 1, h / 24);
    }
  });
  band([[22.66, 9.8], [21, 10.18], [18.95, 10.58]], new THREE.MeshStandardMaterial({ map: roof, roughness: 0.77 }));
  band([[18.95, 10.58], [10.25, 10.58]], new THREE.MeshStandardMaterial({ map: deck, roughness: 0.82 }));
  band([[10.25, 10.58], [10.25, 4.13]], mat(4542023));
  band([[10.25, 4.14], [0.01, 4.14]], mat(2699821));
  const railMetal = mat(11121837, { metalness: 0.35, roughness: 0.47 });
  const glassRail = (color, opacity) => new THREE.MeshStandardMaterial({ color, roughness: 0.24, transparent: true, opacity, depthWrite: false, side: THREE.DoubleSide });
  const clearRail = glassRail(9546400, 0.3), lowerRail = glassRail(3563089, 0.68);
  for (const [r, y, shift, railMaterial] of [[21.4, 3.89, 0.01, lowerRail], [18.91, 10.58, 0.015, clearRail], [10.37, 10.58, -0.02, clearRail]]) {
    const railing = band([[r, y + 0.1], [r, y + 0.98]], railMaterial);
    railing.castShadow = false;
    band([[r + shift + 0.025, y + 0.97], [r + shift + 0.025, y + 1.02], [r + shift - 0.025, y + 1.02]], railMetal);
    for (let i = 0; i < divisions; i++) {
      const p = radiusPoint(r + shift, i * bay, y + 0.5);
      g.add(box(0.035, 1, 0.035, railMetal, p.x, p.y, p.z));
    }
  }
  const deckFrame = new THREE.Group();
  deckFrame.position.copy(radiusPoint(13.55, 1.12, 10.59));
  deckFrame.rotation.y = -0.14;
  const frameOutline = plan(-1.76, 1.76, 2.37, 0.4);
  frameOutline.holes.push(plan(-1.44, 1.44, 1.72, 0.26, new THREE.Path()));
  deckFrame.add(slab(frameOutline, 0.63, mat(2501675), 0), slab(frameOutline, 0.08, mat(14803413), 0.63));
  deckFrame.add(box(3.18, 0.075, 1.96, mat(3489851), 0, 0.1, 0));
  const insetEdge = mat(13882054);
  deckFrame.add(box(1.74, 0.13, 0.18, insetEdge, -0.13, 0.4, 0.35));
  deckFrame.add(box(0.18, 0.13, 0.94, insetEdge, 0.71, 0.4, 0));
  deckFrame.add(box(0.62, 0.13, 0.18, insetEdge, 0.43, 0.4, -0.4));
  deckFrame.add(box(0.14, 0.17, 1.34, mat(6648424), -0.57, 0.24, -0.05));
  const flecks = texture(384, 60, (ctx, w, h) => {
    ctx.strokeStyle = "#c7d0ca";
    ctx.lineWidth = 2.5;
    for (let i = 0; i < 4; i++) {
      const x = (0.14 + i * 0.23) * w;
      ctx.beginPath();
      ctx.ellipse(x, h * 0.46, 7 + i % 2 * 3, 9, 0.18, 0.55, 5.7);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(x - 5, h * 0.56);
      ctx.lineTo(x + 6, h * 0.33);
      ctx.stroke();
    }
  });
  const marksOnFrame = mesh(new THREE.PlaneGeometry(2.84, 0.47), new THREE.MeshStandardMaterial({ map: flecks, alphaTest: 0.35 }), 0, 0.34, 1.188);
  marksOnFrame.castShadow = false;
  deckFrame.add(marksOnFrame);
  g.add(deckFrame);
  const leftDeck = new THREE.Group();
  leftDeck.position.set(-12.55, 10.59, 4.2);
  leftDeck.rotation.y = -0.19;
  leftDeck.add(box(4.35, 0.45, 1.75, mat(3160114), 0, 0.225, 0), box(4.48, 0.13, 1.81, mat(10132366), 0, 0.5, 0));
  leftDeck.add(box(2.91, 0.37, 0.9, mat(3160114), 0.93, 0.185, -1.21), box(3.02, 0.09, 0.94, mat(11579040), 0.93, 0.412, -1.21));
  g.add(leftDeck);
  const tower = new THREE.Group(), dark = mat(2303785, { roughness: 0.76 });
  tower.matrixAutoUpdate = false;
  tower.matrix.set(1, 0.14, 0, -5.05, 0, 1, 0, 9.85, 0, -0.03, 1, -1.8, 0, 0, 0, 1);
  tower.add(slab(plan(-5.25, 5.25, 9.2, 0.45), 11.68, dark, 0));
  const stripPoints = [[-0.85, 4.64], [2.6, 4.64], [4.77, 4.64], [5.24, 4.39], [5.28, 3.85], [5.28, -0.62]];
  const stripe = new THREE.CatmullRomCurve3(stripPoints.map(([x, z]) => new THREE.Vector3(x, 6.12, z)));
  tower.add(mesh(new THREE.TubeGeometry(stripe, 26, 0.05, 6), mat(6515044)));
  tower.add(mesh(new THREE.SphereGeometry(0.105, 8, 6), mat(12896188), -0.85, 6.12, 4.655));
  const parapet = plan(-5.25, 5.25, 9.2, 0.45);
  parapet.holes.push(plan(-5.05, 5.05, 8.8, 0.3, new THREE.Path()));
  tower.add(slab(parapet, 0.96, dark, 11.68));
  tower.add(slab(parapet, 0.08, mat(7633267), 12.64));
  tower.add(slab(plan(-5.2, -0.4, 9.1, 0.37), 0.14, mat(9541522), 12.66));
  const steel = mat(6581092, { metalness: 0.38, roughness: 0.62 });
  for (const z of [-2.52, 0.12, 2.62]) tower.add(box(5.5, 0.12, 0.13, steel, 2.31, 12.46, z));
  for (const x of [-0.37, 2.42]) tower.add(box(0.13, 0.18, 8.86, steel, x, 12.47, 0));
  const door = mat(6911859);
  tower.add(box(0.9, 1.52, 0.045, door, -2.3, 1.51, 4.625));
  tower.add(box(0.68, 1.33, 0.04, dark, -2.3, 1.51, 4.656));
  const logo = texture(192, 192, (ctx, w, h) => drawMarsLogo(ctx, (x, y) => [w * 0.5 + x * 70, h * 0.2 + y * 77], "#e7eae2"));
  const brand = mesh(new THREE.PlaneGeometry(4.55, 4.55), new THREE.MeshStandardMaterial({ map: logo, alphaTest: 0.37, roughness: 0.7 }), 5.278, 9.78, 1.94);
  brand.rotation.y = Math.PI / 2;
  brand.castShadow = false;
  tower.add(brand);
  g.add(tower);
  return g;
}
function carousel() {
  const g = new THREE.Group();
  g.add(mesh(new THREE.CylinderGeometry(7, 7, 0.8, 32), mat(15260868), 0, 0.4, 0));
  for (let i = 0; i < 12; i++) {
    const a = i / 12 * Math.PI * 2;
    g.add(box(0.15, 4.5, 0.15, mat(13939290), Math.cos(a) * 5.5, 2.6, Math.sin(a) * 5.5));
  }
  const roof = mesh(new THREE.ConeGeometry(7.6, 3.2, 24), mat(12991306), 0, 6.6, 0);
  g.add(roof);
  g.add(mesh(new THREE.CylinderGeometry(7.6, 7.6, 0.8, 24), mat(15985112), 0, 4.8, 0));
  return g;
}
const CAMP = {
  umbrellas: [[-88, 16], [-74, 28], [-100, 30]],
  whiteTents: [[-80, 6], [-95, 8], [-66, 14]],
  eggs: [[-60, 70], [48, 96], [96, 132], [-30, 160], [-118, 128], [150, 176]],
  aframes: [[-74, 112], [16, 74], [70, 64], [-44, 142], [122, 104], [-150, 170]],
  home: [26, 158],
  canteen: [-215, 150],
  carousel: [-245, 250],
  steps2: [],
  paths: () => {
    const zig = [], t1 = [], t2 = [];
    for (let lz = 48; lz <= 230; lz += 3) zig.push([10 + 55 * Math.sin(lz / 46), lz]);
    for (let lx = -170; lx <= 230; lx += 4) t1.push([lx, 74 + 26 * 1 - 10 * Math.sin(lx / 40) + 1.5]);
    for (let lx = -150; lx <= 210; lx += 4) t2.push([lx, 48 + 26 * 4 - 10 * Math.sin(lx / 40) + 1.5]);
    return [zig, t1, t2];
  },
  pitPaths: [
    [[-395, 33], [-396, 48], [-407, 62], [-425, 82], [-435, 105]],
    [[-393, -37], [-379, -33], [-362, -35], [-346, -42]]
  ],
  bellTents: [[-445, -110], [-420, -95], [-450, -75], [-410, -60], [-440, -40], [-415, -20], [-452, -5], [-425, 10], [-405, 25], [-440, 30], [-412, -125], [-455, 20], [-402, -90], [-430, 45]]
};
function campFrame() {
  const C = LAYOUT.marsCamp, a = C.azimuth * Math.PI / 180, x0 = Math.cos(a) * C.r, z0 = Math.sin(a) * C.r, rot = Math.atan2(-x0, -z0), c = Math.cos(rot), s = Math.sin(rot);
  return {
    x0,
    z0,
    rot,
    toLocal: (x, z) => {
      const dx = x - x0, dz = z - z0;
      return [dx * c - dz * s, dx * s + dz * c];
    },
    toWorld: (lx, lz) => [x0 + lx * c + lz * s, z0 - lx * s + lz * c]
  };
}
let heightFn = null, frame = null;
function plazaTreadHeight(base, level) {
  return base - plazaGrade * plazaStairs.front + level * plazaStairs.rise;
}
function buildPlazaStairs(base) {
  const { x, front, width, count, tread } = plazaStairs;
  const bottom = plazaTreadHeight(base, 0) - 0.25;
  const profile = new THREE.Shape();
  profile.moveTo(-front, bottom);
  for (let i = 0; i < count; i++) {
    const y = plazaTreadHeight(base, i + 1);
    profile.lineTo(-front + i * tread, y);
    profile.lineTo(-front + (i + 1) * tread, y);
  }
  profile.lineTo(-front + count * tread, bottom);
  profile.closePath();
  const geo = new THREE.ExtrudeGeometry(profile, { depth: width, bevelEnabled: false });
  geo.rotateY(Math.PI / 2).translate(x - width / 2, 0, 0);
  const steps = mesh(geo, mat(9737100, { roughness: 0.97 }));
  steps.name = "字牌广场灰色台阶";
  return steps;
}
function campGroundAt(x, z) {
  heightFn ||= meshHeight(LAYOUT.marsCamp.base);
  frame ||= campFrame();
  const [lx, lz] = frame.toLocal(x, z);
  if (lx <= -695 || lx >= 455 || lz <= -315 || lz >= 335) return null;
  const ground = Math.max(0, heightFn(lx, lz));
  const { x: center, width, front, tread, count } = plazaStairs;
  const run = front - lz;
  if (Math.abs(lx - center) <= width / 2 && run >= 0 && run <= tread * count) {
    return Math.max(ground, plazaTreadHeight(LAYOUT.marsCamp.base, Math.min(count, 1 + Math.floor(run / tread))));
  }
  return ground;
}
function buildMarsCamp() {
  const C = LAYOUT.marsCamp, F = campFrame(), x0 = F.x0, z0 = F.z0;
  const root = new THREE.Group();
  root.position.set(x0, 0, z0);
  root.rotation.y = F.rot;
  const H = heightFn ||= meshHeight(C.base);
  const on = (o, lx, lz, rot = 0) => {
    o.position.set(lx, H(lx, lz), lz);
    o.rotation.y = rot;
    return o;
  };
  const paths = CAMP.paths(), pathsTexture = makePathTexture(paths);
  const fineGrass = new THREE.TextureLoader().load(muhlyDetail);
  fineGrass.wrapS = fineGrass.wrapT = THREE.RepeatWrapping;
  fineGrass.anisotropy = 8;
  root.add(terrain(H, pathsTexture, fineGrass));
  root.add(sign(C.base));
  {
    const geo = new THREE.IcosahedronGeometry(1, 1), m = new THREE.MeshStandardMaterial({ color: 16777215, roughness: 1 }), N = 1600, random = rng(1926);
    const trees = new THREE.InstancedMesh(geo, m, N), M4 = new THREE.Matrix4(), q = new THREE.Quaternion(), col = new THREE.Color();
    let n = 0, guard = 0;
    while (n < N && guard++ < 4e4) {
      const lx = -680 + random() * 1120, lz = -310 + random() * 560, y = H(lx, lz);
      const flatPlaza = lz > -6 && lz < 50 && Math.abs(lx - 10) < 120, pinkF = lz >= 50 && lz < 220 && Math.abs(lx - 30) < 215, inPit = Math.abs(lx - PIT.x) < PIT.hw + 2 && Math.abs(lz - PIT.z) < PIT.hh + 2;
      const atCanteen = Math.hypot((lx - CAMP.canteen[0]) / 25, (lz - CAMP.canteen[1]) / 22) < 1;
      const southApproach = Math.abs(lx - PIT.x) < 52 && lz > PIT.z + 60 && lz < 124;
      const eastApproach = lx > PIT.x + 30 && lx < PIT.x + 93 && Math.abs(lz + 37) < 10;
      if (flatPlaza || pinkF || inPit || atCanteen || southApproach || eastApproach) continue;
      const e = 0.6, sl = Math.abs(H(lx + e, lz) - H(lx - e, lz)) + Math.abs(H(lx, lz + e) - H(lx, lz - e));
      if (sl > 1.6) continue;
      const r = 2.4 + random() * 2.6;
      M4.compose(new THREE.Vector3(lx, y + r * 0.7, lz), q, new THREE.Vector3(r, r * (0.8 + random() * 0.4), r));
      trees.setMatrixAt(n, M4);
      trees.setColorAt(n, col.setHSL(0.25 + random() * 0.07, 0.38 + random() * 0.17, 0.2 + random() * 0.11));
      n++;
    }
    trees.count = n;
    trees.castShadow = false;
    trees.receiveShadow = true;
    trees.userData.dynamic = true;
    root.add(trees);
  }
  {
    const l0 = bowlLine(-45), pts = [];
    for (let lz = l0 + 1; lz >= l0 - 34; lz -= 0.7) pts.push([-45 + 1.2 * Math.sin(lz / 6), lz]);
    root.add(ribbon(H, pts, 3.2, mat(16054007, { roughness: 0.3, emissive: 1842204 })));
  }
  root.add(pinkMuhly(H, paths, pathsTexture, fineGrass));
  const cord = new THREE.LineBasicMaterial({ color: 9336150 }), peg = mat(7495501);
  paths.forEach((path, k) => {
    const others = paths.filter((_, i) => i !== k).flatMap((line) => line.slice(1).map((b, i) => [line[i], b]));
    const inCrossing = (x, z) => others.some(([[ax, az], [bx, bz]]) => {
      const dx = bx - ax, dz = bz - az, t = THREE.MathUtils.clamp(((x - ax) * dx + (z - az) * dz) / (dx * dx + dz * dz), 0, 1);
      return Math.hypot(x - ax - t * dx, z - az - t * dz) < 2.1;
    });
    for (const side of [-1, 1]) {
      let run = [];
      const finish = () => {
        if (run.length > 1) root.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(run), cord));
        run = [];
      };
      for (let i = 0; i < path.length; i++) {
        const [x, z] = path[i], [ax, az] = path[Math.max(0, i - 1)], [bx, bz] = path[Math.min(path.length - 1, i + 1)];
        const len = Math.hypot(bx - ax, bz - az), px = x - (bz - az) * 1.65 * side / len, pz = z + (bx - ax) * 1.65 * side / len;
        const prev = run.at(-1);
        if (inCrossing(px, pz)) {
          finish();
          continue;
        }
        if (prev && inCrossing((prev.x + px) / 2, (prev.z + pz) / 2)) finish();
        const y = H(px, pz);
        const last = run.at(-1);
        if (last) run.push(new THREE.Vector3((last.x + px) / 2, (last.y + y + 0.68) / 2 - 0.06, (last.z + pz) / 2));
        run.push(new THREE.Vector3(px, y + 0.68, pz));
        root.add(box(0.055, 0.76, 0.055, peg, px, y + 0.38, pz));
      }
      finish();
    }
  });
  CAMP.umbrellas.forEach(([lx, lz]) => root.add(on(umbrellaShade(), lx, lz)));
  CAMP.whiteTents.forEach(([lx, lz]) => root.add(on(box(4, 2.6, 4, mat(15987178)), lx, lz).translateY(1.3)));
  root.add(buildPlazaStairs(C.base));
  CAMP.eggs.forEach(([lx, lz], i) => root.add(on(eggHut(i === 1), lx, lz, i === 1 ? -0.2 : 0.14 * i)));
  CAMP.aframes.forEach(([lx, lz], i) => root.add(on(aFrame(), lx, lz, 0.3 * i)));
  root.add(on(homeHouse(), ...CAMP.home, 0.2));
  root.add(on(canteen(), ...CAMP.canteen, 0.4));
  root.add(on(carousel(), ...CAMP.carousel));
  {
    const P = PIT, ring = [];
    for (const [x, z] of [[-1, -1], [1, -1], [1, 1], [-1, 1], [-1, -1]]) ring.push([P.x + x * (P.hw - (x < 0 ? 8 : 3)), P.z + z * (P.hh - 3)]);
    const dense = [];
    for (let k = 0; k < ring.length - 1; k++) for (let t = 0; t < 1; t += 0.05) dense.push([ring[k][0] + (ring[k + 1][0] - ring[k][0]) * t, ring[k][1] + (ring[k + 1][1] - ring[k][1]) * t]);
    dense.push(ring[0]);
    root.add(ribbon(H, dense, 4, mat(5211842, { roughness: 0.85 })));
    for (const [i, path] of CAMP.pitPaths.entries()) {
      const points = [];
      for (let j = 1; j < path.length; j++) {
        const [x, z] = path[j - 1], [bx, bz] = path[j], steps = Math.ceil(Math.hypot(bx - x, bz - z) / 1.5);
        for (let q = 0; q < steps; q++) points.push([x + (bx - x) * q / steps, z + (bz - z) * q / steps]);
      }
      points.push(path.at(-1));
      root.add(ribbon(H, points, 4, mat(i ? 6723517 : 11512224)));
    }
    root.add(on(campStage(), P.x, P.z - P.hh + 9));
    root.add(on(starTent(11), P.x - 4, P.z - 30));
    CAMP.bellTents.forEach(([lx, lz], i) => root.add(on(bellTent(), lx, lz, i)));
    for (let k = 0; k < 13; k++) root.add(on(campStall(), P.x - P.hw + 2.7, P.z - P.hh + 20 + k * 12, Math.PI / 2));
  }
  root.updateMatrixWorld(true);
  const tag = (name, lx, ly, lz) => {
    const o = new THREE.Group();
    o.position.copy(root.localToWorld(new THREE.Vector3(lx, ly, lz)));
    o.userData.label = name;
    return o;
  };
  return [root, tag("华莱坞（MARS CONCERT 字牌）", 0, C.base + 26, 0), tag("火星食堂", CAMP.canteen[0], H(...CAMP.canteen) + 24, CAMP.canteen[1]), tag("火星营地（坑）", PIT.x, H(PIT.x, PIT.z) + 14, PIT.z), tag("粉黛草", 40, H(40, 130) + 10, 130)];
}
export {
  CAMP,
  PIT,
  buildMarsCamp,
  campFrame,
  campGroundAt
};
