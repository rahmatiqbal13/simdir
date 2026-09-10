# Memo Pimpinan Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a lightweight "Memo Pimpinan" module — `super_admin` drafts a nota dinas (auto nomor, addressee, perihal, isi), edits it, and prints it as an A4 nota-dinas document to take to the pimpinan for a wet-ink signature; `pimpinan`-role users can read memos in-app but not change them.

**Architecture:** One new Postgres table (`memo`, service-role RLS, DB-generated nomor) behind two Next.js API route files, five new client-rendered pages under `app/(dashboard)/memo/` plus one shared form component, wired into `middleware.js` and `navConfig.jsx`. Mirrors the existing E-Kwitansi / RAB feature structure exactly.

**Tech Stack:** Next.js 15 App Router, plain JSX (no TypeScript), Supabase (Postgres + `@supabase/supabase-js` service-role client in API routes, browser client in `useCurrentUser`), inline style objects + existing global CSS classes from `app/globals.css`.

## Global Constraints

- This codebase has **no automated test framework** (no Jest/Vitest/Playwright — confirmed via `package.json`). Every existing feature (E-Invoice, E-Kwitansi, RAB) is verified the way this plan verifies each task: (1) `npm run build` to catch parse/import/type errors, (2) for API routes, a `curl` against the running dev server, (3) for pages, a browser click-through / screenshot. Do **not** add a test framework for this feature.
- **Do not run `npm run build` while a `npm run dev` server is running in the same checkout** — it corrupts the dev server's `.next` cache (user's standing instruction). Check with `lsof -ti:3000 -sTCP:LISTEN` first; if a dev server is up, stop it before `npm run build`, or do the browser check instead and build later.
- DB migrations in this project are run **manually** by the user pasting the SQL file into the Supabase SQL Editor (see the header-comment convention in every file under `supabase/migrations/`). There is no local migration runner. Where a task says "ask the user to run the migration", that is a hard stop — the API/pages cannot be end-to-end verified until the `memo` table exists. (If direct Postgres credentials are available in `.env.local` as `SUPABASE_SERVICE_ROLE_KEY`, a one-off `@supabase/supabase-js` script can verify the table exists and do read-only checks — but it cannot run DDL.)
- Nomor format: `MEMO/YYYY/MM/NNNN`, generated entirely in the database by a `BEFORE INSERT` trigger. **Never** send `nomor` from the client; never let the client re-derive it.
- Reuse existing utilities — do not reimplement: `nomorToSlug`, `slugToNomor`, `formatDate` from `lib/utils/format.js`; `friendlyDbError` from `lib/db-errors.js`; `useToast` from `app/components/Toast.jsx`; `ConfirmModal` from `app/components/ConfirmModal.jsx`; `useCurrentUser` from `lib/hooks/useCurrentUser.js`.
- Reuse existing global CSS classes: `.card`, `.card-body`, `.field`, `.field-label`, `.input`, `.textarea`, `.select`, `.btn`, `.btn-primary`, `.btn-secondary`, `.btn-ghost`, `.btn-danger`, `.btn-sm`, `.btn-icon`, `.page-header`, `.page-title-wrap`, `.page-title`, `.page-subtitle`, `.page-actions`, `.modal-foot`, `.table-wrap`, `.table-scroll`, `.badge`, `.muted`, `.spinner`, `.empty-state`, `.text-center`, `.text-right`. Use inline `style={{}}` only for layout specific to the memo pages (matches E-Kwitansi).
- Page-level access is enforced in `middleware.js` (`ROLE_RULES` + per-prefix API gate), **not** in page components. API routes use the Supabase **service-role** client and do **not** re-check role themselves — matching the `kwitansi` / `rab` convention exactly. The client-side `isSuperAdmin` checks in the pages are UX only (hide buttons, redirect from create/edit).
- All new UI text is Bahasa Indonesia, matching the rest of the dashboard.

---

## Task 1: Database migration — `memo` table

**Files:**
- Create: `supabase/migrations/20260910000000_create_memo.sql`

**Interfaces:**
- Produces: table `memo` with columns `id` (uuid pk), `nomor` (varchar unique, DB-generated), `tanggal` (date), `kepada` (text), `dibuat_oleh` (text), `perihal` (text), `isi` (text), `created_at` / `updated_at` (timestamptz). Every later task reads and writes exactly these column names.

- [ ] **Step 1: Write the migration file**

```sql
-- ============================================
-- Memo Pimpinan — modul nota dinas ringan, berdiri sendiri (tidak terkait
-- E-Invoice/E-Kwitansi/RAB/Agenda). super_admin membuat memo, mencetaknya
-- sebagai nota dinas A4, lalu minta tanda tangan basah ke pimpinan. Tidak
-- ada tanda tangan digital, workflow status, atau field jawaban.
-- Lihat docs/superpowers/specs/2026-09-10-memo-pimpinan-design.md
-- Jalankan script ini di Supabase SQL Editor
-- Supabase Dashboard → SQL Editor → New query
-- ============================================

CREATE TABLE IF NOT EXISTS memo (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nomor        varchar(50) UNIQUE NOT NULL,
  tanggal      date NOT NULL DEFAULT CURRENT_DATE,
  kepada       text NOT NULL,
  dibuat_oleh  text NOT NULL,
  perihal      text NOT NULL,
  isi          text NOT NULL,
  created_at   timestamptz NOT NULL DEFAULT now(),
  updated_at   timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_memo_tanggal ON memo(tanggal);

-- Auto-generate nomor (format MEMO/2026/09/0001), pola identik dengan
-- generate_kwitansi_number()/generate_rab_number() — advisory lock per
-- bulan supaya dua memo yang dibuat bersamaan di bulan yang sama tidak
-- pernah dapat nomor urut yang sama.
CREATE OR REPLACE FUNCTION generate_memo_number()
RETURNS TRIGGER AS $$
DECLARE
    year_str TEXT;
    month_str TEXT;
    sequence_num INTEGER;
    lock_key BIGINT;
BEGIN
    year_str := TO_CHAR(NEW.tanggal, 'YYYY');
    month_str := TO_CHAR(NEW.tanggal, 'MM');

    lock_key := ('x' || md5('memo_seq_' || year_str || month_str))::bit(64)::bigint;
    PERFORM pg_advisory_xact_lock(lock_key);

    SELECT COALESCE(MAX(CAST(SUBSTRING(nomor FROM '....$') AS INTEGER)), 0) + 1
    INTO sequence_num
    FROM memo
    WHERE nomor LIKE 'MEMO/' || year_str || '/' || month_str || '/%';

    NEW.nomor := 'MEMO/' || year_str || '/' || month_str || '/' || LPAD(sequence_num::TEXT, 4, '0');
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_generate_memo_number ON memo;
CREATE TRIGGER trg_generate_memo_number
  BEFORE INSERT ON memo
  FOR EACH ROW
  WHEN (NEW.nomor IS NULL OR NEW.nomor = '')
  EXECUTE FUNCTION generate_memo_number();

CREATE OR REPLACE FUNCTION set_memo_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at := NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_memo_updated_at ON memo;
CREATE TRIGGER trg_memo_updated_at
  BEFORE UPDATE ON memo
  FOR EACH ROW
  EXECUTE FUNCTION set_memo_updated_at();

-- RLS — hanya service role (dipakai app/api/memo/*) yang boleh baca/tulis.
-- Akses per-role (super_admin tulis, pimpinan baca) diatur di middleware.js,
-- mengikuti pola kwitansi/rab.
ALTER TABLE memo ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Service role manage memo" ON memo;
CREATE POLICY "Service role manage memo"
  ON memo FOR ALL
  USING (auth.role() = 'service_role');
```

- [ ] **Step 2: Structural sanity check of the SQL**

Run:
```bash
cd "/Volumes/File Home/File Web/simdir" && node -e "
const fs = require('fs');
const sql = fs.readFileSync('supabase/migrations/20260910000000_create_memo.sql', 'utf8');
const o = (sql.match(/\(/g)||[]).length, c = (sql.match(/\)/g)||[]).length;
const d = (sql.match(/\\\$\\\$/g)||[]).length;
console.log('parens:', o, c, o === c ? 'BALANCED' : 'MISMATCH');
console.log('dollar-quote pairs:', d, d % 2 === 0 ? 'BALANCED' : 'MISMATCH');
console.log('has CREATE TABLE memo:', /CREATE TABLE IF NOT EXISTS memo/.test(sql));
console.log('has trigger:', /trg_generate_memo_number/.test(sql));
"
```
Expected: `parens: N N BALANCED`, `dollar-quote pairs: 6 BALANCED`, both `has ...: true`. This is a structural check only — there is no local Postgres.

- [ ] **Step 3: Ask the user to run the migration**

Tell the user, verbatim: "Please run `supabase/migrations/20260910000000_create_memo.sql` in the Supabase SQL Editor before we continue — the API routes and pages need the `memo` table to exist to be testable."

Wait for confirmation before starting Task 3's end-to-end verification (Tasks 2 does not need the DB).

- [ ] **Step 4: (Optional) verify the table exists, if service-role creds are in `.env.local`**

Run:
```bash
cd "/Volumes/File Home/File Web/simdir" && NODE_PATH="$(pwd)/node_modules" node -e "
require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');
const s = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
s.from('memo').select('id').limit(0).then(({ error }) =>
  console.log(error ? 'TABLE MISSING: ' + error.message : 'memo table OK'));
"
```
Expected (after the user has run the migration): `memo table OK`. If it prints `TABLE MISSING`, the user has not run the migration yet — do not proceed to end-to-end checks.

- [ ] **Step 5: Commit**

```bash
cd "/Volumes/File Home/File Web/simdir" && git add supabase/migrations/20260910000000_create_memo.sql && git commit -m "$(cat <<'EOF'
feat(db): add memo table for Memo Pimpinan feature

Single-table nota-dinas module: DB-generated MEMO/YYYY/MM/NNNN nomor via
trigger + advisory lock, updated_at trigger, service-role RLS — same
pattern as kwitansi/rab.

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
EOF
)"
```

---

## Task 2: Shared `PIMPINAN_LIST` constant

**Files:**
- Create: `lib/constants/pimpinan.js`
- Modify: `app/(dashboard)/kelola-agenda/page.jsx` (remove the local `PIMPINAN_LIST` const near line 61, add an import)

**Interfaces:**
- Produces: `export const PIMPINAN_LIST` — an array of `{ value, label }` objects. The last entry is `{ value: 'lainnya', label: 'Lainnya (Input Manual)' }`. Consumed by `kelola-agenda/page.jsx` and by the memo form (Task 6).

- [ ] **Step 1: Create the shared constant file**

```javascript
// Daftar pimpinan/jabatan untuk dropdown "Kepada" (memo) dan "Dihadiri
// Pimpinan → Nama Pimpinan" (agenda). Satu sumber supaya dua form itu
// tidak menyimpan salinan yang bisa berbeda. Entri terakhir 'lainnya'
// memicu input manual di kedua form.
export const PIMPINAN_LIST = [
  { value: 'Rektor Unesa', label: 'Rektor Unesa' },
  { value: 'Wakil Rektor I', label: 'Wakil Rektor I' },
  { value: 'Wakil Rektor II', label: 'Wakil Rektor II' },
  { value: 'Wakil Rektor III', label: 'Wakil Rektor III' },
  { value: 'Direktur USC', label: 'Direktur USC' },
  { value: 'Gubernur Jawa Timur', label: 'Gubernur Jawa Timur' },
  { value: 'Walikota Surabaya', label: 'Walikota Surabaya' },
  { value: 'Kepala Dinas', label: 'Kepala Dinas' },
  { value: 'lainnya', label: 'Lainnya (Input Manual)' },
]
```

- [ ] **Step 2: Update `kelola-agenda/page.jsx` — remove local const, add import**

Find this block (near line 61):
```javascript
const PIMPINAN_LIST = [
  { value: 'Rektor Unesa', label: 'Rektor Unesa' },
  { value: 'Wakil Rektor I', label: 'Wakil Rektor I' },
  { value: 'Wakil Rektor II', label: 'Wakil Rektor II' },
  { value: 'Wakil Rektor III', label: 'Wakil Rektor III' },
  { value: 'Direktur USC', label: 'Direktur USC' },
  { value: 'Gubernur Jawa Timur', label: 'Gubernur Jawa Timur' },
  { value: 'Walikota Surabaya', label: 'Walikota Surabaya' },
  { value: 'Kepala Dinas', label: 'Kepala Dinas' },
  { value: 'lainnya', label: 'Lainnya (Input Manual)' },
]
```
Delete it entirely. Then, in the import block at the top of the file (after the existing `import` lines, around line 9), add:
```javascript
import { PIMPINAN_LIST } from '@/lib/constants/pimpinan'
```

- [ ] **Step 3: Verify build**

Run (only if no dev server on :3000 — see Global Constraints):
```bash
cd "/Volumes/File Home/File Web/simdir" && npm run build 2>&1 | tail -8
```
Expected: build completes, ends with the route list and no `Failed to compile` / `Module not found` / `is not defined`. The `/kelola-agenda` route must still appear in the output.

- [ ] **Step 4: Commit**

```bash
cd "/Volumes/File Home/File Web/simdir" && git add lib/constants/pimpinan.js "app/(dashboard)/kelola-agenda/page.jsx" && git commit -m "$(cat <<'EOF'
refactor: extract PIMPINAN_LIST to lib/constants/pimpinan.js

Shared by the agenda form and the upcoming memo form so the list has one
source of truth. No behaviour change.

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
EOF
)"
```

---

## Task 3: API routes — `/api/memo` and `/api/memo/[id]`

**Files:**
- Create: `app/api/memo/route.js`
- Create: `app/api/memo/[id]/route.js`

**Interfaces:**
- Consumes: `friendlyDbError` from `lib/db-errors.js`; `slugToNomor` from `lib/utils/format.js`; table `memo` from Task 1.
- Produces:
  - `GET /api/memo` → JSON array of memo rows, `order by created_at desc`.
  - `POST /api/memo` → body `{ tanggal, kepada, dibuat_oleh, perihal, isi }` → created row (201) or `{ error }` (400/500). `nomor` set by DB trigger.
  - `GET /api/memo/[id]` → single memo row for `slugToNomor(id)`, or `{ error }` (404).
  - `PUT /api/memo/[id]` → body `{ tanggal, kepada, dibuat_oleh, perihal, isi }` → updated row, or `{ error }` (400/500). `nomor` never changed.
  - `DELETE /api/memo/[id]` → `{ success: true }` or `{ error }` (500).

- [ ] **Step 1: Write `app/api/memo/route.js`**

```javascript
import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { friendlyDbError } from '@/lib/db-errors'

function getServiceClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  )
}

// GET /api/memo — daftar memo. Dilindungi middleware (super_admin + pimpinan
// boleh baca; tulis cuma super_admin — lihat middleware.js).
export async function GET() {
  try {
    const supabase = getServiceClient()
    const { data, error } = await supabase
      .from('memo')
      .select('*')
      .order('created_at', { ascending: false })
    if (error) throw error
    return NextResponse.json(data || [])
  } catch (err) {
    return NextResponse.json({ error: err.message || 'Gagal memuat data' }, { status: 500 })
  }
}

// POST /api/memo — tambah memo baru. nomor dibuat otomatis oleh trigger DB
// (generate_memo_number), jangan dikirim dari client.
export async function POST(request) {
  try {
    const body = await request.json()
    const kepada = (body.kepada || '').trim()
    const dibuatOleh = (body.dibuat_oleh || '').trim()
    const perihal = (body.perihal || '').trim()
    const isi = (body.isi || '').trim()
    const tanggal = body.tanggal || new Date().toISOString().split('T')[0]

    if (!kepada) return NextResponse.json({ error: 'Nama pimpinan (Kepada) wajib diisi' }, { status: 400 })
    if (!dibuatOleh) return NextResponse.json({ error: 'Nama pembuat wajib diisi' }, { status: 400 })
    if (!perihal) return NextResponse.json({ error: 'Perihal wajib diisi' }, { status: 400 })
    if (!isi) return NextResponse.json({ error: 'Isi memo wajib diisi' }, { status: 400 })

    const supabase = getServiceClient()
    const { data, error } = await supabase
      .from('memo')
      .insert([{ tanggal, kepada, dibuat_oleh: dibuatOleh, perihal, isi }])
      .select('*')
      .single()

    if (error) throw error
    return NextResponse.json(data, { status: 201 })
  } catch (err) {
    return NextResponse.json({ error: friendlyDbError(err, { duplicateLabel: 'Nomor memo' }) }, { status: 500 })
  }
}
```

- [ ] **Step 2: Write `app/api/memo/[id]/route.js`**

```javascript
import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { friendlyDbError } from '@/lib/db-errors'
import { slugToNomor } from '@/lib/utils/format'

function getServiceClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  )
}

// GET /api/memo/[id] — satu memo. Parameter route bernama "id" tapi nilainya
// slug dari nomor (mis. "MEMO-2026-09-0001", lihat nomorToSlug/slugToNomor
// di lib/utils/format.js), bukan UUID.
export async function GET(request, { params }) {
  try {
    const { id } = await params
    const supabase = getServiceClient()
    const { data, error } = await supabase
      .from('memo')
      .select('*')
      .eq('nomor', slugToNomor(id))
      .single()
    if (error) throw error
    return NextResponse.json(data)
  } catch (err) {
    return NextResponse.json({ error: err.message || 'Memo tidak ditemukan' }, { status: 404 })
  }
}

// PUT /api/memo/[id] — update memo. nomor tidak pernah diubah setelah dibuat.
export async function PUT(request, { params }) {
  try {
    const { id } = await params
    const body = await request.json()
    const kepada = (body.kepada || '').trim()
    const dibuatOleh = (body.dibuat_oleh || '').trim()
    const perihal = (body.perihal || '').trim()
    const isi = (body.isi || '').trim()

    if (!kepada) return NextResponse.json({ error: 'Nama pimpinan (Kepada) wajib diisi' }, { status: 400 })
    if (!dibuatOleh) return NextResponse.json({ error: 'Nama pembuat wajib diisi' }, { status: 400 })
    if (!perihal) return NextResponse.json({ error: 'Perihal wajib diisi' }, { status: 400 })
    if (!isi) return NextResponse.json({ error: 'Isi memo wajib diisi' }, { status: 400 })
    if (!body.tanggal) return NextResponse.json({ error: 'Tanggal wajib diisi' }, { status: 400 })

    const supabase = getServiceClient()
    const { data, error } = await supabase
      .from('memo')
      .update({ tanggal: body.tanggal, kepada, dibuat_oleh: dibuatOleh, perihal, isi })
      .eq('nomor', slugToNomor(id))
      .select('*')
      .single()

    if (error) throw error
    return NextResponse.json(data)
  } catch (err) {
    return NextResponse.json({ error: friendlyDbError(err) }, { status: 500 })
  }
}

// DELETE /api/memo/[id]
export async function DELETE(request, { params }) {
  try {
    const { id } = await params
    const supabase = getServiceClient()
    const { error } = await supabase.from('memo').delete().eq('nomor', slugToNomor(id))
    if (error) throw error
    return NextResponse.json({ success: true })
  } catch (err) {
    return NextResponse.json({ error: friendlyDbError(err) }, { status: 500 })
  }
}
```

- [ ] **Step 3: Verify build**

Run (only if no dev server on :3000):
```bash
cd "/Volumes/File Home/File Web/simdir" && npm run build 2>&1 | tail -12
```
Expected: build completes; the route list includes `ƒ /api/memo` and `ƒ /api/memo/[id]`. No `Failed to compile`.

- [ ] **Step 4: Commit**

```bash
cd "/Volumes/File Home/File Web/simdir" && git add app/api/memo && git commit -m "$(cat <<'EOF'
feat(api): add /api/memo routes (list/create/get/update/delete)

Service-role backed, no in-route role check (middleware gates it) — same
convention as /api/kwitansi and /api/rab. [id] param is the nomor slug.

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
EOF
)"
```

---

## Task 4: Access control — `middleware.js` + `navConfig.jsx`

**Files:**
- Modify: `middleware.js` (replace the `/surat` `ROLE_RULES` entry; add `MEMO_API_ROLES` const; add an API-gate block)
- Modify: `app/components/navConfig.jsx` (add `NAV_ICONS.memo`; add `memo` to `ALL_NAV_ITEMS`; add `'memo'` to two `SIDEBAR_ORDER` arrays)

**Interfaces:**
- Consumes: API routes from Task 3.
- Produces: `/memo*` reachable only by `super_admin` + `pimpinan`; `POST`/`PUT`/`DELETE` on `/api/memo*` reachable only by `super_admin`. Sidebar shows a "Memo Pimpinan" item for `super_admin` and `pimpinan`.

- [ ] **Step 1: `middleware.js` — replace the dead `/surat` rule**

In `ROLE_RULES` (near line 10), replace this line:
```javascript
  { prefix: '/surat', roles: ['super_admin', 'pimpinan'] },
```
with:
```javascript
  // Memo Pimpinan — halaman /memo bisa dibaca super_admin & pimpinan;
  // tulis (POST/PUT/DELETE /api/memo) dibatasi ke super_admin di blok
  // API-gate di bawah. Menggantikan aturan '/surat' lama yang route-nya
  // tidak pernah dibuat.
  { prefix: '/memo', roles: ['super_admin', 'pimpinan'] },
```

- [ ] **Step 2: `middleware.js` — add the `MEMO_API_ROLES` constant**

Right after this existing line (near line 100):
```javascript
const TAMU_API_ROLES = ROLE_RULES.find((r) => r.prefix === '/kelola-tamu').roles
```
add:
```javascript
// Endpoint /api/memo lewat service-role key. GET boleh super_admin +
// pimpinan (ikut halaman /memo); POST/PUT/DELETE cuma super_admin —
// tombol Tambah/Edit/Hapus di UI /memo juga cuma untuk super_admin.
const MEMO_API_ROLES = ROLE_RULES.find((r) => r.prefix === '/memo').roles
```

- [ ] **Step 3: `middleware.js` — add the API-gate block**

Find this existing block (near line 328):
```javascript
  if (pathname.startsWith('/api/tamu') && !TAMU_API_ROLES.includes(role)) {
    return withSecurityHeaders(forbiddenResponse(request, pathname))
  }
```
Immediately **after** it, add:
```javascript
  // GET /api/memo → super_admin + pimpinan. Non-GET → super_admin saja.
  if (pathname.startsWith('/api/memo')) {
    const allowed = request.method === 'GET' ? MEMO_API_ROLES : ['super_admin']
    if (!allowed.includes(role)) return withSecurityHeaders(forbiddenResponse(request, pathname))
  }
```

- [ ] **Step 4: `navConfig.jsx` — add the `memo` icon to `NAV_ICONS`**

In the `NAV_ICONS` object, add a `memo` key (place it after the `clipboard` entry, keeping the same 24×24 stroke style):
```javascript
  memo: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
      <polyline points="14 2 14 8 20 8"/>
      <line x1="9" y1="13" x2="15" y2="13"/>
      <line x1="9" y1="17" x2="13" y2="17"/>
    </svg>
  ),
```

- [ ] **Step 5: `navConfig.jsx` — add the `memo` nav item**

In `ALL_NAV_ITEMS`, add this entry immediately after the `rab` line:
```javascript
  { key: 'memo', href: '/memo', label: 'Memo Pimpinan', shortLabel: 'Memo', icon: 'memo', roles: ['super_admin', 'pimpinan'], group: 'keuangan-dokumen' },
```

- [ ] **Step 6: `navConfig.jsx` — add `memo` to `SIDEBAR_ORDER`**

In `SIDEBAR_ORDER`, change the `super_admin` array so `'memo'` follows `'rab'`:
```javascript
  super_admin: ['dashboard', 'kelola-agenda', 'tv-pamflet', 'kelola-penilaian', 'pertanyaan-penilaian', 'kelola-saran', 'kelola-tamu', 'program-kerja-pui', 'e-invoice', 'e-kwitansi', 'rab', 'memo', 'pemasukan-unit-usaha', 'laporan', 'pengaturan-users', 'pengaturan-unit-kerja', 'pengaturan-branding'],
```
and change the `pimpinan` array so `'memo'` follows `'program-kerja-pui'`:
```javascript
  pimpinan: ['dashboard', 'kelola-agenda', 'kelola-penilaian', 'kelola-saran', 'kelola-tamu', 'program-kerja-pui', 'memo', 'laporan'],
```

- [ ] **Step 7: Verify build**

Run (only if no dev server on :3000):
```bash
cd "/Volumes/File Home/File Web/simdir" && npm run build 2>&1 | tail -10
```
Expected: build completes, no errors. `ƒ Middleware` line present.

- [ ] **Step 8: End-to-end API check (needs the migration run + a dev server + a login)**

Start the dev server, then drive a Playwright script that logs in as a `super_admin` (dev mock `admin` / `admin123` works when `NODE_ENV !== 'production'`), grabs the session cookie, and `curl`s the API. Full sequence:

```bash
cd "/Volumes/File Home/File Web/simdir" && lsof -ti:3000 -sTCP:LISTEN | xargs -r kill 2>/dev/null
npm run dev > /tmp/memo-dev.log 2>&1 &
i=0; until curl -sf http://127.0.0.1:3000 >/dev/null 2>&1; do i=$((i+1)); [ $i -gt 40 ] && { echo TIMEOUT; break; }; sleep 1; done
```

Then a Node/Playwright script (`NODE_PATH="$(pwd)/node_modules"`), using the cached chromium:
```javascript
const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch();
  const ctx = await b.newContext();
  const p = await ctx.newPage();
  await p.goto('http://127.0.0.1:3000/login', { waitUntil: 'networkidle' });
  await p.fill('#identifier', 'admin');
  await p.fill('#password', 'admin123');
  await p.click('button[type="submit"]');
  await p.waitForURL('**/dashboard', { timeout: 15000 });
  // POST a memo through the app's own fetch (carries the session cookie)
  const created = await p.evaluate(async () => {
    const r = await fetch('/api/memo', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ tanggal: '2026-09-10', kepada: 'Direktur USC', dibuat_oleh: 'Administrator USC', perihal: 'Uji coba memo', isi: 'Baris satu.\nBaris dua.' }),
    });
    return { status: r.status, body: await r.json() };
  });
  console.log('POST /api/memo:', JSON.stringify(created));
  const list = await p.evaluate(async () => (await fetch('/api/memo')).json());
  console.log('GET /api/memo count:', Array.isArray(list) ? list.length : list);
  // cleanup the test row
  if (created.body && created.body.nomor) {
    const slug = created.body.nomor.replace(/\//g, '-');
    const del = await p.evaluate(async (s) => (await fetch('/api/memo/' + s, { method: 'DELETE' })).status, slug);
    console.log('DELETE test memo:', del);
  }
  await b.close();
})();
```
Expected: `POST /api/memo: {"status":201,"body":{...,"nomor":"MEMO/2026/09/0001",...}}`, `GET /api/memo count: 1` (or more), `DELETE test memo: 200`. Then stop the dev server: `lsof -ti:3000 -sTCP:LISTEN | xargs -r kill`.

If `POST` returns `403`, the middleware gate is wrong. If it returns `500` with "TABLE MISSING"-style text, the migration has not been run.

- [ ] **Step 9: Commit**

```bash
cd "/Volumes/File Home/File Web/simdir" && git add middleware.js app/components/navConfig.jsx && git commit -m "$(cat <<'EOF'
feat: gate /memo + /api/memo, add Memo Pimpinan nav item

Replaces the dead /surat ROLE_RULES entry with /memo (super_admin +
pimpinan). Writes to /api/memo are super_admin only. Sidebar item added
to the Keuangan & Dokumen group for both roles.

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
EOF
)"
```

---

## Task 5: List page — `/memo`

**Files:**
- Create: `app/(dashboard)/memo/page.jsx`

**Interfaces:**
- Consumes: `GET /api/memo`, `DELETE /api/memo/[id]` from Task 3; `useCurrentUser` (`{ isSuperAdmin, loading }`); `useToast`; `ConfirmModal`; `formatDate`, `nomorToSlug`.
- Produces: the `/memo` list page. No exports consumed by other tasks.

- [ ] **Step 1: Write `app/(dashboard)/memo/page.jsx`**

```jsx
'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useToast } from '@/app/components/Toast';
import ConfirmModal from '@/app/components/ConfirmModal';
import { useCurrentUser } from '@/lib/hooks/useCurrentUser';
import { formatDate, nomorToSlug } from '@/lib/utils/format';

export default function MemoListPage() {
  const { error: toastError, success: toastSuccess } = useToast();
  const { isSuperAdmin } = useCurrentUser();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [deleteItem, setDeleteItem] = useState(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/memo');
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setItems(data || []);
    } catch (err) {
      toastError('Gagal memuat data: ' + err.message);
    } finally {
      setLoading(false);
    }
  }, [toastError]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const filtered = items.filter((it) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return `${it.nomor} ${it.kepada} ${it.perihal} ${it.dibuat_oleh}`.toLowerCase().includes(q);
  });

  const confirmDelete = async () => {
    if (!deleteItem) return;
    setDeleteLoading(true);
    try {
      const res = await fetch(`/api/memo/${nomorToSlug(deleteItem.nomor)}`, { method: 'DELETE' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      await fetchData();
      setDeleteItem(null);
      toastSuccess('Memo berhasil dihapus');
    } catch (err) {
      toastError('Gagal menghapus: ' + err.message);
    } finally {
      setDeleteLoading(false);
    }
  };

  const colCount = isSuperAdmin ? 6 : 5;

  return (
    <div>
      <div className="page-header">
        <div className="page-title-wrap">
          <h1 className="page-title">Memo Pimpinan</h1>
          <p className="page-subtitle">Nota dinas untuk pimpinan — buat, cetak, lalu minta tanda tangan langsung ke pimpinan.</p>
        </div>
        {isSuperAdmin && (
          <div className="page-actions">
            <Link href="/memo/create" className="btn btn-primary">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ width: 16, height: 16 }}>
                <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
              </svg>
              Tambah Memo
            </Link>
          </div>
        )}
      </div>

      <div style={{ display: 'flex', gap: '0.75rem', marginBottom: '1rem', flexWrap: 'wrap' }}>
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Cari nomor, kepada, perihal, atau pembuat..."
          className="input"
          style={{ flex: 1, minWidth: 240 }}
        />
        {search && <button onClick={() => setSearch('')} className="btn btn-ghost">Reset</button>}
      </div>

      <div className="table-wrap">
        <div className="table-scroll">
          <table>
            <thead>
              <tr>
                {['No. Memo', 'Tanggal', 'Kepada', 'Perihal', 'Dibuat Oleh'].map((h) => <th key={h}>{h}</th>)}
                <th className="text-right">Aksi</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={colCount} className="text-center muted" style={{ padding: '2rem' }}>Memuat...</td></tr>
              ) : filtered.length === 0 ? (
                <tr><td colSpan={colCount} className="text-center muted" style={{ padding: '2rem' }}>Belum ada memo</td></tr>
              ) : filtered.map((item) => (
                <tr key={item.id}>
                  <td style={{ fontWeight: 600, fontFamily: 'monospace', whiteSpace: 'nowrap' }}>{item.nomor}</td>
                  <td className="muted" style={{ whiteSpace: 'nowrap', fontSize: '0.8125rem' }}>{formatDate(item.tanggal)}</td>
                  <td style={{ whiteSpace: 'nowrap' }}>{item.kepada}</td>
                  <td style={{ maxWidth: 320, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{item.perihal}</td>
                  <td style={{ whiteSpace: 'nowrap' }}>{item.dibuat_oleh}</td>
                  <td className="text-right">
                    <div style={{ display: 'inline-flex', gap: 4 }}>
                      <Link href={`/memo/${nomorToSlug(item.nomor)}`} className="btn btn-ghost btn-sm btn-icon" title="Detail" aria-label="Lihat detail memo">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ width: 14, height: 14 }}><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
                      </Link>
                      <Link href={`/memo/${nomorToSlug(item.nomor)}/print`} className="btn btn-ghost btn-sm btn-icon" title="Cetak" aria-label="Cetak memo">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ width: 14, height: 14 }}><polyline points="6 9 6 2 18 2 18 9"/><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/><rect x="6" y="14" width="12" height="8"/></svg>
                      </Link>
                      {isSuperAdmin && (
                        <button className="btn btn-ghost btn-sm btn-icon" onClick={() => setDeleteItem(item)} title="Hapus" aria-label="Hapus memo" style={{ color: 'var(--danger)' }}>
                          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ width: 14, height: 14 }}><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <ConfirmModal
        open={!!deleteItem}
        title="Hapus Memo"
        message={<>Yakin ingin menghapus memo <strong>{deleteItem?.nomor}</strong>? Tindakan ini tidak dapat dibatalkan.</>}
        confirmLabel="Ya, Hapus"
        busy={deleteLoading}
        onConfirm={confirmDelete}
        onCancel={() => setDeleteItem(null)}
      />
    </div>
  );
}
```

Note: the `<th>Aksi</th>` header always renders (6 columns visually) but `colCount` for the empty/loading `colSpan` is 5 for `pimpinan` — harmless cosmetic (one extra empty header cell); keeping the header static avoids a layout shift while `useCurrentUser` resolves.

- [ ] **Step 2: Verify build**

Run (only if no dev server on :3000):
```bash
cd "/Volumes/File Home/File Web/simdir" && npm run build 2>&1 | tail -8
```
Expected: build completes; route list includes `○ /memo`.

- [ ] **Step 3: Browser check**

With dev server up and the migration run, drive Playwright: log in as `admin`/`admin123`, `goto` `http://127.0.0.1:3000/memo`, wait for `.page-title`, screenshot. Expected: page renders "Memo Pimpinan" header, a "Tambah Memo" button (super_admin), a search box, and a table showing "Belum ada memo" (or rows if any exist). No console errors other than the known unrelated `Failed to load resource: 400` (a pre-existing profiles-fetch quirk with the dev mock account). Stop the dev server after.

- [ ] **Step 4: Commit**

```bash
cd "/Volumes/File Home/File Web/simdir" && git add "app/(dashboard)/memo/page.jsx" && git commit -m "$(cat <<'EOF'
feat(memo): list page /memo

Table of nomor/tanggal/kepada/perihal/dibuat_oleh with search. Tambah +
Hapus shown only to super_admin (via useCurrentUser); pimpinan sees
detail + cetak only.

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
EOF
)"
```

---

## Task 6: Shared `MemoForm` component + Create page — `/memo/create`

**Files:**
- Create: `app/(dashboard)/memo/MemoForm.jsx`
- Create: `app/(dashboard)/memo/create/page.jsx`

**Interfaces:**
- `MemoForm` — default export. Props:
  - `initial` — `{ tanggal, kepada, dibuat_oleh, perihal, isi }` (all strings). For create, pass `{ tanggal: todayStr, kepada: '', dibuat_oleh: <current user name>, perihal: '', isi: '' }`.
  - `submitting` — boolean, disables the submit button.
  - `submitLabel` — string, the submit button text.
  - `cancelHref` — string, the "Batal" link target.
  - `onSubmit(values)` — called with the trimmed/normalised `{ tanggal, kepada, dibuat_oleh, perihal, isi }` after client validation passes. `kepada` is already resolved (manual value substituted when "lainnya" is selected).
- Consumes: `PIMPINAN_LIST` (Task 2); `useToast` (for validation errors); `useCurrentUser` (create page only).
- Produced by this task, consumed by Task 8 (edit page).

- [ ] **Step 1: Write `app/(dashboard)/memo/MemoForm.jsx`**

```jsx
'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useToast } from '@/app/components/Toast';
import { PIMPINAN_LIST } from '@/lib/constants/pimpinan';

export default function MemoForm({ initial, submitting, submitLabel, cancelHref, onSubmit }) {
  const { error: toastError } = useToast();

  // Kalau nilai "kepada" tersimpan bukan salah satu opsi PIMPINAN_LIST
  // (mis. hasil input manual), pre-select "lainnya" dan isi input manual.
  const knownKepada = PIMPINAN_LIST.some((p) => p.value === initial.kepada && p.value !== 'lainnya');
  const [kepadaSelect, setKepadaSelect] = useState(
    initial.kepada ? (knownKepada ? initial.kepada : 'lainnya') : ''
  );
  const [kepadaManual, setKepadaManual] = useState(knownKepada ? '' : (initial.kepada || ''));
  const [form, setForm] = useState({
    tanggal: initial.tanggal || '',
    dibuat_oleh: initial.dibuat_oleh || '',
    perihal: initial.perihal || '',
    isi: initial.isi || '',
  });

  const set = (field, value) => setForm((f) => ({ ...f, [field]: value }));

  const handleSubmit = (e) => {
    e.preventDefault();
    const kepada = (kepadaSelect === 'lainnya' ? kepadaManual : kepadaSelect).trim();
    if (!kepada) return toastError('Nama pimpinan (Kepada) wajib dipilih atau diisi');
    if (!form.perihal.trim()) return toastError('Perihal wajib diisi');
    if (!form.dibuat_oleh.trim()) return toastError('Nama pembuat wajib diisi');
    if (!form.isi.trim()) return toastError('Isi memo wajib diisi');
    if (!form.tanggal) return toastError('Tanggal wajib diisi');

    onSubmit({
      tanggal: form.tanggal,
      kepada,
      dibuat_oleh: form.dibuat_oleh.trim(),
      perihal: form.perihal.trim(),
      isi: form.isi.trim(),
    });
  };

  return (
    <form onSubmit={handleSubmit} className="card" style={{ maxWidth: 640 }}>
      <div className="card-body" style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        <div className="field">
          <label className="field-label" htmlFor="tanggal">Tanggal *</label>
          <input id="tanggal" type="date" className="input" value={form.tanggal} onChange={(e) => set('tanggal', e.target.value)} required />
        </div>

        <div className="field">
          <label className="field-label" htmlFor="kepada">Kepada (Nama Pimpinan) *</label>
          <select
            id="kepada"
            className="select"
            value={kepadaSelect}
            onChange={(e) => setKepadaSelect(e.target.value)}
            required
          >
            <option value="">-- Pilih Pimpinan --</option>
            {PIMPINAN_LIST.map((p) => <option key={p.value} value={p.value}>{p.label}</option>)}
          </select>
          {kepadaSelect === 'lainnya' && (
            <input
              className="input"
              style={{ marginTop: 8 }}
              value={kepadaManual}
              onChange={(e) => setKepadaManual(e.target.value)}
              placeholder="Tulis nama/jabatan pimpinan"
              required
            />
          )}
        </div>

        <div className="field">
          <label className="field-label" htmlFor="perihal">Perihal *</label>
          <input id="perihal" className="input" value={form.perihal} onChange={(e) => set('perihal', e.target.value)} placeholder="Hal / pokok memo" required />
        </div>

        <div className="field">
          <label className="field-label" htmlFor="dibuat_oleh">Dibuat Oleh *</label>
          <input id="dibuat_oleh" className="input" value={form.dibuat_oleh} onChange={(e) => set('dibuat_oleh', e.target.value)} placeholder="Nama pembuat memo" required />
        </div>

        <div className="field">
          <label className="field-label" htmlFor="isi">Isi Memo *</label>
          <textarea id="isi" className="textarea" rows={8} value={form.isi} onChange={(e) => set('isi', e.target.value)} placeholder="Tulis isi memo di sini..." required />
        </div>
      </div>
      <div className="modal-foot">
        <Link href={cancelHref} className="btn btn-secondary">Batal</Link>
        <button type="submit" className="btn btn-primary" disabled={submitting}>
          {submitting ? 'Menyimpan…' : submitLabel}
        </button>
      </div>
    </form>
  );
}
```

- [ ] **Step 2: Write `app/(dashboard)/memo/create/page.jsx`**

```jsx
'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useToast } from '@/app/components/Toast';
import { useCurrentUser } from '@/lib/hooks/useCurrentUser';
import { nomorToSlug } from '@/lib/utils/format';
import MemoForm from '../MemoForm';

const todayStr = () => new Date().toISOString().split('T')[0];

export default function CreateMemoPage() {
  const router = useRouter();
  const { error: toastError, success: toastSuccess } = useToast();
  const { displayName, isSuperAdmin, loading: userLoading } = useCurrentUser();
  const [saving, setSaving] = useState(false);

  // pimpinan (read-only) tidak boleh di halaman create — kembalikan ke list.
  useEffect(() => {
    if (!userLoading && !isSuperAdmin) router.replace('/memo');
  }, [userLoading, isSuperAdmin, router]);

  const handleSubmit = async (values) => {
    setSaving(true);
    try {
      const res = await fetch('/api/memo', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(values),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      toastSuccess('Memo berhasil dibuat');
      router.push(`/memo/${nomorToSlug(data.nomor)}`);
    } catch (err) {
      toastError('Gagal menyimpan: ' + err.message);
    } finally {
      setSaving(false);
    }
  };

  if (userLoading || !isSuperAdmin) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '60vh' }}>
        <div className="spinner" style={{ width: 40, height: 40 }} />
      </div>
    );
  }

  return (
    <div>
      <div className="page-header">
        <div className="page-title-wrap">
          <h1 className="page-title">Tambah Memo</h1>
          <p className="page-subtitle">Buat nota dinas baru untuk pimpinan.</p>
        </div>
        <div className="page-actions">
          <Link href="/memo" className="btn btn-ghost">Batal</Link>
        </div>
      </div>

      <MemoForm
        initial={{ tanggal: todayStr(), kepada: '', dibuat_oleh: displayName || '', perihal: '', isi: '' }}
        submitting={saving}
        submitLabel="Simpan Memo"
        cancelHref="/memo"
        onSubmit={handleSubmit}
      />
    </div>
  );
}
```

- [ ] **Step 3: Verify build**

Run (only if no dev server on :3000):
```bash
cd "/Volumes/File Home/File Web/simdir" && npm run build 2>&1 | tail -8
```
Expected: build completes; route list includes `○ /memo/create`.

- [ ] **Step 4: Browser check**

Dev server up, migration run. Playwright: log in as `admin`/`admin123`, `goto` `/memo/create`, fill Tanggal (already defaulted), pick "Direktur USC" in Kepada, type Perihal "Permohonan arahan", confirm "Dibuat Oleh" is pre-filled with the user's name, type a two-line Isi, click "Simpan Memo". Expected: redirects to `/memo/MEMO-2026-09-XXXX`, a success toast fires. Then delete that memo via the list page's Hapus button (or an API DELETE) to keep the DB clean. Screenshot the create form before submitting.

- [ ] **Step 5: Commit**

```bash
cd "/Volumes/File Home/File Web/simdir" && git add "app/(dashboard)/memo/MemoForm.jsx" "app/(dashboard)/memo/create/page.jsx" && git commit -m "$(cat <<'EOF'
feat(memo): shared MemoForm + create page /memo/create

MemoForm handles the kepada dropdown + manual fallback and client
validation. Create page pre-fills "Dibuat Oleh" from useCurrentUser and
redirects pimpinan back to /memo.

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
EOF
)"
```

---

## Task 7: Detail page — `/memo/[id]`

**Files:**
- Create: `app/(dashboard)/memo/[id]/page.jsx`

**Interfaces:**
- Consumes: `GET /api/memo/[id]`, `DELETE /api/memo/[id]`; `useCurrentUser` (`{ isSuperAdmin }`); `useToast`; `ConfirmModal`; `formatDate`.

- [ ] **Step 1: Write `app/(dashboard)/memo/[id]/page.jsx`**

```jsx
'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import ConfirmModal from '@/app/components/ConfirmModal';
import { useToast } from '@/app/components/Toast';
import { useCurrentUser } from '@/lib/hooks/useCurrentUser';
import { formatDate } from '@/lib/utils/format';

export default function MemoDetailPage() {
  const params = useParams();
  const router = useRouter();
  const memoId = params?.id;
  const { error: toastError, success: toastSuccess } = useToast();
  const { isSuperAdmin } = useCurrentUser();

  const [item, setItem] = useState(null);
  const [loading, setLoading] = useState(true);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(false);

  const fetchItem = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/memo/${memoId}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setItem(data);
    } catch (err) {
      toastError('Gagal memuat memo: ' + err.message);
    } finally {
      setLoading(false);
    }
  }, [memoId, toastError]);

  useEffect(() => { fetchItem(); }, [fetchItem]);

  const handleDelete = async () => {
    setDeleteLoading(true);
    try {
      const res = await fetch(`/api/memo/${memoId}`, { method: 'DELETE' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      toastSuccess('Memo dihapus');
      router.push('/memo');
    } catch (err) {
      toastError('Gagal menghapus: ' + err.message);
      setDeleteLoading(false);
    }
  };

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '60vh' }}>
        <div className="spinner" style={{ width: 40, height: 40 }} />
      </div>
    );
  }

  if (!item) {
    return (
      <div className="empty-state">
        <h3>Memo Tidak Ditemukan</h3>
        <Link href="/memo" className="btn btn-primary" style={{ marginTop: '1rem' }}>Kembali ke Daftar Memo</Link>
      </div>
    );
  }

  return (
    <>
      <div>
        <div className="page-header">
          <div className="page-title-wrap">
            <h1 className="page-title">Detail Memo</h1>
            <p className="page-subtitle">{item.nomor}</p>
          </div>
          <div className="page-actions">
            <Link href="/memo" className="btn btn-ghost">Kembali</Link>
            <Link href={`/memo/${memoId}/print`} className="btn btn-secondary">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ width: 16, height: 16 }}>
                <polyline points="6 9 6 2 18 2 18 9"/><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/><rect x="6" y="14" width="12" height="8"/>
              </svg>
              Cetak
            </Link>
            {isSuperAdmin && (
              <>
                <Link href={`/memo/${memoId}/edit`} className="btn btn-primary">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ width: 16, height: 16 }}>
                    <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
                    <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
                  </svg>
                  Edit
                </Link>
                <button className="btn btn-danger" onClick={() => setConfirmOpen(true)}>
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ width: 16, height: 16 }}>
                    <polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
                  </svg>
                  Hapus
                </button>
              </>
            )}
          </div>
        </div>

        <div className="card" style={{ maxWidth: 720 }}>
          <div className="card-body" style={{ display: 'grid', gap: '1rem' }}>
            <Field label="No. Memo" value={item.nomor} mono />
            <Field label="Tanggal" value={formatDate(item.tanggal)} />
            <Field label="Kepada" value={item.kepada} />
            <Field label="Perihal" value={item.perihal} />
            <Field label="Dibuat Oleh" value={item.dibuat_oleh} />
            <div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-3)', marginBottom: 4 }}>Isi Memo</div>
              <div style={{ whiteSpace: 'pre-wrap', lineHeight: 1.6 }}>{item.isi}</div>
            </div>
          </div>
        </div>
      </div>

      <ConfirmModal
        open={confirmOpen}
        title="Hapus Memo"
        message={<>Yakin ingin menghapus memo <strong>{item.nomor}</strong>? Tindakan ini tidak dapat dibatalkan.</>}
        confirmLabel="Ya, Hapus"
        busy={deleteLoading}
        onConfirm={handleDelete}
        onCancel={() => setConfirmOpen(false)}
      />
    </>
  );
}

function Field({ label, value, mono }) {
  return (
    <div>
      <div style={{ fontSize: '0.75rem', color: 'var(--text-3)', marginBottom: 2 }}>{label}</div>
      <div style={{ fontWeight: 600, fontFamily: mono ? 'monospace' : undefined }}>{value}</div>
    </div>
  );
}
```

- [ ] **Step 2: Verify build**

Run (only if no dev server on :3000):
```bash
cd "/Volumes/File Home/File Web/simdir" && npm run build 2>&1 | tail -8
```
Expected: build completes; route list includes `ƒ /memo/[id]`.

- [ ] **Step 3: Browser check**

Dev server up. Create one memo via `/memo/create` (or an API POST), then `goto` its `/memo/MEMO-2026-09-XXXX` URL as `admin`. Expected: shows all fields, Isi with line breaks preserved, and Kembali / Cetak / Edit / Hapus buttons. Screenshot. Keep or delete the test memo — Task 8/9 can reuse it.

- [ ] **Step 4: Commit**

```bash
cd "/Volumes/File Home/File Web/simdir" && git add "app/(dashboard)/memo/[id]/page.jsx" && git commit -m "$(cat <<'EOF'
feat(memo): detail page /memo/[id]

Read-only render of the memo; Cetak always, Edit/Hapus for super_admin
only. Isi shown with preserved line breaks.

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
EOF
)"
```

---

## Task 8: Edit page — `/memo/[id]/edit`

**Files:**
- Create: `app/(dashboard)/memo/[id]/edit/page.jsx`

**Interfaces:**
- Consumes: `GET /api/memo/[id]`, `PUT /api/memo/[id]`; `MemoForm` (Task 6); `useCurrentUser`; `useToast`.

- [ ] **Step 1: Write `app/(dashboard)/memo/[id]/edit/page.jsx`**

```jsx
'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { useToast } from '@/app/components/Toast';
import { useCurrentUser } from '@/lib/hooks/useCurrentUser';
import MemoForm from '../../MemoForm';

export default function EditMemoPage() {
  const params = useParams();
  const router = useRouter();
  const memoId = params?.id;
  const { error: toastError, success: toastSuccess } = useToast();
  const { isSuperAdmin, loading: userLoading } = useCurrentUser();

  const [fetching, setFetching] = useState(true);
  const [saving, setSaving] = useState(false);
  const [initial, setInitial] = useState(null);

  useEffect(() => {
    if (!userLoading && !isSuperAdmin) router.replace('/memo');
  }, [userLoading, isSuperAdmin, router]);

  const fetchItem = useCallback(async () => {
    setFetching(true);
    try {
      const res = await fetch(`/api/memo/${memoId}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setInitial({
        tanggal: data.tanggal || '',
        kepada: data.kepada || '',
        dibuat_oleh: data.dibuat_oleh || '',
        perihal: data.perihal || '',
        isi: data.isi || '',
      });
    } catch (err) {
      toastError('Gagal memuat memo: ' + err.message);
    } finally {
      setFetching(false);
    }
  }, [memoId, toastError]);

  useEffect(() => { fetchItem(); }, [fetchItem]);

  const handleSubmit = async (values) => {
    setSaving(true);
    try {
      const res = await fetch(`/api/memo/${memoId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(values),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      toastSuccess('Memo berhasil diperbarui');
      router.push(`/memo/${memoId}`);
    } catch (err) {
      toastError('Gagal menyimpan: ' + err.message);
    } finally {
      setSaving(false);
    }
  };

  if (userLoading || !isSuperAdmin || fetching || !initial) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '60vh' }}>
        <div className="spinner" style={{ width: 40, height: 40 }} />
      </div>
    );
  }

  return (
    <div>
      <div className="page-header">
        <div className="page-title-wrap">
          <h1 className="page-title">Edit Memo</h1>
          <p className="page-subtitle">Ubah data memo yang sudah ada. Nomor memo tidak berubah.</p>
        </div>
        <div className="page-actions">
          <Link href={`/memo/${memoId}`} className="btn btn-ghost">Batal</Link>
        </div>
      </div>

      <MemoForm
        initial={initial}
        submitting={saving}
        submitLabel="Simpan Perubahan"
        cancelHref={`/memo/${memoId}`}
        onSubmit={handleSubmit}
      />
    </div>
  );
}
```

- [ ] **Step 2: Verify build**

Run (only if no dev server on :3000):
```bash
cd "/Volumes/File Home/File Web/simdir" && npm run build 2>&1 | tail -8
```
Expected: build completes; route list includes `ƒ /memo/[id]/edit`.

- [ ] **Step 3: Browser check**

Dev server up. `goto` `/memo/MEMO-2026-09-XXXX/edit` as `admin` for an existing memo. Expected: form pre-filled with the memo's values (Kepada dropdown pre-selected, or "Lainnya" + manual box if the stored value isn't in the list). Change Perihal, click "Simpan Perubahan" → redirects to detail, toast fires, detail shows the new Perihal. Screenshot the pre-filled form.

- [ ] **Step 4: Commit**

```bash
cd "/Volumes/File Home/File Web/simdir" && git add "app/(dashboard)/memo/[id]/edit/page.jsx" && git commit -m "$(cat <<'EOF'
feat(memo): edit page /memo/[id]/edit

Reuses MemoForm pre-filled from the fetched memo; PUT on submit; redirects
pimpinan back to /memo. Nomor is never sent/changed.

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
EOF
)"
```

---

## Task 9: Print page — `/memo/[id]/print`

**Files:**
- Create: `app/(dashboard)/memo/[id]/print/page.jsx`

**Interfaces:**
- Consumes: `GET /api/memo/[id]`; `GET /api/app-settings` (for `logo_url` + `brand_name`); `formatDate`.

- [ ] **Step 1: Write `app/(dashboard)/memo/[id]/print/page.jsx`**

```jsx
'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { formatDate } from '@/lib/utils/format';

export default function PrintMemoPage() {
  const params = useParams();
  const memoId = params?.id;

  const [item, setItem] = useState(null);
  const [loading, setLoading] = useState(true);
  const [branding, setBranding] = useState({ brand_name: 'Direktorat Unesa Science Center', logo_url: null });

  useEffect(() => {
    fetch('/api/app-settings')
      .then((res) => res.json())
      .then((data) => setBranding((b) => ({ ...b, ...data })))
      .catch(() => {});
  }, []);

  const fetchItem = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/memo/${memoId}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setItem(data);
    } catch (err) {
      console.error('Error fetching memo:', err);
    } finally {
      setLoading(false);
    }
  }, [memoId]);

  useEffect(() => { fetchItem(); }, [fetchItem]);

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
        <div className="spinner" style={{ width: 40, height: 40 }} />
      </div>
    );
  }

  if (!item) {
    return (
      <div style={{ textAlign: 'center', padding: '3rem' }}>
        <p>Memo tidak ditemukan</p>
        <Link href="/memo" className="btn btn-primary" style={{ marginTop: '1rem' }}>Kembali ke Daftar Memo</Link>
      </div>
    );
  }

  return (
    <div>
      {/* Print Controls */}
      <div className="no-print" style={{
        position: 'sticky', top: 0, left: 0, right: 0, padding: '1rem', background: 'white',
        borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between',
        alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap', zIndex: 100, boxShadow: '0 2px 10px rgba(0,0,0,0.1)',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <Link href={`/memo/${memoId}`} className="btn btn-ghost">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ width: 16, height: 16 }}>
              <path d="M19 12H5M12 19l-7-7 7-7"/>
            </svg>
            Kembali
          </Link>
          <h1 style={{ margin: 0, fontSize: '1.125rem' }}>Preview Memo</h1>
        </div>
        <button className="btn btn-primary" onClick={() => window.print()}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ width: 16, height: 16 }}>
            <polyline points="6 9 6 2 18 2 18 9"/><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/>
            <rect x="6" y="14" width="12" height="8"/>
          </svg>
          Cetak / Simpan PDF
        </button>
      </div>

      {/* Memo Content */}
      <div className="invoice-print-scroll no-print-scroll" style={{ overflowX: 'auto' }}>
        <div className="invoice-print-container" style={{
          maxWidth: '210mm', minHeight: '297mm', margin: '0 auto', padding: '20mm',
          background: 'white', boxSizing: 'border-box', position: 'relative', color: '#0f172a',
          fontSize: '0.9375rem', lineHeight: 1.6,
        }}>
          {/* Kop */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', borderBottom: '3px double #0f172a', paddingBottom: '0.75rem', marginBottom: '1.5rem' }}>
            {branding.logo_url && (
              <img src={branding.logo_url} alt="Logo" style={{ height: 64, width: 'auto', maxWidth: 90, objectFit: 'contain', flexShrink: 0 }} />
            )}
            <div style={{ textAlign: 'center', flex: 1 }}>
              <div style={{ fontWeight: 800, fontSize: '1.125rem', letterSpacing: '0.02em' }}>{branding.brand_name}</div>
              <div style={{ fontSize: '0.8125rem', color: '#475569' }}>Jalan Ketintang, Surabaya</div>
            </div>
          </div>

          {/* Title */}
          <div style={{ textAlign: 'center', marginBottom: '1.25rem' }}>
            <div style={{ fontWeight: 800, fontSize: '1.25rem', letterSpacing: '0.15em', textDecoration: 'underline' }}>NOTA DINAS</div>
            <div style={{ fontSize: '0.875rem', marginTop: 2 }}>Nomor: {item.nomor}</div>
          </div>

          {/* Meta block */}
          <table style={{ borderCollapse: 'collapse', marginBottom: '1rem' }}>
            <tbody>
              {[
                ['Yth.', item.kepada],
                ['Dari', item.dibuat_oleh],
                ['Hal', item.perihal],
                ['Tanggal', formatDate(item.tanggal)],
              ].map(([k, v]) => (
                <tr key={k}>
                  <td style={{ verticalAlign: 'top', padding: '2px 12px 2px 0', fontWeight: 600, whiteSpace: 'nowrap' }}>{k}</td>
                  <td style={{ verticalAlign: 'top', padding: '2px 0' }}>: {v}</td>
                </tr>
              ))}
            </tbody>
          </table>

          <div style={{ borderBottom: '1px solid #0f172a', marginBottom: '1.25rem' }} />

          {/* Body */}
          <div style={{ whiteSpace: 'pre-wrap', marginBottom: '1rem' }}>{item.isi}</div>
          <p style={{ marginBottom: '2rem' }}>
            Demikian disampaikan, atas perhatian dan arahan Bapak/Ibu diucapkan terima kasih.
          </p>

          {/* Disposisi box */}
          <div style={{ marginBottom: '2rem' }}>
            <div style={{ fontWeight: 600, marginBottom: 6 }}>Catatan / Disposisi Pimpinan:</div>
            <div style={{ border: '1px solid #0f172a', height: 120, borderRadius: 4 }} />
          </div>

          {/* Signatures */}
          <div style={{ display: 'flex', justifyContent: 'space-between', gap: '2rem' }}>
            <div style={{ textAlign: 'center', minWidth: 200 }}>
              <div>Dibuat oleh,</div>
              <div style={{ height: 72 }} />
              <div style={{ fontWeight: 700 }}>( {item.dibuat_oleh} )</div>
            </div>
            <div style={{ textAlign: 'center', minWidth: 200 }}>
              <div>Menyetujui,</div>
              <div style={{ height: 72 }} />
              <div style={{ fontWeight: 700 }}>( {item.kepada} )</div>
            </div>
          </div>

          {/* Footer */}
          <div style={{ marginTop: '3rem', paddingTop: '1rem', borderTop: '1px solid #e2e8f0', textAlign: 'center', fontSize: '0.75rem', color: '#94a3b8' }}>
            Dokumen ini digenerate secara elektronik melalui sistem SIMDIR
          </div>
        </div>
      </div>

      {/* Print Styles — copied from app/(dashboard)/e-kwitansi/[id]/print/page.jsx */}
      <style>{`
        @media print {
          @page { size: A4 portrait; margin: 10mm 15mm 0mm 15mm; }
          * { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
          html, body { background: white !important; margin: 0 !important; padding: 0 !important; overflow: visible !important; }
          .invoice-print-scroll { overflow: visible !important; }
          .no-print, nav, .sidebar, .mobile-bottom-nav, .bottom-nav,
          [class*="bottom-nav"], [class*="mobile-nav"], [class*="mobile-header"],
          header[class*="mobile"], .app-shell > nav, .app-shell > .sidebar,
          footer:not(.invoice-footer), footer[class*="bottom"], footer[class*="nav"],
          .topbar, header.topbar, .drawer-overlay, .logout-btn, .sidebar-footer,
          .sidebar-brand, .sidebar-section-label, .sidebar-nav, .user-avatar, .user-meta,
          .topbar-actions, .topbar-search, .topbar-title, .topbar-user, .command-palette,
          .modal-backdrop, .spinner, .pwa-install-prompt,
          [role="banner"]:not(.invoice-banner) {
            display: none !important; visibility: hidden !important; opacity: 0 !important;
          }
          .invoice-print-container {
            padding: 10mm 15mm 15mm 15mm !important; margin: 0 !important;
            max-width: 100% !important; width: 100% !important; box-shadow: none !important;
            position: relative !important;
          }
          .app-shell, .main-area, main, #main-content, .content {
            margin: 0 !important; padding: 0 !important; width: 100% !important;
            max-width: 100% !important; overflow: visible !important; display: block !important;
          }
          * { overflow: visible !important; }
          html, body { overflow: visible !important; height: auto !important; min-height: auto !important; max-height: none !important; }
          .invoice-print-container { height: auto !important; min-height: auto !important; max-height: none !important; page-break-before: avoid !important; page-break-after: avoid !important; }
          body > div, body > div > div { width: 100% !important; max-width: 100% !important; margin: 0 !important; padding: 0 !important; }
        }
      `}</style>
    </div>
  );
}
```

- [ ] **Step 2: Verify build**

Run (only if no dev server on :3000):
```bash
cd "/Volumes/File Home/File Web/simdir" && npm run build 2>&1 | tail -8
```
Expected: build completes; route list includes `ƒ /memo/[id]/print`.

- [ ] **Step 3: Browser check**

Dev server up. `goto` `/memo/MEMO-2026-09-XXXX/print` as `admin`. Expected: the on-screen preview shows the kop (logo + brand name), "NOTA DINAS" + nomor, the Yth/Dari/Hal/Tanggal block, the isi with line breaks, the closing line, an empty bordered disposisi box, and two signature columns ("Dibuat oleh, ( name )" / "Menyetujui, ( kepada )"). Screenshot the preview. Optionally run `p.emulateMedia({ media: 'print' })` then screenshot again to confirm the sidebar/topbar are hidden.

- [ ] **Step 4: Commit**

```bash
cd "/Volumes/File Home/File Web/simdir" && git add "app/(dashboard)/memo/[id]/print/page.jsx" && git commit -m "$(cat <<'EOF'
feat(memo): A4 nota-dinas print page /memo/[id]/print

Kop from /api/app-settings, NOTA DINAS header, Yth/Dari/Hal/Tanggal,
isi (pre-wrap), closing line, blank disposisi box, dual signature block.
Print CSS copied from the e-kwitansi print page.

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
EOF
)"
```

---

## Task 10: Final integration verification

**Files:** none (verification only)

- [ ] **Step 1: Clean full build**

Ensure no dev server is running (`lsof -ti:3000 -sTCP:LISTEN | xargs -r kill`), then:
```bash
cd "/Volumes/File Home/File Web/simdir" && rm -rf .next && npm run build 2>&1 | tail -20
```
Expected: build succeeds. Route list includes all of: `○ /memo`, `○ /memo/create`, `ƒ /memo/[id]`, `ƒ /memo/[id]/edit`, `ƒ /memo/[id]/print`. No warnings about `/kelola-agenda` (the PIMPINAN_LIST refactor). `rm -rf .next` after.

- [ ] **Step 2: Full click-through as `super_admin`**

Dev server up, migration run. Playwright as `admin`/`admin123`:
1. `/memo` — screenshot; confirm "Tambah Memo" visible.
2. Click "Tambah Memo" → fill (Kepada "Direktur USC", Perihal "Integrasi test", Isi 2 lines) → Simpan → lands on detail.
3. On detail — confirm all fields + Edit/Hapus/Cetak visible; screenshot.
4. Click Edit → change Perihal to "Integrasi test 2" → Simpan → detail shows updated Perihal.
5. Click Cetak → screenshot the print preview.
6. Back to `/memo` → the row is listed.
7. Delete the test memo via the row's Hapus button → confirm → row gone.

Report any console error other than the known unrelated `Failed to load resource: 400`.

- [ ] **Step 3: Role check as `pimpinan`**

If a `pimpinan`-role account is available (check `getAllLocalUsers()` in `lib/local-users.js` — `pimpinan` / `pimpinan123` exists in dev-mock only when `NODE_ENV !== 'production'`; otherwise ask the user for a pimpinan test login), log in as that user and verify:
- The sidebar shows "Memo Pimpinan" (in the Keuangan & Dokumen group).
- `/memo` list renders but shows **no** "Tambah Memo" button and **no** "Hapus" icon in rows.
- `/memo/create` redirects to `/memo`.
- A direct `fetch('/api/memo', { method: 'POST', ... })` from the page console returns **403**.
- `/memo/<nomor-slug>` detail renders but shows **no** Edit/Hapus buttons; Cetak works.

Screenshot the pimpinan view of `/memo`. Stop the dev server after.

- [ ] **Step 4: Report**

Summarise for the user: what was built, that the migration must have been run (confirm it was), the pimpinan-role verification result, and any follow-ups. No commit (each task already committed).

---

## Self-Review

**1. Spec coverage**

| Spec section | Task |
|---|---|
| `memo` table + columns | Task 1 |
| `generate_memo_number()` trigger, `MEMO/YYYY/MM/NNNN` | Task 1 |
| `set_memo_updated_at()` trigger | Task 1 |
| Service-role RLS | Task 1 |
| `middleware.js`: replace `/surat` with `/memo` rule | Task 4 Step 1 |
| `middleware.js`: API gate (GET both roles, non-GET super_admin) | Task 4 Steps 2–3 |
| `navConfig`: `NAV_ICONS.memo` | Task 4 Step 4 |
| `navConfig`: `ALL_NAV_ITEMS` entry, group `keuangan-dokumen` | Task 4 Step 5 |
| `navConfig`: `SIDEBAR_ORDER` super_admin + pimpinan | Task 4 Step 6 |
| Not in any `BOTTOM_NAV_ORDER` | (nothing added — satisfied by omission) |
| `PIMPINAN_LIST` → `lib/constants/pimpinan.js` | Task 2 |
| `GET/POST /api/memo` | Task 3 Step 1 |
| `GET/PUT/DELETE /api/memo/[id]` (nomor slug) | Task 3 Step 2 |
| `friendlyDbError` with `duplicateLabel: 'Nomor memo'` | Task 3 Step 1 |
| `/memo` list page (table, search, role-gated buttons) | Task 5 |
| `/memo/create` + shared `MemoForm` | Task 6 |
| `dibuat_oleh` pre-filled from `useCurrentUser().displayName` | Task 6 Step 2 |
| create/edit redirect pimpinan to `/memo` | Task 6 Step 2, Task 8 Step 1 |
| `Kepada` dropdown from `PIMPINAN_LIST` + manual fallback | Task 6 Step 1 |
| `/memo/[id]` detail (read-only, role-gated buttons) | Task 7 |
| `/memo/[id]/edit` (MemoForm pre-filled, PUT) | Task 8 |
| `/memo/[id]/print` A4 nota-dinas layout | Task 9 |
| Print: kop from `/api/app-settings`, NOTA DINAS, meta block, isi pre-wrap, closing line, blank disposisi box, dual signature block, footer | Task 9 Step 1 |
| Print CSS shared with e-kwitansi print page | Task 9 Step 1 |
| Base schema file not updated (deliberate) | (noted in spec; no task needed) |
| Out-of-scope items (no signing, status, jawaban field, etc.) | Not implemented — satisfied by omission |

No gaps.

**2. Placeholder scan** — no "TBD"/"TODO"/"handle edge cases"/"similar to Task N". Every code step has complete code. The one "(Optional)" step (Task 1 Step 4) is genuinely conditional (creds present or not) and fully specified for both branches.

**3. Type consistency** — column names (`nomor`, `tanggal`, `kepada`, `dibuat_oleh`, `perihal`, `isi`) are identical across Task 1 (DDL), Task 3 (API insert/update/select), Task 5 (list render), Task 6 (`MemoForm` `initial` shape + `onSubmit` payload), Task 7 (detail render), Task 8 (edit fetch → `initial`). `MemoForm` props (`initial`, `submitting`, `submitLabel`, `cancelHref`, `onSubmit`) match between Task 6 (definition + create call site) and Task 8 (edit call site). `nomorToSlug`/`slugToNomor` used consistently (client builds slug from `nomor`, API converts back). `useCurrentUser()` destructures `{ displayName, isSuperAdmin, loading }` consistently.

---

## Execution Handoff

Plan complete and saved to `docs/superpowers/plans/2026-09-10-memo-pimpinan.md`. Two execution options:

1. **Subagent-Driven (recommended)** — a fresh subagent per task, review between tasks, fast iteration.
2. **Inline Execution** — execute tasks in this session using `executing-plans`, batch execution with checkpoints.

Which approach?
