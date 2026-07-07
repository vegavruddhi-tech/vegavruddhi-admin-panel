import os
import re
import certifi
import logging
import pandas as pd
from datetime import datetime, timezone
from pymongo import MongoClient
from dotenv import load_dotenv

# Setup logging
logging.basicConfig(level=logging.INFO, format="%(asctime)s - %(levelname)s - %(message)s")

# Load environment variables
load_dotenv()

SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
EXCEL_FILE = os.path.join(os.path.dirname(SCRIPT_DIR), 'fse-dashboard', 'Old onboarding data - Tide jan-feb-march.xlsx')
MONGO_URI = os.getenv("MONGO_URI")

if not MONGO_URI:
    raise ValueError("❌ Missing MONGO_URI in .env")

if not os.path.exists(EXCEL_FILE):
    raise FileNotFoundError(f"❌ Excel file not found at: {EXCEL_FILE}")

logging.info(f"📂 Loading Excel File: {EXCEL_FILE}")

# Connect to MongoDB
mongo_client = MongoClient(MONGO_URI, tlsCAFile=certifi.where())
db = mongo_client['CompanyDB']
collection = db['Forms_respones']

# Build employee name to ID lookup
logging.info("🔍 Loading employees for name-to-ID matching...")
emp_map = {}
for col_name in ['employees', 'Employees', 'teamleads', 'TeamLeads', 'team_leads']:
    try:
        for emp in db[col_name].find({}):
            name = emp.get('newJoinerName') or emp.get('name') or emp.get('fullName')
            if name and emp.get('_id'):
                emp_map[str(name).strip().lower()] = emp['_id']
    except Exception as e:
        pass

logging.info(f"👥 Loaded {len(emp_map)} employee names for ID mapping.")

def normalize_phone(val):
    if pd.isna(val) or not val:
        return None
    digits = re.sub(r'\D', '', str(val))
    return digits[-10:] if len(digits) >= 10 else None

def find_column(columns, keywords, exclude_keywords=[]):
    for col in columns:
        col_lower = str(col).lower()
        if any(ex in col_lower for ex in exclude_keywords):
            continue
        if any(kw in col_lower for kw in keywords):
            return col
    return None

# Load Excel sheets
sheets = pd.read_excel(EXCEL_FILE, sheet_name=None)
logging.info(f"📑 Found {len(sheets)} sheet tabs: {list(sheets.keys())}")

total_found = 0
total_inserted = 0
total_skipped_existing = 0
total_skipped_invalid = 0

for tab_name, df in sheets.items():
    logging.info(f"\n==========================================")
    logging.info(f"▶️ Processing Sheet Tab: '{tab_name}' ({len(df)} rows)")
    logging.info(f"   Columns: {list(df.columns)}")
    
    if df.empty:
        continue
        
    cols = list(df.columns)
    phone_col = find_column(cols, ['customer phone', 'merchant phone', 'phone', 'mobile', 'contact', 'number', 'no.'], exclude_keywords=['employee', 'tl', 'leader', 'agent'])
    name_col = find_column(cols, ['customer name', 'merchant', 'customer', 'shop', 'business', 'name'], exclude_keywords=['employee', 'tl', 'leader', 'agent', 'card'])
    emp_col = find_column(cols, ['employee name', 'fse', 'agent', 'employee', 'fo', 'submitted by', 'user', 'rep'], exclude_keywords=['email', 'phone', 'leader', 'tl'])
    loc_col = find_column(cols, ['location', 'city', 'address', 'state', 'area', 'district'])
    date_col = find_column(cols, ['submitted on', 'date', 'created', 'timestamp', 'time', 'day', 'month', 'submitted'])
    status_col = find_column(cols, ['visit status', 'status', 'stage', 'remarks', 'state'], exclude_keywords=['verification'])
    product_col = find_column(cols, ['product', 'brand', 'tide'])
    verif_col = find_column(cols, ['verification status', 'verified'])
    
    logging.info(f"   Mapped Columns -> Phone: '{phone_col}' | Merchant: '{name_col}' | Employee: '{emp_col}' | Location: '{loc_col}' | Date: '{date_col}' | Product: '{product_col}'")
    
    if not phone_col:
        logging.warning(f"⚠️ No phone column found in tab '{tab_name}'. Skipping tab.")
        continue

    # Determine default month timestamp based on tab name if date parsing fails
    tab_lower = tab_name.lower()
    if 'jan' in tab_lower:
        default_date = datetime(2026, 1, 15, 10, 0, 0)
    elif 'feb' in tab_lower:
        default_date = datetime(2026, 2, 15, 10, 0, 0)
    elif 'mar' in tab_lower:
        default_date = datetime(2026, 3, 15, 10, 0, 0)
    else:
        default_date = datetime(2026, 2, 1, 10, 0, 0)
        
    for idx, row in df.iterrows():
        total_found += 1
        phone = normalize_phone(row.get(phone_col))
        if not phone:
            total_skipped_invalid += 1
            continue
            
        merchant_name = str(row.get(name_col)).strip() if name_col and not pd.isna(row.get(name_col)) else f"Merchant ({phone})"
        emp_name = str(row.get(emp_col)).strip() if emp_col and not pd.isna(row.get(emp_col)) else "Historical FSE"
        location = str(row.get(loc_col)).strip() if loc_col and not pd.isna(row.get(loc_col)) else "Not Specified"
        
        product_val = str(row.get(product_col)).strip() if product_col and not pd.isna(row.get(product_col)) else "Tide"
        if not product_val or product_val.lower() == 'nan':
            product_val = "Tide"
            
        status_val = str(row.get(status_col)).strip() if status_col and not pd.isna(row.get(status_col)) else "Ready for Onboarding"
        if not status_val or status_val.lower() == 'nan':
            status_val = "Ready for Onboarding"
            
        verif_val = str(row.get(verif_col)).strip() if verif_col and not pd.isna(row.get(verif_col)) else "Not Found"
        if not verif_val or verif_val.lower() == 'nan':
            verif_val = "Not Found"
        
        # Parse date
        record_date = default_date
        if date_col and not pd.isna(row.get(date_col)):
            val = row.get(date_col)
            try:
                parsed = pd.to_datetime(val, errors='coerce')
                if not pd.isna(parsed):
                    record_date = parsed.to_pydatetime()
            except Exception:
                pass
                
        # Check duplicate in MongoDB by phone + historical flag
        existing = collection.find_one({
            "customerNumber": phone,
            "isHistoricalImport": True
        })
        
        if existing:
            total_skipped_existing += 1
            continue
            
        # Match employee ID
        submitted_by_id = emp_map.get(emp_name.lower())
        
        doc = {
            "customerName": merchant_name,
            "customerNumber": phone,
            "employeeName": emp_name,
            "location": location,
            "status": status_val,
            "formFillingFor": product_val,
            "brand": product_val,
            "tideProduct": product_val,
            "tide_qrPosted": str(row.get('Tide QR Posted', 'Yes')).strip() if not pd.isna(row.get('Tide QR Posted')) else "Yes",
            "tide_upiTxnDone": str(row.get('Tide UPI Txn Done', 'Yes')).strip() if not pd.isna(row.get('Tide UPI Txn Done')) else "Yes",
            "createdAt": record_date,
            "verificationStatus": verif_val,
            "verificationChecks": {"status": verif_val, "points": 0},
            "isHistoricalImport": True,
            "importSource": "Old onboarding data - Tide jan-feb-march.xlsx",
            "importTab": tab_name,
            "importedAt": datetime.now(timezone.utc)
        }
        
        if submitted_by_id:
            doc["submittedBy"] = submitted_by_id
            
        collection.insert_one(doc)
        total_inserted += 1

logging.info(f"\n==========================================")
logging.info(f"✅ IMPORT SUMMARY:")
logging.info(f"   Total Rows Processed:   {total_found}")
logging.info(f"   Successfully Inserted:  {total_inserted}")
logging.info(f"   Skipped (Existing):     {total_skipped_existing}")
logging.info(f"   Skipped (Invalid/NoPh): {total_skipped_invalid}")
logging.info(f"==========================================")
