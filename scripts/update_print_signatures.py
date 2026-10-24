#!/usr/bin/env python3
"""
Apply two changes to ALL print files in public/app.html:

  1. Add the logged-in user's full name (currentUser.name) ABOVE the
     "Prepared By" and "Approved By" signature lines.
  2. Rename "Customer Signature" → "Received Signature".

The logged-in user object lives in the same <script> scope as the print
functions (top-level `let currentUser = null;` at line 255), so every
print function can read it via closure.
"""
import re
import sys
from pathlib import Path

PATH = Path('/home/z/my-project/public/app.html')
src = PATH.read_text(encoding='utf-8')

# --- Name div that goes ABOVE the sign-line ------------------------------
# Inline-styled so it works in every print window's standalone HTML/CSS.
NAME_DIV = (
    '<div style="font-size:12px;font-weight:600;color:#1a2e1a;'
    'margin-bottom:4px;text-align:center;">'
    "' + ((currentUser && currentUser.name) ? currentUser.name : '') + '"
    '</div>'
)

# --- Replacements --------------------------------------------------------
# Each tuple = (label_to_find, new_label_text). We replace the inner
# <div class="sign-line">LABEL</div> with NAME_DIV + <div class="sign-line">LABEL</div>
# Only for Prepared By and Approved By (per user instruction).
REPLACEMENTS = [
    ('Prepared By', 'Prepared By'),
    ('Approved By', 'Approved By'),
]

before = src

for old_label, new_label in REPLACEMENTS:
    # Pattern: <div class="sign-line">old_label</div>
    # We only target sign-boxes containing this exact label.
    pattern = re.compile(
        r'(<div class="sign-box">)<div class="sign-line">' + re.escape(old_label) + r'</div>(</div>)'
    )
    # Build replacement: same outer wrappers + NAME_DIV + sign-line with new label
    replacement = (
        r'\1' + NAME_DIV + r'<div class="sign-line">' + new_label + r'</div>\2'
    )
    src, n = pattern.subn(replacement, src)
    print(f'  [{old_label} → {new_label}] replaced {n} occurrences')

# --- Change "Customer Signature" → "Received Signature" -------------------
# This label appears inside <div class="sign-line">Customer Signature</div>
# in 2 print functions: printQuotation (line 3414) and printInvoice (line 3739).
pat_cs = re.compile(r'<div class="sign-line">Customer Signature</div>')
src, n_cs = pat_cs.subn('<div class="sign-line">Received Signature</div>', src)
print(f'  [Customer Signature → Received Signature] replaced {n_cs} occurrences')

# --- Stats ---------------------------------------------------------------
delta = len(src) - len(before)
print(f'\nNet size delta: +{delta} bytes')

# --- Verify no orphan Customer Signature left ---------------------------
remaining_cs = src.count('Customer Signature')
print(f'Remaining "Customer Signature" occurrences: {remaining_cs}')
if remaining_cs != 0:
    print('  ⚠️ Expected 0 remaining — investigate before saving!')
    sys.exit(1)

# --- Write ---------------------------------------------------------------
PATH.write_text(src, encoding='utf-8')
print(f'\n✅ Wrote {PATH} ({len(src):,} bytes)')
