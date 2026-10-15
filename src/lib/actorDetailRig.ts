import type { DealerManifest, DealerExpression } from "@/data/dealerCharacters";

export type Point = [number, number];
export type Matrix = [number, number, number, number, number, number];
const clamp = (value: number, min = 0, max = 1) => Math.max(min, Math.min(max, value));
export const matrixText = (matrix: Matrix) => `matrix(${matrix.map(value => value.toFixed(5)).join(" ")})`;
export const polygonText = (points: Point[]) => points.map(point => point.map(value => value.toFixed(4)).join(",")).join(" ");

/** Affine skinning: each painted source triangle follows its three mesh vertices. */
export function triangleMatrix(source: [Point, Point, Point], target: [Point, Point, Point]): Matrix {
  const [p, q, r] = source, [a, b, c] = target;
  const sx = q[0] - p[0], sy = q[1] - p[1], tx = r[0] - p[0], ty = r[1] - p[1];
  const determinant = sx * ty - sy * tx;
  if (Math.abs(determinant) < 1e-8) throw new Error("Degenerate source mesh triangle");
  const ux = b[0] - a[0], uy = b[1] - a[1], vx = c[0] - a[0], vy = c[1] - a[1];
  const m0 = (ux * ty - vx * sy) / determinant, m2 = (vx * sx - ux * tx) / determinant;
  const m1 = (uy * ty - vy * sy) / determinant, m3 = (vy * sx - uy * tx) / determinant;
  return [m0, m1, m2, m3, a[0] - m0 * p[0] - m2 * p[1], a[1] - m1 * p[0] - m3 * p[1]];
}
export function applyMatrix(matrix: Matrix, point: Point): Point {
  return [matrix[0] * point[0] + matrix[2] * point[1] + matrix[4], matrix[1] * point[0] + matrix[3] * point[1] + matrix[5]];
}

export interface FingerDefinition { name: string; root: Point; tip: Point; width: number; joints: number[]; }
/** Normalized palm coordinates shared by dedicated human textures and existing feline paw art. */
export function fingerDefinitions(character: DealerManifest, side: 0 | 1): FingerDefinition[] {
  const fingers: FingerDefinition[] = character.kind === "cat" ? [
    { name: "inner-toe", root: [.28, .69], tip: [.25, .87], width: .18, joints: [.0, .55, 1] },
    { name: "middle-inner-toe", root: [.43, .74], tip: [.42, .96], width: .19, joints: [0, .52, 1] },
    { name: "middle-outer-toe", root: [.61, .73], tip: [.63, .94], width: .19, joints: [0, .52, 1] },
    { name: "outer-toe", root: [.77, .64], tip: [.81, .85], width: .16, joints: [0, .55, 1] },
  ] : [
    { name: "thumb", root: [.27, .50], tip: [.09, .76], width: .15, joints: [0, .5, 1] },
    { name: "index", root: [.37, .66], tip: [.36, .91], width: .13, joints: [0, .42, .75, 1] },
    { name: "middle", root: [.51, .65], tip: [.53, .99], width: .14, joints: [0, .42, .75, 1] },
    { name: "ring", root: [.65, .64], tip: [.67, .95], width: .13, joints: [0, .42, .75, 1] },
    { name: "little", root: [.78, .60], tip: [.79, .84], width: .12, joints: [0, .42, .75, 1] },
  ];
  return fingers.map(finger => ({ ...finger, root: [side ? 1 - finger.root[0] : finger.root[0], finger.root[1]],
    tip: [side ? 1 - finger.tip[0] : finger.tip[0], finger.tip[1]] }));
}

export function fingerSkin(finger: FingerDefinition, box: { x: number; y: number; width: number; height: number }, curl: number, index: number, cat: boolean) {
  const root: Point = [box.x + finger.root[0] * box.width, box.y + finger.root[1] * box.height];
  const tip: Point = [box.x + finger.tip[0] * box.width, box.y + finger.tip[1] * box.height];
  const dx = tip[0] - root[0], dy = tip[1] - root[1], length = Math.hypot(dx, dy);
  const axis: Point = [dx / length, dy / length], normal: Point = [-axis[1], axis[0]], half = finger.width * box.width / 2;
  const sourceAt = (t: number, width = half): [Point, Point] => [
    [root[0] + dx * t + normal[0] * width, root[1] + dy * t + normal[1] * width],
    [root[0] + dx * t - normal[0] * width, root[1] + dy * t - normal[1] * width],
  ];
  const amount = clamp(curl) * (cat ? .32 : 1) * (.87 + index * .035);
  let angle = 0, joint: Point = [...root];
  const bones = finger.joints.slice(1).map((end, bone) => {
    const start = finger.joints[bone], distance = (end - start) * length;
    angle += amount * (bone === 0 ? 26 : bone === 1 ? 52 : 28);
    const cosine = Math.cos(angle * Math.PI / 180), projection = Math.abs(cosine) < .06 ? .06 * (cosine < 0 ? -1 : 1) : cosine;
    const next: Point = [joint[0] + axis[0] * distance * projection, joint[1] + axis[1] * distance * projection];
    const [sl, sr] = sourceAt(start), [el, er] = sourceAt(end);
    const target: [Point, Point, Point] = [[joint[0] + normal[0] * half, joint[1] + normal[1] * half],
      [joint[0] - normal[0] * half, joint[1] - normal[1] * half], [next[0] + normal[0] * half, next[1] + normal[1] * half]];
    const matrix = triangleMatrix([sl, sr, el], target), origin = joint;
    joint = next;
    return { matrix, clip: [sl, sr, er, el], angle, origin, end: next, length: distance };
  });
  const [rl, rr] = sourceAt(0), [tl, tr] = sourceAt(1);
  return { root, footprint: [rl, rr, tr, tl], bones };
}

export function clothSkin(width: number, sourceLength: number, targetLength: number, bend: number, gravity: number) {
  const rows = 4, height = sourceLength + 39, tension = clamp(Math.abs(bend) / 100), sag = clamp(gravity, -3, 3);
  const source: Point[][] = [], target: Point[][] = [];
  for (let row = 0; row <= rows; row++) {
    const t = row / rows, falloff = Math.sin(t * Math.PI), center = sag * falloff;
    const half = width / 2 * (1 - tension * .055 * falloff);
    const y = -18 + (targetLength + 39) * t - tension * 3 * Math.sin(t * Math.PI * 2);
    source.push([[-width / 2, -18 + height * t], [width / 2, -18 + height * t]]);
    target.push([[center - half, y], [center + half, y]]);
  }
  return source.slice(0, -1).flatMap((points, row) => [
    { source: [points[0], points[1], source[row + 1][0]] as [Point, Point, Point], target: [target[row][0], target[row][1], target[row + 1][0]] as [Point, Point, Point] },
    { source: [points[1], source[row + 1][1], source[row + 1][0]] as [Point, Point, Point], target: [target[row][1], target[row + 1][1], target[row + 1][0]] as [Point, Point, Point] },
  ]).map(triangle => ({ ...triangle, matrix: triangleMatrix(triangle.source, triangle.target), tension }));
}

export function actorEyeProfile(character: DealerManifest, expression: DealerExpression = "normal") {
  const [x, y, spacing] = character.portrait!.eyes;
  const calibrated: Record<string, Point[]> = {
    "star-moon": [[479.45, 102.85], [520.42, 102.47]], scholar: [[482.55, 83.66], [516.49, 83.59]],
    quqi: [[476.41, 90.04], [523.77, 89.99]], "star-cap": [[477.01, 121.94], [523.27, 122.10]],
  };
  // The cats lower their faces in the focus painting. Each eye texture must use
  // that expression's coordinates rather than the open, upright face anchors.
  const expressions: Record<string, Partial<Record<DealerExpression, Point[]>>> = {
    quqi: { smile: [[476.6, 89.89], [524.58, 89.94]], focus: [[477.93, 97.04], [523.18, 97.37]], closed: [[475.23, 90.36], [524.39, 90.88]], thinking: [[471.04, 86.25], [522.52, 85]] },
    "star-cap": { smile: [[477.72, 121.92], [523.11, 122.05]], focus: [[477.46, 139.99], [522.77, 140.39]], closed: [[477.82, 127.7], [521.99, 127.58]], thinking: [[475.06, 120.01], [523.85, 119.16]] },
    "star-moon": { smile: [[478.23, 102.83], [521.96, 101.88]], closed: [[479.65, 106.71], [520.51, 103.8]], thinking: [[478.25, 102.23], [524.46, 100.18]] },
    scholar: { smile: [[482.46, 83.57], [517.07, 83.64]], closed: [[484.2, 82.56], [520, 83.55]], thinking: [[479.84, 81.82], [519.55, 83.2]] },
  };
  return { centers: expressions[character.id]?.[expression] ?? calibrated[character.id] ?? [[x - spacing, y], [x + spacing, y]] as Point[], rx: character.kind === "cat" ? 8 : 6.5,
    ry: character.kind === "cat" ? 3.8 : 2.8, iris: character.kind === "cat" ? expression === "focus" ? 2.8 : 3.3 : 2.6,
    sclera: character.kind === "cat" ? "#b4aa88" : "#dbc9b9" };
}
export function hairLocks(character: DealerManifest) {
  if (character.id === "star-moon") return [
    { pivot: [449, 54] as Point, path: "M442 49Q456 39 455 57C448 82 426 108 422 140L433 134C438 107 455 84 460 59Z" },
    { pivot: [552, 70] as Point, path: "M550 64C576 92 550 122 563 146C581 176 549 204 560 233C573 259 548 281 551 307L560 308C556 282 582 261 570 232C555 203 587 177 573 146C558 120 584 94 560 64Z" },
  ];
  if (character.id === "scholar") return [
    { pivot: [450, 32] as Point, path: "M443 28Q459 23 456 40Q445 70 433 95L438 112Q437 84 451 75Q462 46 465 35Z" },
    { pivot: [548, 35] as Point, path: "M542 29Q563 24 562 44Q551 73 564 105L553 106Q543 78 553 47L544 41Z" },
  ];
  const y = character.id === "star-cap" ? 114 : 82;
  return [
    { pivot: [444, y] as Point, path: `M438 ${y - 4}Q430 ${y + 18}442 ${y + 44}L437 ${y + 59}L450 ${y + 46}Q438 ${y + 22}448 ${y}Z` },
    { pivot: [556, y] as Point, path: `M562 ${y - 4}Q570 ${y + 18}558 ${y + 44}L563 ${y + 59}L550 ${y + 46}Q562 ${y + 22}552 ${y}Z` },
  ];
}
export function hairMotion(lean: number, gaze: number[], progress: number, side: number) {
  const p = clamp(progress), transient = Math.sin(Math.PI * p) * Math.sin(Math.PI * 6 * p) * .18;
  return clamp(lean * .75 + gaze[0] * .04 + transient * (side ? -1 : 1), -.65, .65);
}
export function actorAttention(progress: number) {
  const smooth = (value: number) => { const t = clamp(value); return t * t * (3 - 2 * t); };
  return smooth((progress - .16) / .14) * (1 - smooth((progress - .80) / .14));
}
