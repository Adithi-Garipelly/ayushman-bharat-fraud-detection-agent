import { motion } from 'framer-motion';
import { X, AlertTriangle, FileText, MapPin, Building2, User, Stethoscope, IndianRupee } from 'lucide-react';
import { type Claim } from '@/data/mockClaims';

interface Props {
  claim: Claim;
  onClose: () => void;
}

const RiskReportModal = ({ claim, onClose }: Props) => {
  const deviation = ((claim.claimAmount - claim.expectedAmount) / claim.expectedAmount * 100).toFixed(1);
  const isOvercharge = claim.claimAmount > claim.expectedAmount;

  const riskFactors = [
    claim.fraudType === 'upcoding' && `Claim amount ₹${claim.claimAmount.toLocaleString()} is ${deviation}% above expected ₹${claim.expectedAmount.toLocaleString()} for ${claim.procedureName}.`,
    claim.fraudType === 'ghost_billing' && `No verifiable patient records found matching ${claim.patientName} (${claim.patientId}) at ${claim.hospitalName} for the claimed procedure.`,
    claim.fraudType === 'duplicate' && `Duplicate claim detected: similar procedure, patient, and date combination found in records.`,
    claim.fraudType === 'phantom_patient' && `Patient identity ${claim.patientId} could not be verified in Aadhaar-linked PMJAY registry.`,
    claim.fraudType === 'unbundling' && `Procedure appears to have been split into multiple claims to circumvent package rate limits.`,
    claim.riskScore >= 80 && `Hospital ${claim.hospitalName} has a historically elevated fraud flag rate in ${claim.district}, ${claim.state}.`,
    isOvercharge && `Billing deviation of ${deviation}% detected above the PMJAY standard package rate.`,
  ].filter(Boolean);

  const recommendations = [
    claim.riskScore >= 85 && 'Immediate field audit recommended for this hospital.',
    claim.riskScore >= 65 && 'Cross-verify patient records with Aadhaar-linked database.',
    isOvercharge && 'Compare with peer hospital billing patterns in the same district.',
    'Notify State Health Agency (SHA) for further investigation.',
    claim.fraudType === 'ghost_billing' && 'Conduct surprise inspection of facility.',
  ].filter(Boolean);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm p-4"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className="glass-card max-w-2xl w-full max-h-[85vh] overflow-y-auto p-6"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between mb-5">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-destructive/10">
              <FileText className="w-5 h-5 text-destructive" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-foreground">Risk Assessment Report</h2>
              <p className="text-xs text-muted-foreground font-mono">{claim.id}</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-secondary transition-colors">
            <X className="w-4 h-4 text-muted-foreground" />
          </button>
        </div>

        {/* Risk Score Banner */}
        <div className={`rounded-xl p-4 mb-5 ${
          claim.riskScore >= 85 ? 'bg-destructive/10 border border-destructive/20' :
          claim.riskScore >= 65 ? 'bg-warning/10 border border-warning/20' :
          'bg-primary/10 border border-primary/20'
        }`}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <AlertTriangle className={`w-5 h-5 ${
                claim.riskScore >= 85 ? 'text-destructive' : claim.riskScore >= 65 ? 'text-warning' : 'text-primary'
              }`} />
              <span className="text-sm font-semibold text-foreground">
                Risk Score: <span className="font-mono">{claim.riskScore}/100</span>
              </span>
            </div>
            <span className={`text-xs font-bold uppercase tracking-wider ${
              claim.riskScore >= 85 ? 'text-destructive' : claim.riskScore >= 65 ? 'text-warning' : 'text-primary'
            }`}>
              {claim.riskLevel}
            </span>
          </div>
          <div className="w-full h-2 rounded-full bg-secondary mt-3">
            <div
              className={`h-full rounded-full transition-all ${
                claim.riskScore >= 85 ? 'bg-destructive' : claim.riskScore >= 65 ? 'bg-warning' : 'bg-primary'
              }`}
              style={{ width: `${claim.riskScore}%` }}
            />
          </div>
        </div>

        {/* Details Grid */}
        <div className="grid grid-cols-2 gap-3 mb-5">
          {[
            { icon: Building2, label: 'Hospital', value: claim.hospitalName, sub: `${claim.district}, ${claim.state}` },
            { icon: User, label: 'Patient', value: claim.patientName, sub: claim.patientId },
            { icon: Stethoscope, label: 'Procedure', value: claim.procedureName, sub: claim.procedureCode },
            { icon: IndianRupee, label: 'Claim Amount', value: `₹${claim.claimAmount.toLocaleString()}`, sub: `Expected: ₹${claim.expectedAmount.toLocaleString()}` },
          ].map(item => (
            <div key={item.label} className="bg-secondary/50 rounded-lg p-3">
              <div className="flex items-center gap-2 mb-1">
                <item.icon className="w-3.5 h-3.5 text-muted-foreground" />
                <span className="text-[10px] text-muted-foreground uppercase tracking-wider">{item.label}</span>
              </div>
              <p className="text-sm font-semibold text-foreground">{item.value}</p>
              <p className="text-[10px] text-muted-foreground">{item.sub}</p>
            </div>
          ))}
        </div>

        {/* Risk Factors */}
        <div className="mb-5">
          <h3 className="text-xs font-semibold text-foreground mb-2 uppercase tracking-wider">Risk Factors Identified</h3>
          <ul className="space-y-2">
            {riskFactors.map((factor, i) => (
              <li key={i} className="flex items-start gap-2 text-xs text-muted-foreground">
                <span className="w-1.5 h-1.5 rounded-full bg-destructive mt-1.5 flex-shrink-0" />
                {factor}
              </li>
            ))}
          </ul>
        </div>

        {/* Recommendations */}
        <div>
          <h3 className="text-xs font-semibold text-foreground mb-2 uppercase tracking-wider">Recommendations</h3>
          <ul className="space-y-2">
            {recommendations.map((rec, i) => (
              <li key={i} className="flex items-start gap-2 text-xs text-muted-foreground">
                <span className="w-1.5 h-1.5 rounded-full bg-primary mt-1.5 flex-shrink-0" />
                {rec}
              </li>
            ))}
          </ul>
        </div>

        <div className="mt-5 pt-4 border-t border-border flex justify-between items-center">
          <p className="text-[10px] text-muted-foreground">Generated by AB Fraud Detection Agent • {new Date().toLocaleDateString()}</p>
          <button
            onClick={onClose}
            className="px-4 py-1.5 text-xs font-medium rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 transition-colors"
          >
            Close Report
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
};

export default RiskReportModal;
