# 部署文件

配合 [docs/deployment-tencent.md](../docs/deployment-tencent.md) 使用（腾讯云 PostgreSQL + 轻量应用服务器/CVM 路线）。

| 文件 | 用途 |
|---|---|
| `nginx.conf` | 同域部署：Nginx 托管前端静态文件，并把 `/api/` 反向代理到本机 3000 端口（含 HTTPS 示例） |

## 快速命令（服务器上执行）

```bash
# 1) 后端容器（按实际数据库信息替换）
cd /opt/mall-nav-api
docker build -t mall-nav-api .
docker run -d --name mall-api --restart unless-stopped -p 3000:3000 \
  -e PG_HOST=<数据库内网地址> -e PG_PORT=5432 -e PG_DATABASE=mall_navigation \
  -e PG_USER=postgres -e PG_PASSWORD=<密码> -e PG_SSL=true \
  -e CORS_ORIGIN=https://<你的域名> mall-nav-api

# 2) Nginx
sudo apt install -y nginx
sudo cp nginx.conf /etc/nginx/conf.d/mall.conf   # 修改 server_name / root / 证书
sudo mkdir -p /var/www/mall
# 上传本地 dist/client/* 到 /var/www/mall
sudo nginx -t && sudo systemctl reload nginx

# 3) 验证
curl http://127.0.0.1:3000/api/health
curl http://127.0.0.1/api/health
```

> 同域部署时前端构建无需设置 `VITE_API_BASE`（默认请求 `/api`）。若前后端分离托管，请参考部署文档设置该变量。
