# Netlify 前端 + 独立后端部署说明

## 结论

| 问题 | 结论 |
|---|---|
| 前端放 Netlify | ✅ 可行，而且很合适：本项目是纯静态 SPA（构建产物 `dist/client`），登录、导航、3D 都在浏览器运行 |
| 后端放 Softr | ❌ **不可行**。Softr 是无代码前端/门户搭建工具，只能从 Airtable、Google Sheets、Supabase、SQL 数据库读取数据来拼页面；它**不提供 Node/Express 运行环境，不能部署 `mall-nav-api`，也不能自定义 `/api/*` 接口**，没有容器、没有 Dockerfile 入口 |
| 正确做法 | Netlify 只跑前端；后端（Express + PostgreSQL 接口）部署在**能运行容器的平台**上，例如腾讯云 CloudBase 云托管、轻量应用服务器（Docker）、Render/Railway 等 |

> 一句话：**Netlify 负责“页面”，Softr 不能当“后端服务器”用。** Softr 顶多可以另外做一个数据门户（读腾讯云 PG 的店铺表，需要 Business 套餐），但它与现有网站是两套东西，不能替代后端 API。

## 推荐架构（与腾讯云 PostgreSQL 搭配）

```
浏览器
  │  静态资源
  ▼
Netlify（dist/client，自动 HTTPS、CDN）
  │  fetch VITE_API_BASE + /api/*
  ▼
后端容器（腾讯云 CloudBase 云托管 / 轻量服务器 Docker）
  │  内网 + SSL
  ▼
腾讯云 PostgreSQL
```

- 前端静态资源由 Netlify 提供；API 由用户浏览器直接请求后端域名（不经过 Netlify 服务器），所以后端放在腾讯云即可，数据库不用暴露公网。
- 如果先把数据库换成 Neon/Supabase（海外），也可以把后端放到 Render/Railway/Fly.io；但既然已经买了腾讯云 PostgreSQL，后端放在腾讯云更快、更省事。

## 部署步骤

### 1. 部署后端（不在 Netlify）

按 [deployment-tencent.md](deployment-tencent.md) 部署 `mall-nav-api`（CloudBase 云托管或轻量服务器 Docker），拿到公网 API 地址，例如 `https://mall-api.example.com`，并设置：

- 环境变量 `CORS_ORIGIN=https://<你的 Netlify 站点域名>`（部署完 Netlify 后回填，可多个用逗号分隔）
- 数据库环境变量 `PG_*` / `PG_SSL=true`
- 验证 `https://mall-api.example.com/api/health` 返回 `{"ok":true,"db":"ok"}`

### 2. 部署前端到 Netlify

1. Netlify → **Add new site → Import an existing project**，连接 Git 仓库（或直接 `netlify deploy` 上传）。
2. 项目根目录为 `mall-navigation-site`；`netlify.toml` 已配置：
   - 构建命令：`npm run build`
   - 发布目录：`dist/client`
   - Node 版本：22
   - SPA 回退：`/* → /index.html`
3. 在 **Site configuration → Environment variables** 添加：
   - `VITE_API_BASE = https://mall-api.example.com`（必须是构建时变量，改完要重新部署才会生效）
4. 点击 Deploy。部署完成后访问 Netlify 域名，检查：
   - 登录页正常显示（本机演示账号：`customer` / `merchant` / `admin`，密码 `MallDemo2026`）
   - 登录顾客后右上角出现「数据库已连接」，店铺目录显示数据库店铺
5. 回到后端把 `CORS_ORIGIN` 更新为 Netlify 域名并重启/重新部署。

### 3. 域名与 HTTPS

- Netlify 默认提供 `*.netlify.app` 域名和自动 HTTPS，可直接用于演示。
- 绑定自定义域名：Netlify → Domain management → Add custom domain，按提示配置 DNS（Netlify DNS 或 CNAME）。国内访问 Netlify 的速度和稳定性一般，若演示主要面向国内观众，可考虑用腾讯云 EdgeOne Pages / CloudBase 静态托管替代 Netlify（步骤相同，构建产物仍是 `dist/client`）。

## 纯 Netlify 方案（不推荐）

如果坚持“前后端都在 Netlify”，只能把 Express 改造成 **Netlify Functions**（`serverless-http` 包装或重写为函数），代价与风险：

- 每个函数冷启动、10 秒超时限制，且需要改后端入口；
- Netlify Functions 运行在海外，连接腾讯云 PostgreSQL 属跨境访问，延迟高且导出 IP 不固定、数据库白名单难维护；
- 账号登录目前是浏览器本机演示账号，如果改成真实账号还需额外做鉴权（Netlify Identity/第三方）。
- 若走这条路，建议把数据库换成 Neon/Supabase（海外）再迁数据，等于推翻已完成的腾讯云 PG 准备。

**因此不推荐**：前端 Netlify + 后端腾讯云容器 + 腾讯云 PostgreSQL 是当前最顺的组合。

## Softr 到底能做什么

- ✅ 可以做的：用 Softr 连接腾讯云 PG 的 `shop` / `mall_floor` 表（SQL 数据源需要 Business 套餐），做一个店铺信息/后台管理门户，导航入口链接回现有网站。
- ❌ 不能做的：托管 `mall-nav-api`、提供 `/api/health`、`/api/shop/all`、A\* 路径接口等自定义后端；也不能承载本项目的 React/three.js 前端（自定义代码块只支持 HTML/CSS/JS 片段）。
- 所以 Softr 不能替代“后端部署”，两者不是同一类产品。
