# RAB (Rencana Anggaran Biaya) Feature — Design

## Purpose

A standalone budget-planning document feature for SIMDIR. Super_admin creates a
RAB — a formal cost-estimate document for a planned activity/kegiatan,
itemized by category — that can be printed/exported as a PDF for formal
submission (pengajuan), similar in spirit to the existing E-Invoice/E-Kwitansi
document features but not linked to them or to Program Kerja PUI.

## Scope

- Standalone module: no relation to Program Kerja PUI, E-Invoice, E-Kwitansi,
  or Unit Kerja.
- No approval/status workflow — a RAB is created, can be edited any time, and
  printed whenever needed. Formal approval happens outside the system (wet
  signature on the printed document).
- Access: super_admin only.

## Data Model

### Table `rab` (header)

```sql
CREATE TABLE rab (
  id                    uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  nomor_rab             varchar(50) UNIQUE NOT NULL,  -- auto: RAB/2026/07/0001
  nama_kegiatan         text NOT NULL,
  tahun_anggaran        integer NOT NULL,
  tanggal               date NOT NULL DEFAULT CURRENT_DATE,
  nama_penyusun         text,               -- opsional
  nama_penanggung_jawab text NOT NULL,      -- wajib
  created_by            uuid REFERENCES profiles(id),
  created_at            timestamptz NOT NULL DEFAULT now(),
  updated_at            timestamptz NOT NULL DEFAULT now()
);
```

### Table `rab_items` (line items)

```sql
CREATE TABLE rab_items (
  id            uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  rab_id        uuid NOT NULL REFERENCES rab(id) ON DELETE CASCADE,
  kategori      text NOT NULL,       -- free text per RAB, e.g. "Konsumsi"
  uraian        text NOT NULL,       -- item name
  volume        numeric(10,2) NOT NULL DEFAULT 1,
  satuan        text,                -- e.g. "orang", "hari", "buah"
  harga_satuan  numeric(15,2) NOT NULL DEFAULT 0,
  total         numeric(15,2) GENERATED ALWAYS AS (volume * harga_satuan) STORED,
  urutan        integer DEFAULT 0
);

CREATE INDEX idx_rab_items_rab_id ON rab_items(rab_id);
```

### Numbering

`nomor_rab` is auto-generated via a `BEFORE INSERT` trigger, following the
exact pattern of `generate_kwitansi_number()` / `generate_invoice_number()`:
format `RAB/YYYY/MM/NNNN`, using a per-month `pg_advisory_xact_lock` to avoid
duplicate numbers under concurrent inserts.

### RLS

`ENABLE ROW LEVEL SECURITY` on both tables; single policy allowing only
`auth.role() = 'service_role'`. This matches `program_kerja_pui` and
`kwitansi` — role-based access (super_admin only) is enforced in
`middleware.js`, not in RLS.

### Totals

The grand total and per-category subtotals are computed in the application
(`SUM` over `rab_items.total`), not stored redundantly on `rab`.

## Pages & Routing

Mirrors the E-Kwitansi page structure:

| Route | Purpose |
|---|---|
| `/rab` | List: table of Nomor RAB, Nama Kegiatan, Tahun Anggaran, Total, Tanggal, actions. Search + filter by tahun anggaran. |
| `/rab/create` | Create form (header fields + dynamic category/item builder). |
| `/rab/[id]` | Detail view — summary + Edit/Cetak/Hapus buttons. |
| `/rab/[id]/edit` | Edit form, same shape as create, pre-filled. |
| `/rab/[id]/print` | A4 print view. |

### Access control

- `middleware.js`: add `{ prefix: '/rab', roles: ['super_admin'] }` to
  `ROLE_RULES`.
- `navConfig.jsx`: add `rab` entry to `ALL_NAV_ITEMS` with a new `clipboard`
  icon (clipboard-with-checklist SVG, added to `NAV_ICONS` alongside the
  existing set — distinct from `invoice`/`receipt` so it doesn't visually
  collide with E-Invoice/E-Kwitansi in the sidebar) and to
  `SIDEBAR_ORDER.super_admin`. Not added to any `BOTTOM_NAV_ORDER` (super_admin's
  3 mobile-nav slots are already spoken for).

## API Routes

Service-role backed, no self-contained role check (protection is entirely via
`middleware.js`), matching the `program_kerja_pui` / `kwitansi` convention.

- `GET /api/rab` — list all RAB with computed total per row (aggregate over
  `rab_items`).
- `POST /api/rab` — create. Body: `{ ...header fields, items: [{ kategori,
  uraian, volume, satuan, harga_satuan }, ...] }`. Inserts header row, then
  bulk-inserts items, in one request (not a DB transaction across two
  `supabase-js` calls — if item insert fails after header insert succeeds,
  the route deletes the just-created header row before returning the error,
  same cleanup-on-failure pattern already used in `/api/tamu`'s photo upload
  path).
- `GET /api/rab/[id]` — detail: header + all its items.
- `PUT /api/rab/[id]` — update header, then delete all existing items for
  that `rab_id` and re-insert the submitted items (replace-all, not diffed —
  consistent with the whole-form-submitted-at-once UX).
- `DELETE /api/rab/[id]` — delete RAB; items cascade via `ON DELETE CASCADE`.

## Form Behavior (Create/Edit)

- Header fields: Nama Kegiatan (required), Tahun Anggaran (required),
  Tanggal (required, defaults to today), Nama Penyusun (optional), Nama
  Penanggung Jawab (required).
- Below the header: a list of category blocks. Each block has a free-text
  category name input plus a table of items (Uraian, Volume, Satuan, Harga
  Satuan, Total — Total is read-only, computed client-side as `volume *
  harga_satuan`).
- "+ Tambah Item" button inside each category block; "+ Tambah Kategori"
  button below all category blocks.
- Delete (icon) button on each item row and on each category block header.
  Deleting a category that already has items prompts a `ConfirmModal` first
  (deleting an empty category needs no confirmation).
- Per-category subtotal shown under each category's item table; grand total
  shown once at the bottom of the form. Both recompute live as the user
  types, client-side — same pattern as the E-Invoice create/edit forms.
- Validation before submit: Nama Kegiatan required, Nama Penanggung Jawab
  required, at least 1 category with at least 1 item, every item requires a
  non-empty Uraian and Volume > 0.

## Print Page (`/rab/[id]/print`)

Follows the established print-page conventions already in the codebase
(shared with E-Invoice/E-Kwitansi print pages, including this session's
mobile-viewing fix):

- Header: dynamic branding (logo + nama instansi) fetched from
  `/api/app-settings`, matching every other public/print page.
- Body: RAB header info, then items grouped by category with subtotals, then
  grand total.
- Footer: two signature blocks side by side — **Penanggung Jawab** (always
  shown) and **Penyusun** (shown only when the **"Tampilkan Nama Penyusun"**
  checkbox in the on-screen print-controls bar is checked). The checkbox
  lives in the same `.no-print` controls bar pattern as E-Invoice's
  "Tampilkan Tanda Tangan" toggle.
- On-screen (not print), the printable content sits inside an
  `overflow-x: auto` wrapper so it doesn't overflow horizontally on phone
  screens, with a matching `@media print { overflow: visible !important }`
  override — the same fix already applied to the E-Invoice print page this
  session.
- A4-oriented `@media print` rules (page size, margins, hiding `.no-print`)
  copied from the E-Invoice/E-Kwitansi print pages.

## Out of Scope (explicitly, per YAGNI)

- No approval/status workflow (draft/diajukan/disetujui).
- No fixed/managed category list — categories are free text per RAB.
- No linkage to Program Kerja PUI, Unit Kerja, E-Invoice, or E-Kwitansi.
- No per-item edit history or audit log.
