# 部署记录与操作手册（0 元档：Cloudflare Pages + Render + Neon）

> 状态：**已上线并验证通过**（2026-11-06）
> 本文既是部署过程记录，也是后续维护/答辩说明的操作手册。

## 1. 线上信息

| 项目 | 地址 / 说明 |
|---|---|
| **前端站点** | <https://mall-navigation-demo.pages.dev> |
| **后端 API** | <https://mall-nav-api.onrender.com> |
| 健康检查 | <https://mall-nav-api.onrender.com/api/health> |
| 代码仓库 | <https://github.com/TTTTTimB/ENT207-Project-Files> |
| 数据库 | Neon PostgreSQL（Singapore，production 分支，库名 `neondb`） |
| 月成本 | **¥0**（全部免费额度内；域名可选，约 $10/年） |

**演示账号**（登录页「试用演示账号」可一键填入）：

| 账号 | 密码 | 身份 | 进入界面 |
|---|---|---|---|
| `customer` | `MallDemo2026` | 顾客 | 顾客端（首页 / 店铺目录 / 室内导航 / 收藏） |
| `merchant` | `MallDemo2026` | 商户（迪桑特店员） | 商户工作台（仅显示被授权店铺） |
| `admin` | `MallDemo2026` | 商场管理员 | 完整经营分析 + 账号管理 |

## 2. 部署架构

```
浏览器
  │  静态资源（HTML/JS/CSS/SVG）
  ▼
Cloudflare Pages（前端 dist/client，全球 CDN，自动 HTTPS）
  │  fetch  VITE_API_BASE + /api/*
  ▼
Render Web Service（mall-nav-api，Docker，Free 实例，Singapore）
  │  连接串 + SSL（内网/公网均走 TLS）
  ▼
Neon PostgreSQL（Singapore，免费档 1GB）
```

- 前端纯静态，登录、室内导航、3D 地图、演示数据都在浏览器执行；
- 后端只提供店铺/楼层/分类/详情/A\* 路径接口；
- 数据库只存业务数据（88 店铺、8 楼层、82 导航节点、196 条边），登录账号是本机演示账号，不存数据库。

## 3. 部署步骤（按实际执行顺序）

### 3.1 代码推送到 GitHub

仓库根目录同时包含 `mall-navigation-site/`（前端）和 `mall-nav-api/`（后端），并带有：

- `render.yaml`：Render Blueprint（服务名 `mall-nav-api`、Docker、rootDir `mall-nav-api`、免费实例、健康检查 `/api/health`）；
- `.gitignore`：排除 `node_modules/`、`dist/`、`dist-portable/`、`.env`、`*.zip`、便携包目录等；
- `.nvmrc`：Node 22。

本次使用 **GitHub Desktop** 完成：Add local repository → 选项目根目录 → 提交（Initial commit）→ Publish repository（Public）。

> 注意：在 GitHub Desktop 里“创建仓库”时不要把仓库建到项目根目录的子文件夹（例如 `ENT207-mall-navigation-demo/`），否则项目文件不会被提交。正确做法是让仓库根目录就是项目目录。

### 3.2 Neon 数据库

1. 注册 [Neon](https://neon.com) → 新建 Project：
   - 项目名：`ENT207-mall-navigation-demo`
   - **Region：AWS Asia Pacific 1 (Singapore)**（与 Render 同区域）
   - 只开启 **Postgres database** 服务，其余（Object storage / Functions / AI gateway / Realtime / Better Auth）全部关闭
2. 在 **Connect** 弹窗复制连接串（可开启 Connection pooling，主机名带 `-pooler`）：
   ```text
   postgresql://neondb_owner:<密码>@ep-xxx-pooler.ap-southeast-1.aws.neon.tech/neondb?sslmode=require
   ```
3. 导入数据（本项目提供两个版本）：
   - `database/mall_navigation_tencent.sql`：**COPY 版**，只能用 `psql` 命令行导入（速度快）；
   - `database/mall_navigation_neon.sql`：**INSERT 版**，可粘贴到 Neon 网页 SQL Editor 执行（本地 psql 也可以用）。
   ```powershell
   cd "D:\ENT207 Project Files"
   & "D:\Program Files\pgAdmin\bin\psql.exe" '你的Neon连接串' -v ON_ERROR_STOP=1 `
       -f "mall-navigation-site\database\mall_navigation_tencent.sql"
   ```
4. 验证：
   ```sql
   select (select count(*) from public.shop) shops,
          (select count(*) from public.mall_floor) floors,
          (select count(*) from public.nav_node) nodes,
          (select count(*) from public.nav_edge) edges;
   -- 结果：88 / 8 / 82 / 196
   ```

**已踩过的坑（重要）**

- Neon **连接池端点**（`-pooler`）的新连接 `search_path` 为空，直接查 `shop` 会报 `relation "shop" does not exist`。
  → 后端 `app.js` 的所有 SQL 已显式写成 `public.shop`、`public.mall_floor`、`public.nav_node`、`public.nav_edge`，**不要删除 `public.` 前缀**。
- 从本机 PostgreSQL 18 导出的原始 dump 含 `\restrict`、`SET transaction_timeout` 等仅新版本支持的语句，直接导入会报错；仓库里的两个 SQL 文件已做 PostgreSQL 14+ 兼容处理。
- 若连接池方式仍有问题，可把 `DATABASE_URL` 换成**直连**（主机名去掉 `-pooler`），本项目两种都支持。

### 3.3 Render 后端

1. 注册 [Render](https://render.com) → **Sign in with GitHub**；
2. **New +** → **Web Service** → 连接仓库 `TTTTTimB/ENT207-Project-Files`（首次需安装 Render GitHub App 并授权该仓库）；
3. 配置：

| 字段 | 值 |
|---|---|
| Name | `mall-nav-api` |
| Language / Runtime | **Docker**（自动读取 `Dockerfile`） |
| Branch | `main` |
| Region | **Singapore (Southeast Asia)**（与 Neon 同区域） |
| Root Directory | `mall-nav-api` ⚠️ 必填 |
| Dockerfile Path | 留空（使用 Root Directory 下默认 `./Dockerfile`） |
| Instance Type | **Free**（0.1 CPU / 512MB） |
| Health Check Path | `/api/health` |
| Auto-Deploy | On Commit（默认） |

4. Environment Variables：

| Key | Value |
|---|---|
| `DATABASE_URL` | Neon 连接串（`postgresql://...neondb?sslmode=require`） |
| `PG_SSL` | `true` |
| `NODE_ENV` | `production` |
| `CORS_ORIGIN` | 前端域名（见 3.5，可后补） |

5. 点 **Deploy web service**，首次 Docker 构建约 1–5 分钟；
6. 成功标志（Logs）：
   - `🚀 导航后端启动，端口 10000`（Render 注入 `PORT`）
   - `✅ PostgreSQL 连接成功`
   - `Your service is live 🎉`
7. 验证：
   ```text
   https://mall-nav-api.onrender.com/api/health
   → {"ok":true,"db":"ok"}
   ```

> 后端已适配：优先读取平台注入的 `PORT`、监听 `0.0.0.0`；`mall-nav-api/.dockerignore` 排除 `node_modules`/`.env`，构建更干净。

### 3.4 Cloudflare Pages 前端

1. 注册/登录 [Cloudflare](https://dash.cloudflare.com) → **Workers & Pages** → **Create application** → **Pages** → **Import an existing Git repository**；
2. 安装 **Cloudflare Pages** GitHub App 并授权 `ENT207-Project-Files`，选择仓库后 **Begin setup**；
3. 构建配置：

| 字段 | 值 |
|---|---|
| Project name | `mall-navigation-demo` |
| Production branch | `main` |
| Framework preset | **None** 或 **React (Vite)**（不要选 VitePress/Vue） |
| Build command | `npm run build` |
| Build output directory | `dist/client` |
| Root directory（Advanced） | `mall-navigation-site` ⚠️ 必填 |
| 环境变量 | `VITE_API_BASE = https://mall-nav-api.onrender.com` |
| 可选环境变量 | `NODE_VERSION = 22` |

4. 点 **Save and Deploy**，约 1–2 分钟；
5. 成功日志：
   - `Finished` → `Uploading...` → `Success: Your site was deployed!`
6. 验证：打开 <https://mall-navigation-demo.pages.dev> → 登录页 → 顾客账号登录 → 右上角「**数据库已连接**」、店铺目录 1F 21 家。

**已踩过的坑（重要）**

- **Framework preset 不要选 VitePress**：它会把构建命令设为 `npx vitepress build`、输出 `.vitepress/dist`，导致构建失败；选 None/React (Vite) 后手动填 `npm run build` + `dist/client`。
- **`NODE_VERSION` 必须写 `22`**：误写成 `22A` 会导致日志出现 `definition not found: 22a`、`Failed: build command exited with code: 1`；删除该变量也能正常构建。
- **`public/_redirects` 已被移除**：本项目没有 URL 路由，且仓库没有 `404.html`，Cloudflare Pages 会自动把未匹配路径回退到 `index.html`；保留 `/* /index.html 200` 会被 Pages 判为 “Infinite loop” 而忽略（不影响使用，但日志会报警告）。

### 3.5 CORS 收尾（建议）

在 Render → `mall-nav-api` → **Environment** 添加：

```text
CORS_ORIGIN = https://mall-navigation-demo.pages.dev
```

保存后 Render 自动重新部署（约 1 分钟）。不设置时后端会允许所有来源（可以正常使用，但建议上线后收紧）。

### 3.6 可选：自定义域名

- Cloudflare Pages → 项目 **Custom domains** → 添加自己的域名，按提示配置 CNAME；
- 海外托管无需 ICP 备案；若要面向国内加速，可考虑腾讯云 EdgeOne Pages 等国内平台（见 `deployment-tencent.md`）。

## 4. 部署结果与验证记录

| 验证项 | 结果 |
|---|---|
| 前端页面可访问 | ✅ `https://mall-navigation-demo.pages.dev` 登录页正常 |
| 顾客登录 | ✅ 进入顾客端（角色：顾客端） |
| 数据库连接徽标 | ✅ 显示「数据库已连接」 |
| 店铺目录数据 | ✅ 1F 显示 21 家数据库店铺（首个 CHJ JEWELLERY 潮宏基） |
| 后端健康检查 | ✅ `{"ok":true,"db":"ok"}` |
| 店铺接口 | ✅ `/api/shop/list?floorId=1F` 返回 21 家 |
| A\* 路径接口 | ✅ `POST /api/path` 返回 7 节点路径 |
| 浏览器脚本异常 | ✅ 无 |
| 离线便携版 | ✅ 仍可双击打开（演示数据 + 本机账号，不依赖后端） |

## 5. 日常维护

### 更新代码
1. 本地修改 → GitHub Desktop：Changes → Commit → **Push origin**；
2. Render（Auto-Deploy On Commit）与 Cloudflare Pages（Automatic deployments）会各自自动重新部署；
3. 检查 Render Logs 与 Pages Deployments 是否构建成功。

### 冷启动（Render 免费实例）
- 空闲约 15 分钟会休眠，首次访问 30–60 秒；
- 演示/答辩前先打开一次 <https://mall-nav-api.onrender.com/api/health> 预热；
- 前端已实现后台重试：若首次加载时后端还在唤醒，页面先用演示数据，等 API 就绪后会自动切换到「数据库已连接」（无需刷新）。

### 免费额度（以控制台为准）
- **Neon**：免费档每账号 100 个项目、每个项目 1GB 存储（本项目 <10MB）；
- **Render**：免费 Web Service，512MB 内存，休眠后冷启动；
- **Cloudflare Pages**：免费静态托管与自动 HTTPS。

### 密钥与安全
- 数据库密码只放 Render 环境变量，不写进仓库（`.gitignore` 已排除 `.env`）；
- 如果连接串曾经泄露：Neon → Connect → Role `neondb_owner` → **Reset password** → 复制新连接串 → 更新 Render 的 `DATABASE_URL` → 重新部署；
- 建议设置 `CORS_ORIGIN` 限制来源。

### 数据备份
```powershell
# 导出 Neon 数据（本地 psql）
& "D:\Program Files\pgAdmin\bin\psql.exe" '你的Neon连接串' -c "\copy (select * from public.shop) to 'shop.csv' csv header"
# 或完整备份
pg_dump "你的Neon连接串" -f neon_backup.sql
```

## 6. 故障排查

| 现象 | 原因 / 处理 |
|---|---|
| Pages 构建失败：`nodejs@22A` / `definition not found: 22a` | `NODE_VERSION` 拼写错误 → 删除该变量或改成 `22` |
| Pages 构建失败：`npx vitepress build` | Framework preset 误选 VitePress → 改为 None / React (Vite)，命令 `npm run build`，输出 `dist/client` |
| Pages 构建失败：找不到文件/目录 | 检查 Root directory = `mall-navigation-site`、Build output = `dist/client` |
| Pages 日志：`_redirects` infinite loop | 已移除该文件；Pages 没有 `404.html` 时会自动回退 `index.html` |
| 页面右上角一直「演示数据」 | `VITE_API_BASE` 未配置/配置后未重新部署；或 Render 休眠未唤醒。先访问 `/api/health` 排查，必要时重启部署 |
| `/api/health` 返回 `db:error` | `DATABASE_URL` 不完整、`PG_SSL` 未设 `true`、Neon 连接串密码错误；查看 Render Logs |
| `relation "shop" does not exist`（Neon） | 使用了旧代码（SQL 未加 `public.` 前缀）或换了非 public schema；拉取最新代码重新部署 |
| 浏览器 CORS 报错 | Render `CORS_ORIGIN` 未包含 Pages 域名；先留空验证，再填入正确域名 |
| 第一次打开 API 很慢 | Render 免费实例冷启动（30–60 秒），正常；预热即可 |
| Neon 导入报 `\restrict` 错误 | 使用了 PG18 原始导出；改用 `database/mall_navigation_tencent.sql` 或 `mall_navigation_neon.sql` |
| GitHub 推送失败 `Could not connect to github.com` | 网络问题；稍后重试，或用 GitHub Desktop 的 Push origin |

## 7. 与其他方案的关系

| 方案 | 文档 |
|---|---|
| 腾讯云 PostgreSQL + 轻量服务器/云托管 | [`deployment-tencent.md`](./deployment-tencent.md) |
| Netlify 前端 + 独立后端（Softr 不能做后端） | [`deployment-netlify.md`](./deployment-netlify.md) |
| 通用部署思路（静态前端 + API + PostgreSQL） | [`deployment.md`](./deployment.md) |
| Softr / Lovable 可行性验证 | [`softr-lovable-feasibility.md`](./softr-lovable-feasibility.md) |
| 提交/答辩证据（平台截图清单与脱敏说明） | [`deployment-evidence.md`](./deployment-evidence.md) |

> 免费额度与平台界面可能随时间调整，重新部署前请以各平台控制台为准。
