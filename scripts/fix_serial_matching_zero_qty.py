#!/usr/bin/env python3
"""
Fix serial-level matching: check for serial EXISTENCE in the map,
not its truthiness. A delivery with qty=0 still means the product was
delivered, so the serial should match.
"""
from pathlib import Path

PATH = Path('/home/z/my-project/public/app.html')
src = PATH.read_text(encoding='utf-8')

# Fix 1: Change the deliveredSerials map to use qty=1 minimum when serial exists
# This way, a delivery with qty=0 is still treated as "1 item delivered"
old1 = "deliveredSerials[delSerial] = (deliveredSerials[delSerial] || 0) + (DB.deliveries[di2].qty || 0);"
new1 = "deliveredSerials[delSerial] = (deliveredSerials[delSerial] || 0) + Math.max(DB.deliveries[di2].qty || 0, 1);"

count1 = src.count(old1)
src = src.replace(old1, new1)
print(f'Fix 1: Replaced {count1} occurrences of deliveredSerials assignment')

# Fix 2: Change the condition to check serial EXISTENCE, not truthiness
old2 = "if (prSerial && deliveredSerials[prSerial]) {"
new2 = "if (prSerial && (prSerial in deliveredSerials)) {"

count2 = src.count(old2)
src = src.replace(old2, new2)
print(f'Fix 2: Replaced {count2} occurrences of serial check condition')

PATH.write_text(src, encoding='utf-8')
print(f'\n✅ All serial matching now works even when delivery qty=0.')
