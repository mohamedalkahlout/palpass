# PALPASS — Secret Rotation & Git Hygiene Runbook

Deterministic operator checklist. **Perform on a maintenance window.** After every
rotation, update `.env.local`, restart the app, and re-run the leak scan below.

---

## 0. Why this exists (incident context)

Live credentials were historically hardcoded in tracked files and are present in
`git` history (Stages before the C1 closure). Anyone with repo access historically
held full Postgres + service-role power. **Rotation invalidates those leaked values
regardless of history.** The history scrub (§5) removes the *capability surface*.

Previously exposed material (now scrubbed from the working tree/HEAD, still in history):
- `postgresql://postgres:…@db.gzxftbwcnyxjqhzhqfcr.supabase.co:5432/postgres`
- session-pooler DSN with the same password.
- a live `service_role` JWT (legacy JWT form) and a live `sb_secret_…` admin key (new form).

---

## 1. Rotate the Postgres superuser password (HIGHEST urgency)

1. Supabase Dashboard → **Project Settings → Database → Database Password → Reset**.
2. Generate a strong password (≥24 random chars).
3. Update `.env.local`:
   - `DATABASE_URL=postgresql://postgres:<NEW>@db.YOUR_PROJECT_REF.supabase.co:5432/postgres`
   - `DATABASE_POOLER_URL=postgresql://postgres.YOUR_PROJECT_REF:<NEW>@aws-…pooler.supabase.com:6543/postgres`
   - Also any CI secrets (`DATABASE_URL`, `DATABASE_POOLER_URL`).
4. Confirm pooler + direct connections work: `node scripts/sync-biometric-schema.mjs` (env-driven).

> The previously leaked live database password (direct + its pooler-encoded form) is **compromised** —
> it must never be reused. Do not echo those exact strings here; keep them only in your local
> incident notes / `.env.local` backups so the `--replace-text` values below can be filled from them.
> placeholder tokens used in this file: `<OLD_DB_PASSWORD>`, `<OLD_POOLER_PASSWORD>`, `<OLD_SB_SECRET_KEY>`.

## 2. Rotate the Supabase JWT secrets (anon + service_role)

1. Supabase Dashboard → **Project Settings → API → JWT Secret → Generate new secret**.
   This re-issues the `anon` (`NEXT_PUBLIC_SUPABASE_ANON_KEY`) and
   `SUPABASE_SERVICE_ROLE_KEY` values automatically.
2. The Dashboard may also allow generating a new `sb_secret_…` platform key under
   **Access Tokens**. If the legacy paths (stages before C1) were shared, generate
   a new project key and revoke the old one.
3. Update `.env.local` with the new keys and restart:
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `SUPABASE_SERVICE_ROLE_KEY`
4. **Impact note:** all JWTs signed with the old secret are invalidated — existing
   user sessions and Realtime connections must re-authenticate. Announce before
   rotating in production.

## 3. Rotate email / SMTP credentials

1. For Gmail: Google Account → **Security → App passwords** → generate a new app
   password (for the same sender account used in `SMTP_USER`).
2. Update `.env.local`: `SMTP_PASS` / `GMAIL_APP_PASSWORD`.
3. Send a smoke email via `scripts/smtp-speed-and-recover.mjs` (env-driven) and
   confirm `250 OK` and latency `< 2500 ms`.

## 4. Resend (if enabled later)
Rotate `RESEND_API_KEY` in the Resend dashboard and update env. Revoke any key that
ever appeared in git history.

## 5. Purge the credentials from repository history (once, after rotation)

> Destructive + rewrite of shared history. Requires a new baseline commit and force-push.
> Coordinate with all clone holders; treat origin as replaced afterwards.

1. Install `git-filter-repo` (recommended) or BFG.
2. Remove every occurrence of the leaked strings and **drop** the secret-carrying
   helper files entirely:
   ```
   git filter-repo --invert-paths \
     --path supabase/exec_migration.mjs \
     --path supabase/migrate.mjs \
     --path supabase/run_migration.js \
     --path scripts/sync-biometric-schema.mjs \
     --replace-text <(printf '<OLD_DB_PASSWORD>=>REDACTED\n<OLD_POOLER_PASSWORD>=>REDACTED\n<OLD_SB_SECRET_KEY>=>REDACTED')
   ```
3. `git push --force --all && git push --force --tags`.
4. Confirm: `git log -S '<OLD_DB_PASSWORD>' --all` returns nothing, and the scan in §7 is clean.

## 6. Post-rotation launch checklist

- [ ] `.env.local` updated + `.env.example` still placeholder-only (no real values).
- [ ] CI secrets updated (`NEXT_PUBLIC_SUPABASE_URL`, anon key, service role, `DATABASE_URL`, `DATABASE_POOLER_URL`, SMTP).
- [ ] `pnpm lint` = 0/0, `pnpm build` = exit 0.
- [ ] `pnpm test:auth` + `pnpm test:civic` green against staging/live as sanctioned.
- [ ] Baseline DB invariants preserved (4 system profiles, zero synthetic artifacts) after test runs.

## 7. Verification — automated leak scan (re-run after any rotation)

Tracked files only (excludes `.env*`, lockfiles, `node_modules`):

| Pattern | Meaning |
|---|---|
| `postgresql://(postgres\|postgresql)[^@]*:[^@]+@` | DB DSN with password |
| the exact compromised DB / pooler password strings (from incident notes) | known leaked credentials — never echo them in repo files |
| `sb_secret_` | Supabase new-format admin key |
| `eyJ[...]{30,}` | any JWT-style bearer token |
| `ghp_\|gho_\|AKIA[0-9A-Z]{16}` | GitHub / AWS access keys |
| `xox[baprs]-` | Slack tokens |

Operator command:
```
git grep -n -E "postgresql://(postgres|postgresql)[^@]*:[^@]+@|<OLD_DB_PASSWORD>|<OLD_POOLER_PASSWORD>|sb_secret_|eyJ[a-zA-Z0-9_-]{30,}|gh[pousr]_[a-zA-Z0-9]{30,}|AKIA[0-9A-Z]{16}" -- . ':(exclude)*.lock'
```
Expected result: **zero matches**.