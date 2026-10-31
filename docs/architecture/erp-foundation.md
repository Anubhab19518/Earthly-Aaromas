# Tea Chain ERP: System Architecture & Foundation

**Version:** 1.0 (Production Handover)  
**Status:** Complete & Deployed

---

## 1. Product & Architecture Overview

Tea Chain ERP is an enterprise multi-location operating system tailored for high-volume tea retail chains. The architecture unifies centralized inventory control, recipe-based consumption, warehouse-to-shop stock movement, and point-of-sale order queues into a single PostgreSQL database powered by Supabase.

### Core Operating Flow:
```text
Supplier ──> Purchase Order ──> Goods Receipt (GRN) ──> Warehouse Stock
                                                            │
                                                     Stock Transfer
                                                            │
                                                            ▼
Customer Order ◄── Point of Sale (POS) ◄── Recipe BOM ◄── Shop Stock
      │                   ▲
      ▼                   │
Kitchen Queue ──── Order Status (Pending -> Preparing -> Ready -> Completed)
```

### Architectural Tenets:
1. **Multi-Tenancy at Root**: Every business entity is scoped to an `organization_id`.
2. **Immutable Inventory Ledger**: Stock is never arbitrarily updated. Every movement is recorded in an append-only ledger (`inventory_ledger`) with a synchronous projection snapshot (`inventory_snapshot`).
3. **Ingredients in Base Units**: Stock is held strictly in base units (e.g. grams, millilitres, pieces). Recipe items and purchase orders specify conversion ratios that translate cleanly to base units without rounding drift.
4. **Decoupled Menu & Recipes**: Menu items are sellable products, not inventory items. Every menu variant references a Bill of Materials (`recipe_items`) that automatically deducts ingredients upon order fulfillment.
5. **Defense-in-Depth Security**: UI client validation with Zod, Server Action permission checks, PostgreSQL Row Level Security (RLS), and Time-based One-Time Password (TOTP) AAL2 enforcement for administrative access.

---

## 2. Technology Stack

| Layer | Technologies | Role |
|---|---|---|
| **Frontend Framework** | Next.js 16 (App Router), React 19, TypeScript | Server and Client Components, layout guards |
| **Styling & UI** | Tailwind CSS v4, Lucide Icons, Radix UI primitives | Responsive design, POS terminal interfaces |
| **State & Forms** | TanStack Query v5, React Hook Form, Zod | Client data caching, optimistic updates, schema validation |
| **Data Layer & RLS** | Supabase PostgreSQL, PostgREST | Managed PostgreSQL, security-definer RPCs, row-level policies |
| **Authentication** | Supabase Auth (SSR Cookie based), TOTP MFA | Session management, AAL2 security enforcement |
| **Notifications** | Resend API | Automated employee invitation emails |

---

## 3. Security Boundary & Access Control

```mermaid
flowchart TD
    User([User Request]) --> Proxy[Next.js Edge Proxy / Middleware]
    Proxy --> AuthCheck{Authenticated?}
    AuthCheck -- No --> Login[/login / /employee-login]
    AuthCheck -- Yes --> RoleCheck{Role & Path Match?}
    RoleCheck -- Mismatch --> RoleRedirect[Redirect to Portal]
    RoleCheck -- Match --> ServerAction[Next.js Server Action]
    ServerAction --> ZodValidation{Zod Schema Valid?}
    ZodValidation -- Invalid --> ReturnError[Return Validation Error]
    ZodValidation -- Valid --> SupabaseClient[Supabase Client]
    SupabaseClient --> PostgresRLS[PostgreSQL RLS & RPC Security Definer]
    PostgresRLS --> TenantGuard{Organization & AAL2 Verified?}
    TenantGuard -- No --> Deny[Access Denied / Exception]
    TenantGuard -- Yes --> DBCommit[(PostgreSQL Tables / Ledger)]
```

### Role Model:
- **`OWNER`**: Global organizational administrator. Requires TOTP AAL2 verification to access ERP routes. Full authority over master data, inventory policies, finances, purchasing, recipe composition, and team management.
- **`EMPLOYEE`**: Branch operator. Bound to a specific branch (`location_id`). Authorized for Point-of-Sale operations, kitchen queue execution, and viewing local branch menu availability.

---

## 4. Database Engine Design

### 4.1 Immutable Inventory Ledger
```text
Table: inventory_ledger (Append-Only)
---------------------------------------------------------------
id                UUID (PK)
organization_id   UUID (FK -> organizations)
location_id       UUID (FK -> locations)
ingredient_id     UUID (FK -> ingredients)
transaction_type  TEXT ('GOODS_RECEIPT' | 'TRANSFER_IN' | 'TRANSFER_OUT' | 'SALE' | 'WASTAGE' | 'STOCK_ADJUSTMENT')
quantity_change   NUMERIC(12, 3) (Positive or Negative)
unit_id           UUID (FK -> units)
running_cost      NUMERIC(12, 2)
reference_type    TEXT ('PO' | 'GRN' | 'TRANSFER' | 'ORDER' | 'MANUAL')
reference_id      TEXT
created_at        TIMESTAMPTZ DEFAULT now()
```

Every ledger posting is executed via the atomic PostgreSQL function `public.post_inventory_movement()`. An event trigger (`prevent_ledger_mutation_trigger`) strictly blocks `UPDATE` and `DELETE` queries on `inventory_ledger`.

### 4.2 Materialized Inventory Snapshot
```text
Table: inventory_snapshot
---------------------------------------------------------------
(organization_id, location_id, ingredient_id) PRIMARY KEY
quantity_on_hand  NUMERIC(12, 3)
updated_at        TIMESTAMPTZ DEFAULT now()
```
The snapshot provides instantaneous $O(1)$ stock checks without having to aggregate millions of historical ledger records on each read.

---

## 5. Module & Codebase Structure

```text
app/
  (auth)/                   Login routes for Owner and Employee
  (employee)/               Dedicated POS and Kitchen Queue portal
  (erp)/                    Owner ERP administration portal
  (mfa)/                    TOTP MFA enrollment and verification
modules/
  analytics/                Financial reports, shop & warehouse metrics
  audit/                    Operational audit log viewers
  auth/                     Session, MFA, and organization onboarding
  ingredients/              Ingredient catalogue, categories, and unit conversions
  inventory/                Stock ledger, adjustments, transfers, and alert policies
  locations/                Warehouse and retail shop branch management
  menu/                     Menu items, variants, categories, and recipe BOMs
  pos/                      Terminal order entry, payment recording, and kitchen queue
  purchasing/               Purchase order authoring and supplier tracking
  receiving/                Goods Receipt Notes (GRN) and PO fulfillment
  shared/                   Cross-cutting comments, dialogs, and table components
  suppliers/                Supplier directories and contact records
  taxes/                    GST categories and effective-dated tax rates
  team/                     Team management, role assignment, and invitation emails
  units/                    Measurement units and conversion factors
shared/
  components/               Reusable UI primitives and layout navigation
  lib/                      Supabase clients (SSR, browser, admin) and utility helpers
  providers/                Branch context and TanStack Query providers
supabase/
  migrations/               All 32 versioned database migrations
```
