# Mantine 高级模式

## 1. 服务端渲染（SSR）

### Next.js App Router 配置

```tsx
// app/layout.tsx
import '@mantine/core/styles.css';
import { ColorSchemeScript, MantineProvider, createTheme } from '@mantine/core';

const theme = createTheme({ /* ... */ });

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="zh">
      <head>
        <ColorSchemeScript defaultColorScheme="auto" />
      </head>
      <body>
        <MantineProvider theme={theme} defaultColorScheme="auto">
          {children}
        </MantineProvider>
      </body>
    </html>
  );
}
```

### 关键注意事项

- `ColorSchemeScript` 必须在 `<head>` 中渲染，防止暗色模式闪烁
- `useMediaQuery` 在 SSR 时返回 `undefined`，需要处理 hydration 不匹配
- 使用 `getInitialValueInEffect: true`（`useLocalStorage` 的选项）避免 hydration 错误

## 2. 自定义组件封装

### 带预设的 Button 变体

```tsx
import { Button, ButtonProps, createPolymorphicComponent } from '@mantine/core';
import { forwardRef } from 'react';

interface CustomButtonProps extends ButtonProps {
  danger?: boolean;
}

const _CustomButton = forwardRef<HTMLButtonElement, CustomButtonProps>(
  ({ danger, ...others }, ref) => (
    <Button
      ref={ref}
      color={danger ? 'red' : undefined}
      variant={danger ? 'filled' : 'default'}
      {...others}
    />
  )
);

// 支持多态（component prop）
export const CustomButton = createPolymorphicComponent<'button', CustomButtonProps>(_CustomButton);
```

### 组合组件模式

```tsx
import { Card, CardProps, Text, Badge, Group, Image, Stack } from '@mantine/core';

interface ProductCardProps extends Omit<CardProps, 'children'> {
  image: string;
  title: string;
  price: number;
  category: string;
  inStock: boolean;
}

export function ProductCard({ image, title, price, category, inStock, ...cardProps }: ProductCardProps) {
  return (
    <Card shadow="sm" padding="lg" radius="md" withBorder {...cardProps}>
      <Card.Section>
        <Image src={image} height={160} alt={title} />
      </Card.Section>

      <Group justify="space-between" mt="md" mb="xs">
        <Text fw={500} lineClamp={1}>{title}</Text>
        <Badge color={inStock ? 'green' : 'red'} variant="light">
          {inStock ? '有货' : '缺货'}
        </Badge>
      </Group>

      <Text size="sm" c="dimmed">{category}</Text>
      <Text size="lg" fw={700} mt="sm">¥{price.toFixed(2)}</Text>
    </Card>
  );
}
```

## 3. 动画与过渡

### Transition 组件

```tsx
import { Transition, Paper, Button } from '@mantine/core';

function AnimatedPanel() {
  const [opened, { toggle }] = useDisclosure(false);

  return (
    <>
      <Button onClick={toggle}>切换</Button>
      <Transition
        mounted={opened}
        transition="slide-down"
        duration={400}
        timingFunction="ease"
      >
        {(styles) => (
          <Paper style={styles} shadow="md" p="md" mt="md">
            动画内容
          </Paper>
        )}
      </Transition>
    </>
  );
}
```

### 内置过渡效果

- `fade` — 淡入淡出
- `scale` / `scale-y` / `scale-x` — 缩放
- `skew-up` / `skew-down` — 倾斜
- `rotate-left` / `rotate-right` — 旋转
- `slide-down` / `slide-up` / `slide-left` / `slide-right` — 滑动
- `pop` / `pop-top-left` / `pop-top-right` / `pop-bottom-left` / `pop-bottom-right` — 弹出

### Collapse 折叠

```tsx
import { Collapse, Button, Box } from '@mantine/core';

function CollapsibleSection() {
  const [opened, { toggle }] = useDisclosure(false);

  return (
    <>
      <Button onClick={toggle} mb="md">
        {opened ? '收起' : '展开'}详情
      </Button>
      <Collapse in={opened}>
        <Box p="md" bg="gray.0" style={{ borderRadius: 'var(--mantine-radius-md)' }}>
          折叠内容区域
        </Box>
      </Collapse>
    </>
  );
}
```

## 4. 国际化（i18n）

### 日期组件本地化

```tsx
import 'dayjs/locale/zh-cn';
import { DatesProvider } from '@mantine/dates';

<DatesProvider settings={{ locale: 'zh-cn', firstDayOfWeek: 1, weekendDays: [0, 6] }}>
  {/* 所有日期组件自动使用中文 */}
</DatesProvider>
```

### 组件文案覆盖

```tsx
// 通过 theme 覆盖组件默认文案
const theme = createTheme({
  components: {
    Pagination: {
      defaultProps: {
        getItemProps: (page) => ({ 'aria-label': `第 ${page} 页` }),
      },
    },
  },
});
```

## 5. 测试模式

### 测试 Mantine 组件

```tsx
import { render, screen } from '@testing-library/react';
import { MantineProvider } from '@mantine/core';
import userEvent from '@testing-library/user-event';

// 包装器
function TestWrapper({ children }: { children: React.ReactNode }) {
  return <MantineProvider>{children}</MantineProvider>;
}

// 测试表单
test('表单校验', async () => {
  render(<SignupForm />, { wrapper: TestWrapper });

  await userEvent.click(screen.getByRole('button', { name: '提交' }));

  expect(screen.getByText('邮箱格式错误')).toBeInTheDocument();
});

// 测试 Modal
test('确认弹窗', async () => {
  render(<DeleteButton />, { wrapper: TestWrapper });

  await userEvent.click(screen.getByRole('button', { name: '删除' }));

  // Modal 内容
  expect(screen.getByText('确认删除')).toBeInTheDocument();
  await userEvent.click(screen.getByRole('button', { name: '确认' }));
});
```

### 测试注意事项

- 始终用 `MantineProvider` 包裹测试组件
- `useMediaQuery` 在 jsdom 中返回 `false`，需要 mock
- Portal 组件（Modal、Popover）默认渲染到 `document.body`
- 使用 `data-testid` 或 ARIA 角色定位元素

## 6. 主题扩展

### 自定义 CSS 变量

```tsx
import { CSSVariablesResolver, createTheme } from '@mantine/core';

const resolver: CSSVariablesResolver = (theme) => ({
  variables: {
    '--mantine-hero-height': '400px',
    '--mantine-sidebar-width': '260px',
  },
  light: {
    '--mantine-color-body': '#f8f9fa',
    '--mantine-color-surface': '#ffffff',
  },
  dark: {
    '--mantine-color-body': '#1a1b1e',
    '--mantine-color-surface': '#25262b',
  },
});

const theme = createTheme({ /* ... */ });

<MantineProvider theme={theme} cssVariablesResolver={resolver}>
```

### 虚拟颜色（动态主色）

```tsx
import { createTheme, virtualColor } from '@mantine/core';

const theme = createTheme({
  colors: {
    primary: virtualColor({
      name: 'primary',
      dark: 'cyan',
      light: 'indigo',
    }),
  },
  primaryColor: 'primary',
});
```

## 7. 无障碍增强

### 焦点管理

```tsx
import { FocusTrap } from '@mantine/core';

// 自动焦点陷阱
<FocusTrap active={opened}>
  <div>
    <TextInput data-autofocus label="自动聚焦" />
    <Button>操作</Button>
  </div>
</FocusTrap>
```

### 屏幕阅读器

```tsx
import { VisuallyHidden } from '@mantine/core';

<ActionIcon aria-label="关闭菜单">
  <IconX size={16} />
</ActionIcon>

// 或使用 VisuallyHidden
<Button>
  <IconDownload size={16} />
  <VisuallyHidden>下载文件</VisuallyHidden>
</Button>
```

### 键盘导航

- 所有交互组件支持 Tab 导航
- Modal/Drawer 自动管理焦点陷阱
- Menu 支持方向键导航
- DatePicker 支持方向键 + Enter 选择
- 使用 `enableKeyboardNavigation` 增强日期组件键盘支持

## 8. 性能优化模式

### 懒加载重型组件

```tsx
import { lazy, Suspense } from 'react';
import { Skeleton } from '@mantine/core';

const RichTextEditor = lazy(() => import('./RichTextEditor'));
const Charts = lazy(() => import('./Charts'));

function App() {
  return (
    <Suspense fallback={<Skeleton height={400} />}>
      <RichTextEditor />
    </Suspense>
  );
}
```

### 避免不必要的重渲染

```tsx
// ❌ 每次渲染创建新对象
<TextInput styles={{ input: { fontSize: 16 } }} />

// ✅ 使用 CSS Modules
import classes from './Input.module.css';
<TextInput classNames={{ input: classes.input }} />

// ✅ 或提取为常量
const inputStyles = { input: { fontSize: 16 } };
<TextInput styles={inputStyles} />
```

### 虚拟化长列表

```tsx
import { useVirtualizer } from '@tanstack/react-virtual';
import { ScrollArea } from '@mantine/core';

function VirtualList({ items }: { items: string[] }) {
  const parentRef = useRef<HTMLDivElement>(null);
  const virtualizer = useVirtualizer({
    count: items.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 50,
  });

  return (
    <ScrollArea h={400} viewportRef={parentRef}>
      <div style={{ height: virtualizer.getTotalSize(), position: 'relative' }}>
        {virtualizer.getVirtualItems().map((virtualItem) => (
          <div
            key={virtualItem.key}
            style={{
              position: 'absolute',
              top: virtualItem.start,
              height: virtualItem.size,
              width: '100%',
            }}
          >
            {items[virtualItem.index]}
          </div>
        ))}
      </div>
    </ScrollArea>
  );
}
```
