import subprocess
import os
import sys
from datetime import datetime

def handler(request):
    from sync_sheet import process_sheet
    import os

    print("===== CRON TRIGGERED =====")

    sheet_id = os.environ.get("1XD1x9VeyGbGnCKw2w8pAlsf6zoxs59OSKxpRDcgmZ6U")

    try:
        process_sheet(sheet_id, "Tide Onboarding")
        print("SYNC SUCCESS")
        return {"statusCode": 200, "body": "Sync successful"}
    except Exception as e:
        print("SYNC ERROR:", str(e))
        return {"statusCode": 500, "body": str(e)}