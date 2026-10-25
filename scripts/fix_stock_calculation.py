#!/usr/bin/env python3
"""
Fix stock calculation: only count APPROVED deliveries and damages,
not Confirm status (which are pending approval).
"""
from pathlib import Path

PATH = Path('/home/z/my-project/public/app.html')
src = PATH.read_text(encoding='utf-8')

old = 'if (DB.deliveries[di2].product === productName) delQty += (DB.deliveries[di2].qty || 0);'
new = "if (DB.deliveries[di2].product === productName && DB.deliveries[di2].status === 'Approved') delQty += (DB.deliveries[di2].qty || 0);"

count = src.count(old)
print(f'Found {count} occurrences of delivery count line')
src = src.replace(old, new)
print(f'Replaced all {count} occurrences')

old2 = 'if (DB.damages[dmi].product === productName) dmgQty += (DB.damages[dmi].qty || 0);'
new2 = "if (DB.damages[dmi].product === productName && DB.damages[dmi].status === 'Approved') dmgQty += (DB.damages[dmi].qty || 0);"

count2 = src.count(old2)
print(f'Found {count2} occurrences of damage count line')
src = src.replace(old2, new2)
print(f'Replaced all {count2} occurrences')

# Also fix the Adjustment count (in openAdjustmentModal and openDamageModal)
old3 = 'if (DB.deliveries[j].product === p.name) del += (DB.deliveries[j].qty || 0);'
new3 = "if (DB.deliveries[j].product === p.name && DB.deliveries[j].status === 'Approved') del += (DB.deliveries[j].qty || 0);"

count3 = src.count(old3)
print(f'Found {count3} occurrences of old-style delivery count')
src = src.replace(old3, new3)
print(f'Replaced all {count3} occurrences')

old4 = 'if (DB.deliveries[j].product === productName) delQty += (DB.deliveries[j].qty || 0);'
new4 = "if (DB.deliveries[j].product === productName && DB.deliveries[j].status === 'Approved') delQty += (DB.deliveries[j].qty || 0);"

count4 = src.count(old4)
print(f'Found {count4} occurrences of productName delivery count')
src = src.replace(old4, new4)
print(f'Replaced all {count4} occurrences')

PATH.write_text(src, encoding='utf-8')
print(f'\n✅ All stock calculations now only count Approved deliveries/damages.')
