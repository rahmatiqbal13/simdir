# RAB (Rencana Anggaran Biaya) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a standalone RAB (budget-plan document) feature: super_admin creates a categorized, itemized cost-estimate document, edits it, and prints it as a formal A4 document — mirroring the existing E-Kwitansi feature's structure.

**Architecture:** Two new Postgres tables (`rab` header + `rab_items` line items, service-role RLS) behind two Next.js API route files, five new client-rendered pages under `app/(dashboard)/rab/`, wired into `middleware.js` (super_admin-only) and `navConfig.jsx`.

**Tech Stack:** Next.js 15 App Router, plain JSX (no TypeScript), Supabase (Postgres + `@supabase/supabase-js` service-role client), inline style objects + existing global CSS classes from `app/globals.css`.

## Global Constraints

- This codebase has **no automated test framework** (no Jest/Vitest/Playwright/Testing Library — confirmed via `package.json` and a repo-wide search). Every other feature in this app (E-Invoice, E-Kwitansi, Program Kerja PUI) is verified the same way this plan verifies each task: (1) syntax-check every touched `.js`/`.jsx` file with Next's bundled Babel parser, (2) for API routes, a direct `curl` against the running dev server, (3) for pages, a manual click-through in the browser. Follow that pattern — do not introduce a new test framework for this feature alone.
- DB migrations in this project are run manually by pasting the SQL file into the Supabase SQL Editor (see the header comment convention in every existing file under `supabase/migrations/`) — there is no local Supabase CLI migration runner wired up. The "run migration" step in Task 1 means the human operator pastes and runs the SQL; you cannot execute it yourself unless you have direct Postgres credentials (see this session's established pattern of using a temporary `pg` npm install for one-off DDL when credentials are available).
- Nomor format: `RAB/YYYY/MM/NNNN`, generated entirely in the database by a trigger. Never send `nomor_rab` from the client, and never let the client re-derive or guess it.
- Reuse existing utilities — do not reimplement: `formatRupiah`, `nomorToSlug`, `slugToNomor` from `lib/utils/format.js`; `friendlyDbError` from `lib/db-errors.js`; `useToast` from `app/components/Toast.jsx`; `ConfirmModal` from `app/components/ConfirmModal.jsx`.
- Reuse existing global CSS classes wherever they cover the need — `.card`, `.card-body`, `.field`, `.field-label`, `.input`, `.textarea`, `.select`, `.btn`, `.btn-primary`, `.btn-secondary`, `.btn-ghost`, `.btn-sm`, `.btn-icon`, `.page-header`, `.page-title-wrap`, `.page-title`, `.page-subtitle`, `.page-actions`, `.modal-foot`, `.table-wrap`, `.table-scroll`, `.muted`, `.spinner`. Do not invent new CSS classes for things these already do; use inline `style={{}}` only for layout specific to RAB's category/item grid.
- All new routes are **super_admin only** (per the approved design spec) — enforced in `middleware.js`, not in page-level checks, matching `program_kerja_pui`/`kwitansi`/`pengaturan` convention.
- All new API routes use the Supabase **service-role** client (`SUPABASE_SERVICE_ROLE_KEY`) with RLS locked to `service_role` only — role enforcement happens in `middleware.js`, the routes themselves do not re-check role, matching `program_kerja_pui`/`kwitansi` convention exactly.

---

## Task 1: Database migration — `rab` + `rab_items` tables

**Files:**
- Create: `supabase/migrations/20260818000000_create_rab.sql`

**Interfaces:**
- Produces: table `rab` (columns: `id`, `nomor_rab`, `nama_kegiatan`, `tahun_anggaran`, `tanggal`, `nama_penyusun`, `nama_penanggung_jawab`, `created_by`, `created_at`, `updated_at`) and table `rab_items` (columns: `id`, `rab_id`, `kategori`, `uraian`, `volume`, `satuan`, `harga_satuan`, `total` (generated), `urutan`). Every later task's API/page code reads and writes exactly these column names.

- [ ] **Step 1: Write the migration file**

```sql
-- ============================================
-- RAB (Rencana Anggaran Biaya) — modul dokumen perencanaan anggaran,
-- berdiri sendiri (tidak terkait Program Kerja PUI/E-Invoice/E-Kwitansi/
-- Unit Kerja). Lihat docs/superpowers/specs/2026-08-18-rab-feature-design.md
-- Jalankan script ini di Supabase SQL Editor
-- Supabase Dashboard → SQL Editor → New query
-- ============================================

CREATE TABLE IF NOT EXISTS rab (
  id                    uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  nomor_rab             varchar(50) UNIQUE NOT NULL,
  nama_kegiatan         text NOT NULL,
  tahun_anggaran        integer NOT NULL,
  tanggal               date NOT NULL DEFAULT CURRENT_DATE,
  nama_penyusun         text,
  nama_penanggung_jawab text NOT NULL,
  created_by            uuid REFERENCES profiles(id),
  created_at            timestamptz NOT NULL DEFAULT now(),
  updated_at            timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS rab_items (
  id            uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  rab_id        uuid NOT NULL REFERENCES rab(id) ON DELETE CASCADE,
  kategori      text NOT NULL,
  uraian        text NOT NULL,
  volume        numeric(10,2) NOT NULL DEFAULT 1,
  satuan        text,
  harga_satuan  numeric(15,2) NOT NULL DEFAULT 0,
  total         numeric(15,2) GENERATED ALWAYS AS (volume * harga_satuan) STORED,
  urutan        integer DEFAULT 0
);

CREATE INDEX IF NOT EXISTS idx_rab_items_rab_id ON rab_items(rab_id);

-- Auto-generate nomor_rab (format RAB/2026/08/0001), pola identik dengan
-- generate_kwitansi_number()/generate_invoice_number() — advisory lock per
-- bulan supaya dua RAB yang dibuat bersamaan di bulan yang sama tidak
-- pernah dapat nomor urut yang sama.
CREATE OR REPLACE FUNCTION generate_rab_number()
RETURNS TRIGGER AS $$
DECLARE
    year_str TEXT;
    month_str TEXT;
    sequence_num INTEGER;
    lock_key BIGINT;
BEGIN
    year_str := TO_CHAR(NEW.tanggal, 'YYYY');
    month_str := TO_CHAR(NEW.tanggal, 'MM');

    lock_key := ('x' || md5('rab_seq_' || year_str || month_str))::bit(64)::bigint;
    PERFORM pg_advisory_xact_lock(lock_key);

    SELECT COALESCE(MAX(CAST(SUBSTRING(nomor_rab FROM '....$') AS INTEGER)), 0) + 1
    INTO sequence_num
    FROM rab
    WHERE nomor_rab LIKE 'RAB/' || year_str || '/' || month_str || '/%';

    NEW.nomor_rab := 'RAB/' || year_str || '/' || month_str || '/' || LPAD(sequence_num::TEXT, 4, '0');
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_generate_rab_number ON rab;
CREATE TRIGGER trg_generate_rab_number
  BEFORE INSERT ON rab
  FOR EACH ROW
  WHEN (NEW.nomor_rab IS NULL OR NEW.nomor_rab = '')
  EXECUTE FUNCTION generate_rab_number();

CREATE OR REPLACE FUNCTION set_rab_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at := NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_rab_updated_at ON rab;
CREATE TRIGGER trg_rab_updated_at
  BEFORE UPDATE ON rab
  FOR EACH ROW
  EXECUTE FUNCTION set_rab_updated_at();

-- RLS — hanya service role (dipakai app/api/rab/*) yang boleh baca/tulis.
-- Akses per-role (super_admin) diatur di middleware.js, mengikuti pola
-- program_kerja_pui/kwitansi.
ALTER TABLE rab ENABLE ROW LEVEL SECURITY;
ALTER TABLE rab_items ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Service role manage rab" ON rab;
CREATE POLICY "Service role manage rab"
  ON rab FOR ALL
  USING (auth.role() = 'service_role');

DROP POLICY IF EXISTS "Service role manage rab_items" ON rab_items;
CREATE POLICY "Service role manage rab_items"
  ON rab_items FOR ALL
  USING (auth.role() = 'service_role');
```

- [ ] **Step 2: Verify SQL syntax locally**

Run:
```bash
cd "/Volumes/File Home/File Web/simdir" && node -e "
const fs = require('fs');
const sql = fs.readFileSync('supabase/migrations/20260818000000_create_rab.sql', 'utf8');
const openParens = (sql.match(/\(/g)||[]).length;
const closeParens = (sql.match(/\)/g)||[]).length;
const openDollar = (sql.match(/\\\$\\\$/g)||[]).length;
console.log('parens open:', openParens, 'close:', closeParens, openParens===closeParens ? 'BALANCED' : 'MISMATCH');
console.log('dollar-quote pairs:', openDollar, openDollar % 2 === 0 ? 'BALANCED' : 'MISMATCH');
"
```
Expected: both lines print `BALANCED`. This is a structural sanity check only (this codebase has no local Postgres to run the migration against) — the human operator runs the actual SQL in the Supabase SQL Editor before Task 2 can be manually verified end-to-end.

- [ ] **Step 3: Ask the user to run the migration**

Tell the user: "Please run `supabase/migrations/20260818000000_create_rab.sql` in the Supabase SQL Editor before we continue to Task 2, since the API routes need the `rab`/`rab_items` tables to exist to be testable."

- [ ] **Step 4: Commit**

```bash
cd "/Volumes/File Home/File Web/simdir" && git add supabase/migrations/20260818000000_create_rab.sql && git commit -m "$(cat <<'EOF'
feat(db): add rab + rab_items tables for RAB feature

Header/line-item tables for the new standalone RAB (budget plan)
document feature, mirroring the kwitansi numbering-trigger and
service-role RLS pattern.
EOF
)"
```

---

## Task 2: API routes — `/api/rab` and `/api/rab/[id]`

**Files:**
- Create: `app/api/rab/route.js`
- Create: `app/api/rab/[id]/route.js`

**Interfaces:**
- Consumes: tables `rab`/`rab_items` from Task 1. `friendlyDbError(err, {duplicateLabel, dependentLabel})` from `lib/db-errors.js`. `slugToNomor(slug)` from `lib/utils/format.js`.
- Produces:
  - `GET /api/rab` → `200` with `[{ id, nomor_rab, nama_kegiatan, tahun_anggaran, tanggal, nama_penyusun, nama_penanggung_jawab, rab_items: [{id, kategori, uraian, volume, satuan, harga_satuan, total}] }, ...]`
  - `POST /api/rab` → body `{ nama_kegiatan, tahun_anggaran, tanggal, nama_penyusun, nama_penanggung_jawab, items: [{kategori, uraian, volume, satuan, harga_satuan}, ...] }` → `201` with the created row (same shape as one GET list item) on success, `400` with `{error}` on validation failure, `500` with `{error}` on DB failure.
  - `GET /api/rab/[id]` (where `[id]` is a **slug**, e.g. `RAB-2026-08-0001`) → `200` with one row (header + `rab_items`) or `404` with `{error}`.
  - `PUT /api/rab/[id]` → same body shape as POST → `200` with updated row, `400`/`404`/`500` with `{error}`.
  - `DELETE /api/rab/[id]` → `200` with `{success: true}` or `404`/`500` with `{error}`.

- [ ] **Step 1: Write `app/api/rab/route.js`**

```js
import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { friendlyDbError } from '@/lib/db-errors'

const SELECT_COLUMNS = '*, rab_items(*)'

function getServiceClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  )
}

function validateBody(body) {
  const namaKegiatan = (body.nama_kegiatan || '').trim()
  const namaPenanggungJawab = (body.nama_penanggung_jawab || '').trim()
  const tahunAnggaran = Number(body.tahun_anggaran)
  const items = Array.isArray(body.items) ? body.items : []

  if (!namaKegiatan) return { error: 'Nama kegiatan wajib diisi' }
  if (!namaPenanggungJawab) return { error: 'Nama penanggung jawab wajib diisi' }
  if (!Number.isFinite(tahunAnggaran) || tahunAnggaran < 2000) {
    return { error: 'Tahun anggaran wajib diisi dengan angka yang valid' }
  }
  if (items.length === 0) return { error: 'RAB wajib punya minimal 1 item' }
  for (const it of items) {
    if (!String(it.kategori || '').trim()) return { error: 'Setiap item wajib punya kategori' }
    if (!String(it.uraian || '').trim()) return { error: 'Setiap item wajib punya uraian' }
    if (!(Number(it.volume) > 0)) return { error: 'Volume setiap item wajib lebih besar dari 0' }
  }

  return {
    namaKegiatan,
    namaPenanggungJawab,
    tahunAnggaran,
    tanggal: body.tanggal || new Date().toISOString().split('T')[0],
    namaPenyusun: (body.nama_penyusun || '').trim() || null,
    items: items.map((it, index) => ({
      kategori: String(it.kategori).trim(),
      uraian: String(it.uraian).trim(),
      volume: Number(it.volume),
      satuan: (it.satuan || '').trim() || null,
      harga_satuan: Number(it.harga_satuan) || 0,
      urutan: index,
    })),
  }
}

// GET /api/rab — daftar RAB. Dilindungi middleware (role super_admin).
export async function GET() {
  try {
    const supabase = getServiceClient()
    const { data, error } = await supabase
      .from('rab')
      .select(SELECT_COLUMNS)
      .order('created_at', { ascending: false })
    if (error) throw error
    return NextResponse.json(data || [])
  } catch (err) {
    return NextResponse.json({ error: err.message || 'Gagal memuat data' }, { status: 500 })
  }
}

// POST /api/rab — buat RAB baru. nomor_rab dibuat otomatis oleh trigger DB
// (generate_rab_number), jangan dikirim dari client.
export async function POST(request) {
  try {
    const body = await request.json()
    const validated = validateBody(body)
    if (validated.error) return NextResponse.json({ error: validated.error }, { status: 400 })

    const supabase = getServiceClient()
    const { data: rabRow, error: rabError } = await supabase
      .from('rab')
      .insert([{
        nama_kegiatan: validated.namaKegiatan,
        tahun_anggaran: validated.tahunAnggaran,
        tanggal: validated.tanggal,
        nama_penyusun: validated.namaPenyusun,
        nama_penanggung_jawab: validated.namaPenanggungJawab,
      }])
      .select()
      .single()
    if (rabError) throw rabError

    const { error: itemsError } = await supabase
      .from('rab_items')
      .insert(validated.items.map((it) => ({ ...it, rab_id: rabRow.id })))
    if (itemsError) {
      // Bersihkan header yang sudah terlanjur dibuat kalau insert item
      // gagal, supaya tidak ada RAB "kosong" tanpa item tersisa di database.
      await supabase.from('rab').delete().eq('id', rabRow.id)
      throw itemsError
    }

    const { data: full, error: fetchError } = await supabase
      .from('rab')
      .select(SELECT_COLUMNS)
      .eq('id', rabRow.id)
      .single()
    if (fetchError) throw fetchError

    return NextResponse.json(full, { status: 201 })
  } catch (err) {
    return NextResponse.json({ error: friendlyDbError(err, { duplicateLabel: 'Nomor RAB' }) }, { status: 500 })
  }
}
```

- [ ] **Step 2: Write `app/api/rab/[id]/route.js`**

```js
import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { friendlyDbError } from '@/lib/db-errors'
import { slugToNomor } from '@/lib/utils/format'

const SELECT_COLUMNS = '*, rab_items(*)'

function getServiceClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  )
}

function validateBody(body) {
  const namaKegiatan = (body.nama_kegiatan || '').trim()
  const namaPenanggungJawab = (body.nama_penanggung_jawab || '').trim()
  const tahunAnggaran = Number(body.tahun_anggaran)
  const items = Array.isArray(body.items) ? body.items : []

  if (!namaKegiatan) return { error: 'Nama kegiatan wajib diisi' }
  if (!namaPenanggungJawab) return { error: 'Nama penanggung jawab wajib diisi' }
  if (!Number.isFinite(tahunAnggaran) || tahunAnggaran < 2000) {
    return { error: 'Tahun anggaran wajib diisi dengan angka yang valid' }
  }
  if (items.length === 0) return { error: 'RAB wajib punya minimal 1 item' }
  for (const it of items) {
    if (!String(it.kategori || '').trim()) return { error: 'Setiap item wajib punya kategori' }
    if (!String(it.uraian || '').trim()) return { error: 'Setiap item wajib punya uraian' }
    if (!(Number(it.volume) > 0)) return { error: 'Volume setiap item wajib lebih besar dari 0' }
  }

  return {
    namaKegiatan,
    namaPenanggungJawab,
    tahunAnggaran,
    tanggal: body.tanggal || new Date().toISOString().split('T')[0],
    namaPenyusun: (body.nama_penyusun || '').trim() || null,
    items: items.map((it, index) => ({
      kategori: String(it.kategori).trim(),
      uraian: String(it.uraian).trim(),
      volume: Number(it.volume),
      satuan: (it.satuan || '').trim() || null,
      harga_satuan: Number(it.harga_satuan) || 0,
      urutan: index,
    })),
  }
}

// GET /api/rab/[id] — satu RAB (dipakai halaman detail/edit/print). "id"
// di URL adalah slug dari nomor_rab (mis. "RAB-2026-08-0001", lihat
// lib/utils/format.js nomorToSlug/slugToNomor) — bukan UUID mentah.
export async function GET(request, { params }) {
  try {
    const { id } = await params
    const supabase = getServiceClient()
    const { data, error } = await supabase
      .from('rab')
      .select(SELECT_COLUMNS)
      .eq('nomor_rab', slugToNomor(id))
      .single()
    if (error) throw error
    return NextResponse.json(data)
  } catch (err) {
    return NextResponse.json({ error: err.message || 'RAB tidak ditemukan' }, { status: 404 })
  }
}

// PUT /api/rab/[id] — update header + ganti seluruh item (hapus semua item
// lama, insert item baru) — replace-all, bukan diff per-item, karena
// seluruh form RAB memang disubmit sekaligus dari client.
export async function PUT(request, { params }) {
  try {
    const { id } = await params
    const body = await request.json()
    const validated = validateBody(body)
    if (validated.error) return NextResponse.json({ error: validated.error }, { status: 400 })

    const supabase = getServiceClient()
    const { data: existing, error: findError } = await supabase
      .from('rab')
      .select('id')
      .eq('nomor_rab', slugToNomor(id))
      .single()
    if (findError) throw findError

    const { error: updateError } = await supabase
      .from('rab')
      .update({
        nama_kegiatan: validated.namaKegiatan,
        tahun_anggaran: validated.tahunAnggaran,
        tanggal: validated.tanggal,
        nama_penyusun: validated.namaPenyusun,
        nama_penanggung_jawab: validated.namaPenanggungJawab,
      })
      .eq('id', existing.id)
    if (updateError) throw updateError

    const { error: deleteItemsError } = await supabase
      .from('rab_items')
      .delete()
      .eq('rab_id', existing.id)
    if (deleteItemsError) throw deleteItemsError

    const { error: insertItemsError } = await supabase
      .from('rab_items')
      .insert(validated.items.map((it) => ({ ...it, rab_id: existing.id })))
    if (insertItemsError) throw insertItemsError

    const { data: full, error: fetchError } = await supabase
      .from('rab')
      .select(SELECT_COLUMNS)
      .eq('id', existing.id)
      .single()
    if (fetchError) throw fetchError

    return NextResponse.json(full)
  } catch (err) {
    return NextResponse.json({ error: friendlyDbError(err, { duplicateLabel: 'Nomor RAB' }) }, { status: 500 })
  }
}

// DELETE /api/rab/[id] — hapus RAB (rab_items ikut terhapus via ON DELETE CASCADE).
export async function DELETE(request, { params }) {
  try {
    const { id } = await params
    const supabase = getServiceClient()
    const { error } = await supabase
      .from('rab')
      .delete()
      .eq('nomor_rab', slugToNomor(id))
    if (error) throw error
    return NextResponse.json({ success: true })
  } catch (err) {
    return NextResponse.json({ error: err.message || 'Gagal menghapus RAB' }, { status: 500 })
  }
}
```

- [ ] **Step 3: Syntax-check both files**

Run:
```bash
cd "/Volumes/File Home/File Web/simdir" && for f in "app/api/rab/route.js" "app/api/rab/[id]/route.js"; do
node -e "
const parser = require('next/dist/compiled/babel/parser');
const fs = require('fs');
const code = fs.readFileSync('$f', 'utf8');
try {
  parser.parse(code, { sourceType: 'module' });
  console.log('$f OK');
} catch (e) {
  console.error('$f SYNTAX ERROR:', e.message);
  process.exit(1);
}
"
done
```
Expected: both files print `OK`.

- [ ] **Step 4: Manually verify against the running dev server**

Ask the user to confirm `npm run dev` is already running (per this session's standing rule: never run `npm run build` while dev server is live — this step only needs the dev server, not a build), then run:
```bash
curl -s -X POST http://localhost:3000/api/rab \
  -H "Content-Type: application/json" \
  -d '{"nama_kegiatan":"Test RAB","tahun_anggaran":2026,"nama_penanggung_jawab":"Budi","items":[{"kategori":"Konsumsi","uraian":"Snack","volume":10,"satuan":"box","harga_satuan":15000}]}'
```
Expected: JSON response with `"nomor_rab":"RAB/2026/08/0001"` (or next sequence number), a `rab_items` array with one item, `"total":150000` on that item.

Then run:
```bash
curl -s http://localhost:3000/api/rab
```
Expected: JSON array containing the row just created.

- [ ] **Step 5: Commit**

```bash
cd "/Volumes/File Home/File Web/simdir" && git add "app/api/rab/route.js" "app/api/rab/[id]/route.js" && git commit -m "$(cat <<'EOF'
feat(api): add /api/rab CRUD routes

GET/POST /api/rab and GET/PUT/DELETE /api/rab/[id], following the
program_kerja_pui/kwitansi service-role + middleware-enforced-role
convention. [id] is a nomor_rab slug, not a raw UUID, matching the
e-invoice/e-kwitansi URL convention.
EOF
)"
```

---

## Task 3: Access control — middleware + navConfig

**Files:**
- Modify: `middleware.js:44-45`
- Modify: `app/components/navConfig.jsx:150,160`, and the `NAV_ICONS` object (starts line 5, closes line 137)

**Interfaces:**
- Consumes: existing `ROLE_RULES` array shape in `middleware.js`; existing `NAV_ICONS`/`ALL_NAV_ITEMS`/`SIDEBAR_ORDER` shape in `navConfig.jsx`.
- Produces: `/rab*` routes and `/api/rab*` requests require `super_admin`; a `rab` sidebar entry pointing at `/rab`.

- [ ] **Step 1: Add the role rule to `middleware.js`**

`middleware.js` currently ends its `ROLE_RULES` array (starting at line 8) like this, at lines 40-45:

```js
  // Pemasukan Unit Usaha (eks-sistem terpisah "SIREKAP", digabung ke sini) —
  // data finansial per unit usaha, jadi pakai role 'admin_keuangan' yang
  // memang sudah ada untuk urusan keuangan (lihat navConfig.jsx), plus
  // super_admin.
  { prefix: '/pemasukan-unit-usaha', roles: ['super_admin', 'admin_keuangan'] },
]
```

Modify `middleware.js:44-45` — insert the new rule right before the closing `]`, so it reads:

```js
  { prefix: '/pemasukan-unit-usaha', roles: ['super_admin', 'admin_keuangan'] },
  { prefix: '/rab', roles: ['super_admin'] },
]
```

- [ ] **Step 2: Add a `clipboard` icon to `NAV_ICONS` in `navConfig.jsx`**

`app/components/navConfig.jsx:130-137` currently reads:

```jsx
  wallet: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M21 12V7H5a2 2 0 0 1 0-4h14v4"/>
      <path d="M3 5v14a2 2 0 0 0 2 2h16v-5"/>
      <path d="M18 12a2 2 0 0 0 0 4h4v-4z"/>
    </svg>
  ),
}
```

Modify `app/components/navConfig.jsx:136-137` — insert a new `clipboard` entry right before the closing `}` of `NAV_ICONS`, so it reads:

```jsx
  wallet: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M21 12V7H5a2 2 0 0 1 0-4h14v4"/>
      <path d="M3 5v14a2 2 0 0 0 2 2h16v-5"/>
      <path d="M18 12a2 2 0 0 0 0 4h4v-4z"/>
    </svg>
  ),
  clipboard: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M9 2h6a1 1 0 0 1 1 1v2H8V3a1 1 0 0 1 1-1z"/>
      <rect x="4" y="4" width="16" height="18" rx="2"/>
      <line x1="8" y1="11" x2="16" y2="11"/>
      <line x1="8" y1="15" x2="16" y2="15"/>
      <line x1="8" y1="19" x2="13" y2="19"/>
    </svg>
  ),
}
```

- [ ] **Step 3: Add the `rab` entry to `ALL_NAV_ITEMS`**

`app/components/navConfig.jsx:150` currently reads:

```jsx
  { key: 'e-kwitansi', href: '/e-kwitansi', label: 'E-Kwitansi', shortLabel: 'Kwitansi', icon: 'receipt', roles: ['super_admin'] },
```

Modify `app/components/navConfig.jsx:150` — insert a new line right after it, so lines 150-151 read:

```jsx
  { key: 'e-kwitansi', href: '/e-kwitansi', label: 'E-Kwitansi', shortLabel: 'Kwitansi', icon: 'receipt', roles: ['super_admin'] },
  { key: 'rab', href: '/rab', label: 'RAB', shortLabel: 'RAB', icon: 'clipboard', roles: ['super_admin'] },
```

- [ ] **Step 4: Add `'rab'` to `SIDEBAR_ORDER.super_admin`**

`app/components/navConfig.jsx:160` currently reads:

```jsx
  super_admin: ['dashboard', 'kelola-agenda', 'tv-pamflet', 'kelola-penilaian', 'pertanyaan-penilaian', 'kelola-saran', 'kelola-tamu', 'program-kerja-pui', 'e-invoice', 'e-kwitansi', 'pemasukan-unit-usaha', 'laporan', 'pengaturan-users', 'pengaturan-unit-kerja', 'pengaturan-branding'],
```

Modify `app/components/navConfig.jsx:160` — insert `'rab'` right after `'e-kwitansi'`, so it reads:

```jsx
  super_admin: ['dashboard', 'kelola-agenda', 'tv-pamflet', 'kelola-penilaian', 'pertanyaan-penilaian', 'kelola-saran', 'kelola-tamu', 'program-kerja-pui', 'e-invoice', 'e-kwitansi', 'rab', 'pemasukan-unit-usaha', 'laporan', 'pengaturan-users', 'pengaturan-unit-kerja', 'pengaturan-branding'],
```

Do not add `'rab'` to any `BOTTOM_NAV_ORDER` entry (per the approved design spec — super_admin's 3 mobile bottom-nav slots stay as they are).

- [ ] **Step 5: Syntax-check both files**

Run:
```bash
cd "/Volumes/File Home/File Web/simdir" && for f in "middleware.js" "app/components/navConfig.jsx"; do
node -e "
const parser = require('next/dist/compiled/babel/parser');
const fs = require('fs');
const code = fs.readFileSync('$f', 'utf8');
try {
  parser.parse(code, { sourceType: 'module', plugins: ['jsx'] });
  console.log('$f OK');
} catch (e) {
  console.error('$f SYNTAX ERROR:', e.message);
  process.exit(1);
}
"
done
```
Expected: both files print `OK`.

- [ ] **Step 6: Manually verify**

With the dev server running, log in as a `super_admin` user in the browser and confirm a "RAB" sidebar link with a clipboard icon appears and, when clicked, does not redirect to `/login` or `/dashboard` (it will 404 until Task 4 exists — that's expected at this point; a 404 confirms the route passed middleware, a redirect means the role rule is wrong). Then log in as a non-super_admin role (e.g. `admin`) and confirm the "RAB" link does not appear in the sidebar, and that navigating to `/rab` directly redirects to `/dashboard`.

- [ ] **Step 7: Commit**

```bash
cd "/Volumes/File Home/File Web/simdir" && git add middleware.js app/components/navConfig.jsx && git commit -m "$(cat <<'EOF'
feat(nav): wire up RAB route access and sidebar entry

Adds /rab to middleware.js ROLE_RULES (super_admin only) and a new
sidebar entry with a dedicated clipboard icon in navConfig.jsx.
EOF
)"
```

---

## Task 4: List page — `/rab`

**Files:**
- Create: `app/(dashboard)/rab/page.jsx`

**Interfaces:**
- Consumes: `GET /api/rab` (Task 2) → `[{ id, nomor_rab, nama_kegiatan, tahun_anggaran, tanggal, rab_items: [{total}] }]`. `formatRupiah`, `formatDate`, `nomorToSlug` from `lib/utils/format.js`. `useToast` from `app/components/Toast.jsx`. `ConfirmModal` from `app/components/ConfirmModal.jsx`.
- Produces: nothing consumed by later tasks (this is a leaf page), but links to `/rab/create`, `/rab/[slug]`, `/rab/[slug]/print` which Tasks 6/7/9 must serve.

- [ ] **Step 1: Write `app/(dashboard)/rab/page.jsx`**

```jsx
'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useToast } from '@/app/components/Toast';
import ConfirmModal from '@/app/components/ConfirmModal';
import { formatRupiah, formatDate, nomorToSlug } from '@/lib/utils/format';

export default function RabListPage() {
  const { error: toastError, success: toastSuccess } = useToast();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [deleteItem, setDeleteItem] = useState(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/rab');
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

  const totalOf = (item) => (item.rab_items || []).reduce((sum, it) => sum + Number(it.total || 0), 0);

  const filtered = items.filter((it) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return `${it.nomor_rab} ${it.nama_kegiatan}`.toLowerCase().includes(q);
  });

  const confirmDelete = async () => {
    if (!deleteItem) return;
    setDeleteLoading(true);
    try {
      const res = await fetch(`/api/rab/${nomorToSlug(deleteItem.nomor_rab)}`, { method: 'DELETE' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      await fetchData();
      setDeleteItem(null);
      toastSuccess('RAB berhasil dihapus');
    } catch (err) {
      toastError('Gagal menghapus: ' + err.message);
    } finally {
      setDeleteLoading(false);
    }
  };

  return (
    <div>
      <div className="page-header">
        <div className="page-title-wrap">
          <h1 className="page-title">RAB</h1>
          <p className="page-subtitle">Rencana Anggaran Biaya — susun, edit, dan cetak dokumen RAB.</p>
        </div>
        <div className="page-actions">
          <Link href="/rab/create" className="btn btn-primary">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ width: 16, height: 16 }}>
              <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
            </svg>
            Buat RAB
          </Link>
        </div>
      </div>

      <div style={{ display: 'flex', gap: '0.75rem', marginBottom: '1rem', flexWrap: 'wrap' }}>
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Cari nomor RAB atau nama kegiatan…"
          className="input"
          style={{ flex: 1, minWidth: 240 }}
        />
        {search && (
          <button onClick={() => setSearch('')} className="btn btn-ghost">Reset</button>
        )}
      </div>

      <div className="table-wrap">
        <div className="table-scroll">
          <table>
            <thead>
              <tr>
                {['No. RAB', 'Nama Kegiatan', 'Tahun Anggaran', 'Total', 'Tanggal', 'Aksi'].map((h) => (
                  <th key={h}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={6} className="text-center muted" style={{ padding: '2rem' }}>Memuat…</td></tr>
              ) : filtered.length === 0 ? (
                <tr><td colSpan={6} className="text-center muted" style={{ padding: '2rem' }}>Belum ada RAB</td></tr>
              ) : filtered.map((item) => (
                <tr key={item.id}>
                  <td style={{ fontWeight: 600, fontFamily: 'monospace', whiteSpace: 'nowrap' }}>{item.nomor_rab}</td>
                  <td>{item.nama_kegiatan}</td>
                  <td className="num" style={{ whiteSpace: 'nowrap' }}>{item.tahun_anggaran}</td>
                  <td className="num" style={{ whiteSpace: 'nowrap', fontFamily: 'monospace' }}>{formatRupiah(totalOf(item))}</td>
                  <td className="num muted" style={{ whiteSpace: 'nowrap', fontSize: '0.8125rem' }}>{formatDate(item.tanggal)}</td>
                  <td className="text-right">
                    <div style={{ display: 'inline-flex', gap: 8 }}>
                      <Link href={`/rab/${nomorToSlug(item.nomor_rab)}`} className="btn btn-ghost btn-sm btn-icon" title="Detail" aria-label="Lihat detail RAB">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ width: 14, height: 14 }}><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
                      </Link>
                      <Link href={`/rab/${nomorToSlug(item.nomor_rab)}/print`} className="btn btn-ghost btn-sm btn-icon" title="Cetak" aria-label="Cetak RAB">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ width: 14, height: 14 }}><polyline points="6 9 6 2 18 2 18 9"/><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/><rect x="6" y="14" width="12" height="8"/></svg>
                      </Link>
                      <button className="btn btn-ghost btn-sm btn-icon" onClick={() => setDeleteItem(item)} title="Hapus" aria-label="Hapus RAB" style={{ color: 'var(--danger)' }}>
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ width: 14, height: 14 }}><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
                      </button>
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
        title="Hapus RAB"
        message={<>Yakin ingin menghapus <strong>{deleteItem?.nomor_rab}</strong> — {deleteItem?.nama_kegiatan}? Tindakan ini tidak dapat dibatalkan.</>}
        confirmLabel="Ya, Hapus"
        busy={deleteLoading}
        onConfirm={confirmDelete}
        onCancel={() => setDeleteItem(null)}
      />
    </div>
  );
}
```

- [ ] **Step 2: Syntax-check the file**

Run:
```bash
cd "/Volumes/File Home/File Web/simdir" && node -e "
const parser = require('next/dist/compiled/babel/parser');
const fs = require('fs');
const code = fs.readFileSync('app/(dashboard)/rab/page.jsx', 'utf8');
try {
  parser.parse(code, { sourceType: 'module', plugins: ['jsx'] });
  console.log('OK');
} catch (e) {
  console.error('SYNTAX ERROR:', e.message);
  process.exit(1);
}
"
```
Expected: `OK`.

- [ ] **Step 3: Manually verify in the browser**

Navigate to `/rab` as a super_admin. Expected: page loads, shows the RAB created via `curl` in Task 2 Step 4 in the table with the correct formatted Rupiah total, search box filters it by typing part of the nomor or nama_kegiatan, and clicking the delete icon opens the ConfirmModal.

- [ ] **Step 4: Commit**

```bash
cd "/Volumes/File Home/File Web/simdir" && git add "app/(dashboard)/rab/page.jsx" && git commit -m "feat(rab): add RAB list page"
```

---

## Task 5: Shared form component — `RabForm`

**Files:**
- Create: `app/(dashboard)/rab/RabForm.jsx`

**Interfaces:**
- Consumes: nothing external beyond React + `formatRupiah` from `lib/utils/format.js` + `ConfirmModal` from `app/components/ConfirmModal.jsx`.
- Produces: a component with this exact signature, consumed by Task 6 (create page) and Task 8 (edit page):

```jsx
// Props:
//   initialHeader: { nama_kegiatan, tahun_anggaran, tanggal, nama_penyusun, nama_penanggung_jawab }
//   initialCategories: [{ kategori, items: [{ uraian, volume, satuan, harga_satuan }] }]
//   onSubmit: (payload) => Promise<void>
//     where payload = { nama_kegiatan, tahun_anggaran, tanggal, nama_penyusun,
//       nama_penanggung_jawab, items: [{kategori, uraian, volume, satuan, harga_satuan}, ...] }
//     (categories flattened back into a single items array, each item carrying its own kategori)
//   saving: boolean
//   submitLabel: string
//   cancelHref: string
export default function RabForm({ initialHeader, initialCategories, onSubmit, saving, submitLabel, cancelHref }) { ... }
```

- [ ] **Step 1: Write `app/(dashboard)/rab/RabForm.jsx`**

```jsx
'use client';

import { useState } from 'react';
import Link from 'next/link';
import ConfirmModal from '@/app/components/ConfirmModal';
import { formatRupiah } from '@/lib/utils/format';

const emptyItem = () => ({ uraian: '', volume: '1', satuan: '', harga_satuan: '' });
const emptyCategory = () => ({ kategori: '', items: [emptyItem()] });

export default function RabForm({ initialHeader, initialCategories, onSubmit, saving, submitLabel, cancelHref }) {
  const [header, setHeader] = useState(initialHeader);
  const [categories, setCategories] = useState(
    initialCategories && initialCategories.length > 0 ? initialCategories : [emptyCategory()]
  );
  const [deleteCategoryIndex, setDeleteCategoryIndex] = useState(null);

  const setHeaderField = (field, value) => setHeader((h) => ({ ...h, [field]: value }));

  const setCategoryName = (catIndex, value) => {
    setCategories((cats) => cats.map((c, i) => (i === catIndex ? { ...c, kategori: value } : c)));
  };

  const addCategory = () => setCategories((cats) => [...cats, emptyCategory()]);

  const requestRemoveCategory = (catIndex) => {
    const hasContent = categories[catIndex].items.some((it) => it.uraian.trim());
    if (hasContent) {
      setDeleteCategoryIndex(catIndex);
    } else {
      setCategories((cats) => cats.filter((_, i) => i !== catIndex));
    }
  };

  const confirmRemoveCategory = () => {
    setCategories((cats) => cats.filter((_, i) => i !== deleteCategoryIndex));
    setDeleteCategoryIndex(null);
  };

  const addItem = (catIndex) => {
    setCategories((cats) => cats.map((c, i) => (i === catIndex ? { ...c, items: [...c.items, emptyItem()] } : c)));
  };

  const removeItem = (catIndex, itemIndex) => {
    setCategories((cats) => cats.map((c, i) => {
      if (i !== catIndex) return c;
      return { ...c, items: c.items.filter((_, j) => j !== itemIndex) };
    }));
  };

  const updateItem = (catIndex, itemIndex, field, value) => {
    setCategories((cats) => cats.map((c, i) => {
      if (i !== catIndex) return c;
      return {
        ...c,
        items: c.items.map((it, j) => (j === itemIndex ? { ...it, [field]: value } : it)),
      };
    }));
  };

  const categorySubtotal = (cat) => cat.items.reduce(
    (sum, it) => sum + (Number(it.volume) || 0) * (Number(it.harga_satuan) || 0), 0
  );
  const grandTotal = categories.reduce((sum, cat) => sum + categorySubtotal(cat), 0);

  const handleSubmit = async (e) => {
    e.preventDefault();
    const items = categories.flatMap((cat) => cat.items.map((it) => ({
      kategori: cat.kategori,
      uraian: it.uraian,
      volume: it.volume,
      satuan: it.satuan,
      harga_satuan: it.harga_satuan,
    })));
    await onSubmit({
      nama_kegiatan: header.nama_kegiatan,
      tahun_anggaran: Number(header.tahun_anggaran),
      tanggal: header.tanggal,
      nama_penyusun: header.nama_penyusun,
      nama_penanggung_jawab: header.nama_penanggung_jawab,
      items,
    });
  };

  return (
    <form onSubmit={handleSubmit} className="card" style={{ maxWidth: 900 }}>
      <div className="card-body" style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        <div className="field">
          <label className="field-label" htmlFor="nama_kegiatan">Nama Kegiatan *</label>
          <input id="nama_kegiatan" className="input" value={header.nama_kegiatan} onChange={(e) => setHeaderField('nama_kegiatan', e.target.value)} placeholder="Mis. Pelatihan Atlet Difabel" required />
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 14 }}>
          <div className="field">
            <label className="field-label" htmlFor="tahun_anggaran">Tahun Anggaran *</label>
            <input id="tahun_anggaran" type="number" className="input" value={header.tahun_anggaran} onChange={(e) => setHeaderField('tahun_anggaran', e.target.value)} required />
          </div>
          <div className="field">
            <label className="field-label" htmlFor="tanggal">Tanggal *</label>
            <input id="tanggal" type="date" className="input" value={header.tanggal} onChange={(e) => setHeaderField('tanggal', e.target.value)} required />
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 14 }}>
          <div className="field">
            <label className="field-label" htmlFor="nama_penyusun">Nama Penyusun <span className="muted">(opsional)</span></label>
            <input id="nama_penyusun" className="input" value={header.nama_penyusun} onChange={(e) => setHeaderField('nama_penyusun', e.target.value)} />
          </div>
          <div className="field">
            <label className="field-label" htmlFor="nama_penanggung_jawab">Nama Penanggung Jawab *</label>
            <input id="nama_penanggung_jawab" className="input" value={header.nama_penanggung_jawab} onChange={(e) => setHeaderField('nama_penanggung_jawab', e.target.value)} required />
          </div>
        </div>

        <div style={{ borderTop: '1px solid var(--border)', paddingTop: 16, display: 'flex', flexDirection: 'column', gap: 20 }}>
          {categories.map((cat, catIndex) => (
            <div key={catIndex} style={{ border: '1px solid var(--border)', borderRadius: 10, padding: 14 }}>
              <div style={{ display: 'flex', gap: 10, alignItems: 'center', marginBottom: 10, flexWrap: 'wrap' }}>
                <input
                  className="input"
                  style={{ flex: 1, minWidth: 200, fontWeight: 600 }}
                  value={cat.kategori}
                  onChange={(e) => setCategoryName(catIndex, e.target.value)}
                  placeholder="Nama kategori, mis. Konsumsi"
                  required
                />
                <button type="button" className="btn btn-ghost btn-sm btn-icon" onClick={() => requestRemoveCategory(catIndex)} aria-label="Hapus kategori" style={{ color: 'var(--danger)' }}>
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ width: 14, height: 14 }}><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
                </button>
              </div>

              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.875rem' }}>
                  <thead>
                    <tr style={{ background: 'var(--surface-2)' }}>
                      {['Uraian', 'Volume', 'Satuan', 'Harga Satuan', 'Total', ''].map((h) => (
                        <th key={h} style={{ padding: '0.5rem 0.625rem', textAlign: 'left', fontWeight: 600, whiteSpace: 'nowrap' }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {cat.items.map((item, itemIndex) => {
                      const rowTotal = (Number(item.volume) || 0) * (Number(item.harga_satuan) || 0);
                      return (
                        <tr key={itemIndex} style={{ borderBottom: '1px solid var(--surface-3)' }}>
                          <td style={{ padding: '0.375rem' }}>
                            <input className="input" value={item.uraian} onChange={(e) => updateItem(catIndex, itemIndex, 'uraian', e.target.value)} placeholder="Nama item" required />
                          </td>
                          <td style={{ padding: '0.375rem', width: 100 }}>
                            <input className="input" type="number" min="0.01" step="0.01" value={item.volume} onChange={(e) => updateItem(catIndex, itemIndex, 'volume', e.target.value)} required />
                          </td>
                          <td style={{ padding: '0.375rem', width: 110 }}>
                            <input className="input" value={item.satuan} onChange={(e) => updateItem(catIndex, itemIndex, 'satuan', e.target.value)} placeholder="unit" />
                          </td>
                          <td style={{ padding: '0.375rem', width: 160 }}>
                            <input className="input" type="number" min="0" step="1000" value={item.harga_satuan} onChange={(e) => updateItem(catIndex, itemIndex, 'harga_satuan', e.target.value)} required />
                          </td>
                          <td style={{ padding: '0.375rem', whiteSpace: 'nowrap', fontFamily: 'monospace' }}>{formatRupiah(rowTotal)}</td>
                          <td style={{ padding: '0.375rem' }}>
                            <button type="button" className="btn btn-ghost btn-sm btn-icon" onClick={() => removeItem(catIndex, itemIndex)} disabled={cat.items.length === 1} aria-label="Hapus item" style={{ color: 'var(--danger)' }}>
                              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ width: 14, height: 14 }}><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 10 }}>
                <button type="button" className="btn btn-secondary btn-sm" onClick={() => addItem(catIndex)}>+ Tambah Item</button>
                <div style={{ fontWeight: 700, fontSize: '0.875rem' }}>
                  Subtotal: <span style={{ fontFamily: 'monospace' }}>{formatRupiah(categorySubtotal(cat))}</span>
                </div>
              </div>
            </div>
          ))}

          <div>
            <button type="button" className="btn btn-secondary" onClick={addCategory}>+ Tambah Kategori</button>
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', fontSize: '1.0625rem', fontWeight: 800, borderTop: '2px solid var(--border)', paddingTop: 12 }}>
            Total RAB:&nbsp;<span style={{ fontFamily: 'monospace' }}>{formatRupiah(grandTotal)}</span>
          </div>
        </div>
      </div>

      <div className="modal-foot">
        <Link href={cancelHref} className="btn btn-secondary">Batal</Link>
        <button type="submit" className="btn btn-primary" disabled={saving}>
          {saving ? 'Menyimpan…' : submitLabel}
        </button>
      </div>

      <ConfirmModal
        open={deleteCategoryIndex !== null}
        title="Hapus Kategori"
        message="Kategori ini sudah punya item terisi. Menghapusnya akan menghapus semua item di dalamnya. Lanjutkan?"
        confirmLabel="Ya, Hapus"
        onConfirm={confirmRemoveCategory}
        onCancel={() => setDeleteCategoryIndex(null)}
      />
    </form>
  );
}
```

- [ ] **Step 2: Syntax-check the file**

Run:
```bash
cd "/Volumes/File Home/File Web/simdir" && node -e "
const parser = require('next/dist/compiled/babel/parser');
const fs = require('fs');
const code = fs.readFileSync('app/(dashboard)/rab/RabForm.jsx', 'utf8');
try {
  parser.parse(code, { sourceType: 'module', plugins: ['jsx'] });
  console.log('OK');
} catch (e) {
  console.error('SYNTAX ERROR:', e.message);
  process.exit(1);
}
"
```
Expected: `OK`. (This component has no page route of its own — full manual verification happens in Tasks 6 and 8 once it's actually rendered by the create/edit pages.)

- [ ] **Step 3: Commit**

```bash
cd "/Volumes/File Home/File Web/simdir" && git add "app/(dashboard)/rab/RabForm.jsx" && git commit -m "feat(rab): add shared RabForm component for create/edit"
```

---

## Task 6: Create page — `/rab/create`

**Files:**
- Create: `app/(dashboard)/rab/create/page.jsx`

**Interfaces:**
- Consumes: `RabForm` from Task 5 (exact prop names above). `POST /api/rab` from Task 2. `useToast` from `app/components/Toast.jsx`. `nomorToSlug` from `lib/utils/format.js`.

- [ ] **Step 1: Write `app/(dashboard)/rab/create/page.jsx`**

```jsx
'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useToast } from '@/app/components/Toast';
import { nomorToSlug } from '@/lib/utils/format';
import RabForm from '../RabForm';

const todayStr = () => new Date().toISOString().split('T')[0];

export default function CreateRabPage() {
  const router = useRouter();
  const { error: toastError, success: toastSuccess } = useToast();
  const [saving, setSaving] = useState(false);

  const initialHeader = {
    nama_kegiatan: '',
    tahun_anggaran: new Date().getFullYear(),
    tanggal: todayStr(),
    nama_penyusun: '',
    nama_penanggung_jawab: '',
  };

  const handleSubmit = async (payload) => {
    setSaving(true);
    try {
      const res = await fetch('/api/rab', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      toastSuccess('RAB berhasil dibuat');
      router.push(`/rab/${nomorToSlug(data.nomor_rab)}`);
    } catch (err) {
      toastError('Gagal menyimpan: ' + err.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div>
      <div className="page-header">
        <div className="page-title-wrap">
          <h1 className="page-title">Buat RAB</h1>
          <p className="page-subtitle">Susun rincian anggaran per kategori.</p>
        </div>
        <div className="page-actions">
          <Link href="/rab" className="btn btn-ghost">Batal</Link>
        </div>
      </div>

      <RabForm
        initialHeader={initialHeader}
        initialCategories={null}
        onSubmit={handleSubmit}
        saving={saving}
        submitLabel="Simpan RAB"
        cancelHref="/rab"
      />
    </div>
  );
}
```

- [ ] **Step 2: Syntax-check the file**

Run:
```bash
cd "/Volumes/File Home/File Web/simdir" && node -e "
const parser = require('next/dist/compiled/babel/parser');
const fs = require('fs');
const code = fs.readFileSync('app/(dashboard)/rab/create/page.jsx', 'utf8');
try {
  parser.parse(code, { sourceType: 'module', plugins: ['jsx'] });
  console.log('OK');
} catch (e) {
  console.error('SYNTAX ERROR:', e.message);
  process.exit(1);
}
"
```
Expected: `OK`.

- [ ] **Step 3: Manually verify in the browser**

Navigate to `/rab/create`. Expected:
- Filling in Nama Kegiatan, Tahun Anggaran (defaults to current year), Tanggal (defaults to today), Nama Penanggung Jawab, leaving Nama Penyusun blank, adding an item under the default category, and clicking "Simpan RAB" succeeds and redirects to `/rab/<slug>` (a 404 is expected there until Task 7 exists — confirms the redirect URL is correct).
- Clicking "+ Tambah Kategori" adds a second empty category block; clicking "+ Tambah Item" inside a category adds another item row; the per-category Subtotal and the "Total RAB" at the bottom update live as you type Volume/Harga Satuan.
- Trying to submit with Nama Kegiatan or Nama Penanggung Jawab empty is blocked by the browser's native `required` validation.
- Clicking the trash icon on a category that already has an item filled in opens the ConfirmModal instead of deleting immediately; an empty new category deletes immediately with no modal.

- [ ] **Step 4: Commit**

```bash
cd "/Volumes/File Home/File Web/simdir" && git add "app/(dashboard)/rab/create/page.jsx" && git commit -m "feat(rab): add RAB create page"
```

---

## Task 7: Detail page — `/rab/[id]`

**Files:**
- Create: `app/(dashboard)/rab/[id]/page.jsx`

**Interfaces:**
- Consumes: `GET /api/rab/[id]` and `DELETE /api/rab/[id]` from Task 2. `formatRupiah`, `formatDate` from `lib/utils/format.js`. `useToast`, `ConfirmModal`.

- [ ] **Step 1: Write `app/(dashboard)/rab/[id]/page.jsx`**

```jsx
'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import ConfirmModal from '@/app/components/ConfirmModal';
import { useToast } from '@/app/components/Toast';
import { formatRupiah, formatDate } from '@/lib/utils/format';

export default function RabDetailPage() {
  const params = useParams();
  const router = useRouter();
  const rabId = params?.id;
  const { error: toastError, success: toastSuccess } = useToast();

  const [item, setItem] = useState(null);
  const [loading, setLoading] = useState(true);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(false);

  const fetchItem = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/rab/${rabId}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setItem(data);
    } catch (err) {
      toastError('Gagal memuat RAB: ' + err.message);
    } finally {
      setLoading(false);
    }
  }, [rabId, toastError]);

  useEffect(() => { fetchItem(); }, [fetchItem]);

  const handleDelete = async () => {
    setDeleteLoading(true);
    try {
      const res = await fetch(`/api/rab/${rabId}`, { method: 'DELETE' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      toastSuccess('RAB dihapus');
      router.push('/rab');
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
      <div style={{ textAlign: 'center', padding: '3rem' }}>
        <p>RAB tidak ditemukan</p>
        <Link href="/rab" className="btn btn-primary" style={{ marginTop: '1rem' }}>Kembali ke Daftar RAB</Link>
      </div>
    );
  }

  const categories = Object.values(
    (item.rab_items || []).reduce((acc, it) => {
      if (!acc[it.kategori]) acc[it.kategori] = { kategori: it.kategori, items: [] };
      acc[it.kategori].items.push(it);
      return acc;
    }, {})
  );
  const grandTotal = (item.rab_items || []).reduce((sum, it) => sum + Number(it.total || 0), 0);

  return (
    <div>
      <div className="page-header">
        <div className="page-title-wrap">
          <h1 className="page-title">{item.nomor_rab}</h1>
          <p className="page-subtitle">{item.nama_kegiatan}</p>
        </div>
        <div className="page-actions">
          <Link href="/rab" className="btn btn-ghost">Kembali</Link>
          <Link href={`/rab/${rabId}/print`} className="btn btn-secondary">Cetak</Link>
          <Link href={`/rab/${rabId}/edit`} className="btn btn-secondary">Edit</Link>
          <button className="btn btn-danger" onClick={() => setConfirmOpen(true)}>Hapus</button>
        </div>
      </div>

      <div className="card" style={{ maxWidth: 900 }}>
        <div className="card-body" style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 14 }}>
            <Detail label="Tahun Anggaran" value={String(item.tahun_anggaran)} />
            <Detail label="Tanggal" value={formatDate(item.tanggal)} />
            <Detail label="Nama Penyusun" value={item.nama_penyusun || '-'} />
            <Detail label="Nama Penanggung Jawab" value={item.nama_penanggung_jawab} />
          </div>

          <div style={{ borderTop: '1px solid var(--border)', paddingTop: 16, display: 'flex', flexDirection: 'column', gap: 14 }}>
            {categories.map((cat) => {
              const subtotal = cat.items.reduce((sum, it) => sum + Number(it.total || 0), 0);
              return (
                <div key={cat.kategori} style={{ border: '1px solid var(--border)', borderRadius: 10, padding: 14 }}>
                  <div style={{ fontWeight: 700, marginBottom: 8 }}>{cat.kategori}</div>
                  <div className="table-scroll">
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.875rem' }}>
                      <thead>
                        <tr style={{ background: 'var(--surface-2)' }}>
                          {['Uraian', 'Volume', 'Satuan', 'Harga Satuan', 'Total'].map((h) => (
                            <th key={h} style={{ padding: '0.5rem 0.625rem', textAlign: 'left', fontWeight: 600, whiteSpace: 'nowrap' }}>{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {cat.items.map((it) => (
                          <tr key={it.id} style={{ borderBottom: '1px solid var(--surface-3)' }}>
                            <td style={{ padding: '0.5rem 0.625rem' }}>{it.uraian}</td>
                            <td style={{ padding: '0.5rem 0.625rem' }}>{it.volume}</td>
                            <td style={{ padding: '0.5rem 0.625rem' }}>{it.satuan || '-'}</td>
                            <td style={{ padding: '0.5rem 0.625rem', fontFamily: 'monospace' }}>{formatRupiah(it.harga_satuan)}</td>
                            <td style={{ padding: '0.5rem 0.625rem', fontFamily: 'monospace' }}>{formatRupiah(it.total)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  <div style={{ textAlign: 'right', fontWeight: 700, marginTop: 8, fontSize: '0.875rem' }}>
                    Subtotal: <span style={{ fontFamily: 'monospace' }}>{formatRupiah(subtotal)}</span>
                  </div>
                </div>
              );
            })}

            <div style={{ display: 'flex', justifyContent: 'flex-end', fontSize: '1.0625rem', fontWeight: 800, borderTop: '2px solid var(--border)', paddingTop: 12 }}>
              Total RAB:&nbsp;<span style={{ fontFamily: 'monospace' }}>{formatRupiah(grandTotal)}</span>
            </div>
          </div>
        </div>
      </div>

      <ConfirmModal
        open={confirmOpen}
        title="Hapus RAB"
        message={<>Yakin ingin menghapus <strong>{item.nomor_rab}</strong>? Tindakan ini tidak dapat dibatalkan.</>}
        confirmLabel="Ya, Hapus"
        busy={deleteLoading}
        onConfirm={handleDelete}
        onCancel={() => setConfirmOpen(false)}
      />
    </div>
  );
}

function Detail({ label, value }) {
  return (
    <div>
      <div className="muted" style={{ fontSize: '0.75rem', marginBottom: 2 }}>{label}</div>
      <div style={{ fontSize: '0.9375rem', color: 'var(--text)' }}>{value}</div>
    </div>
  );
}
```

- [ ] **Step 2: Syntax-check the file**

Run:
```bash
cd "/Volumes/File Home/File Web/simdir" && node -e "
const parser = require('next/dist/compiled/babel/parser');
const fs = require('fs');
const code = fs.readFileSync('app/(dashboard)/rab/[id]/page.jsx', 'utf8');
try {
  parser.parse(code, { sourceType: 'module', plugins: ['jsx'] });
  console.log('OK');
} catch (e) {
  console.error('SYNTAX ERROR:', e.message);
  process.exit(1);
}
"
```
Expected: `OK`.

- [ ] **Step 3: Manually verify in the browser**

Navigate to `/rab/<slug>` for the RAB created earlier (list page's Detail link, or the redirect target from Task 6's create test). Expected: header info, one category block ("Konsumsi") with the "Snack" item and its total, category subtotal, and grand total all render correctly; "Kembali" returns to `/rab`; "Hapus" opens the ConfirmModal and, on confirm, deletes the RAB and redirects to `/rab` where it no longer appears.

- [ ] **Step 4: Commit**

```bash
cd "/Volumes/File Home/File Web/simdir" && git add "app/(dashboard)/rab/[id]/page.jsx" && git commit -m "feat(rab): add RAB detail page"
```

---

## Task 8: Edit page — `/rab/[id]/edit`

**Files:**
- Create: `app/(dashboard)/rab/[id]/edit/page.jsx`

**Interfaces:**
- Consumes: `RabForm` from Task 5. `GET /api/rab/[id]` and `PUT /api/rab/[id]` from Task 2.

- [ ] **Step 1: Write `app/(dashboard)/rab/[id]/edit/page.jsx`**

```jsx
'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { useToast } from '@/app/components/Toast';
import RabForm from '../../RabForm';

function groupByKategori(rabItems) {
  const byKategori = (rabItems || []).reduce((acc, it) => {
    if (!acc[it.kategori]) acc[it.kategori] = { kategori: it.kategori, items: [] };
    acc[it.kategori].items.push({
      uraian: it.uraian,
      volume: String(it.volume),
      satuan: it.satuan || '',
      harga_satuan: String(it.harga_satuan),
    });
    return acc;
  }, {});
  return Object.values(byKategori);
}

export default function EditRabPage() {
  const params = useParams();
  const router = useRouter();
  const rabId = params?.id;
  const { error: toastError, success: toastSuccess } = useToast();

  const [fetching, setFetching] = useState(true);
  const [saving, setSaving] = useState(false);
  const [initialHeader, setInitialHeader] = useState(null);
  const [initialCategories, setInitialCategories] = useState(null);

  const fetchItem = useCallback(async () => {
    setFetching(true);
    try {
      const res = await fetch(`/api/rab/${rabId}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setInitialHeader({
        nama_kegiatan: data.nama_kegiatan || '',
        tahun_anggaran: data.tahun_anggaran || new Date().getFullYear(),
        tanggal: data.tanggal || '',
        nama_penyusun: data.nama_penyusun || '',
        nama_penanggung_jawab: data.nama_penanggung_jawab || '',
      });
      setInitialCategories(groupByKategori(data.rab_items));
    } catch (err) {
      toastError('Gagal memuat RAB: ' + err.message);
    } finally {
      setFetching(false);
    }
  }, [rabId, toastError]);

  useEffect(() => { fetchItem(); }, [fetchItem]);

  const handleSubmit = async (payload) => {
    setSaving(true);
    try {
      const res = await fetch(`/api/rab/${rabId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      toastSuccess('RAB berhasil diperbarui');
      router.push(`/rab/${rabId}`);
    } catch (err) {
      toastError('Gagal menyimpan: ' + err.message);
    } finally {
      setSaving(false);
    }
  };

  if (fetching) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '60vh' }}>
        <div className="spinner" style={{ width: 40, height: 40 }} />
      </div>
    );
  }

  if (!initialHeader) {
    return (
      <div style={{ textAlign: 'center', padding: '3rem' }}>
        <p>RAB tidak ditemukan</p>
        <Link href="/rab" className="btn btn-primary" style={{ marginTop: '1rem' }}>Kembali ke Daftar RAB</Link>
      </div>
    );
  }

  return (
    <div>
      <div className="page-header">
        <div className="page-title-wrap">
          <h1 className="page-title">Edit RAB</h1>
          <p className="page-subtitle">Ubah data RAB yang sudah ada</p>
        </div>
        <div className="page-actions">
          <Link href={`/rab/${rabId}`} className="btn btn-ghost">Batal</Link>
        </div>
      </div>

      <RabForm
        initialHeader={initialHeader}
        initialCategories={initialCategories}
        onSubmit={handleSubmit}
        saving={saving}
        submitLabel="Simpan Perubahan"
        cancelHref={`/rab/${rabId}`}
      />
    </div>
  );
}
```

- [ ] **Step 2: Syntax-check the file**

Run:
```bash
cd "/Volumes/File Home/File Web/simdir" && node -e "
const parser = require('next/dist/compiled/babel/parser');
const fs = require('fs');
const code = fs.readFileSync('app/(dashboard)/rab/[id]/edit/page.jsx', 'utf8');
try {
  parser.parse(code, { sourceType: 'module', plugins: ['jsx'] });
  console.log('OK');
} catch (e) {
  console.error('SYNTAX ERROR:', e.message);
  process.exit(1);
}
"
```
Expected: `OK`.

- [ ] **Step 3: Manually verify in the browser**

Navigate to `/rab/<slug>/edit` for an existing RAB. Expected: form pre-fills with the existing header fields and one category block ("Konsumsi") containing the "Snack" item at its existing values; adding a second category and item, then clicking "Simpan Perubahan", redirects to `/rab/<slug>` and the detail page now shows both categories with correct subtotals and grand total; reloading `/rab/<slug>/edit` again shows the update persisted (confirms the PUT route's replace-all item logic worked, not just an in-memory illusion).

- [ ] **Step 4: Commit**

```bash
cd "/Volumes/File Home/File Web/simdir" && git add "app/(dashboard)/rab/[id]/edit/page.jsx" && git commit -m "feat(rab): add RAB edit page"
```

---

## Task 9: Print page — `/rab/[id]/print`

**Files:**
- Create: `app/(dashboard)/rab/[id]/print/page.jsx`

**Interfaces:**
- Consumes: `GET /api/rab/[id]` from Task 2. `GET /api/app-settings` (existing, public). `formatRupiah`, `formatDate` from `lib/utils/format.js`. Existing global CSS classes `invoice-print-scroll`/`invoice-print-container`/`no-print` (already defined in `app/globals.css` from the E-Invoice/E-Kwitansi print pages — do not redefine them).

- [ ] **Step 1: Write `app/(dashboard)/rab/[id]/print/page.jsx`**

```jsx
'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { formatRupiah, formatDate } from '@/lib/utils/format';

export default function PrintRabPage() {
  const params = useParams();
  const rabId = params?.id;

  const [item, setItem] = useState(null);
  const [loading, setLoading] = useState(true);
  const [logo, setLogo] = useState(null);
  const [brandName, setBrandName] = useState('Direktorat Unesa Science Center');
  const [showPenyusun, setShowPenyusun] = useState(true);

  useEffect(() => {
    fetch('/api/app-settings')
      .then((res) => res.json())
      .then((data) => {
        if (data.logo_url) setLogo(data.logo_url);
        if (data.brand_name) setBrandName(data.brand_name);
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    const stored = localStorage.getItem('simdir_rab_show_penyusun');
    if (stored !== null) setShowPenyusun(stored === 'true');
  }, []);

  useEffect(() => {
    localStorage.setItem('simdir_rab_show_penyusun', showPenyusun);
  }, [showPenyusun]);

  const fetchItem = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/rab/${rabId}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setItem(data);
    } catch (err) {
      console.error('Error fetching RAB:', err);
    } finally {
      setLoading(false);
    }
  }, [rabId]);

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
        <p>RAB tidak ditemukan</p>
        <Link href="/rab" className="btn btn-primary" style={{ marginTop: '1rem' }}>Kembali ke Daftar RAB</Link>
      </div>
    );
  }

  const categories = Object.values(
    (item.rab_items || []).reduce((acc, it) => {
      if (!acc[it.kategori]) acc[it.kategori] = { kategori: it.kategori, items: [] };
      acc[it.kategori].items.push(it);
      return acc;
    }, {})
  );
  const grandTotal = (item.rab_items || []).reduce((sum, it) => sum + Number(it.total || 0), 0);

  return (
    <div>
      {/* Print Controls */}
      <div className="no-print" style={{
        position: 'sticky', top: 0, left: 0, right: 0, padding: '1rem', background: 'white',
        borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between',
        alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap', zIndex: 100, boxShadow: '0 2px 10px rgba(0,0,0,0.1)',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <Link href={`/rab/${rabId}`} className="btn btn-ghost">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ width: 16, height: 16 }}>
              <path d="M19 12H5M12 19l-7-7 7-7"/>
            </svg>
            Kembali
          </Link>
          <h1 style={{ margin: 0, fontSize: '1.125rem' }}>Preview RAB</h1>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', fontSize: '0.875rem', color: 'var(--text-2)' }}>
            <input
              type="checkbox"
              checked={showPenyusun}
              onChange={(e) => setShowPenyusun(e.target.checked)}
              style={{ width: 16, height: 16, cursor: 'pointer' }}
            />
            Tampilkan Nama Penyusun
          </label>
          <button className="btn btn-primary" onClick={() => window.print()}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ width: 16, height: 16 }}>
              <polyline points="6 9 6 2 18 2 18 9"/><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/>
              <rect x="6" y="14" width="12" height="8"/>
            </svg>
            Cetak / Simpan PDF
          </button>
        </div>
      </div>

      {/* RAB Content */}
      <div className="invoice-print-scroll" style={{ overflowX: 'auto' }}>
        <div className="invoice-print-container" style={{
          maxWidth: '210mm', minHeight: '297mm', margin: '0 auto', padding: '20mm',
          background: 'white', boxSizing: 'border-box', position: 'relative', color: '#0f172a',
        }}>
          {/* Header */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '1.5rem', marginBottom: '2rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              {logo && <img src={logo} alt={brandName} style={{ height: 56, width: 'auto', maxWidth: 140, objectFit: 'contain' }} />}
              <div style={{ fontSize: '0.8125rem', fontWeight: 700, maxWidth: 260 }}>{brandName}</div>
            </div>
            <div style={{ textAlign: 'right' }}>
              <h1 style={{ fontSize: '1.75rem', fontWeight: 900, margin: 0 }}>RENCANA ANGGARAN BIAYA</h1>
              <div style={{ fontSize: '0.8125rem', fontWeight: 700, marginTop: 6 }}>NO: {item.nomor_rab}</div>
              <div style={{ fontSize: '0.8125rem', color: '#64748b' }}>{formatDate(item.tanggal)}</div>
            </div>
          </div>

          {/* Body */}
          <FieldRow label="Nama Kegiatan"><div style={{ fontWeight: 700 }}>{item.nama_kegiatan}</div></FieldRow>
          <FieldRow label="Tahun Anggaran"><div>{item.tahun_anggaran}</div></FieldRow>

          <div style={{ marginTop: '1.5rem', display: 'flex', flexDirection: 'column', gap: 16 }}>
            {categories.map((cat) => {
              const subtotal = cat.items.reduce((sum, it) => sum + Number(it.total || 0), 0);
              return (
                <div key={cat.kategori}>
                  <div style={{ fontWeight: 800, fontSize: '0.875rem', marginBottom: 6 }}>{cat.kategori}</div>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.8125rem' }}>
                    <thead>
                      <tr style={{ borderBottom: '2px solid #0f172a' }}>
                        <th style={{ padding: '4px 6px', textAlign: 'left' }}>Uraian</th>
                        <th style={{ padding: '4px 6px', textAlign: 'right' }}>Volume</th>
                        <th style={{ padding: '4px 6px', textAlign: 'left' }}>Satuan</th>
                        <th style={{ padding: '4px 6px', textAlign: 'right' }}>Harga Satuan</th>
                        <th style={{ padding: '4px 6px', textAlign: 'right' }}>Total</th>
                      </tr>
                    </thead>
                    <tbody>
                      {cat.items.map((it) => (
                        <tr key={it.id} style={{ borderBottom: '1px solid #e2e8f0' }}>
                          <td style={{ padding: '4px 6px' }}>{it.uraian}</td>
                          <td style={{ padding: '4px 6px', textAlign: 'right' }}>{it.volume}</td>
                          <td style={{ padding: '4px 6px' }}>{it.satuan || '-'}</td>
                          <td style={{ padding: '4px 6px', textAlign: 'right', fontFamily: 'monospace' }}>{formatRupiah(it.harga_satuan)}</td>
                          <td style={{ padding: '4px 6px', textAlign: 'right', fontFamily: 'monospace' }}>{formatRupiah(it.total)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  <div style={{ textAlign: 'right', fontWeight: 700, fontSize: '0.8125rem', marginTop: 4 }}>
                    Subtotal {cat.kategori}: {formatRupiah(subtotal)}
                  </div>
                </div>
              );
            })}
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', fontSize: '1.0625rem', fontWeight: 900, borderTop: '2px solid #0f172a', marginTop: 16, paddingTop: 10 }}>
            TOTAL: {formatRupiah(grandTotal)}
          </div>

          {/* Signatures */}
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '3rem', marginTop: '3.5rem' }}>
            {showPenyusun && item.nama_penyusun && (
              <div style={{ textAlign: 'center', width: '220px' }}>
                <div style={{ fontSize: '0.8125rem', color: '#475569', marginBottom: '4.5rem' }}>Penyusun,</div>
                <div style={{ fontWeight: 700 }}>({item.nama_penyusun})</div>
              </div>
            )}
            <div style={{ textAlign: 'center', width: '220px' }}>
              <div style={{ fontSize: '0.8125rem', color: '#475569', marginBottom: '4.5rem' }}>Penanggung Jawab,</div>
              <div style={{ fontWeight: 700 }}>({item.nama_penanggung_jawab})</div>
            </div>
          </div>

          {/* Footer */}
          <div style={{ marginTop: '3rem', paddingTop: '1rem', borderTop: '1px solid #e2e8f0', textAlign: 'center', fontSize: '0.75rem', color: '#94a3b8' }}>
            Dokumen ini digenerate secara elektronik melalui sistem SIMDIR RAB
          </div>
        </div>
      </div>

      {/* Print Styles */}
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

function FieldRow({ label, children }) {
  return (
    <div style={{ display: 'flex', gap: '1.5rem', paddingBottom: '0.625rem', marginBottom: '0.625rem', borderBottom: '1px solid #e2e8f0' }}>
      <div style={{ width: '170px', flexShrink: 0, fontWeight: 700, fontSize: '0.875rem' }}>{label}</div>
      <div style={{ flex: 1, fontSize: '0.875rem', lineHeight: 1.5 }}>{children}</div>
    </div>
  );
}
```

- [ ] **Step 2: Syntax-check the file**

Run:
```bash
cd "/Volumes/File Home/File Web/simdir" && node -e "
const parser = require('next/dist/compiled/babel/parser');
const fs = require('fs');
const code = fs.readFileSync('app/(dashboard)/rab/[id]/print/page.jsx', 'utf8');
try {
  parser.parse(code, { sourceType: 'module', plugins: ['jsx'] });
  console.log('OK');
} catch (e) {
  console.error('SYNTAX ERROR:', e.message);
  process.exit(1);
}
"
```
Expected: `OK`.

- [ ] **Step 3: Manually verify in the browser**

Navigate to `/rab/<slug>/print`. Expected:
- Branding logo + name appear in the header (fetched live from `/api/app-settings`), title "RENCANA ANGGARAN BIAYA", nomor and tanggal on the right.
- Body shows Nama Kegiatan, Tahun Anggaran, each category with its item table and subtotal, and the grand total.
- The "Tampilkan Nama Penyusun" checkbox is checked by default; unchecking it hides the Penyusun signature block (Penanggung Jawab block always stays visible); reloading the page preserves the last-chosen checkbox state (via `localStorage`).
- Resize the browser to a narrow (phone-width) viewport: the document scrolls horizontally inside its own container instead of the whole page overflowing.
- Use the browser's print preview (Cmd/Ctrl+P) and confirm the `.no-print` controls bar and checkbox are hidden in the preview, and the document fills the page without the on-screen scroll wrapper affecting layout.

- [ ] **Step 4: Commit**

```bash
cd "/Volumes/File Home/File Web/simdir" && git add "app/(dashboard)/rab/[id]/print/page.jsx" && git commit -m "feat(rab): add RAB print page"
```

---

## Final Check

After Task 9, re-run the full syntax check across every file this plan touched, in one pass, to catch anything that regressed from a later edit to an earlier file (e.g. Task 3's `navConfig.jsx`/`middleware.js` edits):

```bash
cd "/Volumes/File Home/File Web/simdir" && for f in \
  "app/api/rab/route.js" \
  "app/api/rab/[id]/route.js" \
  "middleware.js" \
  "app/components/navConfig.jsx" \
  "app/(dashboard)/rab/page.jsx" \
  "app/(dashboard)/rab/RabForm.jsx" \
  "app/(dashboard)/rab/create/page.jsx" \
  "app/(dashboard)/rab/[id]/page.jsx" \
  "app/(dashboard)/rab/[id]/edit/page.jsx" \
  "app/(dashboard)/rab/[id]/print/page.jsx" \
; do
node -e "
const parser = require('next/dist/compiled/babel/parser');
const fs = require('fs');
const code = fs.readFileSync('$f', 'utf8');
try {
  parser.parse(code, { sourceType: 'module', plugins: ['jsx'] });
  console.log('$f OK');
} catch (e) {
  console.error('$f SYNTAX ERROR:', e.message);
  process.exit(1);
}
"
done
```
Expected: every file prints `OK`.

Then do one final end-to-end manual walkthrough as a super_admin: create a RAB with 2 categories and 3 total items → view it on the detail page → edit it (add a 4th item, change the nama_kegiatan) → confirm the detail page reflects the edit → print it and confirm the totals on the printed page match the detail page → delete it from the list page and confirm it's gone.
