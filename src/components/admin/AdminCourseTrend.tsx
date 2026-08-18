import { Line, LineChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';

export function AdminCourseTrend({ data }: { data: Array<{ day: string; clicks: number; learners: number }> }) {
  return <div className="h-[280px] w-full">
    <ResponsiveContainer width="100%" height="100%">
      <LineChart data={data} margin={{ top: 12, right: 16, bottom: 0, left: -24 }}>
        <CartesianGrid stroke="var(--admin-chart-grid)" vertical={false} />
        <XAxis dataKey="day" tickFormatter={(value) => value.slice(5)} axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: 'var(--admin-text-muted)' }} />
        <YAxis allowDecimals={false} axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: 'var(--admin-text-muted)' }} />
        <Tooltip contentStyle={{ border: '1px solid var(--admin-border)', backgroundColor: 'var(--admin-panel)', color: 'var(--admin-text)', borderRadius: 6, fontSize: 12 }} />
        <Line type="monotone" dataKey="clicks" name="点击" stroke="#0f766e" strokeWidth={2.2} dot={false} activeDot={{ r: 3 }} />
        <Line type="monotone" dataKey="learners" name="学习用户" stroke="#84a700" strokeWidth={2.2} dot={false} activeDot={{ r: 3 }} />
      </LineChart>
    </ResponsiveContainer>
  </div>;
}
