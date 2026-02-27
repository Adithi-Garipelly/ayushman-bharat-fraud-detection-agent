import { useState } from 'react';
import { submitFraudReport } from '@/lib/api';
import { X, AlertTriangle } from 'lucide-react';

interface ReportFraudModalProps {
    claim: any;
    onClose: () => void;
}

export default function ReportFraudModal({ claim, onClose }: ReportFraudModalProps) {
    const [reportText, setReportText] = useState('');
    const [submitting, setSubmitting] = useState(false);
    const [success, setSuccess] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);
        if (!reportText.trim()) {
            setError('Please provide details about the suspected fraud.');
            return;
        }

        try {
            setSubmitting(true);
            await submitFraudReport({
                claim_id: claim.claim_id,
                beneficiary_id: claim.beneficiary_id,
                report_text: reportText
            });
            setSuccess(true);
            setTimeout(() => {
                onClose();
            }, 2000);
        } catch (err: any) {
            setError(err.message || 'Failed to submit report.');
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm p-4">
            <div className="bg-card w-full max-w-md rounded-xl shadow-2xl overflow-hidden border border-border">
                <div className="flex justify-between items-center p-4 border-b border-border bg-destructive/10">
                    <h3 className="text-lg font-semibold flex items-center gap-2 text-destructive">
                        <AlertTriangle className="w-5 h-5" />
                        Report Suspicious Claim
                    </h3>
                    <button onClick={onClose} className="p-1 hover:bg-black/10 rounded-full transition-colors">
                        <X className="w-5 h-5 text-muted-foreground" />
                    </button>
                </div>

                {success ? (
                    <div className="p-8 text-center">
                        <div className="w-12 h-12 bg-primary/20 text-primary rounded-full flex items-center justify-center mx-auto mb-4">
                            <span className="text-2xl">✓</span>
                        </div>
                        <h4 className="text-xl font-medium mb-2">Report Submitted</h4>
                        <p className="text-muted-foreground text-sm">
                            Thank you. Our investigation team has been notified and this hospital will be reviewed.
                        </p>
                    </div>
                ) : (
                    <form onSubmit={handleSubmit} className="p-6">
                        <div className="mb-4 bg-muted/50 p-3 rounded-md text-sm">
                            <p><span className="font-semibold text-muted-foreground">Claim ID:</span> <span className="font-mono">{claim.claim_id}</span></p>
                            <p><span className="font-semibold text-muted-foreground">Hospital:</span> {claim.hospital_name}</p>
                            <p><span className="font-semibold text-muted-foreground">Amount Billed:</span> ₹{claim.claim_amount.toLocaleString('en-IN')}</p>
                            <p><span className="font-semibold text-muted-foreground">Procedure:</span> {claim.procedure_code}</p>
                        </div>

                        <div className="mb-4">
                            <label className="block text-sm font-medium mb-2">Why are you reporting this claim?</label>
                            <textarea
                                className="w-full bg-background border border-input rounded-md p-3 text-sm min-h-[120px] focus:ring-1 focus:ring-primary outline-none transition-shadow"
                                placeholder="Describe why this claim is suspicious (e.g., 'The hospital asked me for an extra cash bribe', 'I never underwent this procedure', 'I was charged for 5 days but only stayed 2')."
                                value={reportText}
                                onChange={(e) => setReportText(e.target.value)}
                            />
                        </div>

                        {error && (
                            <div className="mb-4 text-xs font-medium text-destructive bg-destructive/10 p-2 rounded-md">
                                {error}
                            </div>
                        )}

                        <div className="flex justify-end gap-3 mt-6">
                            <button
                                type="button"
                                onClick={onClose}
                                className="px-4 py-2 rounded-md text-sm font-medium hover:bg-muted transition-colors"
                            >
                                Cancel
                            </button>
                            <button
                                type="submit"
                                disabled={submitting}
                                className="px-4 py-2 rounded-md text-sm font-medium bg-destructive text-destructive-foreground hover:bg-destructive/90 transition-colors flex items-center gap-2 disabled:opacity-70"
                            >
                                {submitting ? 'Submitting...' : 'Submit Report'}
                            </button>
                        </div>
                    </form>
                )}
            </div>
        </div>
    );
}
