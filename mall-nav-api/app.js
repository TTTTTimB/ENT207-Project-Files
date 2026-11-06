require("dotenv").config();

const express = require("express");
const cors = require("cors");
const db = require("./db");

const app = express();
// Render/Railway 等平台会注入 PORT；本地开发沿用 SERVER_PORT 或 3000
const PORT = Number(process.env.PORT || process.env.SERVER_PORT || 3000);

// 允许跨域：默认允许所有来源；生产环境建议设置 CORS_ORIGIN=https://你的前端域名（多个用逗号分隔）
const corsOrigin = process.env.CORS_ORIGIN;
app.use(cors(corsOrigin ? { origin: corsOrigin.split(",").map((item) => item.trim()) } : {}));
app.use(express.json());

// 统一的异步错误处理，避免未捕获异常导致进程退出
const wrap = (handler) => (req, res) => {
  Promise.resolve(handler(req, res)).catch((err) => {
    console.error(err);
    if (!res.headersSent) res.status(500).json({ code: -500, msg: "服务器错误", err: err.message });
  });
};

const toShopRow = (row) => ({
  id: row.id,
  name: row.name,
  unitNumber: row.unit_number,
  status: row.status,
  floorId: row.floor_id,
  floorCode: row.floor_code,
  categoryId: row.category_id,
  nodeId: row.node_id,
  x: row.x,
  y: row.y,
});

/**
 * 健康检查：GET /api/health
 */
app.get("/api/health", wrap(async (req, res) => {
  try {
    await db.query("SELECT 1");
    res.json({ ok: true, db: "ok", time: new Date().toISOString() });
  } catch (err) {
    res.status(503).json({ ok: false, db: "error", msg: err.message, time: new Date().toISOString() });
  }
}));

/**
 * 楼层列表：GET /api/floor/list
 */
app.get("/api/floor/list", wrap(async (req, res) => {
  const result = await db.query(`
    SELECT id::int AS id, mall_id::int AS mall_id, floor_code, sort_order
    FROM mall_floor
    ORDER BY sort_order
  `);
  res.json({ code: 0, msg: "success", data: result.rows });
}));

/**
 * 店铺分类：GET /api/category/list
 */
app.get("/api/category/list", wrap(async (req, res) => {
  const result = await db.query(`
    SELECT id::int AS id, name
    FROM shop_category
    ORDER BY id
  `);
  res.json({ code: 0, msg: "success", data: result.rows });
}));

/**
 * 店铺搜索：GET /api/shop/search?name=店铺名
 */
app.get("/api/shop/search", wrap(async (req, res) => {
  const { name } = req.query;
  if (!name) return res.status(400).json({ code: -1, msg: "请传入店铺名称name参数" });
  const result = await db.query(
    `
    SELECT s.id::int AS id, s.name, s.unit_number, s.status, s.category_id::int AS category_id,
           s.node_id::int AS node_id, f.id::int AS floor_id, f.floor_code,
           n.x::float8 AS x, n.y::float8 AS y
    FROM shop s
    JOIN mall_floor f ON f.id = s.floor_id
    LEFT JOIN nav_node n ON n.id = s.node_id
    WHERE s.name ILIKE $1
    ORDER BY f.sort_order, s.name
    `,
    [`%${name}%`]
  );
  res.json({ code: 0, msg: result.rows.length ? "success" : "未找到匹配店铺", data: result.rows.map(toShopRow) });
}));

/**
 * 全部店铺（用于前端目录/收藏等场景）：GET /api/shop/all
 */
app.get("/api/shop/all", wrap(async (req, res) => {
  const result = await db.query(`
    SELECT s.id::int AS id, s.name, s.unit_number, s.status, s.category_id::int AS category_id,
           s.node_id::int AS node_id, f.id::int AS floor_id, f.floor_code,
           n.x::float8 AS x, n.y::float8 AS y
    FROM shop s
    JOIN mall_floor f ON f.id = s.floor_id
    LEFT JOIN nav_node n ON n.id = s.node_id
    ORDER BY f.sort_order, s.name
  `);
  res.json({ code: 0, msg: "success", data: result.rows.map(toShopRow) });
}));

/**
 * 指定楼层的店铺列表：GET /api/shop/list?floorId=3 或 ?floorId=1F
 */
app.get("/api/shop/list", wrap(async (req, res) => {
  const { floorId } = req.query;
  if (!floorId) return res.status(400).json({ code: -1, msg: "缺少floorId楼层参数" });
  const byId = /^\d+$/.test(String(floorId));
  const result = await db.query(
    `
    SELECT s.id::int AS id, s.name, s.unit_number, s.status, s.category_id::int AS category_id,
           s.node_id::int AS node_id, f.id::int AS floor_id, f.floor_code,
           n.x::float8 AS x, n.y::float8 AS y
    FROM shop s
    JOIN mall_floor f ON f.id = s.floor_id
    LEFT JOIN nav_node n ON n.id = s.node_id
    WHERE ${byId ? "s.floor_id = $1" : "f.floor_code = $1"}
    ORDER BY s.name
    `,
    [byId ? Number(floorId) : String(floorId)]
  );
  res.json({ code: 0, msg: "success", data: result.rows.map(toShopRow) });
}));

/**
 * 店铺详情：GET /api/shop/88
 */
app.get("/api/shop/:id", wrap(async (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isInteger(id)) return res.status(400).json({ code: -1, msg: "店铺id不合法" });
  const result = await db.query(
    `
    SELECT s.id::int AS id, s.name, s.unit_number, s.status, s.category_id::int AS category_id,
           s.node_id::int AS node_id, f.id::int AS floor_id, f.floor_code,
           n.x::float8 AS x, n.y::float8 AS y
    FROM shop s
    JOIN mall_floor f ON f.id = s.floor_id
    LEFT JOIN nav_node n ON n.id = s.node_id
    WHERE s.id = $1
    `,
    [id]
  );
  if (!result.rows.length) return res.status(404).json({ code: -1, msg: "店铺不存在" });
  res.json({ code: 0, msg: "success", data: toShopRow(result.rows[0]) });
}));

/**
 * A* 最短路径：POST /api/path  Body: { startNodeId, endNodeId }
 */
app.post("/api/path", wrap(async (req, res) => {
  const startNodeId = Number(req.body?.startNodeId);
  const endNodeId = Number(req.body?.endNodeId);
  if (!Number.isFinite(startNodeId) || !Number.isFinite(endNodeId)) {
    return res.status(400).json({ code: -1, msg: "缺少起点或终点nodeId" });
  }

  const nodeResult = await db.query(`SELECT id::int AS id, x::float8 AS x, y::float8 AS y, floor_id::int AS floor_id FROM nav_node`);
  const nodes = nodeResult.rows;
  const nodeMap = new Map(nodes.map((node) => [node.id, node]));

  const edgeResult = await db.query(`SELECT from_node_id::int AS node_a, to_node_id::int AS node_b FROM nav_edge WHERE COALESCE(is_active, 1) <> 0`);
  const adjacency = new Map();
  for (const edge of edgeResult.rows) {
    if (!adjacency.has(edge.node_a)) adjacency.set(edge.node_a, []);
    if (!adjacency.has(edge.node_b)) adjacency.set(edge.node_b, []);
    adjacency.get(edge.node_a).push(edge.node_b);
    adjacency.get(edge.node_b).push(edge.node_a);
  }

  const heuristic = (a, b) => {
    const start = nodeMap.get(a);
    const end = nodeMap.get(b);
    return Math.hypot(start.x - end.x, start.y - end.y);
  };

  const openSet = new Set([startNodeId]);
  const gScore = new Map(nodes.map((node) => [node.id, Infinity]));
  const fScore = new Map(nodes.map((node) => [node.id, Infinity]));
  const cameFrom = new Map();
  gScore.set(startNodeId, 0);
  fScore.set(startNodeId, heuristic(startNodeId, endNodeId));

  const found = (() => {
    while (openSet.size > 0) {
      let current = null;
      let minF = Infinity;
      for (const id of openSet) {
        if (fScore.get(id) < minF) {
          minF = fScore.get(id);
          current = id;
        }
      }
      if (current === null) break;
      if (current === endNodeId) return true;
      openSet.delete(current);

      for (const neighbor of adjacency.get(current) || []) {
        const a = nodeMap.get(current);
        const b = nodeMap.get(neighbor);
        if (!b) continue;
        const distance = Math.hypot(a.x - b.x, a.y - b.y);
        const tentativeG = gScore.get(current) + distance;
        if (tentativeG < gScore.get(neighbor)) {
          cameFrom.set(neighbor, current);
          gScore.set(neighbor, tentativeG);
          fScore.set(neighbor, tentativeG + heuristic(neighbor, endNodeId));
          openSet.add(neighbor);
        }
      }
    }
    return false;
  })();

  if (!found) return res.json({ code: 0, msg: "找不到连通路径", pathIds: [], path: [] });

  const pathIds = [];
  let cursor = endNodeId;
  while (cursor !== undefined) {
    pathIds.unshift(cursor);
    cursor = cameFrom.get(cursor);
  }
  res.json({ code: 0, msg: "success", pathIds, path: pathIds.map((id) => nodeMap.get(id)) });
}));

// 绑定 0.0.0.0，兼容 Render / Railway / 云托管等容器平台
app.listen(PORT, "0.0.0.0", () => {
  console.log(`🚀 导航后端启动，端口 ${PORT}`);
  console.log(`   健康检查:  http://127.0.0.1:${PORT}/api/health`);
  console.log(`   楼层列表:  http://127.0.0.1:${PORT}/api/floor/list`);
  console.log(`   店铺搜索:  http://127.0.0.1:${PORT}/api/shop/search?name=星巴克`);
  console.log(`   楼层店铺:  http://127.0.0.1:${PORT}/api/shop/list?floorId=1F`);
  console.log(`   路径查询:  POST http://127.0.0.1:${PORT}/api/path`);
});
