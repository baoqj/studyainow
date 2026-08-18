import { Copy } from 'lucide-react';
import { useTranslation } from 'react-i18next';

export function Referral() {
  const { t } = useTranslation();

  return (
    <div className="max-w-4xl space-y-10 pb-12">
      <div>
        <h1 className="font-h1 text-[32px] text-on-surface mb-2">{t('Referral Program')}</h1>
        <p className="text-on-surface-variant font-body-md">
          {t('Invite colleagues and earn points for your account.')}
        </p>
      </div>

      <section>
        <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm overflow-hidden">
          <p className="text-slate-600 mb-6 max-w-2xl text-sm leading-relaxed">
            Invite colleagues and earn 500 platform points for every successful sign-up who completes their first technical tutorial.
          </p>
          
          <div className="mb-8">
            <label className="block text-sm font-medium text-slate-700 mb-2">Your Personal Invite Link</label>
            <div className="flex items-center gap-2">
              <div className="flex-1 bg-slate-100 border border-slate-200 rounded-lg px-4 py-2.5 overflow-hidden">
                <code className="text-sm text-slate-600 font-code-block truncate block">
                  https://aibao.me/join?ref=alex_dev_982
                </code>
              </div>
              <button 
                className="bg-indigo-50 border border-indigo-200 text-indigo-700 hover:bg-indigo-100 p-2.5 rounded-lg transition-colors flex shrink-0 items-center justify-center w-10 h-10"
                title="Copy Link"
              >
                <Copy className="w-4 h-4" />
              </button>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-6 pt-6 border-t border-slate-200">
            <div>
              <div className="text-[11px] font-label-sm text-slate-500 uppercase tracking-wider mb-2">Total Clicks</div>
              <div className="font-h2 text-2xl text-slate-900">124</div>
            </div>
            <div>
              <div className="text-[11px] font-label-sm text-slate-500 uppercase tracking-wider mb-2">Sign-ups</div>
              <div className="font-h2 text-2xl text-slate-900">12</div>
            </div>
            <div>
              <div className="text-[11px] font-label-sm text-slate-500 uppercase tracking-wider mb-2">Points Earned</div>
              <div className="font-h2 text-2xl text-indigo-600">6,000</div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
