# LLM Data Platform (MVP)

Next.js (App Router) + TypeScript + Tailwind + Prisma + OpenAI + Postgres. Includes NL→SQL with guardrails, schema introspection, query execution, audit logging, and CSV export. Auth is wired for Firebase (Google) in this repo; NextAuth envs are listed below if you prefer that path.

## Setup
- Install dependencies
  - `npm install`
- Create the database schema
  - `npx prisma generate`
  - `npx prisma migrate dev --name init`
- Seed demo data (into your analytics/data-source DB)
  - `psql "$DEFAULT_DATASOURCE_URL" -f seed-demo-data.sql`
  - Or: `psql "$DATABASE_URL" -f seed-demo-data.sql` if you’re using the app DB as the data source

## Environment
Required:
- `DATABASE_URL` – Postgres for app data (Prisma models, settings, audit logs)
- `OPENAI_API_KEY` – OpenAI key for NL→SQL
- `NEXTAUTH_SECRET` – If using NextAuth; generate: `openssl rand -base64 32`
- `NEXTAUTH_URL` – e.g. `http://localhost:3000`

Optional/used in this repo (Firebase Google sign-in):
- `NEXT_PUBLIC_FIREBASE_API_KEY`
- `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN`
- `NEXT_PUBLIC_FIREBASE_PROJECT_ID`
- `NEXT_PUBLIC_FIREBASE_APP_ID`
- `FIREBASE_PROJECT_ID`
- `FIREBASE_CLIENT_EMAIL`
- `FIREBASE_PRIVATE_KEY` (wrap in quotes; replace \n with newlines)

Other optional:
- `DEFAULT_DATASOURCE_URL` – Fallback data-source connection string
- `OPENAI_MODEL` – Defaults to `gpt-4o-mini`

## Run Locally
- `npm run dev`
- Open `http://localhost:3000`
- Sign in with Google (Firebase) and configure a data source under Settings → Data Sources

## Deploy (Vercel + Neon)
1) Create a Postgres database on Neon (or similar). Get the connection string.
2) Push repo to GitHub and import into Vercel.
3) In Vercel Project → Settings → Environment Variables, set at minimum:
   - `DATABASE_URL` (app DB, e.g., Neon)
   - `OPENAI_API_KEY`
   - `NEXTAUTH_SECRET`, `NEXTAUTH_URL` (if you opt to use NextAuth)
   - For Firebase auth (as implemented here): `NEXT_PUBLIC_FIREBASE_*`, `FIREBASE_*`
   - Optionally: `DEFAULT_DATASOURCE_URL`, `OPENAI_MODEL`
4) Run database migrations on deploy:
   - Vercel Build Command can include `npx prisma migrate deploy`
   - Or run it manually once via Vercel CLI/Neon console
5) Seed your analytics/data-source DB with `seed-demo-data.sql` (run against that DB, not necessarily the app DB)

## Acceptance Tests
Use the UI (home page or /query) with the demo seed (products/sales) to validate.

- Earnings last month
  - Ask: “Total revenue in the last 30 days” or “Revenue by day for last month”.
  - Expect a SELECT with `SUM(qty * unit_price)` filtered by `occurred_at` in the last 30 days and an enforced `LIMIT`.
  - Rows return non-zero totals if you loaded `seed-demo-data.sql`.

- Top products
  - Ask: “Top 3 products by revenue in the last 30 days”.
  - Expect grouping by product with revenue ordering and `LIMIT 3`.

- Mutation blocked
  - Try to run: `DELETE FROM sales` or “truncate sales”.
  - Guardrails should reject with an error (only SELECT or WITH…SELECT allowed; no DDL/DML).

- CSV download
  - After a successful query, click “Download CSV” (home) or “Export CSV” (/query).
  - Validate headers match the fields and the number of data rows equals the table view.

- AuditLog increments
  - Each generate/run/export records an entry in the Prisma `AuditLog` table.
  - Check via Prisma Studio: `npx prisma studio` → AuditLog, or run a SQL count against the app DB.

## Notes
- Guardrails: regex-based checks enforce single SELECT and append LIMIT if missing. For stronger guarantees, integrate a SQL parser.
- Data sources are saved under a demo org (`demo-org`) for simplicity in this MVP.
- Seed data script: `seed-demo-data.sql` creates `products` and `sales` with sample rows across ~30 days.
