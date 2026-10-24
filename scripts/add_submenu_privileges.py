#!/usr/bin/env python3
"""
Update PRIVILEGE_MODULES to include children (submenus) under each main module.
Replaces lines 6421-6433 (the PRIVILEGE_MODULES = [...]; block).
Also patches:
  - can() to check submenu perms first, fall back to parent module perms
  - renderNav() to filter submenu items by their own can() check
  - enforceActionPermissions() to use currentPage directly (so submenu
    perms are checked, not just parent)
  - deleteItem() and the inline delivery chalan delete handler likewise
  - openRoleModal matrix render loop to render parent + child rows
  - roleSummary() to list submenu perms too
"""
from pathlib import Path

PATH = Path('/home/z/my-project/public/app.html')
lines = PATH.read_text(encoding='utf-8').splitlines(keepends=True)

# Locate the PRIVILEGE_MODULES = [ ... ]; block by anchor lines.
start_idx = None
end_idx = None
for i, line in enumerate(lines):
    if line.startswith('var PRIVILEGE_MODULES = ['):
        start_idx = i
    elif start_idx is not None and line.strip() == '];':
        end_idx = i
        break

if start_idx is None or end_idx is None:
    raise SystemExit('Could not locate PRIVILEGE_MODULES block')

print(f'Found PRIVILEGE_MODULES at lines {start_idx+1}..{end_idx+1}')

new_block = '''var PRIVILEGE_MODULES = [
  { id: 'dashboard',  label: 'Dashboard',         icon: 'fa-grid-2' },
  { id: 'branch',     label: 'Branch',            icon: 'fa-building', children: [
    { id: 'branch-list',          label: 'Branch List' }
  ]},
  { id: 'employee',   label: 'Employee',          icon: 'fa-users', children: [
    { id: 'emp-list',             label: 'Employee List' },
    { id: 'designation-list',     label: 'Designation List' },
    { id: 'department-list',      label: 'Department' }
  ]},
  { id: 'product',    label: 'Product',           icon: 'fa-box-open', children: [
    { id: 'categories',           label: 'Categories' },
    { id: 'brand',                label: 'Brand' },
    { id: 'uom',                  label: 'UoM' },
    { id: 'product-list',         label: 'Product List' },
    { id: 'condition',            label: 'Condition' },
    { id: 'warranty',             label: 'Warranty' }
  ]},
  { id: 'purchase',   label: 'Purchase',          icon: 'fa-cart-shopping', children: [
    { id: 'purchase-list',        label: 'Purchase List' },
    { id: 'inventory-stock',       label: 'Inventory Stock' },
    { id: 'supplier',             label: 'Supplier List' }
  ]},
  { id: 'inventory',  label: 'Inventory',         icon: 'fa-warehouse', children: [
    { id: 'delivery-list',         label: 'Delivery List' },
    { id: 'adjustment-list',       label: 'Adjustment List' },
    { id: 'damage-list',          label: 'Damage List' },
    { id: 'transfer-list',         label: 'Internal Transfer List' }
  ]},
  { id: 'cashbook',   label: 'Cash Book',         icon: 'fa-money-bill-wave', children: [
    { id: 'cash-in',              label: 'Cash In' },
    { id: 'cash-out',             label: 'Cash Out' }
  ]},
  { id: 'approval',   label: 'Approval',          icon: 'fa-clipboard-check', children: [
    { id: 'approval-purchase',    label: 'Approval: Purchase' },
    { id: 'approval-delivery',    label: 'Approval: Delivery' },
    { id: 'approval-adjustment',  label: 'Approval: Adjustment' },
    { id: 'approval-damage',      label: 'Approval: Damage' }
  ]},
  { id: 'report',     label: 'Report',            icon: 'fa-chart-pie', children: [
    { id: 'report-purchase',      label: 'Report: Purchase' },
    { id: 'report-delivery',      label: 'Report: Delivery' },
    { id: 'report-adjustment',    label: 'Report: Adjustment' },
    { id: 'report-damage',        label: 'Report: Damage' },
    { id: 'report-cash-in',       label: 'Report: Cash In' },
    { id: 'report-cash-out',      label: 'Report: Cash Out' }
  ]},
  { id: 'sell',       label: 'Sell',              icon: 'fa-handshake', children: [
    { id: 'quotation-list',       label: 'Sell Proposal' },
    { id: 'invoice-list',         label: 'Invoice' }
  ]},
  { id: 'settings',   label: 'Settings',          icon: 'fa-gear', children: [
    { id: 'company-profile',      label: 'Company Profile' },
    { id: 'user-list',            label: 'User Create List' },
    { id: 'role-list',            label: 'Role Create List' },
    { id: 'backup-restore',       label: 'Backup / Restore' }
  ]}
];
'''

lines[start_idx:end_idx+1] = [new_block]

PATH.write_text(''.join(lines), encoding='utf-8')
print(f'✅ Replaced PRIVILEGE_MODULES block with new version including children.')
print(f'   File size: {sum(len(l) for l in lines):,} bytes')
