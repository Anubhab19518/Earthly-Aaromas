# Database Setup Guide for Handover: Tea Chain ERP

This guide provides complete instructions for setting up a brand-new Supabase project and initializing the PostgreSQL database for the Tea Chain ERP system without requiring access to the previous owner's Supabase account.

---

## 1. Create a New Supabase Project

1. Log in to your own account on [supabase.com](https://supabase.com).
2. Click **New Project**.
3. Fill in:
   - **Name**: `Tea Chain ERP` (or your company name).
   - **Database Password**: Choose a strong password and save it securely in your password manager.
   - **Region**: Choose the region closest to your operations (e.g. `ap-south-1` Mumbai / India).
   - **Pricing Plan**: Free tier is sufficient for testing; Pro tier recommended for production.
4. Click **Create new project** and wait 1-2 minutes for provisioning to finish.

---

## 2. Execute Migrations

You have two simple options to execute the schema setup:

### Option A: Complete Baseline Script (Recommended for Fast Clean Setup)

1. In your new Supabase Project Dashboard, navigate to the **SQL Editor** tab on the left sidebar.
2. Click **New query**.
3. Open the file `handover/database_schema_snapshot.sql` in your code editor.
4. Copy the entire contents of `database_schema_snapshot.sql` and paste them into the Supabase SQL Editor.
5. Click **Run** (or press `Ctrl+Enter`).
6. Confirm that the execution finishes with `Success. No rows returned`.

### Option B: Supabase CLI / Individual Migration Files

If you prefer to maintain the migration history tracking table (`supabase_migrations`):

1. Install Supabase CLI:
   ```bash
   npm install -g supabase
   ```
2. Link your local project to your new Supabase project:
   ```bash
   supabase login
   supabase link --project-ref <your-new-project-ref>
   ```
3. Push all migrations in sequential order:
   ```bash
   supabase db push
   ```
   All 32 migrations in `supabase/migrations/` will execute sequentially.

---

## 3. Seed Reference Data

The migrations automatically seed system tables (`location_types`, default `permissions`).
To populate initial units of measurement for ingredients, run the following snippet in the **SQL Editor**:

```sql
-- Seed base measurement units
insert into public.units (id, name, symbol, measurement_category, is_base_unit, base_unit_id, conversion_factor, status)
values
  ('c931fbb1-ed2a-4932-a2d9-4f956dc8ec39', 'Gram', 'g', 'WEIGHT', true, null, null, 'ACTIVE'),
  ('e56fb1e4-a0f3-4f5c-8ff7-c26924e0daa4', 'Millilitre', 'ml', 'VOLUME', true, null, null, 'ACTIVE'),
  ('3a6798e5-3bf0-4e61-9112-75eeb95d4455', 'Tablespoon', 'tbsp', 'COOKING', true, null, null, 'ACTIVE'),
  ('d1c0c799-fff3-414c-b3a7-d0440c859916', 'Kilogram', 'kg', 'WEIGHT', false, 'c931fbb1-ed2a-4932-a2d9-4f956dc8ec39', 1000, 'ACTIVE'),
  ('566d37e6-ff5c-4e72-9cc4-baa74986c04b', 'Litre', 'L', 'VOLUME', false, 'e56fb1e4-a0f3-4f5c-8ff7-c26924e0daa4', 1000, 'ACTIVE')
on conflict (id) do nothing;
```

---

## 4. Environment Variables Configuration

Copy `.env.example` to `.env` or `.env.local` in the project root:

```bash
cp .env.example .env.local
```

Retrieve your new Supabase project API keys from **Project Settings > API**:
- **Project URL**: Found under Configuration > Project URL.
- **Anon / Public Key**: Found under Project API Keys (`anon public`).
- **Service Role Key**: Found under Project API Keys (`service_role secret`).

Set these keys in your `.env.local`:
```env
NEXT_PUBLIC_SUPABASE_URL=https://<your-project-ref>.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=<your-anon-key>

SUPABASE_URL=https://<your-project-ref>.supabase.co
SUPABASE_PUBLISHABLE_KEY=<your-anon-key>
SUPABASE_SERVICE_ROLE_KEY=<your-service-role-key>

# Optional email delivery for employee invitations
RESEND_API_KEY=<your-resend-key>
RESEND_FROM_EMAIL=onboarding@resend.dev
```

---

## 5. Required Supabase Dashboard Configuration

### Authentication Settings
1. Go to **Authentication > Providers > Email**:
   - Ensure **Email provider** is enabled.
   - For initial testing, you can disable **Confirm email** if you want fast signups without setting up custom SMTP. For production, enable email confirmations or configure custom SMTP.
2. Go to **Authentication > Multi-Factor Authentication (MFA)**:
   - Ensure **TOTP** (Time-based One-Time Password) is enabled. The ERP layout enforces `aal2` authentication for Owners.

---

## 6. Initial Application Launch & Owner Onboarding

1. Start the development server:
   ```bash
   npm install
   npm run dev
   ```
2. Navigate to `http://localhost:3000`.
3. Sign up with your Owner account email and password.
4. Set up TOTP Authenticator (Google Authenticator / 1Password) when prompted.
5. You will be redirected to `/onboarding`. Enter your Organization name (e.g. "Tea Chain HQ") and your Full Name.
6. The system executes `public.bootstrap_organization()`, atomically creating your organization and assigning you the `OWNER` role.
7. Access `/dashboard` to manage locations, suppliers, ingredients, menu items, and team members!

