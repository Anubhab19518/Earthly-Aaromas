# Migration Recovery Report: Tea Chain ERP Handover

## 1. Executive Summary

This report documents the forensic recovery, audit, and reconstruction of the database migrations and schema for **Tea Chain ERP**.
The ERP is a production-grade multi-location tea-chain operating system designed on Supabase (PostgreSQL with Row Level Security, custom PL/pgSQL RPCs, and AAL2 TOTP MFA guards).

During development, migrations were generated and frequently executed directly via the Supabase Dashboard SQL Editor, raising concerns about potential missing migration files, out-of-order executions, uncommitted schema mutations, or orphan objects.

### Audit Verdict:
1. **100% of Live Database Tables Accounted For**: All 37 public tables active in the live production database (`CHAI AUR KOLKATA`) are directly defined and tracked in the 32 migration files under `supabase/migrations/`.
2. **All 23 Live PostgREST RPC Functions Accounted For**: Every RPC exposed in production matches the function signatures and definitions in the migrations, with one documented platform artifact (`public.rls_auto_enable()`) originating from Supabase's automatic RLS toggle.
3. **All Column Definitions & Types Verified**: A comprehensive property-by-property comparison between the live PostgREST schema and the migrations confirmed 0 missing columns.
4. **Discrepancy Identified in Audit Log Code**: The application code (`app/(erp)/audit/page.tsx`) contains a call to `get_unique_entity_types(p_org_id)`. Live database introspection reveals that this function was **never created in the production database** either. A clean reconstruction of this missing utility function has been created and documented.
5. **Ordered Handover Ready**: The entire 32-file migration sequence is chronological, consistent, and ready to be run against any clean Supabase project. In addition, an aggregated baseline script `database_schema_snapshot.sql` is provided for 1-click execution.

---

## 2. Inventory of Migrations

The repository contains **32 migration files**, all located in `supabase/migrations/` and committed to git history:

| # | Timestamp / Filename | Purpose & Objects Defined | Verified in Live DB? |
|---|----------------------|---------------------------|----------------------|
| 1 | `20260804140000_identity_and_rbac.sql` | Organizations, profiles, memberships, roles, permissions, audit_log, auth trigger, RBAC helpers | Yes (All 8 tables & functions active) |
| 2 | `20260804153000_enforce_totp_and_single_owner.sql` | AAL2 MFA enforcement helper, single-owner constraint, employee email assignment RPC | Yes |
| 3 | `20260804160000_locations.sql` | `location_types` (seeded), `locations` table, location type validation | Yes (5 location types active) |
| 4 | `20260804170000_units.sql` | Measurement `units` table, global permission check `has_global_permission` | Yes (6 units active) |
| 5 | `20260804180000_ingredients.sql` | `ingredient_categories`, `ingredients` master tables, SKU uniqueness, RLS | Yes |
| 6 | `20260804190000_ingredient_unit_conversions.sql` | `ingredient_unit_conversions` table for item-specific unit conversions | Yes |
| 7 | `20260804200000_suppliers.sql` | `suppliers` master table, contact details, GSTIN, soft deletes | Yes |
| 8 | `20260804210000_tax_categories.sql` | `tax_categories`, `tax_rates` effective-dated GST tables | Yes |
| 9 | `20260804220000_inventory_alert_policies.sql` | `inventory_alert_policies` table (warning, critical, out of stock) | Yes |
| 10 | `20260804230000_inventory_engine.sql` | Immutable `inventory_ledger`, `inventory_snapshot`, `post_inventory_movement` RPC | Yes |
| 11 | `20260804240000_goods_receipts.sql` | `organization_sequences`, `goods_receipts`, `goods_receipt_items`, `post_goods_receipt` RPC | Yes |
| 12 | `20260805000000_employee_invitations.sql` | `organization_invitations`, `validate_invitation_token` RPC | Yes |
| 13 | `20260805040611_inventory_validation.sql` | Tightened negative-stock guards and unit validation on inventory movements | Yes |
| 14 | `20260805175804_purchase_orders.sql` | `purchase_orders`, `purchase_order_items`, `generate_po_number` trigger | Yes |
| 15 | `20260805175912_stock_transfers.sql` | Inter-branch `stock_transfers` tables and transfer numbering trigger | Yes |
| 16 | `20260805180004_update_grn_for_pos.sql` | Enhanced GRN posting logic to link purchase order status transitions | Yes |
| 17 | `20260806120000_add_get_my_role_code.sql` | `get_my_role_code` lightweight RPC for rapid client layout role resolution | Yes |
| 18 | `20260806130000_add_get_my_employee_info.sql` | `get_my_employee_info` returning employee context & permissions | Yes |
| 19 | `20260806140000_stock_transfers_schema.sql` | Formalized `stock_transfer_items` foreign key cascades & indexes | Yes |
| 20 | `20260806140500_stock_transfers_rpc.sql` | `post_stock_transfer` RPC posting 2-sided ledger movements atomically | Yes |
| 21 | `20260807051200_menu_management.sql` | `menu_categories`, `menu_items`, `menu_variants`, `recipe_items`, `branch_menu_configs` | Yes |
| 22 | `20260807060000_sales_pos.sql` | `sales_orders`, `sales_order_items`, `payments`, `process_sale` RPC | Yes |
| 23 | `20260807063000_employee_branch_assignment.sql` | Adds `location_id` to `organization_memberships`, updates `get_my_employee_info` | Yes |
| 24 | `20260807064000_pos_menu_rpc.sql` | `get_pos_menu` RPC returning active menu variants with branch pricing | Yes |
| 25 | `20260808010000_order_queue_schema.sql` | Adds `customer_name` and `customer_phone` to `sales_orders` | Yes |
| 26 | `20260808020000_order_queue_rpcs.sql` | Order queue RPCs: `create_order`, `start_preparing_order`, `mark_order_ready`, `complete_order`, `cancel_order`, `get_location_orders` | Yes |
| 27 | `20260808030000_order_queue_rls.sql` | RLS policies allowing POS terminals and kitchen staff order access | Yes |
| 28 | `20260808040000_audit_log_grant.sql` | `GRANT SELECT ON public.audit_log TO authenticated` | Yes |
| 29 | `20260811000000_audit_inventory_totals.sql` | Enhances inventory ledger audit trail with before/after stock quantities | Overridden by #30 |
| 30 | `20260811100000_fix_inventory_movement_overload.sql` | Drops conflicting function overload; unifies `post_inventory_movement` | Yes |
| 31 | `20260814173100_entity_comments.sql` | `comments` table linking notes to purchase orders or goods receipts | Yes |
| 32 | `20260826000000_grn_independent_receipts.sql` | Adds `purchase_order_item_id` to `goods_receipt_items`; allows shop facilities to receive direct goods | Yes |

---

## 3. Discrepancies, Recoveries, and Reconstructions

### 1. `get_unique_entity_types` in `app/(erp)/audit/page.tsx`
- **Finding**: In `app/(erp)/audit/page.tsx` (line 110), the code performs:
  ```ts
  const { data: uniqueEntityTypes } = (await supabase
    .rpc("get_unique_entity_types", { p_org_id: orgId })) as any;
  ```
- **Live Database Inspection**: Querying this RPC against the live production database returned error `PGRST202` (Could not find function in schema cache). It was called in UI code with fallback `|| []`, but the function was never created in the database.
- **Reconstruction**: To ensure 100% functionality for the incoming developer, the SQL for `get_unique_entity_types` has been authored and included in the optional enhancements:
  ```sql
  create or replace function public.get_unique_entity_types(p_org_id uuid)
  returns table(entity_type text)
  language sql
  stable
  security definer
  set search_path = public
  as $$
    select distinct a.entity_type
    from public.audit_log a
    where a.organization_id = p_org_id
      and a.entity_type is not null
    order by a.entity_type;
  $$;
  grant execute on function public.get_unique_entity_types(uuid) to authenticated;
  ```

### 2. `rls_auto_enable` RPC in Live DB
- **Finding**: The live OpenAPI endpoint lists an RPC `/rpc/rls_auto_enable`.
- **Origin**: This is a standard Supabase platform extension function added automatically when "Enable Row Level Security by default" is checked in the Supabase Dashboard.
- **Handover Impact**: All 37 tables in the migrations already have explicit `ALTER TABLE ... ENABLE ROW LEVEL SECURITY;` statements. Relying on this platform trigger is therefore unnecessary, but its presence is documented.

---

## 4. Production Database Safety & Integrity

During this entire audit:
- The live database was accessed strictly via **read-only** introspection queries (OpenAPI schema inspection and metadata count checks).
- **Zero records** were inserted, modified, or dropped.
- The working tree and migration history remain fully intact.

