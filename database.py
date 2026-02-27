import sqlite3

def create_database(df_beneficiaries, df_claims):
    """
    Creates SQLite database with beneficiaries and claims tables.
    Overwrites existing tables safely.
    """

    conn = sqlite3.connect("database.db")

    # Write beneficiaries table
    df_beneficiaries.to_sql(
        "beneficiaries",
        conn,
        if_exists="replace",
        index=False
    )

    # Write claims table (includes is_fraud_injected column)
    df_claims.to_sql(
        "claims",
        conn,
        if_exists="replace",
        index=False
    )

    conn.commit()
    conn.close()

    print("Database created successfully with beneficiaries and claims tables.")