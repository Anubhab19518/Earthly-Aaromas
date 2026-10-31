# Tea Chain ERP: API Documentation Index

Welcome to the **Tea Chain ERP API Reference**.  
The API layer is structured according to **OpenAPI 3.1 standards**, combining Supabase PostgreSQL REST endpoints, high-performance transactional PL/pgSQL RPCs, and Next.js Server Actions.

---

## Feature API Modules

| Module Directory | Area | Specification Document | Key Capabilities |
|---|---|---|---|
| `docs/api/auth/` | Authentication & Identity | [**`auth.md`**](./auth/auth.md) | Supabase Auth, TOTP MFA AAL2 assurance, Organization bootstrapping |
| `docs/api/master-data/` | Master Data | [**`master-data.md`**](./master-data/master-data.md) | Ingredients, Units of Measurement, Unit Conversions, Suppliers, GST Taxes |
| `docs/api/inventory/` | Inventory Engine | [**`inventory.md`**](./inventory/inventory.md) | `post_inventory_movement` RPC, Snapshot reads, Adjustments, Stock Transfers, Alerts |
| `docs/api/purchasing-receiving/` | Purchasing & GRN | [**`purchasing-receiving.md`**](./purchasing-receiving/purchasing-receiving.md) | Purchase Order workflow, Goods Receipt Notes (GRN), Automated PO fulfillment |
| `docs/api/menu-recipes/` | Menu & Recipes | [**`menu-recipes.md`**](./menu-recipes/menu-recipes.md) | Menu items, Variants, Recipe Bill of Materials (BOM), Branch pricing overrides |
| `docs/api/pos-orders/` | Point of Sale & Queue | [**`pos-orders.md`**](./pos-orders/pos-orders.md) | Branch POS menu RPC, Order Queue (`create_order`, `complete_order`), Live kitchen feed |
| `docs/api/team/` | Team & Governance | [**`team.md`**](./team/team.md) | Employee invitations with Resend email, branch assignments, token verification |
| `docs/api/analytics-audit/` | Analytics & Audit | [**`analytics-audit.md`**](./analytics-audit/analytics-audit.md) | Financial overview metrics, branch performance, immutable audit log queries |

---

## Authentication & Security Model

All API endpoints and RPCs enforce multi-tenant scoping and authentication checks:
1. **Bearer Token Authentication**: PostgREST endpoints expect `Authorization: Bearer <JWT>` containing the authenticated user session.
2. **PostgreSQL Row Level Security (RLS)**: Enforced across all tables. Direct queries only return data belonging to the user's active `organization_id`.
3. **MFA Assurance (`has_mfa_assurance()`)**: Owner-level actions require the token to possess Authenticator Assurance Level 2 (`aal2`).
4. **Security Definer RPCs**: Complex multi-step transactions (such as order completion or GRN posting) run inside atomic PL/pgSQL routines with internal permission validation.
