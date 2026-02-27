# Data module initialized

import pandas as pd
import numpy as np
from faker import Faker
from datetime import datetime, timedelta
import random

# Reproducibility
random.seed(42)
np.random.seed(42)

fake = Faker('en_IN')

# Indian States with major cities
INDIAN_LOCATIONS = {
    'Maharashtra': ['Mumbai', 'Pune', 'Nagpur', 'Thane'],
    'Delhi': ['New Delhi', 'Delhi'],
    'Karnataka': ['Bangalore', 'Mysore'],
    'Tamil Nadu': ['Chennai', 'Coimbatore'],
    'West Bengal': ['Kolkata', 'Howrah'],
    'Telangana': ['Hyderabad', 'Warangal'],
    'Gujarat': ['Ahmedabad', 'Surat', 'Vadodara'],
    'Rajasthan': ['Jaipur', 'Jodhpur'],
    'Uttar Pradesh': ['Lucknow', 'Kanpur', 'Agra', 'Varanasi', 'Ghaziabad'],
    'Madhya Pradesh': ['Indore', 'Bhopal'],
    'Andhra Pradesh': ['Visakhapatnam', 'Vijayawada'],
    'Bihar': ['Patna', 'Gaya'],
    'Kerala': ['Kochi', 'Thiruvananthapuram'],
    'Punjab': ['Ludhiana', 'Amritsar'],
    'Haryana': ['Gurugram', 'Faridabad'],
    'Assam': ['Guwahati'],
    'Odisha': ['Bhubaneswar', 'Cuttack'],
    'Jharkhand': ['Ranchi', 'Jamshedpur'],
    'Chhattisgarh': ['Raipur'],
    'Uttarakhand': ['Dehradun']
}

HOSPITALS = [
    {'id': 'H01', 'name': 'Medicover Hospitals', 'district': 'Hyderabad', 'state': 'Telangana'},
    {'id': 'H02', 'name': 'CARE Hospitals (Banjara Hills)', 'district': 'Hyderabad', 'state': 'Telangana'},
    {'id': 'H03', 'name': 'Apollo Cancer Centre', 'district': 'Hyderabad', 'state': 'Telangana'},
    {'id': 'H04', 'name': 'Olive Hospital', 'district': 'Hyderabad', 'state': 'Telangana'},
    {'id': 'H05', 'name': 'Aster Prime Hospital', 'district': 'Hyderabad', 'state': 'Telangana'},
    {'id': 'H06', 'name': 'AIIMS', 'district': 'New Delhi', 'state': 'Delhi'},
    {'id': 'H07', 'name': 'NIMS Hospital', 'district': 'Hyderabad', 'state': 'Telangana'}, # injected fraud target
    {'id': 'H08', 'name': 'Tata Memorial Hospital', 'district': 'Mumbai', 'state': 'Maharashtra'},
    {'id': 'H09', 'name': 'Max Super Speciality', 'district': 'Lucknow', 'state': 'Uttar Pradesh'},
    {'id': 'H10', 'name': 'Narayana Health', 'district': 'Bangalore', 'state': 'Karnataka'},
]

# PM-JAY Authentic Diagnosis → Procedure mapping
# Key treatments covered: Cancer, Cardiology, Orthopedics, Nephrology, Neurosurgery
valid_mapping = {
    # Cardiology (Expected: High cost)
    "I21": ["Coronary Artery Bypass Grafting (CABG)", "PTCA (Angioplasty) with 1 Stent", "PTCA (Angioplasty) with 2 Stents"],
    "I50": ["Heart Valve Replacement", "Pacemaker Implantation (Single Chamber)"],
    
    # Oncology / Cancer Care (Expected: High/Medium cost per cycle)
    "C34": ["Chemotherapy (Tier 1)", "Radiation Therapy (LINAC)"],
    "C50": ["Radical Mastectomy", "Chemotherapy (Tier 2)"],
    "C61": ["Radical Prostatectomy", "Radiation Therapy (3DCRT)"],
    
    # Orthopedics (Expected: Medium/High cost)
    "M16": ["Total Hip Replacement (Unilateral)", "Total Knee Replacement (Unilateral)"],
    "M17": ["Total Knee Replacement (Bilateral)"],
    "M51": ["Spinal Fusion (Lumbar)", "Discectomy (Micro)"],
    
    # Nephrology / Urology (Expected: Low/Medium recurring)
    "N18": ["Maintenance Hemodialysis", "AV Fistula Creation"],
    "N20": ["PCNL (Kidney Stone Removal)", "URSL (Ureteroscopy)"],
    
    # Neurosurgery (Expected: High Cost)
    "I60": ["Craniotomy for Aneurysm Clipping", "Endovascular Coiling"],
    "C71": ["Brain Tumor Excision (Supratentorial)", "Brain Tumor Excision (Infratentorial)"],
    
    # Diagnostics & General (Expected: Low Cost)
    "R51": ["MRI Brain (Plain)", "CT Head (Plain)"],
    "E11": ["Diabetic Foot Ulcer Debridement", "Amputation (Below Knee)"],
    "A09": ["Gastroenteritis Admission (ICU)", "Gastroenteritis Admission (General Ward)"],
    "K35": ["Laparoscopic Appendectomy", "Open Appendectomy"]
}

# ==============================
# Generate Beneficiaries
# ==============================
def generate_beneficiaries(num_records=1200):
    """Generate 1200 synthetic beneficiaries with primary hospitals"""
    beneficiaries = []
    hospital_ids = [h['id'] for h in HOSPITALS]

    for i in range(1, num_records + 1):
        hospital = random.choice(HOSPITALS)
        beneficiary = {
            'beneficiary_id': f'AB{i:04d}',
            'name': fake.name(),
            'age': np.random.randint(1, 95),
            'gender': random.choice(['Male', 'Female']),
            'district': hospital['district'], 
            'state': hospital['state'],       
            'primary_hospital': hospital['id']
        }
        beneficiaries.append(beneficiary)

    return pd.DataFrame(beneficiaries)

def get_base_price_for_procedure(proc: str) -> float:
    """Helper to generate realistic PM-JAY pricing bounding to 5,00,000 max."""
    # Cardiology / Neurology / Ortho (High)
    if any(x in proc for x in ['CABG', 'Valve', 'Aneurysm', 'Craniotomy', 'TumorExcision']):
        return np.random.uniform(150000, 300000)
    elif any(x in proc for x in ['Angioplasty', 'Pacemaker', 'Hip Replacement', 'Knee Replacement', 'Spinal']):
        return np.random.uniform(80000, 150000)
    # Oncology (Medium)
    elif any(x in proc for x in ['Chemotherapy', 'Radiation', 'Mastectomy', 'Prostatectomy']):
        return np.random.uniform(20000, 70000)
    # General / Nephrology / Diagnostics (Low)
    elif any(x in proc for x in ['Hemodialysis', 'MRI', 'CT Head', 'Gastroenteritis']):
        return np.random.uniform(2000, 15000)
    # Catch-all
    else:
        return np.random.uniform(15000, 50000)

# ==============================
# Generate Claims with Fraud
# ==============================
def generate_claims(df_beneficiaries, num_claims=800):
    """Generate 800 synthetic hospital claims with fraud patterns"""
    claims = []
    hospital_ids = [h['id'] for h in HOSPITALS]

    end_date = datetime.now()
    start_date = end_date - timedelta(days=90)

    beneficiary_hospital_map = dict(
        zip(df_beneficiaries['beneficiary_id'],
            df_beneficiaries['primary_hospital'])
    )
    
    # We distribute 800 claims as:
    # 710 Regular, 30 Ghost Billing, 20 Cross-Hospital (10 pairs default generated + 10 pair duplicates), 40 Upcoding
    # Note: Cross hospital generates pairs, so allocating 10 loops = 20 claims
    REGULAR_COUNT = 710
    GHOST_COUNT = 30
    DUP_LOOPS = 10
    UPCODING_COUNT = 40
    
    # Initialize 5L wallet balance for all potential beneficiaries
    wallet_balances = {b_id: 500000.0 for b_id in df_beneficiaries['beneficiary_id'].tolist()}
    
    claim_id_counter = 1

    # ---------------------------------------
    # 1️⃣ Regular Claims (710)
    # ---------------------------------------
    for _ in range(REGULAR_COUNT):
        claim_date = fake.date_between(start_date=start_date, end_date=end_date)
        beneficiary_id = random.choice(df_beneficiaries['beneficiary_id'].tolist())
        hospital_id = beneficiary_hospital_map[beneficiary_id]

        diagnosis_code = random.choice(list(valid_mapping.keys()))
        procedure_code = random.choice(valid_mapping[diagnosis_code])

        base_amount = get_base_price_for_procedure(procedure_code)
        
        # Inject anomaly
        if hospital_id == 'H07':
            # Price Anomaly: H07 inflates claims (max PM-JAY is 5L, we push it high but cap at 4.99L to stay "under radar")
            claim_amount = round(min(base_amount * np.random.uniform(2.5, 4.0), 499999.00), 2)
        else:
            claim_amount = round(base_amount * np.random.uniform(0.9, 1.1), 2)

        # Enforce wallet limits (hospital can't claim what's not in the wallet)
        claim_amount = min(claim_amount, wallet_balances[beneficiary_id])
        if claim_amount <= 0:
            # Pick a tiny amount if they are tapped out, acting as a rejected attempt
            claim_amount = np.random.uniform(500, 1500)
        else:
            wallet_balances[beneficiary_id] -= claim_amount

        claim = {
            'claim_id': f'C{claim_id_counter:04d}',
            'hospital_id': hospital_id,
            'beneficiary_id': beneficiary_id,
            'diagnosis_code': diagnosis_code,
            'procedure_code': procedure_code,
            'claim_amount': claim_amount,
            'claim_date': claim_date.strftime('%Y-%m-%d'),
            'is_fraud_injected': 1 if hospital_id == 'H07' else 0
        }

        claims.append(claim)
        claim_id_counter += 1

    # ---------------------------------------
    # 2️⃣ Ghost Billing (30)
    # ---------------------------------------
    ghost_ids = [f'AB{i:04d}' for i in range(10001, 10001 + GHOST_COUNT)]

    for idx in range(GHOST_COUNT):
        claim_date = fake.date_between(start_date=start_date, end_date=end_date)
        diagnosis_code = random.choice(list(valid_mapping.keys()))
        procedure_code = random.choice(valid_mapping[diagnosis_code])

        # Ghost billing uses fake IDs, their wallet effectively starts at 5L theoretically for the ghost
        if ghost_ids[idx] not in wallet_balances:
            wallet_balances[ghost_ids[idx]] = 500000.0
            
        claim_amount = round(get_base_price_for_procedure(procedure_code) * np.random.uniform(0.9, 1.1), 2)
        claim_amount = min(claim_amount, wallet_balances[ghost_ids[idx]])
        wallet_balances[ghost_ids[idx]] -= claim_amount

        claim = {
            'claim_id': f'C{claim_id_counter:04d}',
            'hospital_id': random.choice(hospital_ids),
            'beneficiary_id': ghost_ids[idx],
            'diagnosis_code': diagnosis_code,
            'procedure_code': procedure_code,
            'claim_amount': claim_amount,
            'claim_date': claim_date.strftime('%Y-%m-%d'),
            'is_fraud_injected': 1
        }

        claims.append(claim)
        claim_id_counter += 1

    # ---------------------------------------
    # 3️⃣ Cross-Hospital Duplicate (20 claims total)
    # ---------------------------------------
    duplicate_beneficiaries = random.sample(
        df_beneficiaries['beneficiary_id'].tolist(), DUP_LOOPS
    )

    for beneficiary_id in duplicate_beneficiaries:
        base_date = fake.date_between(start_date=start_date, end_date=end_date - timedelta(days=7))
        primary_hospital = beneficiary_hospital_map[beneficiary_id]

        diagnosis_code = random.choice(list(valid_mapping.keys()))
        procedure_code = random.choice(valid_mapping[diagnosis_code])
        amount = round(get_base_price_for_procedure(procedure_code) * np.random.uniform(0.9, 1.1), 2)
        amount = min(amount, wallet_balances[beneficiary_id])
        wallet_balances[beneficiary_id] -= amount
        
        # First claim
        claim1 = {
            'claim_id': f'C{claim_id_counter:04d}',
            'hospital_id': primary_hospital,
            'beneficiary_id': beneficiary_id,
            'diagnosis_code': diagnosis_code,
            'procedure_code': procedure_code,
            'claim_amount': amount,
            'claim_date': base_date.strftime('%Y-%m-%d'),
            'is_fraud_injected': 1
        }
        claims.append(claim1)
        claim_id_counter += 1

        # Second claim in different hospital
        fraud_hospital = random.choice([h for h in hospital_ids if h != primary_hospital])
        second_date = base_date + timedelta(days=random.randint(1, 7))

        # Second claim will try to pull from wallet again. If wallet empty, it tries anyway (fraud)
        amount2 = min(amount, wallet_balances[beneficiary_id]) if wallet_balances[beneficiary_id] > 0 else amount
        wallet_balances[beneficiary_id] -= amount2 # allow negative for fraud indication

        claim2 = {
            'claim_id': f'C{claim_id_counter:04d}',
            'hospital_id': fraud_hospital,
            'beneficiary_id': beneficiary_id,
            'diagnosis_code': diagnosis_code,
            'procedure_code': procedure_code,
            'claim_amount': amount2,
            'claim_date': second_date.strftime('%Y-%m-%d'),
            'is_fraud_injected': 1
        }
        claims.append(claim2)
        claim_id_counter += 1

    # ---------------------------------------
    # 4️⃣ Upcoding (40)
    # ---------------------------------------
    for _ in range(UPCODING_COUNT):
        claim_date = fake.date_between(start_date=start_date, end_date=end_date)
        beneficiary_id = random.choice(df_beneficiaries['beneficiary_id'].tolist())
        hospital_id = beneficiary_hospital_map[beneficiary_id]

        claim = {
            'claim_id': f'C{claim_id_counter:04d}',
            'hospital_id': hospital_id,
            'beneficiary_id': beneficiary_id,
            'diagnosis_code': 'R51', # Diagnostic Code for MRI / CT
            'procedure_code': 'CABG', # Blatant Upcoding: They bill CABG for a simple Headache/MRI scan
            
        }
        
        claim_amount = round(np.random.uniform(200000, 350000), 2) # Bill like a huge surgery
        claim_amount = min(claim_amount, wallet_balances[beneficiary_id]) if wallet_balances[beneficiary_id] > 0 else claim_amount
        wallet_balances[beneficiary_id] -= claim_amount

        claim['claim_amount'] = claim_amount
        claim['claim_date'] = claim_date.strftime('%Y-%m-%d')
        claim['is_fraud_injected'] = 1

        claims.append(claim)
        claim_id_counter += 1

    df_beneficiaries['wallet_balance'] = df_beneficiaries['beneficiary_id'].map(wallet_balances)

    df_claims = pd.DataFrame(claims)
    # Ensure exactly 800 claims just in case logic rounding drifted
    return df_claims.head(num_claims)


# ==============================
# Load Demo Data
# ==============================
def load_demo_data():
    df_beneficiaries = generate_beneficiaries()
    df_claims = generate_claims(df_beneficiaries)

    from database import create_database
    create_database(df_beneficiaries, df_claims)

    return df_claims