# 正大广场前端演示网站

根据现有 To C 顾客端与 To B 商户端 Figma 设计稿整合的响应式前端原型。包含顾客店铺浏览、店铺详情和收藏，商户经营总览、单店分析、客流/销售趋势和店铺排行，以及顾客端多层室内导航：起点可以是任意楼层的商户、出入口、电梯或楼梯，目的地为任意楼层商户；同层直接步行，跨层自动导航到电梯并逐层换乘，生成演示步行路线、距离与步骤。

导航地图默认使用 **3D 地图**（three.js）：按楼层堆叠楼板、挤出店铺墙体，用立体管道绘制步行路线，跨楼层行程用竖井连接换乘电梯，可拖动旋转、滚轮缩放并一键重置视角。地图视图分为「3D 地图」与「2D 地图」两种：3D 地图内可切换「行程楼层 / 全览」显示范围，全览以整栋楼视角统一高亮展示全部楼层（实体楼板 + 店铺墙体）；2D 地图内可切换 B1–10F 每层平面图。

起点、目的地列表支持按商户名或楼层写法（如 `5F`、`5楼`、`5层`、`B1`）搜索，楼层筛选（全部 + B1–10F）之外还提供**可复选的类型筛选**（商户 / 电梯 / 出入口 / 楼梯）；起点列表中商户分组排在最前。

导航页不设顶部楼层选择器，楼层筛选（全部 + B1–10F）已并入起点与目的地列表面板；搜索框支持按商户名或楼层写法（如 `5F`、`5楼`、`5层`、`B1`）查找，并显示当前已选起点/目的地摘要，便于快速确认与清除。

导航页的起点/终点列表覆盖全部楼层，商户按名称字母排序并标注所在楼层，支持按商户名或楼层搜索；不提供交换起终点的功能。

## 登录与账号（本机演示）

网站入口是登录页，登录后按账号身份进入对应界面，不再提供顾客端/商户端的自由切换：

| 账号 | 密码 | 身份 | 进入的界面 |
| --- | --- | --- | --- |
| `customer` | `MallDemo2026` | 顾客 | 顾客端（首页 / 店铺目录 / 室内导航 / 我的收藏 / 店铺详情） |
| `merchant` | `MallDemo2026` | 商户（迪桑特店员，已授权 1F · DESCENTE 迪桑特） | 商户工作台（经营总览 / 店铺分析 / 客流与消费趋势 / 店铺排行，仅展示被授权店铺） |
| `admin` | `MallDemo2026` | 商场管理员 | 商场管理工作台（完整经营分析 + 账号管理） |

- 账号与收藏保存在浏览器本地（`localStorage`），会话保存在 `sessionStorage`（刷新保持、关闭标签页失效，8 小时过期）；密码用 PBKDF2-SHA256（60 万次迭代）加盐哈希存储，不保存明文。
- 顾客可自助注册顾客账号；商户/管理员账号由管理员在「账号管理」中录入，并为商户勾选所属店铺（账号与界面绑定：商户只看到被授权的店铺）。
- 登录页提供「试用演示账号」一键填入；右侧文案与账号说明均标注「本机演示版」，此版本不用于保护真实经营数据。
- 单文件便携版同样支持登录（`file://` 下 localStorage、sessionStorage、WebCrypto 均可用）；后续接入真实后端时，可将 `src/auth.js` 的账号来源替换为 `backend_account` / `account_shop` 接口，界面与权限逻辑不变。

## 连接数据库与公开访问

**线上演示地址（已部署，2026-11-06）**

| 项目 | 地址 |
|---|---|
| 前端站点 | <https://mall-navigation-demo.pages.dev> |
| 后端 API | <https://mall-nav-api.onrender.com>（健康检查 `/api/health`） |
| 代码仓库 | <https://github.com/TTTTTimB/ENT207-Project-Files> |

架构：Cloudflare Pages（前端静态）+ Render Free（Express API，Docker）+ Neon Free PostgreSQL；演示账号 `customer` / `merchant` / `admin`，密码 `MallDemo2026`。完整的部署过程、配置项、踩坑记录与维护说明见 **[docs/deployment-free.md](docs/deployment-free.md)**。

前端支持两种数据模式：

- **演示模式**：后端不可用时自动使用 `src/demoData.js` 的本地演示数据（单文件便携版即为此模式，离线可用）；
- **数据库模式**：浏览器能访问 `/api/health` 时自动切换为数据库店铺数据，页面右上角显示「数据库已连接」。

本地联调与公网部署（静态前端 + Express API + PostgreSQL）的完整步骤见 [docs/deployment.md](docs/deployment.md)。腾讯云部署请见 [docs/deployment-tencent.md](docs/deployment-tencent.md)；**本次实际使用的 0 元档部署，完整记录见 [docs/deployment-free.md](docs/deployment-free.md)**（Cloudflare Pages + Render Free + Neon，含配置、踩坑与维护）；数据库导出文件为 `database/mall_navigation_tencent.sql`（COPY 版，psql 导入）和 `database/mall_navigation_neon.sql`（INSERT 版，可粘贴到 Neon SQL Editor）。

数据来源：店铺/楼层来自 PostgreSQL（API 可用时），登录账号为本机演示账号（账号与收藏保存在浏览器），经营分析数字仍为演示值并已标注。字段按现有数据库结构对齐：店铺与楼层对应 `shop`、`mall_floor`；店铺客流对应 `shop_traffic_stat`；楼层客流对应 `floor_traffic_stat`；消费统计对应 `shop_sales_stat`。

```bash
npm install
npm run dev
npm run build
npm run test:sites
npm run build:portable
```

## 单文件便携版（任意电脑本地打开）

执行 `npm run build:portable` 会生成 `dist-portable/正大广场-导航演示.html`：页面、样式、B1–10F 楼层地图、导航算法和演示数据全部内联在这一个文件里，双击即可用浏览器打开，不需要 Node.js、不需要联网、不需要启动服务器。打包分发包（便携版 HTML + 使用说明 + 源码）时可把该文件与 `使用说明.txt` 一起交给对方。

## 在 Windows 电脑上运行

1. 安装 Node.js（建议使用当前维护中的 LTS 版本，安装时启用 npm）。
2. 解压项目压缩包，在项目目录空白处打开 PowerShell 或终端。
3. 执行 `npm install` 安装依赖。
4. 执行 `npm run dev`，然后在浏览器打开终端显示的本地地址（通常是 `http://localhost:5173/`）。

地图 SVG 位于 `src/maps/`，同层导航使用 `src/routeEngine.js`：从地图中解析楼层轮廓（可走区域）、店铺墙体（障碍物）与出入口/电梯/楼梯节点，用网格 A* 生成不穿墙的演示路线；楼层店铺同步脚本位于 `database/`。数据库 SQL 文件仅供查看或手动执行；网站当前仍使用本地模拟数据，不需要数据库即可启动。

演示店铺采用已有正大广场店铺名称作为样例；经营指标、分类、营业状态、时间和部分铺位说明均为界面模拟值。所有涉及模拟指标的页面都标注了演示状态。
