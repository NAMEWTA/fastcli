import type { Config } from '../../types/index.js';
import type { ModuleKey } from '../lib/state.js';

interface OverviewCardsProps {
  config: Config;
  lastUpdated: Record<ModuleKey, string | null>;
}

function getCount(record: Record<string, unknown> | undefined): number {
  return record ? Object.keys(record).length : 0;
}

function formatLastUpdated(value: string | null): string {
  if (!value) {
    return '尚未编辑';
  }

  return new Date(value).toLocaleString('zh-CN', {
    hour12: false,
  });
}

export function OverviewCards({ config, lastUpdated }: OverviewCardsProps) {
  const cards = [
    {
      label: 'Aliases',
      count: getCount(config.aliases),
      updatedAt: formatLastUpdated(lastUpdated.aliases),
    },
    {
      label: 'Providers',
      count: getCount(config.providers),
      updatedAt: formatLastUpdated(lastUpdated.providers),
    },
    {
      label: 'Credentials',
      count: getCount(config.credentials),
      updatedAt: formatLastUpdated(lastUpdated.credentials),
    },
    {
      label: 'Workflows',
      count: getCount(config.workflows),
      updatedAt: formatLastUpdated(lastUpdated.workflows),
    },
  ];

  return (
    <section className="overview-grid">
      {cards.map((card) => (
        <article className="overview-card" key={card.label}>
          <span>{card.label}</span>
          <strong>{card.count}</strong>
          <small>最近更新：{card.updatedAt}</small>
        </article>
      ))}
    </section>
  );
}
