import { useState, useEffect } from 'react';
import DashboardHeader from '@/components/DashboardHeader';
import { submitManualClaim, fetchHospitalsAndProcedures } from '@/lib/api';
import { AlertTriangle, CheckCircle, ShieldAlert, Loader2, Activity } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

const ManualCheck = () => {
    const [hospitals, setHospitals] = useState<any[]>([]);
    const [mappings, setMappings] = useState<any>({});

    const [formData, setFormData] = useState({
        hospital_id: '',
        beneficiary_id: '',
        diagnosis_code: '',
        procedure_code: '',
        claim_amount: '',
        claim_date: new Date().toISOString().split('T')[0]
    });

    const [loading, setLoading] = useState(false);
    const [result, setResult] = useState<any>(null);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        fetchHospitalsAndProcedures().then(res => {
            setHospitals(res.hospitals || []);
            setMappings(res.valid_mapping || {});

            // Auto-set first options to make form easier
            if (res.hospitals?.length > 0) {
                setFormData(prev => ({ ...prev, hospital_id: res.hospitals[0].id }));
            }
            const diags = Object.keys(res.valid_mapping || {});
            if (diags.length > 0) {
                const firstDiag = diags[0];
                setFormData(prev => ({
                    ...prev,
                    diagnosis_code: firstDiag,
                    procedure_code: res.valid_mapping[firstDiag][0]
                }));
            }
        }).catch(console.error);
    }, []);

    const handleDiagChange = (diag: string) => {
        setFormData(prev => ({
            ...prev,
            diagnosis_code: diag,
            procedure_code: mappings[diag] ? mappings[diag][0] : ''
        }));
    };

    const onSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError(null);
        setResult(null);

        // Validate AB ID roughly
        if (!formData.beneficiary_id.startsWith('AB') || formData.beneficiary_id.length !== 6) {
            setError("Beneficiary ID should be formatted like 'AB0001'");
            setLoading(false);
            return;
        }

        try {
            const payload = {
                ...formData,
                claim_amount: parseFloat(formData.claim_amount)
            };

            const response = await submitManualClaim(payload);
            setResult(response);
        } catch (err: any) {
            setError(err.message || "Failed to analyze claim");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-background p-4 lg:p-6">
            <div className="max-w-[1400px] mx-auto">
                <DashboardHeader />

                <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="glass-card p-6">
                        <div className="mb-6">
                            <h2 className="text-xl font-bold font-display">Manual Claim Analysis</h2>
                            <p className="text-sm text-muted-foreground mt-1">Submit a real-time claim through the AI pipeline.</p>
                        </div>

                        <form onSubmit={onSubmit} className="space-y-4">
                            <div>
                                <label className="text-sm font-medium">Hospital</label>
                                <select
                                    className="w-full mt-1 flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                                    value={formData.hospital_id}
                                    onChange={e => setFormData({ ...formData, hospital_id: e.target.value })}
                                >
                                    {hospitals.map(h => (
                                        <option key={h.id} value={h.id}>{h.name} - {h.district}</option>
                                    ))}
                                </select>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="text-sm font-medium">Beneficiary ID</label>
                                    <Input
                                        type="text"
                                        placeholder="e.g. AB0001"
                                        className="mt-1"
                                        required
                                        value={formData.beneficiary_id}
                                        onChange={e => setFormData({ ...formData, beneficiary_id: e.target.value })}
                                    />
                                </div>
                                <div>
                                    <label className="text-sm font-medium">Claim Date</label>
                                    <Input
                                        type="date"
                                        className="mt-1"
                                        required
                                        value={formData.claim_date}
                                        onChange={e => setFormData({ ...formData, claim_date: e.target.value })}
                                    />
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="text-sm font-medium">Diagnosis Code</label>
                                    <select
                                        className="w-full mt-1 flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                                        value={formData.diagnosis_code}
                                        onChange={e => handleDiagChange(e.target.value)}
                                    >
                                        {Object.keys(mappings).map(d => (
                                            <option key={d} value={d}>{d}</option>
                                        ))}
                                    </select>
                                </div>
                                <div>
                                    <label className="text-sm font-medium">Procedure Code</label>
                                    <select
                                        className="w-full mt-1 flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                                        value={formData.procedure_code}
                                        onChange={e => setFormData({ ...formData, procedure_code: e.target.value })}
                                    >
                                        {(mappings[formData.diagnosis_code] || []).map((p: string) => (
                                            <option key={p} value={p}>{p}</option>
                                        ))}
                                        {/* Add an invalid option manually for testing upcoding */}
                                        <option value="Coronary Artery Bypass Grafting (CABG)">CABG (Test Upcoding)</option>
                                    </select>
                                </div>
                            </div>

                            <div>
                                <label className="text-sm font-medium">Claim Amount (₹)</label>
                                <Input
                                    type="number"
                                    min="0"
                                    placeholder="e.g. 15000"
                                    className="mt-1"
                                    required
                                    value={formData.claim_amount}
                                    onChange={e => setFormData({ ...formData, claim_amount: e.target.value })}
                                />
                            </div>

                            {error && (
                                <div className="p-3 rounded bg-destructive/10 border border-destructive/20 text-destructive text-sm flex items-center gap-2">
                                    <AlertTriangle className="w-4 h-4" />
                                    {error}
                                </div>
                            )}

                            <Button type="submit" disabled={loading} className="w-full group overflow-hidden relative">
                                <span className="relative z-10 flex items-center justify-center gap-2">
                                    {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <ShieldAlert className="w-4 h-4" />}
                                    {loading ? 'Analyzing...' : 'Analyze Claim'}
                                </span>
                                <div className="absolute inset-0 glow-primary opacity-0 group-hover:opacity-100 transition-opacity"></div>
                            </Button>
                        </form>
                    </div>

                    <div className="glass-card p-6 h-full min-h-[400px]">
                        <div className="mb-6">
                            <h2 className="text-xl font-bold font-display">Analysis Result</h2>
                            <p className="text-sm text-muted-foreground mt-1">Real-time AI determination</p>
                        </div>

                        {!result && !loading && (
                            <div className="flex flex-col items-center justify-center h-[300px] text-muted-foreground">
                                <Activity className="w-12 h-12 mb-4 opacity-20" />
                                <p>Submit a claim to view risk analysis.</p>
                            </div>
                        )}

                        {loading && (
                            <div className="flex flex-col items-center justify-center h-[300px] text-muted-foreground">
                                <Loader2 className="w-12 h-12 mb-4 animate-spin text-primary" />
                                <p>Running ML pipeline...</p>
                            </div>
                        )}

                        {result && !loading && (
                            <div className="animate-in fade-in slide-in-from-bottom-4">
                                <div className="flex items-center justify-between mb-8">
                                    <div>
                                        <h3 className="text-3xl font-bold flex items-center gap-2">
                                            <span className={result.risk_level === 'high' || result.risk_level === 'critical' ? 'text-destructive' : 'text-success'}>
                                                {result.risk_score}
                                            </span>
                                            <span className="text-sm text-muted-foreground font-normal">/ 100 Risk Score</span>
                                        </h3>
                                        <div className="mt-2 text-sm">
                                            Status: <strong className="uppercase">{result.risk_level}</strong> Risk
                                        </div>
                                    </div>

                                    {result.risk_level === 'high' || result.risk_level === 'critical' ? (
                                        <div className="p-4 rounded-full bg-destructive/10">
                                            <AlertTriangle className="w-10 h-10 text-destructive" />
                                        </div>
                                    ) : (
                                        <div className="p-4 rounded-full bg-success/10">
                                            <CheckCircle className="w-10 h-10 text-success" />
                                        </div>
                                    )}
                                </div>

                                <div className="space-y-4">
                                    <h4 className="font-semibold text-sm text-muted-foreground">Detection Flags</h4>
                                    <div className="grid grid-cols-2 gap-3 mt-2">
                                        <div className={`p-3 rounded-lg border flex flex-col gap-1 ${result.flags.ghost_billing ? 'bg-destructive/5 border-destructive/20 text-destructive' : 'bg-success/5 border-success/20 text-success'}`}>
                                            <span className="text-xs font-semibold">Ghost Billing</span>
                                            <span className="text-lg">{result.flags.ghost_billing ? 'Detected' : 'Clear'}</span>
                                        </div>

                                        <div className={`p-3 rounded-lg border flex flex-col gap-1 ${result.flags.upcoding ? 'bg-destructive/5 border-destructive/20 text-destructive' : 'bg-success/5 border-success/20 text-success'}`}>
                                            <span className="text-xs font-semibold">Upcoding</span>
                                            <span className="text-lg">{result.flags.upcoding ? 'Detected' : 'Clear'}</span>
                                        </div>

                                        <div className={`p-3 rounded-lg border flex flex-col gap-1 ${result.flags.duplicate ? 'bg-destructive/5 border-destructive/20 text-destructive' : 'bg-success/5 border-success/20 text-success'}`}>
                                            <span className="text-xs font-semibold">Duplication</span>
                                            <span className="text-lg">{result.flags.duplicate ? 'Detected' : 'Clear'}</span>
                                        </div>

                                        <div className={`p-3 rounded-lg border flex flex-col gap-1 ${result.flags.anomaly ? 'bg-warning/5 border-warning/20 text-warning' : 'bg-success/5 border-success/20 text-success'}`}>
                                            <span className="text-xs font-semibold">Price Anomaly</span>
                                            <span className="text-lg">{result.flags.anomaly ? 'Detected' : 'Clear'}</span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ManualCheck;
