# Performance Specialist 审查清单

> 触发条件：当 `SCOPE_BACKEND=true` 或 `SCOPE_FRONTEND=true`。

## 审查范围

当涉及后端或前端代码变更时启用。

## 输出格式

每行一个 JSON 对象的发现结果：

```json
{"severity":"CRITICAL|INFORMATIONAL","confidence":N,"path":"file","line":N,"category":"performance","summary":"...","fix":"...","fingerprint":"path:line:performance","specialist":"performance"}
```

可选字段：`line`、`fix`、`fingerprint`、`evidence`、`test_stub`。

如果没有发现：只输出 `NO FINDINGS`，其余什么都不要。

---

## 审查分类

### N+1 Queries

- ActiveRecord/ORM associations traversed in loops without eager loading (.includes, joinedload, include)
- Database queries inside iteration blocks (each, map, forEach) that could be batched
- Nested serializers that trigger lazy-loaded associations
- GraphQL resolvers that query per-field instead of batching (check for DataLoader usage)

### Missing Database Indexes

- New WHERE clauses on columns without indexes (check migration files or schema)
- New ORDER BY on non-indexed columns
- Composite queries (WHERE a AND b) without composite indexes
- Foreign key columns added without indexes

### Algorithmic Complexity

- O(n^2) or worse patterns: nested loops over collections, Array.find inside Array.map
- Repeated linear searches that could use a hash/map/set lookup
- String concatenation in loops (use join or StringBuilder)
- Sorting or filtering large collections multiple times when once would suffice

### Bundle Size Impact (Frontend)

- New production dependencies that are known-heavy (moment.js, lodash full, jquery)
- Barrel imports (import from 'library') instead of deep imports (import from 'library/specific')
- Large static assets (images, fonts) committed without optimization
- Missing code splitting for route-level chunks

### Rendering Performance (Frontend)

- Fetch waterfalls: sequential API calls that could be parallel (Promise.all)
- Unnecessary re-renders from unstable references (new objects/arrays in render)
- Missing React.memo, useMemo, or useCallback on expensive computations
- Layout thrashing from reading then writing DOM properties in loops
- Missing loading="lazy" on below-fold images

### Missing Pagination

- List endpoints that return unbounded results (no LIMIT, no pagination params)
- Database queries without LIMIT that grow with data volume
- API responses that embed full nested objects instead of IDs with expansion

### Blocking in Async Contexts

- Synchronous I/O (file reads, subprocess, HTTP requests) inside async functions
- time.sleep() / Thread.sleep() inside event-loop-based handlers
- CPU-intensive computation blocking the main thread without worker offload
