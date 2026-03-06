# Pulseboard

Pulseboard is a hosted realtime events dashboard built with Next.js, Supabase, and Drizzle. It gives you an always-on `POST /api/events` ingestion endpoint and a protected admin dashboard for project monitoring.

## Stack

- Next.js App Router
- Supabase Auth, Postgres, and Realtime
- Drizzle ORM for schema and migrations
- Recharts for the activity chart

## Environment

Copy `.env.example` to `.env.local` and set:

```bash
DATABASE_URL=
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
```

`DATABASE_URL` should use the Supabase pooled Postgres connection string.

## Database setup

1. Create a Supabase project.
2. Apply `drizzle/0000_handy_mauler.sql` in the Supabase SQL editor, or run `npm run db:migrate` against the configured database.
3. In Supabase Auth, enable email/password auth.
4. Make sure the `events` table is included in Realtime. The migration already adds it to `supabase_realtime`.
5. Create the single admin user directly in the Supabase Auth dashboard. The app does not expose public signup.

## Supabase auth settings

Configure Supabase Auth for your hosted deployment:

- Set the Site URL to your production Vercel URL or custom domain.
- Add Redirect URLs for both your production URL and `http://localhost:3000`.
- Keep email/password auth enabled for the admin account.

## Local development

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000), sign in with the admin user you created in Supabase, then create a project to generate its API key.

## Event ingestion

Send a request to your local or deployed app:

```bash
curl -X POST http://localhost:3000/api/events \
  -H "Authorization: Bearer pb_your_api_key" \
  -H "Content-Type: application/json" \
  -d '{
    "channel": "deploys",
    "title": "Production release completed",
    "description": "Build 2026.03.05 shipped",
    "icon": "🚀",
    "tags": ["production", "web"]
  }'
```

## Deploying to Vercel

1. Deploy this repo to Vercel.
2. Set `DATABASE_URL`, `NEXT_PUBLIC_SUPABASE_URL`, and `NEXT_PUBLIC_SUPABASE_ANON_KEY` in the Vercel project.
3. Use the deployed site for both the admin dashboard and your production ingestion endpoint.
4. Keep local development pointed at the same Supabase project unless you later decide to split environments.

The repo includes a minimal [`vercel.json`](/Users/fieldsmarshall/code/event-tracker/vercel.json) so Vercel treats the project as a standard Next.js deployment.

## Deployment checklist

### In Supabase

1. Create the project.
2. Run `drizzle/0000_handy_mauler.sql`.
3. Enable Email auth with password sign-in.
4. Create the single admin user in the Supabase Auth dashboard.
5. Set the Auth Site URL to your production domain.
6. Add Redirect URLs for:
   - your production app URL
   - `http://localhost:3000`
7. Confirm Realtime is enabled for the `events` table.

### In Vercel

1. Import this GitHub repo into Vercel.
2. Set these environment variables for Production:
   - `DATABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
3. Trigger the first deployment.
4. If you add a custom domain, update the Supabase Auth Site URL and Redirect URLs to match it.

### After deploy

1. Open the production `/login` page and sign in with the admin account.
2. Create a project and save the generated API key.
3. Send a test event to `https://your-domain/api/events`.
4. Verify the event appears in the dashboard feed and updates the chart.
5. Verify an invalid API key returns `401`.
6. Verify signing out blocks access to `/dashboard`.

## Access model

- The dashboard login page is public, but only the single admin Supabase account can access the dashboard.
- `POST /api/events` is public and remains protected by per-project API keys.
