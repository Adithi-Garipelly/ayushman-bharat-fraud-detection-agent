import pandas as pd
import numpy as np
from datetime import datetime, timedelta

# Import the master analysis function
from fraud_detection import analyze_claims


def create_test_data():
    """
    Create small, readable test data for fraud detection validation.
    
    Returns:
        tuple: (claims_df, beneficiaries_df) with test scenarios
    """
    # Create beneficiaries master list with 3 valid beneficiaries
    beneficiaries_data = {
        'beneficiary_id': ['BEN_0001', 'BEN_0002', 'BEN_0003']
    }
    beneficiaries_df = pd.DataFrame(beneficiaries_data)
    
    # Create claims data with various fraud scenarios
    base_date = datetime(2023, 1, 1)
    
    claims_data = {
        'claim_id': ['CLAIM_001', 'CLAIM_002', 'CLAIM_003', 'CLAIM_004', 'CLAIM_005'],
        'hospital_id': ['HOSP_001', 'HOSP_001', 'HOSP_002', 'HOSP_001', 'HOSP_002'],
        'beneficiary_id': ['BEN_0001', 'BEN_9999', 'BEN_0002', 'BEN_0003', 'BEN_0003'],
        'diagnosis_code': ['A01', 'A01', 'A03', 'C01', 'C01'],
        'procedure_code': ['P01', 'P01', 'P99', 'P11', 'P11'],
        'claim_amount': [500.0, 750.0, 2000.0, 1500.0, 1600.0],
        'claim_date': [
            base_date,
            base_date + timedelta(days=1),
            base_date + timedelta(days=2),
            base_date + timedelta(days=3),
            base_date + timedelta(days=10)
        ]
    }
    
    claims_df = pd.DataFrame(claims_data)
    
    # Ensure claim_date is datetime
    claims_df['claim_date'] = pd.to_datetime(claims_df['claim_date'])
    
    return claims_df, beneficiaries_df


def main():
    """
    Main test function to validate the fraud detection pipeline.
    """
    print("Healthcare Fraud Detection - Test Engine")
    print("=" * 50)
    
    # Create test data
    print("Creating test data...")
    claims_df, beneficiaries_df = create_test_data()
    
    print(f"\nBeneficiaries ({len(beneficiaries_df)}):")
    print(beneficiaries_df.to_string(index=False))
    
    print(f"\nClaims ({len(claims_df)}):")
    print(claims_df.to_string(index=False))
    
    print("\n" + "=" * 50)
    print("Test Scenarios:")
    print("- CLAIM_001: Normal claim (valid beneficiary, valid procedure)")
    print("- CLAIM_002: Ghost claim (beneficiary BEN_9999 not in master list)")
    print("- CLAIM_003: Upcoding (BRAIN_SURGERY for FRACTURE diagnosis)")
    print("- CLAIM_004 & CLAIM_005: Cross-hospital (same beneficiary in different hospitals)")
    print("=" * 50)
    
    # Run the analysis
    print("\nRunning fraud detection analysis...")
    try:
        analyzed_claims = analyze_claims(claims_df, beneficiaries_df)
        
        print("\n" + "=" * 50)
        print("ANALYSIS RESULTS")
        print("=" * 50)
        
        # Display key columns for validation
        result_columns = [
            'claim_id',
            'beneficiary_id', 
            'hospital_id',
            'ghost_flag',
            'cross_hospital_flag', 
            'upcoding_flag',
            'anomaly_flag',
            'risk_score'
        ]
        
        results_df = analyzed_claims[result_columns].copy()
        
        # Add interpretation row
        def interpret_flags(row):
            interpretations = []
            if row['ghost_flag'] == 1:
                interpretations.append("GHOST")
            if row['cross_hospital_flag'] == 1:
                interpretations.append("CROSS_HOSPITAL")
            if row['upcoding_flag'] == 1:
                interpretations.append("UPCODING")
            if row['anomaly_flag'] == 1:
                interpretations.append("ANOMALY")
            return " | ".join(interpretations) if interpretations else "NORMAL"
        
        results_df['detected_issues'] = results_df.apply(interpret_flags, axis=1)
        
        print(results_df.to_string(index=False))
        
        # Validation summary
        print("\n" + "=" * 50)
        print("VALIDATION SUMMARY")
        print("=" * 50)
        
        # Check expected results
        expected_results = {
            'CLAIM_001': {'ghost_flag': 0, 'cross_hospital_flag': 0, 'upcoding_flag': 0},
            'CLAIM_002': {'ghost_flag': 1, 'cross_hospital_flag': 0, 'upcoding_flag': 0},
            'CLAIM_003': {'ghost_flag': 0, 'cross_hospital_flag': 0, 'upcoding_flag': 1},
            'CLAIM_004': {'ghost_flag': 0, 'cross_hospital_flag': 1, 'upcoding_flag': 0},
            'CLAIM_005': {'ghost_flag': 0, 'cross_hospital_flag': 1, 'upcoding_flag': 0}
        }
        
        all_passed = True
        for claim_id, expected in expected_results.items():
            actual = analyzed_claims[analyzed_claims['claim_id'] == claim_id].iloc[0]
            
            ghost_ok = actual['ghost_flag'] == expected['ghost_flag']
            cross_ok = actual['cross_hospital_flag'] == expected['cross_hospital_flag']
            upcoding_ok = actual['upcoding_flag'] == expected['upcoding_flag']
            
            status = "PASS" if (ghost_ok and cross_ok and upcoding_ok) else "FAIL"
            print(f"{claim_id}: {status}")
            
            if not (ghost_ok and cross_ok and upcoding_ok):
                all_passed = False
                print(f"  Expected: ghost={expected['ghost_flag']}, cross={expected['cross_hospital_flag']}, upcoding={expected['upcoding_flag']}")
                print(f"  Actual:   ghost={actual['ghost_flag']}, cross={actual['cross_hospital_flag']}, upcoding={actual['upcoding_flag']}")
        
        print(f"\nOverall Test Result: {'ALL TESTS PASSED' if all_passed else 'SOME TESTS FAILED'}")
        
        # Risk score analysis
        print(f"\nRisk Score Analysis:")
        print(f"Highest risk score: {analyzed_claims['risk_score'].max()}")
        print(f"Average risk score: {analyzed_claims['risk_score'].mean():.2f}")
        high_risk_claims = analyzed_claims[analyzed_claims['risk_score'] >= 50]
        print(f"High-risk claims (score >= 50): {len(high_risk_claims)}")
        
    except Exception as e:
        print(f"Error during analysis: {str(e)}")
        import traceback
        traceback.print_exc()


if __name__ == "__main__":
    main()
