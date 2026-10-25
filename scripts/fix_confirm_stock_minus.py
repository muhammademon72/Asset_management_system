#!/usr/bin/env python3
"""
Change stock calculation: count both 'Approved' AND 'Confirm' status deliveries
when subtracting from stock. User wants: "Confirm korle Stock theke Minus hobe".
"""
from pathlib import Path

PATH = Path('/home/z/my-project/public/app.html')
src = PATH.read_text(encoding='utf-8')

# Pattern 1: "DB.deliveries[di2].status !== 'Approved'" in deliveredSerials building
old1 = "DB.deliveries[di2].status !== 'Approved'"
new1 = "(DB.deliveries[di2].status !== 'Approved' && DB.deliveries[di2].status !== 'Confirm')"

count1 = src.count(old1)
src = src.replace(old1, new1)
print(f'Fix 1: Replaced {count1} occurrences of delivery status check (di2 loop)')

# Pattern 2: "DB.deliveries[j].status === 'Approved'" in old-style delivery count
old2 = "DB.deliveries[j].status === 'Approved'"
new2 = "(DB.deliveries[j].status === 'Approved' || DB.deliveries[j].status === 'Confirm')"

count2 = src.count(old2)
src = src.replace(old2, new2)
print(f'Fix 2: Replaced {count2} occurrences of delivery status check (j loop)')

PATH.write_text(src, encoding='utf-8')
print(f'\n✅ Stock now subtracts both Approved AND Confirm status deliveries.')
