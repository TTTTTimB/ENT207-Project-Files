# 性价比最高的部署组合（0 元档为主）

前提：本项目是纯静态 React SPA（登录、导航、3D、演示数据都在浏览器运行），数据库为 PostgreSQL。只要满足「公网可访问 + 连接数据库」，就不需要买服务器。

## 结论：优先 0 元档

| 方案 | 前端 | 后端 API | 数据库 | 月成本 | 国内访问 | 冷启动 | 运维 |
|---|---|---|---|---|---|---|---|
| **A. 推荐（0 元档）** | Cloudflare Pages（免费） | Render Free（免费，Docker 直接跑 `mall-nav-api`） | Neon Free PostgreSQL | **¥0** | 中等 | 休眠后首次约 30–60 秒 | 几乎为零 |
| B. 0 元档（无冷启动感） | Netlify 免费版 | Netlify Functions（需把 Express 包一层 serverless-http） | Neon Free | ¥0 | 中等 | 毫秒级冷启动 | 需改后端入口 |
| C. 低费档（国内较快） | Cloudflare Pages / EdgeOne Pages | Zeabur 香港（约 $5/月）或 Koyeb | Neon（新加坡） | 约 ¥35–40 | 较好 | 较轻 | 低 |
| D. 国内托管档 | EdgeOne Pages / CloudBase 静态托管 | 腾讯云 CloudBase 云托管（¥19.9/月 套餐） | CloudBase PostgreSQL 或 Neon | 约 ¥20–60 | 快 | 较轻 | 低 |
| E. 服务器档 | 同一台轻量服务器 Nginx | 同一台 Docker | 云数据库 PostgreSQL 或自建 | ¥65（自建库）～¥270（云库） | 最快、可备案 | 无 | 要自己维护 |

**课程演示首选 A**：0 元、几乎不改代码、部署半小时内完成；答辩前先打开一次 `/api/health` 预热即可消除冷启动。

### 仓库结构说明

Render 和 Cloudflare Pages 可以指向**同一个 Git 仓库**（推荐）：仓库根目录同时包含 `mall-navigation-site/`（前端）和 `mall-nav-api/`（后端）。这样：

- Cloudflare Pages：Root directory 填 `mall-navigation-site`，构建命令 `npm run build`，输出 `dist/client`；
- Render：使用仓库根目录的 `render.yaml`（Blueprint），其中 `rootDir: mall-nav-api` 指向后端；手动创建时 Root Directory 也填 `mall-nav-api`。

如果前后端分成两个仓库：Pages 只连前端仓库、Root directory 留空；Render 只连后端仓库（该仓库根目录直接就是 `mall-nav-api` 的内容，Root Directory 留空或 `mall-nav-api`）。

### 0. 先把代码推到 GitHub

Render 和 Cloudflare Pages 都需要连接 Git 仓库（Render 没有直接上传文件夹的方式）。本机如果没装 Git，两种方式任选：

**方式一（推荐，新手友好）：GitHub Desktop**

1. 注册/登录 [GitHub](https://github.com)；
2. 安装 [GitHub Desktop](https://desktop.github.com/)（自带 Git，无需单独装 Git），登录 GitHub 账号；
3. File → Add local repository，选择 `D:\ENT207 Project Files`，提示不是仓库时点 “create a repository” 创建；
4. 确认 Changes 列表里没有 `node_modules`、`dist`、`.env`（`.gitignore` 已处理），填写 Summary 后 Commit；
5. 点 “Publish repository”，可选 Public/Private，发布后即可在 GitHub 看到仓库。

**方式二：命令行 Git**

```bash
# 先安装 Git（PowerShell）：winget install --id Git.Git -e --source winget，然后重开终端
git config --global user.name "你的名字"
git config --global user.email "你的邮箱"

cd "D:\ENT207 Project Files"
git init -b main
git add .
git status --short          # 确认没有 node_modules / .env
git commit -m "mall navigation demo with login and PostgreSQL API"

# GitHub 网页新建空仓库（不要勾 README / .gitignore / license）后：
git remote add origin https://github.com/<你的账号>/<仓库名>.git
git branch -M main
git push -u origin main
```

> GitHub 不再接受账号密码推送：密码栏要填 **Personal Access Token**（GitHub → Settings → Developer settings → Personal access tokens → Tokens (classic) → Generate new token，勾选 `repo`），或安装 GitHub CLI 后 `gh auth login`。

仓库根目录已提供 `.gitignore`（排除 `node_modules`、`dist`、`dist-portable`、`.env`、`*.zip` 等），不要把数据库密码提交到 GitHub。

## A 方案落地步骤

### 1. 数据库：Neon Free PostgreSQL

1. 注册 [Neon](https://neon.com)，新建 Project（区域与 Render 服务保持同一地理区域，例如 Render Oregon ↔ Neon `us-west-2`、Render Singapore ↔ Neon `Singapore`，减少 API↔数据库延迟）。
2. 复制连接串（形如 `postgresql://user:pass@ep-xxx.us-east-1.aws.neon.tech/neondb?sslmode=require`）。
3. 导入数据（本地已安装 psql 时）：

```bash
psql "postgresql://...neon.tech/neondb?sslmode=require" \
     -v ON_ERROR_STOP=1 \
     -f database/mall_navigation_tencent.sql
```

也可以在 Neon 控制台的 SQL Editor 里粘贴 `database/mall_navigation_tencent.sql` 执行。
验证：`SELECT count(*) FROM shop;` 应为 **88**。

Neon 免费额度（截至本文）：每账号 100 个项目、每个项目 1GB 存储，本项目数据不足 10MB。

### 2. 后端：Render Free Web Service

后端已适配 Render：启动时优先读取平台注入的 `PORT`，并监听 `0.0.0.0`；目录内 `Dockerfile`、`.dockerignore` 已就绪。仓库根目录的 `render.yaml` 是 Render Blueprint，可以在 Render 控制台 New → Blueprint 一键创建服务（首次部署按提示填 `DATABASE_URL`、`CORS_ORIGIN`）。

也可以手动创建：

1. 注册 [Render](https://render.com) → New → Web Service → 连接 Git 仓库。
2. 配置：
   - Root Directory：`mall-nav-api`
   - Runtime：Docker（使用目录里的 `Dockerfile`）
   - Instance Type：Free
   - Health Check Path：`/api/health`
   - 区域：与 Neon 项目选同一区域（例如 Render 的 Oregon / Singapore 对应 Neon 的 us-west-2 / Singapore），减少 API↔数据库延迟
3. 环境变量（`SERVER_PORT` 可不填，平台会注入 `PORT`）：

```
DATABASE_URL=postgresql://...neon.tech/neondb?sslmode=require
PG_SSL=true
CORS_ORIGIN=https://<你的前端域名>
```

4. 部署后访问 `https://<service>.onrender.com/api/health`，应返回 `{"ok":true,"db":"ok"}`。
   注意：免费实例空闲约 15 分钟会休眠，首次访问需冷启动（约 30–60 秒）；答辩前先打开一次 `/api/health` 预热。

### 3. 前端：Cloudflare Pages

1. 注册 [Cloudflare](https://dash.cloudflare.com) → Workers & Pages → Create → Pages → Connect to Git。
2. 构建配置（前后端同仓库时 Root directory 填 `mall-navigation-site`；前端单独仓库则留空）：
   - Framework preset：Vite
   - Build command：`npm run build`
   - Build output directory：`dist/client`
   - 环境变量：`VITE_API_BASE=https://<service>.onrender.com`（**构建时变量**，修改后需重新部署）
   - 可选：`NODE_VERSION=22`（仓库内另有 `.nvmrc` 指定 Node 22）
3. SPA 回退已内置：仓库 `public/_redirects` 会随构建复制到 `dist/client/_redirects`（`/* /index.html 200`），Cloudflare Pages 对任意路径都会返回前端页面，无需额外配置。
4. 部署后访问 `https://<project>.pages.dev`：
   - 登录页正常显示（演示账号 `customer` / `merchant` / `admin`，密码 `MallDemo2026`）
   - 登录顾客后右上角显示「数据库已连接」，店铺目录出现数据库店铺

### 4. 收尾

- 回到 Render，把 `CORS_ORIGIN` 更新为 Pages 域名（首次部署可先不设置，后端会允许所有来源，验证通过后再收紧）；
- 不需要自定义域名时到此结束，**总成本 ¥0/月**；
- 需要品牌域名：Cloudflare Registrar 购买（约 $10/年），Pages 自动 HTTPS，无需备案（托管在海外）。

## 常见问题

| 现象 | 原因 / 处理 |
|---|---|
| 页面右上角一直「演示数据」 | `VITE_API_BASE` 没有配置或配置后未重新部署；或 Render 服务休眠/未部署成功。先直接访问 `https://<service>.onrender.com/api/health` 排查 |
| `/api/health` 返回 `db:error` | Neon 连接串错误或未带 `sslmode=require`；`PG_SSL` 未设为 `true`；检查 Render 日志 |
| 浏览器报 CORS 错误 | Render 的 `CORS_ORIGIN` 没有包含当前 Pages 域名；可先不设置（允许全部）验证，再收紧 |
| 首次打开 API 很慢（30–60 秒） | Render 免费实例休眠后的冷启动，属正常；演示前预热一次 |
| Pages 刷新子路径 404 | 确认 `dist/client/_redirects` 已随构建生成且内容为 `/* /index.html 200` |
| Neon 导入报 `\restrict` 错误 | 使用 `database/mall_navigation_tencent.sql`（PG14+ 兼容），不要用 PG18 原始导出 |

## 其他备选

- **数据库替代**：Supabase Free（500MB，7 天无活动会暂停，需提前唤醒）；Aiven Free。
- **后端替代**：Netlify Functions（`serverless-http` 包 Express，免冷启动感）、Vercel Serverless Functions（Hobby，非商业）；Koyeb/Zeabur（亚洲区域，付费低）。
- **前端替代**：Netlify、Vercel、GitHub Pages、EdgeOne Pages（国内访问更稳，默认域名可直接演示）。
- **不想做后端**：只部署前端也能完整演示（本机演示账号 + 内置演示数据），但「连接数据库」的作业要求就满足不了。

## 选型建议

- 只在课程答辩/展示用、预算≈0 → **A（Cloudflare Pages + Render Free + Neon）**；
- 不能接受冷启动 → **B（Netlify Functions）** 或 **C（Zeabur 香港）**；
- 主要面向国内观众、希望速度快 → **D（EdgeOne Pages + CloudBase 云托管 + Neon/CloudBase PG，约 ¥20–60/月）**；
- 需要长期稳定、域名备案、完全可控 → **E（轻量服务器 + 云数据库）**。

> 免费额度随时可能调整，部署前以各平台控制台为准；演示前建议预热后端并准备 `pg_dump` 备份。
