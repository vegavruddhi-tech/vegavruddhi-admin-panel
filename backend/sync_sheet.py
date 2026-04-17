import os, re, certifi, gspread, json, logging
from pymongo import MongoClient, UpdateOne, ASCENDING
from oauth2client.service_account import ServiceAccountCredentials
from datetime import datetime, timezone
from dotenv import load_dotenv
load_dotenv()
# ================= LOGGING =================
logging.basicConfig(level=logging.INFO, format="%(asctime)s - %(levelname)s - %(message)s")

# ================= CONFIG =================
SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
CREDENTIALS_FILE = os.path.join(SCRIPT_DIR, 'google_credentials.json')

MONGO_URI   = os.getenv("MONGO_URI")
SHEET_ID_1  = os.getenv("GOOGLE_SHEET_ID")

if not MONGO_URI or not SHEET_ID_1:
    raise ValueError("Missing ENV variables")

# ================= DB =================
mongo_client = MongoClient(MONGO_URI, tlsCAFile=certifi.where())
db = mongo_client['CompanyDB']

# ================= GOOGLE =================
scope = [
    'https://spreadsheets.google.com/feeds',
    'https://www.googleapis.com/auth/drive'
]

creds = ServiceAccountCredentials.from_json_keyfile_name(CREDENTIALS_FILE, scope)
gc = gspread.authorize(creds)

# ================= HELPERS =================

PHONE_COLS = ['phone', 'mobile', 'number', 'contact']
DATE_COLS = ['date', 'created', 'created_at', 'timestamp']

def clean_key(k):
    return re.sub(r'[^\w]', '_', str(k).strip().lower())

def normalize_phone(val):
    try:
        val = str(val)
        digits = re.sub(r'\D', '', val)
        return digits[-10:] if len(digits) >= 10 else None
    except:
        return None

def parse_date(val):
    try:
        return datetime.strptime(str(val)[:10], "%Y-%m-%d")
    except:
        return None

def is_current_month(dt):
    now = datetime.now()
    return dt and dt.month == now.month and dt.year == now.year

def tab_to_collection(name):
    return re.sub(r'\W+', '_', name.lower())

def ensure_index(collection):
    collection.create_index(
        [("phone", ASCENDING), ("_sheet", ASCENDING), ("_tab", ASCENDING)],
        unique=True
    )

# ================= CORE FUNCTION =================

def process_sheet(sheet_id, label):
    logging.info(f"🚀 Syncing Sheet: {label}")

    spreadsheet = gc.open_by_key(sheet_id)

    for ws in spreadsheet.worksheets():
        tab = ws.title
        col_name = tab_to_collection(tab)
        collection = db[col_name]

        ensure_index(collection)

        rows = ws.get_all_records()
        if not rows:
            logging.info(f"{tab} is empty, skipping...")
            continue

        headers = [clean_key(h) for h in rows[0].keys()]

        phone_col = next((h for h in headers if any(p in h for p in PHONE_COLS)), None)
        date_col  = next((h for h in headers if any(d in h for d in DATE_COLS)), None)

        logging.info(f"{tab} → phone_col: {phone_col}, date_col: {date_col}")

        # ================= GROUP BY PHONE =================
        latest_records = {}

        for row in rows:
            try:
                cleaned = {
                    clean_key(k): (v.strip() if isinstance(v, str) else v)
                    for k, v in row.items()
                }

                phone = normalize_phone(cleaned.get(phone_col)) if phone_col else None
                if not phone:
                    continue

                dt = parse_date(cleaned.get(date_col)) if date_col else None

                # Sync ALL rows — no month filter
                # (previously only synced current month, which caused April data to be missing)

                # Keep latest record per phone
                if phone not in latest_records:
                    latest_records[phone] = (dt, cleaned)
                else:
                    existing_dt = latest_records[phone][0]
                    if dt and (not existing_dt or dt > existing_dt):
                        latest_records[phone] = (dt, cleaned)

            except Exception as e:
                logging.error(f"Row processing error: {e}")

        # ================= UPSERT =================
        ops = []

        for phone, (dt, cleaned) in latest_records.items():
            try:
                cleaned['phone'] = phone
                cleaned['_sheet'] = label
                cleaned['_tab'] = tab
                cleaned['_synced_at'] = datetime.now(timezone.utc)

                filt = {
                    "phone": phone,
                    "_sheet": label,
                    "_tab": tab
                }

                ops.append(UpdateOne(filt, {"$set": cleaned}, upsert=True))

            except Exception as e:
                logging.error(f"Upsert prep error: {e}")

        if ops:
            try:
                result = collection.bulk_write(ops)
                logging.info(f"{tab} ✅ Inserted: {result.upserted_count}, Updated: {result.modified_count}")
            except Exception as e:
                logging.error(f"Bulk write error: {e}")

# ================= RUN =================
if __name__ == "__main__":
    try:
        process_sheet(SHEET_ID_1, "Tide Onboarding")
        logging.info("🎉 SYNC COMPLETED SUCCESSFULLY")
    except Exception as e:
        logging.error(f"🔥 Fatal error: {e}")
    finally:
        mongo_client.close()