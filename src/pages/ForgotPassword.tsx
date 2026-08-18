import { FormEvent, useState } from 'react';
import { Link } from 'react-router-dom';
import { Mail } from 'lucide-react';
import { BrandWordmark } from '../components/brand/BrandWordmark';

export function ForgotPassword() {
  const [email, setEmail] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);

  async function submit(event: FormEvent) {
    event.preventDefault();
    setLoading(true);
    setError(null);
    setSent(false);

    try {
      const response = await fetch('/api/auth/password/forgot', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ email }),
      });
      const data = (await response.json().catch(() => ({}))) as { error?: string };

      if (!response.ok) {
        throw new Error(data.error ?? '发送失败');
      }

      setSent(true);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : '发送失败');
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
        <h1 className="font-h1 text-[32px] mb-2">找回密码</h1>
        <p className="text-sm text-on-surface-variant mb-8">输入注册邮箱，我们会发送一个 30 分钟内有效的重设链接。</p>

        <form onSubmit={submit} className="space-y-5">
          <label className="block">
            <span className="mb-1.5 block text-sm font-medium">注册邮箱</span>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-outline" />
              <input
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                className="w-full rounded-lg border border-outline-variant bg-surface-container-low py-3 pl-10 pr-4 text-sm outline-none focus:ring-2 focus:ring-primary"
                type="email"
                autoComplete="email"
              />
            </div>
          </label>

          {sent && (
            <div className="rounded-lg border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-800">
              如果该邮箱存在，我们已经发送找回密码邮件。
            </div>
          )}
          {error && <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>}

          <button
            disabled={loading}
            className="w-full rounded-lg bg-primary px-5 py-3 font-label-sm text-sm text-on-primary hover:opacity-90 disabled:opacity-60"
          >
            {loading ? '发送中...' : '发送找回密码邮件'}
          </button>
        </form>

        <p className="mt-6 text-center text-sm text-on-surface-variant">
          想起密码了？{' '}
          <Link className="font-medium text-primary" to="/login">
            返回登录
          </Link>
        </p>
      </div>
    </div>
  );
}
