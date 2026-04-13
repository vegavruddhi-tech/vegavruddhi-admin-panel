from dotenv import load_dotenv
load_dotenv()
from fastapi import FastAPI, Query
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Any
import pandas as pd
import time
import threading
# import gspread
from oauth2client.service_account import ServiceAccountCredentials
import subprocess
import threading

# from connect_sheet import load_sheet
from clean_duplicates import clean_duplicate_columns
from smart_column_detection import smart_detect_columns
from handle_missing_values import handle_missing_values
from convert_data_types import convert_data_types
from feature_engineering import feature_engineering
# from history_store import merge_with_history

# -----------------------------
# CREATE FASTAPI APP
# -----------------------------
app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# -----------------------------
# DATA SOURCE TOGGLE
# "google_sheet" — fetch from Google Sheets (current default)
# "database"     — fetch from database (plug in your DB loader below when ready)
# -----------------------------
DATA_SOURCE = "database"

# MongoDB connection for April+ data
import os
from pymongo import MongoClient
import certifi

MONGO_URI = os.environ.get("MONGO_URI", "")

# Months that exist in Google Sheets — anything else falls back to MongoDB
# SHEET_MONTHS = {"January 2026", "February 2026", "March 2026"}
SHEET_MONTHS = set()

def load_from_mongodb_for_month(month_label: str) -> pd.DataFrame:
    print(f"[Debug] MONGO_URI set: {bool(MONGO_URI)}, loading: {month_label}")
    if not MONGO_URI:
        return pd.DataFrame()


    try:
        client = MongoClient(MONGO_URI, tlsCAFile=certifi.where(), serverSelectionTimeoutMS=5000)
        db     = client["CompanyDB"]

        # Parse month label to date range
        from datetime import datetime
        import calendar
        parts = month_label.split()  # e.g. ['April', '2026']
        if len(parts) != 2:
            return pd.DataFrame()
        month_num = list(calendar.month_name).index(parts[0])
        year      = int(parts[1])
        start     = datetime(year, month_num, 1)
        end_day   = calendar.monthrange(year, month_num)[1]
        end       = datetime(year, month_num, end_day, 23, 59, 59)

        forms = list(db["Forms_respones"].find({
            "createdAt": {"$gte": start, "$lte": end}
        }))

        if not forms:
            client.close()
            return pd.DataFrame()

        tl_docs = list(db["TeamLeads"].find({"status": "Active"}, {"email": 1, "emailId": 1, "name": 1}))
        def is_name(val):
            return val and '@' not in val and not val.replace('.','').isdigit()

        canonical_tls = []
        for t in tl_docs:
            for field in ['emailId', 'email', 'name']:
                val = (t.get(field) or "").strip()
                if is_name(val):
                    canonical_tls.append(val)
                    break
        canonical_tls = list(set(canonical_tls))


        def match_tl(raw_name):
            if not raw_name:
                return "Unknown"
            raw_lower = raw_name.strip().lower()
            for tl in canonical_tls:
                if tl.lower() == raw_lower:
                    return tl
            for tl in canonical_tls:
                if tl.lower() in raw_lower or raw_lower in tl.lower():
                    return tl
            return None


        users = list(db["Users"].find({}, {"newJoinerName": 1, "reportingManager": 1}))
        fse_to_tl = {}
        for u in users:
            name = (u.get("newJoinerName") or "").strip()
            tl   = match_tl(u.get("reportingManager") or "")
            if tl is not None:
                fse_to_tl[name] = tl

        client.close()
        rows = []
        for f in forms:
            # product = f.get("formFillingFor", "") or ""
            product = f.get("tideProduct") or f.get("formFillingFor") or f.get("brand") or ""
            status  = f.get("status", "")
            name    = f.get("employeeName", f.get("customerName", "Unknown"))
            tl      = f.get("employeeName", "Unknown")  # employee is the TL equivalent
            created = f.get("createdAt")
            month   = month_label

            row = {
                "Name":             f.get("employeeName", ""),
                "Employee status":  "Active",
                "TL": fse_to_tl.get((f.get("employeeName") or "").strip(), ""),


                # "Email ID":         f.get("newJoinerEmailId", ""),
                "Email ID": f.get("employeeName", ""),

                # "Employee status":  f.get("status", "Active"),
                "_month":           month,
                "_source":          "mongodb",
                # Product columns — 1 if this form was for that product
                "Tide":        1 if product.lower() == "tide" else 0,
                "Tide MSME":   1 if product in ("MSME", "Tide MSME") else 0,
                "Tide Insurance": 1 if product in ("Tide Insurance",) else 0,
                "Tide Credit Card": 1 if product in ("Tide Credit Card", "Credit Card") else 0,


                # "Airtel Payments Bank": 1 if product == "Airtel Payments Bank" else 0,
                # "Kotak 811":        1 if product == "Kotak 811" else 0,
                # "Insurance":        1 if product == "Insurance" else 0,
                # "PineLab":          1 if product == "PineLab" else 0,
                # "Credit Card":      1 if product == "Credit Card" else 0,
                # "Bharat Pay":       1 if product == "Bharat Pay" else 0,
                # Visit status
                "Total_Meetings_Calc": 1,  # each form = 1 meeting/visit

                "Visit_Status":     status,
                "Ready_Onboarding": 1 if status == "Ready for Onboarding" else 0,
                "Not_Interested":   1 if status == "Not Interested" else 0,
                "Need_Revisit":     1 if status == "Need to visit again" else 0,
                "Try_Error":        1 if status == "Try but not done due to error" else 0,
            }
            # Add date column for meeting trend (use createdAt date as column name)
            if created:
                date_col = created.strftime("%Y-%m-%d")
                row[date_col] = 1
            rows.append(row)
                # Add all registered FSEs (even those with no forms)
        fse_names_with_forms = set(f.get("employeeName", "").strip() for f in forms)
        for u in users:
            name = (u.get("newJoinerName") or "").strip()
            if not name or name in fse_names_with_forms:
                continue
            tl = match_tl(u.get("reportingManager") or "")
            rows.append({
                "Name": name, "Email ID": name,
                "Employee status": "Working", "Employment type": "FSE",
                "TL": tl or "", "_month": month_label, "_source": "mongodb",
                "Total_Meetings_Calc": 0, "Total_Product_Sales": 0,
                "Tide": 0, "Tide Insurance": 0, "Tide MSME": 0,
                "Airtel Payments Bank": 0, "Kotak 811": 0,
                "Insurance": 0, "PineLab": 0, "Credit Card": 0, "Bharat Pay": 0,
                "Visit_Status": "", "Ready_Onboarding": 0,
                "Not_Interested": 0, "Need_Revisit": 0, "Try_Error": 0,
            })

        df = pd.DataFrame(rows)
        print(f"[MongoDB] Loaded {len(df)} rows for {month_label}")
        return df

        df = pd.DataFrame(rows)
        print(f"[MongoDB] Loaded {len(df)} rows for {month_label}")
        return df

    except Exception as e:
        print(f"[MongoDB] Error loading {month_label}: {e}")
        return pd.DataFrame()


def load_from_database() -> pd.DataFrame:
    """
    Load from MongoDB — used as fallback for months not in Google Sheets.
    Returns DataFrame in same schema as Google Sheets data.
    """
    # Get all available months from MongoDB
    if not MONGO_URI:
        return pd.DataFrame()
    try:
        client = MongoClient(MONGO_URI, tlsCAFile=certifi.where(), serverSelectionTimeoutMS=5000)
        db     = client["CompanyDB"]
        # Get distinct months from Forms_respones
        pipeline = [
            {"$group": {
                "_id": {
                    "year":  {"$year":  "$createdAt"},
                    "month": {"$month": "$createdAt"}
                }
            }},
            {"$sort": {"_id.year": 1, "_id.month": 1}}
        ]
        months_raw = list(db["Forms_respones"].aggregate(pipeline))


        import calendar
        dfs = []
        for m in months_raw:
            year  = m["_id"]["year"]
            month = m["_id"]["month"]
            label = f"{calendar.month_name[month]} {year}"
            if label not in SHEET_MONTHS:
                df = load_from_mongodb_for_month(label)
                if not df.empty:
                    dfs.append(df)

        # return pd.concat(dfs, ignore_index=True) if dfs else pd.DataFrame()
        result = pd.concat(dfs, ignore_index=True) if dfs else pd.DataFrame()
        client.close()
        return result

    except Exception as e:
        print(f"[MongoDB] Error: {e}")
        return pd.DataFrame()


# def load_raw_data() -> pd.DataFrame:
#     """
#     Load data from Google Sheets AND MongoDB, merge them.
#     Sheet data covers Jan-March, MongoDB covers April onwards.
#     """
#     sheet_df = pd.DataFrame()
#     mongo_df = pd.DataFrame()

#     # Always load sheet data (Jan-March)
#     # try:
#     #     sheet_df = load_sheet()
#     #     print(f"[Sheet] Loaded {len(sheet_df)} rows")
#     # except Exception as e:
#     #     print(f"[Sheet] Error: {e}")
#     sheet_df = pd.DataFrame()
#     print("[Sheet] Skipped — using MongoDB only")

#     # Load MongoDB data for months not in sheet
#     try:
#         mongo_df = load_from_database()
#         if not mongo_df.empty:
#             print(f"[MongoDB] Loaded {len(mongo_df)} rows for new months")
#     except Exception as e:
#         print(f"[MongoDB] Error: {e}")

#     # Merge both sources
#     if not sheet_df.empty and not mongo_df.empty:
#         combined = pd.concat([sheet_df, mongo_df], ignore_index=True)
#         print(f"[Combined] Total {len(combined)} rows")
#         return combined
#     elif not sheet_df.empty:
#         return sheet_df
#     elif not mongo_df.empty:
#         return mongo_df
#     else:
#         return pd.DataFrame()
def load_raw_data() -> pd.DataFrame:
    """
    Load data ONLY from MongoDB
    """
    try:
        mongo_df = load_from_database()

        if not mongo_df.empty:
            print(f"[MongoDB] Loaded {len(mongo_df)} rows")
            return mongo_df
        else:
            print("[MongoDB] No data found")
            return pd.DataFrame()

    except Exception as e:
        print(f"[MongoDB] Error: {e}")
        return pd.DataFrame()

# -----------------------------
# ONBOARD COLUMN CONFIG — update here when monthly condition changes
# -----------------------------
ONBOARD_COLUMN_BY_MONTH = {
    "January 2026":  "Tide OB with PP",
    "February 2026": "Tide OB with PP",
    "March 2026":    "Tide OB with PP + 5K QR Load + 4 Txns",
    # MongoDB months — use Ready_Onboarding column
    "April 2026":    "Ready_Onboarding",
    "May 2026":      "Ready_Onboarding",
    "June 2026":     "Ready_Onboarding",
    "July 2026":     "Ready_Onboarding",
    "August 2026":   "Ready_Onboarding",
    "September 2026":"Ready_Onboarding",
    "October 2026":  "Ready_Onboarding",
    "November 2026": "Ready_Onboarding",
    "December 2026": "Ready_Onboarding",
}
DEFAULT_ONBOARD_COLUMN = "Tide"  # fallback


# -----------------------------
# CACHE VARIABLES
# -----------------------------
cached_data = None
last_update = 0

# Force reload on startup so combined FSE + Old working data is picked up
CACHE_DURATION = 300  # seconds (5 minutes)


# -----------------------------
# TEST ROUTE
# -----------------------------
@app.get("/")
def home():
    return {"message": "FSE Dashboard API Running"}



@app.get("/cron/sync-sheets")
def cron_sync():
    try:
        threading.Thread(
            target=lambda: subprocess.run(["python", "sync_sheet.py"]),
            daemon=True
        ).start()

        return {"status": "Sync started"}
    except Exception as e:
        return {"status": "Error", "error": str(e)}

# -----------------------------
# DATA PIPELINE FUNCTION
# -----------------------------
def get_clean_data():

    try:

        df = load_raw_data()

        df = clean_duplicate_columns(df)

        # Merge with historical data so previous months are preserved
        # df = merge_with_history(df)

        numeric_cols, text_cols, date_cols = smart_detect_columns(df)

        df = handle_missing_values(df, numeric_cols, text_cols)

        df = convert_data_types(df, numeric_cols, date_cols)

        df, daily_trend, monthly_meetings, tl_performance, total_meetings, product_columns, product_totals, product_groups = feature_engineering(
            df, numeric_cols, date_cols
        )

        return (
            df,
            daily_trend,
            monthly_meetings,
            tl_performance,
            total_meetings,
            product_columns,
            product_totals,
            product_groups
        )

    except Exception as e:

        print("Pipeline Error:", e)

        return pd.DataFrame(), [], {}, {}, 0, [], {}, {}


# -----------------------------
# CACHE HANDLER
# -----------------------------
_refresh_lock = threading.Lock()

def _refresh_cache():
    """Run the full pipeline and update the cache. Thread-safe."""
    global cached_data, last_update
    df, daily_trend, monthly_meetings, tl_performance, total_meetings, product_columns, product_totals, product_groups = get_clean_data()
    if isinstance(df, pd.DataFrame) and df.empty:
        return
    with _refresh_lock:
        cached_data = {
            "raw": df.to_dict(orient="records"),
            "meeting_trend": daily_trend,
            "monthly_meetings": monthly_meetings,
            "tl_performance": tl_performance,
            "total_meetings": float(total_meetings),
            "product_columns": product_columns,
            "product_totals": product_totals,
            "product_groups": product_groups,
            "onboard_column_by_month": ONBOARD_COLUMN_BY_MONTH,
            "default_onboard_column": DEFAULT_ONBOARD_COLUMN,
            "data_source": DATA_SOURCE,
        }
        last_update = time.time()
    print(f"[Cache] Refreshed — {len(cached_data['raw'])} rows")


def get_cached_data():
    global cached_data, last_update
    now = time.time()
    stale = cached_data is None or (now - last_update) > CACHE_DURATION
    if stale:
        if cached_data is None:
            # First load — must block until we have data
            _refresh_cache()
        else:
            # Stale but we have data — refresh in background, return old data instantly
            threading.Thread(target=_refresh_cache, daemon=True).start()
    return cached_data or {}


# -----------------------------
# DASHBOARD DATA API
# -----------------------------
@app.get("/data")
def get_dashboard_data():
    return get_cached_data()


# -----------------------------
# SHEET UPDATE API
# -----------------------------
class UpdateRequest(BaseModel):
    email: str          # identify row by Email ID
    column: str         # column name to update
    value: Any          # new value

def get_sheet_client():
    scope = [
        "https://spreadsheets.google.com/feeds",
        "https://www.googleapis.com/auth/drive"
    ]
    creds_json = os.environ.get("GOOGLE_CREDENTIALS_JSON")
    if creds_json:
        import json
        creds = ServiceAccountCredentials.from_json_keyfile_dict(json.loads(creds_json), scope)
    else:
        creds = ServiceAccountCredentials.from_json_keyfile_name("credentials.json", scope)
    client = gspread.authorize(creds)
    return client.open("VV - Day Working (Responses)").worksheet("FSE")

@app.post("/update-row")
def update_row(req: UpdateRequest):
    try:
        ws = get_sheet_client()
        all_values = ws.get_all_values()

        # Row 3 (index 2) is the header row (0-indexed)
        header_row = all_values[2]

        # Find column index
        if req.column not in header_row:
            return {"success": False, "error": f"Column '{req.column}' not found in sheet"}
        col_idx = header_row.index(req.column) + 1  # gspread is 1-indexed

        # Find Email ID column
        if "Email ID" not in header_row:
            return {"success": False, "error": "Email ID column not found"}
        email_col_idx = header_row.index("Email ID") + 1

        # Data starts at row 4 (index 3), so sheet row = index + 4
        target_row = None
        for i, row in enumerate(all_values[3:], start=4):
            if len(row) >= email_col_idx and row[email_col_idx - 1] == req.email:
                target_row = i
                break

        if target_row is None:
            return {"success": False, "error": f"Email '{req.email}' not found in sheet"}

        ws.update_cell(target_row, col_idx, req.value)

        # Invalidate cache so next fetch gets fresh data
        global cached_data, last_update
        cached_data = None
        last_update = 0

        return {"success": True, "row": target_row, "col": col_idx}

    except Exception as e:
        return {"success": False, "error": str(e)}


# -----------------------------
# RUN SERVER
# -----------------------------
if __name__ == "__main__":
    import uvicorn
    # Warm cache in background so first request is instant
    threading.Thread(target=get_cached_data, daemon=True).start()
    uvicorn.run("api_server:app", host="127.0.0.1", port=8001, reload=False)
