# Payment Methods (QR & VA) for E-Invoice — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let staff maintain a library of QR (QRIS) and Virtual Account payment methods, attach one to an invoice, have it auto-append a note to Catatan, and print reliably as a dedicated "Info Pembayaran" block.

**Architecture:** One new Postgres table (`payment_methods`) + one new nullable FK column on `invoices`, exposed through the existing `invoice_summary` view. A service-role-backed Next.js API route pair (`/api/payment-methods`, `/api/payment-methods/[id]`) mirrors the existing `/api/pimpinan` pattern. A new `/pengaturan/metode-pembayaran` page manages the library (list/add/edit/toggle/delete). The four existing E-Invoice pages (create, edit, detail, print) each get a small, additive change to read/write `payment_method_id` and render the attached method.

**Tech Stack:** Next.js 15 App Router, React 19, Supabase (Postgres + Storage), plain inline-style JSX (matches existing E-Invoice pages) / `className` + global CSS (matches existing Pengaturan pages).

## Global Constraints

- Design source of truth: `docs/superpowers/specs/2026-09-14-payment-methods-einvoice-design.md`. Follow it exactly; if a task here seems to contradict it, the spec wins and the task must be fixed.
- **No automated test suite exists in this project** (`package.json` has no test runner, no `*.test.js` files anywhere). Every other feature in this codebase (pimpinan, branding, kwitansi, etc.) is verified by running the dev server and exercising routes with `curl` / the browser — this plan follows the same convention. "Write the failing test" steps are replaced with "make the request and check the response" steps.
- Migrations in this project are **not** run by any CLI — every `supabase/migrations/*.sql` file carries a header saying it's pasted into the Supabase Dashboard → SQL Editor by hand, because there is no `DATABASE_URL`/Postgres connection string available to scripts (only `NEXT_PUBLIC_SUPABASE_URL` + `SUPABASE_SERVICE_ROLE_KEY`, which are REST/Storage credentials, not a Postgres connection). Task 1 ends with a manual step the human operator must perform before any later task can be exercised end-to-end.
- QR image upload allow-list: `image/jpeg`, `image/png`, `image/webp`, max 2MB — same limits as the existing logo upload in `app/api/app-settings/route.js`.
- Storage: reuse the existing public `app-settings` Supabase Storage bucket (already used for the instansi logo) under a `payment-qr/` path prefix. Do not create a new bucket.
- `/api/payment-methods*` is `super_admin`-only for every HTTP method (list included) — E-Invoice itself is already `super_admin`-only in `navConfig.jsx`, so there's no other role that needs read access.
- Dev server: `npm run dev` (binds `127.0.0.1:3000`). Start it once before Task 3 and leave it running through Task 10; if a task changes a file that requires a restart (it shouldn't — Next dev hot-reloads), say so explicitly in that task.

---

## File Structure

| File | Status | Responsibility |
|---|---|---|
| `supabase/migrations/20260914000000_create_payment_methods.sql` | Create | `payment_methods` table, trigger, RLS policy, `invoices.payment_method_id` column, redefined `invoice_summary` view |
| `middleware.js` | Modify | Role-gate `/api/payment-methods*` to `super_admin` |
| `app/api/payment-methods/route.js` | Create | `GET` (list), `POST` (create QR or VA entry) |
| `app/api/payment-methods/[id]/route.js` | Create | `PUT` (update), `DELETE` (remove + cleanup storage) |
| `app/components/navConfig.jsx` | Modify | New nav item + icon + sidebar order entry |
| `app/(dashboard)/pengaturan/metode-pembayaran/page.jsx` | Create | Library management UI (list, add/edit modal, toggle, delete) |
| `app/(dashboard)/e-invoice/create/page.jsx` | Modify | Payment-method dropdown, auto-note, preview, include in insert |
| `app/(dashboard)/e-invoice/[id]/edit/page.jsx` | Modify | Same, plus load existing selection |
| `app/(dashboard)/e-invoice/[id]/page.jsx` | Modify | Read-only "Metode Pembayaran" info card |
| `app/(dashboard)/e-invoice/[id]/print/page.jsx` | Modify | "Info Pembayaran" print block (QR image or VA text) |

---

### Task 1: Database migration

**Files:**
- Create: `supabase/migrations/20260914000000_create_payment_methods.sql`

**Interfaces:**
- Produces: table `payment_methods(id uuid, type text, label text, image_url text, bank_name text, va_number text, is_active boolean, created_at timestamptz, updated_at timestamptz)`; column `invoices.payment_method_id uuid`; view `invoice_summary` now also exposes `payment_method_id`, `payment_method_type`, `payment_method_label`, `payment_method_qr_url`, `payment_method_bank_name`, `payment_method_va_number`. All later tasks read/write these exact names.

- [ ] **Step 1: Write the migration file**

```sql
-- ============================================
-- Metode Pembayaran (QR & Virtual Account) — daftar metode pembayaran
-- yang bisa dipilih saat membuat/edit invoice di E-Invoice. Dikelola dari
-- Pengaturan > Metode Pembayaran (/api/payment-methods). Referensi:
-- docs/superpowers/specs/2026-09-14-payment-methods-einvoice-design.md
-- Jalankan script ini di Supabase SQL Editor
-- Supabase Dashboard → SQL Editor → New query
-- ============================================

CREATE TABLE IF NOT EXISTS payment_methods (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  type        varchar(10) NOT NULL CHECK (type IN ('qr', 'va')),
  label       text NOT NULL,
  image_url   text,        -- diisi kalau type = 'qr'
  bank_name   text,        -- diisi kalau type = 'va'
  va_number   text,        -- diisi kalau type = 'va'
  is_active   boolean NOT NULL DEFAULT true,
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now()
);

CREATE OR REPLACE FUNCTION set_payment_methods_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at := NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_payment_methods_updated_at ON payment_methods;
CREATE TRIGGER trg_payment_methods_updated_at
  BEFORE UPDATE ON payment_methods
  FOR EACH ROW
  EXECUTE FUNCTION set_payment_methods_updated_at();

-- RLS — hanya service role (dipakai app/api/payment-methods/*) yang boleh
-- baca/tulis. Akses per-role diatur di middleware.js (super_admin saja).
ALTER TABLE payment_methods ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Service role manage payment_methods" ON payment_methods;
CREATE POLICY "Service role manage payment_methods"
  ON payment_methods FOR ALL
  USING (auth.role() = 'service_role');

-- Kolom baru di invoices: metode pembayaran yang dipilih untuk invoice ini
-- (opsional). ON DELETE SET NULL — menghapus metode pembayaran tidak
-- pernah merusak invoice lama, cuma menghilangkan tampilannya saat dicetak
-- ulang.
ALTER TABLE invoices
  ADD COLUMN IF NOT EXISTS payment_method_id uuid REFERENCES payment_methods(id) ON DELETE SET NULL;

-- Redefinisi penuh invoice_summary (mengikuti definisi terakhir di
-- 20260825010000_add_invoice_created_by_name.sql) + kolom metode
-- pembayaran. Semua caller yang sudah ada pakai `select('*')` jadi tidak
-- perlu perubahan query di sisi aplikasi.
CREATE OR REPLACE VIEW invoice_summary AS
SELECT
    i.id,
    i.nomor_invoice,
    i.tanggal_invoice,
    i.tanggal_jatuh_tempo,
    i.status,
    i.subtotal,
    i.ppn_persen,
    i.ppn_nilai,
    i.diskon_nilai,
    i.biaya_pengiriman,
    i.total,
    i.catatan,
    c.id AS customer_id,
    c.kode_pelanggan,
    c.nama_pelanggan,
    c.email AS customer_email,
    c.telepon AS customer_telepon,
    c.alamat AS customer_alamat,
    c.npwp AS customer_npwp,
    (SELECT COALESCE(SUM(jumlah), 0) FROM invoice_payments WHERE invoice_id = i.id) AS total_dibayar,
    (i.total - (SELECT COALESCE(SUM(jumlah), 0) FROM invoice_payments WHERE invoice_id = i.id)) AS sisa_pembayaran,
    CASE
        WHEN i.status = 'lunas' THEN 0
        WHEN i.tanggal_jatuh_tempo < CURRENT_DATE THEN CURRENT_DATE - i.tanggal_jatuh_tempo
        ELSE 0
    END AS hari_terlambat,
    i.created_by_name,
    i.payment_method_id,
    pm.type AS payment_method_type,
    pm.label AS payment_method_label,
    pm.image_url AS payment_method_qr_url,
    pm.bank_name AS payment_method_bank_name,
    pm.va_number AS payment_method_va_number
FROM invoices i
JOIN customers c ON i.customer_id = c.id
LEFT JOIN payment_methods pm ON pm.id = i.payment_method_id;
```

- [ ] **Step 2: Run it in Supabase**

Open the Supabase Dashboard for this project → SQL Editor → New query, paste the full file content, and run it. Confirm it reports success with no errors (in particular, confirm `invoices` already has a `customer_id`/`catatan` etc. — if the `ADD COLUMN IF NOT EXISTS` or `CREATE OR REPLACE VIEW` errors, stop and report the exact error before continuing to any later task).

- [ ] **Step 3: Verify with a read-only query**

Run this in the same SQL Editor:

```sql
SELECT column_name FROM information_schema.columns
WHERE table_name = 'invoice_summary' AND column_name LIKE 'payment_method%'
ORDER BY column_name;
```

Expected: 6 rows — `payment_method_bank_name`, `payment_method_id`, `payment_method_label`, `payment_method_qr_url`, `payment_method_type`, `payment_method_va_number`.

- [ ] **Step 4: Commit**

```bash
git add supabase/migrations/20260914000000_create_payment_methods.sql
git commit -m "$(cat <<'EOF'
feat(db): add payment_methods table and invoice_summary QR/VA columns

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
EOF
)"
```

---

### Task 2: Middleware role gate

**Files:**
- Modify: `middleware.js`

**Interfaces:**
- Consumes: `ROLE_RULES` array (already defined, `{ prefix: '/pengaturan', roles: ['super_admin'] }` entry exists).
- Produces: `PAYMENT_METHODS_API_ROLES` constant used by Task 3/4's routes being reachable only to `super_admin`.

- [ ] **Step 1: Add the roles constant**

Find this existing block (search for `PIMPINAN_DATA_WRITE_ROLES`):

```js
const PIMPINAN_DATA_READ_ROLES = ROLE_RULES.find((r) => r.prefix === '/kelola-agenda').roles
const PIMPINAN_DATA_WRITE_ROLES = ROLE_RULES.find((r) => r.prefix === '/pengaturan').roles
```

Add immediately after it:

```js

// Endpoint /api/payment-methods (daftar QR/VA yang bisa dipilih saat buat
// invoice) lewat service-role key. Semua method (termasuk GET) dibatasi
// super_admin saja — /e-invoice sendiri sudah super_admin-only di
// navConfig.jsx, jadi tidak ada role lain yang butuh baca daftar ini.
const PAYMENT_METHODS_API_ROLES = ROLE_RULES.find((r) => r.prefix === '/pengaturan').roles
```

- [ ] **Step 2: Add the gate**

Find this existing block (search for `pathname.startsWith('/api/pimpinan')`):

```js
  // GET /api/pimpinan → siapa pun yang bisa mengisi form agenda/memo.
  // Non-GET (kelola dari /pengaturan/pimpinan) → super_admin saja.
  if (pathname.startsWith('/api/pimpinan')) {
    const allowed = request.method === 'GET' ? PIMPINAN_DATA_READ_ROLES : PIMPINAN_DATA_WRITE_ROLES
    if (!allowed.includes(role)) return withSecurityHeaders(forbiddenResponse(request, pathname))
  }
```

Add immediately after it:

```js

  // /api/payment-methods → super_admin saja, semua method.
  if (pathname.startsWith('/api/payment-methods') && !PAYMENT_METHODS_API_ROLES.includes(role)) {
    return withSecurityHeaders(forbiddenResponse(request, pathname))
  }
```

- [ ] **Step 3: Verify it compiles**

Run: `npm run dev` (leave it running in the background for the rest of this plan; check the terminal output for compile errors on `middleware.js` and Ctrl+C only if you see one, fix, and restart).
Expected: `✓ Ready` with no error about `middleware.js`.

- [ ] **Step 4: Commit**

```bash
git add middleware.js
git commit -m "$(cat <<'EOF'
feat(auth): gate /api/payment-methods to super_admin

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
EOF
)"
```

---

### Task 3: API route — list & create

**Files:**
- Create: `app/api/payment-methods/route.js`

**Interfaces:**
- Consumes: `compressImage(buffer, mimeType, { maxWidth, quality })` from `lib/image.js` (returns `Promise<Buffer>`); Supabase Storage bucket `app-settings`.
- Produces: `GET /api/payment-methods` → `200` JSON array of `{ id, type, label, image_url, bank_name, va_number, is_active, created_at }`. `POST /api/payment-methods` (multipart form: `type`, `label`, and either `image` file [type=qr] or `bank_name`+`va_number` [type=va]) → `201` JSON of the created row, or `400`/`500` `{ error: string }`.

- [ ] **Step 1: Write the route**

```js
import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { compressImage } from '@/lib/image'

const BUCKET = 'app-settings'
const ALLOWED_QR_TYPES = ['image/jpeg', 'image/png', 'image/webp']
const MAX_QR_SIZE = 2 * 1024 * 1024
const SAFE_COLUMNS = 'id, type, label, image_url, bank_name, va_number, is_active, created_at'

function getServiceClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  )
}

function slugifyLabel(label) {
  return label.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '').slice(0, 40) || 'metode'
}

// GET /api/payment-methods — daftar semua metode pembayaran (QR & VA).
// Dilindungi middleware: super_admin saja.
export async function GET() {
  try {
    const supabase = getServiceClient()
    const { data, error } = await supabase
      .from('payment_methods')
      .select(SAFE_COLUMNS)
      .order('label', { ascending: true })
    if (error) throw error
    return NextResponse.json(data || [])
  } catch (err) {
    return NextResponse.json({ error: err.message || 'Gagal memuat data' }, { status: 500 })
  }
}

// POST /api/payment-methods — tambah metode baru (tipe 'qr' atau 'va').
// multipart/form-data karena tipe 'qr' butuh upload file gambar.
export async function POST(request) {
  try {
    const formData = await request.formData()
    const type = (formData.get('type') || '').toString().trim()
    const label = (formData.get('label') || '').toString().trim()

    if (!['qr', 'va'].includes(type)) {
      return NextResponse.json({ error: 'Tipe metode pembayaran tidak valid' }, { status: 400 })
    }
    if (!label) {
      return NextResponse.json({ error: 'Label wajib diisi' }, { status: 400 })
    }

    const supabase = getServiceClient()
    const record = { type, label, is_active: true }

    if (type === 'qr') {
      const imageFile = formData.get('image')
      if (!imageFile || !(imageFile instanceof Blob) || imageFile.size === 0) {
        return NextResponse.json({ error: 'Gambar QR wajib diupload' }, { status: 400 })
      }
      if (!ALLOWED_QR_TYPES.includes(imageFile.type)) {
        return NextResponse.json({ error: 'Format gambar harus JPG, PNG, atau WebP' }, { status: 400 })
      }
      if (imageFile.size > MAX_QR_SIZE) {
        return NextResponse.json({ error: 'Ukuran gambar maksimal 2MB' }, { status: 400 })
      }

      const ext = (imageFile.name?.split('.').pop() || 'png').toLowerCase().replace(/[^a-z0-9]/g, '')
      const path = `payment-qr/${Date.now()}-${slugifyLabel(label)}.${ext}`
      const arrayBuffer = await imageFile.arrayBuffer()
      const compressed = await compressImage(Buffer.from(arrayBuffer), imageFile.type, { maxWidth: 640, quality: 90 })
      const { error: uploadError } = await supabase.storage
        .from(BUCKET)
        .upload(path, compressed, { contentType: imageFile.type, upsert: false })
      if (uploadError) throw uploadError

      const { data: { publicUrl } } = supabase.storage.from(BUCKET).getPublicUrl(path)
      record.image_url = publicUrl
    } else {
      const bankName = (formData.get('bank_name') || '').toString().trim()
      const vaNumber = (formData.get('va_number') || '').toString().trim()
      if (!bankName || !vaNumber) {
        return NextResponse.json({ error: 'Nama bank dan nomor VA wajib diisi' }, { status: 400 })
      }
      record.bank_name = bankName
      record.va_number = vaNumber
    }

    const { data, error } = await supabase
      .from('payment_methods')
      .insert(record)
      .select(SAFE_COLUMNS)
      .single()
    if (error) throw error
    return NextResponse.json(data, { status: 201 })
  } catch (err) {
    return NextResponse.json({ error: err.message || 'Gagal menyimpan metode pembayaran' }, { status: 500 })
  }
}
```

- [ ] **Step 2: Verify GET with curl**

With `npm run dev` running and after logging into the app in a browser (to get a `super_admin` session cookie), copy the `Cookie` header from a browser devtools request to any `/api/*` call and use it below — or simpler: verify via the browser directly at `http://127.0.0.1:3000/api/payment-methods` while logged in as `super_admin`.

Expected: `[]` (empty JSON array — the table has no rows yet).

Run: open `http://127.0.0.1:3000/api/payment-methods` in the same browser session you're logged into the app with.
Expected response body: `[]`

- [ ] **Step 3: Verify POST (va) via the browser console**

While on any page of the logged-in app (so cookies are sent automatically), open the browser devtools console and run:

```js
const fd = new FormData();
fd.append('type', 'va');
fd.append('label', 'Test VA');
fd.append('bank_name', 'BNI');
fd.append('va_number', '1234567890');
fetch('/api/payment-methods', { method: 'POST', body: fd }).then(r => r.json()).then(console.log);
```

Expected: logs an object like `{ id: "...", type: "va", label: "Test VA", image_url: null, bank_name: "BNI", va_number: "1234567890", is_active: true, created_at: "..." }`.

- [ ] **Step 4: Verify POST (qr) rejects missing image**

In the same console:

```js
const fd2 = new FormData();
fd2.append('type', 'qr');
fd2.append('label', 'Test QR');
fetch('/api/payment-methods', { method: 'POST', body: fd2 }).then(r => r.json()).then(console.log);
```

Expected: `{ error: "Gambar QR wajib diupload" }`.

- [ ] **Step 5: Clean up the test row**

In the Supabase SQL Editor:

```sql
DELETE FROM payment_methods WHERE label = 'Test VA';
```

- [ ] **Step 6: Commit**

```bash
git add app/api/payment-methods/route.js
git commit -m "$(cat <<'EOF'
feat(api): add GET/POST /api/payment-methods

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
EOF
)"
```

---

### Task 4: API route — update & delete

**Files:**
- Create: `app/api/payment-methods/[id]/route.js`

**Interfaces:**
- Consumes: same `compressImage` as Task 3; `SAFE_COLUMNS`/`ALLOWED_QR_TYPES`/`MAX_QR_SIZE`/`slugifyLabel`/`getServiceClient`/`BUCKET` re-declared locally in this file (small enough not to warrant a shared module — matches how `app/api/pimpinan/route.js` and a hypothetical `[id]/route.js` would each declare their own small constants in this codebase's existing style, e.g. `app/api/kwitansi/route.js` vs `app/api/kwitansi/[id]/route.js` each redeclare `getServiceClient`).
- Produces: `PUT /api/payment-methods/[id]` (multipart form: `label`, `is_active` ("true"/"false"), and either `image` [optional replacement, qr only] or `bank_name`+`va_number` [va only]) → `200` JSON of updated row. `DELETE /api/payment-methods/[id]` → `200 { success: true }`.

- [ ] **Step 1: Write the route**

```js
import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { compressImage } from '@/lib/image'

const BUCKET = 'app-settings'
const ALLOWED_QR_TYPES = ['image/jpeg', 'image/png', 'image/webp']
const MAX_QR_SIZE = 2 * 1024 * 1024
const SAFE_COLUMNS = 'id, type, label, image_url, bank_name, va_number, is_active, created_at'

function getServiceClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  )
}

function slugifyLabel(label) {
  return label.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '').slice(0, 40) || 'metode'
}

// Menghapus file lama dari storage berdasarkan public URL-nya — sama
// dengan pola orphan-cleanup di app/api/app-settings/route.js.
function removeStorageFile(supabase, publicUrl) {
  const marker = `/${BUCKET}/`
  const idx = publicUrl ? publicUrl.indexOf(marker) : -1
  if (idx === -1) return Promise.resolve()
  const path = publicUrl.slice(idx + marker.length)
  return supabase.storage.from(BUCKET).remove([path]).catch(() => {})
}

// PUT /api/payment-methods/[id] — update label/is_active, dan data sesuai
// tipe (gambar baru untuk qr, atau bank_name/va_number untuk va). Tipe
// ('qr'/'va') sendiri tidak pernah berubah setelah dibuat.
export async function PUT(request, { params }) {
  try {
    const { id } = await params
    const supabase = getServiceClient()

    const { data: current, error: fetchError } = await supabase
      .from('payment_methods')
      .select(SAFE_COLUMNS)
      .eq('id', id)
      .single()
    if (fetchError || !current) {
      return NextResponse.json({ error: 'Metode pembayaran tidak ditemukan' }, { status: 404 })
    }

    const formData = await request.formData()
    const label = (formData.get('label') || '').toString().trim()
    const isActiveRaw = formData.get('is_active')
    if (!label) {
      return NextResponse.json({ error: 'Label wajib diisi' }, { status: 400 })
    }

    const update = {
      label,
      is_active: isActiveRaw === null ? current.is_active : isActiveRaw === 'true',
    }

    if (current.type === 'qr') {
      const imageFile = formData.get('image')
      if (imageFile && imageFile instanceof Blob && imageFile.size > 0) {
        if (!ALLOWED_QR_TYPES.includes(imageFile.type)) {
          return NextResponse.json({ error: 'Format gambar harus JPG, PNG, atau WebP' }, { status: 400 })
        }
        if (imageFile.size > MAX_QR_SIZE) {
          return NextResponse.json({ error: 'Ukuran gambar maksimal 2MB' }, { status: 400 })
        }
        const ext = (imageFile.name?.split('.').pop() || 'png').toLowerCase().replace(/[^a-z0-9]/g, '')
        const path = `payment-qr/${Date.now()}-${slugifyLabel(label)}.${ext}`
        const arrayBuffer = await imageFile.arrayBuffer()
        const compressed = await compressImage(Buffer.from(arrayBuffer), imageFile.type, { maxWidth: 640, quality: 90 })
        const { error: uploadError } = await supabase.storage
          .from(BUCKET)
          .upload(path, compressed, { contentType: imageFile.type, upsert: false })
        if (uploadError) throw uploadError

        const { data: { publicUrl } } = supabase.storage.from(BUCKET).getPublicUrl(path)
        await removeStorageFile(supabase, current.image_url)
        update.image_url = publicUrl
      }
    } else {
      const bankName = (formData.get('bank_name') || '').toString().trim()
      const vaNumber = (formData.get('va_number') || '').toString().trim()
      if (!bankName || !vaNumber) {
        return NextResponse.json({ error: 'Nama bank dan nomor VA wajib diisi' }, { status: 400 })
      }
      update.bank_name = bankName
      update.va_number = vaNumber
    }

    const { data, error } = await supabase
      .from('payment_methods')
      .update(update)
      .eq('id', id)
      .select(SAFE_COLUMNS)
      .single()
    if (error) throw error
    return NextResponse.json(data)
  } catch (err) {
    return NextResponse.json({ error: err.message || 'Gagal memperbarui metode pembayaran' }, { status: 500 })
  }
}

// DELETE /api/payment-methods/[id] — hapus baris + file storage-nya kalau
// tipe qr. Invoice yang masih mereferensikan id ini otomatis jadi NULL
// (ON DELETE SET NULL di kolom invoices.payment_method_id).
export async function DELETE(request, { params }) {
  try {
    const { id } = await params
    const supabase = getServiceClient()

    const { data: current } = await supabase
      .from('payment_methods')
      .select('image_url')
      .eq('id', id)
      .single()

    const { error } = await supabase.from('payment_methods').delete().eq('id', id)
    if (error) throw error

    if (current?.image_url) await removeStorageFile(supabase, current.image_url)

    return NextResponse.json({ success: true })
  } catch (err) {
    return NextResponse.json({ error: err.message || 'Gagal menghapus metode pembayaran' }, { status: 500 })
  }
}
```

- [ ] **Step 2: Re-create a test VA row to exercise PUT/DELETE**

In the browser console (logged in as super_admin):

```js
const fd = new FormData();
fd.append('type', 'va');
fd.append('label', 'Test VA 2');
fd.append('bank_name', 'BNI');
fd.append('va_number', '1234567890');
const created = await (await fetch('/api/payment-methods', { method: 'POST', body: fd })).json();
console.log(created);
```

Expected: an object with an `id` — copy that id for the next steps.

- [ ] **Step 3: Verify PUT (toggle is_active)**

```js
const id = 'PASTE_ID_HERE';
const fd = new FormData();
fd.append('label', 'Test VA 2');
fd.append('is_active', 'false');
fd.append('bank_name', 'BNI');
fd.append('va_number', '1234567890');
fetch(`/api/payment-methods/${id}`, { method: 'PUT', body: fd }).then(r => r.json()).then(console.log);
```

Expected: logs the row with `"is_active": false`.

- [ ] **Step 4: Verify DELETE**

```js
fetch(`/api/payment-methods/${id}`, { method: 'DELETE' }).then(r => r.json()).then(console.log);
```

Expected: `{ success: true }`. Then `fetch('/api/payment-methods').then(r => r.json()).then(console.log)` should no longer list that id.

- [ ] **Step 5: Commit**

```bash
git add "app/api/payment-methods/[id]/route.js"
git commit -m "$(cat <<'EOF'
feat(api): add PUT/DELETE /api/payment-methods/[id]

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
EOF
)"
```

---

### Task 5: Nav entry

**Files:**
- Modify: `app/components/navConfig.jsx`

**Interfaces:**
- Consumes: existing `NAV_ICONS`, `ALL_NAV_ITEMS`, `SIDEBAR_ORDER.super_admin` arrays.
- Produces: nav item key `'pengaturan-metode-pembayaran'` linking to `/pengaturan/metode-pembayaran`, used by Task 6's page and visible in the sidebar.

- [ ] **Step 1: Add the icon**

Find (search for `person: (`):

```js
  person: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <circle cx="12" cy="8" r="4"/>
      <path d="M4 21v-1a8 8 0 0 1 16 0v1"/>
    </svg>
  ),
```

Add immediately after it (still inside the `NAV_ICONS` object):

```js
  qr: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <rect x="3" y="3" width="7" height="7" rx="1"/>
      <rect x="14" y="3" width="7" height="7" rx="1"/>
      <rect x="3" y="14" width="7" height="7" rx="1"/>
      <line x1="14" y1="14" x2="14" y2="14.01"/>
      <line x1="18" y1="14" x2="18" y2="14.01"/>
      <line x1="14" y1="18" x2="14" y2="18.01"/>
      <line x1="18" y1="18" x2="18" y2="18.01"/>
      <line x1="21" y1="14" x2="21" y2="21"/>
      <line x1="14" y1="21" x2="21" y2="21"/>
    </svg>
  ),
```

- [ ] **Step 2: Add the nav item**

Find (search for `pengaturan-branding`):

```js
  { key: 'pengaturan-branding', href: '/pengaturan/branding', label: 'Nama Instansi & Logo', shortLabel: 'Branding', icon: 'image', roles: ['super_admin'], group: 'pengaturan' },
]
```

Replace with:

```js
  { key: 'pengaturan-branding', href: '/pengaturan/branding', label: 'Nama Instansi & Logo', shortLabel: 'Branding', icon: 'image', roles: ['super_admin'], group: 'pengaturan' },
  { key: 'pengaturan-metode-pembayaran', href: '/pengaturan/metode-pembayaran', label: 'Metode Pembayaran', shortLabel: 'Pembayaran', icon: 'qr', roles: ['super_admin'], group: 'pengaturan' },
]
```

- [ ] **Step 3: Add to sidebar order**

Find (search for `SIDEBAR_ORDER = {`):

```js
  super_admin: ['dashboard', 'kelola-agenda', 'tv-pamflet', 'kelola-penilaian', 'pertanyaan-penilaian', 'kelola-saran', 'kelola-tamu', 'program-kerja-pui', 'e-invoice', 'e-kwitansi', 'rab', 'memo', 'pemasukan-unit-usaha', 'laporan', 'pengaturan-users', 'pengaturan-unit-kerja', 'pengaturan-pimpinan', 'pengaturan-branding'],
```

Replace with:

```js
  super_admin: ['dashboard', 'kelola-agenda', 'tv-pamflet', 'kelola-penilaian', 'pertanyaan-penilaian', 'kelola-saran', 'kelola-tamu', 'program-kerja-pui', 'e-invoice', 'e-kwitansi', 'rab', 'memo', 'pemasukan-unit-usaha', 'laporan', 'pengaturan-users', 'pengaturan-unit-kerja', 'pengaturan-pimpinan', 'pengaturan-branding', 'pengaturan-metode-pembayaran'],
```

- [ ] **Step 4: Verify in browser**

With the dev server running, log in as `super_admin` and open the sidebar. Expected: a new "Metode Pembayaran" item under the "Pengaturan" group (it will 404 until Task 6 — that's fine for this step, just confirm the link/icon/label render and the group placement is correct).

- [ ] **Step 5: Commit**

```bash
git add app/components/navConfig.jsx
git commit -m "$(cat <<'EOF'
feat(nav): add Metode Pembayaran settings entry

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
EOF
)"
```

---

### Task 6: Settings page

**Files:**
- Create: `app/(dashboard)/pengaturan/metode-pembayaran/page.jsx`

**Interfaces:**
- Consumes: `GET/POST /api/payment-methods`, `PUT/DELETE /api/payment-methods/[id]` (Tasks 3–4); `useToast()` from `@/app/components/Toast`; `ConfirmModal` from `@/app/components/ConfirmModal`; `useFocusTrap` from `@/app/components/useFocusTrap`.
- Produces: nothing consumed by later tasks (leaf page) — but this is where staff will create the payment methods that Tasks 7–10 need to display, so run Step 6's manual verification here and leave at least one QR and one VA method in the database for use in Tasks 7–10's own verification.

- [ ] **Step 1: Write the page**

```jsx
'use client';

import { useState, useEffect, useCallback } from 'react';
import { useToast } from '@/app/components/Toast';
import ConfirmModal from '@/app/components/ConfirmModal';
import { useFocusTrap } from '@/app/components/useFocusTrap';

const ALLOWED_QR_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
const MAX_QR_SIZE = 2 * 1024 * 1024;

// ============ KOMPONEN MODAL TAMBAH/EDIT ============
function PaymentMethodModal({ item, onSave, onClose, saving }) {
  const modalRef = useFocusTrap(true, onClose);
  const [type, setType] = useState(item?.type || 'qr');
  const [label, setLabel] = useState(item?.label || '');
  const [bankName, setBankName] = useState(item?.bank_name || '');
  const [vaNumber, setVaNumber] = useState(item?.va_number || '');
  const [imageFile, setImageFile] = useState(null);
  const [imagePreview, setImagePreview] = useState(item?.image_url || null);
  const [error, setError] = useState('');

  useEffect(() => {
    return () => { if (imagePreview && imagePreview.startsWith('blob:')) URL.revokeObjectURL(imagePreview); };
  }, [imagePreview]);

  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!ALLOWED_QR_TYPES.includes(file.type)) {
      setError('Format gambar harus JPG, PNG, atau WebP');
      e.target.value = '';
      return;
    }
    if (file.size > MAX_QR_SIZE) {
      setError('Ukuran gambar maksimal 2MB');
      e.target.value = '';
      return;
    }
    setError('');
    setImageFile(file);
    setImagePreview(URL.createObjectURL(file));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!label.trim()) { setError('Label wajib diisi'); return; }
    if (type === 'qr') {
      if (!item?.id && !imageFile) { setError('Gambar QR wajib diupload'); return; }
    } else {
      if (!bankName.trim() || !vaNumber.trim()) { setError('Nama bank dan nomor VA wajib diisi'); return; }
    }
    setError('');
    const fd = new FormData();
    fd.append('type', type);
    fd.append('label', label.trim());
    if (type === 'qr' && imageFile) fd.append('image', imageFile);
    if (type === 'va') {
      fd.append('bank_name', bankName.trim());
      fd.append('va_number', vaNumber.trim());
    }
    onSave(fd);
  };

  return (
    <div className="modal-backdrop" onClick={onClose} ref={modalRef}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-head">
          <h3 style={{ fontSize: '1rem', fontWeight: 700 }}>{item?.id ? 'Edit Metode Pembayaran' : 'Tambah Metode Pembayaran'}</h3>
          <button className="btn btn-ghost btn-sm btn-icon" onClick={onClose} aria-label="Tutup">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ width: 16, height: 16 }}><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
          </button>
        </div>
        <form onSubmit={handleSubmit}>
          <div className="card-form-body">
            {error && (
              <div className="error-msg" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem' }}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ width: '1rem', height: '1rem', flexShrink: 0 }}>
                  <circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" />
                </svg>
                {error}
              </div>
            )}
            {!item?.id && (
              <div className="field">
                <label className="field-label">Tipe *</label>
                <div style={{ display: 'flex', gap: '0.75rem', marginTop: 4 }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer' }}>
                    <input type="radio" name="type" checked={type === 'qr'} onChange={() => setType('qr')} /> QR Code
                  </label>
                  <label style={{ display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer' }}>
                    <input type="radio" name="type" checked={type === 'va'} onChange={() => setType('va')} /> Virtual Account
                  </label>
                </div>
              </div>
            )}
            <div className="field" style={{ marginTop: 16 }}>
              <label className="field-label" htmlFor="label">Label *</label>
              <input id="label" className="input" value={label} onChange={(e) => setLabel(e.target.value)} placeholder={type === 'qr' ? 'Contoh: Kolam Renang' : 'Contoh: BNI - SSFC'} required />
            </div>
            {type === 'qr' ? (
              <div className="field" style={{ marginTop: 16 }}>
                <label className="field-label">
                  Gambar QR {item?.id ? <span className="muted">(kosongkan untuk tetap pakai gambar sekarang)</span> : '*'}
                </label>
                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginTop: 4 }}>
                  {imagePreview && (
                    <img src={imagePreview} alt="Preview QR" style={{ width: 64, height: 64, objectFit: 'contain', border: '1px solid var(--border)', borderRadius: 8, background: 'white' }} />
                  )}
                  <input type="file" accept=".jpg,.jpeg,.png,.webp" onChange={handleFileChange} />
                </div>
                <p className="muted" style={{ fontSize: '0.75rem', marginTop: 4 }}>
                  JPG, PNG, atau WebP. Maks. 2MB. Disarankan PNG supaya QR tetap tajam saat di-scan.
                </p>
              </div>
            ) : (
              <>
                <div className="field" style={{ marginTop: 16 }}>
                  <label className="field-label" htmlFor="bank_name">Nama Bank *</label>
                  <input id="bank_name" className="input" value={bankName} onChange={(e) => setBankName(e.target.value)} placeholder="Contoh: BNI" required />
                </div>
                <div className="field" style={{ marginTop: 16 }}>
                  <label className="field-label" htmlFor="va_number">Nomor VA *</label>
                  <input id="va_number" className="input" value={vaNumber} onChange={(e) => setVaNumber(e.target.value)} placeholder="Contoh: 1234567890123" required />
                </div>
              </>
            )}
          </div>
          <div className="card-form-footer">
            <button type="button" className="btn btn-ghost" onClick={onClose}>Batal</button>
            <button type="submit" className="btn btn-primary" disabled={saving}>
              {saving ? 'Menyimpan…' : (item?.id ? 'Simpan Perubahan' : 'Tambah')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ============ HALAMAN UTAMA ============
export default function PaymentMethodsSettingsPage() {
  const { error: toastError, success: toastSuccess } = useToast();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [saving, setSaving] = useState(false);
  const [deleteItem, setDeleteItem] = useState(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/payment-methods');
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

  const handleSave = async (fd) => {
    setSaving(true);
    try {
      const url = editingItem?.id ? `/api/payment-methods/${editingItem.id}` : '/api/payment-methods';
      const method = editingItem?.id ? 'PUT' : 'POST';
      if (editingItem?.id) fd.append('is_active', String(editingItem.is_active));
      const res = await fetch(url, { method, body: fd });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      await fetchData();
      setShowModal(false);
      setEditingItem(null);
      toastSuccess(editingItem?.id ? 'Metode pembayaran diperbarui' : 'Metode pembayaran ditambahkan');
    } catch (err) {
      toastError('Gagal menyimpan: ' + err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleToggleStatus = async (item) => {
    try {
      const fd = new FormData();
      fd.append('label', item.label);
      fd.append('is_active', String(!item.is_active));
      if (item.type === 'va') {
        fd.append('bank_name', item.bank_name || '');
        fd.append('va_number', item.va_number || '');
      }
      const res = await fetch(`/api/payment-methods/${item.id}`, { method: 'PUT', body: fd });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      await fetchData();
    } catch (err) {
      toastError('Gagal mengubah status: ' + err.message);
    }
  };

  const confirmDelete = async () => {
    if (!deleteItem) return;
    setDeleteLoading(true);
    try {
      const res = await fetch(`/api/payment-methods/${deleteItem.id}`, { method: 'DELETE' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      await fetchData();
      setDeleteItem(null);
      toastSuccess('Metode pembayaran dihapus');
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
          <h1 className="page-title">Metode Pembayaran</h1>
          <p className="page-subtitle">Daftar QR dan Virtual Account yang bisa dipilih saat membuat invoice.</p>
        </div>
        <div className="page-actions">
          <button className="btn btn-primary" onClick={() => { setEditingItem(null); setShowModal(true); }}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ width: 16, height: 16 }}>
              <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
            </svg>
            Tambah Metode
          </button>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: '1rem' }}>
        {loading ? (
          <div className="muted" style={{ padding: '2rem', textAlign: 'center' }}>Memuat...</div>
        ) : items.length === 0 ? (
          <div className="muted" style={{ padding: '2rem', textAlign: 'center' }}>Belum ada metode pembayaran</div>
        ) : items.map((item) => (
          <div key={item.id} className="card">
            <div className="card-body" style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                {item.type === 'qr' ? (
                  <img src={item.image_url} alt={item.label} style={{ width: 56, height: 56, objectFit: 'contain', border: '1px solid var(--border)', borderRadius: 8, background: 'white' }} />
                ) : (
                  <div style={{ width: 56, height: 56, borderRadius: 8, background: 'var(--surface-2)', display: 'grid', placeItems: 'center', fontSize: '0.6875rem', fontWeight: 700, color: 'var(--text-2)' }}>VA</div>
                )}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: 600 }}>{item.label}</div>
                  {item.type === 'va' && (
                    <div className="muted" style={{ fontSize: '0.8125rem' }}>{item.bank_name} — {item.va_number}</div>
                  )}
                </div>
                <span className="badge" style={{ background: item.is_active ? 'var(--success-bg)' : 'var(--surface-3)', color: item.is_active ? 'var(--success)' : 'var(--text-3)', fontSize: '0.6875rem' }}>
                  {item.is_active ? 'Aktif' : 'Nonaktif'}
                </span>
              </div>
              <div style={{ display: 'flex', gap: 4, justifyContent: 'flex-end' }}>
                <button className="btn btn-ghost btn-sm btn-icon" onClick={() => { setEditingItem(item); setShowModal(true); }} title="Edit" aria-label="Edit metode">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ width: 14, height: 14 }}><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                </button>
                <button
                  className="btn btn-ghost btn-sm btn-icon"
                  onClick={() => handleToggleStatus(item)}
                  title={item.is_active ? 'Nonaktifkan' : 'Aktifkan'}
                  aria-label={item.is_active ? 'Nonaktifkan metode' : 'Aktifkan metode'}
                  style={{ color: item.is_active ? 'var(--warning)' : 'var(--success)' }}
                >
                  {item.is_active ? (
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ width: 14, height: 14 }}><path d="M18.36 6.64a9 9 0 1 1-12.73 0"/><line x1="12" y1="2" x2="12" y2="12"/></svg>
                  ) : (
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ width: 14, height: 14 }}><path d="M5 12h14"/><path d="M12 5v14"/></svg>
                  )}
                </button>
                <button className="btn btn-ghost btn-sm btn-icon" onClick={() => setDeleteItem(item)} title="Hapus" aria-label="Hapus metode" style={{ color: 'var(--danger)' }}>
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ width: 14, height: 14 }}><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {showModal && (
        <PaymentMethodModal
          item={editingItem}
          onSave={handleSave}
          onClose={() => { setShowModal(false); setEditingItem(null); }}
          saving={saving}
        />
      )}

      <ConfirmModal
        open={!!deleteItem}
        title="Hapus Metode Pembayaran"
        message={<>Yakin ingin menghapus <strong>{deleteItem?.label}</strong>? Metode ini mungkin sudah dipakai di invoice sebelumnya — invoice tersebut tidak akan lagi menampilkan info pembayaran ini saat dicetak ulang. Tindakan ini tidak dapat dibatalkan.</>}
        confirmLabel="Ya, Hapus"
        busy={deleteLoading}
        onConfirm={confirmDelete}
        onCancel={() => setDeleteItem(null)}
      />
    </div>
  );
}
```

- [ ] **Step 2: Verify the page loads**

Open `http://127.0.0.1:3000/pengaturan/metode-pembayaran` in the browser (logged in as `super_admin`).
Expected: page renders with title "Metode Pembayaran", empty state "Belum ada metode pembayaran" (assuming Task 3 Step 5's test row was cleaned up and Task 4's test row was deleted).

- [ ] **Step 3: Add a real QR method**

Click "Tambah Metode", leave type on "QR Code", type a label (e.g. "Kolam Renang"), pick any small PNG/JPG on disk as the image, submit.
Expected: toast "Metode pembayaran ditambahkan", a new card appears showing the thumbnail and label, status "Aktif".

- [ ] **Step 4: Add a real VA method**

Click "Tambah Metode" again, switch type to "Virtual Account", label "BNI - SSFC", bank "BNI", VA number "8808123456789012", submit.
Expected: toast, a new card with the "VA" placeholder box, label, and `BNI — 8808123456789012` line.

- [ ] **Step 5: Toggle and edit**

Click the toggle icon on the VA card. Expected: badge flips to "Nonaktif" without a confirm dialog. Click it again to flip back to "Aktif". Click "Edit" on the QR card, change the label, submit without picking a new file. Expected: label updates, thumbnail unchanged (old image kept).

- [ ] **Step 6: Leave both methods in place**

Do not delete either method — Tasks 7–10 need at least one QR and one VA method to exist for their own manual verification. (Deletion is exercised again, disposably, at the end of Task 10.)

- [ ] **Step 7: Commit**

```bash
git add "app/(dashboard)/pengaturan/metode-pembayaran/page.jsx"
git commit -m "$(cat <<'EOF'
feat(pengaturan): add Metode Pembayaran management page

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
EOF
)"
```

---

### Task 7: Invoice create page

**Files:**
- Modify: `app/(dashboard)/e-invoice/create/page.jsx`

**Interfaces:**
- Consumes: `GET /api/payment-methods` (Task 3); rows shaped `{ id, type, label, image_url, bank_name, va_number, is_active }`.
- Produces: `formData.payment_method_id` (string UUID or `''`), included in the `invoices` insert as `payment_method_id`.

- [ ] **Step 1: Add `payment_method_id` to the three `formData` shapes**

This field appears in 3 places with 3 different indentation levels — the initial `useState`, `resetForm`, and `restoreDraft`'s fallback. Apply all 3 edits exactly as shown (indentation matters for an exact-match find/replace).

Find (initial `useState`, 2-space component body indent):

```js
  const [formData, setFormData] = useState({
    tanggal_invoice: new Date().toISOString().split('T')[0],
    tanggal_jatuh_tempo: '',
    catatan: '',
  });
```

Replace with:

```js
  const [formData, setFormData] = useState({
    tanggal_invoice: new Date().toISOString().split('T')[0],
    tanggal_jatuh_tempo: '',
    catatan: '',
    payment_method_id: '',
  });
```

Find (inside `resetForm`, 4-space indent):

```js
    setFormData({
      tanggal_invoice: new Date().toISOString().split('T')[0],
      tanggal_jatuh_tempo: '',
      catatan: '',
    });
```

Replace with:

```js
    setFormData({
      tanggal_invoice: new Date().toISOString().split('T')[0],
      tanggal_jatuh_tempo: '',
      catatan: '',
      payment_method_id: '',
    });
```

Find (inside `restoreDraft`'s fallback, 10-space indent):

```js
          setFormData(draft.formData || {
            tanggal_invoice: new Date().toISOString().split('T')[0],
            tanggal_jatuh_tempo: '',
            catatan: '',
          });
```

Replace with:

```js
          setFormData(draft.formData || {
            tanggal_invoice: new Date().toISOString().split('T')[0],
            tanggal_jatuh_tempo: '',
            catatan: '',
            payment_method_id: '',
          });
```

- [ ] **Step 2: Fetch payment methods**

Find (search for `const [fetchingCustomers, setFetchingCustomers] = useState(true);`):

```js
  const [fetchingCustomers, setFetchingCustomers] = useState(true);
```

Add immediately after it:

```js
  const [paymentMethods, setPaymentMethods] = useState([]);
```

Find (search for the closing of the `fetchCustomers` effect, `}, [supabase]);` right after `fetchCustomers();`):

```js
    fetchCustomers();
  }, [supabase]);
```

Add immediately after it:

```js

  // Fetch payment methods (untuk dropdown "Metode Pembayaran" opsional)
  useEffect(() => {
    const fetchPaymentMethods = async () => {
      try {
        const res = await fetch('/api/payment-methods');
        const data = await res.json();
        if (res.ok) setPaymentMethods((data || []).filter((m) => m.is_active));
      } catch (err) {
        console.error('Error fetching payment methods:', err);
      }
    };
    fetchPaymentMethods();
  }, []);
```

- [ ] **Step 3: Add the selected-method lookup and change handler**

Find (search for `const selectedCustomer = customers.find`):

```js
  // Get selected customer info
  const selectedCustomer = customers.find(c => c.id === selectedCustomerId);
```

Add immediately after it:

```js

  // Get selected payment method info (dipakai untuk preview di bawah select)
  const selectedPaymentMethod = paymentMethods.find(m => m.id === formData.payment_method_id);

  // Pilih metode pembayaran dari dropdown → tambahkan kalimat otomatis ke
  // Catatan (tidak menimpa isi yang sudah ada) + simpan id-nya supaya blok
  // Info Pembayaran di detail/print tetap tampil independen dari teks
  // Catatan itu sendiri.
  const handlePaymentMethodChange = (id) => {
    const method = paymentMethods.find((m) => m.id === id);
    const line = !method
      ? null
      : method.type === 'qr'
        ? `Pembayaran dapat dilakukan dengan scan QRIS "${method.label}" (QR terlampir di bawah).`
        : `Pembayaran dapat dilakukan melalui Virtual Account ${method.bank_name} No. ${method.va_number} (${method.label}).`;
    setFormData((prev) => ({
      ...prev,
      payment_method_id: id,
      catatan: line ? (prev.catatan ? `${prev.catatan}\n\n${line}` : line) : prev.catatan,
    }));
  };
```

- [ ] **Step 4: Add the dropdown + preview to the JSX**

Find (search for `placeholder="Anda bisa menulis catatan tambahan untuk pelanggan Anda di sini."` — there is exactly one occurrence in this file):

```jsx
                <div>
                  <label>Catatan</label>
                  <textarea
                    value={formData.catatan}
                    onChange={(e) => setFormData({ ...formData, catatan: e.target.value })}
                    placeholder="Anda bisa menulis catatan tambahan untuk pelanggan Anda di sini."
                    rows={4}

                  />
                </div>
```

Replace with:

```jsx
                <div>
                  <label>Catatan</label>
                  <textarea
                    value={formData.catatan}
                    onChange={(e) => setFormData({ ...formData, catatan: e.target.value })}
                    placeholder="Anda bisa menulis catatan tambahan untuk pelanggan Anda di sini."
                    rows={4}

                  />
                  <div style={{ marginTop: '0.75rem' }}>
                    <label style={{ fontSize: '0.875rem', fontWeight: 600 }}>Metode Pembayaran (opsional)</label>
                    <select
                      value={formData.payment_method_id || ''}
                      onChange={(e) => handlePaymentMethodChange(e.target.value)}
                      style={{ width: '100%', maxWidth: '400px', border: '1px solid var(--border-strong)', borderRadius: '4px', padding: '0.5rem', marginTop: '0.25rem' }}
                    >
                      <option value="">-- Pilih metode (opsional) --</option>
                      {paymentMethods.map((m) => (
                        <option key={m.id} value={m.id}>
                          {m.type === 'qr' ? `[QR] ${m.label}` : `[VA] ${m.label}`}
                        </option>
                      ))}
                    </select>
                    {selectedPaymentMethod && (
                      <div style={{ marginTop: '0.5rem', padding: '0.75rem', backgroundColor: 'var(--surface-2)', borderRadius: '8px', fontSize: '0.8125rem', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                        {selectedPaymentMethod.type === 'qr' ? (
                          <>
                            <img src={selectedPaymentMethod.image_url} alt={selectedPaymentMethod.label} style={{ width: 48, height: 48, objectFit: 'contain', background: 'white', borderRadius: 4 }} />
                            <span>{selectedPaymentMethod.label}</span>
                          </>
                        ) : (
                          <span>{selectedPaymentMethod.bank_name} — {selectedPaymentMethod.va_number}</span>
                        )}
                      </div>
                    )}
                  </div>
                </div>
```

- [ ] **Step 5: Include it in the insert payload**

Find (search for `catatan: formData.catatan || null,` inside `invoiceDataToInsert`):

```js
        catatan: formData.catatan || null,
        terms_conditions: '',
        created_by_name: displayName || null,
      };
```

Replace with:

```js
        catatan: formData.catatan || null,
        terms_conditions: '',
        created_by_name: displayName || null,
        payment_method_id: formData.payment_method_id || null,
      };
```

- [ ] **Step 6: Verify in the browser**

Open `http://127.0.0.1:3000/e-invoice/create`. Fill in a customer and one item. In the "Catatan" section, pick the QR method you created in Task 6 from the new "Metode Pembayaran" dropdown.
Expected: a line like `Pembayaran dapat dilakukan dengan scan QRIS "Kolam Renang" (QR terlampir di bawah).` appears in the Catatan textarea, and a small preview (thumbnail + label) appears below the dropdown. Submit the invoice.
Expected: invoice saves successfully and redirects to its detail page (Task 9 will make the payment method visible there).

- [ ] **Step 7: Commit**

```bash
git add "app/(dashboard)/e-invoice/create/page.jsx"
git commit -m "$(cat <<'EOF'
feat(e-invoice): add payment method selection to create form

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
EOF
)"
```

---

### Task 8: Invoice edit page

**Files:**
- Modify: `app/(dashboard)/e-invoice/[id]/edit/page.jsx`

**Interfaces:**
- Consumes: same `/api/payment-methods` shape as Task 7.
- Produces: same `formData.payment_method_id` field, loaded from the fetched invoice row and included in the `invoices` update.

- [ ] **Step 1: Add `payment_method_id` to the `formData` initial state**

Find (search for the initial `formData` `useState` in this file — it's the one with `customer_id: ''`):

```js
  const [formData, setFormData] = useState({
    customer_id: '',
    tanggal_invoice: '',
    tanggal_jatuh_tempo: '',
    catatan: '',
  });
```

Replace with:

```js
  const [formData, setFormData] = useState({
    customer_id: '',
    tanggal_invoice: '',
    tanggal_jatuh_tempo: '',
    catatan: '',
    payment_method_id: '',
  });
```

- [ ] **Step 2: Fetch payment methods and load the invoice's existing selection**

Find (search for `const [customers, setCustomers] = useState([]);` — near the top of the component):

```js
  const [customers, setCustomers] = useState([]);
```

Add immediately after it:

```js
  const [paymentMethods, setPaymentMethods] = useState([]);
```

Find (search for `setFormData({` inside the `fetchData` effect — the one that sets `customer_id: invoiceData.customer_id || ''`):

```js
        setFormData({
          customer_id: invoiceData.customer_id || '',
          tanggal_invoice: invoiceData.tanggal_invoice || '',
          tanggal_jatuh_tempo: invoiceData.tanggal_jatuh_tempo || '',
          catatan: invoiceData.catatan || '',
        });
```

Replace with:

```js
        setFormData({
          customer_id: invoiceData.customer_id || '',
          tanggal_invoice: invoiceData.tanggal_invoice || '',
          tanggal_jatuh_tempo: invoiceData.tanggal_jatuh_tempo || '',
          catatan: invoiceData.catatan || '',
          payment_method_id: invoiceData.payment_method_id || '',
        });
```

Find (search for `fetchData();` at the very end of that `useEffect`, right before `}, [supabase, invoiceSlug]);`):

```js
    fetchData();
  }, [supabase, invoiceSlug]);
```

Add immediately after it:

```js

  // Fetch daftar metode pembayaran untuk dropdown (terpisah dari fetchData
  // di atas karena tidak bergantung pada invoiceSlug).
  useEffect(() => {
    const fetchPaymentMethods = async () => {
      try {
        const res = await fetch('/api/payment-methods');
        const data = await res.json();
        if (res.ok) setPaymentMethods(data || []);
      } catch (err) {
        console.error('Error fetching payment methods:', err);
      }
    };
    fetchPaymentMethods();
  }, []);
```

Note: unlike Task 7's create page, this fetch keeps **all** methods (not just active ones) — Step 3 below filters for display while still allowing an invoice's already-selected-but-now-inactive method to show correctly.

- [ ] **Step 3: Add the selectable list, selected-method lookup, and change handler**

Find (line 370 in this file):

```js
  const selectedCustomer = customers.find(c => c.id === formData.customer_id);
```

Add immediately after that line:

```js

  // Metode aktif + metode yang sudah terpasang di invoice ini meski sudah
  // dinonaktifkan (supaya dropdown tidak diam-diam menghilangkan pilihan
  // yang sudah ada saat invoice dibuka untuk diedit).
  const selectablePaymentMethods = paymentMethods.filter(
    (m) => m.is_active || m.id === formData.payment_method_id
  );
  const selectedPaymentMethod = paymentMethods.find(m => m.id === formData.payment_method_id);

  const handlePaymentMethodChange = (id) => {
    const method = paymentMethods.find((m) => m.id === id);
    const line = !method
      ? null
      : method.type === 'qr'
        ? `Pembayaran dapat dilakukan dengan scan QRIS "${method.label}" (QR terlampir di bawah).`
        : `Pembayaran dapat dilakukan melalui Virtual Account ${method.bank_name} No. ${method.va_number} (${method.label}).`;
    setFormData((prev) => ({
      ...prev,
      payment_method_id: id,
      catatan: line ? (prev.catatan ? `${prev.catatan}\n\n${line}` : line) : prev.catatan,
    }));
  };
```

- [ ] **Step 4: Add the dropdown + preview to the JSX**

Find (search for `placeholder="Anda bisa menulis catatan tambahan untuk pelanggan Anda di sini."` in this file):

```jsx
                <div>
                  <label>Catatan</label>
                  <textarea
                    value={formData.catatan}
                    onChange={(e) => setFormData({ ...formData, catatan: e.target.value })}
                    placeholder="Anda bisa menulis catatan tambahan untuk pelanggan Anda di sini."
                    rows={4}

                  />
                </div>
```

Replace with:

```jsx
                <div>
                  <label>Catatan</label>
                  <textarea
                    value={formData.catatan}
                    onChange={(e) => setFormData({ ...formData, catatan: e.target.value })}
                    placeholder="Anda bisa menulis catatan tambahan untuk pelanggan Anda di sini."
                    rows={4}

                  />
                  <div style={{ marginTop: '0.75rem' }}>
                    <label style={{ fontSize: '0.875rem', fontWeight: 600 }}>Metode Pembayaran (opsional)</label>
                    <select
                      value={formData.payment_method_id || ''}
                      onChange={(e) => handlePaymentMethodChange(e.target.value)}
                      style={{ width: '100%', maxWidth: '400px', border: '1px solid var(--border-strong)', borderRadius: '4px', padding: '0.5rem', marginTop: '0.25rem' }}
                    >
                      <option value="">-- Pilih metode (opsional) --</option>
                      {selectablePaymentMethods.map((m) => (
                        <option key={m.id} value={m.id}>
                          {m.type === 'qr' ? `[QR] ${m.label}` : `[VA] ${m.label}`}
                        </option>
                      ))}
                    </select>
                    {selectedPaymentMethod && (
                      <div style={{ marginTop: '0.5rem', padding: '0.75rem', backgroundColor: 'var(--surface-2)', borderRadius: '8px', fontSize: '0.8125rem', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                        {selectedPaymentMethod.type === 'qr' ? (
                          <>
                            <img src={selectedPaymentMethod.image_url} alt={selectedPaymentMethod.label} style={{ width: 48, height: 48, objectFit: 'contain', background: 'white', borderRadius: 4 }} />
                            <span>{selectedPaymentMethod.label}</span>
                          </>
                        ) : (
                          <span>{selectedPaymentMethod.bank_name} — {selectedPaymentMethod.va_number}</span>
                        )}
                      </div>
                    )}
                  </div>
                </div>
```

- [ ] **Step 5: Include it in the update payload**

Find (search for `catatan: formData.catatan || null,` inside the `.update({...})` call — there is one occurrence in this file, distinct from Task 7's file):

```js
          catatan: formData.catatan || null,
          terms_conditions: '',
        })
        .eq('id', realId);
```

Replace with:

```js
          catatan: formData.catatan || null,
          terms_conditions: '',
          payment_method_id: formData.payment_method_id || null,
        })
        .eq('id', realId);
```

- [ ] **Step 6: Verify in the browser**

Open the edit page for the invoice created in Task 7's Step 6 (from its detail page, click "Edit"). Expected: the "Metode Pembayaran" dropdown already shows the QR method selected (with its preview) since it was set on create. Change it to the VA method from Task 6. Expected: another auto-generated line about the Virtual Account is appended below the existing Catatan text (the QR line from before is still there — untouched). Save.
Expected: invoice updates successfully.

- [ ] **Step 7: Commit**

```bash
git add "app/(dashboard)/e-invoice/[id]/edit/page.jsx"
git commit -m "$(cat <<'EOF'
feat(e-invoice): add payment method selection to edit form

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
EOF
)"
```

---

### Task 9: Invoice detail page

**Files:**
- Modify: `app/(dashboard)/e-invoice/[id]/page.jsx`

**Interfaces:**
- Consumes: `invoice.payment_method_id`, `invoice.payment_method_type`, `invoice.payment_method_label`, `invoice.payment_method_qr_url`, `invoice.payment_method_bank_name`, `invoice.payment_method_va_number` — all present on the `invoice_summary` row already fetched by this page's existing `select('*')`.

- [ ] **Step 1: Add the info card**

Find (search for the closing of the "Ringkasan" card — the `</div>` immediately followed by the `{/* Status Update */}` comment):

```jsx
            </div>
          </div>
        </div>

        {/* Status Update */}
```

Replace with:

```jsx
            </div>
          </div>
        </div>

        {invoice.payment_method_id && (
          <div className="card" style={{ gridColumn: '1 / -1' }}>
            <div className="card-header">
              <h3 style={{ margin: 0, fontSize: '1rem' }}>Metode Pembayaran</h3>
            </div>
            <div className="card-body" style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              {invoice.payment_method_type === 'qr' ? (
                <>
                  <img
                    src={invoice.payment_method_qr_url}
                    alt={invoice.payment_method_label}
                    style={{ width: 64, height: 64, objectFit: 'contain', background: 'white', border: '1px solid var(--border)', borderRadius: 8 }}
                  />
                  <span>{invoice.payment_method_label}</span>
                </>
              ) : (
                <span>{invoice.payment_method_bank_name} — {invoice.payment_method_va_number} ({invoice.payment_method_label})</span>
              )}
            </div>
          </div>
        )}

        {/* Status Update */}
```

- [ ] **Step 2: Verify in the browser**

Open the detail page of the invoice from Task 8 (which now has the VA method selected). Expected: a new "Metode Pembayaran" card appears between "Ringkasan" and "Update Status", showing `BNI — 8808123456789012 (BNI - SSFC)` (or whatever label/number you used in Task 6).

- [ ] **Step 3: Commit**

```bash
git add "app/(dashboard)/e-invoice/[id]/page.jsx"
git commit -m "$(cat <<'EOF'
feat(e-invoice): show attached payment method on detail page

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
EOF
)"
```

---

### Task 10: Invoice print page

**Files:**
- Modify: `app/(dashboard)/e-invoice/[id]/print/page.jsx`

**Interfaces:**
- Consumes: same `invoice.payment_method_*` fields as Task 9 (this page also already does `select('*')` from `invoice_summary`).

- [ ] **Step 1: Add the print block**

Find (search for the end of the "Notes & Terms" grid — the closing `</div>` right before the `{/* Signatures */}` comment):

```jsx
            <div style={{ marginTop: '0.5rem', fontSize: '0.875rem', color: '#dc2626' }}>
              Jatuh Tempo: {formatDate(invoice.tanggal_jatuh_tempo)}
            </div>
          </div>
        </div>

        {/* Signatures */}
```

Replace with:

```jsx
            <div style={{ marginTop: '0.5rem', fontSize: '0.875rem', color: '#dc2626' }}>
              Jatuh Tempo: {formatDate(invoice.tanggal_jatuh_tempo)}
            </div>
          </div>
        </div>

        {invoice.payment_method_id && (
          <div style={{ marginBottom: '2rem' }}>
            <div style={{ fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.1em', color: '#64748b', marginBottom: '0.5rem' }}>
              Info Pembayaran:
            </div>
            {invoice.payment_method_type === 'qr' ? (
              <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                <img
                  src={invoice.payment_method_qr_url}
                  alt={invoice.payment_method_label}
                  style={{ width: 120, height: 120, objectFit: 'contain' }}
                />
                <div style={{ fontSize: '0.875rem', color: '#475569' }}>
                  Scan QRIS untuk pembayaran<br/>
                  <strong>{invoice.payment_method_label}</strong>
                </div>
              </div>
            ) : (
              <div style={{ fontSize: '0.875rem', color: '#475569' }}>
                Virtual Account {invoice.payment_method_bank_name}<br/>
                No. <strong>{invoice.payment_method_va_number}</strong> ({invoice.payment_method_label})
              </div>
            )}
          </div>
        )}

        {/* Signatures */}
```

- [ ] **Step 2: Verify QR rendering**

Open the print page for the invoice that has the QR method selected... but Task 8 changed that same invoice's selection to the VA method. So: go back to `e-invoice/create`, quickly create a second throwaway invoice (one item, any customer) picking the **QR** method from the dropdown, save it, then open its print page.
Expected: an "Info Pembayaran" block appears above "Signatures" with the QR thumbnail (~120px), "Scan QRIS untuk pembayaran", and the method's label in bold.

- [ ] **Step 3: Verify VA rendering**

Open the print page for the invoice from Task 8 (VA method selected).
Expected: "Info Pembayaran" block shows `Virtual Account BNI` / `No. 8808123456789012 (BNI - SSFC)`, no image.

- [ ] **Step 4: Verify the no-method case**

Open the print page for any invoice that never had a payment method selected (e.g. one created before this feature, or a fresh throwaway with the dropdown left on "-- Pilih metode (opsional) --").
Expected: no "Info Pembayaran" heading or block appears at all — no layout gap.

- [ ] **Step 5: Clean up throwaway data**

Delete the throwaway invoice(s) created for Steps 2/4 (`/e-invoice`, use the existing delete action on the detail page). Leave the two payment methods from Task 6 in place — they are real, reusable settings.

- [ ] **Step 6: Commit**

```bash
git add "app/(dashboard)/e-invoice/[id]/print/page.jsx"
git commit -m "$(cat <<'EOF'
feat(e-invoice): print dedicated payment-info block (QR/VA)

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
EOF
)"
```

---

## Post-Plan Check

After Task 10, the feature described in the spec is complete: a payment-methods library manageable from Pengaturan, selectable on invoice create/edit, auto-noting Catatan, and printing reliably on the invoice detail and print pages. E-Kwitansi remains untouched, as scoped.
