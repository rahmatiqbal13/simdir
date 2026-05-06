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
├── 📁 components/             # React Components
│   ├── AgendaCard.tsx
│   ├── CountdownDisplay.tsx
│   └── StatusBadge.tsx
│
├── 📁 context/                # React Contexts
│   ├── AgendaContext.jsx
│   ├── PencairanContext.jsx
│   ├── ProgramKerjaContext.jsx
│   ├── SuratContext.jsx
│   ├── UnitKerjaContext.jsx
│   └── UsersContext.jsx
│
├── 📁 lib/                    # Utility Libraries
│   ├── hooks/
│   │   └── useSupabase.js
│   ├── supabase/
│   │   ├── client.js
│   │   └── server.js
│   ├── auth.js
│   ├── auth-middleware.js
│   ├── jwt-legacy.js
│   ├── local-users.js
│   └── agenda-status.ts
│
├── 📁 docs/                   # 📚 Dokumentasi
│   ├── AGENTS.md
│   ├── CONTEXT.md
│   ├── DOKUMENTASI-SIMDIR.md
│   ├── ERROR-400-500-FIX.md
│   ├── JWT-SETUP-GUIDE.md
│   ├── PRD_SIMDIR_v1.3_updated.md
│   ├── SQL-README.md
│   ├── SUPABASE-SETUP-GUIDE.md
│   └── VERCEL-DEPLOY-TROUBLESHOOTING.md
│
├── 📁 sql/                    # 🗄️ Database SQL
│   ├── schema/
│   │   └── supabase-schema.sql
│   ├── seed/
│   │   ├── seed-pengaturan.sql
│   │   └── backup-simdir-data.sql
│   ├── fixes/
│   │   └── fix-pengaturan-rls.sql
│   └── archive/
│       └── (29+ archived SQL files)
│
├── 📁 scripts/                # 🚀 Utility Scripts
│   ├── setup-supabase-auth.js
│   └── test-legacy-jwt.js
│
├── 📁 config/                 # ⚙️ Configuration
│   └── .env.local.example
│
├── 📁 examples/               # 💡 Code Examples
│
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
