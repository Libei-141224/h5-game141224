# 正式环境发布（Docker）

## 目标
- 使用 Docker 多阶段构建打包前端静态站点
- 使用 Nginx 提供线上正式环境服务
- 使用 `docker compose` 在服务器一键部署/更新

## 已新增文件
- `Dockerfile`
- `.dockerignore`
- `deploy/nginx/default.conf`
- `deploy/docker-compose.prod.yml`

## 本地验证（可选）
1. 构建镜像
   - `docker build -t h5-game:prod .`
2. 启动容器
   - `docker run --rm -p 8080:80 h5-game:prod`
3. 访问
   - `http://localhost:8080`

## 服务器发布（正式环境）
> 假设服务器已安装 Docker / Docker Compose 插件（`docker compose`）

1. 拉取代码（或更新代码）
   - `git clone git@github.com:Libei-141224/h5-game141224.git`
   - `cd h5-game141224`
   - 后续更新：`git pull`

2. 启动正式环境
   - `docker compose -f deploy/docker-compose.prod.yml up -d --build`

3. 查看运行状态
   - `docker compose -f deploy/docker-compose.prod.yml ps`
   - `docker compose -f deploy/docker-compose.prod.yml logs -f`

4. 验证健康检查
   - `curl http://127.0.0.1/healthz`

## 更新发布（新版本上线）
1. `git pull`
2. `docker compose -f deploy/docker-compose.prod.yml up -d --build`
3. `docker image prune -f`（可选，清理旧镜像）

## 端口与反向代理
- 当前 compose 默认映射：`80:80`
- 如果服务器已有 Nginx/Caddy/Traefik，可改成：
  - `"8080:80"`，再由外层反向代理转发到 `8080`

## 子路径部署（可选）
如果正式环境不是根路径（例如 `https://example.com/h5-game/`），构建时设置 `VITE_BASE`：
- 修改 `deploy/docker-compose.prod.yml` 中：
  - `VITE_BASE: /h5-game/`

## 注意事项
- 本项目是前端静态站点，不需要 Node.js 常驻进程，线上运行容器是 Nginx。
- `try_files ... /index.html` 已配置，支持 SPA 刷新路由（当前页面是单页应用）。
