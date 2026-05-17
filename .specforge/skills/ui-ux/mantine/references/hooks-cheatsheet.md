# Mantine Hooks 速查手册

## 状态管理 Hooks

### useDisclosure

布尔状态管理，适用于 Modal、Drawer、Burger 等开关场景。

```tsx
import { useDisclosure } from '@mantine/hooks';

const [opened, { open, close, toggle }] = useDisclosure(false);

// 带回调
const [opened, handlers] = useDisclosure(false, {
  onOpen: () => console.log('打开'),
  onClose: () => console.log('关闭'),
});
```

### useToggle

在多个值之间切换：

```tsx
import { useToggle } from '@mantine/hooks';

const [value, toggle] = useToggle(['grid', 'list', 'table']);
// value: 'grid' → 'list' → 'table' → 'grid'

// 也可指定切换到某个值
toggle('list');
```

### useCounter

数值计数器：

```tsx
import { useCounter } from '@mantine/hooks';

const [count, { increment, decrement, set, reset }] = useCounter(0, {
  min: 0,
  max: 10,
});
```

### useLocalStorage / useSessionStorage

类型安全的存储 hook：

```tsx
import { useLocalStorage } from '@mantine/hooks';

const [value, setValue, removeValue] = useLocalStorage<{ name: string; age: number }>({
  key: 'user-data',
  defaultValue: { name: '', age: 0 },
  getInitialValueInEffect: true, // SSR 安全
});
```

### useMap / useSet

响应式 Map/Set：

```tsx
import { useMap, useSet } from '@mantine/hooks';

const map = useMap([['key', 'value']]);
map.set('newKey', 'newValue');

const set = useSet(['a', 'b']);
set.add('c');
set.delete('a');
```

## UI 交互 Hooks

### useDebouncedValue / useDebouncedCallback

```tsx
import { useDebouncedValue, useDebouncedCallback } from '@mantine/hooks';

// 防抖值
const [search, setSearch] = useState('');
const [debounced] = useDebouncedValue(search, 300);

// 防抖回调（更适合 API 请求）
const handleSearch = useDebouncedCallback(async (query: string) => {
  const results = await fetchResults(query);
  setResults(results);
}, 300);
```

### useClickOutside

```tsx
import { useClickOutside } from '@mantine/hooks';

const ref = useClickOutside(() => setOpened(false));
// 支持多个事件
const ref = useClickOutside(() => setOpened(false), ['mousedown', 'touchstart']);
```

### useHotkeys

```tsx
import { useHotkeys } from '@mantine/hooks';

useHotkeys([
  ['mod+s', () => save()],           // Cmd+S (Mac) / Ctrl+S (Win)
  ['mod+shift+z', () => redo()],     // Cmd+Shift+Z
  ['alt+enter', () => submit()],     // Alt+Enter
  ['escape', () => close()],         // Escape
]);

// 全局快捷键（不需要组件聚焦）
// useHotkeys 默认绑定到 document
```

### useClipboard

```tsx
import { useClipboard } from '@mantine/hooks';

const clipboard = useClipboard({ timeout: 2000 });

<Button
  color={clipboard.copied ? 'teal' : 'blue'}
  onClick={() => clipboard.copy('复制的文本')}
>
  {clipboard.copied ? '已复制' : '复制'}
</Button>
```

### useFullscreen

```tsx
import { useFullscreen } from '@mantine/hooks';

const { toggle, fullscreen } = useFullscreen();

<Button onClick={toggle}>
  {fullscreen ? '退出全屏' : '全屏'}
</Button>
```

## 传感器 Hooks

### useMediaQuery

```tsx
import { useMediaQuery } from '@mantine/hooks';

const isMobile = useMediaQuery('(max-width: 768px)');
const prefersDark = useMediaQuery('(prefers-color-scheme: dark)');
const isRetina = useMediaQuery('(min-resolution: 2dppx)');
```

### useViewportSize

```tsx
import { useViewportSize } from '@mantine/hooks';

const { height, width } = useViewportSize();
```

### useElementSize / useResizeObserver

```tsx
import { useElementSize, useResizeObserver } from '@mantine/hooks';

// 简单用法
const { ref, width, height } = useElementSize();

// 完整 ResizeObserver
const [ref, rect] = useResizeObserver();
// rect: { width, height, x, y, top, left, bottom, right }
```

### useIntersection

```tsx
import { useIntersection } from '@mantine/hooks';

const { ref, entry } = useIntersection({
  root: scrollAreaRef.current,
  threshold: 1,
});

// 无限滚动
useEffect(() => {
  if (entry?.isIntersecting) {
    loadMore();
  }
}, [entry]);
```

### useNetwork

```tsx
import { useNetwork } from '@mantine/hooks';

const { online, downlink, effectiveType, rtt, saveData, type } = useNetwork();

if (!online) {
  notifications.show({ title: '网络断开', message: '请检查网络连接', color: 'red' });
}
```

### useIdle

```tsx
import { useIdle } from '@mantine/hooks';

const idle = useIdle(120000); // 2 分钟无操作

useEffect(() => {
  if (idle) {
    // 自动保存或提示
  }
}, [idle]);
```

### useOs

```tsx
import { useOs } from '@mantine/hooks';

const os = useOs(); // 'windows' | 'macos' | 'linux' | 'ios' | 'android' | 'undetermined'

// 用于显示正确的快捷键提示
const modKey = os === 'macos' ? '⌘' : 'Ctrl';
```

## DOM 操作 Hooks

### useScrollIntoView

```tsx
import { useScrollIntoView } from '@mantine/hooks';

const { scrollIntoView, targetRef } = useScrollIntoView<HTMLDivElement>({
  offset: 60, // header 高度偏移
  duration: 500,
});

<Button onClick={() => scrollIntoView()}>滚动到目标</Button>
<div ref={targetRef}>目标元素</div>
```

### useFocusTrap / useFocusReturn

```tsx
import { useFocusTrap, useFocusReturn } from '@mantine/hooks';

// 焦点陷阱（Modal 内部自动使用）
const focusTrapRef = useFocusTrap(opened);

// 焦点恢复
useFocusReturn({ opened, shouldReturnFocus: true });
```

### useDocumentTitle

```tsx
import { useDocumentTitle } from '@mantine/hooks';

useDocumentTitle('新消息 (3) - 我的应用');
```

### useWindowScroll

```tsx
import { useWindowScroll } from '@mantine/hooks';

const [scroll, scrollTo] = useWindowScroll();

// 回到顶部
<Affix position={{ bottom: 20, right: 20 }}>
  <Transition transition="slide-up" mounted={scroll.y > 0}>
    {(styles) => (
      <Button style={styles} onClick={() => scrollTo({ y: 0 })}>
        回到顶部
      </Button>
    )}
  </Transition>
</Affix>
```

## 工具 Hooks

### usePagination

```tsx
import { usePagination } from '@mantine/hooks';

const pagination = usePagination({ total: 10, page: 1, onChange: setPage });
// pagination.range: [1, 2, 3, 'dots', 8, 9, 10]
// pagination.next(), pagination.previous(), pagination.setPage(5)
```

### useListState

```tsx
import { useListState } from '@mantine/hooks';

const [values, handlers] = useListState([1, 2, 3]);

handlers.append(4);
handlers.prepend(0);
handlers.insert(2, 1.5);
handlers.remove(0);
handlers.reorder({ from: 0, to: 2 });
handlers.apply((item) => item * 2);
handlers.filter((item) => item > 2);
```

### useQueue

```tsx
import { useQueue } from '@mantine/hooks';

const { state, queue, add, update, cleanQueue } = useQueue({
  initialValues: ['第一项'],
  limit: 3,
});
```

### usePrevious

```tsx
import { usePrevious } from '@mantine/hooks';

const [value, setValue] = useState(0);
const previousValue = usePrevious(value);
```
