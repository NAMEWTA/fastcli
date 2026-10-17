# Change 架构决定

## ADR-001: 专用 CLI 与结构化执行

**Status:** accepted
**Source:** LOG-001 / LOG-005 / LOG-013
**Supersedes:** none

### Decision
替换通用命令链和 Web 为固定六工具目录、安装检测、npm 管理和结构化进程执行。用户选择了精简方案，接受旧接口退役；原用户工具文件保留。

## ADR-002: 启动与管理范围分离

**Status:** accepted
**Source:** LOG-004 / LOG-008
**Supersedes:** none

### Decision
启动采用 PATH 优先，可使用其他来源；变更操作仅拥有当前 npm 全局包，不删除其他来源或账号数据。
