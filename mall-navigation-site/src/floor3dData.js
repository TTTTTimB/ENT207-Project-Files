// 3D 楼层场景数据：把楼层几何与多层行程整理成 three.js 可直接消费的纯数据。
// 只做数据整理（不依赖 DOM），便于在 Node 中测试；three.js 渲染见 Floor3DView.jsx。

export const FLOOR_GAP = 68; // 楼层间距（地图单位，3D 视角下楼层之间的垂直距离）
export const SLAB_THICKNESS = 6; // 楼板厚度
export const GHOST_THICKNESS = 2; // 非当前行程楼层的薄板厚度
export const WALL_HEIGHT = 13; // 店铺墙体高度
export const ROUTE_LIFT = 5; // 路线离楼板上表面的高度
export const ROUTE_RADIUS = 2.6; // 路线管半径
export const MARKER_SIZE = 8; // 起终点标记尺寸
export const SHAFT_RADIUS = 5.5; // 换乘电梯竖井半径

const toPairs = (ring) => (ring || []).map((point) => [Math.round(point.x * 100) / 100, Math.round(point.y * 100) / 100]);

// 找到某楼层上的设施节点（电梯/楼梯），用于换乘竖井与标记定位。
function findFacility(geometry, id) {
  if (!geometry) return null;
  return geometry.starts.find((node) => node.id === id) || null;
}

function legFacilityPosition(floors, floor, node) {
  if (!node) return null;
  const found = findFacility(floors[floor], node.id);
  const x = found ? found.x : node.x;
  const y = found ? found.y : node.y;
  if (!Number.isFinite(x) || !Number.isFinite(y)) return null;
  return { x, y };
}

// 构建 3D 场景数据。
// floors: { [floor]: parseMapNodes 结果 }；floorCodes: 楼层顺序（低→高）；
// journey: planMultiFloorRoute 结果或 null；fallbackFloor: 没有行程时展示的楼层；
// overview: 全览模式 —— 所有楼层都显示为实体楼板，相机取景整栋楼。
export function buildFloor3DScene({ floors, floorCodes, journey, fallbackFloor, overview = false }) {
  const involved = new Set();
  if (journey && journey.legs.length) {
    for (const leg of journey.legs) {
      if (leg.type === "walk") involved.add(leg.floor);
      else { involved.add(leg.fromFloor); involved.add(leg.toFloor); }
    }
  } else if (fallbackFloor) {
    involved.add(fallbackFloor);
  }

  const slabs = [];
  floorCodes.forEach((code, index) => {
    const data = floors[code];
    if (!data || !data.walkable || !data.walkable.length) return;
    const active = involved.has(code);
    // 全览模式下全部楼层统一高亮（实体楼板 + 店铺墙体），不再区分行程楼层。
    const highlight = overview || active;
    const slab = {
      floor: code,
      index,
      y: index * FLOOR_GAP,
      active,
      highlight,
      solid: overview || active,
      outer: toPairs(data.walkable[0]),
      holes: (data.holes || []).map(toPairs),
      walls: highlight
        ? (data.obstacles || []).filter((poly) => poly.length >= 3).map(toPairs)
        : [],
    };
    slabs.push(slab);
  });

  const routes = [];
  const markers = [];
  const shafts = [];
  const labels = [];

  if (journey && slabs.length) {
    const slabByFloor = new Map(slabs.map((slab) => [slab.floor, slab]));
    for (const leg of journey.legs) {
      if (leg.type === "walk" && leg.route && leg.route.points.length > 1) {
        const slab = slabByFloor.get(leg.floor);
        if (!slab) continue;
        routes.push({
          floor: leg.floor,
          y: slab.y + SLAB_THICKNESS + ROUTE_LIFT,
          fromName: leg.from?.name || "",
          toName: leg.to?.name || "",
          points: leg.route.points.map((point) => [Math.round(point.x * 100) / 100, Math.round(point.y * 100) / 100]),
        });
      } else if (leg.type === "ride") {
        const fromSlab = slabByFloor.get(leg.fromFloor);
        const toSlab = slabByFloor.get(leg.toFloor);
        if (!fromSlab || !toSlab) continue;
        const fromPos = legFacilityPosition(floors, leg.fromFloor, leg.fromNode);
        const toPos = legFacilityPosition(floors, leg.toFloor, leg.toNode);
        if (!fromPos || !toPos) continue;
        shafts.push({
          name: leg.shaftName,
          fromFloor: leg.fromFloor,
          toFloor: leg.toFloor,
          from: [fromPos.x, fromSlab.y + SLAB_THICKNESS, fromPos.y],
          to: [toPos.x, toSlab.y + SLAB_THICKNESS, toPos.y],
        });
        markers.push({ kind: "transfer", floor: leg.fromFloor, x: fromPos.x, mapY: fromPos.y, y: fromSlab.y + SLAB_THICKNESS });
        markers.push({ kind: "transfer", floor: leg.toFloor, x: toPos.x, mapY: toPos.y, y: toSlab.y + SLAB_THICKNESS });
      }
    }
    const startLeg = journey.legs.find((leg) => leg.type === "walk");
    const startSlab = startLeg ? slabByFloor.get(startLeg.floor) : null;
    if (startSlab && startLeg.route) {
      const first = startLeg.route.points[0];
      markers.push({ kind: "start", floor: startLeg.floor, x: first.x, mapY: first.y, y: startSlab.y + SLAB_THICKNESS });
    }
    const walkLegs = journey.legs.filter((leg) => leg.type === "walk");
    const destLeg = walkLegs[walkLegs.length - 1];
    const destSlab = destLeg ? slabByFloor.get(destLeg.floor) : null;
    if (destSlab && destLeg.route) {
      const last = destLeg.route.points[destLeg.route.points.length - 1];
      markers.push({ kind: "dest", floor: destLeg.floor, x: last.x, mapY: last.y, y: destSlab.y + SLAB_THICKNESS });
    }
  }

  // 楼层标签：全览模式标注全部楼层，否则只标注行程楼层。
  for (const slab of slabs) {
    if (!(overview || slab.active) || slab.outer.length === 0) continue;
    let minX = Infinity, minY = Infinity;
    for (const [x, y] of slab.outer) {
      if (x < minX) minX = x;
      if (y < minY) minY = y;
    }
    labels.push({ floor: slab.floor, x: minX + 26, mapY: minY + 20, y: slab.y + SLAB_THICKNESS + 26 });
  }

  // 相机取景范围（地图坐标；worldZ = -mapY）。
  const activeSlabs = slabs.filter((slab) => slab.active);
  const frameSlabs = overview ? slabs : (activeSlabs.length ? activeSlabs : slabs);
  let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity, minH = Infinity, maxH = -Infinity;
  for (const slab of frameSlabs) {
    for (const [x, y] of slab.outer) {
      if (x < minX) minX = x;
      if (x > maxX) maxX = x;
      if (y < minY) minY = y;
      if (y > maxY) maxY = y;
    }
    minH = Math.min(minH, slab.y);
    maxH = Math.max(maxH, slab.y + SLAB_THICKNESS + WALL_HEIGHT);
  }
  const bounds = Number.isFinite(minX) ? { minX, maxX, minY, maxY, minH, maxH } : { minX: 0, maxX: 1000, minY: 0, maxY: 650, minH: 0, maxH: 100 };

  return {
    slabs,
    routes,
    markers,
    shafts,
    labels,
    bounds,
    activeFloors: [...involved],
    overview,
    hasJourney: Boolean(journey && journey.legs.length),
    sameFloor: Boolean(journey && journey.legs.every((leg) => leg.type === "walk")),
  };
}
