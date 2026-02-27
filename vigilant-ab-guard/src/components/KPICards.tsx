import { motion } from 'framer-motion';
import { FileText, AlertTriangle, IndianRupee, TrendingUp } from 'lucide-react';
import { useFraudData } from '@/lib/api';

const KPICards = () => {
  const { stats, loading, error } = useFraudData();

  if (loading) return <div className="p-5 text-center text-muted-foreground">Loading KPIs...</div>;
  if (error) return <div className="p-5 text-center text-destructive">Error: {error}</div>;

  const totalClaims = stats?.kpis?.totalClaims || 0;
  const flaggedClaims = stats?.kpis?.flaggedClaims || 0;
  const totalAmount = stats?.kpis?.totalAmount || 0;
  // Fallback potential savings calculation if not explicitly provided by API
  const potentialSavings = totalAmount * 0.15 * (flaggedClaims / (totalClaims || 1));
  const fraudRate = totalClaims > 0 ? ((flaggedClaims / totalClaims) * 100).toFixed(1) : "0.0";

  const cards = [
    {
      title: 'Total Claims',
      value: totalClaims.toLocaleString(),
      subtitle: 'Last 6 months',
      icon: FileText,
      accent: 'primary' as const,
    },
    {
      title: 'Flagged Claims',
      value: flaggedClaims.toString(),
      subtitle: `${fraudRate}% fraud rate`,
      icon: AlertTriangle,
      accent: 'destructive' as const,
    },
    {
      title: 'Claims Value',
      value: `₹${(totalAmount / 10000000).toFixed(1)}Cr`,
      subtitle: 'Total processed',
      icon: IndianRupee,
      accent: 'warning' as const,
    },
    {
      title: 'Potential Savings',
      value: `₹${(potentialSavings / 100000).toFixed(1)}L`,
      subtitle: 'If fraud prevented',
      icon: TrendingUp,
      accent: 'success' as const,
    },
  ];

  const accentStyles = {
    primary: 'bg-primary/10 text-primary border-primary/20 glow-primary',
    destructive: 'bg-destructive/10 text-destructive border-destructive/20 glow-destructive',
    warning: 'bg-warning/10 text-warning border-warning/20 glow-warning',
    success: 'bg-success/10 text-success border-success/20',
  };

  const iconStyles = {
    primary: 'text-primary',
    destructive: 'text-destructive',
    warning: 'text-warning',
    success: 'text-success',
  };

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
      {cards.map((card, i) => (
        <motion.div
          key={card.title}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: i * 0.1 }}
          className="glass-card p-5 hover:border-primary/30 transition-all duration-300 group"
        >
          <div className="flex items-start justify-between mb-3">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
              {card.title}
            </p>
            <div className={`p-1.5 rounded-lg ${accentStyles[card.accent]}`}>
              <card.icon className={`w-4 h-4 ${iconStyles[card.accent]}`} />
            </div>
          </div>
          <p className="text-2xl font-bold text-foreground font-mono">{card.value}</p>
          <p className="text-xs text-muted-foreground mt-1">{card.subtitle}</p>
        </motion.div>
      ))}
    </div>
  );
};

export default KPICards;
