# Approved Direct Spec

用户批准最后一版 proposed_plan 并要求 Implement the plan；此前全面迁移本机的方案已被替代。

- AC-1：只通过 npm 管理已核验的当前全局 scope，所有变更固定 prefix；保留结构化 argv、所有权校验、dry-run 无 npm/迁移、自身更新语义。
- AC-2：安装后分开显示 npm 目标与 PATH 默认入口及版本，旧入口抢占、同版本不同归属、探测失败或没有默认入口均明确说明；版本相同不能证明归属。
- AC-3：info 同时显示默认入口与 npm 可执行入口。
- AC-4：保持 PATH-first 启动、不自动切换或删除其他安装、不扫描所有工具版本、不改本机 Volta/PATH；更新 README、CHANGELOG 与 en/zh-CN。
- AC-5：真实临时 CLI/npm 测试覆盖各场景，执行 build/test/typecheck，独立双轴审查。

安装入口不一致不改变已完成 npm 安装的成功退出码；取消和清理失败沿用原进程边界。无需提交或发布。
