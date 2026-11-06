# 公开访问与数据库接入部署指南

> 腾讯云用户请看更具体的手册：[腾讯云部署操作手册](./deployment-tencent.md)（使用 `database/mall_navigation_tencent.sql` 导入，兼容 PostgreSQL 14+）。
>
> 前端用 Netlify、后端单独部署：见 [Netlify 前端 + 独立后端部署说明](./deployment-netlify.md)（注意：Softr 不能作为后端服务器使用）。
>
> 追求性价比（0 元档）：见 [性价比最高的部署组合](./deployment-free.md)（Cloudflare Pages + Render Free + Neon）。

本文件说明如何把「正大广场演示网站」部署到公网并连接 PostgreSQL 数据库。当前代码已支持两种运行模式：

- **演示模式**：后端未连接时自动使用 `src/demoData.js` 的本地演示数据（单文件便携版即为此模式，离线可用）；
- **数据库模式**：浏览器能访问后端 `/api/health` 时，自动改用数据库店铺数据（页面右上角显示「数据库已连接」）。

## 1. 架构

```
浏览器 ──> 静态前端（CDN/静态托管：React 构建产物 dist/client）
   │              │
   │              └── fetch /api/*（VITE_API_BASE 或同源反代）
   ▼
后端 API（Express，mall-nav-api，容器部署）
   │
   ▼
PostgreSQL 云数据库（shop / mall_floor / nav_node / nav_edge ...）
```

## 2. 本地联调（已验证可用）

```bash
# 1) 数据库：本机 PostgreSQL 18，库名 ENT207（已含表结构与数据）
#    如需重建：psql -U postgres -d ENT207 -f database/mall_navigation_tencent.sql

# 2) 后端
cd mall-nav-api
npm install
# 复制 .env.example 为 .env 并填写数据库连接
npm start            # 默认 http://localhost:3000

# 3) 前端（另开终端）
cd mall-navigation-site
npm install
npm run dev          # http://localhost:5173，/api 自动代理到 3000
```

验证：打开 http://localhost:5173 ，右上角应显示「数据库已连接」，店铺目录展示数据库中的店铺；也可直接访问 `http://localhost:3000/api/health`。

## 3. 生产部署（推荐：国内全托管）

### 3.1 云数据库（腾讯云 PostgreSQL / 阿里云 RDS PostgreSQL）

1. 创建 PostgreSQL 实例（建议 14 及以上），按量或最小规格即可。
2. 创建数据库（例如 `mall_navigation`），编码 UTF8。
3. 导入数据（文件：`database/mall_navigation_tencent.sql`）：

```bash
psql "host=<实例地址> port=5432 user=<用户> dbname=<库名> sslmode=require" -f database/mall_navigation_tencent.sql
```

也可在云控制台的「数据导入」中直接上传该 SQL 文件。

4. 网络：不要开启 5432 公网访问；使用实例内网地址，并在白名单中加入后端服务的出口 IP（云托管平台一般会提供固定出口 IP 或支持 VPC 内网互通）。

### 3.2 后端 API（腾讯云 CloudBase 云托管 / 任意容器平台）

1. 上传 `mall-nav-api` 目录（已包含 `Dockerfile`），容器端口 `3000`。
2. 配置环境变量（推荐逐项配置）：

| 变量 | 说明 |
|---|---|
| `PG_HOST` / `PG_PORT` | 数据库内网地址与端口 |
| `PG_DATABASE` | 数据库名 |
| `PG_USER` / `PG_PASSWORD` | 数据库账号密码 |
| `PG_SSL` | 云数据库通常设为 `true` |
| `SERVER_PORT` | `3000` |
| `CORS_ORIGIN` | 前端公网域名，多个用逗号分隔（不设置则允许所有来源） |

   也可以只配置 `DATABASE_URL=postgres://user:pass@host:5432/db`。

3. 部署完成后验证：`https://<后端域名>/api/health` 应返回 `{"ok":true,"db":"ok"}`。

   备选平台：Render / Railway（海外访问）、阿里云函数计算 FC（容器）、任意支持容器的云服务。

### 3.3 前端静态托管（腾讯云 CloudBase 静态托管 / EdgeOne Pages / OSS+CDN）

1. 构建时指定后端地址（PowerShell 示例）：

```powershell
cd mall-navigation-site
$env:VITE_API_BASE = "https://<后端域名>"   # 前后端同域反代时可留空
npm run build                                # 产物在 dist/client
```

2. 将 `dist/client` 上传到静态托管，绑定域名并开启 HTTPS。
3. 国内服务器 + 自定义域名需完成 ICP 备案；平台默认域名一般可直接访问用于演示。

### 3.4 上线后验证

- 页面右上角显示「数据库已连接」；
- 店铺目录显示数据库店铺（当前 1F 共 21 家）；
- 断网或后端不可用时自动回退演示数据，页面仍可用。

## 4. 备选方案：海外平台快速上线

| 组件 | 平台 |
|---|---|
| 前端静态 | Cloudflare Pages / Vercel |
| 后端 API | Render / Railway（Node 服务，端口 3000） |
| 数据库 | Neon / Supabase（PostgreSQL） |

步骤与第 3 节相同：导入 `mall_navigation_tencent.sql` → 部署后端并配置环境变量 → 前端以 `VITE_API_BASE=<API 地址>` 构建。

## 5. 数据说明

- 数据库当前：88 家店铺、8 个楼层（B2、B1、1F–5F、7F）、82 个导航节点、196 条导航边；
- 前端店铺目录按 SVG 地图楼层（B1、1F–10F）展示，**B2 暂无地图，其 6 家店铺暂不显示**；
- `shop_category` 表为空 → 前端自动隐藏分类筛选；补充分类后会自动出现；
- 经营分析数据表（`shop_sales_stat` 等）为空 → 该部分仍为演示数据并已标注；
- 室内导航路径目前由浏览器端根据楼层 SVG 计算（避免穿墙、支持多层换乘）；后端 `/api/path`（基于 `nav_node`/`nav_edge` 的 A*）已可用，如需服务端寻路可后续切换。

## 6. 更新数据

- 新增/修改店铺：直接在 PostgreSQL 中操作，或执行 `database/` 下的同步脚本；前端刷新即可读取；
- 重建数据库：使用 `database/mall_navigation_tencent.sql` 重新导入。

## 7. 安全清单

- 数据库只开内网/白名单，不暴露公网端口；
- 使用 SSL 连接，密码只放平台环境变量，不提交到仓库；
- 生产环境设置 `CORS_ORIGIN` 为前端域名；
- 需要时给 API 增加限流与鉴权；
- 免费平台注意实例休眠与调用额度。
