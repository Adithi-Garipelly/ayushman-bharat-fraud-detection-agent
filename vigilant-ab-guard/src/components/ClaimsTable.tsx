import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, Filter, ChevronDown, Eye, FileWarning } from 'lucide-react';
import type { Claim, RiskLevel } from '@/data/mockClaims';
import { useFraudData } from '@/lib/api';
import { Badge } from '@/components/ui/badge';
import RiskReportModal from './RiskReportModal';

const riskColors: Record<RiskLevel, string> = {
  critical: 'bg-destructive/20 text-destructive border-destructive/30',
  high: 'bg-warning/20 text-warning border-warning/30',
  medium: 'bg-primary/20 text-primary border-primary/30',
  low: 'bg-success/20 text-success border-success/30',
};

const fraudLabels: Record<string, string> = {
  upcoding: 'Upcoding',
  ghost_billing: 'Ghost Billing',
  duplicate: 'Duplicate',
  phantom_patient: 'Phantom Patient',
  unbundling: 'Unbundling',
  clean: 'Clean',
};

const statusColors: Record<string, string> = {
  pending: 'bg-warning/10 text-warning',
  approved: 'bg-success/10 text-success',
  rejected: 'bg-destructive/10 text-destructive',
  under_review: 'bg-primary/10 text-primary',
};

const ClaimsTable = () => {
  const { claims, loading } = useFraudData();
  const [search, setSearch] = useState('');
  const [riskFilter, setRiskFilter] = useState<RiskLevel | 'all'>('all');
  const [selectedClaim, setSelectedClaim] = useState<Claim | null>(null);
  const [showReport, setShowReport] = useState(false);

  // Use the fetched claims instead of the static mock array
  const filtered = (claims || [])
    .filter(c => {
      if (riskFilter !== 'all' && c.riskLevel !== riskFilter) return false;
      if (search) {
        const q = search.toLowerCase();
        return (
          c.id.toLowerCase().includes(q) ||
          c.hospitalName.toLowerCase().includes(q) ||
          c.patientName.toLowerCase().includes(q) ||
          c.procedureName.toLowerCase().includes(q)
        );
      }
      return true;
    })
    .sort((a, b) => b.riskScore - a.riskScore)
    .slice(0, 30);

  return (
    <>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.6 }}
        className="glass-card p-5 mb-6"
      >
        <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
          <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
            <FileWarning className="w-4 h-4 text-warning" />
            Claims Monitor
          </h3>
          <div className="flex items-center gap-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
              <input
                type="text"
                placeholder="Search claims..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9 pr-4 py-1.5 text-xs rounded-lg bg-secondary border border-border text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary w-52"
              />
            </div>
            <div className="flex gap-1">
              {(['all', 'critical', 'high', 'medium', 'low'] as const).map(level => (
                <button
                  key={level}
                  onClick={() => setRiskFilter(level)}
                  className={`px-2.5 py-1 text-[10px] font-medium rounded-md transition-colors uppercase tracking-wider ${riskFilter === level
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-secondary text-muted-foreground hover:text-foreground'
                    }`}
                >
                  {level}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-border">
                {['Claim ID', 'Hospital', 'Patient', 'Procedure', 'Amount', 'Expected', 'Risk', 'Fraud Type', 'Status', ''].map(h => (
                  <th key={h} className="text-left py-2.5 px-3 text-muted-foreground font-medium uppercase tracking-wider text-[10px]">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              <AnimatePresence>
                {filtered.map((claim, i) => (
                  <motion.tr
                    key={claim.id}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ delay: i * 0.02 }}
                    className="border-b border-border/50 hover:bg-secondary/50 transition-colors group"
                  >
                    <td className="py-2.5 px-3 font-mono text-primary">{claim.id}</td>
                    <td className="py-2.5 px-3 text-foreground">{claim.hospitalName}</td>
                    <td className="py-2.5 px-3 text-muted-foreground">{claim.patientName}</td>
                    <td className="py-2.5 px-3 text-muted-foreground">{claim.procedureName}</td>
                    <td className="py-2.5 px-3 font-mono text-foreground">₹{claim.claimAmount.toLocaleString()}</td>
                    <td className="py-2.5 px-3 font-mono text-muted-foreground">₹{claim.expectedAmount.toLocaleString()}</td>
                    <td className="py-2.5 px-3">
                      <div className="flex items-center gap-2">
                        <div className="w-12 h-1.5 rounded-full bg-secondary overflow-hidden">
                          <div
                            className={`h-full rounded-full ${claim.riskScore >= 85 ? 'bg-destructive' :
                                claim.riskScore >= 65 ? 'bg-warning' :
                                  claim.riskScore >= 40 ? 'bg-primary' : 'bg-success'
                              }`}
                            style={{ width: `${claim.riskScore}%` }}
                          />
                        </div>
                        <span className="font-mono text-foreground">{claim.riskScore}</span>
                      </div>
                    </td>
                    <td className="py-2.5 px-3">
                      <Badge variant="outline" className={`text-[10px] ${riskColors[claim.riskLevel]}`}>
                        {fraudLabels[claim.fraudType]}
                      </Badge>
                    </td>
                    <td className="py-2.5 px-3">
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-medium ${statusColors[claim.status]}`}>
                        {claim.status.replace('_', ' ')}
                      </span>
                    </td>
                    <td className="py-2.5 px-3">
                      <button
                        onClick={() => { setSelectedClaim(claim); setShowReport(true); }}
                        className="opacity-0 group-hover:opacity-100 transition-opacity p-1 rounded hover:bg-primary/10"
                      >
                        <Eye className="w-3.5 h-3.5 text-primary" />
                      </button>
                    </td>
                  </motion.tr>
                ))}
              </AnimatePresence>
            </tbody>
          </table>
        </div>
        <p className="text-[10px] text-muted-foreground mt-3">
          {loading ? 'Loading claims...' : `Showing ${filtered.length} of ${claims?.length || 0} claims • Sorted by risk score`}
        </p>
      </motion.div>

      {showReport && selectedClaim && (
        <RiskReportModal claim={selectedClaim} onClose={() => setShowReport(false)} />
      )}
    </>
  );
};

export default ClaimsTable;
