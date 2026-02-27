# Ayushman Bharat PM-JAY Fraud Detection Agent 🏥🛡️

An intelligent, real-time claim monitoring and anomaly detection system specifically designed to safeguard the **Ayushman Bharat Pradhan Mantri Jan Arogya Yojana (PM-JAY)** scheme from medical billing fraud.

![Dashboard Preview](./vigilant-ab-guard/public/placeholder.svg) *(Note: Replace with actual screenshot)*

## 🌟 The Problem
The PM-JAY scheme provides a health cover of ₹5 Lakhs per family per year for secondary and tertiary care hospitalization. However, the system is vulnerable to various forms of fraud, including:
- **Ghost Billing:** Hospitals charging for services never rendered or patients who were never admitted.
- **Upcoding:** Billing for a more expensive procedure than the one actually performed (e.g., billing for an MRI when only an X-ray was done).
- **Price Anomalies:** Charging statistically anomalous amounts for standard procedures.
- **Cash Bribes:** Illegally demanding out-of-pocket cash payments from beneficiaries for cashless covered treatments.

## 🚀 Our Solution
This agent acts as a vigilant sentinel, analyzing medical claims in real-time, enforcing PM-JAY constraints, and empowering patients to protect their entitlements.

### Key Features
1. **Real-time Risk Scoring Engine:** Analyzes incoming claims against historical data and PM-JAY specific constraints, assigning a comprehensive risk score (0-100) based on severity, financial impact, and historical hospital behavior.
2. **PM-JAY Scheme Alignment:** Strictly enforces the ₹5 Lakh annual family limit. Automatically flags any claim that attempts to overdraw a beneficiary's available wallet balance.
3. **Dynamic Anomaly Detection:** Utilizes interquartile range (IQR) statistical methods to detect price anomalies for specific PM-JAY procedure codes (e.g., CABG, Radiation Therapy, Joint Replacements) across different hospitals and tiers.
4. **Patient Protection Portal:** A dedicated frontend interface where beneficiaries can log in using their Ayushman Bharat ID (AB ID) to safely view their remaining family wallet balance and inspect their hospital claims ledger.
5. **Whistleblower Escalation:** Empowers patients to report fraudulent hospital behavior (like demanded bribes or ghost surgeries) directly from their portal. These reports are immediately escalated as **CRITICAL PRIORITY** alerts on the main administrator dashboard.
6. **Interactive Dashboard:** A comprehensive React-based UI providing government administrators with high-level KPIs, fraud distribution charts, geographical hazard maps, and a searchable ledger of flagged anomalies.

## 🛠️ Technology Stack
### Backend
- **Python (FastAPI):** High-performance, asynchronous REST API.
- **Pandas:** Real-time data manipulation, aggregation, and statistical anomaly detection.
- **Faker:** Generates highly realistic, localized Indian synthetic data (hospitals, names, demographics) bounded by accurate PM-JAY financial constraints.

### Frontend
- **React (Vite):** Blazing fast frontend rendering.
- **Tailwind CSS & Shadcn UI:** Modern, responsive, and glassmorphic aesthetic design.
- **Lucide React:** Beautiful, consistent iconography.
- **Recharts:** Interactive, animated data visualization for fraud trends.

## ⚙️ How to Run Locally

### Prerequisites
- Python 3.9+
- Node.js (v18+) & npm (or bun)

### 1. Start the Backend API
Navigate to the root directory and install Python dependencies, then start the FastAPI server:

```bash
# Install dependencies
pip install -r requirements.txt

# Start the uvicorn server (runs on http://localhost:8000)
python main.py
# OR
uvicorn main:app --reload
```

### 2. Start the Frontend Dashboard
Open a new terminal window, navigate to the `vigilant-ab-guard` directory, install Node dependencies, and start the Vite development server:

```bash
cd vigilant-ab-guard

# Install dependencies
npm install

# Start the dev server (runs on http://localhost:8080 or port specified by Vite)
npm run dev
```

### 3. Access the Application
- **Main Admin Dashboard:** `http://localhost:8080/`
- **Patient Portal:** `http://localhost:8080/portal`
- **Backend API Docs (Swagger):** `http://localhost:8000/docs`

## 📊 Analytics & Reporting
The system categorizes risk into four actionable tiers:
- **Low Risk (0-29):** Standard, expected billing. Automatically approved.
- **Medium Risk (30-59):** Minor anomalies or early warning signs. Marked for review.
- **High Risk (60-79):** Significant price deviations or matching known upcoding patterns. Payment pended pending investigation.
- **Critical Risk (80-100+):** Severe violations, wallet limit breaches, or direct patient whistleblower complaints. Immediate action required.

---
*Built to ensure healthcare reaches the vulnerable without leakage.*
