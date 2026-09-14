# Metode Pembayaran (QR & Virtual Account) di E-Invoice — Design

## Purpose

E-Invoice currently has a free-text "Catatan" field and no structured way to
tell the customer how to pay. The business runs several revenue units
(Kolam Renang, SSFC, Driving Golf, etc.), each with its own QRIS QR code
and/or bank Virtual Account number. Staff need to:

1. Maintain a reusable library of payment methods (QR images and VA
   numbers), so they don't re-upload/re-type the same QR or VA per invoice.
2. On each invoice, either keep writing Catatan manually (unchanged default
   behaviour), or pick a saved payment method — which appends a
   human-readable instruction to Catatan and makes the method's details
   (QR image, or bank name + VA number) print reliably on the invoice
   regardless of what Catatan's text ends up saying.

E-Kwitansi is explicitly out of scope: a kwitansi documents money **already
received** and is signed by the payer as proof of that — it has no payment
instructions to give.

## Scope

- Applies only to E-Invoice (create, edit, detail, print).
- Not applied to E-Kwitansi, RAB, or any other module.
- Access: management of the payment-methods library is `super_admin` only
  (`/pengaturan/*` is already `super_admin`-only in `middleware.js`), same
  as E-Invoice itself (`e-invoice` nav item is `super_admin`-only today).

## Data Model

### Table `payment_methods`

```sql
CREATE TABLE payment_methods (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  type        varchar(10) NOT NULL CHECK (type IN ('qr', 'va')),
  label       text NOT NULL,        -- e.g. "Kolam Renang", "BNI - SSFC"
  image_url   text,                 -- required when type = 'qr', else NULL
  bank_name   text,                 -- required when type = 'va', else NULL
  va_number   text,                 -- required when type = 'va', else NULL
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

CREATE TRIGGER trg_payment_methods_updated_at
  BEFORE UPDATE ON payment_methods
  FOR EACH ROW
  EXECUTE FUNCTION set_payment_methods_updated_at();

ALTER TABLE payment_methods ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role manage payment_methods"
  ON payment_methods FOR ALL
  USING (auth.role() = 'service_role');
```

No app-level CHECK enforcing "image_url required for qr / bank_name+va_number
required for va" — enforced in the API route instead (matches project
convention of light DB constraints + validation in route handlers, e.g.
`app/api/pimpinan/route.js`).

### `invoices` table

Add one nullable column:

```sql
ALTER TABLE invoices
  ADD COLUMN payment_method_id uuid REFERENCES payment_methods(id) ON DELETE SET NULL;
```

`ON DELETE SET NULL` — deleting a payment method never breaks an existing
invoice; the invoice just stops showing that method's block on reprint. The
Pengaturan UI's delete confirmation calls this out explicitly.

### `invoice_summary` view

Extend the existing view (currently defined in
`20260825010000_add_invoice_created_by_name.sql`) with a `LEFT JOIN`:

```sql
LEFT JOIN payment_methods pm ON pm.id = i.payment_method_id
```

New selected columns: `i.payment_method_id`, `pm.type AS payment_method_type`,
`pm.label AS payment_method_label`, `pm.image_url AS payment_method_qr_url`,
`pm.bank_name AS payment_method_bank_name`, `pm.va_number AS payment_method_va_number`.

Existing callers already `select('*')` from this view
(`e-invoice/[id]/page.jsx`, `e-invoice/[id]/print/page.jsx`), so no query
changes needed there — only rendering changes.

### Storage

QR images reuse the existing public `app-settings` Supabase Storage bucket
(already used for the instansi logo), under a `payment-qr/` path prefix,
uploaded via `compressImage()` (`lib/image.js`) the same way the logo is.
Recommend PNG in the UI copy, since QR codes need to stay crisp to scan —
compression stays lossless-safe for PNG/WebP; JPEG is still accepted (same
allow-list as the logo) but not recommended in the field hint text.

VA entries have no file at all — pure text fields, no storage interaction.

## API Routes

Service-role backed, mirroring `app/api/pimpinan/route.js`.

- `GET /api/payment-methods` — list all (id, type, label, image_url,
  bank_name, va_number, is_active), ordered by `label`.
- `POST /api/payment-methods` — create. Accepts `multipart/form-data`
  (needed for the QR image file):
  - Always: `type` (`qr`|`va`), `label` (trimmed, required).
  - `type = 'qr'`: `image` file required, same allow-list/size limit as the
    logo (`image/jpeg`, `image/png`, `image/webp`; 2MB max) — compressed via
    `compressImage()` and uploaded to `app-settings/payment-qr/<timestamp>-<slug>.<ext>`.
  - `type = 'va'`: `bank_name` and `va_number` required (trimmed).
  - 400 with a friendly message on missing required fields for the chosen
    type.
- `PUT /api/payment-methods/[id]` — update `label`, `is_active`, and either
  a replacement QR image (qr) or `bank_name`/`va_number` (va). Replacing a
  QR image deletes the old storage file after a successful upload, same
  orphan-cleanup pattern as `app/api/app-settings/route.js`.
- `DELETE /api/payment-methods/[id]` — delete the row; if type is `qr`,
  also remove its storage file. Existing invoices referencing this id keep
  working (`payment_method_id` becomes `NULL` via the FK).

### `middleware.js`

Add, alongside the existing per-prefix API blocks:

```js
const PAYMENT_METHODS_API_ROLES = ROLE_RULES.find((r) => r.prefix === '/pengaturan').roles

if (pathname.startsWith('/api/payment-methods') && !PAYMENT_METHODS_API_ROLES.includes(role)) {
  return withSecurityHeaders(forbiddenResponse(request, pathname))
}
```

All methods (GET included) are `super_admin`-only — unlike `/api/pimpinan`,
there's no other role that ever needs to read this list, since `e-invoice`
itself is already `super_admin`-only.

## Settings Page — `/pengaturan/metode-pembayaran`

New nav entry in `navConfig.jsx`:

```js
{ key: 'pengaturan-metode-pembayaran', href: '/pengaturan/metode-pembayaran', label: 'Metode Pembayaran', shortLabel: 'Pembayaran', icon: 'qr', roles: ['super_admin'], group: 'pengaturan' }
```

Added to `SIDEBAR_ORDER... /` super_admin allowed-pages list next to
`pengaturan-branding`. New `qr`-style icon added to `NAV_ICONS` (simple QR
glyph, 24x24 stroke style matching the rest).

Page layout, following the visual pattern of `pengaturan/branding/page.jsx`
and `pengaturan/pimpinan/page.jsx`:

- A list of cards, one per payment method:
  - QR type: thumbnail (contain-fit, ~64px box) + label + Aktif/Nonaktif
    badge + Edit / Hapus.
  - VA type: bank icon placeholder + label + `{bank_name} — {va_number}` +
    Aktif/Nonaktif badge + Edit / Hapus.
- "+ Tambah Metode" opens a form (inline card or modal, matching whichever
  of the two existing patterns reads cleaner once implemented — decided
  during implementation, not a design-relevant choice) that first asks for
  **type** (QR / VA radio or segmented control), then reveals the matching
  fields:
  - QR: Label (text, required), Gambar QR (file input, required on create;
    optional on edit — leave blank to keep current image).
  - VA: Label (text, required), Nama Bank (text, required), Nomor VA (text,
    required).
- Toggling "Aktif/Nonaktif" is a quick PUT (no confirm dialog — reversible,
  low-stakes).
- Deleting shows a `ConfirmModal` (same component used elsewhere) warning:
  "Metode ini mungkin sudah dipakai di invoice sebelumnya. Menghapusnya
  akan membuat invoice tersebut tidak lagi menampilkan info pembayaran ini
  saat dicetak ulang."

## Invoice Create/Edit Form

Location: `app/(dashboard)/e-invoice/create/page.jsx` and
`app/(dashboard)/e-invoice/[id]/edit/page.jsx`, in the "Summary & Additional
Charges" card, directly below the existing Catatan `<textarea>`.

New control: a `<select>` labelled **"Metode Pembayaran (opsional)"**,
default option `-- Pilih metode (opsional) --`, followed by active payment
methods labelled `[QR] {label}` or `[VA] {label}`. (On edit, if the
invoice's stored `payment_method_id` refers to a now-inactive method, that
method is still included in the list — pre-selected — so the field doesn't
silently show as unset.)

Behaviour on change:

- Sets `formData.payment_method_id` to the chosen id (or `null` for the
  default option). This is the only thing that drives the print page's
  dedicated payment-info block.
- Independently, **appends** a generated line to `formData.catatan`
  (separated by a blank line if Catatan already has content — never
  overwrites existing text):
  - QR: `Pembayaran dapat dilakukan dengan scan QRIS "{label}" (QR terlampir di bawah).`
  - VA: `Pembayaran dapat dilakukan melalui Virtual Account {bank_name} No. {va_number} ({label}).`
- The appended line is plain text inside a normal, still fully-editable
  `<textarea>` — staff can reword or delete it. It is a one-time
  auto-fill triggered by the `<select>`'s `onChange`, not a synced/locked
  field. Switching the dropdown again appends another line rather than
  replacing the previous one (kept simple — the field is free text, staff
  clean it up if they change their mind).
- A small preview appears under the select once a method is chosen: the QR
  thumbnail (qr) or `{bank_name} — {va_number}` (va), so staff can confirm
  they picked the right one — same visual pattern as the existing "selected
  customer" preview box on this page.

## Invoice Detail Page (`/e-invoice/[id]`)

Below Catatan, if `invoice.payment_method_id` is set, show a small
read-only info block: QR thumbnail + label (qr) or bank name + VA number
(va) — so staff can see which method is attached without opening print.

## Invoice Print Page (`/e-invoice/[id]/print`)

After the existing "Notes & Terms" two-column grid (Catatan / Terms &
Conditions) and before the Signatures block, add a new block, rendered only
when `invoice.payment_method_id` is set:

- Heading: `Info Pembayaran`.
- `type = 'qr'`: the QR image (~120px box, `object-fit: contain`,
  print-safe) with `{payment_method_label}` as a caption underneath.
- `type = 'va'`: `Virtual Account {payment_method_bank_name}` and
  `No. {payment_method_va_number}` as two plain lines, styled consistently
  with the surrounding print typography (no image).

This block is independent of the Catatan text — it always reflects the
current `payment_method_id`, so the payment info prints reliably even if
someone edits or deletes the auto-generated sentence in Catatan afterward.

If no payment method is attached, nothing renders here (no layout gap, no
heading).

## Out of Scope (per YAGNI)

- E-Kwitansi: not touched (kwitansi = proof payment already happened,
  signed by payer — no payment instructions needed).
- No dynamic/generated QRIS (amount-embedded QR) — QR images are static,
  uploaded once per revenue unit and reused across invoices.
- No per-invoice custom QR/VA upload — only selection from the shared
  library.
- No automatic mapping between a customer/unit-usaha and a default payment
  method — selection is always manual per invoice.
- No locking/syncing between the dropdown and the Catatan text after the
  initial append — Catatan stays a plain free-text field.
- No multi-select (an invoice has at most one attached payment method at a
  time).
- No usage-count / "used in N invoices" indicator on the settings page.

## Migration

New file `supabase/migrations/20260914000000_create_payment_methods.sql`:
`CREATE TABLE payment_methods` + trigger, `ALTER TABLE invoices ADD COLUMN
payment_method_id`, `CREATE OR REPLACE VIEW invoice_summary` (full
redefinition including the new join/columns, since Postgres views are
replaced wholesale). Header comment notes manual execution via Supabase SQL
Editor, per project convention (`sql/schema/supabase-schema.sql` is not
kept in sync — migrations are the source of truth).
