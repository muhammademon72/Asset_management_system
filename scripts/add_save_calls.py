#!/usr/bin/env python3
"""
Add saveDBNow() calls to all save/update handlers that are missing them.
Since renderPage() no longer calls saveDB(), each action handler must call
saveDBNow() explicitly to persist changes to the server.
"""
import re
from pathlib import Path

PATH = Path('/home/z/my-project/public/app.html')
src = PATH.read_text(encoding='utf-8')

changes = []

# Pattern: find "closeModal(); showToast('XXX'); renderPage();" or
# "closeModal(); renderPage();" that is NOT followed by a saveDBNow call.
# We add saveDBNow(null, { skipMerge: true }) after renderPage().

# Each fix targets a unique string so we don't accidentally edit the wrong one.

fixes = [
    # Branch updated (line ~1043)
    ("closeModal(); showToast('Branch updated successfully'); renderPage();\n    });",
     "closeModal(); showToast('Branch updated successfully'); renderPage();\n    saveDBNow(null, { skipMerge: true });\n    });"),
    # Branch added (line ~1046)
    ("closeModal(); showToast('Branch added successfully'); renderPage();\n    });",
     "closeModal(); showToast('Branch added successfully'); renderPage();\n    saveDBNow(null, { skipMerge: true });\n    });"),
    # Employee updated (line ~1206)
    ("closeModal(); showToast('Employee updated'); renderPage();",
     "closeModal(); showToast('Employee updated'); renderPage(); saveDBNow(null, { skipMerge: true });"),
    # Employee added (line ~1207)
    ("closeModal(); showToast('Employee added'); renderPage();",
     "closeModal(); showToast('Employee added'); renderPage(); saveDBNow(null, { skipMerge: true });"),
    # Product added (line ~1460)
    ("closeModal(); showToast('Product added'); renderPage();",
     "closeModal(); showToast('Product added'); renderPage(); saveDBNow(null, { skipMerge: true });"),
    # Product updated (line ~1484)
    ("closeModal(); showToast('Product updated'); renderPage();",
     "closeModal(); showToast('Product updated'); renderPage(); saveDBNow(null, { skipMerge: true });"),
    # Supplier updated (line ~1667)
    ("closeModal(); showToast('Supplier updated'); renderPage();",
     "closeModal(); showToast('Supplier updated'); renderPage(); saveDBNow(null, { skipMerge: true });"),
    # Supplier added (line ~1670)
    ("closeModal(); showToast('Supplier added'); renderPage();",
     "closeModal(); showToast('Supplier added'); renderPage(); saveDBNow(null, { skipMerge: true });"),
    # Delivery updated (line ~2800)
    ("closeModal(); showToast('Delivery updated'); renderPage();",
     "closeModal(); showToast('Delivery updated'); renderPage(); saveDBNow(null, { skipMerge: true });"),
    # Adjustment updated (line ~3544)
    ("closeModal(); showToast('Adjustment updated'); renderPage();",
     "closeModal(); showToast('Adjustment updated'); renderPage(); saveDBNow(null, { skipMerge: true });"),
    # Adjustment added (line ~3552)
    ("closeModal(); showToast('Adjustment added'); renderPage();",
     "closeModal(); showToast('Adjustment added'); renderPage(); saveDBNow(null, { skipMerge: true });"),
    # Sell Proposal updated (line ~3988)
    ("closeModal(); showToast('Sell Proposal updated'); renderPage();",
     "closeModal(); showToast('Sell Proposal updated'); renderPage(); saveDBNow(null, { skipMerge: true });"),
    # Sell Proposal added (line ~3991)
    ("closeModal(); showToast('Sell Proposal added'); renderPage();",
     "closeModal(); showToast('Sell Proposal added'); renderPage(); saveDBNow(null, { skipMerge: true });"),
    # Invoice updated (line ~4291)
    ("closeModal(); showToast('Invoice updated'); renderPage();",
     "closeModal(); showToast('Invoice updated'); renderPage(); saveDBNow(null, { skipMerge: true });"),
    # Invoice added (line ~4294)
    ("closeModal(); showToast('Invoice added'); renderPage();",
     "closeModal(); showToast('Invoice added'); renderPage(); saveDBNow(null, { skipMerge: true });"),
    # Damage updated (line ~4554)
    ("closeModal(); showToast('Damage updated'); renderPage();",
     "closeModal(); showToast('Damage updated'); renderPage(); saveDBNow(null, { skipMerge: true });"),
    # Damage added (line ~4562)
    ("closeModal(); showToast('Damage added'); renderPage();",
     "closeModal(); showToast('Damage added'); renderPage(); saveDBNow(null, { skipMerge: true });"),
    # Transfer updated (line ~4776)
    ("closeModal(); showToast('Transfer updated'); renderPage();",
     "closeModal(); showToast('Transfer updated'); renderPage(); saveDBNow(null, { skipMerge: true });"),
    # Transfer added (line ~4779)
    ("closeModal(); showToast('Transfer added'); renderPage();",
     "closeModal(); showToast('Transfer added'); renderPage(); saveDBNow(null, { skipMerge: true });"),
    # Cash In added (line ~5802)
    ("closeModal(); showToast('Cash In added'); renderPage();",
     "closeModal(); showToast('Cash In added'); renderPage(); saveDBNow(null, { skipMerge: true });"),
    # Cash Out added
    ("closeModal(); showToast('Cash Out added'); renderPage();",
     "closeModal(); showToast('Cash Out added'); renderPage(); saveDBNow(null, { skipMerge: true });"),
]

for old, new in fixes:
    if old in src:
        src = src.replace(old, new, 1)  # replace only first occurrence
        changes.append(old.split("'")[1] if "'" in old else old[:60])
    # else: skip — might already have saveDBNow

PATH.write_text(src, encoding='utf-8')
print(f'\n✅ Applied {len(changes)} fixes:')
for c in changes:
    print(f'  ✓ {c}')
