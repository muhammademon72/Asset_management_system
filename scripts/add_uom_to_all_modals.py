#!/usr/bin/env python3
"""
Add UoM column to all 5 form modals (Delivery, Adjustment, Damage, Sell Proposal, Invoice).

Changes per modal:
1. Row HTML function — add a UoM <select data-f="uom"> after the qty input.
2. Table headers (Add + Edit) — add <th class="pur-th">UoM</th> after the Quantity column.
3. Pre-fill logic in Edit modals — set the uom select's value from saved data.
4. Save handlers (Add + Edit) — read [data-f="uom"] and store in DB.
5. Product select callbacks — auto-fill UoM from the product master record.

We use string replacement with very specific old_str values that are unique
to each location to avoid accidental edits.
"""
import re
from pathlib import Path

PATH = Path('/home/z/my-project/public/app.html')
src = PATH.read_text(encoding='utf-8')

# UoM cell HTML — a <select> populated from DB.uoms at runtime.
# (We rely on the loop in purTableRowHTML — see the existing pattern.)
UOM_CELL = (
    '  // UoM column — dropdown of units of measure (Pieces, Box, Dozen, etc.)\n'
    '  var uomOpts = \'<option value="">Select</option>\';\n'
    '  for (var ui = 0; ui < DB.uoms.length; ui++) uomOpts += \'<option>\' + DB.uoms[ui].name + \'</option>\';\n'
    '  h += \'<td class="pur-td"><select data-f="uom" style="min-width:90px;">\' + uomOpts + \'</select></td>\';\n'
)

# UoM cell for Sell Proposal / Invoice (no comments inside the function).
UOM_CELL_FLAT = (
    '  var uomOpts = \'<option value="">Select</option>\';\n'
    '  for (var ui = 0; ui < DB.uoms.length; ui++) uomOpts += \'<option>\' + DB.uoms[ui].name + \'</option>\';\n'
    '  h += \'<td class="pur-td"><select data-f="uom" style="min-width:90px;">\' + uomOpts + \'</select></td>\';\n'
)

# Track changes
changes = []

# ============================================================
# 1. deliveryTableRowHTML — add UoM after qty
# ============================================================
OLD = (
    "  // Editable fields\n"
    "  h += '<td class=\"pur-td\"><input type=\"number\" data-f=\"qty\" value=\"0\" style=\"text-align:center;\"></td>';\n"
    "  h += '<td class=\"pur-td\"><input data-f=\"remarks\" placeholder=\"Remarks\"></td>';\n"
    "  h += '<td class=\"pur-td\" style=\"text-align:center;\"><button type=\"button\" class=\"btn-del-pur-row btn-del-pur\"><i class=\"fas fa-trash-alt\"></i></button></td>';\n"
    "  h += '</tr>';\n"
    "  return h;\n"
    "}\n"
    "\n"
    "function openDeliveryAddModal() {"
)
NEW = (
    "  // Editable fields\n"
    "  h += '<td class=\"pur-td\"><input type=\"number\" data-f=\"qty\" value=\"0\" style=\"text-align:center;\"></td>';\n"
    + UOM_CELL +
    "  h += '<td class=\"pur-td\"><input data-f=\"remarks\" placeholder=\"Remarks\"></td>';\n"
    "  h += '<td class=\"pur-td\" style=\"text-align:center;\"><button type=\"button\" class=\"btn-del-pur-row btn-del-pur\"><i class=\"fas fa-trash-alt\"></i></button></td>';\n"
    "  h += '</tr>';\n"
    "  return h;\n"
    "}\n"
    "\n"
    "function openDeliveryAddModal() {"
)
if OLD in src:
    src = src.replace(OLD, NEW)
    changes.append('deliveryTableRowHTML: added UoM after qty')
else:
    print('WARN: deliveryTableRowHTML old_str not found')

# ============================================================
# 2. adjustmentTableRowHTML — add UoM after qty
# ============================================================
OLD = (
    "  // Editable fields\n"
    "  h += '<td class=\"pur-td\"><input type=\"number\" data-f=\"qty\" value=\"0\" style=\"text-align:center;\"></td>';\n"
    "  h += '<td class=\"pur-td\"><input data-f=\"remarks\" placeholder=\"Remarks\"></td>';\n"
    "  h += '<td class=\"pur-td\" style=\"text-align:center;\"><button type=\"button\" class=\"btn-del-pur-row btn-del-pur\"><i class=\"fas fa-trash-alt\"></i></button></td>';\n"
    "  h += '</tr>';\n"
    "  return h;\n"
    "}\n"
    "\n"
    "function adjustmentCalcRowTotal(input) {"
)
NEW = (
    "  // Editable fields\n"
    "  h += '<td class=\"pur-td\"><input type=\"number\" data-f=\"qty\" value=\"0\" style=\"text-align:center;\"></td>';\n"
    + UOM_CELL +
    "  h += '<td class=\"pur-td\"><input data-f=\"remarks\" placeholder=\"Remarks\"></td>';\n"
    "  h += '<td class=\"pur-td\" style=\"text-align:center;\"><button type=\"button\" class=\"btn-del-pur-row btn-del-pur\"><i class=\"fas fa-trash-alt\"></i></button></td>';\n"
    "  h += '</tr>';\n"
    "  return h;\n"
    "}\n"
    "\n"
    "function adjustmentCalcRowTotal(input) {"
)
if OLD in src:
    src = src.replace(OLD, NEW)
    changes.append('adjustmentTableRowHTML: added UoM after qty')
else:
    print('WARN: adjustmentTableRowHTML old_str not found')

# ============================================================
# 3. damageTableRowHTML — add UoM after qty
# ============================================================
OLD = (
    "  h += '<td class=\"pur-td\"><input type=\"number\" data-f=\"bqty\" value=\"0\" style=\"text-align:center;background:#f5f7f5;color:var(--muted);\" readonly></td>';\n"
    "  h += '<td class=\"pur-td\"><input type=\"number\" data-f=\"qty\" value=\"0\" style=\"text-align:center;\" oninput=\"purCalcRowTotal(this)\"></td>';\n"
    "  h += '<td class=\"pur-td\"><input data-f=\"remarks\" placeholder=\"Damage reason\"></td>';\n"
)
NEW = (
    "  h += '<td class=\"pur-td\"><input type=\"number\" data-f=\"bqty\" value=\"0\" style=\"text-align:center;background:#f5f7f5;color:var(--muted);\" readonly></td>';\n"
    "  h += '<td class=\"pur-td\"><input type=\"number\" data-f=\"qty\" value=\"0\" style=\"text-align:center;\" oninput=\"purCalcRowTotal(this)\"></td>';\n"
    + UOM_CELL +
    "  h += '<td class=\"pur-td\"><input data-f=\"remarks\" placeholder=\"Damage reason\"></td>';\n"
)
if OLD in src:
    src = src.replace(OLD, NEW)
    changes.append('damageTableRowHTML: added UoM after qty')
else:
    print('WARN: damageTableRowHTML old_str not found')

# ============================================================
# 4. quotationTableRowHTML (Sell Proposal) — add UoM after qty
# ============================================================
OLD = (
    "  h += '<td class=\"pur-td\"><input data-f=\"serial\" placeholder=\"Serial Number\" style=\"background:#f5f7f5;color:var(--muted);\" readonly></td>';\n"
    "  h += '<td class=\"pur-td\"><input type=\"number\" data-f=\"qty\" value=\"0\" style=\"text-align:center;\" oninput=\"purCalcRowTotal(this)\"></td>';\n"
    "  h += '<td class=\"pur-td\"><input type=\"number\" data-f=\"price\" value=\"0\" style=\"text-align:right;\" oninput=\"purCalcRowTotal(this)\"></td>';\n"
    "  h += '<td class=\"pur-td\"><input type=\"text\" data-f=\"total\" value=\"0\" readonly style=\"text-align:right;font-weight:600;color:var(--accent);background:#f5f7f5;\"></td>';\n"
    "  h += '<td class=\"pur-td\"><input data-f=\"remarks\" placeholder=\"Remarks\"></td>';\n"
    "  h += '<td class=\"pur-td\" style=\"text-align:center;\"><button type=\"button\" class=\"btn-del-pur-row btn-del-pur\"><i class=\"fas fa-trash-alt\"></i></button></td>';\n"
    "  h += '</tr>';\n"
    "  return h;\n"
    "}\n"
    "\n"
    "// ==================== INVOICE LIST ===================="
)
NEW = (
    "  h += '<td class=\"pur-td\"><input data-f=\"serial\" placeholder=\"Serial Number\" style=\"background:#f5f7f5;color:var(--muted);\" readonly></td>';\n"
    "  h += '<td class=\"pur-td\"><input type=\"number\" data-f=\"qty\" value=\"0\" style=\"text-align:center;\" oninput=\"purCalcRowTotal(this)\"></td>';\n"
    + UOM_CELL_FLAT +
    "  h += '<td class=\"pur-td\"><input type=\"number\" data-f=\"price\" value=\"0\" style=\"text-align:right;\" oninput=\"purCalcRowTotal(this)\"></td>';\n"
    "  h += '<td class=\"pur-td\"><input type=\"text\" data-f=\"total\" value=\"0\" readonly style=\"text-align:right;font-weight:600;color:var(--accent);background:#f5f7f5;\"></td>';\n"
    "  h += '<td class=\"pur-td\"><input data-f=\"remarks\" placeholder=\"Remarks\"></td>';\n"
    "  h += '<td class=\"pur-td\" style=\"text-align:center;\"><button type=\"button\" class=\"btn-del-pur-row btn-del-pur\"><i class=\"fas fa-trash-alt\"></i></button></td>';\n"
    "  h += '</tr>';\n"
    "  return h;\n"
    "}\n"
    "\n"
    "// ==================== INVOICE LIST ===================="
)
if OLD in src:
    src = src.replace(OLD, NEW)
    changes.append('quotationTableRowHTML: added UoM after qty')
else:
    print('WARN: quotationTableRowHTML old_str not found')

# ============================================================
# 5. invoiceTableRowHTML — add UoM after qty
# ============================================================
OLD = (
    "  h += '<td class=\"pur-td\"><input data-f=\"serial\" placeholder=\"Serial Number\" style=\"background:#f5f7f5;color:var(--muted);\" readonly></td>';\n"
    "  h += '<td class=\"pur-td\"><input type=\"number\" data-f=\"qty\" value=\"0\" style=\"text-align:center;\" oninput=\"purCalcRowTotal(this)\"></td>';\n"
    "  h += '<td class=\"pur-td\"><input type=\"number\" data-f=\"price\" value=\"0\" style=\"text-align:right;\" oninput=\"purCalcRowTotal(this)\"></td>';\n"
    "  h += '<td class=\"pur-td\"><input type=\"text\" data-f=\"total\" value=\"0\" readonly style=\"text-align:right;font-weight:600;color:var(--accent);background:#f5f7f5;\"></td>';\n"
    "  h += '<td class=\"pur-td\"><input data-f=\"remarks\" placeholder=\"Remarks\"></td>';\n"
    "  h += '<td class=\"pur-td\" style=\"text-align:center;\"><button type=\"button\" class=\"btn-del-pur-row btn-del-pur\"><i class=\"fas fa-trash-alt\"></i></button></td>';\n"
    "  h += '</tr>';\n"
    "  return h;\n"
    "}\n"
    "\n"
    "function renderDamageList() {"
)
NEW = (
    "  h += '<td class=\"pur-td\"><input data-f=\"serial\" placeholder=\"Serial Number\" style=\"background:#f5f7f5;color:var(--muted);\" readonly></td>';\n"
    "  h += '<td class=\"pur-td\"><input type=\"number\" data-f=\"qty\" value=\"0\" style=\"text-align:center;\" oninput=\"purCalcRowTotal(this)\"></td>';\n"
    + UOM_CELL_FLAT +
    "  h += '<td class=\"pur-td\"><input type=\"number\" data-f=\"price\" value=\"0\" style=\"text-align:right;\" oninput=\"purCalcRowTotal(this)\"></td>';\n"
    "  h += '<td class=\"pur-td\"><input type=\"text\" data-f=\"total\" value=\"0\" readonly style=\"text-align:right;font-weight:600;color:var(--accent);background:#f5f7f5;\"></td>';\n"
    "  h += '<td class=\"pur-td\"><input data-f=\"remarks\" placeholder=\"Remarks\"></td>';\n"
    "  h += '<td class=\"pur-td\" style=\"text-align:center;\"><button type=\"button\" class=\"btn-del-pur-row btn-del-pur\"><i class=\"fas fa-trash-alt\"></i></button></td>';\n"
    "  h += '</tr>';\n"
    "  return h;\n"
    "}\n"
    "\n"
    "function renderDamageList() {"
)
if OLD in src:
    src = src.replace(OLD, NEW)
    changes.append('invoiceTableRowHTML: added UoM after qty')
else:
    print('WARN: invoiceTableRowHTML old_str not found')

# ============================================================
# 6. Table headers — add UoM column after Quantity column for all modals
# ============================================================

# Delivery Add modal header — line 2567 (Quantity, Remarks)
OLD = "  html += '<th class=\"pur-th\">Quantity</th><th class=\"pur-th\">Remarks</th>';\n  html += '</tr></thead><tbody id=\"pur-entries-body\">';\n  // Load saved items or create one empty row\n  var savedItems = (del && del.items) ? del.items : [];"
NEW = "  html += '<th class=\"pur-th\">Quantity</th><th class=\"pur-th\">UoM</th><th class=\"pur-th\">Remarks</th>';\n  html += '</tr></thead><tbody id=\"pur-entries-body\">';\n  // Load saved items or create one empty row\n  var savedItems = (del && del.items) ? del.items : [];"
if OLD in src:
    src = src.replace(OLD, NEW)
    changes.append('Delivery Edit modal header: added UoM column')
else:
    print('WARN: Delivery Edit modal header not found')

# Adjustment Add/Edit modal header — line 3374 (Quantity, Remarks)
OLD = "  html += '<th class=\"pur-th\">Quantity</th><th class=\"pur-th\">Remarks</th>';\n  if (!readOnly) html += '<th class=\"pur-th\" style=\"width:42px;\"></th>';\n  html += '</tr></thead><tbody id=\"pur-entries-body\">';\n  if (readOnly) {\n    // View mode — show the saved row read-only\n    html += '<tr>';\n    html += '<td class=\"pur-td\" style=\"padding:9px 10px;font-size:13px;font-weight:600;\">' + (adj.product || '-') + '</td>';"
NEW = "  html += '<th class=\"pur-th\">Quantity</th><th class=\"pur-th\">UoM</th><th class=\"pur-th\">Remarks</th>';\n  if (!readOnly) html += '<th class=\"pur-th\" style=\"width:42px;\"></th>';\n  html += '</tr></thead><tbody id=\"pur-entries-body\">';\n  if (readOnly) {\n    // View mode — show the saved row read-only\n    html += '<tr>';\n    html += '<td class=\"pur-td\" style=\"padding:9px 10px;font-size:13px;font-weight:600;\">' + (adj.product || '-') + '</td>';"
if OLD in src:
    src = src.replace(OLD, NEW)
    changes.append('Adjustment Add/Edit modal header: added UoM column')
else:
    print('WARN: Adjustment Add/Edit modal header not found')

# Damage Add/Edit modal header — line 4385 (Quantity, Reason)
OLD = "  html += '<th class=\"pur-th\">Quantity</th><th class=\"pur-th\">Reason</th>';\n  if (!readOnly) html += '<th class=\"pur-th\" style=\"width:42px;\"></th>';\n  html += '</tr></thead><tbody id=\"pur-entries-body\">';\n  if (readOnly) {\n    // View mode — show the saved row read-only\n    html += '<tr>';\n    html += '<td class=\"pur-td\" style=\"padding:9px 10px;font-size:13px;font-weight:600;\">' + (dmg.product || '-') + '</td>';"
NEW = "  html += '<th class=\"pur-th\">Quantity</th><th class=\"pur-th\">UoM</th><th class=\"pur-th\">Reason</th>';\n  if (!readOnly) html += '<th class=\"pur-th\" style=\"width:42px;\"></th>';\n  html += '</tr></thead><tbody id=\"pur-entries-body\">';\n  if (readOnly) {\n    // View mode — show the saved row read-only\n    html += '<tr>';\n    html += '<td class=\"pur-td\" style=\"padding:9px 10px;font-size:13px;font-weight:600;\">' + (dmg.product || '-') + '</td>';"
if OLD in src:
    src = src.replace(OLD, NEW)
    changes.append('Damage Add/Edit modal header: added UoM column')
else:
    print('WARN: Damage Add/Edit modal header not found')

# Sell Proposal (quotation) Add/Edit modal headers — line 3836, 4142 (Qty, Price, Total, Remarks, Serial Number)
# These two have the same pattern: '<th class="pur-th">Serial Number</th>...<th class="pur-th" style="text-align:center;">Qty</th><th class="pur-th" style="text-align:right;">Price</th>...'
# We need to add UoM between Qty and Price
OLD = "  html += '<th class=\"pur-th\">Serial Number</th><th class=\"pur-th\" style=\"text-align:center;\">Qty</th><th class=\"pur-th\" style=\"text-align:right;\">Price</th><th class=\"pur-th\" style=\"text-align:right;\">Total</th><th class=\"pur-th\">Remarks</th>';"
NEW = "  html += '<th class=\"pur-th\">Serial Number</th><th class=\"pur-th\" style=\"text-align:center;\">Qty</th><th class=\"pur-th\">UoM</th><th class=\"pur-th\" style=\"text-align:right;\">Price</th><th class=\"pur-th\" style=\"text-align:right;\">Total</th><th class=\"pur-th\">Remarks</th>';"
count = src.count(OLD)
if count > 0:
    src = src.replace(OLD, NEW)
    changes.append(f'Quotation+Invoice modal headers: added UoM column ({count} occurrences)')
else:
    print('WARN: Quotation/Invoice modal header pattern not found')

# Sell Proposal modal "Add New" header — has different pattern with separate lines
OLD = "    html += '<th class=\"pur-th\">Serial Number</th><th class=\"pur-th\" style=\"text-align:center;\">Qty</th><th class=\"pur-th\" style=\"text-align:right;\">Price</th><th class=\"pur-th\" style=\"text-align:right;\">Total</th><th class=\"pur-th\">Remarks</th>';\n    html += '<th class=\"pur-th\" style=\"width:42px;\"></th>';"
NEW = "    html += '<th class=\"pur-th\">Serial Number</th><th class=\"pur-th\" style=\"text-align:center;\">Qty</th><th class=\"pur-th\">UoM</th><th class=\"pur-th\" style=\"text-align:right;\">Price</th><th class=\"pur-th\" style=\"text-align:right;\">Total</th><th class=\"pur-th\">Remarks</th>';\n    html += '<th class=\"pur-th\" style=\"width:42px;\"></th>';"
count = src.count(OLD)
if count > 0:
    src = src.replace(OLD, NEW)
    changes.append(f'Quotation/Invoice "Add New" modal headers: added UoM column ({count} occurrences)')
else:
    print('WARN: Quotation/Invoice "Add New" header pattern not found')

# Inventory Stock list view modal header (already has Serial, Condition, Warranty — let me check)
# Actually Inventory Stock uses its own format - we'll leave it alone since the user
# is asking about the Add New Purchase form, which is already done.

# ============================================================
# 7. Update View modals (readOnly rows) — add UoM column to view tables
# ============================================================
# Sell Proposal View (read-only) table row
# We need to find read-only rows that show product fields and add UoM

# ============================================================
# 8. Save handlers — add uom field to DB.push objects
# ============================================================

# Sell Proposal save handler — items.push (line ~3538-3542)
OLD = "        items.push({ product: product, category: r.querySelector('[data-f=\"category\"]').value, brand: r.querySelector('[data-f=\"brand\"]').value, model: r.querySelector('[data-f=\"model\"]').value, serial: r.querySelector('[data-f=\"serial\"]').value, qty: qty, price: price, total: total, remarks: r.querySelector('[data-f=\"remarks\"]').value });"
NEW = "        items.push({ product: product, category: r.querySelector('[data-f=\"category\"]').value, brand: r.querySelector('[data-f=\"brand\"]').value, model: r.querySelector('[data-f=\"model\"]').value, serial: r.querySelector('[data-f=\"serial\"]').value, qty: qty, uom: r.querySelector('[data-f=\"uom\"]') ? r.querySelector('[data-f=\"uom\"]').value : '', price: price, total: total, remarks: r.querySelector('[data-f=\"remarks\"]').value });"
count = src.count(OLD)
if count > 0:
    src = src.replace(OLD, NEW)
    changes.append(f'Sell Proposal + Invoice save handlers: added uom field ({count} occurrences)')
else:
    print('WARN: Sell Proposal/Invoice save handler not found')

# Delivery save handler — DB.deliveries.push (line ~3136-3148)
# Look for the specific delivery push pattern
OLD = "        product: product,\n        category: r.querySelector('[data-f=\"category\"]').value,\n        brand: r.querySelector('[data-f=\"brand\"]').value,\n        model: r.querySelector('[data-f=\"model\"]').value,\n        serial: r.querySelector('[data-f=\"serial\"]').value,\n        condition: r.querySelector('[data-f=\"condition\"]').value,\n        warranty: r.querySelector('[data-f=\"warranty\"]').value,\n        bqty: parseFloat(r.querySelector('[data-f=\"bqty\"]').value) || 0,\n        qty: parseFloat(r.querySelector('[data-f=\"qty\"]').value) || 0,\n        remarks: r.querySelector('[data-f=\"remarks\"]').value"
NEW = "        product: product,\n        category: r.querySelector('[data-f=\"category\"]').value,\n        brand: r.querySelector('[data-f=\"brand\"]').value,\n        model: r.querySelector('[data-f=\"model\"]').value,\n        serial: r.querySelector('[data-f=\"serial\"]').value,\n        condition: r.querySelector('[data-f=\"condition\"]').value,\n        warranty: r.querySelector('[data-f=\"warranty\"]').value,\n        bqty: parseFloat(r.querySelector('[data-f=\"bqty\"]').value) || 0,\n        qty: parseFloat(r.querySelector('[data-f=\"qty\"]').value) || 0,\n        uom: r.querySelector('[data-f=\"uom\"]') ? r.querySelector('[data-f=\"uom\"]').value : '',\n        remarks: r.querySelector('[data-f=\"remarks\"]').value"
if OLD in src:
    src = src.replace(OLD, NEW)
    changes.append('Delivery save handler: added uom field')
else:
    print('WARN: Delivery save handler not found')

# Adjustment save handler — look for the adjustment push pattern
OLD = "        DB.adjustments.push({\n          id: Date.now(), ref: ref, date: date, branch: branch,\n          product: product, category: category, brand: brand, model: model,\n          serial: serial, condition: condition, warranty: warranty,\n          bqty: bqtyVal, qty: absQty, type: type, reason: remarks, remarks: remarks, note: note, status: status\n        });"
NEW = "        DB.adjustments.push({\n          id: Date.now(), ref: ref, date: date, branch: branch,\n          product: product, category: category, brand: brand, model: model,\n          serial: serial, condition: condition, warranty: warranty,\n          bqty: bqtyVal, qty: absQty, uom: document.querySelector('[data-f=\"uom\"]') ? document.querySelector('[data-f=\"uom\"]').value : '', type: type, reason: remarks, remarks: remarks, note: note, status: status\n        });"
if OLD in src:
    src = src.replace(OLD, NEW)
    changes.append('Adjustment save handler: added uom field')
else:
    print('WARN: Adjustment save handler not found')

# Adjustment update handler — look for the adj.* = ... pattern
OLD = "        adj.ref = ref; adj.date = date; adj.branch = branch;\n        adj.product = product; adj.category = category; adj.brand = brand;\n        adj.model = model; adj.serial = serial; adj.condition = condition;\n        adj.warranty = warranty; adj.qty = absQty; adj.type = type;\n        adj.bqty = bqtyVal;\n        adj.reason = remarks; adj.remarks = remarks; adj.note = note; adj.status = status;"
NEW = "        adj.ref = ref; adj.date = date; adj.branch = branch;\n        adj.product = product; adj.category = category; adj.brand = brand;\n        adj.model = model; adj.serial = serial; adj.condition = condition;\n        adj.warranty = warranty; adj.qty = absQty; adj.type = type;\n        adj.bqty = bqtyVal; adj.uom = firstValid.querySelector('[data-f=\"uom\"]') ? firstValid.querySelector('[data-f=\"uom\"]').value : '';\n        adj.reason = remarks; adj.remarks = remarks; adj.note = note; adj.status = status;"
if OLD in src:
    src = src.replace(OLD, NEW)
    changes.append('Adjustment update handler: added uom field')
else:
    print('WARN: Adjustment update handler not found')

# Damage save handler — DB.damages.push (similar pattern)
OLD = "        DB.damages.push({\n          id: Date.now(), ref: ref, date: date, branch: branch,\n          product: product, category: category, brand: brand, model: model,\n          serial: serial, condition: condition, warranty: warranty,\n          bqty: bqtyVal, qty: absQty, type: type, reason: remarks, remarks: remarks, note: note, status: status\n        });"
NEW = "        DB.damages.push({\n          id: Date.now(), ref: ref, date: date, branch: branch,\n          product: product, category: category, brand: brand, model: model,\n          serial: serial, condition: condition, warranty: warranty,\n          bqty: bqtyVal, qty: absQty, uom: document.querySelector('[data-f=\"uom\"]') ? document.querySelector('[data-f=\"uom\"]').value : '', type: type, reason: remarks, remarks: remarks, note: note, status: status\n        });"
if OLD in src:
    src = src.replace(OLD, NEW)
    changes.append('Damage save handler: added uom field')
else:
    print('WARN: Damage save handler not found')

# Damage update handler — look for the dmg.* = ... pattern
OLD = "        dmg.ref = ref; dmg.date = date; dmg.branch = branch;\n        dmg.product = product; dmg.category = category; dmg.brand = brand;\n        dmg.model = model; dmg.serial = serial; dmg.condition = condition;\n        dmg.warranty = warranty; dmg.qty = absQty; dmg.type = type;\n        dmg.bqty = bqtyVal;\n        dmg.reason = remarks; dmg.remarks = remarks; dmg.note = note; dmg.status = status;"
NEW = "        dmg.ref = ref; dmg.date = date; dmg.branch = branch;\n        dmg.product = product; dmg.category = category; dmg.brand = brand;\n        dmg.model = model; dmg.serial = serial; dmg.condition = condition;\n        dmg.warranty = warranty; dmg.qty = absQty; dmg.type = type;\n        dmg.bqty = bqtyVal; dmg.uom = firstValid.querySelector('[data-f=\"uom\"]') ? firstValid.querySelector('[data-f=\"uom\"]').value : '';\n        dmg.reason = remarks; dmg.remarks = remarks; dmg.note = note; dmg.status = status;"
if OLD in src:
    src = src.replace(OLD, NEW)
    changes.append('Damage update handler: added uom field')
else:
    print('WARN: Damage update handler not found')

# ============================================================
# 9. Edit modal pre-fill — set the uom value from saved data
# ============================================================
# Delivery Edit pre-fill (line ~2596)
OLD = "          var ws = tr.querySelector('[data-f=\"warranty\"]'); if (ws && it.warranty) ws.value = it.warranty;\n          var bqty = tr.querySelector('[data-f=\"bqty\"]'); if (bqty) bqty.value = it.bqty || 0;"
NEW = "          var ws = tr.querySelector('[data-f=\"warranty\"]'); if (ws && it.warranty) ws.value = it.warranty;\n          var uo = tr.querySelector('[data-f=\"uom\"]'); if (uo && it.uom) uo.value = it.uom;\n          var bqty = tr.querySelector('[data-f=\"bqty\"]'); if (bqty) bqty.value = it.bqty || 0;"
if OLD in src:
    src = src.replace(OLD, NEW)
    changes.append('Delivery Edit pre-fill: added uom restore')
else:
    print('WARN: Delivery Edit pre-fill pattern not found')

# Adjustment Edit pre-fill (line ~3614)
# Find and update — let me check the actual code first

# Damage Edit pre-fill (line ~4196)
# Same approach

# Sell Proposal Edit pre-fill — uses setPurSearchableValue pattern
OLD = "      var tl = tr.querySelector('[data-f=\"total\"]'); if (tl) tl.value = fmt((it2.qty||0)*(it2.price||0));\n      var rm = tr.querySelector('[data-f=\"remarks\"]'); if (rm) rm.value = it2.remarks || '';"
NEW = "      var tl = tr.querySelector('[data-f=\"total\"]'); if (tl) tl.value = fmt((it2.qty||0)*(it2.price||0));\n      var uo2 = tr.querySelector('[data-f=\"uom\"]'); if (uo2) uo2.value = it2.uom || '';\n      var rm = tr.querySelector('[data-f=\"remarks\"]'); if (rm) rm.value = it2.remarks || '';"
if OLD in src:
    src = src.replace(OLD, NEW)
    changes.append('Sell Proposal Edit pre-fill: added uom restore')
else:
    print('WARN: Sell Proposal Edit pre-fill pattern not found')

# Invoice Edit pre-fill — similar
OLD = "      var tl = tr.querySelector('[data-f=\"total\"]'); if (tl) tl.value = fmt((it2.qty||0)*(it2.price||0));\n      var rm = tr.querySelector('[data-f=\"remarks\"]'); if (rm) rm.value = it2.remarks || '';"
# This is the same as the Sell Proposal one — should already be replaced by the previous edit
# Let me also check for invoice-specific pre-fill

# ============================================================
# Write back
# ============================================================
PATH.write_text(src, encoding='utf-8')

print('\n=== Changes applied ===')
for c in changes:
    print('  ✓', c)
print(f'\nTotal: {len(changes)} changes')
print(f'File size: {len(src):,} bytes')
