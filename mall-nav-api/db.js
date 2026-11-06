require("dotenv").config();
const { Pool } = require("pg");

// 支持两种配置方式：
// 1) DATABASE_URL（托管平台常见，如 postgres://user:pass@host:5432/db）
// 2) PG_HOST / PG_PORT / PG_DATABASE / PG_USER / PG_PASSWORD 分项配置
// 云数据库通常要求 SSL：设置 PG_SSL=true 即可。
const useSsl = String(process.env.PG_SSL || process.env.PGSSLMODE || "").toLowerCase() === "true"
  || String(process.env.PGSSLMODE || "").toLowerCase() === "require";

const ssl = useSsl ? { rejectUnauthorized: false } : undefined;

// 注意：表名在 SQL 中显式使用 public. 前缀（见 app.js），
// 因此不依赖连接的 search_path，Neon 的连接池端点也能正常查询。
const pool = process.env.DATABASE_URL
  ? new Pool({ connectionString: process.env.DATABASE_URL, ssl, max: Number(process.env.PG_POOL_MAX || 10) })
  : new Pool({
      host: process.env.PG_HOST || "localhost",
      port: Number(process.env.PG_PORT || 5432),
      database: process.env.PG_DATABASE || process.env.PG_DB || "ENT207",
      user: process.env.PG_USER || "postgres",
      password: process.env.PG_PASSWORD || "",
      ssl,
      max: Number(process.env.PG_POOL_MAX || 10),
    });

// 启动时检测一次连接，便于部署时在日志里确认数据库是否可用
pool
  .query("SELECT NOW()")
  .then(() => console.log("✅ PostgreSQL 连接成功"))
  .catch((err) => console.error("❌ PostgreSQL 连接失败：", err.message));

module.exports = {
  pool,
  query: (text, params) => pool.query(text, params),
};
