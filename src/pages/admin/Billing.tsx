import { Banknote, CreditCard, Download, ReceiptText, TrendingUp } from 'lucide-react';

const invoices = [
  ['Pro Monthly', 'Stripe', '$29.00', 'Paid', '2026-04-24'],
  ['Course Pack', 'Points', '$49.00', 'Paid', '2026-04-20'],
  ['Enterprise Seat', 'Invoice', '$1,200.00', 'Pending', '2026-04-18'],
  ['Point Recharge', 'Stripe', '$19.00', 'Paid', '2026-04-14'],
];

export function Billing() {
  return (
    <div className="max-w-6xl mx-auto space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-h1 text-[32px] text-on-surface mb-2">财务与账单</h1>
          <p className="text-on-surface-variant font-body-md">查看订阅、积分充值、单课购买和企业账单的收入表现。</p>
        </div>
        <button className="bg-primary text-on-primary hover:bg-primary/90 flex items-center gap-2 px-5 py-3 rounded-lg font-label-sm text-sm transition-colors">
          <Download className="w-4 h-4" /> 导出 CSV
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {[
          { label: 'MRR', value: '$42.8k', icon: TrendingUp },
          { label: '订阅收入', value: '$31.4k', icon: CreditCard },
          { label: '积分充值', value: '$7.2k', icon: Banknote },
          { label: '单课购买', value: '$4.2k', icon: ReceiptText },
        ].map((stat) => (
          <div key={stat.label} className="bg-surface-container-lowest border border-outline-variant rounded-xl p-5 shadow-sm">
            <div className="flex items-center justify-between mb-3">
              <span className="text-sm text-on-surface-variant">{stat.label}</span>
              <stat.icon className="w-5 h-5 text-outline" />
            </div>
            <div className="font-h2 text-3xl text-on-surface">{stat.value}</div>
          </div>
        ))}
      </div>

      <div className="bg-surface-container-lowest border border-outline-variant rounded-xl overflow-hidden shadow-sm">
        <div className="p-6 border-b border-outline-variant">
          <h2 className="font-h3 text-xl text-on-surface">最近交易</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left font-body-md border-collapse">
            <thead>
              <tr className="border-b border-outline-variant">
                {['项目', '渠道', '金额', '状态', '日期'].map((header) => (
                  <th key={header} className="py-4 px-6 font-label-sm text-sm font-medium text-on-surface">{header}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-outline-variant">
              {invoices.map((invoice) => (
                <tr key={`${invoice[0]}-${invoice[4]}`} className="hover:bg-surface-container-low/50 transition-colors">
                  {invoice.map((cell, index) => (
                    <td key={cell} className={`py-4 px-6 text-sm ${index === 0 ? 'font-medium text-on-surface' : 'text-on-surface-variant'}`}>
                      {index === 3 ? (
                        <span className={`rounded-full px-3 py-1 text-[12px] font-label-sm ${cell === 'Paid' ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700'}`}>
                          {cell}
                        </span>
                      ) : cell}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
