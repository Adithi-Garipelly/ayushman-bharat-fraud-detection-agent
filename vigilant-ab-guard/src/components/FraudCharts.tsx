import { motion } from 'framer-motion';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  LineChart, Line, PieChart, Pie, Cell, Area, AreaChart,
} from 'recharts';
import { useFraudData } from '@/lib/api';
import { monthlyFraudData } from '@/data/mockClaims'; // Monthly trend still mocked until historical backend is built

const COLORS = [
  'hsl(173, 80%, 40%)',
  'hsl(38, 92%, 50%)',
  'hsl(0, 72%, 51%)',
  'hsl(142, 70%, 45%)',
  'hsl(262, 60%, 55%)',
];

const CustomTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="glass-card p-3 text-xs border border-border">
      <p className="text-foreground font-semibold mb-1">{label}</p>
      {payload.map((p: any, i: number) => (
        <p key={i} style={{ color: p.color }} className="font-mono">
          {p.name}: {typeof p.value === 'number' && p.value > 10000
            ? `₹${(p.value / 100000).toFixed(1)}L`
            : p.value}
        </p>
      ))}
    </div>
  );
};

const FraudCharts = () => {
  const { stats, claims, loading } = useFraudData();

  if (loading) return <div className="p-5 text-center text-muted-foreground animate-pulse">Loading charts...</div>;

  // We map the hospital stats to a state-wise summary
  const stateWiseFraud = (() => {
    if (!stats?.hospitals) return [];

    const stateMap = new Map();
    stats.hospitals.forEach(h => {
      const state = h.state || 'Unknown';
      if (!stateMap.has(state)) {
        stateMap.set(state, { state, claims: 0, flagged: 0, amount: 0 });
      }
      const entry = stateMap.get(state);
      entry.claims += h.totalClaims;
      entry.flagged += h.flaggedClaims;
      entry.amount += h.totalAmount;
    });

    return Array.from(stateMap.values());
  })();

  const fraudTypeDistributionData = (() => {
    if (!claims) return [];

    const typeCount: Record<string, number> = {};
    let totalFraud = 0;

    claims.forEach((c: any) => {
      // Only count actual fraud types for distribution
      if (c.riskLevel !== 'low' && c.fraudType && c.fraudType !== 'clean') {
        typeCount[c.fraudType] = (typeCount[c.fraudType] || 0) + 1;
        totalFraud++;
      }
    });

    if (totalFraud === 0) return [];

    const labels: Record<string, string> = {
      upcoding: 'Upcoding',
      ghost_billing: 'Ghost Billing',
      duplicate: 'Duplicate Claims',
      anomaly: 'Price Anomaly'
    };

    return Object.entries(typeCount).map(([type, count]) => ({
      type: labels[type] || type,
      count,
      percentage: Math.round((count / totalFraud) * 100)
    })).sort((a, b) => b.count - a.count);
  })();
  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-6">
      {/* Monthly Trend */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        className="glass-card p-5 lg:col-span-2"
      >
        <h3 className="text-sm font-semibold text-foreground mb-4">Monthly Fraud Trend</h3>
        <ResponsiveContainer width="100%" height={220}>
          <AreaChart data={monthlyFraudData}>
            <defs>
              <linearGradient id="gradFlagged" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="hsl(0, 72%, 51%)" stopOpacity={0.3} />
                <stop offset="95%" stopColor="hsl(0, 72%, 51%)" stopOpacity={0} />
              </linearGradient>
              <linearGradient id="gradTotal" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="hsl(173, 80%, 40%)" stopOpacity={0.3} />
                <stop offset="95%" stopColor="hsl(173, 80%, 40%)" stopOpacity={0} />
              </linearGradient>
            </defs>
            <XAxis dataKey="month" stroke="hsl(215, 20%, 55%)" fontSize={11} tickLine={false} />
            <YAxis stroke="hsl(215, 20%, 55%)" fontSize={11} tickLine={false} />
            <Tooltip content={<CustomTooltip />} />
            <Area type="monotone" dataKey="total" stroke="hsl(173, 80%, 40%)" fill="url(#gradTotal)" strokeWidth={2} name="Total" />
            <Area type="monotone" dataKey="flagged" stroke="hsl(0, 72%, 51%)" fill="url(#gradFlagged)" strokeWidth={2} name="Flagged" />
          </AreaChart>
        </ResponsiveContainer>
      </motion.div>

      {/* Fraud Type Distribution */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
        className="glass-card p-5"
      >
        <h3 className="text-sm font-semibold text-foreground mb-4">Fraud Type Distribution</h3>
        <ResponsiveContainer width="100%" height={160}>
          <PieChart>
            <Pie
              data={fraudTypeDistributionData}
              cx="50%"
              cy="50%"
              innerRadius={40}
              outerRadius={65}
              dataKey="count"
              nameKey="type"
              stroke="none"
            >
              {fraudTypeDistributionData.map((_, i) => (
                <Cell key={i} fill={COLORS[i % COLORS.length]} />
              ))}
            </Pie>
            <Tooltip content={<CustomTooltip />} />
          </PieChart>
        </ResponsiveContainer>
        <div className="space-y-1.5 mt-2">
          {fraudTypeDistributionData.map((item, i) => (
            <div key={item.type} className="flex items-center justify-between text-xs">
              <div className="flex items-center gap-2">
                <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: COLORS[i] }} />
                <span className="text-muted-foreground">{item.type}</span>
              </div>
              <span className="font-mono text-foreground">{item.percentage}%</span>
            </div>
          ))}
        </div>
      </motion.div>

      {/* State-wise Bar Chart */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5 }}
        className="glass-card p-5 lg:col-span-3"
      >
        <h3 className="text-sm font-semibold text-foreground mb-4">State-wise Fraud Analysis</h3>
        <ResponsiveContainer width="100%" height={200}>
          <BarChart data={stateWiseFraud} barGap={4}>
            <XAxis dataKey="state" stroke="hsl(215, 20%, 55%)" fontSize={10} tickLine={false} angle={-20} textAnchor="end" height={50} />
            <YAxis stroke="hsl(215, 20%, 55%)" fontSize={10} tickLine={false} />
            <Tooltip content={<CustomTooltip />} />
            <Bar dataKey="claims" fill="hsl(173, 80%, 40%)" radius={[4, 4, 0, 0]} name="Total Claims" />
            <Bar dataKey="flagged" fill="hsl(0, 72%, 51%)" radius={[4, 4, 0, 0]} name="Flagged" />
          </BarChart>
        </ResponsiveContainer>
      </motion.div>
    </div>
  );
};

export default FraudCharts;
