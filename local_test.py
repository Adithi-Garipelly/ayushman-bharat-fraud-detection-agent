import pandas as pd

# Import the master analysis function
from fraud_detection import analyze_claims


def main():
    # Create beneficiaries master list
    beneficiaries_df = pd.DataFrame({
        'beneficiary_id': ['B1', 'B2', 'B3']
    })
    
    # Create claims data with test scenarios
    claims_df = pd.DataFrame({
        'claim_id': ['C001', 'C002', 'C003', 'C004'],
        'hospital_id': ['H1', 'H1', 'H2', 'H3'],
        'beneficiary_id': ['B1', 'GHOST', 'B2', 'B3'],
        'diagnosis_code': ['FEVER', 'FEVER', 'FRACTURE', 'FEVER'],
        'procedure_code': ['BASIC_TREATMENT', 'BASIC_TREATMENT', 'XRAY', 'BASIC_TREATMENT'],
        'claim_amount': [500.0, 600.0, 50000.0, 700.0],  # High amount for anomaly detection
        'claim_date': ['2023-01-01', '2023-01-02', '2023-01-03', '2023-01-10']  # String dates
    })
    
    print("Test Data:")
    print(f"Beneficiaries: {beneficiaries_df['beneficiary_id'].tolist()}")
    print(f"Claims: {len(claims_df)} records")
    print("-" * 50)
    
    # Run analysis
    analyzed_claims = analyze_claims(claims_df, beneficiaries_df)
    
    # Display results
    result_columns = [
        'beneficiary_id',
        'hospital_id', 
        'ghost_flag',
        'cross_hospital_flag',
        'upcoding_flag',
        'anomaly_flag',
        'risk_score'
    ]
    
    print("Results:")
    print(analyzed_claims[result_columns].to_string(index=False))


if __name__ == "__main__":
    main()
