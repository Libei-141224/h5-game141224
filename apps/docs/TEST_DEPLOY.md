# 测试环境发布说明（GitHub Pages）

## 目标
- 使用 `dev` 分支作为测试环境发布分支。
- 每次推送到 `dev` 自动构建并发布到 GitHub Pages。

## 已配置内容
- 工作流文件：`.github/workflows/test-pages-deploy.yml`
- 触发条件：
  - `push` 到 `dev`
  - 手动触发 `workflow_dispatch`

## 首次启用（GitHub 仓库设置）
1. 打开仓库 `Settings`
2. 进入 `Pages`
3. 在 `Build and deployment` 中选择：
   - `Source = GitHub Actions`

## 发布方式（测试环境）
1. 将测试代码提交到 `dev` 分支
2. 执行 `git push origin dev`
3. 打开 GitHub 仓库的 `Actions` 查看工作流执行状态
4. 发布完成后，访问 Pages 地址（通常为）
   - `https://libei-141224.github.io/h5-game141224/`

## 说明
- 当前配置中，`dev` 分支用于测试环境发布。
- 工作流构建时已设置 Vite `base` 为 `/h5-game141224/`，适配 GitHub Pages 项目站点路径。
- 目前你的本地 `dev` 分支仍是初始化提交；若要发布当前游戏版本，需要先将 `main` 的实现同步到 `dev`。

## 建议流程（测试 -> 正式）
1. 在 `dev` 开发和测试（自动发布测试环境）
2. 验证通过后再合并到 `main`
3. 后续可再单独增加 `main` 分支的正式环境发布工作流
