# Handover Checklist: Tea Chain ERP Database & Environment

Use this checklist during onboarding to verify the database and application setup on a new Supabase project.

---

## Pre-Requisites
- [ ] New Supabase project created on receiving developer's account.
- [ ] Database credentials and API keys saved securely.
- [ ] Node.js (v20+) and npm installed locally.

---

## Database Provisioning
- [ ] Migrations applied (either via `handover/database_schema_snapshot.sql` in SQL Editor or `supabase db push`).
- [ ] Reference units seeded into `public.units`.
- [ ] All 37 public tables confirmed visible in Supabase **Table Editor**:
  - [ ] `organizations`
  - [ ] `profiles`
  - [ ] `organization_memberships`
  - [ ] `roles`
  - [ ] `permissions`
  - [ ] `role_permissions`
  - [ ] `membership_roles`
  - [ ] `audit_log`
  - [ ] `location_types`
  - [ ] `locations`
  - [ ] `units`
  - [ ] `ingredient_categories`
  - [ ] `ingredients`
  - [ ] `ingredient_unit_conversions`
  - [ ] `suppliers`
  - [ ] `tax_categories`
  - [ ] `tax_rates`
  - [ ] `inventory_alert_policies`
  - [ ] `inventory_ledger`
  - [ ] `inventory_snapshot`
  - [ ] `organization_sequences`
  - [ ] `goods_receipts`
  - [ ] `goods_receipt_items`
  - [ ] `organization_invitations`
  - [ ] `purchase_orders`
  - [ ] `purchase_order_items`
  - [ ] `stock_transfers`
  - [ ] `stock_transfer_items`
  - [ ] `menu_categories`
  - [ ] `menu_items`
  - [ ] `menu_variants`
  - [ ] `recipe_items`
  - [ ] `branch_menu_configs`
  - [ ] `sales_orders`
  - [ ] `sales_order_items`
  - [ ] `payments`
  - [ ] `comments`

---

## Authentication & Security Settings
- [ ] Email authentication enabled in Supabase **Authentication > Providers > Email**.
- [ ] TOTP Multi-Factor Authentication enabled in Supabase **Authentication > Multi-Factor**.
- [ ] Row Level Security (RLS) confirmed enabled on all public tables.

---

## Application Configuration & Verification
- [ ] `.env.local` configured with new `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`, and `SUPABASE_SERVICE_ROLE_KEY`.
- [ ] Dependencies installed: `npm install`.
- [ ] Application starts cleanly: `npm run dev`.
- [ ] Owner sign-up completed at `/signup`.
- [ ] TOTP Authenticator enrollment verified at `/mfa/enroll`.
- [ ] Organization onboarding completed at `/onboarding` (seeds Owner role).
- [ ] Owner successfully lands on `/dashboard`.

---

## Core Operational Sanity Tests
- [ ] **Locations**: Create a Warehouse and a Retail Shop at `/locations`.
- [ ] **Ingredients**: Create an ingredient (e.g. "Assam Tea CTC") and verify it appears with its base unit at `/ingredients`.
- [ ] **Purchases**: Create a Purchase Order at `/purchase-orders/new`.
- [ ] **Goods Receipt (GRN)**: Receive the goods at `/receiving/new` and click **Post GRN**. Confirm inventory snapshot increments at `/inventory`.
- [ ] **Menu & POS**: Create a menu item with a recipe at `/menu`, and test order placement at `/pos`.

