# 搜索笔记

搜索让用户按标题或正文找到笔记、查看匹配笔记，并区分没有结果与搜索不可用。

## 子功能

- `search-open` 从每个支持的浏览器入口打开搜索。
- `search-match` 返回标题和正文匹配，不改变笔记数据。
- `search-open-result` 在编辑器中打开结果。
- `search-empty` 对无匹配查询显示完整空状态。
- `search-clear` 清除查询，恢复最近笔记视图。
- `search-cli` 从终端返回相同匹配笔记。

## 如何到达（用户视角）

- 选择浏览器工具栏 `Search` 按钮。
- 浏览器焦点不在可编辑字段时按 `/`。
- 终端运行 `notes search <query>`。

## 使用 control-notes 驱动

前置条件：

- 笔记应用在 `http://127.0.0.1:4173` 健康运行。
- 可丢弃数据目录含正文为 `Draft budget` 的 `Quarterly plan`。
- `control-notes doctor` 报告预期地址和数据目录。

- **工具栏入口。** 选择 `Search`，运行 `control-notes browser click --role button --name "Search"`。出现 `Search notes` 对话框，焦点在搜索框。
- **键盘入口。** 关闭对话框，聚焦页面，按 `/`。运行 `control-notes browser press --key "/"`。相同对话框出现，页面未插入斜杠。
- **标题匹配。** 输入 `quarterly`，运行 `control-notes browser fill --role searchbox --name "Search notes" --value "quarterly"`。`Search results` 列表包含 `Quarterly plan`，不含 `Grocery list`。
- **正文匹配。** 查询改为 `budget`，运行 `control-notes browser fill --role searchbox --name "Search notes" --value "budget"`。`Quarterly plan` 仍可见，附正文匹配摘要。
- **打开结果。** 选择 `Quarterly plan`，运行 `control-notes browser click --role link --name "Quarterly plan"`。对话框关闭，编辑器标题为 `Quarterly plan`。
- **空状态。** 重新打开搜索，输入 `volcano`，运行 `control-notes browser fill --role searchbox --name "Search notes" --value "volcano"`。搜索完成后出现 `No matching notes` 状态。
- **清除查询。** 选择 `Clear search`，运行 `control-notes browser click --role button --name "Clear search"`。搜索框为空，`Recent notes` 区域替代结果列表。
- **CLI 匹配。** 从终端搜索，运行 `control-notes cli -- notes search "quarterly" --format json`。退出码 `0`，stdout 含一个标题为 `Quarterly plan` 的对象。
- **CLI 未匹配。** 搜索不存在值，运行 `control-notes cli -- notes search "volcano" --format json`。退出码 `0`，stdout 为 `[]`。
- **证明。** 捕获有结果状态，运行 `control-notes browser snapshot --aria --path "$RUN_DIR/results.aria.txt"` 和 `control-notes browser screenshot --path "$RUN_DIR/results.png"`。两份产物都识别笔记应用、查询和 `Quarterly plan`。

## 注意事项

- 编辑器或搜索框聚焦时按 `/` 会输入文字，不打开搜索。
- 结果在短暂防抖后更新。等待结果列表或空状态，不用固定睡眠。
- 除非用户启用 `Include archived`，否则排除归档笔记。
- CLI 默认人类可读输出。稳定断言使用 `--format json`。
- 打开结果会改变浏览器状态。证明另一个查询前重新打开搜索。
