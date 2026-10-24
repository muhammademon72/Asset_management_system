#!/usr/bin/env python3
"""
Update Adjustment and Damage modal save handlers:
- Replace `var product = firstValid.querySelector('[data-f="product"]').value;`
  with a version that strips the '||serial' suffix.

This change is identical for both Adjustment and Damage modal save handlers,
so we just replace both occurrences of the line.
"""
from pathlib import Path

PATH = Path('/home/z/my-project/public/app.html')
src = PATH.read_text(encoding='utf-8')

OLD = "      var product = firstValid.querySelector('[data-f=\"product\"]').value;"
NEW = ("      var productValue = firstValid.querySelector('[data-f=\"product\"]').value;\n"
       "      // The dropdown value may include a '||serial' suffix used for unique\n"
       "      // identification of each purchase row. Strip it to get the clean product name.\n"
       "      var product = stripProductSerialSuffix(productValue);")

count = src.count(OLD)
print(f'Found {count} occurrences of the line to replace.')
src = src.replace(OLD, NEW)
print(f'Replaced all {count} occurrences.')

PATH.write_text(src, encoding='utf-8')
print(f'✅ Wrote {PATH}')
