# E-Invoice: Fix Role Detection + "Dibuat Oleh" Creator Log

Date: 2026-07-07
Status: Approved

## Context

User (super_admin) reported that the delete button doesn't appear on
e-invoice pages even when logged in as `super_admin`. Investigation found
delete/edit functionality already exists in all three e-invoice pages and
is already correctly gated to `isSuperAdmin` — the actual bug is in how
`isSuperAdmin` is computed.

Separately, the user wants a "who created this invoice" log shown on the
e-invoice list and detail pages.

## Part A — Fix: role detection bug in e-invoice pages

### Root cause

`app/(dashboard)/e-invoice/page.jsx`, `app/(dashboard)/e-invoice/[id]/page.jsx`,
and `app/(dashboard)/e-invoice/customers/page.jsx` each fetch the current
user's role with their own inline logic that **only** checks
`supabase.auth.getUser()`:

```js
const { data: { user } } = await supabase.auth.getUser();
if (user) {
  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single();
  setUserRole(profile?.role || '');
}
```

Users authenticated via the app's local-session cookie (not a real Supabase
Auth session — see `middleware.js` METODE 2) never populate `user` here, so
`userRole` stays `''` forever and `isSuperAdmin = userRole === 'super_admin'`
is always `false`, hiding edit/delete controls regardless of actual role.

`app/(dashboard)/layout.jsx` already resolves the current user correctly
(Supabase Auth first, then fallback to `localStorage.getItem('simdir_session')`),
but that logic is inlined there and not reused elsewhere.

### Fix

Add a shared hook `lib/hooks/useCurrentUser.js` that mirrors the working
logic from `layout.jsx`:

```js
'use client'
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase/client'

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

Use this hook in the three affected pages, replacing their local
`userRole`/`getUserRole` state and effect with:

```js
const { role: userRole, isSuperAdmin } = useCurrentUser()
```

(`customers/page.jsx` currently also has a stray `console.log('getUserRole -
User:', ...)` debug line in its version of this logic — remove it as part of
deleting the duplicated code.)

No other behavior changes in these files — `isSuperAdmin` is already used
correctly everywhere it's referenced (delete buttons, edit buttons/links).

## Part B — "Dibuat oleh" creator log on invoices

### Schema change

`invoices.created_by` already exists but is a FK to `auth.users(id)`, which
doesn't cover users authenticated via local session (their identity lives in
`public.users`, a separate table). Rather than reconciling two identity
sources at read time, store a plain denormalized display name at creation
time — no FK, no join required to display it.

New migration `supabase/migrations/20260707000001_add_invoice_created_by_name.sql`:

```sql
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

(View recreated in full since `CREATE OR REPLACE VIEW` requires the full
column list; this is the same view from
`supabase/migrations/20260520000000_create_e_invoice_tables.sql:258` plus the
one new column.)

Existing invoices get `created_by_name = NULL` — displayed as `'-'` in the
UI, per user's choice (no backfill).

### App changes

1. **`e-invoice/create/page.jsx`**: use `useCurrentUser()` to get
   `displayName`, add `created_by_name: displayName || null` to
   `invoiceDataToInsert` before the `.insert()` call (~line 370-386). The
   subsequent `.select()` with no column list already returns the new
   column, no query change needed there.

2. **`e-invoice/page.jsx`** (list): add a "Dibuat oleh" column to the
   invoice table, rendering `invoice.created_by_name || '-'`. Reads from
   `invoice_summary` via `select('*')`, already picks up the new column
   automatically once the view is updated.

3. **`e-invoice/[id]/page.jsx`** (detail): add a line in the invoice info
   section, e.g. `Dibuat oleh: {invoice.created_by_name || 'Tidak diketahui'}`.
   Also reads `invoice_summary` via `select('*')`, no query change needed.

### Out of scope (explicitly, per user's answers)

- No creator log for `customers` (user only asked for invoices).
- No backfill of `created_by_name` for existing test invoices/customers.
- No change to the `created_by` UUID/FK column — left as-is, unused.
