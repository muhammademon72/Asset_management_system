#!/usr/bin/env python3
"""Remove all default/sample entry data from DB, keeping structure & company blank."""
import re
from pathlib import Path

src = Path('/home/z/my-project/public/app.html')
text = src.read_text()

# Find the DB = { ... }; block
# Match starting at "// ==================== DATABASE ====================" comment line down to the closing "};" right before NAV comment
start_marker = '// ==================== DATABASE ====================\nconst DB = {'
nav_marker = '// ==================== NAVIGATION ===================='

start_idx = text.find(start_marker)
if start_idx == -1:
    print("ERROR: Could not find DB start marker")
    exit(1)

end_idx = text.find(nav_marker)
if end_idx == -1:
    print("ERROR: Could not find NAV marker")
    exit(1)

# Find the closing "};" of DB just before the NAV marker
# We want to replace everything from start_idx up to (but not including) the NAV comment
old_block = text[start_idx:end_idx]

new_block = '''// ==================== DATABASE ====================
const DB = {
  branches: [],
  employees: [],
  departments: [],
  designations: [],
  categories: [],
  brands: [],
  uoms: [],
  products: [],
  suppliers: [],
  conditions: [],
  warranties: [],
  purchases: [],
  deliveries: [],
  adjustments: [],
  damages: [],
  transfers: [],
  cashIn: [],
  cashOut: [],
  users: [],
  roles: [],
  company: { name: '', address: '', phone: '', email: '', website: '' }
};

'''

new_text = text[:start_idx] + new_block + text[end_idx:]
src.write_text(new_text)
print(f"OK: Replaced {len(old_block)} chars with {len(new_block)} chars")
print("All default entry data removed. All arrays are now empty. Company profile is blank.")
