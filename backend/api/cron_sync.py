import subprocess
import os
import sys
from datetime import datetime

def handler(request):
    print("===== CRON TRIGGERED =====")
    print("UTC TIME:", datetime.utcnow())

    # Absolute path to sync_sheet.py
    script_path = os.path.join(os.path.dirname(__file__), "../sync_sheet.py")

    print("Running script:", script_path)

    try:
        subprocess.run([sys.executable, script_path])
        print("SYNC SCRIPT FINISHED")
    except Exception as e:
        print("ERROR RUNNING SCRIPT:", str(e))

    return {
        "statusCode": 200,
        "body": "Cron executed"
    }