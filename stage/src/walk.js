import { LAYOUT } from './layout.js';
import { walkBarrierRuns } from './venue/barriers.js';

const shoulderRadius = 0.28;
const radiusSquared = shoulderRadius ** 2;

const liftCrossingSet = new Set(LAYOUT.liftCrossingEdges.map((seg) => seg.join(',')));

const rails = walkBarrierRuns.map((seg) => {
  const [x0, z0, x1, z1] = seg;
  const dx = x1 - x0, dz = z1 - z0;
  return {
    x0, z0, dx, dz, lengthSquared: dx * dx + dz * dz,
    minX: Math.min(x0, x1) - shoulderRadius, maxX: Math.max(x0, x1) + shoulderRadius,
    minZ: Math.min(z0, z1) - shoulderRadius, maxZ: Math.max(z0, z1) + shoulderRadius,
    // 延伸台横穿圆台围栏处的空气墙只拦地面观众（y < 1.0），站在延伸台台面上的人可以畅通走过
    groundOnly: liftCrossingSet.has(seg.join(',')),
  };
});

function distanceSquared(x, z, rail) {
  const along = ((x - rail.x0) * rail.dx + (z - rail.z0) * rail.dz) / rail.lengthSquared;
  const t = Math.max(0, Math.min(1, along));
  return (x - rail.x0 - t * rail.dx) ** 2 + (z - rail.z0 - t * rail.dz) ** 2;
}

function blocked(x, z, fromX, fromZ, y) {
  return rails.some((rail) => {
    if (rail.groundOnly && y >= 1.0) return false;
    if (x < rail.minX || x > rail.maxX || z < rail.minZ || z > rail.maxZ) return false;
    const next = distanceSquared(x, z, rail);
    return next < radiusSquared && next < distanceSquared(fromX, fromZ, rail);
  });
}

export function walkThroughVenue(position, dx, dz) {
  const y = position.y ?? 0;
  // Smaller steps keep sprinting from skipping over the rail. Separate x/z tests allow sliding along it.
  const steps = Math.max(1, Math.ceil(Math.hypot(dx, dz) / (shoulderRadius * 0.5)));
  const stepX = dx / steps, stepZ = dz / steps;
  for (let i = 0; i < steps; i++) {
    const { x, z } = position;
    if (stepX && !blocked(x + stepX, z, x, z, y)) position.x += stepX;
    if (stepZ && !blocked(position.x, z + stepZ, position.x, z, y)) position.z += stepZ;
  }
}
