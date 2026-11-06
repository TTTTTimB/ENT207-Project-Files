# mall-nav-api 后端服务

Express + PostgreSQL 的商场导航后端。提供店铺、楼层数据接口与基于 `nav_node` / `nav_edge` 的 A* 寻路接口。

## 运行

```bash
npm install
cp .env.example .env   # 填写数据库连接（Windows 可手动复制）
npm start              # 默认 http://localhost:3000
```

## 环境变量

| 变量 | 说明 |
|---|---|
| `DATABASE_URL` | 可选，PostgreSQL 连接串（优先于下面的分项配置） |
| `PG_HOST` / `PG_PORT` / `PG_DATABASE` / `PG_USER` / `PG_PASSWORD` | 数据库连接信息 |
| `PG_SSL` | 云数据库一般设为 `true` |
| `SERVER_PORT` | 服务端口，默认 3000 |
| `CORS_ORIGIN` | 允许跨域的前端域名，多个用逗号分隔 |

## 接口

| 方法 | 路径 | 说明 |
|---|---|---|
| GET | `/api/health` | 健康检查（含数据库连通状态） |
| GET | `/api/floor/list` | 楼层列表 |
| GET | `/api/category/list` | 店铺分类 |
| GET | `/api/shop/all` | 全部店铺 |
| GET | `/api/shop/search?name=` | 按名称搜索店铺 |
| GET | `/api/shop/list?floorId=1F` | 指定楼层店铺（支持楼层代码或数字 id） |
| GET | `/api/shop/:id` | 店铺详情 |
| POST | `/api/path` | A* 最短路径，Body：`{ "startNodeId": 47, "endNodeId": 50 }` |

## 容器部署

```bash
docker build -t mall-nav-api .
docker run -p 3000:3000 --env-file .env mall-nav-api
```

云托管（腾讯云 CloudBase 云托管、阿里云函数计算容器、Render/Railway 等）直接使用本目录的 `Dockerfile`，环境变量按上表配置即可。

## 数据库

开发库表结构与数据可从 `../mall-navigation-site/database/mall_navigation_postgres.sql` 导入：

```bash
psql "host=<host> dbname=<db> user=<user> sslmode=require" -f ../mall-navigation-site/database/mall_navigation_postgres.sql
```
