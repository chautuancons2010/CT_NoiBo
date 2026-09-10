# Supabase Employee/RBAC Setup

## Current Status

- Employee/RBAC migration is ready at `supabase/migrations/202609090002_employee_rbac_foundation.sql`.
- The app reads Supabase data when `NEXT_PUBLIC_SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` are configured.
- Without Supabase env values, the app uses local demo data for UI development.

## Required Local Env

Create `.env.local` with:

```bash
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
APP_TIMEZONE=Asia/Ho_Chi_Minh
APP_BASE_URL=http://localhost:3000
```

`SUPABASE_SERVICE_ROLE_KEY` must stay server-side only.

## Apply Migration

This machine currently does not have the Supabase CLI available.

After Supabase CLI is installed and authenticated:

```bash
supabase login
supabase link --project-ref <project-ref>
supabase db push
```

## Notes

- Employee records are separate from app accounts.
- Sensitive profile data is in `employee_sensitive_profiles`.
- Employee documents reference `file_assets`; private storage access still goes through `/api/v1/files/:assetId/signed-url`.
- The current code has a Supabase read adapter. Mutating API routes still use the local repository fallback until write-through is connected and tested against the target project.
