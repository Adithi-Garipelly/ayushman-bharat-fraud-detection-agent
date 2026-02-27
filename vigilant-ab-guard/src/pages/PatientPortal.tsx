import { useState } from 'react';
import { fetchBeneficiaryDetails } from '@/lib/api';
import DashboardHeader from '@/components/DashboardHeader';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Search, Wallet, ShieldAlert, FileText, Download, User } from 'lucide-react';
import ReportFraudModal from '@/components/ReportFraudModal';

export default function PatientPortal() {
    const [abId, setAbId] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [data, setData] = useState<{ beneficiary: any; claims: any[] } | null>(null);
    const [reportingClaim, setReportingClaim] = useState<any | null>(null);

    const handleSearch = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!abId.trim()) return;

        try {
            setLoading(true);
            setError(null);
            const result = await fetchBeneficiaryDetails(abId.trim().toUpperCase());
            setData(result);
        } catch (err: any) {
            setError(err.message || 'Could not find details for this AB ID');
            setData(null);
        } finally {
            setLoading(false);
        }
    };

    const formatCurrency = (amount: number) => {
        return new Intl.NumberFormat('en-IN', {
            style: 'currency',
            currency: 'INR',
            maximumFractionDigits: 0
        }).format(amount);
    };

    const renderWalletCard = () => {
        if (!data) return null;
        const b = data.beneficiary;
        const maxLimit = 500000;
        const balance = b.wallet_balance;
        const used = maxLimit - balance;
        const percentUsed = (used / maxLimit) * 100;

        return (
            <div className="glass-card p-6 mb-8 mt-6">
                <div className="flex justify-between items-start mb-6">
                    <div>
                        <h2 className="text-2xl font-bold font-display text-white">{b.name}</h2>
                        <p className="text-muted-foreground font-mono">{b.beneficiary_id} • {b.gender} • {b.age} yrs • {b.state}</p>
                    </div>
                </div>

                <div className="bg-background/40 border border-border/50 rounded-xl p-6">
                    <div className="flex justify-between items-end mb-4">
                        <div>
                            <div className="flex items-center gap-2 mb-1">
                                <Wallet className="w-5 h-5 text-primary" />
                                <h3 className="font-medium text-muted-foreground">Family Wallet Used</h3>
                            </div>
                            <p className="text-3xl font-bold text-white">{formatCurrency(used)}</p>
                        </div>
                        <div className="text-right">
                            <p className="text-sm text-muted-foreground mb-1">Available Balance</p>
                            <p className="text-xl font-semibold text-primary">{formatCurrency(balance)}</p>
                        </div>
                    </div>

                    {/* Progress Bar */}
                    <div className="w-full bg-muted/50 rounded-full h-3 mb-2 overflow-hidden border border-border/50">
                        <div
                            className={`h-full rounded-full ${percentUsed > 80 ? 'bg-destructive' : percentUsed > 50 ? 'bg-orange-500' : 'bg-primary'}`}
                            style={{ width: `${Math.min(percentUsed, 100)}%` }}
                        ></div>
                    </div>
                    <div className="flex justify-between text-xs text-muted-foreground font-mono">
                        <span>₹0</span>
                        <span>{formatCurrency(maxLimit)} Limit</span>
                    </div>
                </div>
            </div>
        );
    };

    return (
        <div className="min-h-screen bg-background p-4 lg:p-6 pb-24">
            <div className="max-w-[1400px] mx-auto">
                <DashboardHeader />

                {/* Hero Search Section */}
                {!data && (
                    <div className="mt-20 max-w-2xl mx-auto text-center">
                        <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-6 border border-primary/20">
                            <ShieldAlert className="w-8 h-8 text-primary" />
                        </div>
                        <h1 className="text-4xl font-bold font-display mb-4 tracking-tight">Protect Your Entitlement</h1>
                        <p className="text-muted-foreground mb-8 text-lg max-w-xl mx-auto">
                            Enter your Ayushman Bharat ID to view your ₹5 Lakh family wallet balance, track claims, and report hospital fraud.
                        </p>

                        <form onSubmit={handleSearch} className="flex gap-3 max-w-md mx-auto">
                            <div className="relative flex-1">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                                <input
                                    type="text"
                                    placeholder="Enter AB ID (e.g., AB0001)"
                                    className="w-full bg-card/50 border border-border rounded-lg pl-10 pr-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary backdrop-blur-xl transition-all"
                                    value={abId}
                                    onChange={(e) => setAbId(e.target.value)}
                                    maxLength={12}
                                />
                            </div>
                            <button
                                type="submit"
                                disabled={loading || !abId.trim()}
                                className="bg-primary text-primary-foreground px-6 font-medium rounded-lg hover:bg-primary/90 transition-all disabled:opacity-50"
                            >
                                {loading ? 'Tracing...' : 'View Portal'}
                            </button>
                        </form>

                        {error && (
                            <p className="mt-4 text-destructive font-medium bg-destructive/10 inline-block px-4 py-2 rounded-lg text-sm border border-destructive/20">
                                {error}
                            </p>
                        )}

                        <div className="mt-12 grid grid-cols-1 md:grid-cols-3 gap-6 text-left">
                            <div className="glass-card p-5">
                                <Wallet className="w-6 h-6 text-primary mb-3" />
                                <h3 className="font-semibold mb-2">Track Your Balance</h3>
                                <p className="text-sm text-muted-foreground">Monitor exactly how much of your ₹5,00,000 limit is remaining for emergencies.</p>
                            </div>
                            <div className="glass-card p-5">
                                <FileText className="w-6 h-6 text-primary mb-3" />
                                <h3 className="font-semibold mb-2">Verify Treatments</h3>
                                <p className="text-sm text-muted-foreground">Check the ledger of surgeries claimed under your ID to ensure they actually happened.</p>
                            </div>
                            <div className="glass-card p-5 border-destructive/30">
                                <ShieldAlert className="w-6 h-6 text-destructive mb-3" />
                                <h3 className="font-semibold mb-2">Report Fraud</h3>
                                <p className="text-sm text-muted-foreground">Confidentially report hospitals that upcoded bills or illegally demanded cash bribes.</p>
                            </div>
                        </div>
                    </div>
                )}

                {/* Dashboard View */}
                {data && (
                    <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
                        {renderWalletCard()}

                        <div className="glass-card p-6 border-destructive/20">
                            <div className="flex justify-between items-center mb-6">
                                <div>
                                    <h3 className="text-xl font-bold font-display flex items-center gap-2">
                                        <FileText className="w-5 h-5 text-primary" />
                                        Hospital Claims Ledger
                                    </h3>
                                    <p className="text-sm text-muted-foreground">Verify these claims. If you don't recognize one, report it immediately.</p>
                                </div>
                                <button
                                    onClick={() => setData(null)}
                                    className="text-sm text-muted-foreground hover:text-white transition-colors"
                                >
                                    Log out
                                </button>
                            </div>

                            <div className="rounded-md border border-border/50 bg-background/50 overflow-hidden">
                                <Table>
                                    <TableHeader>
                                        <TableRow className="border-border/50 hover:bg-transparent">
                                            <TableHead className="w-[100px]">Date</TableHead>
                                            <TableHead>Hospital</TableHead>
                                            <TableHead>Procedure</TableHead>
                                            <TableHead className="text-right">Amount Deducted</TableHead>
                                            <TableHead className="text-right">Action</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {data.claims.map((claim) => (
                                            <TableRow key={claim.claim_id} className="border-border/50 hover:bg-muted/30">
                                                <TableCell className="text-xs text-muted-foreground whitespace-nowrap">{claim.claim_date}</TableCell>
                                                <TableCell className="font-medium">{claim.hospital_name}</TableCell>
                                                <TableCell>
                                                    <span className="text-sm font-medium">{claim.procedure_code}</span>
                                                    <div className="text-xs text-muted-foreground mt-0.5">Diagnosed: {claim.diagnosis_code}</div>
                                                </TableCell>
                                                <TableCell className="text-right font-mono text-primary font-medium">
                                                    ₹{claim.claim_amount.toLocaleString('en-IN')}
                                                </TableCell>
                                                <TableCell className="text-right">
                                                    <button
                                                        onClick={() => setReportingClaim(claim)}
                                                        className="text-xs text-destructive hover:text-destructive-foreground hover:bg-destructive px-3 py-1.5 rounded-full border border-destructive transition-all flex items-center gap-1.5 ml-auto"
                                                    >
                                                        <ShieldAlert className="w-3.5 h-3.5" />
                                                        Report Fraud
                                                    </button>
                                                </TableCell>
                                            </TableRow>
                                        ))}
                                        {data.claims.length === 0 && (
                                            <TableRow>
                                                <TableCell colSpan={5} className="text-center py-12 text-muted-foreground">
                                                    No claims have been filed under your Ayushman Bharat card.
                                                </TableCell>
                                            </TableRow>
                                        )}
                                    </TableBody>
                                </Table>
                            </div>
                        </div>
                    </div>
                )}

                {reportingClaim && (
                    <ReportFraudModal
                        claim={reportingClaim}
                        onClose={() => setReportingClaim(null)}
                    />
                )}
            </div>
        </div>
    );
}
