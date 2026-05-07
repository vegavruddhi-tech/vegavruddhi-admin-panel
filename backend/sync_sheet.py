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
if not MONGO_URI or not SHEET_ID_1:
    raise ValueError("Missing ENV variables")

# ================= DB =================
# ================= DB =================
mongo_client = MongoClient(MONGO_URI, tlsCAFile=certifi.where())
db = mongo_client['CompanyDB']

# ================= GOOGLE =================
scope = [
    'https://spreadsheets.google.com/feeds',
    'https://www.googleapis.com/auth/drive',
    'https://www.googleapis.com/auth/calendar',  
    'https://www.googleapis.com/auth/calendar.events'  

]

# Try to load credentials from environment variable first (for Vercel deployment)
creds_json = os.getenv('GOOGLE_CREDENTIALS_JSON')
if creds_json:
    logging.info("📝 Loading Google credentials from environment variable")
    try:
        creds_dict = json.loads(creds_json)
        creds = ServiceAccountCredentials.from_json_keyfile_dict(creds_dict, scope)
        logging.info("✅ Google credentials loaded from environment variable")
    except json.JSONDecodeError as e:
        logging.error(f"❌ Failed to parse GOOGLE_CREDENTIALS_JSON: {e}")
        raise ValueError("Invalid GOOGLE_CREDENTIALS_JSON format")
else:
    # Fallback to file (for local development)
    logging.info("📝 Loading Google credentials from file (local development)")
    if not os.path.exists(CREDENTIALS_FILE):
        raise FileNotFoundError(
            f"Google credentials file not found at {CREDENTIALS_FILE}. "
            "Please set GOOGLE_CREDENTIALS_JSON environment variable or create the credentials file."
        )
    creds = ServiceAccountCredentials.from_json_keyfile_name(CREDENTIALS_FILE, scope)
    logging.info("✅ Google credentials loaded from file")

gc = gspread.authorize(creds)

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

        # ── Process ALL rows (no filtering) ──────────────────────────────
        # This ensures new columns are added to ALL existing documents
        ops = []
        processed_count = 0
        skipped_count = 0

        for row in rows:
            try:
                # Clean and normalize row data
                cleaned = {
                    clean_key(k): (v.strip() if isinstance(v, str) else v)
                    for k, v in row.items()
                    if k and str(k).strip()
                }
                cleaned = {k: v for k, v in cleaned.items() if k and k.strip('_')}

                # Extract phone number
                phone = normalize_phone(cleaned.get(phone_col)) if phone_col else None
                if not phone:
                    skipped_count += 1
                    continue

                # Generate fingerprint for duplicate detection
                fp = row_fingerprint(cleaned, cat_fields)

                # Add metadata fields
                cleaned['phone']      = phone
                cleaned['_row_fp']    = fp
                cleaned['_sheet']     = label
                cleaned['_tab']       = tab
                cleaned['_synced_at'] = datetime.now(timezone.utc)

                # Upsert filter (same as before - maintains duplicate detection)
                filt = {
                    "phone":    phone,
                    "_row_fp":  fp,
                    "_sheet":   label,
                    "_tab":     tab
                }

                # Upsert operation - updates ALL fields including new columns
                ops.append(UpdateOne(filt, {"$set": cleaned}, upsert=True))
                processed_count += 1

            except Exception as e:
                logging.error(f"  Row processing error: {e}")
                skipped_count += 1

        logging.info(f"  {tab} → Processed: {processed_count}, Skipped: {skipped_count} (from {len(rows)} sheet rows)")

        # ── Bulk write to MongoDB ───────────────────────────────────────
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
        
        # Pre-compute verification after successful sync
        logging.info("\n" + "="*60)
        logging.info("STEP: Pre-computing verification for all forms")
        logging.info("="*60)
        
        import requests
        import time
        
        try:
            api_url = os.getenv('API_URL', 'https://vegavruddhi-employee-panel.vercel.app')
            logging.info(f"🚀 Calling pre-computation API: {api_url}/api/verify/precompute-all")
            
            start_time = time.time()
            response = requests.post(
                f'{api_url}/api/verify/precompute-all',
                timeout=600  # 10 minutes timeout
            )
            elapsed = time.time() - start_time
            
            if response.status_code == 200:
                data = response.json()
                logging.info(f"✅ Pre-computation complete in {elapsed:.1f}s")
                logging.info(f"   Total forms: {data.get('total', 0)}")
                logging.info(f"   Verified: {data.get('cached', 0)}")
                logging.info(f"   Skipped (unchanged): {data.get('skipped', 0)}")
            else:
                logging.warning(f"⚠️ Pre-computation failed: HTTP {response.status_code}")
                logging.warning(f"   Response: {response.text[:200]}")
                
        except requests.Timeout:
            logging.warning("⚠️ Pre-computation timeout (took > 10 minutes)")
        except Exception as e:
            logging.warning(f"⚠️ Pre-computation error: {e}")
            logging.warning("   Verification will still work, just won't be pre-cached")
            
    except Exception as e:
        logging.error(f"🔥 Fatal error: {e}")
    finally:
        mongo_client.close()
