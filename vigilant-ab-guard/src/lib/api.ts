import { useState, useEffect } from 'react';
import type { Claim, HospitalStats } from '../data/mockClaims'; // Exporting types only now

const API_BASE_URL = 'http://localhost:8000/api';

export function useFraudData() {
  const [claims, setClaims] = useState<Claim[]>([]);
  const [stats, setStats] = useState<{ kpis: any; hospitals: HospitalStats[] } | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchData() {
      try {
        setLoading(true);
        // Fetch Claims
        const claimsRes = await fetch(`${API_BASE_URL}/claims`);
        if (!claimsRes.ok) throw new Error('Failed to fetch claims');
        const claimsData = await claimsRes.json();

        // Ensure no error properties
        if (claimsData.error) throw new Error(claimsData.error);

        setClaims(claimsData);

        // Fetch Stats
        const statsRes = await fetch(`${API_BASE_URL}/stats`);
        if (!statsRes.ok) throw new Error('Failed to fetch stats');
        const statsData = await statsRes.json();

        if (statsData.error) throw new Error(statsData.error);

        setStats(statsData);
      } catch (err: any) {
        setError(err.message || 'An error occurred fetching data.');
      } finally {
        setLoading(false);
      }
    }

    fetchData();
  }, []);

  return { claims, stats, loading, error };
}

export function useBeneficiaries() {
  const [beneficiaries, setBeneficiaries] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchBens() {
      try {
        setLoading(true);
        const res = await fetch(`${API_BASE_URL}/beneficiaries`);
        if (!res.ok) throw new Error('Failed to fetch beneficiaries');
        const data = await res.json();
        if (data.error) throw new Error(data.error);
        setBeneficiaries(data);
      } catch (err: any) {
        setError(err.message || 'An error occurred fetching beneficiaries.');
      } finally {
        setLoading(false);
      }
    }
    fetchBens();
  }, []);

  return { beneficiaries, loading, error };
}

export async function submitManualClaim(claimData: any) {
  const res = await fetch(`${API_BASE_URL}/analyze_claim`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(claimData)
  });

  if (!res.ok) {
    throw new Error('Failed to analyze claim');
  }

  const data = await res.json();
  if (data.error) throw new Error(data.error);
  return data;
}

export async function fetchHospitalsAndProcedures() {
  const res = await fetch(`${API_BASE_URL}/hospitals_procedures`);
  if (!res.ok) throw new Error('Failed to fetch hospital maps');
  return res.json();
}

export async function fetchBeneficiaryDetails(abId: string) {
  const res = await fetch(`${API_BASE_URL}/beneficiary/${abId}`);
  if (!res.ok) throw new Error('Failed to fetch beneficiary details');
  const data = await res.json();
  if (data.error) throw new Error(data.error);
  return data;
}

export async function submitFraudReport(reportData: { claim_id: string; beneficiary_id: string; report_text: string }) {
  const res = await fetch(`${API_BASE_URL}/report_fraud`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(reportData)
  });
  if (!res.ok) throw new Error('Failed to submit fraud report');
  const data = await res.json();
  if (data.error) throw new Error(data.error);
  return data;
}

export async function getFraudReports() {
  const res = await fetch(`${API_BASE_URL}/reports`);
  if (!res.ok) throw new Error('Failed to fetch fraud reports');
  const data = await res.json();
  if (data.error) throw new Error(data.error);
  return data;
}
