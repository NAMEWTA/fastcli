# Spotlight 与导航模式

## Spotlight 全局搜索

### 基础设置

```tsx
import '@mantine/spotlight/styles.css';
import { Spotlight, SpotlightActionData, spotlight } from '@mantine/spotlight';
import { IconSearch, IconHome, IconDashboard, IconFileText } from '@tabler/icons-react';

const actions: SpotlightActionData[] = [
  {
    id: 'home',
    label: '首页',
    description: '返回首页',
    leftSection: <IconHome size={18} stroke={1.5} />,
    onClick: () => navigate('/'),
  },
  {
    id: 'dashboard',
    label: '仪表盘',
    description: '查看数据概览',
    leftSection: <IconDashboard size={18} stroke={1.5} />,
    onClick: () => navigate('/dashboard'),
  },
  {
    id: 'docs',
    label: '文档',
    description: '查看帮助文档',
    leftSection: <IconFileText size={18} stroke={1.5} />,
    onClick: () => navigate('/docs'),
  },
];

function App() {
  return (
    <>
      <Spotlight
        actions={actions}
        searchProps={{
          leftSection: <IconSearch size={18} stroke={1.5} />,
          placeholder: '搜索页面和操作...',
        }}
        nothingFound="未找到匹配结果"
        highlightQuery
        shortcut="mod+K"
      />
      {/* 应用内容 */}
    </>
  );
}
```

### 动态搜索（异步）

```tsx
import { useState } from 'react';
import { Spotlight, spotlight } from '@mantine/spotlight';

function AsyncSpotlight() {
  const [actions, setActions] = useState<SpotlightActionData[]>([]);
  const [loading, setLoading] = useState(false);

  const handleQueryChange = async (query: string) => {
    if (!query) {
      setActions([]);
      return;
    }

    setLoading(true);
    try {
      const results = await searchAPI(query);
      setActions(results.map((item) => ({
        id: item.id,
        label: item.title,
        description: item.description,
        onClick: () => navigate(`/item/${item.id}`),
      })));
    } finally {
      setLoading(false);
    }
  };

  return (
    <Spotlight
      actions={actions}
      onQueryChange={handleQueryChange}
      loading={loading}
      nothingFound="未找到结果"
      searchProps={{ placeholder: '搜索...' }}
    />
  );
}
```

### 分组操作

```tsx
const actions: SpotlightActionData[] = [
  {
    id: 'pages',
    label: '页面',
    group: '导航',
    onClick: () => {},
  },
  {
    id: 'settings',
    label: '设置',
    group: '导航',
    onClick: () => {},
  },
  {
    id: 'create-post',
    label: '新建文章',
    group: '操作',
    onClick: () => {},
  },
  {
    id: 'create-user',
    label: '新建用户',
    group: '操作',
    onClick: () => {},
  },
];
```

### 程序化控制

```tsx
import { spotlight } from '@mantine/spotlight';

// 打开
spotlight.open();

// 关闭
spotlight.close();

// 切换
spotlight.toggle();
```

## 导航模式

### Tabs 标签页

```tsx
import { Tabs } from '@mantine/core';
import { IconPhoto, IconMessageCircle, IconSettings } from '@tabler/icons-react';

<Tabs defaultValue="gallery">
  <Tabs.List>
    <Tabs.Tab value="gallery" leftSection={<IconPhoto size={14} />}>图库</Tabs.Tab>
    <Tabs.Tab value="messages" leftSection={<IconMessageCircle size={14} />}>消息</Tabs.Tab>
    <Tabs.Tab value="settings" leftSection={<IconSettings size={14} />}>设置</Tabs.Tab>
  </Tabs.List>

  <Tabs.Panel value="gallery" pt="xs">图库内容</Tabs.Panel>
  <Tabs.Panel value="messages" pt="xs">消息内容</Tabs.Panel>
  <Tabs.Panel value="settings" pt="xs">设置内容</Tabs.Panel>
</Tabs>
```

### Stepper 步骤条

```tsx
import { useState } from 'react';
import { Stepper, Button, Group } from '@mantine/core';

function StepperDemo() {
  const [active, setActive] = useState(0);

  return (
    <>
      <Stepper active={active} onStepClick={setActive}>
        <Stepper.Step label="第一步" description="基本信息">
          基本信息表单
        </Stepper.Step>
        <Stepper.Step label="第二步" description="详细设置">
          详细设置表单
        </Stepper.Step>
        <Stepper.Step label="第三步" description="确认提交">
          确认信息
        </Stepper.Step>
        <Stepper.Completed>
          全部完成！
        </Stepper.Completed>
      </Stepper>

      <Group justify="center" mt="xl">
        <Button variant="default" onClick={() => setActive((c) => c - 1)} disabled={active === 0}>
          上一步
        </Button>
        <Button onClick={() => setActive((c) => c + 1)} disabled={active === 3}>
          下一步
        </Button>
      </Group>
    </>
  );
}
```

### NavLink 侧边导航

```tsx
import { NavLink } from '@mantine/core';
import { IconHome, IconUsers, IconSettings, IconChevronRight } from '@tabler/icons-react';

function Sidebar() {
  return (
    <>
      <NavLink
        label="首页"
        leftSection={<IconHome size={16} />}
        rightSection={<IconChevronRight size={12} />}
        active
      />
      <NavLink
        label="用户管理"
        leftSection={<IconUsers size={16} />}
        childrenOffset={28}
        defaultOpened
      >
        <NavLink label="用户列表" />
        <NavLink label="角色管理" />
        <NavLink label="权限设置" />
      </NavLink>
      <NavLink
        label="系统设置"
        leftSection={<IconSettings size={16} />}
      />
    </>
  );
}
```

### Breadcrumbs 面包屑

```tsx
import { Breadcrumbs, Anchor } from '@mantine/core';

const items = [
  { title: '首页', href: '/' },
  { title: '用户管理', href: '/users' },
  { title: '用户详情', href: '#' },
].map((item) => (
  <Anchor href={item.href} key={item.title} size="sm">
    {item.title}
  </Anchor>
));

<Breadcrumbs separator="→">{items}</Breadcrumbs>
```

### Pagination 分页

```tsx
import { Pagination, Group, Text } from '@mantine/core';

function PaginatedList() {
  const [page, setPage] = useState(1);
  const totalPages = 20;

  return (
    <>
      {/* 列表内容 */}
      <Group justify="space-between" mt="md">
        <Text size="sm" c="dimmed">
          显示第 {(page - 1) * 10 + 1}-{Math.min(page * 10, 200)} 条，共 200 条
        </Text>
        <Pagination
          total={totalPages}
          value={page}
          onChange={setPage}
          withEdges
        />
      </Group>
    </>
  );
}
```
