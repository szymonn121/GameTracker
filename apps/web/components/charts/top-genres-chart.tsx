"use client";

import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';

interface Props {
  // Reusing server field name "genre" to carry game name for minimal API changes
  data: { genre: string; hours: number }[];
}

export function TopGenresChart({ data }: Props) {
  return (
    <div className="h-64 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#1f2a44" />
          <XAxis dataKey="genre" stroke="#9ca3af" tick={{ fontSize: 12 }} interval={0} angle={-15} textAnchor="end" height={48} />
          <YAxis stroke="#9ca3af" />
          <Tooltip contentStyle={{ background: '#0b1021', border: '1px solid #1f2a44' }} />
          <Bar dataKey="hours" fill="#7dd3fc" radius={[4, 4, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
