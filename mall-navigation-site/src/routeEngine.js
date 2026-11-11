import { t, tFacility } from "./i18n.js";

// 同层导航演示引擎（v2）：基于楼层地图几何的网格寻路，避免路线穿墙。
// - 可走区域 = 地图背景外轮廓（<g id="地图背景"> 内的 path）内部，排除中庭/设备井空洞；
// - 障碍物   = 店铺精确轮廓（出入口除外）；基础轮廓中未被店铺覆盖的大形状视为楼层填充，不挡路；
// - 网格 A*（8 方向）找路，每一步用连续线段验证是否穿墙，再做视线简化输出干净折线。
// 纯函数实现（不依赖 DOM），可在浏览器与 Node 测试中直接运行。
// 接入真实走廊路网后，可用相同接口替换 buildWalkableMap / findRoute。

const METERS_PER_UNIT = 0.25; // SVG 坐标单位 → 米（演示比例）
const WALK_SPEED_MPS = 1.25; // 步行速度（米/秒）
const CELL_SIZE = 4; // 网格单元边长（SVG 单位）
const SNAP_MAX_CELLS = 80; // 起点/终点吸附到可走格子的最大搜索半径
const SAMPLE_STEP = 4; // 视线检查的采样步长（SVG 单位）
const BIG_FILL_COVERAGE = 0.5; // 大形状被店铺覆盖低于该比例视为填充（走廊/中庭）
const BIG_BASE_BBOX_AREA = 8000; // 基础轮廓 bbox 面积阈值（SVG 单位²）
const GIANT_SHAPE_RATIO = 0.15; // 单个轮廓超过楼层面积该比例视为整层填充形状，不作墙体
const USE_BASE_OUTLINES = true; // 是否把基础商铺轮廓中判定为墙体的形状加入障碍

const GATE_LABELS = { east: "东门", north: "北门", west: "西门", south: "南门" };
const DIR_NAMES = ["东", "东南", "南", "西南", "西", "西北", "北", "东北"];

function normalize(name) {
  return String(name || "").toLowerCase().replace(/[^a-z0-9\u4e00-\u9fff]/g, "");
}

function decodeEntities(text) {
  return String(text || "")
    .replace(/&#(\d+);/g, (_, code) => String.fromCodePoint(Number(code)))
    .replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"')
    .replace(/&#39;|&apos;/g, "'").replace(/&amp;/g, "&");
}

// ---------- 几何基础 ----------

export function parsePolygon(d) {
  return [...d.matchAll(/[ML]\s*(-?[\d.]+)[ ,](-?[\d.]+)/g)].map((m) => ({ x: Number(m[1]), y: Number(m[2]) }));
}

// 把可能含多个 M…Z 子路径的 d 拆成独立环（每个 M 起一段）。
export function parseSubPolygons(d) {
  const starts = [...d.matchAll(/M\s*(-?[\d.]+)[ ,](-?[\d.]+)/g)].map((m) => m.index);
  const rings = [];
  for (let i = 0; i < starts.length; i++) {
    const segment = d.slice(starts[i], i + 1 < starts.length ? starts[i + 1] : d.length);
    const points = parsePolygon(segment);
    if (points.length >= 3) rings.push(points);
  }
  return rings;
}

// 解析设施说明里的停靠楼层（如「停靠楼层：B3、B1、1–10L」「连接楼层：1–7L」），
// 统一成 B1、1F…10F 的楼层代码集合。
export function parseServedFloors(label) {
  const text = String(label || "");
  const source = text.match(/(?:停靠楼层|连接楼层)[：:]\s*([^；;]+)/)?.[1] || "";
  const floors = new Set();
  const codeOf = (token) => {
    const match = token.match(/^(B?)(\d+)\s*[Ll]?$/i);
    if (!match) return null;
    return match[1] ? `B${match[2]}` : `${match[2]}F`;
  };
  for (const token of source.split(/[、,，\s]+/).filter(Boolean)) {
    const range = token.match(/^(B?)(\d+)\s*[–\-~—至]\s*(B?)(\d+)\s*[Ll]?$/i);
    if (range) {
      const from = Number(range[2]);
      const to = Number(range[4]);
      const start = Math.min(from, to);
      const end = Math.max(from, to);
      for (let n = start; n <= end; n++) floors.add(`${n}F`);
      continue;
    }
    const code = codeOf(token);
    if (code) floors.add(code);
  }
  return floors;
}

export function polygonCentroid(d) {
  const pairs = parsePolygon(d);
  if (pairs.length === 0) return null;
  if (pairs.length === 1) return { x: pairs[0].x, y: pairs[0].y };
  let area = 0, cx = 0, cy = 0;
  for (let i = 0; i < pairs.length; i++) {
    const { x: x1, y: y1 } = pairs[i];
    const { x: x2, y: y2 } = pairs[(i + 1) % pairs.length];
    const cross = x1 * y2 - x2 * y1;
    area += cross;
    cx += (x1 + x2) * cross;
    cy += (y1 + y2) * cross;
  }
  if (Math.abs(area) < 1e-6) {
    const sum = pairs.reduce((acc, p) => ({ x: acc.x + p.x, y: acc.y + p.y }), { x: 0, y: 0 });
    return { x: sum.x / pairs.length, y: sum.y / pairs.length };
  }
  return { x: cx / (3 * area), y: cy / (3 * area) };
}

export function ringArea(poly) {
  let area = 0;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    area += poly[j].x * poly[i].y - poly[i].x * poly[j].y;
  }
  return Math.abs(area / 2);
}

export function polygonBBox(poly) {
  if (poly._bbox) return poly._bbox;
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  for (const p of poly) {
    if (p.x < minX) minX = p.x;
    if (p.x > maxX) maxX = p.x;
    if (p.y < minY) minY = p.y;
    if (p.y > maxY) maxY = p.y;
  }
  poly._bbox = { minX, minY, maxX, maxY };
  return poly._bbox;
}

export function pointInPolygon(point, poly) {
  let inside = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const a = poly[i], b = poly[j];
    if (a.y > point.y !== b.y > point.y && point.x < ((b.x - a.x) * (point.y - a.y)) / (b.y - a.y) + a.x) inside = !inside;
  }
  return inside;
}

const cross = (o, a, b) => (a.x - o.x) * (b.y - o.y) - (a.y - o.y) * (b.x - o.x);

export function segmentsIntersect(p1, p2, p3, p4) {
  const d1 = cross(p3, p4, p1);
  const d2 = cross(p3, p4, p2);
  const d3 = cross(p1, p2, p3);
  const d4 = cross(p1, p2, p4);
  return ((d1 > 0 && d2 < 0) || (d1 < 0 && d2 > 0)) && ((d3 > 0 && d4 < 0) || (d3 < 0 && d4 > 0));
}

// 点是否处于可走区域：在外轮廓内且不在任何空洞（中庭/设备井）内。
export function isInsideWalkable(geometry, point) {
  if (!geometry.walkable.some((poly) => pointInPolygon(point, poly))) return false;
  return !geometry.holes.some((poly) => pointInPolygon(point, poly));
}

// 采样估计一个基础轮廓形状被店铺精确轮廓覆盖的比例。
// 用于区分“店铺墙体”（覆盖率高）与“走廊/中庭填充”（覆盖率低）。
function shopCoverageFraction(ring, hitRings) {
  if (!hitRings.length) return 0;
  const box = polygonBBox(ring);
  const hitBoxes = hitRings.map(polygonBBox);
  let total = 0, covered = 0;
  for (let x = box.minX + 2; x < box.maxX; x += 5) {
    for (let y = box.minY + 2; y < box.maxY; y += 5) {
      const point = { x, y };
      if (!pointInPolygon(point, ring)) continue;
      total++;
      for (let i = 0; i < hitBoxes.length; i++) {
        const hb = hitBoxes[i];
        if (point.x < hb.minX || point.x > hb.maxX || point.y < hb.minY || point.y > hb.maxY) continue;
        if (pointInPolygon(point, hitRings[i])) { covered++; break; }
      }
    }
  }
  return total ? covered / total : 0;
}

// 线段 p1→p2 是否完全处于可走区域且不穿过任何障碍物（端点相触视为允许）。
export function segmentClear(geometry, p1, p2) {
  const minX = Math.min(p1.x, p2.x), maxX = Math.max(p1.x, p2.x);
  const minY = Math.min(p1.y, p2.y), maxY = Math.max(p1.y, p2.y);
  for (const poly of geometry.obstacles) {
    if (poly.length < 3) continue;
    const box = polygonBBox(poly);
    if (box.maxX < minX || box.minX > maxX || box.maxY < minY || box.minY > maxY) continue;
    for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
      if (segmentsIntersect(p1, p2, poly[j], poly[i])) return false;
    }
  }
  const dist = Math.hypot(p2.x - p1.x, p2.y - p1.y);
  const steps = Math.max(2, Math.ceil(dist / SAMPLE_STEP));
  for (let k = 1; k < steps; k++) {
    const t = k / steps;
    const point = { x: p1.x + (p2.x - p1.x) * t, y: p1.y + (p2.y - p1.y) * t };
    if (!isInsideWalkable(geometry, point)) return false;
    for (const poly of geometry.obstacles) {
      if (poly.length < 3) continue;
      const box = polygonBBox(poly);
      if (point.x < box.minX || point.x > box.maxX || point.y < box.minY || point.y > box.maxY) continue;
      if (pointInPolygon(point, poly)) return false;
    }
  }
  return true;
}

// ---------- 节点与几何解析 ----------

function facilityLabel(ariaLabel, title, type, index, codeCounts) {
  const source = decodeEntities((ariaLabel || title || "").split(/[；;]/)[0].trim());
  if (type === "elevator") {
    const match = source.match(/电梯\s*([^\s；;，,]+)?/);
    const code = match?.[1] || "电梯";
    const seen = codeCounts.get(code) || 0;
    codeCounts.set(code, seen + 1);
    return seen === 0 ? `电梯 ${code}` : `电梯 ${code}·${seen + 1}`;
  }
  return source.includes("楼梯") ? `楼梯 ${String(index + 1).padStart(2, "0")}` : "楼梯";
}

// 解析楼层 SVG：返回 starts（出入口/电梯/楼梯）、destinations（店铺），
// 以及寻路几何：obstacles（墙体轮廓）、walkable（楼层外轮廓）、holes（中庭空洞）。
export function parseMapNodes(svgText) {
  const starts = [];
  const destinations = [];
  const obstacles = [];
  const walkable = [];
  const holes = [];
  let stairsCount = 0;
  const elevatorCodes = new Map();

  const background = svgText.match(/<g id="地图背景">([\s\S]*?)<\/g>/)?.[1] || "";
  const plateRings = [];
  for (const match of background.matchAll(/<path[^>]*d="([^"]+)"/g)) {
    plateRings.push(...parseSubPolygons(match[1]));
  }
  if (plateRings.length) {
    // 环分类：顶点落在其他环内部的环是空洞（中庭/设备井），否则是独立可走楼板。
    plateRings.forEach((ring, index) => {
      const insideAnother = plateRings.some((other, j) => j !== index && pointInPolygon(ring[0], other));
      (insideAnother ? holes : walkable).push(ring);
    });
  }
  const plateArea = walkable.reduce((sum, ring) => sum + ringArea(ring), 0) - holes.reduce((sum, ring) => sum + ringArea(ring), 0);
  // 单个轮廓超过楼层面积一定比例时，它不是某个店铺的墙体，而是整层填充形状（数据噪声）。
  const isGiantShape = (ring) => plateArea > 0 && ringArea(ring) > plateArea * GIANT_SHAPE_RATIO;

  const shopHitRings = [];
  for (const match of svgText.matchAll(/<g id="([^"]+)" class="shop"[^>]*>(.*?)<\/g>\s*<\/g>/gs)) {
    const id = match[1];
    const body = match[2];
    const title = decodeEntities(body.match(/<title>([^<]*)<\/title>/s)?.[1]?.trim() || "");
    const hit = body.match(/<path[^>]*class="hit"[^>]*d="([^"]+)"/s)?.[1];
    const name = decodeEntities(body.match(/<text[^>]*>([^<]+)<\/text>/s)?.[1]?.trim() || title);
    const point = hit ? polygonCentroid(hit) : null;
    if (!point) continue;
    const isGate = /_gate_/i.test(id) || /\bgate\b/i.test(title);
    const isService = /mother_baby|baby\s?room|洗手间|卫生间/i.test(id + title);
    if (isGate) {
      const direction = title.toLowerCase().match(/\b(east|north|west|south)\b/)?.[1];
      starts.push({ id, name: direction ? GATE_LABELS[direction] : title, x: point.x, y: point.y, kind: "gate" });
    } else if (!isService) {
      destinations.push({ id, name, x: point.x, y: point.y, kind: "shop" });
    }
    // 店铺与功能房墙体均视为障碍；出入口是开口，不挡路；整层填充形状不当作墙体。
    if (!isGate && hit) {
      for (const ring of parseSubPolygons(hit)) {
        shopHitRings.push(ring);
        if (!isGiantShape(ring)) obstacles.push(ring);
      }
    }
  }

  // 基础商铺轮廓包含店铺墙体与走廊/中庭填充两类形状：
  // 大形状且几乎不被店铺轮廓覆盖的是填充（走廊/中庭），不作为障碍；
  // 小形状一律视为墙体（未命名铺位/墙段）；整层填充形状同样排除。
  const baseGroup = svgText.match(/<g id="基础商铺轮廓">([\s\S]*?)<\/g>/)?.[1] || "";
  if (USE_BASE_OUTLINES) {
    for (const match of baseGroup.matchAll(/<path[^>]*d="([^"]+)"/g)) {
      for (const ring of parseSubPolygons(match[1])) {
        if (isGiantShape(ring)) continue;
        const box = polygonBBox(ring);
        const big = (box.maxX - box.minX) * (box.maxY - box.minY) >= BIG_BASE_BBOX_AREA;
        if (big && shopCoverageFraction(ring, shopHitRings) < BIG_FILL_COVERAGE) continue;
        obstacles.push(ring);
      }
    }
  }

  for (const match of svgText.matchAll(/<g id="(facility-\d+)" class="facility (elevator|stairs)"([^>]*)>/g)) {
    const id = match[1];
    const type = match[2];
    const attrs = match[3];
    const aria = attrs.match(/aria-label="([^"]*)"/)?.[1] || "";
    const title = attrs.match(/title="([^"]*)"/)?.[1] || "";
    const connection = attrs.match(/data-connection="([^"]*)"/)?.[1] || "";
    const x = Number(attrs.match(/data-x="([^"]+)"/)?.[1]);
    const y = Number(attrs.match(/data-y="([^"]+)"/)?.[1]);
    if (!Number.isFinite(x) || !Number.isFinite(y)) continue;
    const index = type === "stairs" ? stairsCount++ : 0;
    starts.push({
      id,
      name: facilityLabel(aria, title, type, index, elevatorCodes),
      x,
      y,
      kind: type,
      connection,
      servedFloors: [...parseServedFloors(aria || title)],
    });
  }

  return { starts, destinations, obstacles, walkable, holes };
}

// ---------- 可走网格 ----------

export function buildWalkableMap(geometry, cellSize = CELL_SIZE) {
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  for (const poly of geometry.walkable) for (const p of poly) {
    if (p.x < minX) minX = p.x;
    if (p.x > maxX) maxX = p.x;
    if (p.y < minY) minY = p.y;
    if (p.y > maxY) maxY = p.y;
  }
  minX = Math.max(0, Math.floor(minX / cellSize) * cellSize);
  minY = Math.max(0, Math.floor(minY / cellSize) * cellSize);
  const W = Math.max(1, Math.ceil((maxX - minX) / cellSize));
  const H = Math.max(1, Math.ceil((maxY - minY) / cellSize));
  const idx = (cx, cy) => cy * W + cx;
  const blocked = new Uint8Array(W * H);

  for (let cy = 0; cy < H; cy++) {
    for (let cx = 0; cx < W; cx++) {
      const x = minX + (cx + 0.5) * cellSize;
      const y = minY + (cy + 0.5) * cellSize;
      if (!isInsideWalkable(geometry, { x, y })) { blocked[idx(cx, cy)] = 1; continue; }
      for (const poly of geometry.obstacles) {
        if (poly.length < 3) continue;
        const box = polygonBBox(poly);
        if (x < box.minX || x > box.maxX || y < box.minY || y > box.maxY) continue;
        if (pointInPolygon({ x, y }, poly)) { blocked[idx(cx, cy)] = 1; break; }
      }
    }
  }
  // 不做整格膨胀：地图走廊较窄，膨胀会切断连通性；
  // 不穿墙由“移动线段验证 + 视线采样”保证，格子中心本身已离墙至少半格。
  const isWalkable = (cx, cy) => cx >= 0 && cx < W && cy >= 0 && cy < H && !blocked[idx(cx, cy)];
  const center = (cx, cy) => ({ x: minX + (cx + 0.5) * cellSize, y: minY + (cy + 0.5) * cellSize });

  // 连通分量标记：吸附起点/终点时避开孤立小口袋（如被墙体围住的门前死角）。
  const labels = new Int32Array(W * H).fill(-1);
  const componentSizes = [];
  const neighborDirs = [[1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [1, -1], [-1, 1], [-1, -1]];
  for (let cy = 0; cy < H; cy++) {
    for (let cx = 0; cx < W; cx++) {
      if (!isWalkable(cx, cy) || labels[idx(cx, cy)] !== -1) continue;
      const label = componentSizes.length;
      let size = 0;
      const stack = [[cx, cy]];
      labels[idx(cx, cy)] = label;
      while (stack.length) {
        const [x, y] = stack.pop();
        size++;
        for (const [dx, dy] of neighborDirs) {
          const nx = x + dx, ny = y + dy;
          if (!isWalkable(nx, ny) || labels[idx(nx, ny)] !== -1) continue;
          labels[idx(nx, ny)] = label;
          stack.push([nx, ny]);
        }
      }
      componentSizes.push(size);
    }
  }
  const largestSize = componentSizes.length ? Math.max(...componentSizes) : 0;
  return { cellSize, W, H, minX, minY, blocked, idx, isWalkable, center, labels, componentSizes, largestSize };
}

function snapPoint(map, point) {
  const cx = Math.floor((point.x - map.minX) / map.cellSize);
  const cy = Math.floor((point.y - map.minY) / map.cellSize);
  const minSize = map.largestSize * 0.1;
  let fallback = null;
  for (let r = 0; r <= SNAP_MAX_CELLS; r++) {
    for (let dy = -r; dy <= r; dy++) {
      for (let dx = -r; dx <= r; dx++) {
        if (Math.max(Math.abs(dx), Math.abs(dy)) !== r) continue;
        const nx = cx + dx, ny = cy + dy;
        if (!map.isWalkable(nx, ny)) continue;
        const cell = { ...map.center(nx, ny), cx: nx, cy: ny };
        const size = map.componentSizes[map.labels[map.idx(nx, ny)]] || 0;
        if (size >= minSize) return cell;
        if (!fallback) fallback = cell;
      }
    }
  }
  return fallback;
}

// ---------- A* 与路径简化 ----------

class MinHeap {
  constructor() { this.items = []; }
  get size() { return this.items.length; }
  push(index, priority) {
    this.items.push([priority, index]);
    let i = this.items.length - 1;
    while (i > 0) {
      const parent = (i - 1) >> 1;
      if (this.items[parent][0] <= this.items[i][0]) break;
      [this.items[parent], this.items[i]] = [this.items[i], this.items[parent]];
      i = parent;
    }
  }
  pop() {
    const top = this.items[0];
    const last = this.items.pop();
    if (this.items.length) {
      this.items[0] = last;
      let i = 0;
      for (;;) {
        const left = i * 2 + 1, right = i * 2 + 2;
        let smallest = i;
        if (left < this.items.length && this.items[left][0] < this.items[smallest][0]) smallest = left;
        if (right < this.items.length && this.items[right][0] < this.items[smallest][0]) smallest = right;
        if (smallest === i) break;
        [this.items[smallest], this.items[i]] = [this.items[i], this.items[smallest]];
        i = smallest;
      }
    }
    return top;
  }
}

function aStar(geometry, map, from, to) {
  const { W, H, idx } = map;
  const start = idx(from.cx, from.cy);
  const goal = idx(to.cx, to.cy);
  const gScore = new Float64Array(W * H).fill(Infinity);
  const came = new Int32Array(W * H).fill(-1);
  gScore[start] = 0;
  const heuristic = (cx, cy) => {
    const dx = Math.abs(cx - to.cx), dy = Math.abs(cy - to.cy);
    return (dx + dy) + (Math.SQRT2 - 2) * Math.min(dx, dy);
  };
  const open = new MinHeap();
  open.push(start, heuristic(from.cx, from.cy));
  const closed = new Uint8Array(W * H);
  const dirs = [[1, 0, 1], [-1, 0, 1], [0, 1, 1], [0, -1, 1], [1, 1, Math.SQRT2], [-1, 1, Math.SQRT2], [-1, -1, Math.SQRT2], [1, -1, Math.SQRT2]];
  while (open.size) {
    const [, current] = open.pop();
    if (closed[current]) continue;
    closed[current] = 1;
    if (current === goal) break;
    const cx = current % W, cy = (current / W) | 0;
    for (const [dx, dy, cost] of dirs) {
      const nx = cx + dx, ny = cy + dy;
      if (!map.isWalkable(nx, ny)) continue;
      // 用连续线段验证每一步：既不穿墙，也允许通过地图数据里的斜向开口。
      if (!segmentClear(geometry, map.center(cx, cy), map.center(nx, ny))) continue;
      const tentative = gScore[current] + cost;
      const ni = idx(nx, ny);
      if (tentative < gScore[ni]) {
        gScore[ni] = tentative;
        came[ni] = current;
        open.push(ni, tentative + heuristic(nx, ny));
      }
    }
  }
  if (!Number.isFinite(gScore[goal])) return null;
  const cells = [];
  for (let current = goal; current !== -1; current = came[current]) cells.push({ cx: current % W, cy: (current / W) | 0 });
  cells.reverse();
  return cells;
}

function simplifyPath(geometry, points) {
  if (points.length <= 2) return points;
  const result = [points[0]];
  let i = 0;
  while (i < points.length - 1) {
    let j = points.length - 1;
    while (j > i + 1 && !segmentClear(geometry, points[i], points[j])) j--;
    result.push(points[j]);
    i = j;
  }
  return result;
}

// 同层寻路：返回 { nodes, points, lengthUnits }；同点返回 0 长度路线；不可达返回 null。
export function findRoute(geometry, map, startId, destId) {
  const all = [...geometry.starts, ...geometry.destinations];
  const startNode = all.find((n) => n.id === startId);
  const destNode = all.find((n) => n.id === destId);
  if (!startNode || !destNode) return null;
  if (startId === destId) return { nodes: [startNode], points: [{ ...startNode }], lengthUnits: 0 };
  const from = snapPoint(map, startNode);
  const to = snapPoint(map, destNode);
  if (!from || !to) return null;
  if (from.cx === to.cx && from.cy === to.cy) return { nodes: [startNode, destNode], points: [from, to], lengthUnits: 0 };
  const cells = aStar(geometry, map, from, to);
  if (!cells) return null;
  const points = simplifyPath(geometry, cells.map((c) => map.center(c.cx, c.cy)));
  const lengthUnits = points.reduce((sum, p, i) => (i ? sum + Math.hypot(p.x - points[i - 1].x, p.y - points[i - 1].y) : sum), 0);
  return { nodes: [startNode, destNode], points, lengthUnits };
}

// ---------- 步骤说明与匹配 ----------

function bearingName(dx, dy) {
  if (Math.hypot(dx, dy) < 1e-6) return "直行";
  const angle = (Math.atan2(dy, dx) * 180) / Math.PI; // SVG 坐标：y 向下
  const index = Math.round(angle / 45) & 7;
  return DIR_NAMES[(index + 8) % 8];
}

function mergeSegments(points) {
  const segments = [];
  for (let i = 0; i < points.length - 1; i++) {
    const dx = points[i + 1].x - points[i].x;
    const dy = points[i + 1].y - points[i].y;
    const length = Math.hypot(dx, dy);
    if (length < 1e-6) continue;
    const direction = bearingName(dx, dy);
    const last = segments[segments.length - 1];
    if (last && last.direction === direction) {
      last.dx += dx; last.dy += dy; last.length += length; last.direction = direction;
    } else {
      segments.push({ dx, dy, length, direction });
    }
  }
  return segments;
}

const roundTo5 = (value) => Math.max(5, Math.round(value / 5) * 5);

// 生成步行说明：距离（米）、时间（分钟）与逐步指引。
export function describeRoute(route, startNode, destNode) {
  const meters = Math.max(0, route.lengthUnits * METERS_PER_UNIT);
  const minutes = Math.max(1, Math.ceil(meters / WALK_SPEED_MPS / 60));
  const segments = mergeSegments(route.points);
  const steps = [{ text: t("从「{v1}」出发", { v1: startNode?.name ? tFacility(startNode.name) : t("起点") }), kind: "start" }];
  let previous = null;
  segments.forEach((segment) => {
    const metersPart = roundTo5(segment.length * METERS_PER_UNIT);
    if (previous) {
      const cross = previous.dx * segment.dy - previous.dy * segment.dx;
      const dot = previous.dx * segment.dx + previous.dy * segment.dy;
      if (Math.abs(cross) > 0.35 * Math.hypot(previous.dx, previous.dy) * Math.hypot(segment.dx, segment.dy)) {
        steps.push({ text: t("{turn}，向{d}直行约 {m} 米", { turn: t(cross > 0 ? "右转" : "左转"), d: t(segment.direction), m: metersPart }), kind: "move" });
        previous = segment;
        return;
      }
      if (dot < 0) steps.push({ text: t("掉头后继续前行"), kind: "move" });
    }
    steps.push({ text: t("向{d}直行约 {m} 米", { d: t(segment.direction), m: metersPart }), kind: "move" });
    previous = segment;
  });
  steps.push({ text: t("到达「{v1}」", { v1: destNode?.name ? tFacility(destNode.name) : t("目的地") }), kind: "arrive" });
  return {
    meters: roundTo5(meters),
    minutes,
    steps,
    summary: t("全程约 {m} 米 · 步行约 {min} 分钟", { m: roundTo5(meters), min: minutes }),
  };
}

// 按演示数据店铺名匹配地图节点：先归一化，再用中英文分词重叠度评分，兼容词序差异。
function tokensOf(text) {
  return text.match(/[a-z0-9]+|[\u4e00-\u9fff]+/g) || [];
}

export function matchDestination(destinations, shopName) {
  const target = normalize(shopName);
  if (!target) return null;
  const targetTokens = tokensOf(target);
  let best = null;
  for (const node of destinations) {
    const name = normalize(node.name);
    if (!name) continue;
    const nameTokens = tokensOf(name);
    let score = 0;
    if (name === target) {
      score = 5;
    } else {
      const shared = nameTokens.filter((t) => targetTokens.includes(t)).length;
      const targetCover = targetTokens.length ? shared / targetTokens.length : 0;
      const nameCover = nameTokens.length ? shared / nameTokens.length : 0;
      if (shared > 0 && (targetCover >= 0.5 || nameCover >= 0.5)) score = targetCover >= 0.5 ? 4 : 3;
      else if (name.includes(target) || target.includes(name)) score = 2;
    }
    if (score && (!best || score > best.score || (score === best.score && name.length > best.nameLength))) {
      best = { node, score, nameLength: name.length };
    }
  }
  return best?.node || null;
}

export function defaultStart(starts) {
  return starts.find((s) => s.kind === "gate") || starts[0] || null;
}

// ---------- 多层导航 ----------

// 汇总所有楼层中的电梯/楼梯竖井：同一 data-connection 连接多个楼层。
export function collectShafts(floors, floorCodes) {
  const byConnection = new Map();
  for (const floor of floorCodes) {
    const data = floors[floor];
    if (!data) continue;
    for (const node of data.starts) {
      if (node.kind !== "elevator" && node.kind !== "stairs") continue;
      if (!node.connection) continue;
      if (!byConnection.has(node.connection)) {
        byConnection.set(node.connection, { id: node.connection, name: node.name, kind: node.kind, nodes: {} });
      }
      byConnection.get(node.connection).nodes[floor] = node;
    }
  }
  return [...byConnection.values()]
    .map((shaft) => ({ ...shaft, floors: Object.keys(shaft.nodes) }))
    .sort((a, b) => (a.kind === b.kind ? 0 : a.kind === "elevator" ? -1 : 1));
}

// 楼层换乘路径：优先电梯，电梯无法连通时再考虑楼梯；返回逐段换乘或 null。
export function planFloorTransitions(shafts, fromFloor, toFloor) {
  if (fromFloor === toFloor) return [];
  const search = (candidates) => {
    const visited = new Set([fromFloor]);
    const previous = new Map();
    const queue = [fromFloor];
    while (queue.length) {
      const current = queue.shift();
      if (current === toFloor) break;
      for (const shaft of candidates) {
        if (!shaft.nodes[current]) continue;
        for (const next of shaft.floors) {
          if (next === current || visited.has(next)) continue;
          visited.add(next);
          previous.set(next, { from: current, shaft });
          queue.push(next);
        }
      }
    }
    if (!previous.has(toFloor)) return null;
    const transitions = [];
    let current = toFloor;
    while (current !== fromFloor) {
      const step = previous.get(current);
      transitions.unshift({ from: step.from, to: current, shaft: step.shaft });
      current = step.from;
    }
    return transitions;
  };
  return search(shafts.filter((shaft) => shaft.kind === "elevator")) || search(shafts);
}

// 多层行程规划：同楼层直接步行；跨楼层自动路由到电梯，逐层换乘后到达目的地。
// floors: { [floor]: parseMapNodes 结果 }；start/dest: { floor, id, name }；getMap(floor) 返回可走网格。
export function planMultiFloorRoute({ floors, start, dest, getMap }) {
  const startData = floors[start.floor];
  const destData = floors[dest.floor];
  if (!startData || !destData) return null;
  const collect = (data) => [...data.starts, ...data.destinations];
  const startNode = collect(startData).find((n) => n.id === start.id);
  const destNode = collect(destData).find((n) => n.id === dest.id);
  if (!startNode || !destNode) return null;

  const legs = [];
  const pushWalk = (floor, fromNode, toNode) => {
    const geometry = floors[floor];
    if (!geometry || !fromNode || !toNode) return false;
    const map = getMap(floor);
    if (!map) return false;
    const route = findRoute(geometry, map, fromNode.id, toNode.id);
    if (!route) return false;
    const description = route.lengthUnits > 0
      ? describeRoute(route, fromNode, toNode)
      : { meters: 0, minutes: 0, steps: [] };
    legs.push({
      type: "walk",
      floor,
      from: { id: fromNode.id, name: fromNode.name },
      to: { id: toNode.id, name: toNode.name },
      route,
      description,
    });
    return true;
  };

  if (start.floor === dest.floor) {
    if (!pushWalk(start.floor, startNode, destNode)) return null;
  } else {
    const transitions = planFloorTransitions(collectShafts(floors, Object.keys(floors)), start.floor, dest.floor);
    if (!transitions) return null;
    let currentFloor = start.floor;
    let currentNode = startNode;
    for (const transition of transitions) {
      const shaftNode = transition.shaft.nodes[currentFloor];
      if (!shaftNode) return null;
      if (currentNode.id !== shaftNode.id) {
        if (!pushWalk(currentFloor, currentNode, shaftNode)) return null;
      }
      const nextNode = transition.shaft.nodes[transition.to];
      if (!nextNode) return null;
      legs.push({
        type: "ride",
        shaftName: transition.shaft.name,
        shaftKind: transition.shaft.kind,
        fromFloor: currentFloor,
        toFloor: transition.to,
        fromNode: { id: shaftNode.id, name: shaftNode.name, x: shaftNode.x, y: shaftNode.y },
        toNode: { id: nextNode.id, name: nextNode.name, x: nextNode.x, y: nextNode.y },
      });
      currentFloor = transition.to;
      currentNode = nextNode;
    }
    if (currentNode.id !== destNode.id) {
      if (!pushWalk(currentFloor, currentNode, destNode)) return null;
    }
  }

  const walkMeters = legs
    .filter((leg) => leg.type === "walk")
    .reduce((sum, leg) => sum + (leg.description?.meters || 0), 0);
  const rideCount = legs.filter((leg) => leg.type === "ride").length;
  const minutes = Math.max(1, Math.ceil((walkMeters / 1.25 + rideCount * 45) / 60));
  const steps = [];
  for (const leg of legs) {
    if (leg.type === "ride") {
      steps.push({ floor: leg.fromFloor, kind: "ride", text: t("乘「{v1}」由 {v2} 至 {v3}", { v1: tFacility(leg.shaftName), v2: leg.fromFloor, v3: leg.toFloor }) });
    } else if (leg.description?.steps?.length) {
      for (const step of leg.description.steps) {
        steps.push({ ...step, floor: leg.floor, text: `${leg.floor} · ${step.text}` });
      }
    }
  }
  const summary = rideCount
    ? t("步行约 {m} 米 · 步行约 {min} 分钟 · 乘梯 {n} 次", { m: Math.round(walkMeters), min: minutes, n: rideCount })
    : t("全程约 {m} 米 · 步行约 {min} 分钟", { m: Math.round(walkMeters), min: minutes });
  return {
    legs,
    steps,
    walkMeters,
    rideCount,
    minutes,
    summary,
    startFloor: start.floor,
    destFloor: dest.floor,
    crossFloor: start.floor !== dest.floor,
  };
}
