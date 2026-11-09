# SIMDIR - Sistem Informasi Manajemen Direktorat

Sistem Informasi Manajemen untuk Direktorat Unesa Science Center.

## 🏗️ Struktur Proyek

```
simdir/
├── 📁 app/                    # Next.js App Router
│   ├── (dashboard)/           # Protected dashboard routes
│   │   ├── dashboard/
│   │   ├── kelola-agenda/
│   │   ├── pencairan/
│   │   ├── program-kerja/
│   │   ├── surat/
│   │   ├── laporan/
│   │   └── pengaturan/
│   ├── (public)/              # Public routes
│   │   └── agenda/
│   │       └── tv/            # Tampilan TV Display
│   ├── api/                   # API Routes
│   └── login/                 # Login page
│
├── 📁 context/                # React Contexts
│   ├── AgendaContext.jsx
│   ├── UnitKerjaContext.jsx
│   └── UsersContext.jsx
│
├── 📁 lib/                    # Utility Libraries
│   ├── hooks/
│   │   └── useSupabase.js
│   ├── supabase/
│   │   └── client.js
│   ├── jwt-legacy.js
│   └── local-users.js
│
├── 📁 docs/                   # 📚 Dokumentasi
│   ├── design/                # Mockup desain (HTML)
│   ├── superpowers/           # Rencana & spesifikasi fitur
│   ├── AGENTS.md
│   ├── DEPLOYMENT-TEST-GUIDE.md
│   ├── DOKUMENTASI-SIMDIR.md
│   ├── ERROR-400-500-FIX.md
│   ├── JWT-SETUP-GUIDE.md
│   ├── PRD_SIMDIR_v1.3_updated.md
│   ├── PWA-README.md
│   ├── SQL-README.md
│   ├── SUPABASE-SETUP-GUIDE.md
│   └── VERCEL-DEPLOY-TROUBLESHOOTING.md
│
├── 📁 sql/                    # 🗄️ Database SQL
│   ├── schema/
│   │   ├── supabase-schema.sql
│   │   ├── create-spj-tables.sql
│   │   └── integrasi-spj-program.sql
│   ├── seed/
│   │   └── backup-simdir-data.sql
│   └── fixes/
│       ├── fix-pengaturan-rls.sql
│       └── fix-integrasi-spj-program.sql
│
├── 📁 supabase/               # Migrasi database
│   └── migrations/
│
├── 📁 scripts/                # 🚀 Utility Scripts
│   ├── migrate-sirekap-backup.js
│   ├── setup-supabase-auth.js
│   └── test-legacy-jwt.js
│
├── 📁 config/                 # ⚙️ Configuration
│   └── .env.local.example
│
├── CONTEXT.md                 # Konteks & gambaran umum proyek
├── middleware.js              # Next.js Middleware
├── next.config.js             # Next.js Configuration
├── package.json               # Dependencies
└── tsconfig.json              # TypeScript Config
```

## 🚀 Cara Menjalankan

### 1. Install Dependencies

```bash
npm install
```

### 2. Setup Environment Variables

```bash
cp config/.env.local.example .env.local
```

Edit `.env.local` dengan nilai yang sesuai:

```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
JWT_SECRET=your_jwt_secret
```

### 3. Setup Database

Jalankan SQL files di folder `sql/schema/` dan `sql/seed/` di Supabase SQL Editor.

### 4. Jalankan Development Server

```bash
npm run dev
```

Buka [http://localhost:3000](http://localhost:3000)

## 📺 Tampilan TV Display

Untuk menampilkan agenda di Smart TV, akses:

```
http://localhost:3000/agenda/tv
```

Fitur TV Display:
- ✅ Full screen tanpa scroll
- ✅ Grid 2x2 atau 3x2 (adaptif)
- ✅ Font besar untuk jarak jauh
- ✅ Auto-rotate setiap 15 detik
- ✅ Running text di footer

## 📚 Dokumentasi

Lihat folder [`docs/`](docs/) untuk dokumentasi lengkap:

- [Setup Supabase](docs/SUPABASE-SETUP-GUIDE.md)
- [Setup JWT](docs/JWT-SETUP-GUIDE.md)
- [Troubleshooting](docs/ERROR-400-500-FIX.md)
- [Dokumentasi Indonesia](docs/DOKUMENTASI-SIMDIR.md)

## 🔧 Teknologi

- **Framework:** Next.js 15 (App Router)
- **Database:** Supabase (PostgreSQL)
- **Styling:** Tailwind CSS
- **Auth:** Supabase Auth + Custom JWT
- **Language:** JavaScript/TypeScript

## 📝 Lisensi

© 2025 Direktorat Unesa Science Center. All rights reserved.
