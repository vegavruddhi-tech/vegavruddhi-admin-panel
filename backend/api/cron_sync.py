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
            response = requests.post(
                precompute_url,
                timeout=600  # 10 minutes timeout
            )
            elapsed = time.time() - start_time
            
            if response.status_code == 200:
                data = response.json()
                print(f"✅ CACHE PRE-COMPUTE SUCCESS in {elapsed:.1f}s")
                print(f"   Total forms: {data.get('total', 0)}")
                print(f"   Verified: {data.get('cached', 0)}")
                print(f"   Skipped (unchanged): {data.get('skipped', 0)}")
            else:
                print(f"⚠️ CACHE PRE-COMPUTE FAILED: HTTP {response.status_code}")
                print(f"   Response: {response.text[:200]}")
                
        except requests.Timeout:
            print("⚠️ CACHE PRE-COMPUTE TIMEOUT (took > 10 minutes)")
            print("   Sync completed but cache not pre-populated")
        except Exception as cache_error:
            print(f"⚠️ CACHE PRE-COMPUTE ERROR: {cache_error}")
            print("   Sync completed but cache not pre-populated")
        
        return {
            "statusCode": 200, 
            "body": "Sync and cache pre-computation completed"
        }
        
    except Exception as e:
        print("❌ SYNC ERROR:", str(e))
        import traceback
        traceback.print_exc()
        return {"statusCode": 500, "body": str(e)}