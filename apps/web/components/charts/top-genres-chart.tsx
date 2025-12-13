"use client";

import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis, Text } from 'recharts';

interface Props {
  // Reusing server field name "genre" to carry game name for minimal API changes
  data: { genre: string; hours: number }[];
}

export function TopGenresChart({ data }: Props) {
  const truncate = (value: string, max = 12) => (value.length > max ? `${value.slice(0, max)}…` : value);

  const CustomTick = (props: any) => {
    const { x, y, payload } = props;
    return (
      <Text x={x} y={y} width={80} textAnchor="middle" verticalAnchor="start" fontSize={12} fill="#9ca3af">
        {truncate(payload.value, 14)}
      </Text>
    );
  };

  const CustomTooltip = ({ active, payload }: any) => {
    if (!active || !payload?.length) return null;
    const item = payload[0]?.payload;
    return (
      <div className="rounded-lg border border-slate-800 bg-slate-950 px-3 py-2 shadow-lg">
        <p className="text-sm font-semibold text-slate-100">{item.genre}</p>
        <p className="text-xs text-slate-400">{item.hours.toFixed(1)} hrs</p>
      </div>
    );
  };

  return (
    <div className="h-80 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 10, right: 10, left: 10, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
          <XAxis
            dataKey="genre"
            stroke="var(--muted-foreground)"
            interval={0}
            tickLine={false}
            height={64}
            tickMargin={12}
            tick={<CustomTick />}
          />
          <YAxis stroke="var(--muted-foreground)" tickLine={false} axisLine={{ stroke: 'var(--border)' }} />
          <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(56,189,248,0.08)' }} />
          <defs>
            <linearGradient id="barFill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="var(--primary)" stopOpacity={0.95} />
              <stop offset="100%" stopColor="var(--primary)" stopOpacity={0.55} />
            </linearGradient>
          </defs>
          <Bar
            dataKey="hours"
            fill="url(#barFill)"
            radius={[6, 6, 0, 0]}
            activeBar={{ fill: 'var(--primary)' }}
            maxBarSize={54}
          />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
