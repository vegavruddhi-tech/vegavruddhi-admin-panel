import os, gspread, certifi, json
from pymongo import MongoClient
from oauth2client.service_account import ServiceAccountCredentials
from dotenv import load_dotenv

load_dotenv()

# ================= CONFIG =================
SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
CREDENTIALS_FILE = os.path.join(SCRIPT_DIR, 'google_credentials.json')
MONGO_URI = os.getenv("MONGO_URI")
SHEET_ID = os.getenv("TIDEBT_SHEET_ID")  # Use the new variable


# ================= CONNECT TO MONGODB =================
mongo_client = MongoClient(MONGO_URI, tlsCAFile=certifi.where())
db = mongo_client['CompanyDB']
collection = db['TideBT_Access']

# ================= CONNECT TO GOOGLE SHEETS =================
scope = [
    'https://spreadsheets.google.com/feeds',
    'https://www.googleapis.com/auth/drive'
]

creds_json = os.getenv('GOOGLE_CREDENTIALS_JSON')
if creds_json:
    creds_dict = json.loads(creds_json)
    creds = ServiceAccountCredentials.from_json_keyfile_dict(creds_dict, scope)
else:
    creds = ServiceAccountCredentials.from_json_keyfile_name(CREDENTIALS_FILE, scope)

gc = gspread.authorize(creds)

# ================= IMPORT DATA =================
print("🚀 Starting Tide BT access import from 'PT 8' sheet...")

try:
    spreadsheet = gc.open_by_key(SHEET_ID)
    worksheet = spreadsheet.worksheet("PT 8")
    
    # Get all data
    data = worksheet.get_all_records()
    
    print(f"📋 Found {len(data)} rows in 'PT 8' sheet")
    
    # Show column names
    if data:
        print(f"📝 Column names in sheet: {list(data[0].keys())}")
        print(f"📝 First row sample: {data[0]}")
    
    # Clear existing data
    collection.delete_many({})
    print("🗑️  Cleared existing TideBT_Access collection")
    
    # Import data - PT 8 sheet has 2 columns: TL and FSC
    # TL name appears once, then multiple FSEs below it
    # We need to "carry forward" the TL name until a new TL appears
    imported = 0
    tl_fse_pairs = []
    current_tl = None  # Track the current TL
    
    for row in data:
        tl_name = row.get('TL', '').strip()
        fsc_name = row.get('FSC', '').strip()
        
        # If TL column has a value, update current TL
        if tl_name:
            current_tl = tl_name
            print(f"\n📌 TL: {current_tl}")
        
        # If FSC has a value and we have a current TL, create pair
        if fsc_name and current_tl:
            tl_fse_pairs.append({
                'tlName': current_tl,
                'fseName': fsc_name,
                'hasTideBTAccess': True
            })
            print(f"  ✅ FSE: {fsc_name}")
    
    # Insert all pairs
    if tl_fse_pairs:
        collection.insert_many(tl_fse_pairs)
        imported = len(tl_fse_pairs)
        print(f"\n✅ Imported {imported} TL-FSE pairs")
        
        # Show unique TLs and FSEs
        unique_tls = set(p['tlName'] for p in tl_fse_pairs)
        unique_fses = set(p['fseName'] for p in tl_fse_pairs)
        print(f"📊 Unique TLs: {len(unique_tls)}")
        print(f"📊 Unique FSEs: {len(unique_fses)}")
    
    print(f"\n🎉 SUCCESS! Imported {imported} records to TideBT_Access collection")
    print(f"📊 Total documents in collection: {collection.count_documents({})}")
    
except gspread.exceptions.WorksheetNotFound:
    print("❌ ERROR: Sheet 'PT 8' not found!")
    print("Available sheets:")
    for sheet in spreadsheet.worksheets():
        print(f"  - {sheet.title}")
except Exception as e:
    print(f"❌ ERROR: {e}")
finally:
    mongo_client.close()
