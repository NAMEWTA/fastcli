import type { Config } from '../../types/index.js';

const TASK_NAV_ITEMS = ['配置总览', '配置校验', '导入配置', '导出配置'];
const TYPE_NAV_ITEMS = ['Aliases', 'Providers', 'Credentials', 'Workflows'];

export interface AdminShellProps {
  config: Config;
}

function getCount(record: Record<string, unknown> | undefined): number {
  return record ? Object.keys(record).length : 0;
}

export function AdminShell({ config }: AdminShellProps) {
  return (
    <div className="admin-shell">
      <header className="topbar">
        <div>
          <p className="eyebrow">fastcli web admin</p>
          <h1>本地配置管理后台</h1>
        </div>
        <div className="topbar__actions">
          <button className="ghost-button" disabled type="button">
            保存全部
          </button>
          <button className="ghost-button" disabled type="button">
            导入
          </button>
          <button className="ghost-button" disabled type="button">
            导出
          </button>
        </div>
      </header>

      <div className="workspace">
        <aside className="sidebar">
          <section className="nav-group">
            <p className="nav-group__title">按任务</p>
            <nav>
              {TASK_NAV_ITEMS.map((item) => (
                <button className="nav-item" key={item} type="button">
                  {item}
                </button>
              ))}
            </nav>
          </section>

          <section className="nav-group">
            <p className="nav-group__title">按类型</p>
            <nav>
              {TYPE_NAV_ITEMS.map((item) => (
                <button className="nav-item" key={item} type="button">
                  {item}
                </button>
              ))}
            </nav>
          </section>
        </aside>

        <main className="content-panel">
          <section className="content-card">
            <p className="eyebrow">当前工作态</p>
            <h2>欢迎进入后台骨架</h2>
            <p>
              任务 6 先搭建登录与后台框架，后续任务会继续补总览卡片、模块列表和抽屉编辑。
            </p>
          </section>

          <section className="summary-grid">
            <article className="summary-card">
              <span>Aliases</span>
              <strong>{getCount(config.aliases)}</strong>
            </article>
            <article className="summary-card">
              <span>Providers</span>
              <strong>{getCount(config.providers)}</strong>
            </article>
            <article className="summary-card">
              <span>Credentials</span>
              <strong>{getCount(config.credentials)}</strong>
            </article>
            <article className="summary-card">
              <span>Workflows</span>
              <strong>{getCount(config.workflows)}</strong>
            </article>
          </section>
        </main>
      </div>
    </div>
  );
}
