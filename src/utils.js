// 2D distance on XZ plane (ignores Y — critical for top-down collision)
export function distXZ(a, b) {
  const dx = a.x - b.x, dz = a.z - b.z;
  return Math.sqrt(dx * dx + dz * dz);
}
