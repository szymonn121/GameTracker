"use client";

import { Area, AreaChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';

interface Props {
  data: { month: string; hours: number }[];
}

export function PlaytimeChart({ data }: Props) {
  const CustomTooltip = ({ active, payload }: { active?: boolean; payload?: { payload: { month: string; hours: number } }[] }) => {
    if (!active || !payload?.length) return null;
    const item = payload[0]?.payload;
    return (
      <div className="rounded-lg border border-slate-800 bg-slate-950 px-3 py-2 shadow-lg">
        <p className="text-xs text-slate-400">{item.month}</p>
        <p className="text-sm font-semibold text-slate-100">{item.hours.toFixed(1)} hrs</p>
      </div>
    );
  };

  const formatMonth = (value: string) => {
    const parts = value.split('-');
    if (parts.length === 2) {
      const monthNum = parseInt(parts[1], 10);
      if (!Number.isNaN(monthNum)) return monthNum.toString();
    }
    return value;
  };

  // Check if all data is zero
  const hasData = data.some(d => d.hours > 0);

  return (
    <div className="h-[295px] w-full">
      {!hasData ? (
        <div className="flex h-full items-center justify-center">
          <div className="text-center space-y-2">
            <p className="text-sm text-slate-400">No monthly data yet</p>
            <p className="text-xs text-slate-500">Play games to start tracking monthly playtime</p>
          </div>
        </div>
      ) : (
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data} margin={{ top: 20, right: 15, left: 0, bottom: 0 }}>
            <defs>
              <linearGradient id="colorHours" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="var(--primary)" stopOpacity={0.85} />
                <stop offset="95%" stopColor="var(--primary)" stopOpacity={0} />
              </linearGradient>
            </defs>
            <XAxis dataKey="month" stroke="var(--muted-foreground)" tickFormatter={formatMonth} />
            <YAxis stroke="var(--muted-foreground)" tickFormatter={(value) => Math.round(value).toString()} />
            <Tooltip content={<CustomTooltip />} />
            <Area type="monotone" dataKey="hours" stroke="var(--primary)" fillOpacity={1} fill="url(#colorHours)" />
          </AreaChart>
        </ResponsiveContainer>
      )}
    </div>
  );
}
