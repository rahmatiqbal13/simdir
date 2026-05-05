# AGENTS.md - SIMDIR Next.js

## Quick Start

```bash
# Install dependencies
npm install

# Run dev server (defaults to 127.0.0.1:3000)
npm run dev

# Build for production
npm run build
```

## Environment Setup (Required)

Copy `.env.local.example` → `.env.local` and fill in:

```bash
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
LEGACY_JWT_SECRET=your-legacy-jwt-secret  # From Supabase Dashboard → Settings → API
```

**Critical**: The `LEGACY_JWT_SECRET` must be obtained from Supabase Dashboard → Project Settings → Configuration → API → "Legacy JWT secret (still used)". See `JWT-SETUP-GUIDE.md` for details.

## Architecture

- **Framework**: Next.js 15 + React 19 + TypeScript (strict: false)
- **Database**: Supabase (PostgreSQL)
- **Auth**: Supabase Auth with custom middleware-based RBAC
- **Styling**: Tailwind CSS via globals.css
- **Icons**: Custom SVG icons (no icon library)

### Route Structure

```
app/
├── (dashboard)/          # Protected routes with sidebar layout
│   ├── dashboard/        # Main dashboard
│   ├── kelola-agenda/    # Agenda management
│   ├── surat/           # Letters (super_admin, pimpinan only)
│   ├── program-kerja/   # Work programs (super_admin, admin_keuangan, pimpinan)
│   ├── pencairan/       # Fund disbursement (super_admin, admin_keuangan, pimpinan)
│   ├── laporan/         # Reports (super_admin, admin_keuangan only)
│   └── pengaturan/      # Settings (super_admin only)
├── (public)/            # Public routes (agenda view)
└── login/               # Auth page
```

### Role-Based Access (RBAC)

Roles defined in `middleware.js` and `app/(dashboard)/layout.jsx`:

| Role | Permissions |
|------|-------------|
| `super_admin` | Full access to all modules |
| `admin_keuangan` | Dashboard, agenda, program-kerja, pencairan, laporan |
| `admin` | Dashboard, kelola-agenda only |
| `pimpinan` | Read-only: dashboard, agenda, surat, program-kerja, pencairan |

**Access Control**: Enforced in `middleware.js` — unauthorized access redirects to `/dashboard`.

## Key Files

- `middleware.js` — Route protection & RBAC enforcement
- `lib/supabase/client.js` — Browser Supabase client
- `lib/supabase/server.js` — Server Supabase client (for Server Components)
- `lib/auth.js` — Client-side auth hook (`useAuth`)
- `context/AgendaContext.jsx` — Global agenda state (localStorage-based)
- `lib/jwt-legacy.js` — Legacy JWT token verification utilities

## Database Setup

Multiple SQL migration files exist:
- `supabase-schema.sql` — Main schema
- `database-setup-final.sql` — Final setup script
- `database-setup-v3.sql`, `database-setup-fixed.sql` — Iterations
- `check-columns.sql` — Column verification

**Note**: The app was originally built with localStorage (MVP), then migrated to Supabase. Some demo data may still reference localStorage patterns.

## Common Tasks

### Test JWT Configuration
```bash
node test-legacy-jwt.js
```

### Add New Protected Route
1. Create folder under `app/(dashboard)/`
2. Add route to `middleware.js` role checks
3. Add navigation item to `navItems` in `app/(dashboard)/layout.jsx`

### Client vs Server Supabase
- **Client Components**: Use `lib/supabase/client.js` or `createBrowserClient` directly
- **Server Components**: Use `lib/supabase/server.js` (`await supabaseServer()`)
- **Middleware**: Use `createServerClient` from `@supabase/ssr`

## Gotchas

1. **Strict TypeScript is OFF**: `tsconfig.json` has `"strict": false`
2. **Path Alias**: `@/*` maps to root directory (`./*`)
3. **Port**: Dev server runs on `127.0.0.1:3000` (not localhost)
4. **No Icon Library**: Icons are inline SVGs defined in layout files
5. **Legacy JWT**: Required for verifying tokens from legacy Supabase projects
6. **Agenda State**: Uses React Context + localStorage hybrid (see `AgendaContext.jsx`)

## Testing

No formal test suite configured. Manual testing approach:
- Test JWT: `node test-legacy-jwt.js`
- Test roles: Log in with different role accounts
- Test routes: Try accessing restricted URLs directly

## Deployment

- **Target**: Vercel (configured)
- **Environment**: Ensure all env vars are set in Vercel dashboard
- **Build Command**: `next build` (standard)
