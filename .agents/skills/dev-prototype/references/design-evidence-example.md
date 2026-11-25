# 示例：采购申请原型的 DESIGN 引用

此例仅用于学习证据定位，不能当目标项目默认风格，也未经用户确认；它不是完整 change 的确认原型。示例引用本技能安装包内的实际源码。项目使用时替换为当前项目已选定的原型及真实确认依据；这里只记录源码可证明的内容，不声称已经完成目标项目的浏览器验收。

## 来源与版本

以下各节引用本技能随包提供的采购申请示例，记为版本 E1。三个本地文件的 SHA-256 内容指纹如下；这是可核对的文件身份，不是 Git 提交号，也不表示任何用户已批准此示例。

| 本地文件 | SHA-256 内容指纹 |
| --- | --- |
| UI：[页面源码][ui] | `7b005238397fe5fdfb71941924e69b0ecbe60b716e35dc4a02b5aeac09d4eede` |
| CSS：[样式源码][css] | `e269eae88cfe7236c2b1584a58052797c09850ee087326238fb919ed12308824` |
| JS：[交互源码][js] | `22a019de5b85f580ddc7168a7b76af250ce5ceaf134afce3fee90df51b8339d7` |

所有链接相对本说明所在目录，资源均随技能安装，不依赖外部网页。页面入口是 [采购申请 UI][ui]，本地打开即可；CSS 与 JS 使用页面旁的相对资源。页面中的数据和操作为本地演示，JS 不持久化数据，刷新会恢复初始状态。若这些文件有改动，更新对应指纹与受影响说明；项目确认版本仍应记录自己的源码身份、场景覆盖和真实用户确认，不能沿用 E1 充当批准。

## 布局与信息层级

原型依据：[UI][ui] 的 `.enterprise-shell`、`.app-sidebar`、`main#requests`、`#overview` 和 `.data-section`；[CSS][css] 的 `.enterprise-shell`、`.app-sidebar`、`.app-main`、`.grid-3`、`.data-section` 与 `.table-wrap`；JS 不适用：此节描述静态结构。

侧栏导航、主区域顶部信息、概览卡片和申请列表的相对关系按这些节点与布局规则复现。桌面基础规则是 `220px minmax(0,1fr)`；窄屏使用下方引用的媒体查询。不要从“管理后台”这一描述推导另一种导航结构。

## 视觉样式与控件

原型依据：[UI][ui] 的 `body.enterprise`、`.card`、`.data-toolbar` 与 `[data-batch]`；[CSS][css] 的 `:root`、`.card`、`button`、`button:disabled`、`:focus-visible`、`.pill.good` 和 `.pill.wait`；[JS][js] 的 `selection()` 控制批量按钮禁用与文案。

颜色、字体、边框、圆角和间距读取实际 CSS：例如基础 `--accent` 为 `#175e4e`、`--radius` 为 `12px`，而按钮另有 `8px` 圆角。不要把一个 token 当成所有组件共用的值。页面使用系统字体栈，图标为页面中的字符；该页没有自定义字体或图标库资源。示例金额仍使用美元和原有数值，中文化没有改变货币含义。

## 筛选、选择与空状态

原型依据：[UI][ui] 的 `[data-search]`、`[data-status-filter]`、`[data-request]`、`[data-select-all]`、`[data-empty]`、`[data-count]`；[CSS][css] 的 `[hidden]`、`.empty-state`、`.table-foot`；[JS][js] 中 `enterprise-data` 分支的 `filter()`、`selection()` 及 `input/change` 事件。

复现场景：输入不存在的关键词，观察列表空状态和数量，再清除关键词。`filter()` 会隐藏不匹配行并取消隐藏行的选择；全选只作用于可见行。部分选择通过 `indeterminate` 表示，没有选择时禁用批量操作。不得把隐藏行仍参与批量操作写成等价实现。

## 详情弹层与焦点

原型依据：[UI][ui] 的 `[data-request-detail]`、`dialog#request-detail`、`[data-close-dialog]` 和 `aria-labelledby`；[CSS][css] 的 `dialog`、`dialog::backdrop`、`.detail-grid`、`:focus-visible`；[JS][js] 的 `[data-open-dialog]` 点击绑定、`dialogTrigger`、`close` 事件和 `[data-request-detail]` 数据填充。

复现场景：打开任一行的“查看”，核对标题、申请人、金额和状态；用关闭按钮返回，检查焦点回到触发按钮。这里使用原生 `showModal()` 模态对话框，不是右侧抽屉。Escape、Tab 与焦点约束依赖原生 dialog 行为，须在目标浏览器实际检查，不能仅凭源码引用宣称通过。

## 成功、失败与重试反馈

原型依据：[UI][ui] 的 `[data-batch]`、`[data-failure]`、`[data-feedback]` 和 `[data-state-label]`；[CSS][css] 的 `.notice`、`.notice.error`、`.pill.good`；[JS][js] 的 `[data-batch]` 点击处理、失败分支、`chosen.forEach` 与末尾 `filter()`。

复现场景：选择申请，开启失败模拟并点击批量批准。失败时保留选择并显示错误；关闭模拟后重试，状态变为 approved、选择清除、反馈恢复成功样式，列表按当前筛选重新计算。`role="status"` 与 `aria-live="polite"` 位于反馈节点。该流程是同步内存模拟，没有实际网络等待、超时或服务端权限验证。

## 响应式与减少动态效果

原型依据：[UI][ui] 的 `.enterprise-shell`、`.app-sidebar nav`、表格行与 `.grid-3`；[CSS][css] 的 `@media(max-width:1000px)`、`@media(max-width:760px)`、`@media(prefers-reduced-motion:reduce)` 及其中对应选择器；JS 不适用：这些适配由 CSS 完成。

1000px 及以下侧栏宽度改为 180px；760px 及以下导航转为顶部横排，申请行改为网格，概览仍为三列。减少动态效果时缩短过渡并取消按钮按压位移。检查各断点两侧和 reduced-motion 设置下的实际显示，不将“响应式”泛化为任意移动端布局。

## 边界与待补证据

原型依据：[UI][ui] 的预览说明与 `[data-failure]`；[CSS][css] 的 `:root` 设置 `color-scheme:light`；[JS][js] 的文件说明及同步批量操作。没有据此证明深色主题、真实请求的加载/超时、权限拒绝或持久化恢复；若项目要求这些效果，先补充对应原型状态及版本，再在各节引用，不能标为已确认。

业务鉴权、API 协议和持久化实现不由这个 UI 样例决定，属于此例的“不适用”范围；实际项目应引用其独立规格。示例中的布局、样式和交互引用也不能替代生产页面的实现验证。

[ui]: ../assets/example/enterprise-data.html
[css]: ../assets/example/assets/prototypes.css
[js]: ../assets/example/assets/prototypes.js
