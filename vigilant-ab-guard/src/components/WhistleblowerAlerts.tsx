import { useState, useEffect } from 'react';
import { getFraudReports } from '@/lib/api';
import { ShieldAlert, Clock, FileText } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

export default function WhistleblowerAlerts() {
    const [reports, setReports] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchReports = async () => {
            try {
                const data = await getFraudReports();
                setReports(data.reverse()); // Newest first
            } catch (error) {
                console.error("Failed to fetch whistleblower reports", error);
            } finally {
                setLoading(false);
            }
        };

        fetchReports();
        // Option: Poll every 10 seconds for new alerts in real implementation
        const interval = setInterval(fetchReports, 10000);
        return () => clearInterval(interval);
    }, []);

    if (loading || reports.length === 0) {
        return null;
    }

    return (
        <div className="mb-6">
            <h2 className="text-xl font-bold font-display mb-4 flex items-center gap-2 text-destructive">
                <ShieldAlert className="w-5 h-5" />
                Patient Whistleblower Alerts ({reports.length})
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {reports.map((report, idx) => (
                    <div
                        key={idx}
                        className="glass-card p-5 border-destructive/40 bg-destructive/5 relative overflow-hidden group hover:bg-destructive/10 transition-colors"
                    >
                        <div className="absolute top-0 left-0 w-1 h-full bg-destructive" />

                        <div className="flex justify-between items-start mb-3">
                            <div className="bg-destructive/20 text-destructive text-xs font-bold px-2 py-1 rounded">
                                CRITICAL PRIORITY
                            </div>
                            <div className="flex items-center text-xs text-muted-foreground gap-1">
                                <Clock className="w-3 h-3" />
                                {formatDistanceToNow(new Date(report.timestamp), { addSuffix: true })}
                            </div>
                        </div>

                        <p className="font-mono text-sm text-white mb-1 tracking-tight">
                            Claim: {report.claim_id}
                        </p>
                        <p className="text-sm font-medium text-muted-foreground mb-3 flex items-center gap-1.5">
                            <FileText className="w-3.5 h-3.5" />
                            Reported by Beneficiary: {report.beneficiary_id}
                        </p>

                        <div className="bg-background/60 p-3 rounded-md border border-border/50">
                            <p className="text-sm italic text-muted-foreground w-full break-words">
                                "{report.report_text}"
                            </p>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}
