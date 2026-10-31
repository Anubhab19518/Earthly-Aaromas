# Database Objects Inventory: Tea Chain ERP

## 1. Tables (37 Total)

| Table Name | Description | Key Foreign Keys & Constraints |
|---|---|---|
| `organizations` | Tenant entity root for tea chain businesses | Multi-tenant root |
| `profiles` | Extended user identity synced from `auth.users` | `id -> auth.users(id)` |
| `organization_memberships` | Active employee/owner membership in an organization | `user_id -> profiles`, `org_id -> organizations`, `location_id -> locations` |
| `roles` | RBAC roles (e.g. `OWNER`, `EMPLOYEE`) | Multi-tenant scoped |
| `permissions` | Granular permission tokens | System tokens |
| `role_permissions` | Mapping of roles to granted permissions | `role_id`, `permission_id` |
| `membership_roles` | Mapping of user memberships to roles | `membership_id`, `role_id` |
| `audit_log` | Immutable operational audit trail | Multi-tenant scoped |
| `location_types` | Seeded taxonomy of facilities (`WAREHOUSE`, `SHOP`, etc.) | System taxonomy |
| `locations` | Physical warehouses and retail shops | `type_id -> location_types` |
| `units` | Measurement units (grams, millilitres, packets, etc.) | Self-referencing base unit conversions |
| `ingredient_categories` | Categories for raw materials (Tea, Dairy, Spices) | Multi-tenant scoped |
| `ingredients` | Raw materials and consumables stored at base units | `base_unit_id -> units`, `category_id -> ingredient_categories` |
| `ingredient_unit_conversions` | Item-specific recipe/ordering conversion ratios | `ingredient_id`, `from_unit_id`, `to_unit_id` |
| `suppliers` | Vendor directory for purchasing | Multi-tenant scoped |
| `tax_categories` | GST categories (e.g. GST 5%, GST 18%) | Multi-tenant scoped |
| `tax_rates` | Effective-dated tax percentages | `tax_category_id -> tax_categories` |
| `inventory_alert_policies` | Min/max, critical, and out-of-stock thresholds per branch | `ingredient_id`, `location_id` |
| `inventory_ledger` | Append-only double-entry inventory ledger | `ingredient_id`, `location_id`, `unit_id` |
| `inventory_snapshot` | Current materialized quantity on hand per branch | `ingredient_id`, `location_id` (PK compound) |
| `organization_sequences` | Monotonic sequential number generator for documents | Scoped by prefix/year/tenant |
| `goods_receipts` | Inbound delivery receipts (GRN) | `supplier_id`, `warehouse_location_id`, `po_id` |
| `goods_receipt_items` | Line items received in a GRN | `goods_receipt_id`, `ingredient_id`, `purchase_order_item_id` |
| `organization_invitations` | Pending employee email invitations with secure tokens | Token hash, expiration, `role_id`, `location_id` |
| `purchase_orders` | Inbound purchasing orders to suppliers | `supplier_id`, `location_id` |
| `purchase_order_items` | Line items on a purchase order | `po_id`, `ingredient_id`, `unit_id` |
| `stock_transfers` | Warehouse-to-shop inter-branch movements | `source_location_id`, `destination_location_id` |
| `stock_transfer_items` | Line items moved during a stock transfer | `transfer_id`, `ingredient_id`, `unit_id` |
| `menu_categories` | Categories for sold tea items and snacks | Multi-tenant scoped |
| `menu_items` | Sellable menu items (e.g. Masala Chai, Bun Maska) | `category_id`, `tax_category_id` |
| `menu_variants` | Size/format options (e.g. Cutting, Regular, Large) | `menu_item_id -> menu_items` |
| `recipe_items` | Bill of materials: ingredients consumed per menu variant | `variant_id`, `ingredient_id`, `unit_id` |
| `branch_menu_configs` | Branch-specific menu availability and price overrides | `location_id`, `variant_id` |
| `sales_orders` | Customer point-of-sale orders | `location_id`, `customer_name`, `customer_phone` |
| `sales_order_items` | Line items ordered at the register | `order_id -> sales_orders`, `variant_id` |
| `payments` | Settlement and transaction records for orders | `order_id -> sales_orders`, payment mode |
| `comments` | Internal notes attached to POs and GRNs | `purchase_order_id`, `goods_receipt_id` |

---

## 2. Core RPC Functions & Business Logic

| Function Name | Security | Purpose |
|---|---|---|
| `bootstrap_organization(p_org_name, p_owner_full_name)` | `SECURITY DEFINER` | Atomically creates tenant, seeds roles/permissions, and grants initial Owner. |
| `assign_employee_by_email(...)` | `SECURITY DEFINER` | Assigns an existing Supabase Auth user to an organization with `EMPLOYEE` role. |
| `validate_invitation_token(p_token_hash)` | `SECURITY DEFINER` | Validates one-time invitation links during employee onboarding. |
| `get_my_employee_info()` | `SECURITY DEFINER` | Fetches active role, assigned branch `location_id`, and organization for current user. |
| `get_my_role_code()` | `SECURITY DEFINER` | Lightweight role resolver (`OWNER` vs `EMPLOYEE`) for route guards. |
| `has_permission(org_id, perm_code)` | `SECURITY DEFINER` | Checks if current caller has a specific operational permission. |
| `has_global_permission(perm_code)` | `SECURITY DEFINER` | Checks permissions across any active membership. |
| `has_mfa_assurance()` | `SECURITY DEFINER` | Verifies the caller is authenticated at `aal2` (TOTP MFA). |
| `next_sequence_value(...)` | `SECURITY DEFINER` | Thread-safe atomic document number incrementer (PO numbers, GRN numbers). |
| `post_inventory_movement(...)` | `SECURITY DEFINER` | Core transactional engine: updates snapshot and inserts immutable ledger row. |
| `post_goods_receipt(p_grn_id)` | `SECURITY DEFINER` | Finalizes GRN, moves stock into branch, and auto-completes linked PO if fulfilled. |
| `post_stock_transfer(p_transfer_id)` | `SECURITY DEFINER` | Atomically executes two-sided transfer (`TRANSFER_OUT` at source, `TRANSFER_IN` at destination). |
| `get_pos_menu(p_org_id, p_loc_id)` | `SECURITY DEFINER` | Returns sellable items for POS with branch-level price overrides. |
| `create_order(...)` | `SECURITY DEFINER` | Submits pending order into POS queue. |
| `start_preparing_order(p_order_id)` | `SECURITY DEFINER` | Kitchen display: marks order status as `PREPARING`. |
| `mark_order_ready(p_order_id)` | `SECURITY DEFINER` | Kitchen display: marks order status as `READY`. |
| `complete_order(p_order_id)` | `SECURITY DEFINER` | Completes order and deducts recipe ingredients via `post_inventory_movement`. |
| `cancel_order(p_order_id)` | `SECURITY DEFINER` | Cancels pending order before preparation. |
| `get_location_orders(p_loc_id)` | `SECURITY DEFINER` | Real-time queue view of active location orders. |
| `process_sale(...)` | `SECURITY DEFINER` | Direct one-step POS sale transaction (bill & inventory reduction). |

---

## 3. Database Triggers

1. **`on_auth_user_created`**: Fires on `auth.users` insertion to create a corresponding `public.profiles` row.
2. **`enforce_single_owner_guard`**: Prevents an organization from having more than one active `OWNER`.
3. **`enforce_location_rules_trigger`**: Validates location codes and names per tenant.
4. **`prevent_ledger_mutation_trigger`**: Forbids `UPDATE` and `DELETE` on `public.inventory_ledger` to guarantee immutability.
5. **`po_number_trigger`**: Auto-generates sequential PO numbers on insert (`PO-YYYY-XXXX`).
6. **`stock_transfer_number_trigger`**: Auto-generates sequential transfer numbers (`TR-YYYY-XXXX`).
7. **`grn_header_rules_trigger`**: Locks goods receipts once marked `POSTED`.

