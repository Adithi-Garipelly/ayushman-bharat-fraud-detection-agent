import pandas as pd
import numpy as np
from sklearn.ensemble import IsolationForest
from typing import Optional


def detect_anomalies(claims_df: pd.DataFrame) -> pd.DataFrame:
    """
    Detect anomalies in claims data using Isolation Forest.
    
    This function identifies unusual claim amounts by comparing individual claims
    to hospital averages and using machine learning to detect outliers.
    
    Args:
        claims_df: DataFrame containing claims data with hospital_id and claim_amount columns
    
    Returns:
        Updated claims_df with hospital_avg, anomaly_flag, and anomaly_score columns
    """
    # Create a copy to avoid modifying the original dataframe
    df = claims_df.copy()
    
    # Create hospital average claim amount feature
    df['hospital_avg'] = df.groupby('hospital_id')['claim_amount'].transform('mean')
    
    
    # Prepare features for anomaly detection
    features = df[['claim_amount', 'hospital_avg']].copy()
    
    # Handle any missing values
    features = features.fillna(features.mean())
    
    # Initialize and train Isolation Forest
    iso_forest = IsolationForest(
        contamination=0.15,
        random_state=42,
        n_estimators=100
    )
    
    # Fit the model and get predictions
    anomaly_predictions = iso_forest.fit_predict(features)
    anomaly_scores = iso_forest.decision_function(features)
    
    # Add anomaly flags (1 for anomaly, 0 for normal)
    # IsolationForest returns -1 for anomalies, 1 for normal
    df['anomaly_flag'] = np.where(anomaly_predictions == -1, 1, 0)
    
    # Add anomaly scores (lower scores indicate more anomalous)
    df['anomaly_score'] = anomaly_scores
    
    return df


def compute_risk_score(df: pd.DataFrame) -> pd.DataFrame:
    """
    Compute a composite risk score based on multiple fraud indicators.
    
    This function implements a structured scoring framework:
    1. Base Severity Score based on fraud types
    2. Financial Impact Multiplier
    3. Repetition Behavior Multiplier
    4. Cross-Signal Bonus
    """
    result_df = df.copy()
    
    required_columns = ['ghost_flag', 'cross_hospital_flag', 'upcoding_flag', 'anomaly_flag', 'claim_amount', 'hospital_id']
    missing_columns = [col for col in required_columns if col not in result_df.columns]
    
    if missing_columns:
        raise ValueError(f"Missing required columns: {missing_columns}")
    
    # 1. Base Fraud Score
    base_score = (
        result_df['ghost_flag'] * 50 +
        result_df['upcoding_flag'] * 40 +
        result_df['cross_hospital_flag'] * 30 +
        result_df['anomaly_flag'] * 20
    )
    
    # 2. Financial Impact Multiplier
    conditions = [
        result_df['claim_amount'] > 40000,
        result_df['claim_amount'] > 20000
    ]
    choices = [20, 10]
    financial_impact = np.select(conditions, choices, default=0)
    
    # Calculate how many flags this claim has
    num_flags = (
        result_df['ghost_flag'] + 
        result_df['cross_hospital_flag'] + 
        result_df['upcoding_flag'] + 
        result_df['anomaly_flag']
    )
    
    # Create any_flag to count hospital repetitions
    result_df['any_flag'] = (num_flags > 0).astype(int)
    
    # 3. Repetition Multiplier (Flagged claims per hospital)
    hospital_flag_counts = result_df.groupby('hospital_id')['any_flag'].transform('sum')
    rep_conditions = [
        hospital_flag_counts > 20,
        hospital_flag_counts > 5
    ]
    rep_choices = [20, 10]
    repetition_weight = np.select(rep_conditions, rep_choices, default=0)
    
    # 4. Cross-Signal Bonus
    cross_signal_bonus = np.where(num_flags > 1, 15, 0)
    
    # Sum all components
    total_score = base_score + financial_impact + repetition_weight + cross_signal_bonus
    
    # Only apply multipliers/bonuses if there is actually a base score (i.e., at least one flag is triggered)
    # If it's a completely normal claim, risk should be 0 or very low. 
    # Actually, the user says "Case 3 - Price anomaly only 12,000 -> Base=20, Financial=0... Total=20".
    # Wait, what if a claim has NO flags, but the hospital has repetitive history?
    # If base_score == 0, then risk_score should be 0.
    total_score = np.where(base_score > 0, total_score, 0)
    
    # Cap at 100
    result_df['risk_score'] = np.clip(total_score, 0, 100)
    
    # Add category mapping for reference if needed (optional, but requested in design)
    conditions_cat = [
        result_df['risk_score'] >= 80,
        result_df['risk_score'] >= 60,
        result_df['risk_score'] >= 30,
        result_df['risk_score'] >= 0
    ]
    choices_cat = ['Critical Risk', 'High Risk', 'Medium Risk', 'Low Risk']
    result_df['risk_category'] = np.select(conditions_cat, choices_cat, default='Low Risk')
    
    # Clean up temporary column
    result_df = result_df.drop(columns=['any_flag'])
    
    return result_df


def analyze_risk_scores(df: pd.DataFrame) -> dict:
    """
    Analyze risk score distribution and provide summary statistics.
    
    Args:
        df: DataFrame with risk_score column (output from compute_risk_score)
    
    Returns:
        Dictionary containing risk score analysis
    """
    if 'risk_score' not in df.columns:
        raise ValueError("DataFrame must contain risk_score column. Run compute_risk_score first.")
    
    # Overall risk score statistics
    risk_stats = df['risk_score'].describe()
    
    # Risk level categorization
    risk_levels = pd.cut(df['risk_score'], 
                        bins=[0, 25, 50, 75, 100], 
                        labels=['Low', 'Medium', 'High', 'Critical'],
                        include_lowest=True)
    
    risk_distribution = risk_levels.value_counts().to_dict()
    
    # High-risk claims analysis
    high_risk_claims = df[df['risk_score'] >= 75]
    
    return {
        'risk_score_stats': risk_stats,
        'risk_distribution': risk_distribution,
        'high_risk_count': len(high_risk_claims),
        'high_risk_percentage': round(len(high_risk_claims) / len(df) * 100, 2),
        'max_risk_score': df['risk_score'].max(),
        'avg_risk_score': round(df['risk_score'].mean(), 2)
    }


def export_risk_report(df: pd.DataFrame, output_path: str = 'risk_report.csv', 
                      min_risk_score: int = 50) -> None:
    """
    Export high-risk claims to CSV file.
    
    Args:
        df: DataFrame with risk scores
        output_path: Path for the output CSV file
        min_risk_score: Minimum risk score to include in report
    """
    if 'risk_score' not in df.columns:
        raise ValueError("DataFrame must contain risk_score column. Run compute_risk_score first.")
    
    # Filter for high-risk claims
    high_risk_df = df[df['risk_score'] >= min_risk_score].copy()
    
    if not high_risk_df.empty:
        # Sort by risk score (highest first)
        high_risk_df = high_risk_df.sort_values('risk_score', ascending=False)
        high_risk_df.to_csv(output_path, index=False)
        
        print(f"Risk report exported to {output_path}")
        print(f"High-risk claims (score >= {min_risk_score}): {len(high_risk_df)}")
        print(f"Highest risk score: {high_risk_df['risk_score'].max()}")
        print(f"Average risk score in report: {high_risk_df['risk_score'].mean():.2f}")
    else:
        print(f"No claims with risk score >= {min_risk_score} found.")


def analyze_anomalies(claims_df: pd.DataFrame) -> dict:
    """
    Analyze anomaly detection results and provide summary statistics.
    
    Args:
        claims_df: DataFrame with anomaly detection results (output from detect_anomalies)
    
    Returns:
        Dictionary containing anomaly analysis summary
    """
    if 'anomaly_flag' not in claims_df.columns:
        raise ValueError("DataFrame must contain anomaly_flag column. Run detect_anomalies first.")
    
    total_claims = len(claims_df)
    anomaly_count = claims_df['anomaly_flag'].sum()
    normal_count = total_claims - anomaly_count
    
    # Calculate statistics for anomalies vs normal claims
    anomaly_stats = claims_df[claims_df['anomaly_flag'] == 1]['claim_amount'].describe()
    normal_stats = claims_df[claims_df['anomaly_flag'] == 0]['claim_amount'].describe()
    
    # Hospital-level anomaly analysis
    hospital_anomalies = claims_df.groupby('hospital_id').agg({
        'anomaly_flag': ['count', 'sum'],
        'claim_amount': 'mean'
    }).round(2)
    
    hospital_anomalies.columns = ['total_claims', 'anomaly_count', 'avg_claim_amount']
    hospital_anomalies['anomaly_rate'] = (hospital_anomalies['anomaly_count'] / 
                                        hospital_anomalies['total_claims'] * 100).round(2)
    
    return {
        'total_claims': total_claims,
        'anomaly_count': anomaly_count,
        'normal_count': normal_count,
        'anomaly_rate_percent': round(anomaly_count / total_claims * 100, 2),
        'anomaly_amount_stats': anomaly_stats,
        'normal_amount_stats': normal_stats,
        'hospital_anomaly_analysis': hospital_anomalies.sort_values('anomaly_rate', ascending=False)
    }


def export_anomaly_report(claims_df: pd.DataFrame, output_path: str = 'anomaly_report.csv') -> None:
    """
    Export anomaly detection results to CSV file.
    
    Args:
        claims_df: DataFrame with anomaly detection results
        output_path: Path for the output CSV file
    """
    if 'anomaly_flag' not in claims_df.columns:
        raise ValueError("DataFrame must contain anomaly_flag column. Run detect_anomalies first.")
    
    # Filter for anomalies only
    anomalies_df = claims_df[claims_df['anomaly_flag'] == 1].copy()
    
    if not anomalies_df.empty:
        anomalies_df.to_csv(output_path, index=False)
        print(f"Anomaly report exported to {output_path}")
        print(f"Total anomalies found: {len(anomalies_df)}")
        print(f"Total anomalous amount: ${anomalies_df['claim_amount'].sum():,.2f}")
    else:
        print("No anomalies detected.")


if __name__ == "__main__":
    # Example usage
    print("Healthcare Claims Anomaly Detection")
    print("=" * 40)
    
    # Create sample data for demonstration
    np.random.seed(42)
    n_claims = 1000
    
    sample_data = {
        'hospital_id': np.random.choice([f'HOSP_{i:03d}' for i in range(1, 21)], n_claims),
        'claim_amount': np.random.lognormal(mean=7, sigma=1, size=n_claims)  # Log-normal distribution
    }
    
    # Add some obvious anomalies
    sample_data['claim_amount'][:20] = np.random.uniform(50000, 100000, 20)  # High amount anomalies
    
    claims_df = pd.DataFrame(sample_data)
    
    # Run anomaly detection
    print("Running anomaly detection...")
    claims_with_anomalies = detect_anomalies(claims_df)
    
    # Analyze results
    analysis = analyze_anomalies(claims_with_anomalies)
    
    print("\nAnomaly Detection Results:")
    print("-" * 30)
    print(f"Total claims: {analysis['total_claims']}")
    print(f"Anomalies detected: {analysis['anomaly_count']}")
    print(f"Normal claims: {analysis['normal_count']}")
    print(f"Anomaly rate: {analysis['anomaly_rate_percent']}%")
    
    print(f"\nAnomaly amount statistics:")
    print(f"Mean: ${analysis['anomaly_amount_stats']['mean']:,.2f}")
    print(f"Max: ${analysis['anomaly_amount_stats']['max']:,.2f}")
    
    print(f"\nNormal amount statistics:")
    print(f"Mean: ${analysis['normal_amount_stats']['mean']:,.2f}")
    print(f"Max: ${analysis['normal_amount_stats']['max']:,.2f}")
    
    # Export report
    print("\nExporting anomaly report...")
    export_anomaly_report(claims_with_anomalies, 'claims_anomaly_report.csv')
