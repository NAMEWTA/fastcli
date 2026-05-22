# Changelog

fastcli 的变更记录遵循 [Keep a Changelog](https://keepachangelog.com/) 和 [Semantic Versioning](https://semver.org/)。

---

## [Unreleased]

### 变更

- 预留给下一次发布的变更。

---

## [2.0.0] - 2026-05-22

### 新增

- **CLI / Web**：新增 `en` / `zh-CN` 双语界面，CLI 提示、本地 Web 编辑器和配置读取统一跟随 `language`。
- **Config**：`~/.fastcli/config.json` 新增 `language` 配置项，默认值为 `en`。

### 变更

- **Release**：`.github/workflows/release.yml` 现在先执行 `pnpm build`，再执行 `pnpm test`，以保证 clean checkout 下的 CLI 集成测试有 `dist/index.js`。

---

## 版本链接

- [Unreleased](https://github.com/NAMEWTA/fastcli/compare/v2.0.0...HEAD)
- [2.0.0](https://github.com/NAMEWTA/fastcli/releases/tag/v2.0.0)
- [1.0.5](https://github.com/NAMEWTA/fastcli/releases/tag/v1.0.5)
- [1.0.4](https://github.com/NAMEWTA/fastcli/releases/tag/v1.0.4)
- [1.0.3](https://github.com/NAMEWTA/fastcli/releases/tag/v1.0.3)
- [1.0.2](https://github.com/NAMEWTA/fastcli/releases/tag/v1.0.2)
