#!/usr/bin/env python3
"""
Restore default DB to Turso — the user's data was accidentally overwritten
by a test POST. This script restores the default DB shape with the admin user.
"""
import urllib.request, json

TURSO_HTTP = 'https://assetmanagementsystem-muhammademon72.aws-ap-south-1.turso.io'
TURSO_TOKEN = 'eyJhbGciOiJFZERTQSIsInR5cCI6IkpXVCJ9.eyJhIjoicnciLCJpYXQiOjE3OTI5MzM1OTQsImlkIjoiMDFhMTVkZTgtNTQwMS03NzMyLWEwNzYtOTQ4MTk3MzI2NTFjIiwia2lkIjoiUHV4RTlyWXVaVmtqaVpMZlFRVUlTa0JlaU56RXNmdG5Xdmg5QTBib3Y5dyIsInJpZCI6Izc1ZjE4MjY5LTE1YjItNDkyNy1hY2QxLTk1ZDA3ZjM4NTY1ZiJ9.JAvUurOvyM2nfZ308s0dQGA17RJU_HIRv9NN4l_EYEHpDLVRoy45fJW-fwZdagAOdl4-pOfgNfIQ6-BxFMmFCg'

DEFAULT_DB = {
    "branches": [],
    "employees": [],
    "departments": [],
    "designations": [],
    "categories": [],
    "brands": [],
    "uoms": [],
    "products": [],
    "suppliers": [],
    "conditions": [{"id": 1, "name": "New", "status": "Active"}, {"id": 2, "name": "Used", "status": "Active"}, {"id": 3, "name": "Refurbished", "status": "Active"}],
    "warranties": [{"id": 1, "name": "No Warranty", "status": "Active"}, {"id": 2, "name": "1 Month", "status": "Active"}, {"id": 3, "name": "3 Months", "status": "Active"}, {"id": 4, "name": "6 Months", "status": "Active"}, {"id": 5, "name": "1 Year", "status": "Active"}, {"id": 6, "name": "2 Years", "status": "Active"}],
    "purchases": [],
    "deliveries": [],
    "adjustments": [],
    "damages": [],
    "transfers": [],
    "cashIn": [],
    "cashOut": [],
    "quotations": [],
    "invoices": [],
    "users": [
        {"id": 1, "name": "Admin User", "username": "admin", "email": "admin@itassets.com", "password": "admin123", "role": "Super Admin", "status": "Active"}
    ],
    "roles": [
        {"id": 1, "name": "Super Admin", "description": "Full system access — can do everything", "permissions": {"fullAccess": True}},
        {"id": 2, "name": "Admin", "description": "System administration — all modules except settings", "permissions": {"dashboard": ["view","add","edit","delete","export","import","print"], "branch": ["view","add","edit","delete","export","import"], "employee": ["view","add","edit","delete","export","import"], "product": ["view","add","edit","delete","export","import"], "purchase": ["view","add","edit","delete","export","import","print"], "inventory": ["view","add","edit","delete","export","print"], "cashbook": ["view","add","edit","delete","export"], "approval": ["view","add","edit","print"], "report": ["view","print","export"], "settings": ["view"]}},
        {"id": 3, "name": "Manager", "description": "Branch-level management — operations + reports", "permissions": {"dashboard": ["view"], "branch": ["view"], "employee": ["view","add","edit","export","import"], "product": ["view","add","edit","export","import"], "purchase": ["view","add","edit","export","print"], "inventory": ["view","add","edit","print"], "cashbook": ["view","add","edit","export"], "approval": ["view","add","edit","print"], "report": ["view","print","export"]}},
        {"id": 4, "name": "General User", "description": "Daily operations — limited to assigned tasks", "permissions": {"dashboard": ["view"], "branch": ["view"], "employee": ["view"], "product": ["view"], "purchase": ["view","add","export"], "inventory": ["view","add","print"], "cashbook": ["view","add"], "report": ["view","print"]}},
        {"id": 5, "name": "Viewer", "description": "Read-only access — can view reports and data", "permissions": {"dashboard": ["view"], "report": ["view","print"]}}
    ],
    "company": {"name": "", "address": "", "phone": "", "email": "", "website": ""},
}

json_str = json.dumps(DEFAULT_DB)
print(f'Restoring DB ({len(json_str)} bytes)...')

body = json.dumps({
    'statements': [{"q": "UPDATE app_data SET data = ?, updated_at = datetime('now') WHERE id = ?", "params": [json_str, "main"]}]
}).encode('utf-8')
req = urllib.request.Request(TURSO_HTTP, data=body, headers={'Authorization': f'Bearer {TURSO_TOKEN}', 'Content-Type': 'application/json'}, method='POST')
with urllib.request.urlopen(req, timeout=15) as resp:
    result = json.loads(resp.read().decode('utf-8'))
    print('UPDATE result:', result[0]['results']['rows_affected'])

# Check if row exists
body2 = json.dumps({
    'statements': [{"q": "SELECT id FROM app_data WHERE id = ?", "params": ["main"]}]
}).encode('utf-8')
req2 = urllib.request.Request(TURSO_HTTP, data=body2, headers={'Authorization': f'Bearer {TURSO_TOKEN}', 'Content-Type': 'application/json'}, method='POST')
with urllib.request.urlopen(req2, timeout=15) as resp2:
    result2 = json.loads(resp2.read().decode('utf-8'))
    rows = result2[0]['results']['rows']
    if not rows:
        print('No row found — INSERTing...')
        body3 = json.dumps({
            'statements': [{"q": "INSERT INTO app_data (id, data, updated_at) VALUES (?, ?, datetime('now'))", "params": ["main", json_str]}]
        }).encode('utf-8')
        req3 = urllib.request.Request(TURSO_HTTP, data=body3, headers={'Authorization': f'Bearer {TURSO_TOKEN}', 'Content-Type': 'application/json'}, method='POST')
        with urllib.request.urlopen(req3, timeout=15) as resp3:
            print('INSERT done')

print('✅ Default DB restored — admin/admin123')
