import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';

export function AdminInterviewTrend({ data }: { data: Array<{ day: string; views: number; visitors: number }> }) {
  return <div className="h-[260px] min-w-0 w-full overflow-hidden">
    <ResponsiveContainer width="100%" height="100%" minWidth={0} initialDimension={{ width: 320, height: 260 }}>
      <LineChart data={data} margin={{ top: 12, right: 16, bottom: 0, left: -24 }}>
        <CartesianGrid stroke="var(--admin-chart-grid)" vertical={false} />
        <XAxis dataKey="day" tickFormatter={(value) => value.slice(5)} axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: 'var(--admin-text-muted)' }} />
        <YAxis allowDecimals={false} axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: 'var(--admin-text-muted)' }} />
        <Tooltip contentStyle={{ border: '1px solid var(--admin-border)', backgroundColor: 'var(--admin-panel)', color: 'var(--admin-text)', borderRadius: 6, fontSize: 12 }} />
        <Line type="monotone" dataKey="views" name="访问" stroke="#3b8ccc" strokeWidth={2.2} dot={false} activeDot={{ r: 3 }} isAnimationActive={false} />
        <Line type="monotone" dataKey="visitors" name="访问用户" stroke="#2fb7ad" strokeWidth={2.2} dot={false} activeDot={{ r: 3 }} isAnimationActive={false} />
      </LineChart>
    </ResponsiveContainer>
  </div>;
}
