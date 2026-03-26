# FastCLI

终端命令别名和交互式工作流管理工具。

## 功能

- **命令别名**：将冗长的命令映射为简短易记的名称
- **交互式工作流**：创建多步骤、分支式的命令选择流程
- **本地 Web 管理后台**：通过 `fastcli web` 在本机启动带一次性口令的配置管理页面

## 安装

```bash
# 全局安装（推荐）
npm install -g fastcli

# 或使用 pnpm
pnpm add -g fastcli
```

## 快速开始

```bash
# 初始化配置文件
fastcli config init

# 添加一个别名
fastcli alias add c "claude --port 3000"

# 运行别名
fastcli c

# 预览命令（不执行）
fastcli c --dry-run
```

## 命令参考

### 配置管理

```bash
fastcli config init   # 初始化配置文件
fastcli config show   # 显示配置内容
fastcli config edit   # 用编辑器打开配置文件
```

### 别名管理

```bash
fastcli alias add <name> <command>           # 添加别名
fastcli alias add ga "git add ." -d "暂存所有"  # 带描述
fastcli alias rm <name>                      # 删除别名
fastcli alias ls                             # 列出所有别名
```

### 工作流管理

```bash
fastcli workflow ls           # 列出所有工作流
fastcli workflow show <name>  # 显示工作流结构
```

### Web 管理后台

```bash
fastcli web  # 启动本地 Web 管理后台
```

### 运行别名或工作流

```bash
fastcli <name>           # 运行别名或工作流
fastcli <name> --dry-run # 预览命令但不执行
```

## Web 管理后台（v1）

`fastcli web` 会在本机启动一个仅监听 `127.0.0.1` 的管理后台，并自动尝试打开浏览器。

启动后，终端会打印两项关键信息：

- 访问 URL，例如 `http://127.0.0.1:9911`
- 一次性口令，用于首次进入后台

首次进入页面时，需要先输入一次性口令。验证通过后，才能访问后台页面。

### 当前能力范围

- 查看 `aliases`、`providers`、`credentials`、`workflows` 四类配置总览
- 在右侧抽屉中编辑已有条目
- 支持表单模式和 JSON 模式切换
- 支持点击校验、保存全部、导入覆盖、导出当前工作态
- 保存时执行严格校验；存在错误时会阻断保存

### 当前限制

- v1 只支持编辑已有条目
- 暂不支持新增条目
- 暂不支持删除条目
- 导入采用全量覆盖，不做局部 merge

### 使用前提

- 请先确保 `~/.fastcli/config.json` 已存在
- 如果配置文件不存在，请先运行 `fastcli config init`
- 如果配置文件 JSON 已损坏，后台会提示修复建议，但不会自动修复

## 配置文件

配置文件位于 `~/.fastcli/config.json`。

根目录已提供完整模板：`config.temp.json`（内容与下方一致）。

```json
{
  "aliases": {
    "c": {
      "command": "claude --port 3000",
      "description": "启动 Claude"
    },
    "ga": {
      "command": "git add .",
      "description": "暂存所有更改"
    },
    "gp": {
      "command": "git push",
      "description": "推送到远程"
    }
  },
  "providers": {
    "codex": {
      "providerId": "codex",
      "command": "codex",
      "modeArgs": {
        "resume": ["--resume"],
        "new-session": ["--new"]
      },
      "envMapping": {
        "OPENAI_API_KEY": "token"
      }
    },
    "copilot": {
      "providerId": "copilot",
      "command": "copilot",
      "modeArgs": {
        "resume": ["--resume"],
        "new-session": []
      },
      "envMapping": {
        "COPILOT_GITHUB_TOKEN": "token"
      }
    }
  },
  "credentials": {
    "work": {
      "label": "工作账号",
      "values": {
        "token": "REPLACE_WITH_WORK_TOKEN"
      }
    },
    "personal": {
      "label": "个人账号",
      "values": {
        "token": "REPLACE_WITH_PERSONAL_TOKEN"
      }
    }
  },
  "workflows": {
    "git-flow": {
      "description": "Git 提交工作流",
      "steps": [
        {
          "id": "action",
          "prompt": "选择操作",
          "options": [
            { "name": "暂存所有", "value": "add", "next": "commit-type" },
            { "name": "查看状态", "command": "git status" }
          ]
        },
        {
          "id": "commit-type",
          "prompt": "选择提交类型",
          "options": [
            { "name": "feat: 新功能", "command": "git add . && git commit -m \"feat: {{commit-type}}\"" },
            { "name": "fix: 修复", "command": "git add . && git commit -m \"fix: {{commit-type}}\"" }
          ]
        }
      ]
    },
    "codex-chat": {
      "description": "启动 Codex 交互会话",
      "provider": "codex",
      "steps": [
        {
          "id": "select-account",
          "prompt": "选择凭据",
          "options": [
            { "name": "工作账号", "value": "work", "next": "select-mode" },
            { "name": "个人账号", "value": "personal", "next": "select-mode" }
          ]
        },
        {
          "id": "select-mode",
          "prompt": "选择启动模式",
          "options": [
            { "name": "恢复会话", "value": "resume" },
            { "name": "新会话", "value": "new-session" }
          ]
        }
      ]
    },
    "copilot-chat": {
      "description": "启动 Copilot 交互会话",
      "provider": "copilot",
      "steps": [
        {
          "id": "select-account",
          "prompt": "选择凭据",
          "options": [
            { "name": "工作账号", "value": "work", "next": "select-mode" }
          ]
        },
        {
          "id": "select-mode",
          "prompt": "选择启动模式",
          "options": [
            { "name": "恢复会话", "value": "resume" },
            { "name": "新会话", "value": "new-session" }
          ]
        }
      ]
    }
  }
}
```

### 工作流配置说明

每个工作流包含多个步骤（steps），每个步骤包含：

- `id`：步骤唯一标识
- `prompt`：显示给用户的提示
- `options`：可选项列表
  - `name`：选项名称
  - `value`：存储到上下文的值（可选，默认为 name）
  - `next`：跳转到的下一个步骤 ID
  - `command`：终止命令（选择此项后执行命令并结束工作流）

Provider 模型可选字段：

- `workflow.provider`：工作流级 provider（可被 `option.provider` 覆盖）
- `option.provider`：选项级 provider 覆盖

配置根节点可选字段：

- `providers`：定义外部交互式 CLI 的启动命令与模式参数
- `credentials`：定义凭据池，运行时通过 `option.value` 选择凭据并映射到环境变量

### 变量替换

在 `command` 中可以使用 `{{step-id}}` 引用之前步骤选择的值：

```json
{
  "id": "account",
  "prompt": "选择账号",
  "options": [
    { "name": "账号1", "value": "user1", "next": "action" }
  ]
},
{
  "id": "action",
  "prompt": "执行操作",
  "options": [
    { "name": "登录", "command": "login --user={{account}}" }
  ]
}
```

## 示例：Copilot 账号切换工作流

```json
{
  "workflows": {
    "copilot": {
      "description": "Copilot 账号切换",
      "steps": [
        {
          "id": "account",
          "prompt": "选择账号",
          "options": [
            { "name": "工作账号", "value": "work@example.com", "next": "action" },
            { "name": "个人账号", "value": "personal@gmail.com", "next": "action" }
          ]
        },
        {
          "id": "action",
          "prompt": "执行操作",
          "options": [
            { "name": "登录", "command": "gh auth login -h github.com -u {{account}}" },
            { "name": "查看状态", "command": "gh auth status" }
          ]
        }
      ]
    }
  }
}
```

使用：`fastcli copilot`

## 示例：Provider + Credentials 通用交互式 CLI

```json
{
  "providers": {
    "codex": {
      "providerId": "codex",
      "command": "codex",
      "modeArgs": {
        "resume": ["--resume"],
        "new-session": ["--new"]
      },
      "envMapping": {
        "OPENAI_API_KEY": "token"
      }
    }
  },
  "credentials": {
    "work": {
      "label": "工作账号",
      "values": {
        "token": "sk-live-***"
      }
    }
  },
  "workflows": {
    "codex-chat": {
      "description": "启动 Codex 交互会话",
      "provider": "codex",
      "steps": [
        {
          "id": "select-account",
          "prompt": "选择凭据",
          "options": [
            { "name": "工作账号", "value": "work", "next": "select-mode" }
          ]
        },
        {
          "id": "select-mode",
          "prompt": "选择启动模式",
          "options": [
            { "name": "恢复会话", "value": "resume" },
            { "name": "新会话", "value": "new-session" }
          ]
        }
      ]
    }
  }
}
```

使用：

```bash
fastcli codex-chat
fastcli codex-chat --dry-run
```

## 开发

```bash
# 安装依赖
pnpm install

# 开发模式（监听文件变化）
pnpm dev

# 构建
pnpm build

# 运行测试
pnpm test

# 本地链接（用于测试）
pnpm link -g
```

## 技术栈

- Node.js >= 18
- TypeScript
- Commander.js（CLI 框架）
- @inquirer/prompts（交互式选择）
- Vitest（测试）
- tsup（构建）

## License

MIT © [namewta](https://github.com/namewta)
