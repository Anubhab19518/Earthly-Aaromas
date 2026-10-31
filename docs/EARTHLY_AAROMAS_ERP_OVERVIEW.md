# EARTHLY AAROMAS ERP — SYSTEM HANDOVER & ARCHITECTURE OVERVIEW

**Document Type:** Formal System Handover & Operational Specification  
**System Name:** Earthly Aaromas Multi-Branch ERP Operating System  
**Version:** 1.0 Production  
**Confidentiality:** Proprietary & Confidential  

---

## 1. Executive Summary & Purpose

**Earthly Aaromas ERP** is an enterprise-grade operating system designed for high-volume tea-chain and café retail networks. The system coordinates centralized warehouse procurement, inter-branch logistics, real-time recipe-based ingredient consumption, and rapid storefront Point of Sale (POS) operations within a single, highly performant PostgreSQL architecture hosted on Supabase.

The platform provides a dual-surface experience:
1. **Administrative Owner Portal (`/dashboard`)**: Centralized multi-branch control over master data, recipes, purchasing orders, goods receipts, warehouse dispatch, tax configuration, and financial intelligence.
2. **Dedicated Storefront & Kitchen Portal (`/employee-login` ➔ `/employee`)**: Streamlined, touch-optimized interface for counter employees to process customer orders, view active kitchen queues, and track local branch operations without access to administrative controls.

---

## 2. Storefront & Employee Login Routing Details

For store managers, cashiers, and kitchen baristas, the platform provides dedicated storefront routing isolated from administrative paths:

### 2.1 Storefront Routes Reference
- **Storefront Login URL:** `https://<YOUR-DOMAIN>/employee-login` (or `http://localhost:3000/employee-login`)
- **Storefront Dashboard:** `/employee` (overview of branch staff, assigned location, and quick actions)
- **Storefront POS Terminal:** `/employee/pos` (menu grid, variant selection, real-time cart, and billing)
- **Live Kitchen Order Queue:** `/employee/orders` (real-time order status tracking: *Pending* ➔ *Preparing* ➔ *Ready* ➔ *Completed*)

### 2.2 Role & Edge Proxy Routing Rules
The application enforces strict role routing at the edge via [`proxy.ts`](file:///d:/Projects/Tea-Chain/proxy.ts):
- When an employee signs in at `/employee-login`, the backend calls `get_my_role_code` and `get_my_employee_info`, sets a secure `tc_role=EMPLOYEE` cookie, and binds the session directly to their assigned branch (`location_id`).
- Employees are strictly blocked from accessing `/dashboard`, `/inventory`, `/suppliers`, `/receiving`, or `/team`. Any attempt to access owner routes automatically redirects them to `/employee`.
- Owners signing in at `/login` are required to fulfill TOTP Multi-Factor Authentication (AAL2 assurance) before entering `/dashboard`.

---

## 3. High-Level Architecture & Operating Model

```text
                               ┌────────────────────────────────────────────────┐
                               │             SUPPLIERS / VENDORS                │
                               └──────────────────────┬─────────────────────────┘
                                                      │ Purchase Orders (PO)
                                                      ▼
                               ┌────────────────────────────────────────────────┐
                               │           CENTRAL WAREHOUSE FACILITY           │
                               │  - Goods Receipt Notes (GRN Intake)            │
                               │  - Raw Ingredient Base Stock (g, ml, pcs)      │
                               └──────────────────────┬─────────────────────────┘
                                                      │ Stock Transfers (TR)
                                                      ▼
                               ┌────────────────────────────────────────────────┐
                               │         RETAIL STOREFRONTS & BRANCHES          │
                               │  - Storefront POS Terminal (/employee/pos)     │
                               │  - Kitchen Display Queue (/employee/orders)    │
                               │  - Local Stock Snapshot Deduction via Recipe   │
                               └────────────────────────────────────────────────┘
```

### Core Architecture Pillars:
1. **Centralized Multi-Tenancy**: All database tables are scoped to an `organization_id` with strict PostgreSQL Row Level Security (RLS).
2. **Immutable Double-Entry Ledger (`inventory_ledger`)**: Physical stock is never modified by arbitrary database writes. All movements (`GOODS_RECEIPT`, `TRANSFER_IN`, `TRANSFER_OUT`, `SALE`, `WASTAGE`, `STOCK_ADJUSTMENT`) are appended immutably to a ledger with before/after audit trails.
3. **Materialized Stock Snapshot (`inventory_snapshot`)**: A synchronous $O(1)$ projection maintaining exact on-hand balances per ingredient and location.
4. **Base-Unit Stock Accounting**: Inventory is stored strictly in canonical base units (e.g., grams, millilitres). Automatic unit conversions handle supplier quantities (kg, L, packets) without conversion rounding drift.
5. **Bill of Materials (BOM) Recipe Engine**: Menu items are sellable recipes, not stock. Completing an order at the POS automatically decrements the exact quantity of tea leaves, milk, sugar, and packaging specified in the variant's recipe.

---

## 4. Feature Matrix by Module

| Module | Purpose & Core Capabilities |
|---|---|
| **Storefront POS** | Quick counter checkout, branch-specific menu pricing, modifier variants, invoice generation, cash/card/UPI payments. |
| **Kitchen Queue** | Real-time queue view for kitchen staff to transition orders: `PENDING` ➔ `PREPARING` ➔ `READY` ➔ `COMPLETED`. |
| **Inventory Engine** | Immutable ledger, branch stock snapshot, inventory adjustments, spillage/waste logging, multi-threshold stock alerts (Warning / Critical / Out-of-Stock). |
| **Purchasing & GRN** | Supplier directories, purchase order lifecycles (`DRAFT` ➔ `APPROVED` ➔ `SENT`), independent and PO-linked Goods Receipt Notes (GRN). |
| **Inter-Branch Transfers** | Multi-location logistics: draft transfer, dispatch `IN_TRANSIT`, receive and atomically post two-sided ledger updates. |
| **Menu & Recipes** | Categorized menu catalog, variant options (Cutting, Regular, Large), and exact ingredient Bill of Materials (BOM). |
| **Team Governance** | Employee onboarding, cryptographically secure invitation links, branch assignments, and automated credential dispatch via Resend. |
| **Financial Analytics** | Branch revenue tracking, COGS (Cost of Goods Sold), gross margins, stock valuation, and customer retention metrics. |
| **Audit Logs** | Immutable, queryable log of all sensitive inventory, purchasing, and identity actions across the entire enterprise. |

---

## 5. Technology Stack

- **Application Framework:** Next.js 16 (App Router), React 19, TypeScript
- **Styling & Components:** Tailwind CSS, Radix UI Primitives, Lucide Icons
- **State Management & Caching:** TanStack Query v5, React Hook Form, Zod
- **Database & Identity:** Supabase PostgreSQL with Row Level Security (RLS)
- **Security Definer Routines:** 23 PL/pgSQL database functions executing atomic multi-table transactions
- **Authentication:** Supabase SSR Auth with cookie sessions and TOTP MFA (AAL2)
- **Email Delivery:** Resend API integration for automated team credential delivery

---

## 6. How to Run the Project (Developer & Handover Guide)

### 6.1 Prerequisites
- **Node.js**: v20.x or higher
- **Package Manager**: npm (v10+)
- **Supabase Account**: A provisioned project on [supabase.com](https://supabase.com)

### 6.2 Environment Configuration
Create a `.env.local` file in the root directory by copying `.env.example`:

```bash
cp .env.example .env.local
```

Populate the required environment variables:
```env
NEXT_PUBLIC_SUPABASE_URL=https://<your-project-ref>.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=<your-anon-publishable-key>

SUPABASE_URL=https://<your-project-ref>.supabase.co
SUPABASE_PUBLISHABLE_KEY=<your-anon-publishable-key>
SUPABASE_SERVICE_ROLE_KEY=<your-service-role-secret-key>

# Email Delivery for Team Provisioning
RESEND_API_KEY=<your-resend-api-key>
RESEND_FROM_EMAIL=Earthly Aaromas <onboarding@resend.dev>

# App URL
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

### 6.3 Database Initialization
Apply the complete baseline schema using either method:
- **Option 1 (Supabase Dashboard SQL Editor):** Copy the contents of `handover/database_schema_snapshot.sql` and run it in the Supabase SQL Editor.
- **Option 2 (Supabase CLI):** Run `supabase db push` to sequentially apply all migrations from `supabase/migrations/`.

### 6.4 Installation & Startup
```bash
# Install dependencies
npm install

# Run development server
npm run dev
```

Visit:
- **Owner Admin Portal:** `http://localhost:3000/login`
- **Employee Storefront Portal:** `http://localhost:3000/employee-login`

### 6.5 Quality Verification Commands
```bash
# Run lint check (0 errors)
npm run lint

# Run production build (0 errors)
npm run build
```

