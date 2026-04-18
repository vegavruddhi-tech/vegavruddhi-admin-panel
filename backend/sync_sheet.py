import os, re, certifi, gspread, json, logging, hashlib
from pymongo import MongoClient, UpdateOne, ASCENDING
from oauth2client.service_account import ServiceAccountCredentials
from datetime import datetime, timezone
from dotenv import load_dotenv
load_dotenv()

# ================= LOGGING =================
logging.basicConfig(level=logging.INFO, format="%(asctime)s - %(levelname)s - %(message)s")

# ================= CONFIG =================
SCRIPT_DIR       = os.path.dirname(os.path.abspath(__file__))
CREDENTIALS_FILE = os.path.join(SCRIPT_DIR, 'google_credentials.json')

MONGO_URI  = os.getenv("MONGO_URI")
SHEET_ID_1 = os.getenv("GOOGLE_SHEET_ID")

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
gc    = gspread.authorize(creds)

# ================= HELPERS =================

PHONE_COLS = ['phone', 'mobile', 'number', 'contact']
DATE_COLS  = ['date', 'created', 'created_at', 'timestamp']

# Fields that are purely numeric/status — changes in these = UPDATE (not new record)
# Fields NOT in this list that differ = genuinely new record → INSERT
NUMERIC_KEYWORDS = [
    'amount', 'count', 'total', 'sum', 'load', 'txn', 'gap',
    'stage', 'upi', 'qr', 'pass', 'active', 'status', 'live',
    'today', 'yesterday', 'eligible', 'slab', 'points', 'earned'
]

def clean_key(k):
    return re.sub(r'[^\w]', '_', str(k).strip().lower())

def normalize_phone(val):
    try:
        digits = re.sub(r'\D', '', str(val))
        return digits[-10:] if len(digits) >= 10 else None
    except:
        return None

def parse_date(val):
    try:
        return datetime.strptime(str(val)[:10], "%Y-%m-%d")
    except:
        return None

def tab_to_collection(name):
    return re.sub(r'\W+', '_', name.lower())

def is_numeric_field(field_name):
    """Returns True if this field is a numeric/status field (changes = update, not new record)."""
    f = field_name.lower()
    return any(kw in f for kw in NUMERIC_KEYWORDS)

def get_categorical_fields(headers, phone_col, date_col):
    """
    Returns list of fields that are 'categorical' — i.e. their difference
    means a genuinely new record (not just an update of the same record).
    Excludes: phone, date, numeric/status fields, internal fields.
    """
    skip = {phone_col, date_col, 'phone', '_sheet', '_tab', '_synced_at', 'phone_number'}
    return [
        h for h in headers
        if h not in skip
        and not h.startswith('_')
        and not is_numeric_field(h)
    ]

def row_fingerprint(cleaned, categorical_fields):
    """
    Creates a hash of the categorical field values.
    Same phone + same fingerprint = same record (update).
    Same phone + different fingerprint = new record (insert).
    """
    key_parts = []
    for f in sorted(categorical_fields):
        val = str(cleaned.get(f, '')).strip().lower()
        key_parts.append(f"{f}:{val}")
    raw = "|".join(key_parts)
    return hashlib.md5(raw.encode()).hexdigest()[:12]

def ensure_index(collection):
    """
    Drops ALL old indexes (except _id_) and creates the correct new unique index:
    phone + _row_fp + _sheet + _tab

    This handles:
    - Old index: phone_1__sheet_1__tab_1
    - Old index: phone_1_plan_name_1__sheet_1__tab_1 (from earlier fix attempt)
    - Any other leftover indexes from previous sync versions
    """
    try:
        existing = collection.index_information()
        for index_name in list(existing.keys()):
            if index_name == '_id_':
                continue  # never drop the _id index
            try:
                collection.drop_index(index_name)
                logging.info(f"  Dropped old index '{index_name}' from {collection.name}")
            except Exception as e:
                logging.warning(f"  Could not drop index '{index_name}' from {collection.name}: {e}")
    except Exception as e:
        logging.warning(f"  Could not read indexes from {collection.name}: {e}")

    # Create the single correct unique index
    collection.create_index(
        [
            ("phone",    ASCENDING),
            ("_row_fp",  ASCENDING),
            ("_sheet",   ASCENDING),
            ("_tab",     ASCENDING),
        ],
        unique=True,
        name="phone_rowfp_sheet_tab_unique"
    )
    logging.info(f"  Created new index 'phone_rowfp_sheet_tab_unique' on {collection.name}")

# ================= CORE FUNCTION =================

def process_sheet(sheet_id, label):
    logging.info(f"🚀 Syncing Sheet: {label}")

    spreadsheet = gc.open_by_key(sheet_id)

    for ws in spreadsheet.worksheets():
        tab      = ws.title
        col_name = tab_to_collection(tab)
        collection = db[col_name]

        ensure_index(collection)

        rows = ws.get_all_records()
        if not rows:
            logging.info(f"  {tab} is empty, skipping...")
            continue

        headers   = [clean_key(h) for h in rows[0].keys()]
        phone_col = next((h for h in headers if any(p in h for p in PHONE_COLS)), None)
        date_col  = next((h for h in headers if any(d in h for d in DATE_COLS)), None)

        # Categorical fields — differences here = new record
        cat_fields = get_categorical_fields(headers, phone_col, date_col)

        logging.info(f"  {tab} → phone_col: {phone_col}, date_col: {date_col}")
        logging.info(f"  {tab} → categorical fields (new-record triggers): {cat_fields}")

        # ── Group by phone + fingerprint ──────────────────────────────
        # Key: (phone, fingerprint) → keep latest record for that combination
        latest_records = {}

        for row in rows:
            try:
                cleaned = {
                    clean_key(k): (v.strip() if isinstance(v, str) else v)
                    for k, v in row.items()
                    if k and str(k).strip()
                }
                cleaned = {k: v for k, v in cleaned.items() if k and k.strip('_')}

                phone = normalize_phone(cleaned.get(phone_col)) if phone_col else None
                if not phone:
                    continue

                dt = parse_date(cleaned.get(date_col)) if date_col else None

                # Fingerprint based on categorical fields
                fp = row_fingerprint(cleaned, cat_fields)
                key = (phone, fp)

                if key not in latest_records:
                    latest_records[key] = (dt, cleaned)
                else:
                    existing_dt = latest_records[key][0]
                    if dt and (not existing_dt or dt > existing_dt):
                        latest_records[key] = (dt, cleaned)

            except Exception as e:
                logging.error(f"  Row processing error: {e}")

        logging.info(f"  {tab} → {len(latest_records)} unique records to sync "
                     f"(from {len(rows)} sheet rows)")

        # ── Upsert ───────────────────────────────────────────────────
        ops = []

        for (phone, fp), (dt, cleaned) in latest_records.items():
            try:
                cleaned['phone']      = phone
                cleaned['_row_fp']    = fp          # fingerprint stored for reference
                cleaned['_sheet']     = label
                cleaned['_tab']       = tab
                cleaned['_synced_at'] = datetime.now(timezone.utc)

                filt = {
                    "phone":    phone,
                    "_row_fp":  fp,
                    "_sheet":   label,
                    "_tab":     tab
                }

                ops.append(UpdateOne(filt, {"$set": cleaned}, upsert=True))

            except Exception as e:
                logging.error(f"  Upsert prep error: {e}")

        if ops:
            try:
                result = collection.bulk_write(ops)
                logging.info(f"  {tab} ✅ Inserted: {result.upserted_count}, "
                             f"Updated: {result.modified_count}")
            except Exception as e:
                logging.error(f"  Bulk write error: {e}")

# ================= RUN =================
if __name__ == "__main__":
    try:
        process_sheet(SHEET_ID_1, "Tide Onboarding")
        logging.info("🎉 SYNC COMPLETED SUCCESSFULLY")
    except Exception as e:
        logging.error(f"🔥 Fatal error: {e}")
    finally:
        mongo_client.close()
