"use client";

import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';

interface Props {
  // Reusing server field name "genre" to carry game name for minimal API changes
  data: { genre: string; hours: number }[];
}

const CustomTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload || payload.length === 0) return null;
  const hours = payload[0].value as number;

  return (
    <div className="rounded-md border border-sky-400/40 bg-slate-950/90 px-3 py-2 shadow-lg shadow-sky-900/50">
      <p className="text-[10px] uppercase tracking-wide text-slate-300">Most played</p>
      <p className="text-sm font-semibold text-white">{label}</p>
      <p className="text-xs font-medium text-sky-200">{hours.toFixed(1)} hours</p>
    </div>
  );
};

export function TopGenresChart({ data }: Props) {
  return (
    <div className="h-80 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#1f2a44" />
          <XAxis dataKey="genre" stroke="#9ca3af" tick={{ fontSize: 12 }} interval={0} angle={-15} textAnchor="end" height={48} />
          <YAxis stroke="#9ca3af" />
          <Tooltip
            content={<CustomTooltip />}
            cursor={{ fill: 'rgba(56,189,248,0.08)' }}
            wrapperStyle={{ outline: 'none' }}
          />
          <Bar
            dataKey="hours"
            fill="#7dd3fc"
            radius={[6, 6, 0, 0]}
            activeBar={{ fill: '#38bdf8', radius: [8, 8, 0, 0], stroke: '#bae6fd', strokeWidth: 1.25 }}
          />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
