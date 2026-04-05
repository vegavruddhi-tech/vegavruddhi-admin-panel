import subprocess
from datetime import datetime

def handler(request):
    print("CRON TRIGGERED:", datetime.utcnow())
    subprocess.run(["python", "sync_sheet.py"])
    return {
        "statusCode": 200,
        "body": "Cron executed"
    }