# E-Invoice Role Fix + Creator Log Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fix the role-detection bug that hides the super_admin-only Edit/Delete controls on the three e-invoice pages, and add a "Dibuat oleh" (created by) log shown on the invoice list and detail pages.

**Architecture:** Add one shared client hook (`useCurrentUser`) that resolves the logged-in user's role and display name using the same Supabase-Auth-then-local-session fallback logic already proven correct in `app/(dashboard)/layout.jsx`. Wire it into the three e-invoice pages that currently only check Supabase Auth. Add a denormalized `created_by_name` text column (no FK) to `invoices`, populated at creation time from the hook's `displayName`, and surfaced through the existing `invoice_summary` view.

**Tech Stack:** Next.js 15 (App Router, React 19), Supabase (Postgres + Auth), plain inline styles (no CSS framework). No automated test framework exists in this repo (confirmed: no jest/vitest in `package.json`, no `*.test.*`/`*.spec.*` files) — verification in this plan uses `npm run build`, targeted `grep` checks, and manual dev-server/browser checks, consistent with how prior fixes in this session were verified.

## Global Constraints

- Match existing code style: plain JS (no TypeScript), inline `style={{}}` objects, `'use client'` function components, Supabase client imported as `import { supabase } from '@/lib/supabase/client'`.
- Do not touch `app/(dashboard)/layout.jsx` — it already resolves role/user correctly; it's the reference implementation being copied, not something to refactor in this plan.
- Do not add a testing framework. Do not invent test files that don't fit this project's conventions.
- No backfill of `created_by_name` for existing invoices — they must display `'-'` (list) / `'Tidak diketahui'` (detail), per approved spec.
- Do not change the existing unused `invoices.created_by` UUID/FK column.
- Design source of truth: `docs/superpowers/specs/2026-07-07-e-invoice-role-fix-and-creator-log-design.md`.

---

### Task 1: Add `useCurrentUser` hook and fix role detection in the three e-invoice pages

**Files:**
- Create: `lib/hooks/useCurrentUser.js`
- Modify: `app/(dashboard)/e-invoice/page.jsx:210-246`
- Modify: `app/(dashboard)/e-invoice/[id]/page.jsx:62-106`
- Modify: `app/(dashboard)/e-invoice/customers/page.jsx:207`, `app/(dashboard)/e-invoice/customers/page.jsx:406-421`

**Interfaces:**
- Produces: `useCurrentUser()` from `@/lib/hooks/useCurrentUser`, returning `{ role: string, displayName: string, loading: boolean, isSuperAdmin: boolean }`. `role` is `''` until resolved. `isSuperAdmin` is `role === 'super_admin'`. Used by Task 1 (role gating) and Task 3 (creator name on invoice insert).

- [ ] **Step 1: Create the hook**

Create `lib/hooks/useCurrentUser.js`:

```js
'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase/client'

// Resolves the current user's role + display name the same way
// app/(dashboard)/layout.jsx does: Supabase Auth first, then fall back to
// the local-session cookie payload mirrored in localStorage. Pages that only
// checked supabase.auth.getUser() never saw a role for local-session users
// (see docs/superpowers/specs/2026-07-07-e-invoice-role-fix-and-creator-log-design.md).
export function useCurrentUser() {
  const [role, setRole] = useState('')
  const [displayName, setDisplayName] = useState('')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let active = true

    const resolve = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser()
        if (user) {
          const { data: profile } = await supabase
            .from('profiles')
            .select('role, nama')
            .eq('id', user.id)
            .single()
          if (active) {
            setRole(profile?.role || '')
            setDisplayName(profile?.nama || user.email || '')
          }
          return
        }
      } catch {
        // Supabase Auth tidak tersedia, lanjut ke sesi lokal
      }

      try {
        const localSession = localStorage.getItem('simdir_session')
        if (localSession) {
          const parsed = JSON.parse(atob(localSession))
          if (active) {
            setRole(parsed.role || '')
            setDisplayName(parsed.username || parsed.email || '')
          }
        }
      } catch {
        // sesi lokal tidak ada/rusak, biarkan role kosong
      }
    }

    resolve().finally(() => { if (active) setLoading(false) })
    return () => { active = false }
  }, [])

  return { role, displayName, loading, isSuperAdmin: role === 'super_admin' }
}
```

- [ ] **Step 2: Confirm the hook exports what later steps expect**

Run: `cd "/Volumes/File Home/File Web/simdir" && grep -n "export function useCurrentUser" lib/hooks/useCurrentUser.js`

Expected: one match. This file has no automated compiler check of its own (it's a plain hook with no standalone entry point) — full syntax/type verification happens once it's imported into a real page and built in Step 7.

- [ ] **Step 3: Wire the hook into `e-invoice/page.jsx`**

In `app/(dashboard)/e-invoice/page.jsx`, add the import near the top with the other imports:

```js
import { useCurrentUser } from '@/lib/hooks/useCurrentUser';
```

Then find this block (around line 210-246):

```js
  const [invoiceToDelete, setInvoiceToDelete] = useState(null);
  const [userRole, setUserRole] = useState('');

  // Fetch invoices
  const fetchInvoices = useCallback(async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('invoice_summary')
        .select('*')
        .order('tanggal_invoice', { ascending: false });
      
      if (error) throw error;
      setInvoices(data || []);
    } catch (err) {
      console.error('Error fetching invoices:', err);
    } finally {
      setLoading(false);
    }
  }, [supabase]);

  // Get user role
  useEffect(() => {
    const getUserRole = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('role')
          .eq('id', user.id)
          .single();
        setUserRole(profile?.role || '');
      }
    };
    getUserRole();
    fetchInvoices();
  }, [supabase, fetchInvoices]);
```

Replace it with:

```js
  const [invoiceToDelete, setInvoiceToDelete] = useState(null);
  const { isSuperAdmin } = useCurrentUser();

  // Fetch invoices
  const fetchInvoices = useCallback(async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('invoice_summary')
        .select('*')
        .order('tanggal_invoice', { ascending: false });
      
      if (error) throw error;
      setInvoices(data || []);
    } catch (err) {
      console.error('Error fetching invoices:', err);
    } finally {
      setLoading(false);
    }
  }, [supabase]);

  useEffect(() => {
    fetchInvoices();
  }, [fetchInvoices]);
```

Then find the now-duplicate line further down (around line 313):

```js
  const isSuperAdmin = userRole === 'super_admin';
```

Delete that line — `isSuperAdmin` now comes from the hook destructured above. (`userRole` isn't referenced anywhere else in this file, confirmed by `grep -n "userRole" "app/(dashboard)/e-invoice/page.jsx"` returning only this declaration and the line just deleted — so it's intentionally not part of the destructure, to avoid an unused-variable warning.)

- [ ] **Step 4: Wire the hook into `e-invoice/[id]/page.jsx`**

Add the same import near the top:

```js
import { useCurrentUser } from '@/lib/hooks/useCurrentUser';
```

Find this block (around line 62-106):

```js
  const [invoice, setInvoice] = useState(null);
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [userRole, setUserRole] = useState('');

  // Fetch invoice data
  const fetchInvoice = useCallback(async () => {
    if (!invoiceId) return;
    
    setLoading(true);
    try {
      const { data: invoiceData, error: invoiceError } = await supabase
        .from('invoice_summary')
        .select('*')
        .eq('id', invoiceId)
        .single();
      
      if (invoiceError) throw invoiceError;
      setInvoice(invoiceData);
      
      const { data: itemsData, error: itemsError } = await supabase
        .from('invoice_items')
        .select('*')
        .eq('invoice_id', invoiceId)
        .order('urutan', { ascending: true });
      
      if (itemsError) throw itemsError;
      setItems(itemsData || []);
      
      // Get user role
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('role')
          .eq('id', user.id)
          .single();
        setUserRole(profile?.role || '');
      }
    } catch (err) {
      console.error('Error fetching invoice:', err);
    } finally {
      setLoading(false);
    }
  }, [supabase, invoiceId]);
```

Replace it with:

```js
  const [invoice, setInvoice] = useState(null);
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const { isSuperAdmin } = useCurrentUser();

  // Fetch invoice data
  const fetchInvoice = useCallback(async () => {
    if (!invoiceId) return;
    
    setLoading(true);
    try {
      const { data: invoiceData, error: invoiceError } = await supabase
        .from('invoice_summary')
        .select('*')
        .eq('id', invoiceId)
        .single();
      
      if (invoiceError) throw invoiceError;
      setInvoice(invoiceData);
      
      const { data: itemsData, error: itemsError } = await supabase
        .from('invoice_items')
        .select('*')
        .eq('invoice_id', invoiceId)
        .order('urutan', { ascending: true });
      
      if (itemsError) throw itemsError;
      setItems(itemsData || []);
    } catch (err) {
      console.error('Error fetching invoice:', err);
    } finally {
      setLoading(false);
    }
  }, [supabase, invoiceId]);
```

Then find the now-duplicate line further down (around line 146):

```js
  const isSuperAdmin = userRole === 'super_admin';
```

Delete that line (same reasoning as Step 3 — `userRole` has no other reference in this file).

- [ ] **Step 5: Wire the hook into `e-invoice/customers/page.jsx`**

Add the same import near the top:

```js
import { useCurrentUser } from '@/lib/hooks/useCurrentUser';
```

Find this line (around line 207):

```js
  const [userRole, setUserRole] = useState('');
```

Replace it with:

```js
  const { isSuperAdmin } = useCurrentUser();
```

Find this block (around line 406-421):

```js
  // Get user role and wait for auth
  useEffect(() => {
    const getUserRole = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      console.log('getUserRole - User:', user?.id || 'No user');
      if (user) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('role')
          .eq('id', user.id)
          .single();
        setUserRole(profile?.role || '');
      }
    };
    getUserRole();
  }, [supabase]);
```

Delete that entire block (the hook now handles this; also removes the stray debug `console.log`).

Then find the now-duplicate line further down (around line 522):

```js
  const isSuperAdmin = userRole === 'super_admin';
```

Delete that line (same reasoning as Step 3 — `userRole` has no other reference in this file).

- [ ] **Step 6: Confirm no leftover duplicate role-fetch code**

Run: `cd "/Volumes/File Home/File Web/simdir" && grep -n "userRole === 'super_admin'\|setUserRole\|const \[userRole" "app/(dashboard)/e-invoice/page.jsx" "app/(dashboard)/e-invoice/[id]/page.jsx" "app/(dashboard)/e-invoice/customers/page.jsx"`

Expected: no output (all three files now get `userRole`/`isSuperAdmin` solely from `useCurrentUser()`).

- [ ] **Step 7: Build the project**

Run: `cd "/Volumes/File Home/File Web/simdir" && npm run build 2>&1 | tail -40`

Expected: `✓ Compiled successfully`, no errors mentioning `useCurrentUser`, `userRole`, or `isSuperAdmin` in the three modified files.

- [ ] **Step 8: Manual browser verification (no test framework in this repo)**

Start the dev server: `cd "/Volumes/File Home/File Web/simdir" && npm run dev` (if a dev server is already running on port 3000, check with `lsof -nP -iTCP:3000 -sTCP:LISTEN` before starting another one).

In a browser:
1. Go to `http://127.0.0.1:3000/login`, log in with `admin` / `admin123` (dev-only mock super_admin account, works because `NODE_ENV=development` under `next dev`).
2. Visit `/e-invoice` — confirm a trash-icon "Hapus" button now appears in the Aksi column for each row.
3. Click into any invoice detail page `/e-invoice/[id]` — confirm "Edit" and "Hapus" buttons appear.
4. Visit `/e-invoice/customers` — confirm Edit/Hapus icons appear in the Aksi column.
5. Log out, log back in with `staff` / `staff123` (mock `staff` role).
6. Repeat steps 2-4 — confirm none of the Hapus/Edit buttons appear this time (staff is not super_admin).

- [ ] **Step 9: Commit**

```bash
cd "/Volumes/File Home/File Web/simdir"
git add lib/hooks/useCurrentUser.js "app/(dashboard)/e-invoice/page.jsx" "app/(dashboard)/e-invoice/[id]/page.jsx" "app/(dashboard)/e-invoice/customers/page.jsx"
git commit -m "$(cat <<'EOF'
fix: resolve role via local-session fallback on e-invoice pages

Delete/edit controls were hidden for super_admin users authenticated via
the local-session cookie, because these three pages only checked
supabase.auth.getUser() for role. Add a shared useCurrentUser hook that
mirrors the working Supabase-Auth-then-local-session logic already used
in app/(dashboard)/layout.jsx.
EOF
)"
```

---

### Task 2: Add `created_by_name` column and update `invoice_summary` view

**Files:**
- Create: `supabase/migrations/20260707000001_add_invoice_created_by_name.sql`

**Interfaces:**
- Produces: `invoices.created_by_name` (nullable `TEXT` column, no FK), also exposed as `created_by_name` on the `invoice_summary` view. Consumed by Task 3 (insert) and Task 4 (display).

- [ ] **Step 1: Write the migration**

Create `supabase/migrations/20260707000001_add_invoice_created_by_name.sql`:

```sql
-- Migration: Add invoice created_by_name
-- Created: 2026-07-07
-- Description: invoices.created_by references auth.users(id), which doesn't
-- cover users authenticated via the app's local-session cookie (their
-- identity lives in public.users, not auth.users). Store a plain
-- denormalized display name captured at creation time instead — no FK,
-- no cross-table join needed to show "who created this invoice".

ALTER TABLE invoices ADD COLUMN IF NOT EXISTS created_by_name TEXT;

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
    i.total,
    i.catatan,
    i.created_by_name,
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
    END AS hari_terlambat
FROM invoices i
JOIN customers c ON i.customer_id = c.id;
```

- [ ] **Step 2: Sanity-check the SQL file**

This repo has no local Postgres instance and no `psql`/`supabase` CLI configured in this environment — the migration must be applied to the real Supabase project by the user (same as the `20260707000000_fix_invoice_number_race.sql` migration from the earlier security-fix session).

Run a lightweight syntax sanity check instead: `cd "/Volumes/File Home/File Web/simdir" && grep -c ";" supabase/migrations/20260707000001_add_invoice_created_by_name.sql`

Expected: `2` (one `;` ending the `ALTER TABLE`, one ending the `CREATE OR REPLACE VIEW`) — confirms the file has exactly the two statements intended, no stray fragments.

- [ ] **Step 3: Commit**

```bash
cd "/Volumes/File Home/File Web/simdir"
git add supabase/migrations/20260707000001_add_invoice_created_by_name.sql
git commit -m "$(cat <<'EOF'
feat: add invoices.created_by_name column for creator log

Denormalized text column (no FK) so it works regardless of whether the
creator authenticated via real Supabase Auth or the app's local-session
fallback. Exposed through invoice_summary for the list/detail pages.
EOF
)"
```

- [ ] **Step 4: Tell the user to apply the migration**

This step has no code — it's a reminder for whoever runs this plan: the migration file is committed to the repo but **not yet applied** to the live Supabase project. Tasks 3 and 4 will not show real data until the user applies it via the Supabase SQL Editor or `supabase db push`.

---

### Task 3: Populate `created_by_name` when creating an invoice

**Files:**
- Modify: `app/(dashboard)/e-invoice/create/page.jsx:1-6` (imports), `app/(dashboard)/e-invoice/create/page.jsx:118-120` (component start), `app/(dashboard)/e-invoice/create/page.jsx:~370-386` (insert payload)

**Interfaces:**
- Consumes: `useCurrentUser()` from Task 1, specifically its `displayName: string` field.
- Produces: every newly-created row in `invoices` has `created_by_name` set to the creator's display name (or `null` if unavailable). Consumed by Task 4's display.

- [ ] **Step 1: Import the hook and call it**

In `app/(dashboard)/e-invoice/create/page.jsx`, add the import alongside the existing ones (near line 6):

```js
import { useCurrentUser } from '@/lib/hooks/useCurrentUser';
```

Find the component start (around line 118-120):

```js
export default function CreateInvoicePage() {
  const router = useRouter();
  const [customers, setCustomers] = useState([]);
```

Replace it with:

```js
export default function CreateInvoicePage() {
  const router = useRouter();
  const { displayName } = useCurrentUser();
  const [customers, setCustomers] = useState([]);
```

(Check the exact line above `const [customers, setCustomers]` first with `grep -n "const router = useRouter" "app/(dashboard)/e-invoice/create/page.jsx"` — insert `const { displayName } = useCurrentUser();` directly after that line, keeping every other existing line unchanged.)

- [ ] **Step 2: Add `created_by_name` to the insert payload**

Find the invoice insert object (around line 370-380, ending with `terms_conditions: '',` before the closing `};`):

```js
        tanggal_jatuh_tempo: formData.tanggal_jatuh_tempo,
        status: status,
        subtotal: subtotal,
        ppn_persen: pajak.aktif && pajak.mode === 'persen' ? (parseFloat(pajak.persen) || 0) : 0,
        ppn_nilai: pajak.aktif ? ppnNilai : 0,
        diskon_nilai: diskon.aktif ? diskonNilai : 0,
        biaya_pengiriman: biayaPengiriman.aktif ? pengirimanNilai : 0,
        total: total,
        catatan: formData.catatan || null,
        terms_conditions: '',
      };
```

Replace it with:

```js
        tanggal_jatuh_tempo: formData.tanggal_jatuh_tempo,
        status: status,
        subtotal: subtotal,
        ppn_persen: pajak.aktif && pajak.mode === 'persen' ? (parseFloat(pajak.persen) || 0) : 0,
        ppn_nilai: pajak.aktif ? ppnNilai : 0,
        diskon_nilai: diskon.aktif ? diskonNilai : 0,
        biaya_pengiriman: biayaPengiriman.aktif ? pengirimanNilai : 0,
        total: total,
        catatan: formData.catatan || null,
        terms_conditions: '',
        created_by_name: displayName || null,
      };
```

- [ ] **Step 3: Build**

Run: `cd "/Volumes/File Home/File Web/simdir" && npm run build 2>&1 | tail -30`

Expected: `✓ Compiled successfully`, no errors referencing `create/page.jsx` or `useCurrentUser`.

- [ ] **Step 4: Verify against the database**

This requires the Task 2 migration to already be applied to the Supabase project (see Task 2 Step 4). If it isn't applied yet, skip this step for now and come back to it after applying the migration.

Start the dev server, log in as `admin` / `admin123` (or a real account), create a new invoice through `/e-invoice/create`. After saving, open the Supabase Table Editor (or run `select nomor_invoice, created_by_name from invoices order by created_at desc limit 1;` in the SQL Editor) and confirm `created_by_name` is populated with the logged-in user's username/name — not `null`.

- [ ] **Step 5: Commit**

```bash
cd "/Volumes/File Home/File Web/simdir"
git add "app/(dashboard)/e-invoice/create/page.jsx"
git commit -m "$(cat <<'EOF'
feat: record creator name when a new invoice is saved

Uses useCurrentUser()'s displayName so it works whether the creator is
authenticated via Supabase Auth or the local-session fallback.
EOF
)"
```

---

### Task 4: Display "Dibuat Oleh" on the invoice list and detail pages

**Files:**
- Modify: `app/(dashboard)/e-invoice/page.jsx:436-505` (table header + row)
- Modify: `app/(dashboard)/e-invoice/[id]/page.jsx:236-239` (invoice info card)

**Interfaces:**
- Consumes: `invoice.created_by_name` (string or `null`), returned by `invoice_summary` (Task 2) and populated by Task 3.

- [ ] **Step 1: Add the column header on the list page**

In `app/(dashboard)/e-invoice/page.jsx`, find (around line 436-443):

```js
              <thead>
                <tr>
                  <th>No. Invoice</th>
                  <th>Pelanggan</th>
                  <th>Tanggal</th>
                  <th>Jatuh Tempo</th>
                  <th>Total</th>
                  <th>Status</th>
                  <th style={{ textAlign: 'center' }}>Aksi</th>
                </tr>
              </thead>
```

Replace it with:

```js
              <thead>
                <tr>
                  <th>No. Invoice</th>
                  <th>Pelanggan</th>
                  <th>Tanggal</th>
                  <th>Jatuh Tempo</th>
                  <th>Total</th>
                  <th>Status</th>
                  <th>Dibuat Oleh</th>
                  <th style={{ textAlign: 'center' }}>Aksi</th>
                </tr>
              </thead>
```

- [ ] **Step 2: Update the two `colSpan={7}` placeholders to `colSpan={8}`**

There are two loading/empty-state rows using `colSpan={7}` (around lines 449 and 458):

```js
                {loading ? (
                  <tr>
                    <td colSpan={7} style={{ textAlign: 'center', padding: '3rem' }}>
```

and:

```js
                ) : filteredInvoices.length === 0 ? (
                  <tr>
                    <td colSpan={7} style={{ textAlign: 'center', padding: '3rem' }}>
```

Change both `colSpan={7}` to `colSpan={8}` (one new column was added in Step 1).

- [ ] **Step 3: Add the data cell in the row**

Find the Status cell (around line 502-504):

```js
                      <td>
                        <StatusBadge status={invoice.status} />
                      </td>
```

Replace it with:

```js
                      <td>
                        <StatusBadge status={invoice.status} />
                      </td>
                      <td style={{ color: 'var(--text-2)' }}>
                        {invoice.created_by_name || '-'}
                      </td>
```

(This must be the cell immediately before the "Aksi" `<td>` that contains the action buttons — confirm with `grep -n "StatusBadge status={invoice.status}" "app/(dashboard)/e-invoice/page.jsx"` that only one match exists before editing.)

- [ ] **Step 4: Add the "Dibuat Oleh" row on the detail page**

In `app/(dashboard)/e-invoice/[id]/page.jsx`, find (around line 236-239):

```js
              <div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-3)' }}>Nomor Invoice</div>
                <div style={{ fontWeight: 600, fontFamily: 'monospace' }}>{invoice.nomor_invoice}</div>
              </div>
```

Replace it with:

```js
              <div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-3)' }}>Nomor Invoice</div>
                <div style={{ fontWeight: 600, fontFamily: 'monospace' }}>{invoice.nomor_invoice}</div>
              </div>
              <div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-3)' }}>Dibuat Oleh</div>
                <div>{invoice.created_by_name || 'Tidak diketahui'}</div>
              </div>
```

- [ ] **Step 5: Build**

Run: `cd "/Volumes/File Home/File Web/simdir" && npm run build 2>&1 | tail -30`

Expected: `✓ Compiled successfully`, no errors in either modified file.

- [ ] **Step 6: Manual verification**

Requires Task 2's migration applied and at least one invoice created after Task 3 was implemented (to have a non-null `created_by_name` to look at).

In the browser: visit `/e-invoice`, confirm the new "Dibuat Oleh" column shows the creator's name for the invoice created in Task 3's verification step, and shows `-` for older invoices. Open that invoice's detail page `/e-invoice/[id]`, confirm the "Dibuat Oleh" field shows the same name (or "Tidak diketahui" for an older invoice without one).

- [ ] **Step 7: Commit**

```bash
cd "/Volumes/File Home/File Web/simdir"
git add "app/(dashboard)/e-invoice/page.jsx" "app/(dashboard)/e-invoice/[id]/page.jsx"
git commit -m "$(cat <<'EOF'
feat: show invoice creator on the e-invoice list and detail pages
EOF
)"
```
