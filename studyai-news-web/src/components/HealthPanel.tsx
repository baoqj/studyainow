import { useState } from 'react';
import type { HealthResult, NewsApiHealth } from '../lib/health';

interface HealthPanelProps {
  initialHealth: NewsApiHealth | null;
  initialMessage: string | null;
}

async function requestHealth(): Promise<HealthResult> {
  try {
    const response = await fetch('/api/news/v1/health', {
      headers: { accept: 'application/json' },
      cache: 'no-store',
    });
    const payload: unknown = await response.json();
    if (!response.ok || !payload || typeof payload !== 'object') {
      return { ok: false, message: `Health check failed with HTTP ${response.status}` };
    }
    const health = payload as NewsApiHealth;
    if (health.ok !== true || health.service !== 'studyai-news-api') {
      return { ok: false, message: 'Health check returned an invalid payload' };
    }
    return { ok: true, health };
  } catch {
    return { ok: false, message: 'Unable to reach the API Worker' };
  }
}

export default function HealthPanel({ initialHealth, initialMessage }: HealthPanelProps) {
  const [health, setHealth] = useState(initialHealth);
  const [message, setMessage] = useState(initialMessage);
  const [checking, setChecking] = useState(false);

  const refresh = async () => {
    setChecking(true);
    const result = await requestHealth();
    if (result.ok) {
      setHealth(result.health);
      setMessage(null);
    } else {
      setHealth(null);
      setMessage(result.message);
    }
    setChecking(false);
  };

  return (
    <section className="health-panel" aria-live="polite">
      <div>
        <p className="eyebrow">P0-0 · Worker foundation</p>
        <h2>{health ? '双 Worker 通道已连接' : 'API 通道等待连接'}</h2>
        <p className="health-detail">
          {health
            ? `${health.service} · ${health.environment} · v${health.version}`
            : message ?? '尚未获得 API 健康状态。'}
        </p>
      </div>
      <button type="button" onClick={refresh} disabled={checking}>
        {checking ? '检查中…' : '重新检查'}
      </button>
    </section>
  );
}
