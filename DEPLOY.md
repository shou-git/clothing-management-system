# Deployment Guide / 部署指南

中文 | [English](#english)

## 基础部署

```bash
npm install --production
npm start
```

默认端口为 `8080`。可通过环境变量修改：

```bash
PORT=3000 npm start
```

## 使用 PM2

```bash
npm install -g pm2
pm2 start server.js --name clothing-management
pm2 save
```

常用命令：

```bash
pm2 status
pm2 logs clothing-management
pm2 restart clothing-management
pm2 stop clothing-management
```

## Nginx 反向代理示例

```nginx
server {
    listen 80;
    server_name example.com;

    location / {
        proxy_pass http://127.0.0.1:8080;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    }
}
```

## 数据备份

```bash
mkdir -p backup
cp database.db backup/database_$(date +%Y%m%d).db
tar -czf backup/uploads_$(date +%Y%m%d).tar.gz uploads/
```

## 安全建议

- 公开部署前增加登录认证或网络访问限制。
- 使用 HTTPS。
- 定期备份 `database.db` 和 `uploads/`。
- 定期更新依赖。
- 限制服务器上上传目录的执行权限。

---

## English

[中文](#deployment-guide--部署指南) | English

## Basic Deployment

```bash
npm install --production
npm start
```

The default port is `8080`. Change it with an environment variable:

```bash
PORT=3000 npm start
```

## PM2

```bash
npm install -g pm2
pm2 start server.js --name clothing-management
pm2 save
```

Useful commands:

```bash
pm2 status
pm2 logs clothing-management
pm2 restart clothing-management
pm2 stop clothing-management
```

## Nginx Reverse Proxy Example

```nginx
server {
    listen 80;
    server_name example.com;

    location / {
        proxy_pass http://127.0.0.1:8080;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    }
}
```

## Backups

```bash
mkdir -p backup
cp database.db backup/database_$(date +%Y%m%d).db
tar -czf backup/uploads_$(date +%Y%m%d).tar.gz uploads/
```

## Security Recommendations

- Add authentication or network access restrictions before public deployment.
- Use HTTPS.
- Back up `database.db` and `uploads/` regularly.
- Keep dependencies updated.
- Prevent script execution from uploaded media directories.
