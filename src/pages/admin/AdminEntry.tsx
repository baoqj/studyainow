import { useEffect, useState } from 'react';
import { Navigate } from 'react-router-dom';

export function AdminEntry() {
  const [destination, setDestination] = useState<string | null>(null);
  useEffect(() => {
    fetch('/api/auth/me', { headers: { accept: 'application/json' } })
      .then((response) => response.json() as Promise<{ user: { roles?: string[] } | null }>)
      .then((payload) => setDestination(payload.user?.roles?.includes('admin') ? '/admin/overview' : '/admin/my-organization'))
      .catch(() => setDestination('/me'));
  }, []);
  return destination ? <Navigate to={destination} replace /> : <p className="py-20 text-center text-sm text-slate-500">正在进入管理后台…</p>;
}
