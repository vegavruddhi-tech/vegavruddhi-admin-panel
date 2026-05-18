#!/usr/bin/env python3
"""
Unfilled Forms Sync Script

Compares MongoDB collections (synced from Google Sheet) with FormResponse 
to find merchants who don't have forms filled by FSEs.

Usage:
    python sync_unfilled_forms.py --month May --year 2026
    python sync_unfilled_forms.py  (uses current month/year)
"""

import os, re, certifi, json, logging, hashlib, argparse
from pymongo import MongoClient, ASCENDING
from datetime import datetime, timezone
from dotenv import load_dotenv

load_dotenv()

# ================= LOGGING =================
logging.basicConfig(level=logging.INFO, format="%(asctime)s - %(levelname)s - %(message)s")

# ================= CONFIG =================
MONGO_URI = os.getenv("MONGO_URI")

if not MONGO_URI:
    raise ValueError("Missing MONGO_URI in environment variables")

# ================= VERIFICATION RULES =================
# Same rules as verify API - determines how to match merchants
VERIFICATION_RULES = {
    'tide': {
        'matchFields': ['phone', 'name'],
        'timeWindow': 'same_month'
    },
    'tide insurance': {
        'matchFields': ['phone', 'name'],
        'timeWindow': 'same_month'
    },
    'tide msme': {
        'matchFields': ['phone'],
        'timeWindow': 'same_month'
    },
    'tide credit card': {
        'matchFields': ['phone', 'name'],
        'timeWindow': 'same_month'
    },
    'tide bt': {
        'matchFields': ['phone', 'name'],
        'timeWindow': 'same_month'
    }
}

# ================= DB CONNECTION =================
mongo_client = MongoClient(MONGO_URI, tlsCAFile=certifi.where())
db = mongo_client['CompanyDB']
unfilled_forms_collection = db['UnfilledForms']

# ================= HELPER FUNCTIONS =================

def normalize_phone(val):
    """Extract last 10 digits from phone number"""
    try:
        digits = re.sub(r'\D', '', str(val))
        return digits[-10:] if len(digits) >= 10 else None
    except:
        return None

def normalize_text(val):
    """Normalize text for comparison"""
    return str(val).strip().lower() if val else ''

def get_verification_rule(product):
    """Get verification rule for a product"""
    product_key = normalize_text(product)
    return VERIFICATION_RULES.get(product_key, VERIFICATION_RULES['tide'])

def create_unique_key(phone, name, product, month, year):
    """Create unique key based on verification rules"""
    rule = get_verification_rule(product)
    normalized_phone = normalize_text(phone)
    normalized_product = normalize_text(product)
    normalized_month = normalize_text(month)
    
    if 'name' in rule['matchFields']:
        # Match by phone + name
        normalized_name = normalize_text(name)
        return f"{normalized_phone}_{normalized_name}_{normalized_product}_{normalized_month}_{year}"
    else:
        # Match by phone only
        return f"{normalized_phone}_{normalized_product}_{normalized_month}_{year}"

def read_sheet_data(month, year):
    """Read merchant data from MongoDB collections (synced from Google Sheet)
    
    Uses the SAME collections that verification rules use (e.g., tl_connect_may, insurance_may, msme_may)
    Also builds a phone-to-name lookup map for finding merchant names
    """
    logging.info(f"📊 Reading MongoDB collections (synced from Sheet) for {month} {year}...")
    
    # Get month abbreviation for collection matching (e.g., "may", "april")
    month_lower = month.lower()
    month_abbr = month[:3].lower()  # First 3 letters (e.g., "may", "apr")
    
    logging.info(f"  Looking for collections containing: '{month_lower}' or '{month_abbr}'")
    
    # Get verification rules to find which collections to read from
    verification_rules_collection = db['VerificationRules']
    verification_rules = list(verification_rules_collection.find({
        'active': {'$ne': False},
        'monthLabel': {'$regex': month, '$options': 'i'}
    }))
    
    # Extract unique collection names from verification rules
    rule_collections = list(set([rule['collectionName'] for rule in verification_rules if 'collectionName' in rule]))
    
    logging.info(f"  Found {len(rule_collections)} collections from verification rules: {rule_collections}")
    
    sheet_data = []
    phone_to_name_map = {}  # Build lookup map: phone -> name (prioritize non-empty names)
    
    # FIRST PASS: Build comprehensive phone-to-name map from ALL collections
    logging.info(f"  🔍 Building phone-to-name lookup map from all collections...")
    for collection_name in rule_collections:
        try:
            collection = db[collection_name]
            
            # Build query to filter by month (if 'month' field exists in collection)
            query = {}
            
            # Check if collection has 'month' field by sampling one document
            sample_doc = collection.find_one()
            if sample_doc and 'month' in sample_doc:
                # Filter by month field to get only current month's data
                query['month'] = month
            
            # Get documents from this collection (filtered by month if field exists)
            documents = list(collection.find(query))
            
            # Extract phone-to-name mappings
            for doc in documents:
                try:
                    # Extract phone (normalized to 10 digits)
                    phone = normalize_phone(doc.get('Mobile_No_', '') or doc.get('phone', '') or doc.get('Phone', '') or doc.get('Mobile', '') or doc.get('mobile_number', '') or doc.get('phone_number', ''))
                    if not phone:
                        continue
                    
                    # Extract name (try different field names - comprehensive list)
                    name = (doc.get('Lead', '') or 
                           doc.get('lead', '') or 
                           doc.get('Name', '') or 
                           doc.get('name', '') or 
                           doc.get('customer_name', '') or
                           doc.get('member_name', '') or  # insurance_may
                           doc.get('all_onboarding_businesses_member_full_name__red_', ''))  # msme_may
                    name = str(name).strip()
                    
                    # Build phone-to-name lookup map (prioritize non-empty names)
                    if phone and name:
                        # Only update if we don't have a name yet, or if new name is longer (likely more complete)
                        if phone not in phone_to_name_map or len(name) > len(phone_to_name_map[phone]):
                            phone_to_name_map[phone] = name
                    
                except Exception as e:
                    continue
        
        except Exception as e:
            logging.error(f"  Error building name map from {collection_name}: {e}")
            continue
    
    logging.info(f"  ✅ Built phone-to-name lookup map with {len(phone_to_name_map)} entries")
    
    # SECOND PASS: Build sheet_data with products
    for collection_name in rule_collections:
        logging.info(f"  ✅ Reading collection: {collection_name}")
        
        try:
            collection = db[collection_name]
            
            # Build query to filter by month (if 'month' field exists in collection)
            query = {}
            
            # Check if collection has 'month' field by sampling one document
            sample_doc = collection.find_one()
            if sample_doc and 'month' in sample_doc:
                # Filter by month field to get only current month's data
                query['month'] = month
                logging.info(f"    Filtering by month field: {month}")
            
            # Get documents from this collection (filtered by month if field exists)
            documents = list(collection.find(query))
            
            logging.info(f"    Found {len(documents)} documents in {collection_name}")
            
            # Process each document
            for doc in documents:
                try:
                    # Extract phone (normalized to 10 digits)
                    phone = normalize_phone(doc.get('Mobile_No_', '') or doc.get('phone', '') or doc.get('Phone', '') or doc.get('Mobile', '') or doc.get('mobile_number', '') or doc.get('phone_number', ''))
                    if not phone:
                        continue
                    
                    # Extract name (try different field names - comprehensive list)
                    name = (doc.get('Lead', '') or 
                           doc.get('lead', '') or 
                           doc.get('Name', '') or 
                           doc.get('name', '') or 
                           doc.get('customer_name', '') or
                           doc.get('member_name', '') or  # insurance_may
                           doc.get('all_onboarding_businesses_member_full_name__red_', ''))  # msme_may
                    name = str(name).strip()
                    
                    # 🔥 If name is empty, look it up from phone_to_name_map
                    if not name and phone in phone_to_name_map:
                        name = phone_to_name_map[phone]
                    
                    # Infer product from collection name
                    col_lower = collection_name.lower()
                    if 'msme' in col_lower:
                        product = 'Tide MSME'
                    elif 'insurance' in col_lower or 'ins' in col_lower:
                        product = 'Tide Insurance'
                    elif 'credit' in col_lower or 'cc' in col_lower:
                        product = 'Tide Credit Card'
                    elif 'bt' in col_lower:
                        product = 'Tide BT'
                    elif 'tl_connect' in col_lower or 'tlconnect' in col_lower:
                        product = 'Tide'
                    else:
                        product = 'Tide'
                    
                    sheet_data.append({
                        'phone': phone,
                        'name': name,
                        'product': product,
                        'month': month,
                        'year': year,
                        'sheetTab': collection_name,
                        'sheetRow': str(doc.get('_id'))  # Use MongoDB _id as reference
                    })
                    
                except Exception as e:
                    logging.error(f"    Error processing document in {collection_name}: {e}")
                    continue
        
        except Exception as e:
            logging.error(f"  Error reading collection {collection_name}: {e}")
            continue
    
    logging.info(f"✅ Found {len(sheet_data)} entries from MongoDB collections for {month} {year}")
    
    # Deduplicate by unique key (phone + name + product + month + year)
    seen_keys = set()
    deduplicated_data = []
    duplicates_removed = 0
    
    for entry in sheet_data:
        unique_key = create_unique_key(
            entry['phone'],
            entry['name'],
            entry['product'],
            entry['month'],
            entry['year']
        )
        
        if unique_key not in seen_keys:
            seen_keys.add(unique_key)
            deduplicated_data.append(entry)
        else:
            duplicates_removed += 1
    
    if duplicates_removed > 0:
        logging.info(f"  Removed {duplicates_removed} duplicate entries from sheet data")
    
    return deduplicated_data, phone_to_name_map

def read_mongodb_forms(month, year):
    """Read existing forms from MongoDB for specified month/year"""
    logging.info(f"📊 Reading MongoDB FormResponse for {month} {year}...")
    
    # Get month index
    months = ['January', 'February', 'March', 'April', 'May', 'June',
              'July', 'August', 'September', 'October', 'November', 'December']
    
    try:
        month_index = months.index(month)
    except ValueError:
        logging.error(f"Invalid month: {month}")
        return []
    
    # Date range for the specified month
    start_date = datetime(year, month_index + 1, 1)
    if month_index == 11:
        end_date = datetime(year + 1, 1, 1)
    else:
        end_date = datetime(year, month_index + 2, 1)
    
    logging.info(f"  Date range: {start_date} to {end_date}")
    
    # Query BOTH FormResponses (FSE) and TLFormResponses (TL) collections
    # Note: Collection names are case-sensitive in MongoDB
    form_response_collection = db['Forms_respones']  # FSE forms (note: typo in original collection name)
    tl_form_response_collection = db['TL Form Responses']  # TL forms
    
    # Query FSE forms
    fse_forms = list(form_response_collection.find({
        'createdAt': {'$gte': start_date, '$lt': end_date}
    }))
    
    logging.info(f"  Found {len(fse_forms)} FSE forms in 'Forms_respones' collection")
    
    # Query TL forms
    tl_forms = list(tl_form_response_collection.find({
        'createdAt': {'$gte': start_date, '$lt': end_date}
    }))
    
    logging.info(f"  Found {len(tl_forms)} TL forms in 'TL Form Responses' collection")
    
    # Combine both
    all_forms = fse_forms + tl_forms
    
    logging.info(f"✅ Total forms for {month} {year}: {len(all_forms)} (FSE: {len(fse_forms)}, TL: {len(tl_forms)})")
    return all_forms

def compare_and_find_missing(sheet_data, mongodb_forms, month, year, phone_to_name_map):
    """Compare Sheet data with MongoDB and find missing forms
    
    Simple matching by phone + product (normalized)
    Uses phone_to_name_map to fill in missing customer names
    Also detects when previously unfilled forms are now filled (filled_late)
    """
    logging.info(f"🔍 Comparing Sheet vs MongoDB to find unfilled forms...")
    
    # Normalize phone for comparison
    def normalize_phone_for_match(phone):
        """Normalize phone to last 10 digits"""
        digits = ''.join(filter(str.isdigit, str(phone)))
        return digits[-10:] if len(digits) >= 10 else digits
    
    def normalize_product_for_match(product):
        """Normalize product for comparison"""
        p = str(product).strip().lower()
        # Normalize variations
        if 'insurance' in p and 'tide' in p:
            return 'tide insurance'
        elif 'msme' in p:
            return 'tide msme'
        elif 'credit' in p and 'card' in p:
            return 'tide credit card'
        elif 'bt' in p and 'tide' in p:
            return 'tide bt'
        elif p == 'tide':
            return 'tide'
        return p
    
    # Build lookup dict from MongoDB forms: phone_product -> form details
    mongodb_matches = {}
    
    for form in mongodb_forms:
        phone = normalize_phone_for_match(form.get('customerNumber', ''))
        
        # Extract product using same priority as verification API
        product = (form.get('formFillingFor') or 
                  form.get('tideProduct') or 
                  form.get('brand', ''))
        product = normalize_product_for_match(product)
        
        if phone and product:
            match_key = f"{phone}_{product}"
            # Store form details for later use
            mongodb_matches[match_key] = {
                'formId': str(form.get('_id')),
                'employeeName': form.get('employeeName', ''),
                'createdAt': form.get('createdAt'),
                'customerName': form.get('customerName', ''),
                'customerNumber': form.get('customerNumber', '')
            }
    
    logging.info(f"  MongoDB has {len(mongodb_matches)} unique phone+product combinations")
    
    # 🔥 NEW: Check for previously unfilled forms that are now filled
    logging.info(f"  🔍 Checking for previously unfilled forms that are now filled...")
    unfilled_collection = db['UnfilledForms']
    existing_unfilled = list(unfilled_collection.find({
        'expectedMonth': month,
        'expectedYear': year,
        'status': 'unfilled'
    }))
    
    filled_late_count = 0
    for unfilled_form in existing_unfilled:
        phone = normalize_phone_for_match(unfilled_form.get('customerPhone', ''))
        product = normalize_product_for_match(unfilled_form.get('product', ''))
        match_key = f"{phone}_{product}"
        
        # If this unfilled form now has a matching submitted form, mark as filled_late
        if match_key in mongodb_matches:
            matched_form = mongodb_matches[match_key]
            unfilled_collection.update_one(
                {'_id': unfilled_form['_id']},
                {
                    '$set': {
                        'status': 'filled_late',
                        'filledFormId': matched_form['formId'],
                        'filledByEmployee': matched_form['employeeName'],
                        'filledAt': matched_form['createdAt'],
                        'syncedAt': datetime.now(timezone.utc)
                    }
                }
            )
            filled_late_count += 1
    
    if filled_late_count > 0:
        logging.info(f"  ✅ Marked {filled_late_count} unfilled forms as 'filled_late' (now have submissions)")
    
    # Find missing entries from sheet
    missing_forms = []
    names_filled_from_map = 0
    
    for entry in sheet_data:
        phone = normalize_phone_for_match(entry['phone'])
        product = normalize_product_for_match(entry['product'])
        
        if not phone or not product:
            continue
        
        match_key = f"{phone}_{product}"
        
        # If not found in MongoDB forms, it's unfilled
        if match_key not in mongodb_matches:
            rule = get_verification_rule(entry['product'])
            unique_key = create_unique_key(
                entry['phone'],
                entry['name'],
                entry['product'],
                entry['month'],
                entry['year']
            )
            
            # 🔥 FIX: Use phone_to_name_map to fill in missing names
            customer_name = entry['name']
            if not customer_name or customer_name.strip() == '':
                # Look up name from phone_to_name_map
                lookup_name = phone_to_name_map.get(phone, '')
                if lookup_name:
                    customer_name = lookup_name
                    names_filled_from_map += 1
            
            missing_forms.append({
                'customerPhone': entry['phone'],
                'customerName': customer_name,  # Use filled name
                'product': entry['product'],
                'expectedMonth': entry['month'],
                'expectedYear': entry['year'],
                'uniqueKey': unique_key,
                'verificationRule': rule,
                'sheetTabName': entry['sheetTab'],
                'sheetRowNumber': entry['sheetRow'],
                'assignedTo': 'Dheeraj Anand',
                'status': 'unfilled',
                'syncedAt': datetime.now(timezone.utc)
            })
    
    logging.info(f"⚠️ Found {len(missing_forms)} unfilled forms")
    logging.info(f"  📝 Filled {names_filled_from_map} missing names from phone lookup map")
    
    # Log breakdown by product
    product_breakdown = {}
    for form in missing_forms:
        p = form['product']
        product_breakdown[p] = product_breakdown.get(p, 0) + 1
    
    logging.info(f"  Breakdown by product:")
    for p, count in sorted(product_breakdown.items(), key=lambda x: x[1], reverse=True):
        logging.info(f"    {p}: {count} unfilled")
    
    return missing_forms

def save_to_mongodb(missing_forms):
    """Save unfilled forms to MongoDB"""
    if not missing_forms:
        logging.info("✅ No unfilled forms to save")
        return 0
    
    logging.info(f"💾 Saving {len(missing_forms)} unfilled forms to MongoDB...")
    
    # Delete old unfilled forms for this month/year (clean slate)
    if missing_forms:
        month = missing_forms[0]['expectedMonth']
        year = missing_forms[0]['expectedYear']
        delete_result = unfilled_forms_collection.delete_many({
            'expectedMonth': month,
            'expectedYear': year,
            'status': 'unfilled'
        })
        logging.info(f"  Deleted {delete_result.deleted_count} old unfilled forms")
    
    # Insert new unfilled forms
    try:
        result = unfilled_forms_collection.insert_many(missing_forms, ordered=False)
        logging.info(f"✅ Inserted {len(result.inserted_ids)} unfilled forms")
        return len(result.inserted_ids)
    except Exception as e:
        logging.error(f"❌ Error saving to MongoDB: {e}")
        return 0

# ================= MAIN FUNCTION =================

def sync_unfilled_forms(month, year):
    """Main sync function"""
    logging.info("="*60)
    logging.info(f"🚀 SYNCING UNFILLED FORMS FOR {month.upper()} {year}")
    logging.info("="*60)
    
    try:
        # Step 1: Read Google Sheet (returns tuple: sheet_data, phone_to_name_map)
        sheet_data, phone_to_name_map = read_sheet_data(month, year)
        
        # Step 2: Read MongoDB forms
        mongodb_forms = read_mongodb_forms(month, year)
        
        # Step 3: Compare and find missing (pass phone_to_name_map)
        missing_forms = compare_and_find_missing(sheet_data, mongodb_forms, month, year, phone_to_name_map)
        
        # Step 4: Save to MongoDB
        saved_count = save_to_mongodb(missing_forms)
        
        logging.info("="*60)
        logging.info(f"✅ SYNC COMPLETE")
        logging.info(f"   Sheet entries: {len(sheet_data)}")
        logging.info(f"   MongoDB forms: {len(mongodb_forms)}")
        logging.info(f"   Unfilled forms: {len(missing_forms)}")
        logging.info(f"   Saved to DB: {saved_count}")
        logging.info("="*60)
        
        return {
            'success': True,
            'sheetEntries': len(sheet_data),
            'mongodbForms': len(mongodb_forms),
            'unfilledForms': len(missing_forms),
            'savedCount': saved_count
        }
        
    except Exception as e:
        logging.error(f"❌ Sync failed: {e}")
        return {
            'success': False,
            'error': str(e)
        }

# ================= CLI =================

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description='Sync unfilled forms from Google Sheet')
    parser.add_argument('--month', type=str, help='Month name (e.g., May)')
    parser.add_argument('--year', type=int, help='Year (e.g., 2026)')
    
    args = parser.parse_args()
    
    # Use current month/year if not specified
    if not args.month or not args.year:
        now = datetime.now()
        month = now.strftime("%B")
        year = now.year
        logging.info(f"📅 No month/year specified, using current: {month} {year}")
    else:
        month = args.month
        year = args.year
    
    try:
        result = sync_unfilled_forms(month, year)
        
        if result['success']:
            logging.info("🎉 SUCCESS")
        else:
            logging.error(f"🔥 FAILED: {result.get('error')}")
            
    except Exception as e:
        logging.error(f"🔥 Fatal error: {e}")
    finally:
        mongo_client.close()
