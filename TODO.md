# TODO

## 🔒 Authentication & Security (Required before public deployment)

**Status:** Not started  
**Priority:** High (blocks Vercel/public hosting)

### Context
Currently the app runs locally without authentication. All API routes are publicly accessible. Before deploying to Vercel or any public hosting, authentication must be implemented.

### Implementation Plan

#### Pre-requisites
- Supabase project setup (already have `@supabase/ssr` and `@supabase/supabase-js` installed)
- Environment variables configured:
  - `NEXT_PUBLIC_SUPABASE_URL`
  - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
  - `SUPABASE_SERVICE_ROLE_KEY` (for server-side operations)

#### Phase 1: Middleware Protection
Add Next.js middleware to protect routes:
- `/api/settings/api-key/*`
- `/api/projects/*`
- `/project/*`

Redirect unauthenticated requests to login page.

#### Phase 2: API Route Authentication
Add session checks to all protected API routes:
```typescript
const supabase = createServerClient(...)
const { data: { user }, error } = await supabase.auth.getUser()
if (error || !user) {
  return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
}
```

Files to update:
- `app/api/settings/api-key/route.ts`
- `app/api/projects/route.ts`
- `app/api/projects/[id]/activity/route.ts`
- `app/api/projects/[id]/channels/route.ts`
- `app/api/projects/[id]/events/route.ts`

#### Phase 3: Database Query Scoping
Update all database queries to filter by authenticated user:
- Add `userId` checks to project queries
- Ensure API key management only affects keys owned by the user
- Update `lib/db/queries.ts` functions to accept and filter by `userId`

#### Phase 4: User Interface
Add authentication UI:
- Login page with magic link (email-based)
- Logout button in header/navigation
- Session persistence across page refreshes

### Database Schema
Review if user columns need to be added to existing tables:
- `projects.user_id` (if not already present)
- `settings.user_id` (if not already present)

The Postgres Row Level Security (RLS) policies are already defined in the migration - ensure they're enabled in production.

### Testing Checklist
- [ ] Unauthenticated requests return 401
- [ ] Users can only see their own projects
- [ ] API key regeneration only works for owned keys
- [ ] Session persists across page refreshes
- [ ] Logout clears session properly

---

## 🎨 Future Enhancements

### Performance
- Consider implementing virtual scrolling for large event lists
- Add pagination to activity charts for projects with >10k events

### Features
- Export project data (CSV/JSON)
- Webhook notifications for specific events
- Custom event filtering and search
- Team collaboration (multi-user projects)
