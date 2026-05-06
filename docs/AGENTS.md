# AGENTS.md - SIMDIR Next.js

Sistem Informasi Manajemen Direktorat USC (SIMDIR) - Agenda & Keuangan

## Quick Start

```bash
# Install dependencies
npm install

# Setup environment
cp config/.env.local.example .env.local
# Edit .env.local dengan credentials Supabase Anda

# Run dev server
npm run dev

# Build for production
npm run build
```

## Environment Setup

Copy `config/.env.local.example` → `.env.local` dan isi:

```bash
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
LEGACY_JWT_SECRET=your-legacy-jwt-secret
```

**Ambil Legacy JWT Secret dari**: Supabase Dashboard → Project Settings → API → "Legacy JWT secret (still used)"

## Architecture

- **Framework**: Next.js 15 + React 19 + TypeScript (strict: false)
- **Database**: Supabase (PostgreSQL)
- **Auth**: Supabase Auth dengan custom JWT middleware
- **Styling**: Tailwind CSS

### Route Structure

```
app/
├── (dashboard)/          # Protected routes
│   ├── dashboard/        # Overview & statistik
│   ├── kelola-agenda/    # Manajemen agenda
│   ├── surat/            # Surat (super_admin, pimpinan)
│   ├── program-kerja/    # Program & anggaran
│   ├── pencairan/        # Pencairan dana
│   ├── laporan/          # Laporan (admin only)
│   └── pengaturan/       # Settings (super_admin)
├── (public)/             # Public routes
│   └── agenda/
│       └── tv/           # Tampilan TV Display
└── login/                # Auth page
```

### Role-Based Access (RBAC)

| Role | Permissions |
|------|-------------|
| `super_admin` | Full access |
| `admin_keuangan` | Dashboard, agenda, program, pencairan, laporan |
| `admin` | Dashboard, agenda only |
| `pimpinan` | Read-only: dashboard, agenda, surat, program, pencairan |

## Database Setup

Jalankan di Supabase SQL Editor:

1. **`sql/schema/supabase-schema.sql`** - Setup tabel, RLS, dan data awal
2. **`sql/fixes/fix-login-rls.sql`** - Fix login error 500 (bypass RLS untuk auth)

Lihat [`sql/README.md`](sql/README.md) untuk struktur SQL lengkap.

### Default Login

| Username | Password |
|----------|----------|
| `adminiqbal` | `usc@_140451` |

## Key Files

| File | Purpose |
|------|---------|
| `middleware.js` | Route protection & RBAC |
| `lib/supabase/client.js` | Browser Supabase client |
| `lib/supabase/server.js` | Server Supabase client |
| `lib/auth.js` | Client-side auth hook |
| `lib/jwt-legacy.js` | Legacy JWT verification |
| `context/AgendaContext.jsx` | Global agenda state |
| `app/(public)/agenda/tv/page.jsx` | TV Display mode |

## Project Structure

```
simdir/
├── app/                    # Next.js App Router
├── components/             # React Components
├── context/                # React Contexts
├── lib/                    # Utility Libraries
├── docs/                   # 📚 Documentation
├── sql/                    # 🗄️ Database SQL
│   ├── schema/            # Database schema
│   ├── seed/              # Seed data
│   ├── fixes/             # Fix scripts
│   └── archive/           # Archived SQL
├── scripts/                # 🚀 Utility scripts
├── config/                 # ⚙️ Configuration
└── examples/               # 💡 Code examples
```

## Common Commands

```bash
# Test JWT configuration
node scripts/test-legacy-jwt.js

# Setup Supabase Auth
node scripts/setup-supabase-auth.js

# Dev server (http://127.0.0.1:3000)
npm run dev

# Production build
npm run build
```

## Troubleshooting

### Login Error 500
Solusi: Pastikan `sql/fixes/fix-login-rls.sql` sudah dijalankan di Supabase.

### JWT Invalid
Solusi: Cek `LEGACY_JWT_SECRET` di `.env.local` sudah sesuai dengan Supabase Dashboard.

### RLS Permission Denied
Solusi: Jalankan `sql/fixes/fix-login-rls.sql` untuk membuat RPC functions.

## Deployment

- **Target**: Vercel
- **Build**: `next build`
- Pastikan semua env vars diatur di Vercel Dashboard

## TV Display Mode

Untuk menampilkan agenda di Smart TV:
- URL: `/agenda/tv`
- Fitur: Full screen, auto-rotate, font besar
- Cocok untuk layar 1080p atau lebih tinggi
