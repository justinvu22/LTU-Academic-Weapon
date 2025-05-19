import React from 'react';
import { PieChart, Pie, ResponsiveContainer, Cell } from 'recharts';
import { useRouter } from 'next/navigation';

  <div className="relative flex items-center justify-center w-full" style={{ width: 300, height: 300, maxWidth: '100%' }}>
    <ResponsiveContainer width={300} height={300}>
      <PieChart>
        {policyBreachData.slice(0, 5).map((entry, idx) => (
          <Pie
            key={entry.category}
            data={[{ value: entry.count }]}
            dataKey="value"
            cx="50%"
            cy="50%"
            startAngle={90}
            endAngle={-270}
            innerRadius={105 + idx * 15}
            outerRadius={120 + idx * 15}
            fill={POLICY_COLORS[entry.category] || Object.values(COLORS.risk)[idx % 4]}
            stroke="none"
            isAnimationActive={true}
            cornerRadius={8}
            background={{ fill: "#232346" }}
          />
        ))}
      </PieChart>
    </ResponsiveContainer>
  </div> 