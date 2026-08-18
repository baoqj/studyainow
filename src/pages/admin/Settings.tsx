import { ArrowUpRight, ShieldCheck } from 'lucide-react';
import { Link } from 'react-router-dom';

const roles = [
  ['User', '普通学习、求职和课程创建功能'],
  ['Member', '会员课程与订阅权益'],
  ['Operator', '运营身份；不自动获得系统管理员权限'],
  ['Administrator', '进入 /admin 并执行受审计的管理操作'],
];

export function Settings() {
  return <div className="space-y-6">
    <div><h1 className="text-xl font-semibold tracking-tight">系统设置</h1><p className="mt-1 text-xs text-slate-500">后台权限与数据操作约定</p></div>
    <section className="border border-slate-200 bg-white"><h2 className="border-b border-slate-200 px-4 py-3 text-sm font-semibold">身份权限</h2><div className="overflow-x-auto"><table className="w-full min-w-[620px] text-left text-sm"><thead className="bg-slate-50 text-xs text-slate-500"><tr><th className="px-4 py-2.5 font-medium">身份</th><th className="px-4 py-2.5 font-medium">范围</th><th className="px-4 py-2.5 font-medium">后台访问</th></tr></thead><tbody className="divide-y divide-slate-100">{roles.map(([role, description]) => <tr key={role}><td className="px-4 py-3 font-semibold">{role}</td><td className="px-4 py-3 text-slate-600">{description}</td><td className="px-4 py-3">{role === 'Administrator' ? <span className="inline-flex items-center gap-1 text-emerald-700"><ShieldCheck className="h-4 w-4" />允许</span> : <span className="text-slate-400">不允许</span>}</td></tr>)}</tbody></table></div></section>
    <section className="border border-slate-200 bg-white"><h2 className="border-b border-slate-200 px-4 py-3 text-sm font-semibold">数据一致性</h2><dl className="grid gap-0 text-sm md:grid-cols-[210px_1fr]"><dt className="border-b border-slate-100 px-4 py-3 font-medium text-slate-700 md:border-r">管理写操作</dt><dd className="border-b border-slate-100 px-4 py-3 text-slate-600">D1 batch 原子提交；用户、积分、身份和审计记录同时成功或同时回滚。</dd><dt className="border-b border-slate-100 px-4 py-3 font-medium text-slate-700 md:border-r">并发编辑</dt><dd className="border-b border-slate-100 px-4 py-3 text-slate-600">使用 updated_at 乐观锁；发生冲突时拒绝覆盖并要求重新加载。</dd><dt className="px-4 py-3 font-medium text-slate-700 md:border-r">管理员操作</dt><dd className="px-4 py-3 text-slate-600">角色、积分、课程状态和职位来源变更写入 admin_audit_logs。</dd></dl></section>
    <Link to="/me/settings" className="inline-flex items-center gap-2 border-b border-slate-500 pb-1 text-sm font-semibold text-slate-800 hover:border-slate-950">进入个人账户设置<ArrowUpRight className="h-4 w-4" /></Link>
  </div>;
}
