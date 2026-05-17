---
name: mantine
type: ui-ux-rule
description: >-
  使用 Mantine 组件库构建 React UI。涵盖核心组件选型、主题定制、Styles API、
  布局模式、表单处理、日期选择器、图表、日程组件、通知系统、模态框管理、
  Spotlight 搜索、文件上传、轮播、富文本编辑与 50+ hooks。
  触发词：Mantine、UI 组件、主题配置、Styles API、DatePicker、Schedule、
  Heatmap、通知、模态框、表单布局、Spotlight、Dropzone、Carousel、hooks。
version: "1.1.0"
author: "wta"
---

# Mantine UI 开发规范

为 AI 代理提供使用 Mantine 构建 React 应用的程序性知识。覆盖组件选型决策、样式定制模式与扩展包集成。

## 1. 包体系与安装

Mantine 采用模块化包结构，按需安装：

| 包名 | 用途 | 样式导入 |
|------|------|---------|
| `@mantine/core` | 核心组件（Button、Input、Modal 等 120+） | `@mantine/core/styles.css` |
| `@mantine/hooks` | 状态与 UI 管理 hooks（50+） | 无 |
| `@mantine/form` | 表单状态管理与校验 | 无 |
| `@mantine/dates` | 日期/时间选择器（依赖 dayjs） | `@mantine/dates/styles.css` |
| `@mantine/charts` | 图表组件（依赖 recharts） | `@mantine/charts/styles.css` |
| `@mantine/schedule` | 日程视图（日/周/月/年） | `@mantine/schedule/styles.css` |
| `@mantine/notifications` | 通知系统 | `@mantine/notifications/styles.css` |
| `@mantine/modals` | 模态框管理器 | 无（复用 core） |
| `@mantine/spotlight` | 全局搜索面板（Cmd+K） | `@mantine/spotlight/styles.css` |
| `@mantine/carousel` | 轮播组件（依赖 embla） | `@mantine/carousel/styles.css` |
| `@mantine/dropzone` | 文件拖放上传 | `@mantine/dropzone/styles.css` |
| `@mantine/tiptap` | 富文本编辑器 | `@mantine/tiptap/styles.css` |
| `@mantine/code-highlight` | 代码高亮 | `@mantine/code-highlight/styles.css` |
| `@mantine/nprogress` | 页面加载进度条 | `@mantine/nprogress/styles.css` |

**关键规则**：

- 扩展包样式必须在 `@mantine/core/styles.css` **之后**导入
- 使用 `postcss-preset-mantine` + `postcss-simple-vars` 处理 CSS
- 图标推荐 `@tabler/icons-react`（MIT 协议，与 Mantine 设计语言一致）

## 2. 应用骨架

```tsx
import '@mantine/core/styles.css';
import '@mantine/notifications/styles.css';
import '@mantine/dates/styles.css';
// 按需导入其他扩展包样式...

import { createTheme, MantineProvider } from '@mantine/core';
import { Notifications } from '@mantine/notifications';
import { ModalsProvider } from '@mantine/modals';

const theme = createTheme({
  primaryColor: 'blue',
  defaultRadius: 'md',
  fontFamily: 'Inter, sans-serif',
  autoContrast: true,
  primaryShade: { light: 6, dark: 8 },
});

function App() {
  return (
    <MantineProvider theme={theme} defaultColorScheme="auto">
      <ModalsProvider>
        <Notifications position="top-right" />
        {/* 应用内容 */}
      </ModalsProvider>
    </MantineProvider>
  );
}
```

PostCSS 配置（必需）：

```js
// postcss.config.cjs
module.exports = {
  plugins: {
    'postcss-preset-mantine': {},
    'postcss-simple-vars': {
      variables: {
        'mantine-breakpoint-xs': '36em',
        'mantine-breakpoint-sm': '48em',
        'mantine-breakpoint-md': '62em',
        'mantine-breakpoint-lg': '75em',
        'mantine-breakpoint-xl': '88em',
      },
    },
  },
};
```

## 3. 主题定制

### 3.1 Theme 对象核心字段

```tsx
import { createTheme } from '@mantine/core';

const theme = createTheme({
  primaryColor: 'blue',           // 主色（theme.colors 的 key）
  primaryShade: { light: 6, dark: 8 }, // 明暗模式下的色阶
  autoContrast: true,             // 自动计算文字对比色
  defaultRadius: 'md',           // 全局圆角
  fontFamily: 'Inter, sans-serif',
  fontFamilyMonospace: 'JetBrains Mono, monospace',
  headings: { fontFamily: 'Greycliff CF, sans-serif' },
  spacing: { xs: '0.5rem', sm: '0.75rem', md: '1rem', lg: '1.5rem', xl: '2rem' },
  colors: {
    brand: ['#f0f4ff', '#d6e4ff', '#adc8ff', '#84a9ff', '#6690ff',
            '#3366ff', '#254edb', '#1939b7', '#102693', '#091a7a'],
  },
});
```

### 3.2 全局组件默认值

```tsx
import { Button, TextInput, createTheme } from '@mantine/core';

const theme = createTheme({
  components: {
    Button: Button.extend({
      defaultProps: { variant: 'filled', radius: 'md' },
      classNames: { root: 'my-button-root' },
    }),
    TextInput: TextInput.extend({
      defaultProps: { size: 'md' },
    }),
  },
});
```

### 3.3 暗色模式

使用 `useMantineColorScheme` hook 切换：

```tsx
import { useMantineColorScheme, ActionIcon } from '@mantine/core';
import { IconSun, IconMoon } from '@tabler/icons-react';

function ColorSchemeToggle() {
  const { colorScheme, toggleColorScheme } = useMantineColorScheme();
  return (
    <ActionIcon onClick={toggleColorScheme} variant="default" size="lg">
      {colorScheme === 'dark' ? <IconSun size={18} /> : <IconMoon size={18} />}
    </ActionIcon>
  );
}
```

CSS 中使用 `light` / `dark` mixin：

```css
.card {
  @mixin light { background-color: var(--mantine-color-white); }
  @mixin dark { background-color: var(--mantine-color-dark-7); }
}
```


## 4. Styles API 模式

所有 Mantine 组件支持 Styles API，通过 `classNames` / `styles` / `vars` 定制内部元素。

### 4.1 classNames（推荐）

```tsx
import { TextInput } from '@mantine/core';
import classes from './MyInput.module.css';

<TextInput
  classNames={{
    root: classes.root,
    input: classes.input,
    label: classes.label,
  }}
/>
```

### 4.2 CSS 变量覆盖

```tsx
import { Button, createTheme } from '@mantine/core';

const theme = createTheme({
  components: {
    Button: Button.extend({
      vars: (theme, props) => {
        if (props.size === 'xxl') {
          return { root: { '--button-height': '4rem', '--button-fz': '1.5rem' } };
        }
        return { root: {} };
      },
    }),
  },
});
```

### 4.3 静态选择器

每个组件暴露 `.mantine-{Component}-{selector}` 格式的静态类名，可用于全局 CSS 覆盖。

### 4.4 样式优先级

1. **Props**（`color`, `variant`, `size`）— 首选
2. **CSS 变量**（`vars` prop 或 theme.components）— 需要动态计算时
3. **classNames + CSS Modules** — 复杂样式定制
4. **styles prop**（内联对象）— 仅用于一次性覆盖，避免在渲染中创建新对象

## 5. 布局组件选型

| 需求 | 组件 | 关键 props |
|------|------|-----------|
| 应用外壳（侧边栏+头部） | `AppShell` | `navbar`, `header`, `aside`, `footer` |
| 弹性布局 | `Flex` / `Group`（水平）/ `Stack`（垂直） | `gap`, `align`, `justify` |
| 网格系统 | `Grid` + `Grid.Col` | `span`, `offset`, 响应式 `span={{ base: 12, md: 6 }}` |
| 简单等分 | `SimpleGrid` | `cols={{ base: 1, sm: 2, lg: 4 }}` |
| 居中 | `Center` | — |
| 间距 | `Space` | `h`, `w` |
| 容器 | `Container` | `size` (`xs`–`xl`) |
| 滚动区域 | `ScrollArea` | `type`, `offsetScrollbars` |

### AppShell 典型用法

```tsx
import { AppShell, Burger, Group, NavLink, Text } from '@mantine/core';
import { useDisclosure } from '@mantine/hooks';

function Layout({ children }: { children: React.ReactNode }) {
  const [opened, { toggle }] = useDisclosure();

  return (
    <AppShell
      header={{ height: 60 }}
      navbar={{ width: 260, breakpoint: 'sm', collapsed: { mobile: !opened } }}
      padding="md"
    >
      <AppShell.Header>
        <Group h="100%" px="md">
          <Burger opened={opened} onClick={toggle} hiddenFrom="sm" size="sm" />
          <Text fw={700} size="lg">应用名称</Text>
        </Group>
      </AppShell.Header>

      <AppShell.Navbar p="md">
        <NavLink label="首页" href="/" />
        <NavLink label="设置" href="/settings" />
      </AppShell.Navbar>

      <AppShell.Main>{children}</AppShell.Main>
    </AppShell>
  );
}
```

## 6. 常用组件速查

### 输入类

`TextInput` / `NumberInput` / `PasswordInput` / `Textarea` / `Select` / `MultiSelect` / `Autocomplete` / `ColorInput` / `FileInput` / `Checkbox` / `Radio` / `Switch` / `Slider` / `Rating` / `PinInput` / `TagsInput` / `JsonInput`

### 数据展示

`Table` / `Card` / `Accordion` / `Timeline` / `Badge` / `Avatar` / `Image` / `Spoiler` / `Kbd` / `Code` / `Highlight` / `List` / `ThemeIcon` / `NumberFormatter`

### 覆盖层

`Modal` / `Drawer` / `Popover` / `Tooltip` / `HoverCard` / `Menu` / `Dialog` / `Affix`

### 导航

`Tabs` / `NavLink` / `Breadcrumbs` / `Pagination` / `Stepper` / `Anchor` / `AppShell`

### 反馈

`Notification` / `Alert` / `Progress` / `Loader` / `Skeleton` / `Overlay` / `LoadingOverlay`

### 排版

`Title` / `Text` / `Mark` / `Blockquote` / `TypographyStylesProvider`


## 7. 表单处理（@mantine/form）

### 7.1 基础用法

```tsx
import { useForm, isNotEmpty, isEmail, hasLength } from '@mantine/form';
import { TextInput, PasswordInput, Select, Checkbox, Button, Stack } from '@mantine/core';

function SignupForm() {
  const form = useForm({
    mode: 'uncontrolled',
    initialValues: { name: '', email: '', password: '', role: '', terms: false },
    validate: {
      name: hasLength({ min: 2, max: 50 }, '名称 2-50 字符'),
      email: isEmail('邮箱格式错误'),
      password: hasLength({ min: 8 }, '密码至少 8 个字符'),
      role: isNotEmpty('请选择角色'),
      terms: (v) => (v ? null : '必须同意条款'),
    },
  });

  return (
    <form onSubmit={form.onSubmit((values) => console.log(values))}>
      <Stack gap="sm">
        <TextInput label="名称" placeholder="你的名字" {...form.getInputProps('name')} />
        <TextInput label="邮箱" placeholder="you@example.com" {...form.getInputProps('email')} />
        <PasswordInput label="密码" {...form.getInputProps('password')} />
        <Select
          label="角色"
          data={['开发者', '设计师', '产品经理', '其他']}
          {...form.getInputProps('role')}
        />
        <Checkbox label="我同意条款" {...form.getInputProps('terms', { type: 'checkbox' })} />
        <Button type="submit">创建账号</Button>
      </Stack>
    </form>
  );
}
```

### 7.2 嵌套字段与列表

```tsx
const form = useForm({
  initialValues: {
    profile: { firstName: '', lastName: '' },
    members: [{ name: '', email: '' }],
  },
});

// 嵌套访问
form.getInputProps('profile.firstName');

// 列表操作
form.insertListItem('members', { name: '', email: '' });
form.removeListItem('members', 0);
form.reorderListItem('members', { from: 0, to: 1 });
form.getInputProps(`members.${index}.name`);
```

### 7.3 Schema 校验（zod 集成）

```tsx
import { zodResolver } from 'mantine-form-zod-resolver';
import { z } from 'zod';

const schema = z.object({
  name: z.string().min(2, '名称至少 2 字符'),
  email: z.string().email('邮箱格式错误'),
  age: z.number().min(18, '必须年满 18 岁'),
});

const form = useForm({
  initialValues: { name: '', email: '', age: 0 },
  validate: zodResolver(schema),
});
```

### 7.4 表单最佳实践

- 使用 `mode: 'uncontrolled'` 获得更好性能（减少重渲染）
- 使用内置校验器（`isNotEmpty`, `isEmail`, `hasLength`, `matches`）处理简单场景
- 复杂校验使用 `zodResolver` / `yupResolver` / `joiResolver`
- `form.setFieldError` 用于服务端校验错误回填
- `form.isDirty()` 判断表单是否被修改，用于离开页面提示

## 8. Hooks 精选（@mantine/hooks）

| Hook | 用途 | 典型场景 |
|------|------|---------|
| `useDisclosure` | 布尔开关 | Modal/Drawer/Burger 控制 |
| `useDebouncedValue` | 防抖值 | 搜索输入 |
| `useDebouncedCallback` | 防抖回调 | API 请求 |
| `useMediaQuery` | 媒体查询 | 响应式逻辑 |
| `useClipboard` | 剪贴板 | 复制按钮 |
| `useLocalStorage` | 本地存储 | 持久化偏好 |
| `useHotkeys` | 快捷键 | Cmd+K / Cmd+S |
| `useIntersection` | 交叉观察 | 无限滚动/懒加载 |
| `useScrollIntoView` | 滚动到视图 | 锚点导航 |
| `useClickOutside` | 点击外部 | 自定义下拉关闭 |
| `useViewportSize` | 视口尺寸 | 动态布局 |
| `useNetwork` | 网络状态 | 离线提示 |
| `useIdle` | 空闲检测 | 自动登出 |
| `useOs` | 操作系统检测 | 快捷键提示 |
| `usePagination` | 分页逻辑 | 数据列表 |
| `useToggle` | 多值切换 | 视图模式切换 |
| `useCounter` | 计数器 | 数量选择 |
| `useMove` | 拖拽位置 | 颜色选择器 |
| `useResizeObserver` | 尺寸观察 | 自适应组件 |
| `useElementSize` | 元素尺寸 | 动态计算 |
| `useFocusTrap` | 焦点陷阱 | 无障碍弹窗 |
| `useFocusReturn` | 焦点恢复 | 弹窗关闭后 |

### Hooks 使用示例

```tsx
import {
  useDisclosure, useDebouncedValue, useClipboard,
  useMediaQuery, useHotkeys, useLocalStorage,
} from '@mantine/hooks';

// 防抖搜索
const [search, setSearch] = useState('');
const [debounced] = useDebouncedValue(search, 300);

// 剪贴板
const clipboard = useClipboard({ timeout: 2000 });
clipboard.copy('Hello!'); // clipboard.copied 为 true 持续 2 秒

// 响应式判断
const isMobile = useMediaQuery('(max-width: 768px)');

// 快捷键
useHotkeys([
  ['mod+K', () => openSpotlight()],
  ['mod+S', () => saveDocument()],
  ['mod+/', () => toggleHelp()],
]);

// 类型安全的本地存储
const [colorScheme, setColorScheme] = useLocalStorage<'light' | 'dark'>({
  key: 'color-scheme',
  defaultValue: 'light',
});
```


## 9. 扩展包使用指南

### 9.1 日期选择器（@mantine/dates）

依赖 `dayjs`。核心组件：

- `DatePicker` — 内联日历（支持 `type="default"|"range"|"multiple"`）
- `DatePickerInput` — 带输入框的日期选择
- `DateTimePicker` — 日期 + 时间
- `InlineDateTimePicker` — 内联日期时间（支持 range）
- `TimePicker` / `TimeInput` / `TimeGrid` — 时间选择
- `MonthPickerInput` / `YearPickerInput` — 月/年选择

全局配置用 `DatesProvider`（locale、firstDayOfWeek）：

```tsx
import { DatesProvider } from '@mantine/dates';
import 'dayjs/locale/zh-cn';

<DatesProvider settings={{ locale: 'zh-cn', firstDayOfWeek: 1 }}>
  {/* 所有日期组件自动使用中文 */}
</DatesProvider>
```

详见 [references/dates/](references/dates/) 获取完整 Props 与示例。

### 9.2 图表（@mantine/charts）

基于 recharts。核心组件：

- `AreaChart` / `BarChart` / `LineChart` / `CompositeChart`
- `DonutChart` / `PieChart` / `RadarChart` / `ScatterChart`
- `Heatmap` — GitHub 风格热力图
- `Sparkline` / `Treemap` / `FunnelChart`

```tsx
import { BarChart } from '@mantine/charts';

<BarChart
  h={300}
  data={data}
  dataKey="month"
  series={[
    { name: 'Smartphones', color: 'violet.6' },
    { name: 'Laptops', color: 'blue.6' },
    { name: 'Tablets', color: 'teal.6' },
  ]}
  tickLine="y"
/>
```

详见 [references/charts/heatmap.md](references/charts/heatmap.md) 获取 Heatmap 用法。

### 9.3 日程组件（@mantine/schedule）

统一的日程视图组件，支持日/周/月/年切换、拖拽、事件调整大小、循环事件。

```tsx
import { Schedule } from '@mantine/schedule';

<Schedule
  events={events}
  withEventsDragAndDrop
  onEventDrop={handleDrop}
  withEventResize
  onEventResize={handleResize}
  layout="responsive"  // 自动响应式切换视图
/>
```

详见 [references/schedule/schedule.md](references/schedule/schedule.md) 获取完整用法。

### 9.4 通知系统（@mantine/notifications）

```tsx
import { notifications } from '@mantine/notifications';

// 基础通知
notifications.show({
  title: '操作成功',
  message: '数据已保存',
  color: 'green',
  autoClose: 3000,
});

// 加载 → 完成 模式
const id = notifications.show({
  loading: true,
  title: '正在上传',
  message: '请稍候...',
  autoClose: false,
  allowClose: false,
});

// 上传完成后更新
notifications.update({
  id,
  color: 'teal',
  title: '上传完成',
  message: '文件已成功上传',
  loading: false,
  autoClose: 2000,
});
```

详见 [references/other/notifications_system.md](references/other/notifications_system.md)。

### 9.5 模态框管理器（@mantine/modals）

```tsx
import { modals } from '@mantine/modals';

// 确认弹窗
modals.openConfirmModal({
  title: '确认删除',
  children: <Text>此操作不可撤销，确定要删除吗？</Text>,
  labels: { confirm: '删除', cancel: '取消' },
  confirmProps: { color: 'red' },
  onConfirm: () => handleDelete(),
});

// 内容弹窗
modals.open({
  title: '编辑信息',
  children: <EditForm onClose={() => modals.closeAll()} />,
  size: 'lg',
});
```

详见 [references/other/modals.md](references/other/modals.md)。

### 9.6 Spotlight 全局搜索（@mantine/spotlight）

```tsx
import { Spotlight, spotlight } from '@mantine/spotlight';
import { IconSearch, IconHome, IconSettings } from '@tabler/icons-react';

// 在 App 根部渲染一次
<Spotlight
  actions={[
    { id: 'home', label: '首页', description: '返回首页', leftSection: <IconHome size={18} />, onClick: () => navigate('/') },
    { id: 'settings', label: '设置', description: '应用设置', leftSection: <IconSettings size={18} />, onClick: () => navigate('/settings') },
  ]}
  searchProps={{ leftSection: <IconSearch size={18} />, placeholder: '搜索...' }}
  nothingFound="未找到结果"
/>

// 任意位置触发
useHotkeys([['mod+K', () => spotlight.open()]]);
```

### 9.7 文件上传（@mantine/dropzone）

```tsx
import { Dropzone, IMAGE_MIME_TYPE } from '@mantine/dropzone';
import { IconUpload, IconPhoto, IconX } from '@tabler/icons-react';
import { Group, Text } from '@mantine/core';

<Dropzone
  onDrop={(files) => handleUpload(files)}
  onReject={(files) => console.log('rejected', files)}
  maxSize={5 * 1024 ** 2}
  accept={IMAGE_MIME_TYPE}
>
  <Group justify="center" gap="xl" mih={220} style={{ pointerEvents: 'none' }}>
    <Dropzone.Accept><IconUpload size={52} stroke={1.5} /></Dropzone.Accept>
    <Dropzone.Reject><IconX size={52} stroke={1.5} /></Dropzone.Reject>
    <Dropzone.Idle><IconPhoto size={52} stroke={1.5} /></Dropzone.Idle>
    <div>
      <Text size="xl" inline>拖放文件到此处或点击选择</Text>
      <Text size="sm" c="dimmed" inline mt={7}>每个文件不超过 5MB</Text>
    </div>
  </Group>
</Dropzone>
```

### 9.8 轮播（@mantine/carousel）

```tsx
import { Carousel } from '@mantine/carousel';
import { Image } from '@mantine/core';

<Carousel
  withIndicators
  height={400}
  slideSize="33.333%"
  slideGap="md"
  loop
  align="start"
  slidesToScroll={3}
>
  {images.map((url) => (
    <Carousel.Slide key={url}>
      <Image src={url} height={400} />
    </Carousel.Slide>
  ))}
</Carousel>
```

### 9.9 富文本编辑器（@mantine/tiptap）

```tsx
import { RichTextEditor, Link } from '@mantine/tiptap';
import { useEditor } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';

function Editor() {
  const editor = useEditor({
    extensions: [StarterKit, Link],
    content: '<p>开始编辑...</p>',
  });

  return (
    <RichTextEditor editor={editor}>
      <RichTextEditor.Toolbar sticky stickyOffset={60}>
        <RichTextEditor.ControlsGroup>
          <RichTextEditor.Bold />
          <RichTextEditor.Italic />
          <RichTextEditor.Strikethrough />
          <RichTextEditor.Code />
        </RichTextEditor.ControlsGroup>
        <RichTextEditor.ControlsGroup>
          <RichTextEditor.H1 />
          <RichTextEditor.H2 />
          <RichTextEditor.H3 />
        </RichTextEditor.ControlsGroup>
        <RichTextEditor.ControlsGroup>
          <RichTextEditor.BulletList />
          <RichTextEditor.OrderedList />
        </RichTextEditor.ControlsGroup>
        <RichTextEditor.ControlsGroup>
          <RichTextEditor.Link />
          <RichTextEditor.Unlink />
        </RichTextEditor.ControlsGroup>
      </RichTextEditor.Toolbar>
      <RichTextEditor.Content />
    </RichTextEditor>
  );
}
```


## 10. 数据展示模式

### 10.1 数据表格

```tsx
import { Table, ScrollArea, Badge, Group, Avatar, Text, ActionIcon } from '@mantine/core';
import { IconPencil, IconTrash } from '@tabler/icons-react';

function UsersTable({ data }: { data: User[] }) {
  return (
    <ScrollArea>
      <Table striped highlightOnHover withTableBorder withColumnBorders>
        <Table.Thead>
          <Table.Tr>
            <Table.Th>用户</Table.Th>
            <Table.Th>角色</Table.Th>
            <Table.Th>状态</Table.Th>
            <Table.Th>操作</Table.Th>
          </Table.Tr>
        </Table.Thead>
        <Table.Tbody>
          {data.map((user) => (
            <Table.Tr key={user.id}>
              <Table.Td>
                <Group gap="sm">
                  <Avatar src={user.avatar} size={30} radius="xl" />
                  <div>
                    <Text size="sm" fw={500}>{user.name}</Text>
                    <Text size="xs" c="dimmed">{user.email}</Text>
                  </div>
                </Group>
              </Table.Td>
              <Table.Td>{user.role}</Table.Td>
              <Table.Td>
                <Badge color={user.active ? 'green' : 'gray'} variant="light">
                  {user.active ? '活跃' : '停用'}
                </Badge>
              </Table.Td>
              <Table.Td>
                <Group gap={4}>
                  <ActionIcon variant="subtle" color="blue"><IconPencil size={16} /></ActionIcon>
                  <ActionIcon variant="subtle" color="red"><IconTrash size={16} /></ActionIcon>
                </Group>
              </Table.Td>
            </Table.Tr>
          ))}
        </Table.Tbody>
      </Table>
    </ScrollArea>
  );
}
```

### 10.2 统计卡片

```tsx
import { Card, Group, Text, ThemeIcon, SimpleGrid } from '@mantine/core';
import { IconArrowUpRight, IconArrowDownRight } from '@tabler/icons-react';

interface StatsCardProps {
  title: string;
  value: string;
  diff: number;
}

function StatsCard({ title, value, diff }: StatsCardProps) {
  const DiffIcon = diff > 0 ? IconArrowUpRight : IconArrowDownRight;
  return (
    <Card withBorder p="md" radius="md">
      <Text size="xs" c="dimmed" tt="uppercase" fw={700}>{title}</Text>
      <Group align="flex-end" gap="xs" mt={25}>
        <Text size="xl" fw={700}>{value}</Text>
        <Text c={diff > 0 ? 'teal' : 'red'} fz="sm" fw={500}>
          <Group gap={4}>
            <DiffIcon size={16} />
            <span>{Math.abs(diff)}%</span>
          </Group>
        </Text>
      </Group>
    </Card>
  );
}

// 使用
<SimpleGrid cols={{ base: 1, sm: 2, lg: 4 }}>
  <StatsCard title="营收" value="¥452,000" diff={12} />
  <StatsCard title="用户" value="1,234" diff={5} />
  <StatsCard title="订单" value="892" diff={18} />
  <StatsCard title="流失率" value="2.1%" diff={-3} />
</SimpleGrid>
```

### 10.3 Combobox 自定义选择器

当 `Select` / `MultiSelect` 不满足需求时，使用底层 `Combobox`：

```tsx
import { Combobox, InputBase, useCombobox } from '@mantine/core';

function CustomSelect({ data }: { data: string[] }) {
  const combobox = useCombobox({
    onDropdownClose: () => combobox.resetSelectedOption(),
  });
  const [value, setValue] = useState<string | null>(null);

  return (
    <Combobox
      store={combobox}
      onOptionSubmit={(val) => { setValue(val); combobox.closeDropdown(); }}
    >
      <Combobox.Target>
        <InputBase
          component="button"
          type="button"
          pointer
          rightSection={<Combobox.Chevron />}
          onClick={() => combobox.toggleDropdown()}
        >
          {value || <InputBase.Placeholder>选择...</InputBase.Placeholder>}
        </InputBase>
      </Combobox.Target>
      <Combobox.Dropdown>
        <Combobox.Options>
          {data.map((item) => (
            <Combobox.Option value={item} key={item}>{item}</Combobox.Option>
          ))}
        </Combobox.Options>
      </Combobox.Dropdown>
    </Combobox>
  );
}
```

## 11. 响应式设计

### Style Props 响应式

```tsx
import { Box, Text } from '@mantine/core';

// 对象语法：base → xs → sm → md → lg → xl
<Box p={{ base: 'xs', sm: 'md', lg: 'xl' }} />
<Text fz={{ base: 'sm', md: 'lg' }} />
```

### 条件渲染

```tsx
// visibleFrom：仅在指定断点及以上可见
<Box visibleFrom="sm">桌面端内容</Box>

// hiddenFrom：在指定断点及以上隐藏
<Box hiddenFrom="md">移动端内容</Box>
```

### CSS Modules 响应式

```css
.container {
  padding: var(--mantine-spacing-xs);

  @media (min-width: $mantine-breakpoint-sm) {
    padding: var(--mantine-spacing-md);
  }

  @media (min-width: $mantine-breakpoint-lg) {
    padding: var(--mantine-spacing-xl);
  }
}
```

## 12. 多态组件

使用 `component` prop 改变渲染的 HTML 元素：

```tsx
import { Button, Text } from '@mantine/core';
import { Link } from 'react-router-dom';

// Button 渲染为 <a>
<Button component="a" href="/path">链接按钮</Button>

// Button 渲染为 React Router Link
<Button component={Link} to="/path">路由链接</Button>

// 使用 renderRoot 获得完整类型安全
<Button renderRoot={(props) => <Link to="/path" {...props} />}>
  类型安全的路由链接
</Button>
```


## 13. 最佳实践

### 13.1 性能优化

- 使用 `React.lazy` 按需加载重型扩展包（charts、tiptap、schedule）
- `Skeleton` 组件用于加载态占位，提升感知性能
- `ScrollArea` 替代原生滚动以获得一致的跨浏览器体验
- 避免在 `styles` prop 中创建新对象（会导致重渲染），改用 `classNames`
- 使用 `useForm` 的 `mode: 'uncontrolled'` 减少表单重渲染
- 大列表使用虚拟化（配合 `@tanstack/react-virtual`）

### 13.2 可访问性

- 所有输入组件自动关联 `label` 与 `aria-describedby`
- 使用 `aria-label` / `ariaLabels` prop 为无文字控件提供标签
- `VisuallyHidden` 组件用于屏幕阅读器专用文本
- 日期组件支持完整键盘导航
- `Modal` / `Drawer` 自动管理焦点陷阱和焦点恢复
- 颜色对比度：启用 `autoContrast: true` 确保文字可读性
- 使用 `Loader` 的 `aria-label` 告知加载状态

### 13.3 错误处理模式

```tsx
import { Alert, Button, Stack } from '@mantine/core';
import { IconAlertCircle } from '@tabler/icons-react';
import { notifications } from '@mantine/notifications';

// 内联错误
<Alert icon={<IconAlertCircle size={16} />} title="出错了" color="red" variant="light">
  无法加载数据，请稍后重试。
</Alert>

// Toast 错误
notifications.show({
  title: '请求失败',
  message: '网络连接异常，请检查网络设置',
  color: 'red',
  autoClose: 5000,
});

// 表单服务端错误回填
form.setFieldError('email', '该邮箱已被注册');
form.setErrors({ email: '邮箱已存在', password: '密码强度不足' });
```

### 13.4 加载状态模式

```tsx
import { LoadingOverlay, Skeleton, Button, Stack } from '@mantine/core';

// 区域加载遮罩
<Box pos="relative">
  <LoadingOverlay visible={loading} zIndex={1000} overlayProps={{ radius: 'sm', blur: 2 }} />
  {/* 内容 */}
</Box>

// 骨架屏
<Stack>
  <Skeleton height={50} circle mb="xl" />
  <Skeleton height={8} radius="xl" />
  <Skeleton height={8} mt={6} radius="xl" />
  <Skeleton height={8} mt={6} width="70%" radius="xl" />
</Stack>

// 按钮加载态
<Button loading={isSubmitting} loaderProps={{ type: 'dots' }}>
  提交
</Button>
```

### 13.5 页面导航进度条

```tsx
import { nprogress, NavigationProgress } from '@mantine/nprogress';

// 在 App 根部渲染
<NavigationProgress />

// 路由切换时
nprogress.start();
// 加载完成
nprogress.complete();
```

## 14. 常见组合模式

### 14.1 搜索 + 筛选 + 表格

```tsx
function DataPage() {
  const [search, setSearch] = useState('');
  const [debounced] = useDebouncedValue(search, 300);
  const [role, setRole] = useState<string | null>(null);

  return (
    <Stack>
      <Group>
        <TextInput
          placeholder="搜索用户..."
          leftSection={<IconSearch size={16} />}
          value={search}
          onChange={(e) => setSearch(e.currentTarget.value)}
          style={{ flex: 1 }}
        />
        <Select
          placeholder="筛选角色"
          data={['管理员', '编辑', '查看者']}
          value={role}
          onChange={setRole}
          clearable
        />
      </Group>
      <UsersTable data={filteredData} />
      <Group justify="center">
        <Pagination total={totalPages} value={page} onChange={setPage} />
      </Group>
    </Stack>
  );
}
```

### 14.2 确认操作 + 通知反馈

```tsx
async function handleDelete(id: string) {
  modals.openConfirmModal({
    title: '确认删除',
    children: <Text size="sm">删除后无法恢复，确定继续？</Text>,
    labels: { confirm: '确认删除', cancel: '取消' },
    confirmProps: { color: 'red' },
    onConfirm: async () => {
      try {
        await deleteItem(id);
        notifications.show({ title: '已删除', message: '记录已成功删除', color: 'green' });
      } catch {
        notifications.show({ title: '删除失败', message: '请稍后重试', color: 'red' });
      }
    },
  });
}
```

## 15. LLM 文档资源

Mantine 提供 LLM 友好的文档格式：

- 索引：`https://mantine.dev/llms.txt`
- 单组件文档：`https://mantine.dev/llms/core-{component}.md`（如 `core-button`）
- 日期组件：`https://mantine.dev/llms/dates-{component}.md`
- 图表组件：`https://mantine.dev/llms/charts-{component}.md`
- 日程组件：`https://mantine.dev/llms/schedule-{component}.md`
- 完整文档：`https://mantine.dev/llms-full.txt`

当需要查阅特定组件的完整 Props 或 Styles API 时，优先访问上述 URL。
