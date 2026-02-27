import { useBeneficiaries } from '@/lib/api';
import DashboardHeader from '@/components/DashboardHeader';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

const Beneficiaries = () => {
    const { beneficiaries, loading, error } = useBeneficiaries();

    if (loading) {
        return <div className="p-8 text-center text-muted-foreground animate-pulse">Loading beneficiaries...</div>;
    }

    if (error) {
        return <div className="p-8 text-center text-destructive">Error loading beneficiaries: {error}</div>;
    }

    return (
        <div className="min-h-screen bg-background p-4 lg:p-6">
            <div className="max-w-[1400px] mx-auto">
                <DashboardHeader />

                <div className="mt-6 glass-card p-6">
                    <div className="flex items-center justify-between mb-6">
                        <div>
                            <h2 className="text-xl font-bold font-display">Enrolled Beneficiaries</h2>
                            <p className="text-sm text-muted-foreground">List of Ayushman Bharat card holders ({beneficiaries.length} total)</p>
                        </div>
                    </div>

                    <div className="rounded-md border border-border/50 bg-background/50 overflow-hidden">
                        <Table>
                            <TableHeader>
                                <TableRow className="border-border/50 hover:bg-transparent">
                                    <TableHead className="w-[120px]">AB ID</TableHead>
                                    <TableHead>Patient Name</TableHead>
                                    <TableHead>Age</TableHead>
                                    <TableHead>Gender</TableHead>
                                    <TableHead>State</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {beneficiaries.map((b) => (
                                    <TableRow key={b.beneficiary_id} className="border-border/50 hover:bg-muted/30">
                                        <TableCell className="font-medium font-mono text-xs">{b.beneficiary_id}</TableCell>
                                        <TableCell>{b.name}</TableCell>
                                        <TableCell>{b.age}</TableCell>
                                        <TableCell>{b.gender}</TableCell>
                                        <TableCell>{b.state}</TableCell>
                                    </TableRow>
                                ))}
                                {beneficiaries.length === 0 && (
                                    <TableRow>
                                        <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                                            No beneficiaries found.
                                        </TableCell>
                                    </TableRow>
                                )}
                            </TableBody>
                        </Table>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Beneficiaries;
