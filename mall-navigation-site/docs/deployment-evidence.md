# 部署与调试证据提交指南

> 适用：ENT207 课程项目提交、答辩材料、GitHub 仓库说明。
> 目标：用「平台控制台截图 + 线上可访问性证据 + 本地测试记录」三类材料，证明项目确实部署到了 Neon / Render / Cloudflare Pages 并能正常工作。

## 1. 证据目录（已自动生成一部分）

项目根目录下的 `evidence/`（**本地提交材料，不提交到 Git 仓库**）：

```
evidence/
├─ 01-online-api.md          线上接口证据：health / 店铺数据 88 家 / A* 路径 / CORS 响应头
├─ 02-frontend-evidence.md   线上页面证据：登录、数据库徽标、桌面点击店铺、手机端入口
├─ 03-tests.md               本地构建 + 40 项自动化测试输出
├─ 04-repo-and-deploy.md     仓库地址、提交记录、部署配置摘要、数据量
└─ screenshots/
   ├─ 01-login-desktop.png          登录页
   ├─ 02-home-desktop.png           顾客首页（右上角「数据库已连接」）
   ├─ 03-map-desktop.png            桌面楼层地图 + 右侧店名列表
   ├─ 04-shop-detail.png            点击店铺进入详情页
   ├─ 05-navigation-desktop.png     详情「前往店铺」→ 导航页
   ├─ 06-mobile-shop-entry.png      手机端点店名后的「查看详情」按钮
   └─ 07-api-health.png             浏览器访问 /api/health 的 JSON 结果
```

> 这些截图/记录可以由 `node` 脚本重新采集（本地 Edge 无头浏览器），采集时间会写入 md 文件。

## 2. 还需要手动截图的平台控制台（重点）

以下页面需要你登录对应平台后截图，建议保存到 `evidence/screenshots/manual/`，命名见每条编号。

### Neon（数据库）

| 编号 | 页面 | 要体现的信息 | 脱敏 |
|---|---|---|---|
| neon-01 | 项目概览（Project → Overview/Branch overview） | 项目名 `ENT207-mall-navigation-demo`、Region **AWS Asia Pacific 1 (Singapore)**、分支 production、Postgres database 服务 | 无 |
| neon-02 | Tables / 表列表 | 显示 11 张表（shop、mall_floor、nav_node、nav_edge…） | 无 |
| neon-03 | SQL Editor 验证查询 | 执行 `select (select count(*) from public.shop) shops, ...` 并显示结果 **88 / 8 / 82 / 196** | 无 |
| neon-04 | Connect 弹窗（可选） | 连接池开关、数据库 `neondb`、角色 `neondb_owner`、主机区域；**密码必须打码** | 打码密码/连接串 |

### Render（后端 API）

| 编号 | 页面 | 要体现的信息 | 脱敏 |
|---|---|---|---|
| render-01 | 服务概览页顶部 | 服务名 `mall-nav-api`、状态 **Live**、Region **Singapore**、Instance Type **Free**、服务 URL | 无 |
| render-02 | Deploys / Events 列表 | 成功部署记录（含 commit 短哈希与时间） | 无 |
| render-03 | Logs | `🚀 导航后端启动，端口 10000`、`✅ PostgreSQL 连接成功`、`Your service is live` | 无 |
| render-04 | Environment 环境变量页 | 只显示变量 **Key**（`DATABASE_URL`、`PG_SSL`、`NODE_ENV`、`CORS_ORIGIN`）；值打码 | **必须打码 DATABASE_URL** |

### Cloudflare Pages（前端）

| 编号 | 页面 | 要体现的信息 | 脱敏 |
|---|---|---|---|
| pages-01 | Workers & Pages → `mall-navigation-demo` 概览 | 项目名、**Production URL**（`https://mall-navigation-demo.pages.dev`）、成功部署记录 | 无 |
| pages-02 | Settings → Build configuration | Build command `npm run build`、Build output `dist/client`、Root directory `mall-navigation-site` | 无 |
| pages-03 | Settings → Variables and secrets | 变量 `VITE_API_BASE` 的值 | 无（非敏感） |
| pages-04 | 某次部署日志 | `Success: Your site was deployed!`、`Uploaded 18 files` | 无 |
| pages-05 | （可选）Custom domains | 默认域名或自定义域名、HTTPS | 无 |

## 3. 截图方法

- **区域截图**：`Win + Shift + S`（Windows 自带）或 Snipaste / ShareX，框选并标注重点；
- **整页截图**：Edge / Chrome 打开开发者工具（F12）→ `Ctrl + Shift + P` → 输入 `Capture full size screenshot` 回车；Edge 也可以右上角菜单 → 「截图」→「捕获整页」；
- **要求**：
  1. 截图里保留**地址栏/平台 Logo**，证明来源页面；
  2. 控制台页面尽量保留右上角账号区域（可打码）；
  3. 关键数字/状态用矩形框或箭头标出（Snipaste 可直接标注）；
  4. 浏览器缩放保持 100%，分辨率建议 ≥1280px；
  5. 每张截图配一句说明（例如“Render 服务运行状态：Live，Free 实例，Singapore”）。

## 4. 脱敏清单（提交前必查）

| 不能出现 | 处理 |
|---|---|
| Neon 数据库密码、完整连接串 | 打码；报告中用 `postgresql://neondb_owner:***@ep-xxx...` 占位 |
| Render 的 `DATABASE_URL` 值 | 打码或只显示 Key |
| GitHub token / PAT、Cookie、`.env` 内容 | 不要截图/不要提交 |
| 个人邮箱、手机号 | 打码（可选） |
| Render/Cloudflare 登录邮箱 | 打码 |

> 建议在截图后统一检查一遍：把所有含 `npg_`、`postgresql://` 的行确认已打码。

## 5. 可直接粘贴到报告的文本模板

```markdown
## 部署与调试证据

### 1. 部署环境
| 平台 | 用途 | 线上地址 | 关键配置 |
|---|---|---|---|
| Cloudflare Pages | 前端静态站点 | https://mall-navigation-demo.pages.dev | Build: npm run build；Output: dist/client；Root: mall-navigation-site；VITE_API_BASE 指向 Render |
| Render | 后端 API（Express + Docker） | https://mall-nav-api.onrender.com | Free 实例，Singapore，Health Check: /api/health |
| Neon | PostgreSQL 数据库 | —（内网/加密连接） | PostgreSQL，Singapore，库名 neondb |
| GitHub | 代码仓库 | https://github.com/TTTTTimB/ENT207-Project-Files | main 分支自动部署 |

### 2. 部署过程摘要
1. 代码推送 GitHub（Public 仓库，.gitignore 排除 node_modules / dist / .env）；
2. Neon 创建项目并导入 database/mall_navigation_tencent.sql，导入后 88 店铺 / 8 楼层 / 82 节点 / 196 边；
3. Render 使用仓库内 Dockerfile 部署后端，配置 DATABASE_URL、PG_SSL、NODE_ENV，健康检查 /api/health；
4. Cloudflare Pages 连接同一仓库，构建前端并配置 VITE_API_BASE；
5. 浏览器验证：登录 → 右上角「数据库已连接」→ 店铺目录显示数据库店铺。

### 3. 验证结果
| 验证项 | 结果 |
|---|---|
| GET /api/health | 200，{"ok":true,"db":"ok"} |
| GET /api/shop/all | 返回 88 家店铺（1F 21 家） |
| POST /api/path | 返回 7 节点路径 |
| 前端页面 | 登录页正常，顾客登录后显示「数据库已连接」 |
| 首页→详情→导航 | 桌面/手机均可进入店铺详情并跳转导航 |
| 本地测试 | npm run build 成功；npm run test:sites 40 项全部通过 |

### 4. 开发中遇到的问题与解决（示例）
- Neon 连接池端点 search_path 为空 → 后端 SQL 显式加 public. 前缀；
- Cloudflare Pages 构建时 NODE_VERSION 误写为 22A → 删除该变量后构建成功；
- Pages Framework preset 误选 VitePress → 改为 None/React (Vite)，设置 npm run build + dist/client；
- Render 平台注入 PORT → 后端改为优先读取 PORT 并监听 0.0.0.0。

### 5. 证据索引
- 平台控制台截图：见附件 `evidence/screenshots/manual/`
- 线上接口记录：`evidence/01-online-api.md`
- 线上页面截图：`evidence/screenshots/01~07*.png`
- 本地测试输出：`evidence/03-tests.md`
- 仓库与部署信息：`evidence/04-repo-and-deploy.md`
```

## 6. 可选：录屏证据

用 `Win + G`（Windows 游戏栏）或 OBS 录一段 30–60 秒流程：
登录 → 右上角「数据库已连接」→ 店铺目录（数据库商店）→ 首页点店铺 → 详情 → 前往店铺 → 导航页。
视频命名 `demo-evidence.mp4`，与截图一起提交。

## 7. 提交前自检

- [ ] `evidence/` 中自动采集的 md 与截图齐全；
- [ ] Neon / Render / Cloudflare 各至少 2 张控制台截图，显示关键配置与成功状态；
- [ ] 所有密码/连接串已打码；
- [ ] 报告中的线上地址与实际一致；
- [ ] `npm run test:sites` 输出为 40 项全部通过；
- [ ] 若提交源码 zip：不包含 `.env`、`node_modules`、`dist`。
