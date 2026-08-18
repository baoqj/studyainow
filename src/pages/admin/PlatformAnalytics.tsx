import { Users, Eye, Monitor, BookOpen, Banknote } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';

const data = [
  { name: 'Jan', revenue: 15 },
  { name: 'Feb', revenue: 18 },
  { name: 'Mar', revenue: 22 },
  { name: 'Apr', revenue: 20 },
  { name: 'May', revenue: 25 },
  { name: 'Jun', revenue: 30 },
  { name: 'Jul', revenue: 28 },
  { name: 'Aug', revenue: 35 },
  { name: 'Sep', revenue: 32 },
  { name: 'Oct', revenue: 40 },
  { name: 'Nov', revenue: 45 },
  { name: 'Dec', revenue: 42 },
];

export function PlatformAnalytics() {
  return (
    <div className="max-w-7xl mx-auto space-y-8">
      <div>
        <h1 className="font-h1 text-[32px] text-on-surface mb-2">平台统计</h1>
        <p className="text-on-surface-variant font-body-md">
          查看 aibao.me 的用户、访问、订阅、阅读和收入表现。
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
        {[
          { label: '用户数', value: '124.5k', change: '较上月 +12%', icon: Users, trending: 'up' },
          { label: '访问量', value: '18,204', change: '较昨日 +4.2%', icon: Eye, trending: 'up' },
          { label: '订阅量', value: '8,942', change: '较上月 +2.1%', icon: Monitor, trending: 'up' },
          { label: '阅读量', value: '1.2M', change: '较上月稳定', icon: BookOpen, trending: 'neutral' },
          { label: 'MRR', value: '$42.8k', change: '较上月 +8.4%', icon: Banknote, trending: 'up', highlight: true },
        ].map((stat, i) => (
          <div key={i} className={`bg-surface-container-lowest border border-outline-variant rounded-xl p-5 shadow-sm flex flex-col ${stat.highlight ? 'border-b-4 border-b-primary' : ''}`}>
            <div className="flex items-start justify-between mb-2">
              <span className="text-sm font-medium text-on-surface-variant">{stat.label}</span>
              <stat.icon className="w-5 h-5 text-outline" />
            </div>
            <div className="font-h2 text-3xl font-bold text-on-surface mb-2">{stat.value}</div>
            <div className={`text-xs ${stat.trending === 'up' ? 'text-emerald-600' : 'text-on-surface-variant'} flex items-center gap-1 mt-auto`}>
              {stat.trending === 'up' && <span className="text-[10px]">↗</span>}
              {stat.change}
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-surface-container-lowest border border-outline-variant rounded-xl shadow-sm">
          <div className="p-6 border-b border-outline-variant flex items-center justify-between">
            <div>
              <h2 className="font-h3 text-xl font-bold text-on-surface mb-1">Revenue Trends</h2>
              <p className="text-sm text-on-surface-variant">Monthly recurring revenue over the last 12 months</p>
            </div>
            <select className="bg-surface border border-outline-variant rounded-md px-3 py-1.5 text-sm outline-none">
              <option>Last 12 Months</option>
            </select>
          </div>
          <div className="p-6 h-[400px]">
             <ResponsiveContainer width="100%" height="100%">
               <BarChart data={data} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                 <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E7EB" />
                 <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: '#6B7280', fontSize: 12}} dy={10} />
                 <YAxis hide domain={[0, 50]} />
                 <Tooltip
                   cursor={{fill: 'transparent'}}
                   contentStyle={{borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)'}}
                   formatter={(value: any) => [`$${value}k`, 'Revenue']}
                 />
                 <Bar dataKey="revenue" radius={[4, 4, 0, 0]}>
                   {
                     data.map((entry, index) => (
                       <Cell key={`cell-${index}`} fill={index === data.length - 1 ? '#3525cd' : '#d3daef'} />
                     ))
                   }
                 </Bar>
               </BarChart>
             </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-surface-container-lowest border border-outline-variant rounded-xl shadow-sm flex flex-col">
          <div className="p-6 border-b border-outline-variant">
            <h2 className="font-h3 text-xl font-bold text-on-surface">Recent Activity</h2>
          </div>
          <div className="flex-1 overflow-y-auto">
             {[
               { name: 'Sarah Jenkins', action: 'signed up', detail: 'via Google Auth', time: '2m ago', icon: Users, color: 'bg-primary text-on-primary' },
               { name: 'Pro Plan Upgrade', action: '', detail: 'Acme Corp workspace', time: '14m ago', icon: Banknote, color: 'bg-surface-dim text-on-surface' },
               { name: 'Enterprise License Renewal', action: '', detail: 'TechFlow Inc. ($1,200/yr)', time: '1h ago', icon: Banknote, color: 'bg-primary text-on-primary' },
               { name: 'Marcus Doe', action: 'signed up', detail: 'via GitHub Auth', time: '3h ago', icon: Users, color: 'bg-primary text-on-primary' },
             ].map((activity, i) => (
               <div key={i} className="px-6 py-4 border-b border-outline-variant last:border-0 flex items-start gap-4">
                 <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${activity.color}`}>
                   <activity.icon className="w-5 h-5" />
                 </div>
                 <div className="flex-1 min-w-0">
                   <p className="text-sm font-medium text-on-surface">
                     {activity.name} {activity.action && <span className="font-normal">{activity.action}</span>}
                   </p>
                   <p className="text-xs text-on-surface-variant truncate">{activity.detail}</p>
                 </div>
                 <div className="text-xs text-outline shrink-0">{activity.time}</div>
               </div>
             ))}
          </div>
          <div className="p-4 border-t border-outline-variant text-center">
            <button className="text-primary hover:text-primary/80 text-sm font-medium transition-colors">View All Activity</button>
          </div>
        </div>
      </div>
    </div>
  );
}
