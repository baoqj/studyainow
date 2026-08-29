import { Award, Camera, CheckCircle2, KeyRound, Sparkles, UserRound } from 'lucide-react';
import { ChangeEvent, FormEvent, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import type { AppLocale } from '../../data/courseContent';
import { getAccountCopy } from '../../data/accountCopy';
import { fetchProfile, updateProfile, uploadAvatar } from '../../lib/account';

type Profile = { email: string; display_name: string; username: string; avatar_url: string | null; bio: string; preferred_locale: string; notification_email_enabled: number; marketing_email_enabled: number; email_verified_at: string | null; created_at?: string; organization_name: string | null; organization_public_id: string | null; organization_role: string | null; organization_joined_at: string | null };

export function ProfileBilling() {
  const { i18n } = useTranslation();
  const locale = (i18n.resolvedLanguage ?? i18n.language) as AppLocale;
  const copy = getAccountCopy(locale);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [badges, setBadges] = useState<Array<{ slug: string; name: string; description: string; icon: string }>>([]);
  const [points, setPoints] = useState(0);
  const [status, setStatus] = useState('');
  const [saving, setSaving] = useState(false);
  const [passwords, setPasswords] = useState({ currentPassword: '', newPassword: '', passwordConfirm: '' });

  useEffect(() => {
    fetchProfile().then((data) => {
      setProfile(data.profile as unknown as Profile);
      setBadges(data.badges);
      setPoints(data.points);
    }).catch(() => setStatus(copy.profileLoadFailed));
  }, [copy.profileLoadFailed]);

  async function save(event: FormEvent) {
    event.preventDefault();
    if (!profile) return;
    setSaving(true); setStatus('');
    try {
      const result = await updateProfile({ username: profile.username, displayName: profile.display_name, bio: profile.bio, preferredLocale: profile.preferred_locale, notificationEmailEnabled: Boolean(profile.notification_email_enabled), marketingEmailEnabled: Boolean(profile.marketing_email_enabled) });
      setProfile(result.profile as unknown as Profile);
      setStatus(copy.profileSaved);
    } catch (error) { setStatus(error instanceof Error ? error.message : copy.profileLoadFailed); } finally { setSaving(false); }
  }

  async function changePassword(event: FormEvent) {
    event.preventDefault();
    setSaving(true); setStatus('');
    try {
      const response = await fetch('/api/profile/password', { method: 'PUT', headers: { 'content-type': 'application/json' }, body: JSON.stringify(passwords) });
      const data = await response.json().catch(() => ({})) as { error?: string };
      if (!response.ok) throw new Error(data.error ?? 'Password update failed');
      setPasswords({ currentPassword: '', newPassword: '', passwordConfirm: '' });
      setStatus(copy.profileSaved);
    } catch (error) { setStatus(error instanceof Error ? error.message : copy.profileLoadFailed); } finally { setSaving(false); }
  }

  async function onAvatar(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file || !profile) return;
    setSaving(true); setStatus('');
    try {
      const result = await uploadAvatar(file);
      setProfile({ ...profile, avatar_url: result.avatarUrl });
      setStatus(copy.profileSaved);
    } catch (error) { setStatus(error instanceof Error ? error.message : copy.profileLoadFailed); } finally { setSaving(false); }
  }

  if (!profile) return <div className="py-12 text-center text-on-surface-variant">{status || copy.saving}</div>;
  const initials = (profile.display_name || profile.username || 'AI').slice(0, 2).toUpperCase();

  return (
    <div className="max-w-5xl mx-auto space-y-8 pb-12">
      <div><h1 className="font-h1 text-[32px] text-on-surface">{copy.profile}</h1><p className="mt-2 text-on-surface-variant">{profile.email} · {profile.email_verified_at ? copy.emailVerified : ''}</p></div>
      {status && <p className="rounded-xl border border-primary/20 bg-primary-container/30 px-4 py-3 text-sm text-on-surface">{status}</p>}
      <form onSubmit={save} className="rounded-2xl border border-outline-variant bg-surface-container-lowest p-6 shadow-sm sm:p-8">
        <div className="flex flex-col gap-6 sm:flex-row sm:items-center">
          <div className="relative h-24 w-24 overflow-hidden rounded-2xl bg-primary text-on-primary flex items-center justify-center text-3xl font-bold">
            {profile.avatar_url ? <img src={profile.avatar_url} alt="" className="h-full w-full object-cover" /> : initials}
            <label className="absolute inset-x-0 bottom-0 flex cursor-pointer items-center justify-center gap-1 bg-black/55 py-1.5 text-[11px] text-white"><Camera className="h-3 w-3" />{copy.uploadAvatar}<input type="file" accept="image/png,image/jpeg,image/webp" className="sr-only" onChange={onAvatar} /></label>
          </div>
          <div><h2 className="text-xl font-bold">{copy.profile}</h2><p className="mt-1 text-sm text-on-surface-variant">{copy.memberSince}{profile.created_at ? ` · ${new Date(profile.created_at).toLocaleDateString(locale)}` : ''}</p></div>
          <div className="sm:ml-auto rounded-xl bg-primary-container/40 px-4 py-3"><p className="text-xs text-primary">{copy.points}</p><p className="text-2xl font-black text-primary">{points}</p></div>
        </div>
        <div className="mt-8 grid gap-5 md:grid-cols-2">
          <label><span className="text-sm font-medium">{copy.profile}</span><input value={profile.username ?? ''} onChange={(e) => setProfile({ ...profile, username: e.target.value })} className="mt-1.5 w-full rounded-lg border border-outline-variant bg-surface-container-low px-3 py-2.5" /></label>
          <label><span className="text-sm font-medium">Email</span><input value={profile.email} disabled className="mt-1.5 w-full rounded-lg border border-outline-variant bg-surface-container-low px-3 py-2.5 text-on-surface-variant" /></label>
          <label><span className="text-sm font-medium">{copy.fullName}</span><input value={profile.display_name} onChange={(e) => setProfile({ ...profile, display_name: e.target.value })} className="mt-1.5 w-full rounded-lg border border-outline-variant bg-surface-container-low px-3 py-2.5" /></label>
          <label><span className="text-sm font-medium">{copy.language}</span><select value={profile.preferred_locale} onChange={(e) => setProfile({ ...profile, preferred_locale: e.target.value })} className="mt-1.5 w-full rounded-lg border border-outline-variant bg-surface-container-low px-3 py-2.5"><option value="zh-CN">简体中文</option><option value="zh-TW">繁體中文</option><option value="en">English</option><option value="fr">Français</option><option value="es">Español</option></select></label>
          <label className="md:col-span-2"><span className="text-sm font-medium">所属组织</span><input disabled value={profile.organization_name ? `${profile.organization_name} · ${profile.organization_public_id} · ${profile.organization_role === 'leader' ? 'Leader' : 'Member'}` : '未加入组织'} className="mt-1.5 w-full rounded-lg border border-outline-variant bg-surface-container-low px-3 py-2.5 text-on-surface-variant" /></label>
          <label className="md:col-span-2"><span className="text-sm font-medium">{copy.bio}</span><textarea value={profile.bio ?? ''} onChange={(e) => setProfile({ ...profile, bio: e.target.value })} rows={4} className="mt-1.5 w-full rounded-lg border border-outline-variant bg-surface-container-low px-3 py-2.5" /></label>
        </div>
        <label className="mt-5 flex items-center gap-3 text-sm"><input type="checkbox" checked={Boolean(profile.notification_email_enabled)} onChange={(e) => setProfile({ ...profile, notification_email_enabled: e.target.checked ? 1 : 0 })} />{copy.emailNotifications}</label>
        <label className="mt-3 flex items-center gap-3 text-sm"><input type="checkbox" checked={Boolean(profile.marketing_email_enabled)} onChange={(e) => setProfile({ ...profile, marketing_email_enabled: e.target.checked ? 1 : 0 })} />{copy.marketingEmails}</label>
        <button disabled={saving} className="mt-6 rounded-lg bg-primary px-5 py-2.5 text-sm font-semibold text-on-primary disabled:opacity-60">{saving ? copy.saving : copy.save}</button>
      </form>

      <section className="rounded-2xl border border-outline-variant bg-surface-container-lowest p-6 shadow-sm sm:p-8"><div className="flex items-center gap-2"><Award className="h-5 w-5 text-primary" /><h2 className="text-xl font-bold">{copy.badges}</h2></div><div className="mt-5 grid gap-3 sm:grid-cols-2">{badges.length ? badges.map((badge) => <div key={badge.slug} className="rounded-xl bg-surface-container-low p-4"><p className="font-semibold">{badge.name}</p><p className="mt-1 text-sm text-on-surface-variant">{badge.description}</p></div>) : <p className="text-sm text-on-surface-variant">—</p>}</div></section>

      <form onSubmit={changePassword} className="rounded-2xl border border-outline-variant bg-surface-container-lowest p-6 shadow-sm sm:p-8"><div className="flex items-center gap-2"><KeyRound className="h-5 w-5 text-primary" /><h2 className="text-xl font-bold">{copy.changePassword}</h2></div><div className="mt-5 grid gap-4 md:grid-cols-3">{(['currentPassword', 'newPassword', 'passwordConfirm'] as const).map((field) => <label key={field}><span className="text-sm font-medium">{field === 'currentPassword' ? copy.currentPassword : field === 'newPassword' ? copy.newPassword : copy.confirmPassword}</span><input required type="password" value={passwords[field]} onChange={(e) => setPasswords({ ...passwords, [field]: e.target.value })} className="mt-1.5 w-full rounded-lg border border-outline-variant bg-surface-container-low px-3 py-2.5" /></label>)}</div><button disabled={saving} className="mt-5 rounded-lg border border-primary px-5 py-2.5 text-sm font-semibold text-primary disabled:opacity-60">{copy.changePassword}</button></form>
    </div>
  );
}
