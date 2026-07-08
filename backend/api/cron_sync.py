import subprocess
import os
import sys
import requests
import time
from datetime import datetime

def handler(request):
    from sync_sheet import process_sheet
    import os

    print("===== CRON TRIGGERED =====")
    print(f"Timestamp: {datetime.now().isoformat()}")

    sheet_id = os.environ.get("GOOGLE_SHEET_ID")
    
    if not sheet_id:
        print("ERROR: GOOGLE_SHEET_ID not found in environment variables")
        return {"statusCode": 500, "body": "GOOGLE_SHEET_ID not configured"}

    try:
        # Step 1: Sync Google Sheet → MongoDB (using Option 3: Clean slate sync)
        print(f"Step 1: Syncing sheet {sheet_id} (Option 3: Clean slate sync)")
        print("  - Delete old documents from MongoDB")
        print("  - Insert fresh data from Google Sheet")
        print("  - Result: MongoDB = exact mirror of Google Sheet")
        process_sheet(sheet_id, "Tide Onboarding")
        print("✅ SYNC SUCCESS (Option 3 completed - no duplicates)")
        
        # Step 1.5: Clear Redis verification cache (so pre-compute uses fresh data)
        print(f"\nStep 1.5: Clearing Redis verification cache")
        try:
            import redis
            r = redis.Redis(host='localhost', port=6379, db=0, decode_responses=True)
            
            # Clear all verification caches
            keys = r.keys('verification:*')
            if keys:
                r.delete(*keys)
                print(f"✅ Cleared {len(keys)} verification caches")
            else:
                print("ℹ️ No verification caches to clear")
            
            # Update timestamp to invalidate frontend cache
            r.set('verification_rules_updated_at', str(int(time.time() * 1000)))
            print("✅ Updated verification timestamp")
            
        except Exception as redis_error:
            print(f"⚠️ Redis cache clear failed: {redis_error}")
            print("   Continuing with pre-compute anyway...")
        
        # Step 2: Pre-compute verification cache
        api_url = os.environ.get('API_URL', 'https://vegavruddhi-employee-panel.vercel.app')
        precompute_url = f'{api_url}/api/verify/precompute-all?force=true'
        
        print(f"\nStep 2: Pre-computing verification cache")
        print(f"Calling: {precompute_url}")
        
        try:
            start_time = time.time()
            # Trigger precompute asynchronously with 3s timeout so backend continues calculation in background without blocking API response
            requests.post(precompute_url, timeout=3)
        except (requests.Timeout, requests.exceptions.ReadTimeout):
            print("✅ Pre-computation triggered successfully in background (running asynchronously)")
        except Exception as cache_error:
            print(f"⚠️ Pre-compute trigger note: {cache_error}")
        
        # Step 3: Sync unfilled forms (find merchants in Sheet but not in MongoDB)
        print(f"\nStep 3: Syncing unfilled forms")
        try:
            from sync_unfilled_forms import sync_unfilled_forms
            
            # Get current month and year
            now = datetime.now()
            current_month = now.strftime("%B")
            current_year = now.year
            
            print(f"Syncing unfilled forms for {current_month} {current_year}")
            
            result = sync_unfilled_forms(current_month, current_year)
            
            if result['success']:
                print(f"✅ UNFILLED FORMS SYNC SUCCESS")
                print(f"   Sheet entries: {result['sheetEntries']}")
                print(f"   MongoDB forms: {result['mongodbForms']}")
                print(f"   Unfilled forms: {result['unfilledForms']}")
                print(f"   Saved to DB: {result['savedCount']}")
            else:
                print(f"⚠️ UNFILLED FORMS SYNC FAILED: {result.get('error')}")
                
        except Exception as unfilled_error:
            print(f"⚠️ UNFILLED FORMS SYNC ERROR: {unfilled_error}")
            print("   Main sync completed but unfilled forms not synced")
        
        return {
            "statusCode": 200, 
            "body": "Sync, cache pre-computation, and unfilled forms sync completed"
        }
        
    except Exception as e:
        print("❌ SYNC ERROR:", str(e))
        import traceback
        traceback.print_exc()
        return {"statusCode": 500, "body": str(e)}