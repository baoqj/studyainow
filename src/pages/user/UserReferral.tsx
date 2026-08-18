import { Copy, Gift, Users } from 'lucide-react';

export function UserReferral() {
  return (
    <div className="max-w-4xl mx-auto space-y-8 pb-12">
      <div>
        <h1 className="font-h1 text-[32px] text-on-surface mb-2">推荐奖励</h1>
        <p className="text-on-surface-variant font-body-md">邀请朋友学习 AI 编程，好友完成首章后你将获得平台积分。</p>
      </div>

      <div className="bg-surface-container-lowest border border-outline-variant rounded-xl p-6 shadow-sm">
        <div className="flex items-start gap-4 mb-8">
          <div className="w-12 h-12 rounded-xl bg-primary text-on-primary flex items-center justify-center shrink-0">
            <Gift className="w-6 h-6" />
          </div>
          <div>
            <h2 className="font-h3 text-xl text-on-surface mb-2">邀请并获得 500 积分</h2>
            <p className="text-sm text-on-surface-variant max-w-2xl">
              积分可用于单独购买课程、兑换练习批改或抵扣会员费用。
            </p>
          </div>
        </div>

        <label className="block text-sm font-medium text-on-surface mb-2">你的专属推荐链接</label>
        <div className="flex items-center gap-2 mb-8">
          <div className="flex-1 bg-surface-container-low border border-outline-variant rounded-lg px-4 py-3 overflow-hidden">
            <code className="text-sm text-on-surface-variant font-code-block truncate block">
              https://studyai.now/join?ref=alex_dev_982
            </code>
          </div>
          <button className="bg-surface-container-lowest border border-outline hover:bg-surface-container-low p-3 rounded-lg transition-colors">
            <Copy className="w-4 h-4 text-on-surface" />
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {[
            ['点击数', '124'],
            ['注册数', '12'],
            ['获得积分', '6,000'],
          ].map(([label, value]) => (
            <div key={label} className="border border-outline-variant rounded-lg p-4">
              <div className="text-[11px] font-label-sm text-outline uppercase tracking-wider mb-2">{label}</div>
              <div className="font-h2 text-2xl text-on-surface flex items-center gap-2">
                {value}
                {label === '注册数' && <Users className="w-5 h-5 text-primary" />}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
