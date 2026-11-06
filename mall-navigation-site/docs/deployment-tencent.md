# 腾讯云部署操作手册（PostgreSQL + 公网访问）

按顺序执行即可。推荐路线：**腾讯云 PostgreSQL（云数据库）→ 轻量应用服务器/CVM 跑后端 → Nginx 同域托管前端**。文末附「全托管 CloudBase 云托管」替代方案。

---

## 0. 需要准备的东西（清单）

| 需要的资源 | 说明 | 大概费用（演示期） |
|---|---|---|
| 腾讯云账号（已实名） | 购买云产品必需 | 免费 |
| 云数据库 PostgreSQL 实例 | 地域建议选上海（离用户近），版本 14/15/16 均可，最低规格即可 | 基础版约 ¥30–80/月，常有试用/代金券 |
| 一台轻量应用服务器或 CVM | 运行后端 API + Nginx（推荐同地域，可内网连数据库） | 约 ¥24–60/月，学生优惠更低 |
| 域名（可选） | 公网演示建议绑定域名；国内服务器绑定域名需 ICP 备案 | 约 ¥30–60/年 + 备案免费 |
| SSL 证书 | 腾讯云可申请免费 DV 证书（1 年） | 免费 |
| 本地已就绪的文件 | 前端、后端源码、`database/mall_navigation_tencent.sql` | 已有 |

> 若只是给老师/同学看效果，也可以先用「公网 IP 直接访问」跳过域名与备案；但浏览器会提示非 HTTPS，演示够用。

---

## 1. 购买并初始化腾讯云 PostgreSQL

1. 控制台 →「云数据库 PostgreSQL」→ 新建实例：
   - 地域/可用区：上海（与你后端服务器同地域、同 VPC 最好）
   - 版本：PostgreSQL 14 或 16
   - 规格：最低配（如 1 核 2G）
   - 网络：选择默认 VPC 与子网（记下 VPC ID）
   - 安全组：新建或默认
2. 实例创建完成后记录：
   - **内网地址**（后端服务器同 VPC 时使用）、端口 `5432`
   - **外网地址**（本地导入/调试用，需在控制台开启公网访问）
3. 账号管理：默认已有 `postgres` 初始账号（购买时设置密码），也可新建业务账号。
4. 数据库管理：新建数据库，名称建议 `mall_navigation`，字符集 `UTF8`（如沿用旧的 `ENT207` 也可以，只需后端环境变量一致）。
5. **白名单/安全组**：
   - 本地导入数据时：把本机公网 IP 加入实例白名单（控制台「安全组/白名单」）；
   - 后端部署后：把后端服务器内网 IP 或所属安全组加入白名单（同 VPC 内网访问）。
6. SSL：实例默认支持 SSL，连接串使用 `sslmode=require`（后端 `PG_SSL=true`）。

---

## 2. 导入数据库结构与数据

使用的文件：`database/mall_navigation_tencent.sql`（已按 PostgreSQL 14+ 兼容处理，已实测导入：88 店铺、8 楼层、82 节点、196 条边）。

### 方式一：控制台导入（最简单）

1. 控制台 → 云数据库 PostgreSQL → 实例 →「数据库管理 / 数据管理」→ 找到目标库 →「导入数据」；
2. 上传 `mall_navigation_tencent.sql`，字符集 UTF8，执行。

### 方式二：本机 psql 命令行导入（需要外网地址 + 白名单）

```bash
psql "host=<外网地址> port=5432 user=postgres dbname=mall_navigation sslmode=require" \
     -v ON_ERROR_STOP=1 \
     -f database/mall_navigation_tencent.sql
```

> 若提示 `\restrict` 或 `transaction_timeout` 相关错误，说明使用了旧的 `mall_navigation_postgres.sql`（PG18 导出），请改用 `mall_navigation_tencent.sql`。

### 方式三：在后端服务器上导入（内网，推荐）

```bash
psql "host=<内网地址> dbname=mall_navigation user=postgres sslmode=require" -f mall_navigation_tencent.sql
```

### 导入后验证

```sql
SELECT count(*) FROM shop;        -- 88
SELECT count(*) FROM mall_floor;  -- 8
SELECT count(*) FROM nav_node;    -- 82
SELECT count(*) FROM nav_edge;    -- 196
```

---

## 3. 部署后端 API（轻量应用服务器 / CVM，推荐）

### 3.1 准备服务器

1. 购买轻量应用服务器（或 CVM）：系统选 Ubuntu 22.04 / Debian 12；与数据库**同地域、同 VPC**。
2. 防火墙/安全组放行：`22`（SSH）、`80`、`443`；调试阶段可临时放行 `3000`。
3. 登录服务器，安装 Docker：

```bash
sudo apt update && sudo apt install -y docker.io docker-compose-plugin
sudo systemctl enable --now docker
```

### 3.2 上传后端代码

把本地 `mall-nav-api` 目录上传到服务器（二选一）：

```bash
# 方式 A：scp（在本地终端执行）
scp -r mall-nav-api root@<服务器IP>:/opt/

# 方式 B：服务器上 git clone 你的仓库后进入目录
```

> 上传前确认目录里有 `Dockerfile`、`app.js`、`db.js`、`package.json`；`.env` 不要上传（用环境变量）。

### 3.3 构建并启动容器

```bash
cd /opt/mall-nav-api
docker build -t mall-nav-api .

docker run -d --name mall-api --restart unless-stopped \
  -p 3000:3000 \
  -e PG_HOST=<数据库内网地址> \
  -e PG_PORT=5432 \
  -e PG_DATABASE=mall_navigation \
  -e PG_USER=postgres \
  -e PG_PASSWORD=<数据库密码> \
  -e PG_SSL=true \
  -e SERVER_PORT=3000 \
  -e CORS_ORIGIN=https://<你的域名> \
  mall-nav-api
```

> 没有域名时 `CORS_ORIGIN` 先留空（允许所有来源），上线后收紧。

验证：

```bash
curl http://127.0.0.1:3000/api/health
# 期望：{"ok":true,"db":"ok",...}
curl "http://127.0.0.1:3000/api/shop/list?floorId=1F" | head
```

### 3.4 配置 Nginx（同域托管前端 + 反代 API，推荐）

```bash
sudo apt install -y nginx
sudo cp /opt/deploy/nginx.conf /etc/nginx/conf.d/mall.conf   # 样例见项目 deploy/nginx.conf
sudo mkdir -p /var/www/mall && sudo chown -R $USER /var/www/mall
# 把本地前端构建产物 dist/client 里的文件上传到 /var/www/mall
sudo nginx -t && sudo systemctl reload nginx
```

同域方案下前端构建时 `VITE_API_BASE` **留空**（`/api` 由 Nginx 反代到 `127.0.0.1:3000`），无需处理跨域。

---

## 4. 构建并部署前端

```bash
# 本地执行（PowerShell）
cd mall-navigation-site
npm install
npm run build            # 产物：dist/client
```

- **同域方案（Nginx）**：不设置 `VITE_API_BASE`，直接上传 `dist/client/*` 到服务器 `/var/www/mall`。
- **分离托管方案**（CloudBase 静态托管 / EdgeOne Pages / COS+CDN）：

```powershell
$env:VITE_API_BASE = "https://<后端域名或 IP:3000>"
npm run build
```

把 `dist/client` 上传到静态托管平台，再绑定域名。

---

## 5. 域名、HTTPS 与备案

1. 域名解析：`A` 记录指向服务器公网 IP（或静态托管提供的 CNAME）。
2. 国内服务器 + 域名：需完成 ICP 备案（腾讯云备案控制台，约 1–3 周）。仅用 IP + 端口演示可跳过。
3. HTTPS：腾讯云「SSL 证书」申请免费 DV 证书 → 下载 Nginx 格式 → 放入服务器 → 在 Nginx 配置 443 并 301 跳转。
4. 用 `https://<域名>/` 访问，确认右上角出现「数据库已连接」。

---

## 6. 上线后自检清单

- [ ] `https://<域名>/api/health` 返回 `{"ok":true,"db":"ok"}`
- [ ] 页面右上角显示「数据库已连接」
- [ ] 店铺目录能看到数据库中的店铺（1F 应为 21 家）
- [ ] 切换楼层、搜索、店铺详情正常
- [ ] 室内导航可用（前端算法，不依赖数据库）
- [ ] 断网/后端挂掉时页面自动回退演示数据、不白屏
- [ ] 数据库白名单只放行后端服务器，公网 5432 不对所有人开放
- [ ] 后端容器设置 `--restart unless-stopped`，并配置日志查看方式
- [ ] 定期备份数据库（腾讯云自动备份 + 手动导出）

---

## 7. 常见问题

| 现象 | 原因 / 处理 |
|---|---|
| 页面徽标一直是「演示数据」 | 前端访问不到 `/api/health`：检查 `VITE_API_BASE`、Nginx 反代、后端容器是否启动、CORS |
| `psql: invalid command \restrict` | 用了 PG18 导出文件，改用 `mall_navigation_tencent.sql` |
| `password authentication failed` | 账号/密码错误，或实例白名单未放行来源 IP |
| `ECONNREFUSED / timeout` | 数据库地址用了内网地址但后端不在同 VPC；或安全组未放行 |
| CORS 报错 | 后端 `CORS_ORIGIN` 未包含实际访问域名（或留空放行全部） |
| 健康检查 db:error | 数据库连接参数错误（库名、账号、SSL）——查看容器日志 `docker logs mall-api` |
| 中文乱码 | 导入时字符集需为 UTF8，连接串无需额外设置 |

---

## 8. 替代方案：腾讯云全托管（CloudBase 云托管 + 静态托管）

如果不想自己维护服务器：

1. 腾讯云 →「CloudBase 云开发」创建按量计费环境；
2. 「云托管」→ 新建服务 → 上传 `mall-nav-api` 代码包（使用其中的 Dockerfile）→ 端口 3000；
3. 服务配置里开启 VPC 内网访问并选择与 PostgreSQL 相同的 VPC，环境变量同上（`PG_HOST` 用内网地址）；
4. 部署后在「云托管 → 服务 → 访问配置」获得默认公网域名，验证 `/api/health`；
5. 「静态网站托管」上传 `dist/client`（若分离托管，构建时设置 `VITE_API_BASE=<云托管域名>`）；
6. 绑定自定义域名（自定义域名需备案；默认域名可直接用于演示）。

> 全托管方案不用管服务器运维、证书续期，但需要在控制台分别配置云托管与静态托管，且默认域名可能被微信/浏览器拦截提示，正式使用建议绑定备案域名。

---

## 9. 费用与清理

- 演示结束后可「停止/降配」数据库、释放轻量服务器、删除云托管环境，避免持续计费；
- 数据库剩余数据可导出备份：`pg_dump ... -f backup.sql`。

---

## 10. 现在还剩哪些事（对照）

1. ✅ 数据库结构与数据文件：`database/mall_navigation_tencent.sql`（已就绪）
2. ✅ 后端代码与 Dockerfile：`mall-nav-api/`（已就绪）
3. ✅ 前端 API 接入与离线回退：`src/api.js`（已就绪）
4. ✅ 部署配置样例：`deploy/nginx.conf`、本手册（已就绪）
5. ⬜ 腾讯云 PostgreSQL 实例购买与初始化（按第 1 节）
6. ⬜ 导入 SQL（按第 2 节）
7. ⬜ 轻量服务器购买、后端容器启动（按第 3 节）——或改用 CloudBase 云托管
8. ⬜ 前端构建上传（按第 4 节）
9. ⬜ 域名 + 备案 + HTTPS（按第 5 节，仅 IP 演示可跳过）
10. ⬜ 用第 6 节清单完成上线自检
