#!/usr/bin/env python3
"""
Fix alignment issue in ALL print sign sections.

PROBLEM (per user screenshot):
- The .sign container is a flexbox row of .sign-box children.
- Each .sign-box contains:
    [optional name div] + <div class="sign-line">LABEL</div>
- The .sign-line has `margin-top: 50px` or `margin-top: 60px`.
- Boxes WITHOUT a name div (Verified By, Received By, Received Signature,
  Reported By, Released By) render their .sign-line starting from the top
  of the box.
- Boxes WITH a name div render the name at the top + sign-line below.
- This means the signature LINES are not horizontally aligned across boxes.

FIX:
1. Rewrite every .sign-line CSS rule to:
     .sign-line { border-top: 1px solid #6b7c6b; padding-top: 6px;
                  font-size: 11px; color: #6b7c6b; }
   (Remove the margin-top — instead, push the line to the bottom via flexbox.)
2. Rewrite every .sign-box CSS rule to:
     .sign-box { flex: 1; text-align: center;
                 display: flex; flex-direction: column; justify-content: flex-end;
                 min-height: 80px; }
   This makes each .sign-box a flex container that pushes its content to
   the BOTTOM. Now the signature line is at the bottom of each box,
   and the optional name div sits above it.
3. Result: all signature LINES are aligned at the bottom of the .sign row.
   The name appears above the line in boxes that have a name, and the
   empty space is just blank above the line for boxes without a name.
"""
import re
from pathlib import Path

PATH = Path('/home/z/my-project/public/app.html')
src = PATH.read_text(encoding='utf-8')

# --- Pattern 1: .sign-line CSS rules with margin-top:NNpx ----------------
# Two variants exist:
#   (a) Inline-block CSS:  '.sign-line { margin-top: 50px; border-top: ... }'
#   (b) Concatenated CSS:  '.sign { margin-top: 50px; ... } .sign-box { ... } .sign-line { margin-top: 60px; ... }'
# We need to normalize ALL .sign-line rules to drop margin-top, AND ensure
# every .sign-box rule gets the flex column / justify-end / min-height.

# Step A: replace any '.sign-line { margin-top: NNpx; border-top: ... }' pattern.
# Handles both single-line and inline (concatenated) variants.
sign_line_pattern = re.compile(
    r'\.sign-line\s*\{\s*margin-top:\s*\d+px;\s*'
    r'border-top:\s*1px\s+solid\s+#6b7c6b;\s*'
    r'padding-top:\s*6px;\s*font-size:\s*11px;\s*color:\s*#6b7c6b;\s*\}'
)
NEW_SIGN_LINE = (
    '.sign-line { border-top: 1px solid #6b7c6b; padding-top: 6px; '
    'font-size: 11px; color: #6b7c6b; }'
)
src, n1 = sign_line_pattern.subn(NEW_SIGN_LINE, src)
print(f'  Replaced .sign-line CSS rules: {n1} occurrences')

# Step B: replace every '.sign-box { flex: 1; text-align: center; }' with
# the flex-column version that pushes content to the bottom.
sign_box_pattern = re.compile(
    r'\.sign-box\s*\{\s*flex:\s*1;\s*text-align:\s*center;\s*\}'
)
NEW_SIGN_BOX = (
    '.sign-box { flex: 1; text-align: center; '
    'display: flex; flex-direction: column; justify-content: flex-end; '
    'min-height: 80px; }'
)
src, n2 = sign_box_pattern.subn(NEW_SIGN_BOX, src)
print(f'  Replaced .sign-box CSS rules: {n2} occurrences')

# Step C: Some print functions use a DIFFERENT .sign-line rule that
# includes 'body { padding: 0; }' or extra clauses. Look for any remaining
# .sign-line rule that still has margin-top and normalize it.
remaining = re.findall(r'\.sign-line\s*\{[^}]*margin-top:\s*\d+px[^}]*\}', src)
if remaining:
    print(f'  ⚠️  Found {len(remaining)} remaining .sign-line rules with margin-top:')
    for r in remaining[:3]:
        print(f'    {r[:120]}...')
    # Generic fallback: strip margin-top:NNpx; from any .sign-line rule
    src = re.sub(
        r'(\.sign-line\s*\{[^}]*?)margin-top:\s*\d+px;\s*',
        r'\1',
        src
    )
    print('  → stripped margin-top from any remaining .sign-line rules')

# --- Verify --------------------------------------------------------------
leftover = re.findall(r'\.sign-line\s*\{[^}]*margin-top[^}]*\}', src)
print(f'\nRemaining .sign-line rules with margin-top: {len(leftover)}')

# --- Write ---------------------------------------------------------------
PATH.write_text(src, encoding='utf-8')
print(f'\n✅ Wrote {PATH} ({len(src):,} bytes)')
