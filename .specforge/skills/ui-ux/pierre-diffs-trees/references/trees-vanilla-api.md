# @pierre/trees — Vanilla JS API 完整参考

适用于 Vue / Svelte / Angular / 原生 DOM 等非 React 环境。

## 目录

- [核心 API](#核心-api)
- [生命周期](#生命周期)
- [Item Handle](#item-handle)
- [事件订阅](#事件订阅)
- [SSR Hydration](#ssr-hydration)
- [典型框架集成](#典型框架集成)

## 核心 API

```ts
import {
  FileTree,                          // 模型 + 渲染入口
  prepareFileTreeInput,              // 大型树预处理
  preparePresortedFileTreeInput,     // 已排序的预处理（最快）
} from '@pierre/trees'
```

构造时所有选项含义与 React 的 `useFileTree` 完全一致：

```ts
const tree = new FileTree({
  paths: ['src/index.ts', 'src/utils.ts'],
  // 或 preparedInput: prepareFileTreeInput(paths)
  id: 'main-sidebar',                  // SSR 必需

  icons: 'standard',
  density: 'default',
  initialExpansion: 'all-expanded',
  initialSelectedPaths: ['src/index.ts'],

  search: true,
  fileTreeSearchMode: 'hide-non-matches',

  gitStatus: { 'src/index.ts': 'modified' },

  flattenEmptyDirectories: true,
  initialVisibleRowCount: 30,
  overscan: 5,

  dragAndDrop: {
    canDrag: (paths) => true,
    canDrop: (event) => true,
    onDropComplete: (e) => console.log('moved', e.draggedPaths, '→', e.targetPath),
    onDropError: (err, event) => console.error(err),
  },

  renaming: {
    canRename: (item) => true,
    onRename: (e) => console.log('renamed', e.sourcePath, '→', e.destinationPath),
    onError: (err) => console.error(err),
  },

  renderRowDecoration: (item) => {
    if (item.path.endsWith('.generated.ts')) {
      return '<span class="badge-gen">gen</span>'
    }
  },

  onSelectionChange: (paths) => console.log('selected:', paths),
  onSearchChange: (query) => console.log('search:', query),
})
```

## 生命周期

### 挂载

```ts
// 方式 A：传入已存在的容器元素
tree.render({
  fileTreeContainer: document.querySelector('#sidebar')!,
})

// 方式 B：传入 wrapper，让 Trees 自动创建容器
tree.render({
  containerWrapper: document.querySelector('#sidebar-wrapper')!,
})

// 获取最终的 DOM 容器（用于外部样式控制）
const container = tree.getFileTreeContainer()
container.style.height = '100%'
```

### SSR Hydration

服务端已渲染 HTML 后，客户端使用 `hydrate` 而非 `render`：

```ts
tree.hydrate({ fileTreeContainer: document.querySelector('#sidebar')! })
```

构造时的 tree-defining 选项必须与服务端完全一致（id、paths、initialExpansion、icons 等）。

### 卸载与清理

```ts
// 卸载 DOM，但保留 model（之后可重新 render）
tree.unmount()

// 完全销毁（释放所有资源）
tree.cleanUp()
```

## 状态读写

```ts
// ============ 读 ============
const selected: string[] = tree.getSelectedPaths()
const focused: string | null = tree.getFocusedPath()
const matches: string[] = tree.getSearchMatchingPaths()

// ============ 写 ============
tree.focusPath('src/index.ts')
tree.startRenaming('src/utils.ts')

tree.openSearch()
tree.openSearch('Button')
tree.closeSearch()
tree.setSearch('hooks')                            // 编程式搜索，不显示 UI
tree.focusNextSearchMatch()
tree.focusPreviousSearchMatch()

tree.resetPaths(newPaths)
tree.setGitStatus({ 'src/index.ts': 'modified' })
tree.setIcons('complete')

tree.batch([
  { type: 'add',    path: 'src/new.ts' },
  { type: 'remove', path: 'src/old.ts' },
  { type: 'move',   fromPath: 'src/a.ts', toPath: 'src/b.ts' },
])
```

## Item Handle

```ts
const item = tree.getItem('src/components')

if (item) {
  console.log(item.path, item.kind)        // kind: 'file' | 'directory'
  item.select()
  item.focus()

  if (item.kind === 'directory') {
    item.expand()
    item.collapse()
    item.toggle()
  }
}
```

## 事件订阅

### 订阅任意状态变化

```ts
const unsubscribe = tree.subscribe(() => {
  // 任何状态变化都会触发（选中、焦点、展开、搜索...）
  updateBreadcrumb(tree.getFocusedPath())
})

// 取消订阅
unsubscribe()
```

### 订阅语义事件（mutation）

```ts
tree.onMutation('add',    (event) => persistNewFile(event.path))
tree.onMutation('remove', (event) => deleteFile(event.path))
tree.onMutation('move',   (event) => moveFile(event.fromPath, event.toPath))
tree.onMutation('reset',  () => console.log('tree was reset'))
```

事件类型对应 `tree.batch` 的 `type` 字段。

## SSR Hydration

### 服务端

```ts
import { preloadFileTree, serializeFileTreeSsrPayload } from '@pierre/trees/ssr'

const TREE_ID = 'main-file-tree'

const payload = await preloadFileTree({
  paths: allPaths,
  id: TREE_ID,
  icons: 'standard',
  density: 'default',
  initialExpansion: 'all-expanded',
})

// 序列化为字符串嵌入 HTML
const html = serializeFileTreeSsrPayload(payload)

// SSR 输出（伪代码）
res.send(`
  <div id="sidebar">${payload.html}</div>
  <script id="tree-payload" type="application/json">${html}</script>
`)
```

### 客户端

```ts
const tree = new FileTree({
  paths: allPaths,
  id: 'main-file-tree',                  // ⚠️ 必须与服务端一致
  icons: 'standard',
  density: 'default',
  initialExpansion: 'all-expanded',
})

tree.hydrate({ fileTreeContainer: document.querySelector('#sidebar')! })
```

## 典型框架集成

### Vue 3

```vue
<script setup lang="ts">
import { ref, onMounted, onBeforeUnmount, watch } from 'vue'
import { FileTree } from '@pierre/trees'

const props = defineProps<{ paths: string[]; gitStatus: Record<string, string> }>()
const emit = defineEmits<{ select: [path: string] }>()

const containerRef = ref<HTMLElement>()
let tree: FileTree | null = null

onMounted(() => {
  tree = new FileTree({
    paths: props.paths,
    icons: 'standard',
    gitStatus: props.gitStatus,
    onSelectionChange: (paths) => emit('select', paths[0]),
  })
  tree.render({ fileTreeContainer: containerRef.value! })
})

watch(() => props.paths, (newPaths) => {
  tree?.resetPaths(newPaths)
})

watch(() => props.gitStatus, (newStatus) => {
  tree?.setGitStatus(newStatus)
}, { deep: true })

onBeforeUnmount(() => tree?.cleanUp())
</script>

<template>
  <div ref="containerRef" style="height: 100%; width: 280px" />
</template>
```

### Svelte 5

```svelte
<script lang="ts">
  import { onMount } from 'svelte'
  import { FileTree } from '@pierre/trees'

  let { paths, gitStatus, onSelect } = $props()

  let container: HTMLElement
  let tree: FileTree | null = null

  onMount(() => {
    tree = new FileTree({
      paths,
      icons: 'standard',
      gitStatus,
      onSelectionChange: (p) => onSelect?.(p[0]),
    })
    tree.render({ fileTreeContainer: container })
    return () => tree?.cleanUp()
  })

  // 响应式同步
  $effect(() => { tree?.resetPaths(paths) })
  $effect(() => { tree?.setGitStatus(gitStatus) })
</script>

<div bind:this={container} style="height: 100%; width: 280px" />
```

### Angular

```ts
import { Component, ElementRef, Input, OnInit, OnDestroy, ViewChild, OnChanges, SimpleChanges } from '@angular/core'
import { FileTree } from '@pierre/trees'

@Component({
  selector: 'app-file-tree',
  template: '<div #container style="height: 100%; width: 280px"></div>',
})
export class FileTreeComponent implements OnInit, OnDestroy, OnChanges {
  @Input() paths: string[] = []
  @Input() gitStatus: Record<string, string> = {}
  @ViewChild('container', { static: true }) container!: ElementRef<HTMLElement>

  private tree: FileTree | null = null

  ngOnInit() {
    this.tree = new FileTree({
      paths: this.paths,
      icons: 'standard',
      gitStatus: this.gitStatus,
    })
    this.tree.render({ fileTreeContainer: this.container.nativeElement })
  }

  ngOnChanges(changes: SimpleChanges) {
    if (changes.paths)     this.tree?.resetPaths(this.paths)
    if (changes.gitStatus) this.tree?.setGitStatus(this.gitStatus)
  }

  ngOnDestroy() {
    this.tree?.cleanUp()
  }
}
```

### 原生 DOM

```ts
import { FileTree } from '@pierre/trees'

class SidebarController {
  private tree: FileTree

  constructor(container: HTMLElement, paths: string[]) {
    this.tree = new FileTree({
      paths,
      icons: 'standard',
      onSelectionChange: (paths) => this.emit('select', paths[0]),
    })
    this.tree.render({ fileTreeContainer: container })
  }

  refresh(paths: string[]) {
    this.tree.resetPaths(paths)
  }

  applyGitStatus(status: Record<string, string>) {
    this.tree.setGitStatus(status)
  }

  destroy() {
    this.tree.cleanUp()
  }

  private emit(event: string, ...args: any[]) {
    // 自行实现事件总线
  }
}
```

## 性能注意

- 大型树（≥ 500 路径）必须使用 `prepareFileTreeInput` 在 UI 边界外预处理
- 增量变更优先使用 `tree.batch`，避免频繁 `tree.resetPaths`
- 容器**必须**有显式的 CSS 高度（虚拟化依赖）
- `tree.subscribe` 的回调会在每次状态变化时触发，避免在其中做重计算（应改用 `tree.onMutation` 监听具体事件）
