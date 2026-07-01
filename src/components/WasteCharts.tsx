import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  Cell
} from 'recharts';
import { Bin } from '../types';

export default function WasteCharts({ bins }: { bins: Bin[] }) {
  if (bins.length === 0) return null;

  const data = bins.map(bin => ({
    name: bin.name,
    degradable: bin.levels.degradable,
    non_degradable: bin.levels.non_degradable,
  }));

  const colors = {
    degradable: '#2ecc71',
    non_degradable: '#3498db',
  };

  return (
    <ResponsiveContainer width="100%" height="100%">
      <BarChart
        data={data}
        margin={{ top: 20, right: 30, left: 0, bottom: 0 }}
      >
        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(255,255,255,0.05)" />
        <XAxis 
          dataKey="name" 
          axisLine={false} 
          tickLine={false} 
          tick={{ fontSize: 10, fontWeight: 900, fill: '#64748b', letterSpacing: '0.1em' }}
          dy={10}
        />
        <YAxis 
          axisLine={false} 
          tickLine={false} 
          tick={{ fontSize: 10, fontWeight: 900, fill: '#64748b' }}
        />
        <Tooltip 
          cursor={{ fill: 'rgba(255,255,255,0.03)' }}
          contentStyle={{ 
            backgroundColor: 'rgba(15, 23, 42, 0.9)',
            backdropFilter: 'blur(16px)',
            borderRadius: '24px', 
            border: '1px solid rgba(255,255,255,0.1)', 
            boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)',
            fontSize: '12px',
            color: '#f1f5f9'
          }}
          itemStyle={{ fontWeight: 'bold', textTransform: 'uppercase', fontSize: '10px' }}
        />
        <Bar dataKey="degradable" fill={colors.degradable} radius={[4, 4, 0, 0]} barSize={20} />
        <Bar dataKey="non_degradable" fill={colors.non_degradable} radius={[4, 4, 0, 0]} barSize={20} />
      </BarChart>
    </ResponsiveContainer>
  );
}
