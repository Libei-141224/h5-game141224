# h5-game / 接金币大挑战

一个基于 `Vue 3 + Vite + TypeScript` 的桌面优先 H5 小游戏 Demo。

## 项目简介
- 游戏名称：接金币大挑战（Coin Catch Challenge）
- 核心玩法：左右移动接金币，避开炸弹
- 结束条件：
  - 命中炸弹立即结束
  - 60 秒倒计时结束自动结算
- 持久化：本地 `localStorage` 保存历史最高分

## 当前功能（MVP）
- 开始页 / 游戏进行页 / 结算侧边栏
- 键盘操作：`← / →`
- 掉落物：
  - `COIN`：+10
  - `BIG_COIN`：+30
  - `BOMB`：立即结束
- 命中反馈：
  - 闪光反馈
  - 分级屏幕抖动
  - 浮分与粒子效果
  - Web Audio API 合成音效（无需外部音频文件）

## 技术栈
- `Vue 3`
- `Vite`
- `TypeScript`
- `CSS`（自定义样式）
- `Nginx`（Docker 正式环境静态服务）

## 本地开发
### 环境要求
- `Node.js >= 20`（建议）
- `npm >= 10`

### 安装依赖
```bash
npm install
```

### 启动开发环境
```bash
npm run dev
```

默认地址：
- `http://127.0.0.1:5173`

### 构建生产包
```bash
npm run build
```

### 本地预览生产包
```bash
npm run preview
```

## 分支约定
- `main`：主线分支（稳定版本）
- `dev`：开发/测试分支（用于测试环境自动发布）

## 测试环境发布（GitHub Pages）
已配置 GitHub Actions 工作流（`dev` 分支触发）：
- 工作流文件：`.github/workflows/test-pages-deploy.yml`

### 启用方式（首次）
1. 打开仓库 `Settings`
2. 进入 `Pages`
3. 选择 `Source = GitHub Actions`

### 触发方式
```bash
git push origin dev
```

### 测试环境地址（默认）
- `https://libei-141224.github.io/h5-game141224/`

详细说明见：
- `apps/docs/TEST_DEPLOY.md`

## 正式环境发布（Docker）
已提供 Docker 多阶段构建 + Nginx 静态服务部署方案。

### 本地验证（需要 Docker 引擎运行中）
```bash
docker build -t h5-game:prod .
docker run --rm -p 8080:80 h5-game:prod
```

访问：
- `http://localhost:8080`

### 服务器部署（docker compose）
```bash
docker compose -f deploy/docker-compose.prod.yml up -d --build
```

详细说明见：
- `apps/docs/PROD_DOCKER_DEPLOY.md`

## 项目结构
```text
.
├─ src/
│  ├─ composables/useCoinCatchGame.ts   # 游戏主循环、输入、反馈、音效
│  ├─ game/
│  │  ├─ engine.ts                      # 游戏引擎（纯逻辑）
│  │  └─ types.ts                       # 游戏类型定义
│  ├─ storage/stats.ts                  # localStorage 最高分持久化
│  ├─ App.vue                           # UI 页面与交互
│  ├─ main.ts                           # 应用入口
│  └─ style.css                         # 全局样式与动画
├─ .github/workflows/                   # CI/CD（测试环境发布）
├─ deploy/                              # Docker / Nginx 部署配置
└─ apps/docs/                           # PRD、设计稿、部署文档
```

## 文档
- `apps/docs/PRD.md`：产品需求文档
- `apps/docs/design/coin-catch-ui.pen`：UI 设计稿（Pencil）
- `apps/docs/TEST_DEPLOY.md`：测试环境发布说明
- `apps/docs/PROD_DOCKER_DEPLOY.md`：Docker 正式环境发布说明

## 后续可扩展方向
- 难度选择 / 速度选择（开始页）
- 音效开关 / 反馈强度开关
- 联网排行榜 / 账号系统
- 移动端触控适配
