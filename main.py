import pandas as pd
import numpy as np
import uvicorn
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Dict, Any

# Import from existing Python logic
# Import from existing Python logic
from data_generator import generate_beneficiaries, generate_claims, HOSPITALS, valid_mapping
from fraud_detection import analyze_claims, HealthcareFraudDetector
from database import create_database

app = FastAPI(title="Ayushman Bharat Fraud Detection API")

# Add CORS middleware to allow React frontend (Vite default port 5173) to communicate
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://localhost:3000", "http://localhost:8080", "http://127.0.0.1:8080"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Global variables to store our generated and analyzed data in memory
# Global variables to store our generated and analyzed data in memory
BENEFICIARIES_DF = None
CLAIMS_DF = None
ANALYZED_CLAIMS_DF = None
WHISTLEBLOWER_REPORTS = []

# Pydantic model for manual claim entry
class ManualClaim(BaseModel):
    hospital_id: str
    beneficiary_id: str
    diagnosis_code: str
    procedure_code: str
    claim_amount: float
    claim_date: str

class FraudReport(BaseModel):
    claim_id: str
    beneficiary_id: str
    report_text: str

def initialize_data():
    """Generate synthetic data and run fraud detection analysis on startup."""
    global BENEFICIARIES_DF, CLAIMS_DF, ANALYZED_CLAIMS_DF
    print("Generating synthetic data...")
    BENEFICIARIES_DF = generate_beneficiaries()
    CLAIMS_DF = generate_claims(BENEFICIARIES_DF)
    print(f"Generated {len(BENEFICIARIES_DF)} beneficiaries and {len(CLAIMS_DF)} claims.")
    
    # Run analysis
    print("Running fraud detection analysis...")
    ANALYZED_CLAIMS_DF = analyze_claims(CLAIMS_DF, BENEFICIARIES_DF)
    print("Analysis complete.")

@app.on_event("startup")
async def startup_event():
    initialize_data()

# Helper function to assign risk levels
def get_risk_level(score: float) -> str:
    """Map numeric risk score to critical/high/medium/low categories based on latest framework."""
    if score >= 80:
        return 'critical'
    elif score >= 60:
        return 'high'
    elif score >= 30:
        return 'medium'
    return 'low'

def get_status_from_score(score: float, fraud_type: str) -> str:
    if score >= 80:
        return 'rejected'
    elif score >= 60:
        return 'under_review'
    elif score >= 30:
        return 'pending'
    return 'approved'

# Helper function to map python fraud flags to UI fraud type strings
def determine_fraud_type(row) -> str:
    if row.get('ghost_flag') == 1:
        return 'ghost_billing'
    elif row.get('upcoding_flag') == 1:
        return 'upcoding'
    elif row.get('cross_hospital_flag') == 1:
        # Cross hospital logic handles duplicates
        return 'duplicate'
    elif row.get('anomaly_flag') == 1:
        # Unbundling represents anomalies not caught by specific logic in UI mock data context
        return 'unbundling' 
    return 'clean'

@app.get("/api/claims")
async def get_claims():
    """Return all claims formatted for the React ClaimsTable."""
    if ANALYZED_CLAIMS_DF is None or BENEFICIARIES_DF is None:
        return {"error": "Data not initialized"}
        
    df = ANALYZED_CLAIMS_DF.copy()
    
    # Merge with beneficiaries to get names
    df = df.merge(BENEFICIARIES_DF[['beneficiary_id', 'name', 'district']], on='beneficiary_id', how='left')
    
    # Rename columns to match what UI expects
    df = df.rename(columns={
        'claim_id': 'id',
        'hospital_id': 'hospitalId',
        'beneficiary_id': 'patientId',
        'name': 'patientName',
        'procedure_code': 'procedureCode',
        'claim_amount': 'claimAmount',
        'claim_date': 'dateSubmitted',
        'risk_score': 'riskScore'
    })
    
    # We need matching hospitals and procedures as expected by the UI
    # In a real app we'd map via database, here we synthesize missing UI fields
    hospitals_map = {
        'H01': 'Shri Ram Hospital', 'H02': 'Lifeline Multispecialty', 
        'H03': 'Apex Care Hospital', 'H04': 'Sunrise Medical Centre',
        'H05': 'Green Valley Hospital', 'H06': 'Metro Health Hub', 
        'H07': 'Sanjivani Hospital', 'H08': 'Prime Care Clinic',
        'H09': 'Max Super Speciality', 'H10': 'Narayana Health'
    }
    
    # We dynamically map states from HOSPITALS in data_generator
    hospital_state_map = {h['id']: h['state'] for h in HOSPITALS}

    # Map fields
    df['hospitalName'] = df['hospitalId'].map(lambda x: hospitals_map.get(x, 'Unknown Hospital'))
    df['state'] = df['hospitalId'].map(lambda x: hospital_state_map.get(x, 'Unknown State'))
    
    # We apply risk function to map RiskScore to RiskLevel string ('critical', 'high', 'medium', 'low')
    df['riskLevel'] = df['riskScore'].apply(get_risk_level)
    df['fraudType'] = df.apply(determine_fraud_type, axis=1)
    
    # Apply matching status logically based on exact score logic
    df['status'] = [get_status_from_score(score, ftype) for score, ftype in zip(df['riskScore'], df['fraudType'])]
    
    # Calculate intelligent median expectedAmount per procedure
    median_prices = df.groupby('procedureCode')['claimAmount'].median().to_dict()
    df['expectedAmount'] = df.apply(lambda row: median_prices.get(row['procedureCode'], row['claimAmount'] * 0.8), axis=1)
    df['procedureName'] = df['procedureCode']  # We lack procedure names dict
    
    # Convert dates to ISO format explicitly if needed, but it's string in generated data
    # Fill NaN values to avoid JSON serialization errors
    df = df.fillna({
        'district': 'Unknown',
        'state': 'Unknown',
        'patientName': 'Unknown Patient'
    })
    
    # Convert to dict and send
    claims_list = df.to_dict(orient='records')
    return claims_list

@app.get("/api/stats")
async def get_stats():
    """Return aggregated KPIs and hospital-level statistics."""
    if ANALYZED_CLAIMS_DF is None:
         return {"error": "Data not initialized"}
    
    df = ANALYZED_CLAIMS_DF.copy()
    
    # Overall KPIs
    total_claims = len(df)
    flagged_df = df[df['risk_score'] >= 50]
    total_flagged = len(flagged_df)
    total_amount = df['claim_amount'].sum()
    avg_risk = df['risk_score'].mean()
    
    # Hospital Stats
    hospital_stats = df.groupby('hospital_id').agg(
        totalClaims=('id', 'count') if 'id' in df.columns else ('claim_id', 'count'),
        totalAmount=('claim_amount', 'sum'),
        avgRiskScore=('risk_score', 'mean')
    ).reset_index()
    
    # Compute flagged per hospital
    flagged_counts = flagged_df.groupby('hospital_id').size().reset_index(name='flaggedClaims')
    hospital_stats = hospital_stats.merge(flagged_counts, on='hospital_id', how='left').fillna(0)
    
    # Map names
    hospitals_map = {
        'H01': 'Shri Ram Hospital', 'H02': 'Lifeline Multispecialty', 
        'H03': 'Apex Care Hospital', 'H04': 'Sunrise Medical Centre',
        'H05': 'Green Valley Hospital', 'H06': 'Metro Health Hub', 
        'H07': 'Sanjivani Hospital', 'H08': 'Prime Care Clinic',
        'H09': 'Max Super Speciality', 'H10': 'Narayana Health'
    }
    hospital_state_map = {h['id']: h['state'] for h in HOSPITALS}
    
    hospital_stats['hospitalName'] = hospital_stats['hospital_id'].map(lambda x: hospitals_map.get(x, 'Unknown Hospital'))
    hospital_stats['riskLevel'] = hospital_stats['avgRiskScore'].apply(get_risk_level)
    hospital_stats['hospitalId'] = hospital_stats['hospital_id']
    hospital_stats['state'] = hospital_stats['hospital_id'].map(lambda x: hospital_state_map.get(x, 'Unknown State'))
    
    return {
        "kpis": {
            "totalClaims": total_claims,
            "flaggedClaims": total_flagged,
            "totalAmount": round(total_amount, 2),
            "avgRiskScore": round(avg_risk, 2)
        },
        "hospitals": hospital_stats.to_dict(orient='records')
    }

@app.get("/api/beneficiaries")
async def get_beneficiaries():
    """Return the list of beneficiaries."""
    if BENEFICIARIES_DF is None:
        return {"error": "Data not initialized"}
    
    # Needs matching to hospital name instead of just ID
    df = BENEFICIARIES_DF.copy()
    hospital_mapping = {h['id']: h['name'] for h in HOSPITALS}
    df['primary_hospital_name'] = df['primary_hospital'].map(lambda x: hospital_mapping.get(x, x))
    
    return df.to_dict(orient='records')

@app.get("/api/beneficiary/{ab_id}")
async def get_beneficiary_details(ab_id: str):
    """Fetch details and claims history for a single PM-JAY beneficiary."""
    if BENEFICIARIES_DF is None or ANALYZED_CLAIMS_DF is None:
        return {"error": "Data not initialized"}
        
    b_df = BENEFICIARIES_DF[BENEFICIARIES_DF['beneficiary_id'] == ab_id]
    if b_df.empty:
        return {"error": "Beneficiary not found"}
        
    # Get basic info + wallet balance
    b_info = b_df.iloc[0].to_dict()
    
    hospital_mapping = {h['id']: h['name'] for h in HOSPITALS}
    b_info['primary_hospital_name'] = hospital_mapping.get(b_info.get('primary_hospital'), b_info.get('primary_hospital'))
    
    # Get claim history involving this beneficiary
    c_df = ANALYZED_CLAIMS_DF[ANALYZED_CLAIMS_DF['beneficiary_id'] == ab_id].copy()
    
    if not c_df.empty:
        c_df['hospital_name'] = c_df['hospital_id'].map(lambda x: hospital_mapping.get(x, x))
        c_df['fraud_type'] = c_df.apply(determine_fraud_type, axis=1)
        c_df['riskLevel'] = c_df['risk_score'].apply(get_risk_level)
        c_df['status'] = c_df.apply(lambda row: get_status_from_score(row['risk_score'], row['fraud_type']), axis=1)
    
    claims = c_df.to_dict(orient='records') if not c_df.empty else []
    
    return {
        "beneficiary": b_info,
        "claims": claims
    }

@app.post("/api/report_fraud")
async def report_fraud(report: FraudReport):
    """Accept whistleblower fraud report from a patient against a hospital."""
    report_dict = report.dict()
    report_dict['timestamp'] = pd.Timestamp.now().isoformat()
    # We will simulate marking this claim as Critical Risk in the dashboard automatically 
    # if it exists, but for the MVP we just push it to the queue.
    WHISTLEBLOWER_REPORTS.append(report_dict)
    return {"status": "success", "message": "Report logged securely. Dashboard notified."}

@app.get("/api/reports")
async def get_reports():
    """Admin endpoint to see whistleblower flags."""
    return WHISTLEBLOWER_REPORTS

@app.post("/api/analyze_claim")
async def analyze_manual_claim(claim: ManualClaim):
    """Run real-time fraud analysis on a single submitted claim."""
    if BENEFICIARIES_DF is None:
        return {"error": "System not initialized"}

    # Convert single claim to DataFrame
    claim_dict = claim.dict()
    claim_dict['claim_id'] = f"MANUAL_{np.random.randint(10000, 99999)}"
    
    # We must format date string to what pandas/detector expects
    single_claim_df = pd.DataFrame([claim_dict])
    
    detector = HealthcareFraudDetector()
    try:
        enriched_df = detector.detect_ghost_claims(single_claim_df, BENEFICIARIES_DF)
        enriched_df = detector.detect_cross_hospital(enriched_df)
        enriched_df = detector.detect_upcoding(enriched_df)
        
        # We skip isolation forest anomaly detection for a single claim 
        # (needs historical data to compare against hospital_avg), 
        # but we can set defaults if missing so risk scoring works.
        if 'anomaly_flag' not in enriched_df.columns:
            enriched_df['anomaly_flag'] = 0
            
        from risk_scoring import compute_risk_score
        final_df = compute_risk_score(enriched_df)
        
        row = final_df.iloc[0]
        
        return {
            "status": "success",
            "claim_id": row['claim_id'],
            "risk_score": float(row['risk_score']),
            "risk_level": get_risk_level(float(row['risk_score'])),
            "fraud_type": determine_fraud_type(row),
            "flags": {
                "ghost_billing": bool(row.get('ghost_flag', 0)),
                "upcoding": bool(row.get('upcoding_flag', 0)),
                "duplicate": bool(row.get('cross_hospital_flag', 0)),
                "anomaly": bool(row.get('anomaly_flag', 0))
            }
        }
        
    except Exception as e:
        return {"error": str(e)}

@app.get("/api/hospitals_procedures")
async def get_hospitals_procedures():
    """Return hospital list and valid mapping for dropdowns."""
    return {
        "hospitals": HOSPITALS,
        "valid_mapping": valid_mapping
    }

if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8000)
