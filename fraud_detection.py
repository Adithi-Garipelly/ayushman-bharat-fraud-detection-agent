import pandas as pd
import numpy as np
from datetime import datetime, timedelta
from typing import Dict, List, Tuple, Optional
import warnings

# Import functions from risk_scoring module
from risk_scoring import detect_anomalies, compute_risk_score

# Valid procedure mapping for upcoding detection
from data_generator import valid_mapping as VALID_PROCEDURE_MAP


class HealthcareFraudDetector:
    """
    A comprehensive healthcare fraud detection system using rule-based algorithms.
    
    This class provides various methods to detect potential fraudulent activities
    in healthcare claims data based on common fraud patterns.
    """
    
    def __init__(self):
        self.fraud_rules = {
            'duplicate_claims': self.detect_duplicate_claims,
            'high_amount_claims': self.detect_high_amount_claims,
            'unusual_procedure_frequency': self.detect_unusual_procedure_frequency,
            'beneficiary_claim_limits': self.detect_beneficiary_claim_limits,
            'hospital_claim_patterns': self.detect_hospital_claim_patterns,
            'diagnosis_procedure_mismatch': self.detect_diagnosis_procedure_mismatch,
            'weekend_holiday_claims': self.detect_weekend_holiday_claims,
            'same_day_multiple_claims': self.detect_same_day_multiple_claims
        }
        
    def validate_input_data(self, claims_df: pd.DataFrame, beneficiaries_df: pd.DataFrame) -> None:
        """Validate input DataFrames have required columns."""
        required_claim_columns = [
            'claim_id', 'hospital_id', 'beneficiary_id', 'diagnosis_code', 
            'procedure_code', 'claim_amount', 'claim_date'
        ]
        
        required_beneficiary_columns = ['beneficiary_id']
        
        missing_claim_cols = [col for col in required_claim_columns if col not in claims_df.columns]
        missing_beneficiary_cols = [col for col in required_beneficiary_columns if col not in beneficiaries_df.columns]
        
        if missing_claim_cols:
            raise ValueError(f"Missing required columns in claims DataFrame: {missing_claim_cols}")
        if missing_beneficiary_cols:
            raise ValueError(f"Missing required columns in beneficiaries DataFrame: {missing_beneficiary_cols}")
    
    def detect_ghost_claims(self, claims_df: pd.DataFrame, beneficiaries_df: pd.DataFrame) -> pd.DataFrame:
        """
        Detect ghost claims where beneficiary_id in claims does not exist in beneficiaries master list.
        
        Args:
            claims_df: DataFrame containing claims data with beneficiary_id column
            beneficiaries_df: DataFrame containing beneficiary master list with beneficiary_id column
        
        Returns:
            Updated claims_df with ghost_flag column (1 for ghost claims, 0 for valid claims)
        """
        # Create a copy to avoid modifying the original dataframe
        df = claims_df.copy()
        
        # Get set of valid beneficiary IDs
        valid_beneficiaries = set(beneficiaries_df['beneficiary_id'].unique())
        
        # Add ghost_flag column: 1 if beneficiary_id not in beneficiaries, 0 otherwise
        df['ghost_flag'] = df['beneficiary_id'].apply(lambda x: 0 if x in valid_beneficiaries else 1)
        
        return df
    
    def detect_cross_hospital(self, claims_df: pd.DataFrame) -> pd.DataFrame:
        """
        Detect beneficiaries who have claims in multiple hospitals within a 30-day window.
        
        Args:
            claims_df: DataFrame containing claims data with beneficiary_id, hospital_id, claim_date columns
        
        Returns:
            Updated claims_df with cross_hospital_flag column (1 for cross-hospital activity, 0 otherwise)
        """
        # Create a copy to avoid modifying the original dataframe
        df = claims_df.copy()
        
        # Convert claim_date to datetime
        df['claim_date'] = pd.to_datetime(df['claim_date'])
        
        # Sort by beneficiary and date for efficient processing
        df = df.sort_values(['beneficiary_id', 'claim_date'])
        
        # Initialize cross_hospital_flag
        df['cross_hospital_flag'] = 0
        
        # Process each beneficiary separately
        for beneficiary_id, beneficiary_claims in df.groupby('beneficiary_id'):
            if len(beneficiary_claims) < 2:
                continue  # Skip beneficiaries with only one claim
            
            # Check for cross-hospital activity within 30 days
            for i, claim1 in beneficiary_claims.iterrows():
                # Look at claims within 30 days after current claim
                end_date = claim1['claim_date'] + pd.Timedelta(days=30)
                
                # Find claims within 30-day window
                window_claims = beneficiary_claims[
                    (beneficiary_claims['claim_date'] >= claim1['claim_date']) &
                    (beneficiary_claims['claim_date'] <= end_date)
                ]
                
                # Check if multiple hospitals in this window
                unique_hospitals = window_claims['hospital_id'].nunique()
                
                if unique_hospitals > 1:
                    # Mark all claims in this window
                    df.loc[window_claims.index, 'cross_hospital_flag'] = 1
        
        return df
    
    def detect_upcoding(self, claims_df: pd.DataFrame) -> pd.DataFrame:
        """
        Detect upcoding where procedure_code is not valid for the given diagnosis_code.
        
        Args:
            claims_df: DataFrame containing claims data with diagnosis_code and procedure_code columns
        
        Returns:
            Updated claims_df with upcoding_flag column (1 for suspicious upcoding, 0 otherwise)
        """
        # Create a copy to avoid modifying the original dataframe
        df = claims_df.copy()
        
        def is_valid_procedure(diagnosis, procedure):
            """Check if procedure is valid for the given diagnosis."""
            if diagnosis not in VALID_PROCEDURE_MAP:
                return False  # Unknown diagnosis is suspicious
            return procedure in VALID_PROCEDURE_MAP[diagnosis]
        
        # Vectorized approach using apply
        df['upcoding_flag'] = df.apply(
            lambda row: 0 if is_valid_procedure(row['diagnosis_code'], row['procedure_code']) else 1,
            axis=1
        )
        
        return df
    
    def preprocess_data(self, claims_df: pd.DataFrame) -> pd.DataFrame:
        """Preprocess claims data for fraud detection."""
        df = claims_df.copy()
        
        # Convert claim_date to datetime
        df['claim_date'] = pd.to_datetime(df['claim_date'])
        
        # Extract date features
        df['year'] = df['claim_date'].dt.year
        df['month'] = df['claim_date'].dt.month
        df['day_of_week'] = df['claim_date'].dt.dayofweek
        df['is_weekend'] = df['day_of_week'].isin([5, 6])
        
        # Clean amount column
        df['claim_amount'] = pd.to_numeric(df['claim_amount'], errors='coerce')
        
        return df
    
    def detect_duplicate_claims(self, claims_df: pd.DataFrame, **kwargs) -> pd.DataFrame:
        """
        Detect duplicate claims based on same beneficiary, procedure, and amount within a short timeframe.
        """
        df = claims_df.copy()
        
        # Sort by beneficiary and date
        df = df.sort_values(['beneficiary_id', 'claim_date'])
        
        duplicate_flags = []
        
        for _, group in df.groupby(['beneficiary_id', 'procedure_code', 'claim_amount']):
            if len(group) > 1:
                # Check for claims within 7 days
                for i in range(len(group)):
                    for j in range(i + 1, len(group)):
                        time_diff = (group.iloc[j]['claim_date'] - group.iloc[i]['claim_date']).days
                        if time_diff <= 7:
                            duplicate_flags.extend([group.iloc[i]['claim_id'], group.iloc[j]['claim_id']])
        
        duplicate_claims = df[df['claim_id'].isin(duplicate_flags)].copy()
        duplicate_claims['fraud_type'] = 'duplicate_claims'
        duplicate_claims['fraud_reason'] = 'Duplicate claim within 7 days'
        
        return duplicate_claims
    
    def detect_high_amount_claims(self, claims_df: pd.DataFrame, threshold_percentile: float = 95, **kwargs) -> pd.DataFrame:
        """
        Detect claims with unusually high amounts.
        """
        df = claims_df.copy()
        
        # Calculate threshold based on percentile
        amount_threshold = df['claim_amount'].quantile(threshold_percentile / 100)
        
        high_amount_claims = df[df['claim_amount'] > amount_threshold].copy()
        high_amount_claims['fraud_type'] = 'high_amount_claims'
        high_amount_claims['fraud_reason'] = f'Claim amount exceeds {threshold_percentile}th percentile (${amount_threshold:.2f})'
        
        return high_amount_claims
    
    def detect_unusual_procedure_frequency(self, claims_df: pd.DataFrame, frequency_threshold: int = 10, **kwargs) -> pd.DataFrame:
        """
        Detect beneficiaries with unusually high frequency of specific procedures.
        """
        df = claims_df.copy()
        
        # Count procedures per beneficiary
        procedure_counts = df.groupby(['beneficiary_id', 'procedure_code']).size().reset_index(name='count')
        
        # Identify beneficiaries with high frequency
        high_frequency = procedure_counts[procedure_counts['count'] > frequency_threshold]
        
        # Get the actual claims
        fraudulent_claims = df.merge(
            high_frequency[['beneficiary_id', 'procedure_code']], 
            on=['beneficiary_id', 'procedure_code']
        ).copy()
        
        fraudulent_claims['fraud_type'] = 'unusual_procedure_frequency'
        fraudulent_claims['fraud_reason'] = f'Procedure frequency exceeds {frequency_threshold} for beneficiary'
        
        return fraudulent_claims
    
    def detect_beneficiary_claim_limits(self, claims_df: pd.DataFrame, beneficiaries_df: pd.DataFrame, 
                                      max_monthly_claims: int = 20, max_yearly_claims: int = 100, **kwargs) -> pd.DataFrame:
        """
        Detect beneficiaries exceeding reasonable claim limits.
        """
        df = claims_df.copy()
        
        # Monthly claims per beneficiary
        monthly_counts = df.groupby(['beneficiary_id', 'year', 'month']).size().reset_index(name='monthly_count')
        beneficiaries_exceeding_monthly = monthly_counts[monthly_counts['monthly_count'] > max_monthly_claims]['beneficiary_id'].unique()
        
        # Yearly claims per beneficiary
        yearly_counts = df.groupby(['beneficiary_id', 'year']).size().reset_index(name='yearly_count')
        beneficiaries_exceeding_yearly = yearly_counts[yearly_counts['yearly_count'] > max_yearly_claims]['beneficiary_id'].unique()
        
        # Combine beneficiaries exceeding any limit
        suspicious_beneficiaries = set(beneficiaries_exceeding_monthly) | set(beneficiaries_exceeding_yearly)
        
        fraudulent_claims = df[df['beneficiary_id'].isin(suspicious_beneficiaries)].copy()
        fraudulent_claims['fraud_type'] = 'beneficiary_claim_limits'
        fraudulent_claims['fraud_reason'] = 'Beneficiary exceeds reasonable claim limits'
        
        return fraudulent_claims
    
    def detect_hospital_claim_patterns(self, claims_df: pd.DataFrame, hospital_threshold: int = 1000, **kwargs) -> pd.DataFrame:
        """
        Detect hospitals with unusual claim patterns.
        """
        df = claims_df.copy()
        
        # Claims per hospital
        hospital_counts = df.groupby('hospital_id').agg({
            'claim_id': 'count',
            'claim_amount': ['mean', 'sum']
        }).round(2)
        
        hospital_counts.columns = ['claim_count', 'avg_amount', 'total_amount']
        hospital_counts = hospital_counts.reset_index()
        
        # Identify hospitals with high claim volume
        high_volume_hospitals = hospital_counts[hospital_counts['claim_count'] > hospital_threshold]['hospital_id']
        
        # Get claims from suspicious hospitals
        fraudulent_claims = df[df['hospital_id'].isin(high_volume_hospitals)].copy()
        fraudulent_claims['fraud_type'] = 'hospital_claim_patterns'
        fraudulent_claims['fraud_reason'] = f'Hospital exceeds {hospital_threshold} claims threshold'
        
        return fraudulent_claims
    
    def detect_diagnosis_procedure_mismatch(self, claims_df: pd.DataFrame, **kwargs) -> pd.DataFrame:
        """
        Detect potential mismatches between diagnosis and procedure codes.
        This is a simplified version - in practice, you'd use medical coding guidelines.
        """
        df = claims_df.copy()
        
        # Define some basic mismatch rules (simplified for demonstration)
        mismatch_rules = {
            # Common diagnosis-procedure mismatches
            'Z00': ['99204', '99214'],  # General exam codes with preventive diagnosis
            'V70': ['99205', '99215'],  # General exam codes
        }
        
        suspicious_claims = []
        
        for diagnosis, procedures in mismatch_rules.items():
            mismatched = df[
                (df['diagnosis_code'].str.startswith(diagnosis)) & 
                (df['procedure_code'].isin(procedures))
            ]
            suspicious_claims.append(mismatched)
        
        if suspicious_claims:
            fraudulent_claims = pd.concat(suspicious_claims, ignore_index=True).copy()
            fraudulent_claims['fraud_type'] = 'diagnosis_procedure_mismatch'
            fraudulent_claims['fraud_reason'] = 'Potential diagnosis-procedure mismatch'
        else:
            fraudulent_claims = pd.DataFrame(columns=df.columns.tolist() + ['fraud_type', 'fraud_reason'])
        
        return fraudulent_claims
    
    def detect_weekend_holiday_claims(self, claims_df: pd.DataFrame, **kwargs) -> pd.DataFrame:
        """
        Detect claims filed on weekends or holidays for non-emergency procedures.
        """
        df = claims_df.copy()
        
        # Define emergency procedure codes (simplified)
        emergency_procedures = ['99281', '99282', '99283', '99284', '99285']
        
        # Find weekend claims for non-emergency procedures
        weekend_non_emergency = df[
            (df['is_weekend']) & 
            (~df['procedure_code'].isin(emergency_procedures))
        ].copy()
        
        weekend_non_emergency['fraud_type'] = 'weekend_holiday_claims'
        weekend_non_emergency['fraud_reason'] = 'Non-emergency procedure claimed on weekend'
        
        return weekend_non_emergency
    
    def detect_same_day_multiple_claims(self, claims_df: pd.DataFrame, max_claims_per_day: int = 5, **kwargs) -> pd.DataFrame:
        """
        Detect multiple claims for the same beneficiary on the same day.
        """
        df = claims_df.copy()
        
        # Count claims per beneficiary per day
        daily_counts = df.groupby(['beneficiary_id', 'claim_date']).size().reset_index(name='daily_count')
        
        # Find beneficiaries with excessive daily claims
        excessive_daily = daily_counts[daily_counts['daily_count'] > max_claims_per_day]
        
        # Get the actual claims
        fraudulent_claims = df.merge(
            excessive_daily[['beneficiary_id', 'claim_date']], 
            on=['beneficiary_id', 'claim_date']
        ).copy()
        
        fraudulent_claims['fraud_type'] = 'same_day_multiple_claims'
        fraudulent_claims['fraud_reason'] = f'More than {max_claims_per_day} claims for beneficiary on same day'
        
        return fraudulent_claims
    
    def run_fraud_detection(self, claims_df: pd.DataFrame, beneficiaries_df: pd.DataFrame, 
                          rules_to_run: Optional[List[str]] = None, **kwargs) -> Dict[str, pd.DataFrame]:
        """
        Run fraud detection using specified rules or all rules.
        
        Args:
            claims_df: DataFrame containing claims data
            beneficiaries_df: DataFrame containing beneficiary data
            rules_to_run: List of rule names to run. If None, runs all rules.
            **kwargs: Additional parameters for specific rules
        
        Returns:
            Dictionary with rule names as keys and DataFrames of fraudulent claims as values
        """
        # Validate input data
        self.validate_input_data(claims_df, beneficiaries_df)
        
        # Preprocess data
        processed_claims = self.preprocess_data(claims_df)
        
        # Determine which rules to run
        if rules_to_run is None:
            rules_to_run = list(self.fraud_rules.keys())
        
        # Run fraud detection rules
        results = {}
        
        for rule_name in rules_to_run:
            if rule_name not in self.fraud_rules:
                warnings.warn(f"Unknown fraud detection rule: {rule_name}")
                continue
            
            try:
                if rule_name == 'beneficiary_claim_limits':
                    fraudulent_claims = self.fraud_rules[rule_name](processed_claims, beneficiaries_df, **kwargs)
                else:
                    fraudulent_claims = self.fraud_rules[rule_name](processed_claims, **kwargs)
                
                results[rule_name] = fraudulent_claims
                
            except Exception as e:
                warnings.warn(f"Error running rule {rule_name}: {str(e)}")
                results[rule_name] = pd.DataFrame()
        
        return results
    
    def generate_fraud_summary(self, fraud_results: Dict[str, pd.DataFrame]) -> pd.DataFrame:
        """
        Generate a summary of all detected fraudulent claims.
        """
        all_fraudulent_claims = []
        
        for rule_name, claims_df in fraud_results.items():
            if not claims_df.empty:
                claims_df_copy = claims_df.copy()
                claims_df_copy['detection_rule'] = rule_name
                all_fraudulent_claims.append(claims_df_copy)
        
        if all_fraudulent_claims:
            summary_df = pd.concat(all_fraudulent_claims, ignore_index=True)
            
            # Add summary statistics
            summary_stats = summary_df.groupby(['beneficiary_id', 'hospital_id']).agg({
                'claim_id': 'count',
                'claim_amount': 'sum',
                'fraud_type': lambda x: ', '.join(x.unique())
            }).reset_index()
            summary_stats.columns = ['beneficiary_id', 'hospital_id', 'fraudulent_claim_count', 
                                   'total_fraud_amount', 'fraud_types']
            
            return summary_df, summary_df
        else:
            return pd.DataFrame(), pd.DataFrame()
    
    def export_fraud_report(self, fraud_results: Dict[str, pd.DataFrame], 
                          output_path: str = 'fraud_report.csv') -> None:
        """
        Export fraud detection results to CSV.
        """
        summary_df, detailed_df = self.generate_fraud_summary(fraud_results)
        
        if not detailed_df.empty:
            detailed_df.to_csv(output_path, index=False)
            print(f"Fraud report exported to {output_path}")
            print(f"Total fraudulent claims detected: {len(detailed_df)}")
            print(f"Total fraudulent amount: ${detailed_df['claim_amount'].sum():,.2f}")
        else:
            print("No fraudulent claims detected.")


# Example usage and helper functions
def create_sample_data() -> Tuple[pd.DataFrame, pd.DataFrame]:
    """
    Create sample data for testing the fraud detection system.
    """
    # Sample claims data
    np.random.seed(42)
    n_claims = 1000
    
    claims_data = {
        'claim_id': [f'CLAIM_{i:06d}' for i in range(1, n_claims + 1)],
        'hospital_id': np.random.choice([f'HOSP_{j:03d}' for j in range(1, 21)], n_claims),
        'beneficiary_id': np.random.choice([f'BEN_{k:04d}' for k in range(1, 101)], n_claims),
        'diagnosis_code': np.random.choice(['I10', 'E11', 'J45', 'M54', 'F32', 'Z00', 'V70'], n_claims),
        'procedure_code': np.random.choice(['99213', '99214', '99215', '99204', '99205', '99281', '99282'], n_claims),
        'claim_amount': np.random.uniform(50, 5000, n_claims),
        'claim_date': pd.date_range('2023-01-01', '2023-12-31', periods=n_claims)
    }
    
    claims_df = pd.DataFrame(claims_data)
    
    # Add some fraudulent patterns for testing
    # Duplicate claims
    duplicate_subset = claims_df.iloc[10:15].copy()
    duplicate_subset['claim_date'] = duplicate_subset['claim_date'] + pd.Timedelta(days=1)
    duplicate_subset['claim_id'] = [f'CLAIM_DUP_{i}' for i in range(len(duplicate_subset))]
    claims_df = pd.concat([claims_df, duplicate_subset], ignore_index=True)
    
    # High amount claims
    claims_df.loc[20:25, 'claim_amount'] = np.random.uniform(10000, 15000, 6)
    
    # Sample beneficiaries data
    beneficiaries_data = {
        'beneficiary_id': [f'BEN_{k:04d}' for k in range(1, 101)]
    }
    
    beneficiaries_df = pd.DataFrame(beneficiaries_data)
    
    return claims_df, beneficiaries_df


if __name__ == "__main__":
    # Example usage
    print("Healthcare Fraud Detection System")
    print("=" * 40)
    
    # Create sample data
    claims_df, beneficiaries_df = create_sample_data()
    
    # Initialize fraud detector
    detector = HealthcareFraudDetector()
    
    # Run fraud detection
    print("Running fraud detection...")
    fraud_results = detector.run_fraud_detection(claims_df, beneficiaries_df)
    
    # Display results
    print("\nFraud Detection Results:")
    print("-" * 30)
    
    for rule_name, fraudulent_claims in fraud_results.items():
        if not fraudulent_claims.empty:
            print(f"\n{rule_name}: {len(fraudulent_claims)} suspicious claims")
            print(f"Total amount: ${fraudulent_claims['claim_amount'].sum():,.2f}")
        else:
            print(f"\n{rule_name}: No suspicious claims detected")
    
    # Generate and export report
    print("\nGenerating fraud report...")
    detector.export_fraud_report(fraud_results, 'healthcare_fraud_report.csv')


def analyze_claims(claims_df: pd.DataFrame, beneficiaries_df: pd.DataFrame) -> pd.DataFrame:
    """
    Master function to analyze healthcare claims for fraud detection.
    
    This function runs a comprehensive fraud detection pipeline, combining
    rule-based detection with machine learning anomaly detection and risk scoring.
    
    Args:
        claims_df: DataFrame containing claims data with required columns
        beneficiaries_df: DataFrame containing beneficiary master list
    
    Returns:
        Fully enriched DataFrame with all fraud detection flags and risk scores
    """
    print("Starting comprehensive claims analysis...")
    
    # Step 1: Detect ghost claims
    print("1. Detecting ghost claims...")
    enriched_df = HealthcareFraudDetector().detect_ghost_claims(claims_df, beneficiaries_df)
    ghost_count = enriched_df['ghost_flag'].sum()
    print(f"   Found {ghost_count} ghost claims")
    
    # Step 2: Detect cross-hospital activity
    print("2. Detecting cross-hospital activity...")
    enriched_df = HealthcareFraudDetector().detect_cross_hospital(enriched_df)
    cross_hospital_count = enriched_df['cross_hospital_flag'].sum()
    print(f"   Found {cross_hospital_count} cross-hospital claims")
    
    # Step 3: Detect upcoding fraud
    print("3. Detecting upcoding fraud...")
    enriched_df = HealthcareFraudDetector().detect_upcoding(enriched_df)
    upcoding_count = enriched_df['upcoding_flag'].sum()
    print(f"   Found {upcoding_count} upcoding claims")
    
    # Step 4: Detect statistical anomalies
    print("4. Detecting statistical anomalies...")
    enriched_df = detect_anomalies(enriched_df)
    anomaly_count = enriched_df['anomaly_flag'].sum()
    print(f"   Found {anomaly_count} anomalous claims")
    
    # Step 5: Compute composite risk scores
    print("5. Computing risk scores...")
    final_df = compute_risk_score(enriched_df)
    
    # Summary statistics
    high_risk_count = (final_df['risk_score'] >= 75).sum()
    avg_risk_score = final_df['risk_score'].mean()
    
    print(f"\nAnalysis Complete!")
    print(f"Total claims processed: {len(final_df)}")
    print(f"High-risk claims (score >= 75): {high_risk_count}")
    print(f"Average risk score: {avg_risk_score:.2f}")
    
    return final_df