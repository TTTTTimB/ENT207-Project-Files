# Softr / Lovable 方案可行性验证报告

> 验证时间：2026-11-04。依据两家官方文档与定价页（链接见文末），对照本项目「正大广场多层室内导航 + 3D 地图 + 商户经营分析」的实际需求逐项判断。

## 1. 结论摘要

| 方案 | 能否满足本项目 | 适用条件 |
|---|---|---|
| **Softr** | ❌ 不满足核心功能，仅能做一个「店铺目录/信息门户」的简化版 | 只要求数据展示（列表、详情、简单筛选），不需要 3D 地图、室内寻路、自定义图表；且需 Softr Business 套餐（SQL 数据源）+ Pro 套餐（自定义代码） |
| **Lovable** | ⚠️ 部分可行：能发布公网 React 应用，但**无法导入现有代码仓库**，只能通过 AI 重新搭建；3D/寻路需重写，数据库默认用 Lovable Cloud（不是腾讯云 PostgreSQL） | 愿意用 AI 重建一个简化版前端、可接受海外托管访问速度、愿意付费（Pro $25/月，学生半价） |
| **保留现有代码 + 腾讯云** | ✅ 完全满足，且已有部署文件 | 已实现：前端 API 接入、数据库导出、Dockerfile、Nginx 配置、部署手册 |

**建议：继续使用现有代码 + 腾讯云部署。** 若想「不买服务器」，用腾讯云 CloudBase 云托管（容器按量）+ 静态托管 + 腾讯云 PostgreSQL 即可，功能完整且费用更低。

## 2. 逐项功能对照

| 项目需求 | Softr | Lovable | 现有代码 + 腾讯云 |
|---|---|---|---|
| 公网访问 | ✅ 有 `softr.app` 域名（可绑自定义域名） | ✅ 发布即得 `*.lovable.app`，HTTPS 自带；自定义域名需付费套餐 | ✅ 服务器 / 云托管 + 域名 |
| 复用现有 React 源码 | ❌ 平台为闭源构建器，无法导入 React 工程 | ❌ **官方明确：不支持导入已有仓库**，Git 同步只从 Lovable 导出 | ✅ 原样使用 |
| SVG 楼层交互地图（悬停/聚焦联动） | ❌ 只能用「自定义代码块」嵌入 HTML/JS 片段，非一等公民，且需 Pro 套餐 | ⚠️ 可在编辑器里让 AI 重写；大体积 SVG（11 层）需逐个上传/粘贴 | ✅ 已实现 |
| 3D 路线视图（three.js、楼层堆叠、旋转缩放） | ❌ 无原生 3D，自定义代码块嵌入完整 three.js 场景不可靠 | ⚠️ 支持 npm 包（可装 three.js），但需 AI 从零重建 | ✅ 已实现 |
| 多层 A* 寻路 + 不穿墙 | ❌ 无自定义算法能力 | ⚠️ 依赖 AI 逐段重建，正确性风险高、需大量调试 | ✅ 已实现并通过 31 项测试 |
| 连接腾讯云 PostgreSQL | ⚠️ 支持 SQL 数据源（PostgreSQL/MySQL 等），但**仅 Business 套餐**，且数据库需对 Softr 公网 IP 开放 | ⚠️ 默认用 Lovable Cloud（Supabase 系）；用腾讯云 PG 需经外部 API（等于仍需另找地方部署该 API） | ✅ 原生 `pg` 驱动 |
| 商户经营分析图表 | ⚠️ 只有通用图表/表格区块，定制困难 | ✅ 可做 | ✅ 已实现 |
| 国内访问速度 / 备案 | ❌ 海外托管，国内访问不稳定，无法在境内备案 | ❌ 海外托管（lovable.app），国内访问与备案同样受限 | ✅ 国内云 |
| 数据与代码归属 | 平台托管，导出能力有限 | 可导出代码（付费）/ Git 同步导出；但数据库在 Lovable Cloud | ✅ 全部在自己账号 |
| 成本（参考） | Business 套餐起（$49+/月，另有 Pro 用于自定义代码） | Free 有额度限制；Pro $25/月（学生 50% 优惠可到约 $12.5/月），自定义域名需付费套餐 | 腾讯云 PG 约 ¥30–80/月 + 云托管按量（低流量几元～几十元）或轻量服务器 ¥24–60/月 |

## 3. 关键事实依据

- **Softr 自定义代码**：官方文档说明自定义代码块仅支持在页面内插入 HTML/CSS/JS 片段，且需要 **Pro 及以上套餐**；它不是用来承载完整 React/three.js 应用的开发环境。
- **Softr 数据库**：官方文档说明 SQL 数据源（PostgreSQL/MySQL/SQL Server/MariaDB）仅 **Business 及以上套餐**可用，且需开放数据库白名单（Softr 固定 IP）。
- **Lovable 无法导入已有仓库**：官方 Git 同步文档明确写有 "You can't import an existing repository into Lovable. When you connect a project, Lovable always creates a new repository."（Git 同步只负责把 Lovable 项目导出到 GitHub/GitLab/Bitbucket）。
- **Lovable 发布与套餐**：发布到 `*.lovable.app` 免费、HTTPS 自带、任何拿到链接的人可访问；**自定义域名需付费套餐**；Pro $25/月，学生/教师可证后 50% 折扣（约 $12.5/月，仅 100 credits/月档）；Free 套餐有每日 5 次、每月 30 次构建额度限制，且编辑代码/下载代码需付费。
- **Lovable 数据库**：内置后端为 Lovable Cloud；可调用外部 API（连接器/直连），但本项目若继续用腾讯云 PostgreSQL，仍需另行部署后端 API——并没有省掉服务器/云托管的环节。
- **国内访问**：Softr 与 Lovable 均为海外托管（无境内备案资质），国内用户访问延迟/稳定性不可控，校园内演示也可能受限；这是本项目（国内课程/演示）的硬伤。

## 4. 如果仍要用这两个平台的正确姿势

- **Softr**：只把它当作「商户信息门户」——用腾讯云 PG 的 `shop`/`mall_floor` 表做列表与详情，导航入口改为跳转到现有网站。需要 Business + Pro 套餐，成本约 $50+/月，且功能只剩展示。**不建议作为主方案。**
- **Lovable**：把它当作「AI 快速生成简化版前端」的工具——从零描述一个新版（店铺目录 + 2D 地图 + 简化 3D），数据库用 Lovable Cloud 或调用腾讯云 API；适合做「新版原型/演示」而非替代现有系统。需要 Pro 套餐、海外访问、时间与调试成本。
- **与现有方案组合**：若只是想要「公网访问 + 连接腾讯云 PG」，最省事的是把现有前端部署到腾讯云静态托管、后端用 CloudBase 云托管（容器）连接腾讯云 PostgreSQL——这就是你们已经准备好的方案，无需购买独立服务器。

## 5. 参考资料

- Softr：Custom code block（Pro 套餐限制）https://docs.softr.io/custom-code/custom-code-block-overview ；SQL Database 数据源（Business 套餐）https://docs.softr.io/data-sources/sql-database
- Lovable：Hosting（lovable.app 公网/HTTPS/自定义域名付费）https://docs.lovable.dev/features/hosting ；Custom domain（付费）https://docs.lovable.dev/features/custom-domain ；Git sync（不支持导入已有仓库）https://docs.lovable.dev/integrations/git-sync-overview ；订阅与额度 https://docs.lovable.dev/introduction/subscription-plans ；外部 API 集成 https://docs.lovable.dev/integrations/any-api
