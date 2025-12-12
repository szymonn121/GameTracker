"use client";

import { Pie, PieChart, ResponsiveContainer, Tooltip, Cell } from 'recharts';

const palette = ['#7dd3fc', '#a78bfa', '#38bdf8', '#c084fc', '#22d3ee'];

interface Props {
  data: { genre: string; hours: number }[];
}

export function TopGenresChart({ data }: Props) {
  return (
    <div className="h-64 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie data={data} dataKey="hours" nameKey="genre" outerRadius={90} label>
            {data.map((_, i) => (
              <Cell key={i} fill={palette[i % palette.length]} />
            ))}
          </Pie>
          <Tooltip contentStyle={{ background: '#0b1021', border: '1px solid #1f2a44' }} />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
}
