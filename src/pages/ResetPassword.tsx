import { FormEvent, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { Lock } from 'lucide-react';
import { BrandWordmark } from '../components/brand/BrandWordmark';

export function ResetPassword() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token') ?? '';
  const [password, setPassword] = useState('');
  const [passwordConfirm, setPasswordConfirm] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const [loading, setLoading] = useState(false);

  async function submit(event: FormEvent) {
    event.preventDefault();
    setLoading(true);
    setError(null);
    setDone(false);

    try {
      const response = await fetch('/api/auth/password/reset', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ token, password, passwordConfirm }),
      });
      const data = (await response.json().catch(() => ({}))) as { error?: string };

      if (!response.ok) {
        throw new Error(data.error ?? '重设失败');
      }

      setDone(true);
      setPassword('');
      setPasswordConfirm('');
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : '重设失败');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-background text-on-surface flex items-center justify-center px-6 py-12">
      <div className="w-full max-w-md rounded-xl border border-outline-variant bg-surface-container-lowest p-8 shadow-sm">
        <Link to="/" aria-label="Study AI Now!" className="mb-8 block text-xl">
          <BrandWordmark />
        </Link>
        <h1 className="font-h1 text-[32px] mb-2">重设密码</h1>
        <p className="text-sm text-on-surface-variant mb-8">设置一个新密码。提交成功后，旧登录会话会自动失效。</p>

        {!token && <div className="mb-5 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">缺少找回密码 token，请重新发起找回密码。</div>}

        <form onSubmit={submit} className="space-y-5">
          <label className="block">
            <span className="mb-1.5 block text-sm font-medium">新密码</span>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-outline" />
              <input
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                className="w-full rounded-lg border border-outline-variant bg-surface-container-low py-3 pl-10 pr-4 text-sm outline-none focus:ring-2 focus:ring-primary"
                type="password"
                autoComplete="new-password"
              />
            </div>
          </label>
          <label className="block">
            <span className="mb-1.5 block text-sm font-medium">再次输入新密码</span>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-outline" />
              <input
                value={passwordConfirm}
                onChange={(event) => setPasswordConfirm(event.target.value)}
                className="w-full rounded-lg border border-outline-variant bg-surface-container-low py-3 pl-10 pr-4 text-sm outline-none focus:ring-2 focus:ring-primary"
                type="password"
                autoComplete="new-password"
              />
            </div>
          </label>

          {done && (
            <div className="rounded-lg border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-800">
              密码已更新，请使用新密码登录。
            </div>
          )}
          {error && <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>}

          <button
            disabled={loading || !token}
            className="w-full rounded-lg bg-primary px-5 py-3 font-label-sm text-sm text-on-primary hover:opacity-90 disabled:opacity-60"
          >
            {loading ? '提交中...' : '更新密码'}
          </button>
        </form>

        <p className="mt-6 text-center text-sm text-on-surface-variant">
          已更新密码？{' '}
          <Link className="font-medium text-primary" to="/login">
            去登录
          </Link>
        </p>
      </div>
    </div>
  );
}
