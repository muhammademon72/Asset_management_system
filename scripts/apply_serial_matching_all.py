#!/usr/bin/env python3
"""
Apply serial-level delivery matching to ALL stock calculation functions.

Functions to update:
1. renderInventoryStock() — line ~1862 (already done in commit dedcd6f)
2. printInventoryStock() — line ~2037 (still using old FIFO)
3. buildInventoryStockProductArray() — line ~2879 (still using old FIFO)

The serial-level matching logic:
  1. Build a map of delivered serials from Approved deliveries.
  2. For deliveries WITH serial: match to the purchase row with the same serial.
  3. For deliveries WITHOUT serial: fall back to FIFO (oldest purchases first).
"""
from pathlib import Path
import re

PATH = Path('/home/z/my-project/public/app.html')
src = PATH.read_text(encoding='utf-8')

changes = []

# ===================================================================
# 1. printInventoryStock() — replace FIFO with serial-level matching
# ===================================================================
old_print = """  for (var productName in perProduct) {
    var purchaseRows = perProduct[productName];
    var purQty = 0;
    for (var pi = 0; pi < purchaseRows.length; pi++) purQty += (purchaseRows[pi].qty || 0);
    var delQty = 0;
    for (var di2 = 0; di2 < DB.deliveries.length; di2++) {
      if (DB.deliveries[di2].product === productName && DB.deliveries[di2].status === 'Approved') delQty += (DB.deliveries[di2].qty || 0);
    }
    var dmgQty = 0;
    for (var dmi = 0; dmi < DB.damages.length; dmi++) {
      if (DB.damages[dmi].product === productName && DB.damages[dmi].status === 'Approved') dmgQty += (DB.damages[dmi].qty || 0);
    }
    var adjQtyNet = 0;
    for (var ai = 0; ai < DB.adjustments.length; ai++) {
      if (DB.adjustments[ai].product === productName) {
        var aq = DB.adjustments[ai].qty || 0;
        adjQtyNet += (DB.adjustments[ai].type === 'Increase') ? aq : -aq;
      }
    }
    totalPurchased += purQty;
    totalDelivered += delQty;
    totalDamaged += dmgQty;
    totalAdjusted += adjQtyNet;

    var delRemaining = delQty;
    var dmgRemaining = dmgQty;
    var adjRemaining = adjQtyNet;
    for (var ri = 0; ri < purchaseRows.length; ri++) {
      var pr = purchaseRows[ri];
      var rowQty = pr.qty || 0;
      var allocDel = Math.min(rowQty, delRemaining); delRemaining -= allocDel;"""

new_print = """  for (var productName in perProduct) {
    var purchaseRows = perProduct[productName];
    var purQty = 0;
    for (var pi = 0; pi < purchaseRows.length; pi++) purQty += (purchaseRows[pi].qty || 0);

    // SERIAL-LEVEL MATCHING: match deliveries by serial number
    var deliveredSerials = {};
    var fifoDelQty = 0;
    for (var di2 = 0; di2 < DB.deliveries.length; di2++) {
      if (DB.deliveries[di2].product !== productName || DB.deliveries[di2].status !== 'Approved') continue;
      var delSerial = DB.deliveries[di2].serial || '';
      if (delSerial) {
        deliveredSerials[delSerial] = (deliveredSerials[delSerial] || 0) + (DB.deliveries[di2].qty || 0);
      } else {
        fifoDelQty += (DB.deliveries[di2].qty || 0);
      }
    }
    var delQty = fifoDelQty;
    for (var ds in deliveredSerials) delQty += deliveredSerials[ds];

    var dmgQty = 0;
    for (var dmi = 0; dmi < DB.damages.length; dmi++) {
      if (DB.damages[dmi].product === productName && DB.damages[dmi].status === 'Approved') dmgQty += (DB.damages[dmi].qty || 0);
    }
    var adjQtyNet = 0;
    for (var ai = 0; ai < DB.adjustments.length; ai++) {
      if (DB.adjustments[ai].product === productName) {
        var aq = DB.adjustments[ai].qty || 0;
        adjQtyNet += (DB.adjustments[ai].type === 'Increase') ? aq : -aq;
      }
    }
    totalPurchased += purQty;
    totalDelivered += delQty;
    totalDamaged += dmgQty;
    totalAdjusted += adjQtyNet;

    var fifoDelRemaining = fifoDelQty;
    var dmgRemaining = dmgQty;
    var adjRemaining = adjQtyNet;
    for (var ri = 0; ri < purchaseRows.length; ri++) {
      var pr = purchaseRows[ri];
      var rowQty = pr.qty || 0;
      var prSerial = pr.serial || '';

      // Check if this specific serial was delivered (serial-level matching)
      var allocDel = 0;
      if (prSerial && deliveredSerials[prSerial]) {
        allocDel = Math.min(rowQty, deliveredSerials[prSerial]);
        deliveredSerials[prSerial] -= allocDel;
      } else {
        // No serial match — use FIFO for deliveries without serial numbers
        allocDel = Math.min(rowQty, fifoDelRemaining);
        fifoDelRemaining -= allocDel;
      }"""

if old_print in src:
    src = src.replace(old_print, new_print)
    changes.append('printInventoryStock(): serial-level matching applied')
else:
    print('WARN: printInventoryStock old pattern not found')

# ===================================================================
# 2. buildInventoryStockProductArray() — replace FIFO with serial-level matching
# ===================================================================
old_build = """  // Step 2: For each product, allocate deliveries/damages/adjustments FIFO.
  for (var productName in perProduct) {
    var purchaseRows = perProduct[productName];
    // Aggregate totals per product
    var delQty = 0;
    for (var di2 = 0; di2 < DB.deliveries.length; di2++) {
      if (DB.deliveries[di2].product === productName && DB.deliveries[di2].status === 'Approved') delQty += (DB.deliveries[di2].qty || 0);
    }
    var dmgQty = 0;
    for (var dmi = 0; dmi < DB.damages.length; dmi++) {
      if (DB.damages[dmi].product === productName && DB.damages[dmi].status === 'Approved') dmgQty += (DB.damages[dmi].qty || 0);
    }
    var adjQtyNet = 0;
    for (var ai = 0; ai < DB.adjustments.length; ai++) {
      if (DB.adjustments[ai].product === productName) {
        var aq = DB.adjustments[ai].qty || 0;
        adjQtyNet += (DB.adjustments[ai].type === 'Increase') ? aq : -aq;
      }
    }
    var delRemaining = delQty;
    var dmgRemaining = dmgQty;
    var adjRemaining = adjQtyNet;

    // Find the product master record (for category/brand fallback)
    var prodMaster = null;
    for (var pi3 = 0; pi3 < DB.products.length; pi3++) {
      if (DB.products[pi3].name === productName) { prodMaster = DB.products[pi3]; break; }
    }

    // Step 3: For each purchase row, compute remaining stock and push to prdArr.
    for (var ri = 0; ri < purchaseRows.length; ri++) {
      var pr = purchaseRows[ri];
      var rowQty = pr.qty || 0;
      var allocDel = Math.min(rowQty, delRemaining); delRemaining -= allocDel;"""

new_build = """  // Step 2: For each product, allocate deliveries/damages/adjustments.
  // SERIAL-LEVEL MATCHING: match deliveries by serial number when available.
  for (var productName in perProduct) {
    var purchaseRows = perProduct[productName];
    // Build a set of delivered serials (Approved deliveries only)
    var deliveredSerials = {};
    var fifoDelQty = 0;
    for (var di2 = 0; di2 < DB.deliveries.length; di2++) {
      if (DB.deliveries[di2].product !== productName || DB.deliveries[di2].status !== 'Approved') continue;
      var delSerial = DB.deliveries[di2].serial || '';
      if (delSerial) {
        deliveredSerials[delSerial] = (deliveredSerials[delSerial] || 0) + (DB.deliveries[di2].qty || 0);
      } else {
        fifoDelQty += (DB.deliveries[di2].qty || 0);
      }
    }
    var dmgQty = 0;
    for (var dmi = 0; dmi < DB.damages.length; dmi++) {
      if (DB.damages[dmi].product === productName && DB.damages[dmi].status === 'Approved') dmgQty += (DB.damages[dmi].qty || 0);
    }
    var adjQtyNet = 0;
    for (var ai = 0; ai < DB.adjustments.length; ai++) {
      if (DB.adjustments[ai].product === productName) {
        var aq = DB.adjustments[ai].qty || 0;
        adjQtyNet += (DB.adjustments[ai].type === 'Increase') ? aq : -aq;
      }
    }
    var fifoDelRemaining = fifoDelQty;
    var dmgRemaining = dmgQty;
    var adjRemaining = adjQtyNet;

    // Find the product master record (for category/brand fallback)
    var prodMaster = null;
    for (var pi3 = 0; pi3 < DB.products.length; pi3++) {
      if (DB.products[pi3].name === productName) { prodMaster = DB.products[pi3]; break; }
    }

    // Step 3: For each purchase row, compute remaining stock and push to prdArr.
    for (var ri = 0; ri < purchaseRows.length; ri++) {
      var pr = purchaseRows[ri];
      var rowQty = pr.qty || 0;
      var prSerial = pr.serial || '';

      // Check if this specific serial was delivered (serial-level matching)
      var allocDel = 0;
      if (prSerial && deliveredSerials[prSerial]) {
        allocDel = Math.min(rowQty, deliveredSerials[prSerial]);
        deliveredSerials[prSerial] -= allocDel;
      } else {
        // No serial match — use FIFO for deliveries without serial numbers
        allocDel = Math.min(rowQty, fifoDelRemaining);
        fifoDelRemaining -= allocDel;
      }"""

if old_build in src:
    src = src.replace(old_build, new_build)
    changes.append('buildInventoryStockProductArray(): serial-level matching applied')
else:
    print('WARN: buildInventoryStockProductArray old pattern not found')

PATH.write_text(src, encoding='utf-8')
print(f'\n✅ Applied {len(changes)} fixes:')
for c in changes:
    print(f'  ✓ {c}')
