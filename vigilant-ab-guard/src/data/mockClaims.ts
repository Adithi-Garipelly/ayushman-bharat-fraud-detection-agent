export type FraudType = 'upcoding' | 'ghost_billing' | 'duplicate' | 'phantom_patient' | 'unbundling' | 'clean';

export type RiskLevel = 'critical' | 'high' | 'medium' | 'low';

export interface Claim {
  id: string;
  hospitalId: string;
  hospitalName: string;
  patientId: string;
  patientName: string;
  procedureCode: string;
  procedureName: string;
  claimAmount: number;
  expectedAmount: number;
  dateSubmitted: string;
  state: string;
  district: string;
  riskScore: number;
  riskLevel: RiskLevel;
  fraudType: FraudType;
  flagged: boolean;
  status: 'pending' | 'approved' | 'rejected' | 'under_review';
}

export interface HospitalStats {
  hospitalId: string;
  hospitalName: string;
  totalClaims: number;
  flaggedClaims: number;
  totalAmount: number;
  avgRiskScore: number;
  riskLevel: RiskLevel;
  state: string;
}

const hospitals = [
  { id: 'H001', name: 'Shri Ram Hospital', state: 'Uttar Pradesh', district: 'Lucknow' },
  { id: 'H002', name: 'Lifeline Multispecialty', state: 'Maharashtra', district: 'Pune' },
  { id: 'H003', name: 'Apex Care Hospital', state: 'Rajasthan', district: 'Jaipur' },
  { id: 'H004', name: 'Sunrise Medical Centre', state: 'Bihar', district: 'Patna' },
  { id: 'H005', name: 'Green Valley Hospital', state: 'Madhya Pradesh', district: 'Bhopal' },
  { id: 'H006', name: 'Metro Health Hub', state: 'Gujarat', district: 'Ahmedabad' },
  { id: 'H007', name: 'Sanjivani Hospital', state: 'Karnataka', district: 'Bengaluru' },
  { id: 'H008', name: 'Prime Care Clinic', state: 'Tamil Nadu', district: 'Chennai' },
  { id: 'H009', name: 'Navjeevan Hospital', state: 'Uttar Pradesh', district: 'Varanasi' },
  { id: 'H010', name: 'Arogya Wellness Centre', state: 'West Bengal', district: 'Kolkata' },
];

const procedures = [
  { code: 'P001', name: 'Knee Replacement', expected: 140000 },
  { code: 'P002', name: 'Cardiac Bypass Surgery', expected: 250000 },
  { code: 'P003', name: 'Cataract Surgery', expected: 30000 },
  { code: 'P004', name: 'Appendectomy', expected: 45000 },
  { code: 'P005', name: 'Dialysis Session', expected: 12000 },
  { code: 'P006', name: 'Cesarean Section', expected: 60000 },
  { code: 'P007', name: 'Angioplasty', expected: 180000 },
  { code: 'P008', name: 'Hip Replacement', expected: 160000 },
  { code: 'P009', name: 'Chemotherapy Cycle', expected: 75000 },
  { code: 'P010', name: 'Hernia Repair', expected: 35000 },
];

const patientNames = [
  'Rajesh Kumar', 'Sunita Devi', 'Mohammad Iqbal', 'Priya Sharma', 'Amit Patel',
  'Lakshmi Rao', 'Deepak Singh', 'Meena Kumari', 'Suresh Yadav', 'Fatima Begum',
  'Arjun Reddy', 'Kavita Mishra', 'Ramesh Gupta', 'Anita Joshi', 'Vikram Chauhan',
  'Sonia Gandhi', 'Manoj Tiwari', 'Rekha Verma', 'Ashok Nair', 'Pooja Mehta',
];

function getRiskLevel(score: number): RiskLevel {
  if (score >= 85) return 'critical';
  if (score >= 65) return 'high';
  if (score >= 40) return 'medium';
  return 'low';
}

function generateClaim(index: number): Claim {
  const hospital = hospitals[index % hospitals.length];
  const procedure = procedures[index % procedures.length];
  const patient = patientNames[index % patientNames.length];
  
  const fraudRoll = Math.random();
  let fraudType: FraudType = 'clean';
  let amountMultiplier = 1;
  let riskScore = Math.floor(Math.random() * 30) + 5;

  if (fraudRoll > 0.6) {
    if (fraudRoll > 0.9) {
      fraudType = 'ghost_billing';
      amountMultiplier = 1;
      riskScore = Math.floor(Math.random() * 20) + 80;
    } else if (fraudRoll > 0.8) {
      fraudType = 'upcoding';
      amountMultiplier = 1.5 + Math.random() * 1.5;
      riskScore = Math.floor(Math.random() * 25) + 65;
    } else if (fraudRoll > 0.75) {
      fraudType = 'duplicate';
      amountMultiplier = 1;
      riskScore = Math.floor(Math.random() * 20) + 70;
    } else if (fraudRoll > 0.7) {
      fraudType = 'phantom_patient';
      amountMultiplier = 1;
      riskScore = Math.floor(Math.random() * 15) + 85;
    } else {
      fraudType = 'unbundling';
      amountMultiplier = 0.6;
      riskScore = Math.floor(Math.random() * 25) + 50;
    }
  }

  const claimAmount = Math.round(procedure.expected * amountMultiplier);
  const flagged = riskScore >= 50;
  const day = (index % 28) + 1;
  const month = ((index % 6) + 7);

  const statusRoll = Math.random();
  let status: Claim['status'] = 'approved';
  if (flagged) {
    status = statusRoll > 0.5 ? 'under_review' : statusRoll > 0.2 ? 'pending' : 'rejected';
  }

  return {
    id: `CLM-${String(index + 1).padStart(5, '0')}`,
    hospitalId: hospital.id,
    hospitalName: hospital.name,
    patientId: `PAT-${String((index * 7 + 3) % 500 + 100).padStart(5, '0')}`,
    patientName: patient,
    procedureCode: procedure.code,
    procedureName: procedure.name,
    claimAmount,
    expectedAmount: procedure.expected,
    dateSubmitted: `2025-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`,
    state: hospital.state,
    district: hospital.district,
    riskScore,
    riskLevel: getRiskLevel(riskScore),
    fraudType,
    flagged,
    status,
  };
}

export const mockClaims: Claim[] = Array.from({ length: 150 }, (_, i) => generateClaim(i));

export const hospitalStats: HospitalStats[] = hospitals.map(h => {
  const claims = mockClaims.filter(c => c.hospitalId === h.id);
  const flagged = claims.filter(c => c.flagged);
  const avgRisk = claims.reduce((s, c) => s + c.riskScore, 0) / (claims.length || 1);
  return {
    hospitalId: h.id,
    hospitalName: h.name,
    totalClaims: claims.length,
    flaggedClaims: flagged.length,
    totalAmount: claims.reduce((s, c) => s + c.claimAmount, 0),
    avgRiskScore: Math.round(avgRisk),
    riskLevel: getRiskLevel(avgRisk),
    state: h.state,
  };
});

export const monthlyFraudData = [
  { month: 'Jul', total: 180, flagged: 28, amount: 4200000 },
  { month: 'Aug', total: 210, flagged: 35, amount: 5100000 },
  { month: 'Sep', total: 195, flagged: 42, amount: 4800000 },
  { month: 'Oct', total: 240, flagged: 55, amount: 6200000 },
  { month: 'Nov', total: 225, flagged: 48, amount: 5700000 },
  { month: 'Dec', total: 260, flagged: 62, amount: 7100000 },
];

export const fraudTypeDistribution = [
  { type: 'Upcoding', count: 38, percentage: 32 },
  { type: 'Ghost Billing', count: 22, percentage: 18 },
  { type: 'Duplicate Claims', count: 18, percentage: 15 },
  { type: 'Phantom Patients', count: 15, percentage: 13 },
  { type: 'Unbundling', count: 26, percentage: 22 },
];

export const stateWiseFraud = [
  { state: 'Uttar Pradesh', claims: 420, flagged: 85, amount: 12500000 },
  { state: 'Maharashtra', claims: 380, flagged: 52, amount: 9800000 },
  { state: 'Bihar', claims: 290, flagged: 78, amount: 7200000 },
  { state: 'Rajasthan', claims: 310, flagged: 45, amount: 8100000 },
  { state: 'Madhya Pradesh', claims: 260, flagged: 38, amount: 6500000 },
  { state: 'Gujarat', claims: 340, flagged: 32, amount: 8900000 },
  { state: 'Karnataka', claims: 320, flagged: 28, amount: 7800000 },
  { state: 'Tamil Nadu', claims: 350, flagged: 25, amount: 9200000 },
];
