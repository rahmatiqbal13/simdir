# Agenda TV Public/Internal Split Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a `tampil_publik` visibility flag to agenda so staff can mark which agenda are public-safe, rework the public TV display (`/agenda/tv`) to only show those and give pamphlet/video more visual weight, and add a new unauthenticated internal-only TV display (`/agenda/tv-internal`) showing every agenda item full-width with no media panel.

**Architecture:** One new boolean column drives both displays' queries. The public page's existing 1002-line file mixes agenda-table rendering with media-rotation logic; the agenda-table half (row rendering, pagination, auto-rotate, responsive scaling) is extracted into a shared component and hook/helper module so the new internal page can reuse it without duplicating ~400 lines, while the media-rotation logic (YouTube/pamphlet playlist) stays exclusively in the public page.

**Tech Stack:** Next.js 15 (App Router, React 19) client components, Supabase (Postgres), plain inline styles. No automated test framework in this repo (confirmed: no jest/vitest, no test files) — verification uses `npm run build`, targeted `grep` checks, and manual dev-server/browser checks.

## Global Constraints

- Match existing code style: plain JS, inline `style={{}}` objects, `'use client'` components, Supabase client via `import { supabase } from '@/lib/supabase/client'`.
- `tampil_publik` defaults to `false` for all agenda (existing rows and new rows created before staff explicitly opt in) — nothing becomes public by accident.
- The internal display requires **no authentication** — same trust model as the existing public `/agenda/tv` (explicit user decision, documented in the spec as a deliberate tradeoff).
- The internal display lives under `app/(public)/agenda/tv-internal/`, so it is automatically covered by `middleware.js`'s existing `pathname.startsWith('/agenda')` public-path rule — no middleware changes are in scope.
- No nav menu entry for the internal display anywhere (`app/(dashboard)/layout.jsx`, `app/components/MobileBottomNav.jsx`) — do not add one.
- No changes to `tv_pamflets`, `/api/tv-pamflets`, or `/tv-pamflet` — video profile is added as a normal YouTube entry through the existing UI.
- No changes to the plain public (non-TV) `app/(public)/agenda/page.jsx`.
- Design source of truth: `docs/superpowers/specs/2026-07-10-agenda-tv-public-internal-split-design.md`.

---

### Task 1: Migration — add `agenda.tampil_publik`

**Files:**
- Create: `supabase/migrations/20260710000000_add_agenda_tampil_publik.sql`

**Interfaces:**
- Produces: `agenda.tampil_publik` (nullable-never, `BOOLEAN NOT NULL DEFAULT false`). Consumed by Task 2 (write path) and Task 4 (public-page read filter).

- [ ] **Step 1: Write the migration**

Create `supabase/migrations/20260710000000_add_agenda_tampil_publik.sql`:

```sql
-- Migration: Add agenda tampil_publik visibility flag
-- Created: 2026-07-10
-- Description: Distinguishes agenda that are safe to show on the public TV
-- display (/agenda/tv) from internal-only agenda, which only appear on the
-- unauthenticated internal display (/agenda/tv-internal). Defaults to false
-- for both existing rows and new rows — nothing is public until a staff
-- member explicitly marks it, per the approved design.

ALTER TABLE agenda ADD COLUMN IF NOT EXISTS tampil_publik BOOLEAN NOT NULL DEFAULT false;
```

- [ ] **Step 2: Sanity-check the SQL file**

There is no local Postgres/Supabase CLI configured in this environment — this migration must be applied to the real Supabase project by the user (same pattern as prior migrations in this repo, e.g. `20260707000000_fix_invoice_number_race.sql`).

Run: `grep -c ";" supabase/migrations/20260710000000_add_agenda_tampil_publik.sql`
Expected: `1` (a single `ALTER TABLE` statement).

- [ ] **Step 3: Commit**

```bash
git add supabase/migrations/20260710000000_add_agenda_tampil_publik.sql
git commit -m "$(cat <<'EOF'
feat: add agenda.tampil_publik visibility flag

Defaults to false so no existing or new agenda is public until staff
explicitly mark it, per the approved design.
EOF
)"
```

- [ ] **Step 4: Remind whoever runs this plan**

This step has no code — the migration is committed but not yet applied to the live Supabase project. Tasks 2 and 4 will not show real effects in production until it's applied via the Supabase SQL Editor or `supabase db push`.

---

### Task 2: Agenda visibility input (form + context + list badges)

**Files:**
- Modify: `context/AgendaContext.jsx:60-76`
- Modify: `app/(dashboard)/kelola-agenda/page.jsx` (form state ~line 506-527, submit handler ~line 565-579, JSX form ~line 603-608, card-view badge ~line 305-308, table-view badge ~line 441-443)

**Interfaces:**
- Consumes: `agenda.tampil_publik` column from Task 1.
- Produces: agenda rows created/edited through this form carry a `tampil_publik` boolean matching what staff checked. Consumed by Task 4 (public-page filter query) and by staff visually via the list badges.

- [ ] **Step 1: Make `addAgenda` include `tampil_publik`**

`context/AgendaContext.jsx` builds an explicit allowlisted object in `addAgenda` — a field not listed there is silently dropped on insert, unlike `updateAgenda` which passes the raw object through. Find (around line 60-76):

```js
      const agendaData = {
        judul: item.judul || '',
        jenis: item.jenis || 'internal',
        tanggal_mulai: item.tanggal_mulai || new Date().toISOString().split('T')[0],
        tanggal_selesai: item.tanggal_selesai || item.tanggal_mulai || new Date().toISOString().split('T')[0],
        waktu_mulai: item.waktu_mulai || null,
        waktu_selesai: item.waktu_selesai || null,
        lokasi: item.lokasi || '',
        link_meeting: item.link_meeting || null,
        penyelenggara: item.penyelenggara || '',
        unit_kerja: item.unit_kerja || null,
        deskripsi: item.deskripsi || '',
        disposisi: item.disposisi || null,
        pic: item.pic || null,
        status: item.status || 'upcoming',
        created_by: user?.id || null
      };
```

Replace it with:

```js
      const agendaData = {
        judul: item.judul || '',
        jenis: item.jenis || 'internal',
        tanggal_mulai: item.tanggal_mulai || new Date().toISOString().split('T')[0],
        tanggal_selesai: item.tanggal_selesai || item.tanggal_mulai || new Date().toISOString().split('T')[0],
        waktu_mulai: item.waktu_mulai || null,
        waktu_selesai: item.waktu_selesai || null,
        lokasi: item.lokasi || '',
        link_meeting: item.link_meeting || null,
        penyelenggara: item.penyelenggara || '',
        unit_kerja: item.unit_kerja || null,
        deskripsi: item.deskripsi || '',
        disposisi: item.disposisi || null,
        pic: item.pic || null,
        status: item.status || 'upcoming',
        tampil_publik: item.tampil_publik ?? false,
        created_by: user?.id || null
      };
```

`updateAgenda` (around line 106-117) needs no change — it already does `.update(item)` with the raw object, so any `tampil_publik` field on the object passed in flows through automatically.

- [ ] **Step 2: Add `tampil_publik` to the form's initial state**

`app/(dashboard)/kelola-agenda/page.jsx` — find the `AgendaModal` function's initial `form` state (around line 510-527):

```js
  const [form, setForm] = useState({
    judul: item?.judul || '',
    tanggal_mulai: item?.tanggal_mulai || '',
    tanggal_selesai: item?.tanggal_selesai || '',
    waktu_mulai: item?.waktu_mulai || '',
    waktu_selesai: item?.waktu_selesai || '',
    lokasi: item?.lokasi || '',
    link_meeting: item?.link_meeting || '',
    deskripsi: item?.deskripsi || '',
    unit_kerja: item?.jenis === 'internal' ? (UNIT_KERJA_LIST.some(u => u.value === item?.penyelenggara) ? item?.penyelenggara : 'lainnya') : '',
    unit_kerja_manual: item?.jenis === 'internal' && !UNIT_KERJA_LIST.some(u => u.value === item?.penyelenggara) ? item?.penyelenggara : '',
    penyelenggara_eksternal: item?.jenis === 'eksternal' ? item.penyelenggara.replace('External - ', '') : '',
    pimpinan_select: item?.jenis === 'pimpinan' && PIMPINAN_LIST.some(p => p.value === item.penyelenggara) ? item.penyelenggara : '',
    pimpinan_manual: item?.jenis === 'pimpinan' && !PIMPINAN_LIST.some(p => p.value === item.penyelenggara) ? item.penyelenggara : '',
    disposisi_staff: item?.disposisi || '',
    pic_select: item?.pic && !item?.pic.startsWith('Manual: ') && PIC_LIST.some(p => p.value === item.pic) ? item.pic : '',
    pic_manual: item?.pic?.startsWith('Manual: ') ? item.pic.replace('Manual: ', '') : '',
  })
```

Add `tampil_publik` as the last field before the closing `})`:

```js
  const [form, setForm] = useState({
    judul: item?.judul || '',
    tanggal_mulai: item?.tanggal_mulai || '',
    tanggal_selesai: item?.tanggal_selesai || '',
    waktu_mulai: item?.waktu_mulai || '',
    waktu_selesai: item?.waktu_selesai || '',
    lokasi: item?.lokasi || '',
    link_meeting: item?.link_meeting || '',
    deskripsi: item?.deskripsi || '',
    unit_kerja: item?.jenis === 'internal' ? (UNIT_KERJA_LIST.some(u => u.value === item?.penyelenggara) ? item?.penyelenggara : 'lainnya') : '',
    unit_kerja_manual: item?.jenis === 'internal' && !UNIT_KERJA_LIST.some(u => u.value === item?.penyelenggara) ? item?.penyelenggara : '',
    penyelenggara_eksternal: item?.jenis === 'eksternal' ? item.penyelenggara.replace('External - ', '') : '',
    pimpinan_select: item?.jenis === 'pimpinan' && PIMPINAN_LIST.some(p => p.value === item.penyelenggara) ? item.penyelenggara : '',
    pimpinan_manual: item?.jenis === 'pimpinan' && !PIMPINAN_LIST.some(p => p.value === item.penyelenggara) ? item.penyelenggara : '',
    disposisi_staff: item?.disposisi || '',
    pic_select: item?.pic && !item?.pic.startsWith('Manual: ') && PIC_LIST.some(p => p.value === item.pic) ? item.pic : '',
    pic_manual: item?.pic?.startsWith('Manual: ') ? item.pic.replace('Manual: ', '') : '',
    tampil_publik: item?.tampil_publik || false,
  })
```

- [ ] **Step 3: Include `tampil_publik` in the submitted object**

Find `handleSubmit`'s `newItem` object (around line 565-579):

```js
    const newItem = {
      ...(item?.id && { id: item.id }), // Hanya sertakan ID jika edit
      judul: form.judul,
      tanggal_mulai: form.tanggal_mulai,
      tanggal_selesai: form.tanggal_selesai,
      waktu_mulai: form.waktu_mulai || null,
      waktu_selesai: form.waktu_selesai || null,
      lokasi: form.lokasi,
      link_meeting: form.link_meeting || null,
      jenis,
      penyelenggara: getPenyelenggara(),
      deskripsi: form.deskripsi,
      disposisi: jenis === 'pimpinan' && form.disposisi_staff ? form.disposisi_staff : null,
      pic: jenis === 'pimpinan' ? null : picValue,
    }
    onSave(newItem)
```

Replace it with:

```js
    const newItem = {
      ...(item?.id && { id: item.id }), // Hanya sertakan ID jika edit
      judul: form.judul,
      tanggal_mulai: form.tanggal_mulai,
      tanggal_selesai: form.tanggal_selesai,
      waktu_mulai: form.waktu_mulai || null,
      waktu_selesai: form.waktu_selesai || null,
      lokasi: form.lokasi,
      link_meeting: form.link_meeting || null,
      jenis,
      penyelenggara: getPenyelenggara(),
      deskripsi: form.deskripsi,
      disposisi: jenis === 'pimpinan' && form.disposisi_staff ? form.disposisi_staff : null,
      pic: jenis === 'pimpinan' ? null : picValue,
      tampil_publik: form.tampil_publik,
    }
    onSave(newItem)
```

- [ ] **Step 4: Add the checkbox to the form JSX**

Find the "Jenis Kegiatan" section (around line 603-608):

```jsx
            <div className="form-section">
              <label style={{ fontSize: '0.8125rem', fontWeight: 500, marginBottom: '0.375rem', display: 'block' }}>
                Jenis Kegiatan
              </label>
              <JenisToggle value={jenis} onChange={setJenis} />
            </div>
```

Replace it with (adding the checkbox directly after):

```jsx
            <div className="form-section">
              <label style={{ fontSize: '0.8125rem', fontWeight: 500, marginBottom: '0.375rem', display: 'block' }}>
                Jenis Kegiatan
              </label>
              <JenisToggle value={jenis} onChange={setJenis} />
            </div>

            <div className="form-section">
              <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.8125rem', fontWeight: 500, cursor: 'pointer' }}>
                <input
                  type="checkbox"
                  checked={form.tampil_publik}
                  onChange={e => setForm({ ...form, tampil_publik: e.target.checked })}
                />
                Tampilkan di TV Publik
              </label>
              <p className="muted" style={{ fontSize: '0.6875rem', marginTop: '0.25rem' }}>
                Jika dicentang, agenda ini akan muncul di layar TV lobby publik. Jika tidak, agenda hanya terlihat di layar TV internal.
              </p>
            </div>
```

- [ ] **Step 5: Add a "Publik" indicator badge next to the existing Jenis badge (card view)**

Find (around line 305-308):

```jsx
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                <StatusBadge tanggalMulai={item.tanggal_mulai} tanggalSelesai={item.tanggal_selesai} />
                <JenisBadge jenis={item.jenis} />
              </div>
```

Replace it with:

```jsx
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                <StatusBadge tanggalMulai={item.tanggal_mulai} tanggalSelesai={item.tanggal_selesai} />
                <JenisBadge jenis={item.jenis} />
                {item.tampil_publik && (
                  <span className="badge" style={{ background: 'var(--success-bg)', color: 'var(--success)', fontSize: '0.625rem' }}>
                    Publik
                  </span>
                )}
              </div>
```

- [ ] **Step 6: Add the same indicator to the table view**

Find (around line 441-443):

```jsx
              <td>
                <JenisBadge jenis={item.jenis} />
              </td>
```

Replace it with:

```jsx
              <td>
                <div style={{ display: 'flex', gap: '0.25rem', flexWrap: 'wrap' }}>
                  <JenisBadge jenis={item.jenis} />
                  {item.tampil_publik && (
                    <span className="badge" style={{ background: 'var(--success-bg)', color: 'var(--success)', fontSize: '0.625rem' }}>
                      Publik
                    </span>
                  )}
                </div>
              </td>
```

- [ ] **Step 7: Build**

Run: `npm run build 2>&1 | tail -30`
Expected: `✓ Compiled successfully`, no errors in `context/AgendaContext.jsx` or `app/(dashboard)/kelola-agenda/page.jsx`.

- [ ] **Step 8: Manual verification**

Requires Task 1's migration applied to the database first. Start the dev server, log in, go to `/kelola-agenda`, create a new agenda with "Tampilkan di TV Publik" checked, save, and confirm: (a) the "Publik" badge appears next to it in the list, (b) editing it back off and saving removes the badge, (c) in the Supabase table editor (or via SQL), the row's `tampil_publik` column matches what was checked.

- [ ] **Step 9: Commit**

```bash
git add context/AgendaContext.jsx "app/(dashboard)/kelola-agenda/page.jsx"
git commit -m "$(cat <<'EOF'
feat: add "Tampilkan di TV Publik" toggle to agenda form

Lets staff mark which agenda are safe for the public TV display,
independent of the existing jenis (activity type) field.
EOF
)"
```

---

### Task 3: Extract shared TV helpers and `AgendaTvTable` component (no behavior change)

**Files:**
- Create: `app/(public)/agenda/tv/shared.js`
- Create: `app/(public)/agenda/tv/AgendaTvTable.jsx`
- Modify: `app/(public)/agenda/tv/page.jsx` (remove extracted code, consume new modules — no visual/behavioral change in this task)

**Interfaces:**
- Produces from `shared.js`: `MONTHS`, `MONTHS_L`, `DAYS` (arrays), `formatTime(t)`, `getAgendaStatus(mulai, selesai)`, `sortActiveAgenda(agenda)` (filters out completed + sorts by start date/time), `DARK`, `LIGHT` (theme objects), `useStageScale()` (returns `{ s, width, height }`), `useTheme()` (returns `{ isDark, t, toggle }`), `useClock()` (returns `Date | null`).
- Produces from `AgendaTvTable.jsx`: default export `AgendaTvTable({ agenda, t, scale })` — `agenda` must already be filtered/sorted (i.e., the output of `sortActiveAgenda`). Renders the table head, paginated rows, and the page-dots/progress pager as one card, auto-rotating pages every 15s and responding to ArrowLeft/ArrowRight keys. Consumed by this task's `tv/page.jsx` and by Task 5's new `tv-internal/page.jsx`.
- Consumes: `getUnitColor` from `./unit-colors` (already exists in this directory, unchanged).

- [ ] **Step 1: Create `shared.js`**

Create `app/(public)/agenda/tv/shared.js`:

```js
// Helper functions, theme data, dan hooks yang dipakai bersama oleh halaman TV
// publik (./page.jsx), halaman TV internal (../tv-internal/page.jsx), dan
// komponen tabel bersama (./AgendaTvTable.jsx).

import { useState, useEffect, useCallback } from 'react'

export const MONTHS   = ['Jan','Feb','Mar','Apr','Mei','Jun','Jul','Agu','Sep','Okt','Nov','Des']
export const MONTHS_L = ['Januari','Februari','Maret','April','Mei','Juni','Juli','Agustus','September','Oktober','November','Desember']
export const DAYS     = ['Minggu','Senin','Selasa','Rabu','Kamis','Jumat','Sabtu']

export const formatTime = (t) => {
  if (!t) return '--:--'
  const p = String(t).split(':')
  return `${p[0].padStart(2,'0')}:${(p[1]||'00').padStart(2,'0')}`
}

export const getAgendaStatus = (mulai, selesai) => {
  const today = new Date(); today.setHours(0,0,0,0)
  const s = new Date(mulai); s.setHours(0,0,0,0)
  const e = new Date(selesai); e.setHours(0,0,0,0)
  if (today > e) return 'completed'
  if (today >= s) return 'ongoing'
  return Math.ceil((s - today) / 86400000) <= 3 ? 'upcoming_soon' : 'upcoming'
}

// Buang agenda yang sudah lewat (completed) dan urutkan berdasarkan tanggal+jam
// mulai. Dipakai oleh kedua halaman TV supaya urutan/filter tampilan konsisten.
export const sortActiveAgenda = (agenda) =>
  agenda
    .filter(a => getAgendaStatus(a.tanggal_mulai, a.tanggal_selesai) !== 'completed')
    .sort((a, b) => new Date(a.tanggal_mulai + 'T' + (a.waktu_mulai || '00:00')) - new Date(b.tanggal_mulai + 'T' + (b.waktu_mulai || '00:00')))

// ============ TEMA ============
export const DARK = {
  bg: '#0a1228', bg2: '#0f1a3a', card: '#142a5e', card2: '#1a3370',
  border: 'rgba(255,255,255,0.08)', accent: '#f5b915', primary: '#4f7df9',
  text: '#ffffff', text2: 'rgba(255,255,255,0.7)', text3: 'rgba(255,255,255,0.5)',
  success: '#10b981',
  stageBg: 'radial-gradient(ellipse 1920px 600px at 20% 0%, rgba(79,125,249,0.18), transparent 60%), radial-gradient(ellipse 800px 600px at 100% 100%, rgba(245,185,21,0.12), transparent 65%), linear-gradient(180deg, #0a1228 0%, #0f1a3a 100%)',
  rowOngoing: 'linear-gradient(90deg, rgba(16,185,129,0.18), rgba(16,185,129,0.04))',
  rowSoon: 'linear-gradient(90deg, rgba(245,185,21,0.12), transparent)',
  theadBg: 'rgba(255,255,255,0.04)',
  featuredBg: 'linear-gradient(135deg, rgba(245,185,21,0.18), rgba(245,185,21,0.04))',
  featuredBorder: 'rgba(245,185,21,0.3)',
  footerBg: 'linear-gradient(90deg, rgba(245,185,21,0.16), rgba(79,125,249,0.16))',
  statusOngoingBg: 'rgba(16,185,129,0.2)', statusOngoingFg: '#34d399',
  statusSoonBg: 'rgba(245,185,21,0.2)', statusSoonFg: '#f5b915',
  statusUpcomingBg: 'rgba(79,125,249,0.2)', statusUpcomingFg: '#4f7df9',
}
export const LIGHT = {
  bg: '#f5f7fb', bg2: '#ffffff', card: '#ffffff', card2: '#f8fafc',
  border: '#e4e7ee', accent: '#c98800', primary: '#1e3a8a',
  text: '#0f172a', text2: '#475569', text3: '#94a3b8',
  success: '#047857',
  stageBg: 'radial-gradient(ellipse 1920px 600px at 20% 0%, rgba(30,58,138,0.08), transparent 60%), radial-gradient(ellipse 800px 600px at 100% 100%, rgba(245,185,21,0.10), transparent 65%), linear-gradient(180deg, #f5f7fb 0%, #ffffff 100%)',
  rowOngoing: 'linear-gradient(90deg, rgba(4,120,87,0.10), rgba(4,120,87,0.02))',
  rowSoon: 'linear-gradient(90deg, rgba(245,185,21,0.12), transparent)',
  theadBg: '#f8fafc',
  featuredBg: 'linear-gradient(135deg, rgba(245,185,21,0.18), rgba(245,185,21,0.04))',
  featuredBorder: 'rgba(201,136,0,0.35)',
  footerBg: 'linear-gradient(90deg, rgba(245,185,21,0.18), rgba(30,58,138,0.10))',
  statusOngoingBg: 'rgba(4,120,87,0.12)', statusOngoingFg: '#047857',
  statusSoonBg: 'rgba(245,185,21,0.18)', statusSoonFg: '#b45309',
  statusUpcomingBg: 'rgba(30,58,138,0.10)', statusUpcomingFg: '#1e3a8a',
}

// ============ HOOKS ============
export function useStageScale() {
  const [scale, setScale] = useState({ s: 1, width: 1920, height: 1080 })

  useEffect(() => {
    if (typeof window === 'undefined') return

    const update = () => {
      const w = window.innerWidth || 1920
      const h = window.innerHeight || 1080
      const scaleX = w / 1920
      const scaleY = h / 1080
      const s = Math.min(scaleX, scaleY)
      setScale({ s, width: w, height: h })
    }

    update()
    window.addEventListener('resize', update)
    return () => window.removeEventListener('resize', update)
  }, [])

  return scale
}

export function useTheme() {
  const [isDark, setIsDark] = useState(true)
  useEffect(() => {
    if (typeof window === 'undefined') return
    try {
      const s = localStorage.getItem('simdir-tv-theme')
      if (s === 'light') setIsDark(false)
      else if (s === 'dark') setIsDark(true)
    } catch {}
  }, [])
  const toggle = useCallback(() => setIsDark(p => {
    const next = !p
    if (typeof window !== 'undefined') {
      try { localStorage.setItem('simdir-tv-theme', next ? 'dark' : 'light') } catch {}
    }
    return next
  }), [])
  return { isDark, t: isDark ? DARK : LIGHT, toggle }
}

export function useClock() {
  const [now, setNow] = useState(null)
  useEffect(() => {
    if (typeof window === 'undefined') return
    setNow(new Date())
    const id = setInterval(() => setNow(new Date()), 1000)
    return () => clearInterval(id)
  }, [])
  return now
}
```

- [ ] **Step 2: Create `AgendaTvTable.jsx`**

Create `app/(public)/agenda/tv/AgendaTvTable.jsx`:

```jsx
'use client'

import { useState, useEffect, useMemo, useRef } from 'react'
import { getUnitColor } from './unit-colors'
import { formatTime, getAgendaStatus, MONTHS } from './shared'

const ROTATE_MS = 15000

// ============ TABLE ROW ============
function AgendaTableRow({ item, num, t }) {
  const st        = getAgendaStatus(item.tanggal_mulai, item.tanggal_selesai)
  const d         = new Date(item.tanggal_mulai)
  const unitColor = getUnitColor(item.jenis, item.penyelenggara)

  const rowBg   = st === 'ongoing' ? t.rowOngoing : st === 'upcoming_soon' ? t.rowSoon : unitColor.bg
  const borderL = `0.3vw solid ${st === 'ongoing' ? t.success : unitColor.border}`

  const statusMap = {
    ongoing:      { txt: 'Berlangsung', bg: t.statusOngoingBg,  fg: t.statusOngoingFg,  pulse: true  },
    upcoming_soon:{ txt: 'Segera',      bg: t.statusSoonBg,     fg: t.statusSoonFg,     pulse: false },
    upcoming:     { txt: 'Akan Datang', bg: t.statusUpcomingBg, fg: t.statusUpcomingFg, pulse: false },
  }
  const sCfg = statusMap[st] || statusMap.upcoming

  return (
    <div style={{
      display: 'grid',
      gridTemplateColumns: '4vw 13vw 1fr 18vw 13vw',
      gap: '1vw',
      padding: '1.8vh 1.5vw',
      alignItems: 'center',
      borderBottom: `1px solid ${t.border}`,
      flex: 1,
      minHeight: 0,
      background: rowBg,
      borderLeft: borderL
    }}>
      <div style={{ display: 'flex', alignItems: 'center', overflow: 'hidden', minWidth: 0 }}>
        <span style={{ fontFamily: '"JetBrains Mono", monospace', fontSize: '1.8vw', fontWeight: 700, color: t.text3 }}>
          {String(num).padStart(2, '0')}
        </span>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', justifyContent: 'center', gap: '0.4vw', overflow: 'hidden', minWidth: 0 }}>
        <div>
          <span style={{ fontSize: '1.7vw', fontWeight: 700, color: t.text }}>{d.getDate()}</span>
          {' '}
          <span style={{ fontSize: '1.4vw', fontWeight: 600, color: t.text }}>{MONTHS[d.getMonth()]}</span>
        </div>
        <span style={{ fontFamily: '"JetBrains Mono", monospace', fontSize: '1.1vw', color: t.text3, letterSpacing: '0.03em' }}>
          {formatTime(item.waktu_mulai)} – {formatTime(item.waktu_selesai)}
        </span>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', justifyContent: 'center', gap: '0.3vw', overflow: 'hidden', minWidth: 0 }}>
        <span style={{
          fontSize: '1.35vw',
          fontWeight: 700,
          lineHeight: 1.3,
          color: t.text,
          display: '-webkit-box',
          WebkitLineClamp: 2,
          WebkitBoxOrient: 'vertical',
          overflow: 'hidden',
        }}>
          {item.judul}
        </span>
        {item.penyelenggara && (
          <span style={{
            fontSize: '1vw', fontWeight: 700,
            color: unitColor.text,
            background: unitColor.bg,
            border: `0.1vw solid ${unitColor.border}`,
            padding: '0.2vw 0.6vw', borderRadius: 999,
            whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '100%',
            display: 'inline-block',
          }}>
            {item.penyelenggara}
          </span>
        )}
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5vw', overflow: 'hidden', minWidth: 0 }}>
        <svg viewBox="0 0 24 24" fill="none" stroke={t.text3} strokeWidth="2" style={{ width: '1.2vw', height: '1.2vw', flexShrink: 0 }}><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>
        <span style={{ fontSize: '1.2vw', color: t.text2, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{item.lokasi || '—'}</span>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', overflow: 'hidden', minWidth: 0 }}>
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4vw', padding: '0.5vw 0.9vw', borderRadius: 999, fontSize: '1vw', fontWeight: 700, letterSpacing: '0.02em', textTransform: 'uppercase', background: sCfg.bg, color: sCfg.fg, whiteSpace: 'nowrap' }}>
          {sCfg.pulse && (
            <span style={{ width: '0.7vw', height: '0.7vw', borderRadius: '50%', background: 'currentColor', animation: 'dotpulse 1.5s infinite' }} />
          )}
          {sCfg.txt}
        </span>
      </div>
    </div>
  )
}

// ============ AGENDA TV TABLE (tabel + pagination + auto-rotate) ============
// Dipakai oleh halaman publik (./page.jsx, di kolom kiri berdampingan dengan
// panel media) dan halaman internal (../tv-internal/page.jsx, full-width
// tanpa panel media). `agenda` harus sudah difilter (buang yang completed)
// dan diurutkan oleh pemanggil — lihat `sortActiveAgenda` di ./shared.js.
// Membutuhkan keyframe CSS `dotpulse` didefinisikan secara global oleh
// halaman pemanggil (lihat <style> di page.jsx / tv-internal/page.jsx).
export default function AgendaTvTable({ agenda, t, scale }) {
  const [currentPage, setCurrentPage] = useState(0)
  const [progress, setProgress] = useState(0)
  const [rowsPerPage, setRowsPerPage] = useState(6)

  const tbodyRef = useRef(null)
  useEffect(() => {
    if (typeof window === 'undefined' || !tbodyRef.current) return
    const el = tbodyRef.current
    const ro = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const h = entry.contentRect.height
        const minRowH = Math.max(70, 85 * scale.s)
        const rows = Math.max(4, Math.min(14, Math.floor(h / minRowH)))
        setRowsPerPage(rows)
      }
    })
    ro.observe(el)
    return () => ro.disconnect()
  }, [scale.s])

  const totalPages  = Math.max(1, Math.ceil(agenda.length / rowsPerPage))
  const currentRows = useMemo(() => agenda.slice(currentPage * rowsPerPage, (currentPage + 1) * rowsPerPage), [agenda, currentPage, rowsPerPage])
  const emptyCount  = Math.max(0, rowsPerPage - currentRows.length)

  // Navigasi halaman lewat panah kiri/kanan keyboard
  useEffect(() => {
    if (typeof window === 'undefined') return
    const handler = (e) => {
      if (e.key === 'ArrowLeft')  setCurrentPage(p => Math.max(0, p - 1))
      if (e.key === 'ArrowRight') setCurrentPage(p => Math.min(totalPages - 1, p + 1))
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [totalPages])

  const pageRef = useRef(currentPage)
  useEffect(() => { pageRef.current = currentPage }, [currentPage])

  useEffect(() => {
    if (typeof window === 'undefined') return
    if (totalPages <= 1) { setProgress(0); return }
    const id = setInterval(() => {
      setProgress(prev => {
        if (prev >= 100) {
          setCurrentPage((pageRef.current + 1) % totalPages)
          return 0
        }
        return prev + (100 / (ROTATE_MS / 100))
      })
    }, 100)
    return () => clearInterval(id)
  }, [totalPages])

  useEffect(() => { setProgress(0) }, [currentPage])
  useEffect(() => { setCurrentPage(0); setProgress(0) }, [totalPages])

  return (
    <div style={{ background: t.card, border: `1px solid ${t.border}`, borderRadius: '0.8vw', display: 'flex', flexDirection: 'column', overflow: 'hidden', minWidth: 0, height: '100%' }}>
      {/* Table head */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: '4vw 13vw 1fr 18vw 13vw',
        gap: '1vw',
        padding: '1.2vh 1.5vw',
        background: t.theadBg,
        borderBottom: `1px solid ${t.border}`,
        fontSize: '1vw',
        fontWeight: 700,
        letterSpacing: '0.06em',
        textTransform: 'uppercase',
        color: t.text2,
        flexShrink: 0
      }}>
        {['No', 'Tanggal', 'Judul Kegiatan', 'Lokasi', 'Status'].map(col => (
          <div key={col}>{col}</div>
        ))}
      </div>
      {/* Table body */}
      <div ref={tbodyRef} style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        {currentRows.map((item, i) => (
          <AgendaTableRow key={item.id} item={item} num={currentPage * rowsPerPage + i + 1} t={t} />
        ))}
        {Array.from({ length: emptyCount }).map((_, i) => (
          <div key={`e${i}`} style={{ flex: 1, minHeight: 0, borderBottom: `1px solid ${t.border}` }} />
        ))}
      </div>
      {/* Pager */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '1vw', padding: '1.4vh 1.8vw', borderTop: `1px solid ${t.border}`, flexShrink: 0 }}>
        <span style={{ fontSize: '0.9vw', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: t.text3 }}>Halaman</span>
        <div style={{ flex: 1, height: '0.6vh', background: t.border, borderRadius: 999, overflow: 'hidden', minWidth: '5vw' }}>
          <div style={{ width: `${progress}%`, height: '100%', background: `linear-gradient(90deg, ${t.accent}, #ffd34d)`, transition: 'width 0.1s linear' }} />
        </div>
        <div style={{ display: 'flex', gap: '0.5vw' }}>
          {Array.from({ length: totalPages }, (_, i) => (
            <button key={i} onClick={() => { setCurrentPage(i); setProgress(0) }} style={{ width: i === currentPage ? '1.8vw' : '0.6vw', height: '0.6vw', borderRadius: 999, background: i === currentPage ? t.accent : t.border, border: 'none', cursor: 'pointer', transition: 'all 0.3s', padding: 0 }} />
          ))}
        </div>
        <span style={{ fontFamily: '"JetBrains Mono", monospace', fontSize: '1.1vw', color: t.text2, fontWeight: 600 }}>
          {currentPage + 1}/{totalPages}
        </span>
      </div>
    </div>
  )
}
```

Note: the original `AgendaTableRow` in `page.jsx` computed an unused `pic` variable (`item.jenis === 'pimpinan' && item.disposisi ? ...`) that was never rendered in any column — it's dropped here since it's dead code, not a behavior change (nothing consumed it).

- [ ] **Step 3: Update `tv/page.jsx` to consume the extracted modules**

Open `app/(public)/agenda/tv/page.jsx`. Make the following changes, in order:

**3a. Replace the imports and delete now-duplicated top-level code.** Find the top of the file:

```jsx
'use client'

import { useState, useEffect, useMemo, useRef, useCallback } from 'react'
import { supabase } from '@/lib/supabase/client'
// MEDIA_CONFIG dihapus — semua media (gambar + YouTube) sekarang dari /api/tv-pamflets
import { getUnitColor, UNIT_COLORS } from './unit-colors'

// ============ HELPERS ============
const MONTHS     = ['Jan','Feb','Mar','Apr','Mei','Jun','Jul','Agu','Sep','Okt','Nov','Des']
const MONTHS_L   = ['Januari','Februari','Maret','April','Mei','Juni','Juli','Agustus','September','Oktober','November','Desember']
const DAYS       = ['Minggu','Senin','Selasa','Rabu','Kamis','Jumat','Sabtu']

const formatTime = (t) => {
  if (!t) return '--:--'
  const p = String(t).split(':')
  return `${p[0].padStart(2,'0')}:${(p[1]||'00').padStart(2,'0')}`
}

const getAgendaStatus = (mulai, selesai) => {
  const today = new Date(); today.setHours(0,0,0,0)
  const s = new Date(mulai); s.setHours(0,0,0,0)
  const e = new Date(selesai); e.setHours(0,0,0,0)
  if (today > e) return 'completed'
  if (today >= s) return 'ongoing'
  return Math.ceil((s - today) / 86400000) <= 3 ? 'upcoming_soon' : 'upcoming'
}

const getCountdown = (item) => {
```

Replace it with (keeping `getCountdown` and everything after it unchanged for now):

```jsx
'use client'

import { useState, useEffect, useMemo, useRef, useCallback } from 'react'
import { supabase } from '@/lib/supabase/client'
// MEDIA_CONFIG dihapus — semua media (gambar + YouTube) sekarang dari /api/tv-pamflets
import { UNIT_COLORS } from './unit-colors'
import { MONTHS, MONTHS_L, DAYS, formatTime, getAgendaStatus, sortActiveAgenda, DARK, LIGHT, useStageScale, useTheme, useClock } from './shared'
import AgendaTvTable from './AgendaTvTable'

const getCountdown = (item) => {
```

(`getUnitColor` is no longer used directly in `page.jsx` — only `AgendaTvTable.jsx` needs it now, via its own import.)

**3b. Delete the now-duplicated theme, WMO stays, and hook definitions.** Find:

```jsx
// ============ TEMA ============
const DARK = {
```

through (this spans the DARK object, LIGHT object, WMO codes, ROTATE_MS, and the three hooks — everything from `DARK` up to but not including `useWeather`):

```jsx
function useClock() {
  const [now, setNow] = useState(null)
  useEffect(() => {
    if (typeof window === 'undefined') return
    setNow(new Date())
    const id = setInterval(() => setNow(new Date()), 1000)
    return () => clearInterval(id)
  }, [])
  return now
}

function useWeather() {
```

Replace that whole span with just:

```jsx
// ============ WMO WEATHER CODES ============
const WMO = {
  0:{icon:'☀️',label:'Cerah'}, 1:{icon:'🌤️',label:'Cerah Berawan'},
  2:{icon:'⛅',label:'Berawan Sebagian'}, 3:{icon:'☁️',label:'Berawan'},
  45:{icon:'🌫️',label:'Berkabut'}, 48:{icon:'🌫️',label:'Kabut'},
  51:{icon:'🌦️',label:'Gerimis Ringan'}, 53:{icon:'🌦️',label:'Gerimis'}, 55:{icon:'🌦️',label:'Gerimis Lebat'},
  61:{icon:'🌧️',label:'Hujan Ringan'}, 63:{icon:'🌧️',label:'Hujan Sedang'}, 65:{icon:'🌧️',label:'Hujan Lebat'},
  80:{icon:'🌦️',label:'Hujan Ringan'}, 81:{icon:'🌧️',label:'Hujan'}, 82:{icon:'⛈️',label:'Hujan Deras'},
  95:{icon:'⛈️',label:'Badai Petir'}, 96:{icon:'⛈️',label:'Badai Petir'}, 99:{icon:'⛈️',label:'Badai Hebat'},
}

function useWeather() {
```

(This keeps `WMO` local to `page.jsx` since only the public page's weather widget uses it, and removes `DARK`, `LIGHT`, `ROTATE_MS`, `useStageScale`, `useTheme`, `useClock` — all now imported from `./shared`. `ROTATE_MS` also moves entirely into `AgendaTvTable.jsx`, where it's actually used; `page.jsx` no longer needs it.)

**3c. Delete `AgendaTableRow`** — it moved to `AgendaTvTable.jsx`. Find:

```jsx
// ============ TABLE ROW ============
const AgendaTableRow = ({ item, num, t }) => {
```

through its closing:

```jsx
    </div>
  )
}

// ============ HALAMAN UTAMA ============
export default function AgendaTVPage() {
```

Replace with just:

```jsx
// ============ HALAMAN UTAMA ============
export default function AgendaTVPage() {
```

**3d. The agenda query itself is untouched in this task** (still `supabase.from('agenda').select('*').order('tanggal_mulai', { ascending: true })`, no `tampil_publik` filter yet — that's Task 4's job, kept separate so this task stays a pure extraction with no behavior change).

**3e. Replace the `filtered` computation to use the shared helper.** Find:

```js
  const filtered = useMemo(() =>
    agenda
      .filter(a => getAgendaStatus(a.tanggal_mulai, a.tanggal_selesai) !== 'completed')
      .sort((a, b) => new Date(a.tanggal_mulai + 'T' + (a.waktu_mulai || '00:00')) - new Date(b.tanggal_mulai + 'T' + (b.waktu_mulai || '00:00')))
  , [agenda])
```

Replace it with:

```js
  const filtered = useMemo(() => sortActiveAgenda(agenda), [agenda])
```

**3f. Remove the pagination/rowsPerPage block that moved into `AgendaTvTable`.** Find:

```js
  const [rowsPerPage, setRowsPerPage] = useState(6)

  // Dynamic rows per page via ResizeObserver
  const tbodyRef = useRef(null)
  useEffect(() => {
    if (typeof window === 'undefined' || !tbodyRef.current) return
    const el = tbodyRef.current
    const ro = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const h = entry.contentRect.height
        const minRowH = Math.max(70, 85 * scale.s)
        const rows = Math.max(4, Math.min(14, Math.floor(h / minRowH)))
        setRowsPerPage(rows)
      }
    })
    ro.observe(el)
    return () => ro.disconnect()
  }, [scale.s])
  const totalPages  = Math.max(1, Math.ceil(filtered.length / rowsPerPage))
  const currentRows = useMemo(() => filtered.slice(currentPage * rowsPerPage, (currentPage + 1) * rowsPerPage), [filtered, currentPage])
  const emptyCount  = Math.max(0, rowsPerPage - currentRows.length)

  // Keyboard shortcuts
  useEffect(() => {
    if (typeof window === 'undefined' || typeof document === 'undefined') return
    const handler = (e) => {
      if (e.key === 'ArrowLeft')  setCurrentPage(p => Math.max(0, p - 1))
      if (e.key === 'ArrowRight') setCurrentPage(p => Math.min(totalPages - 1, p + 1))
      if (e.key === 'f' || e.key === 'F' || e.key === 'F11') {
        e.preventDefault()
        try {
          if (!document.fullscreenElement) {
            document.documentElement.requestFullscreen?.().catch(() => {})
          } else {
            document.exitFullscreen?.().catch(() => {})
          }
        } catch (err) {
          console.warn('Fullscreen error:', err)
        }
      }
      if (e.key === 't' || e.key === 'T') toggle()
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [toggle, totalPages])

  const pageRef = useRef(currentPage)
  useEffect(() => { pageRef.current = currentPage }, [currentPage])

  useEffect(() => {
    if (typeof window === 'undefined') return
    if (totalPages <= 1) { setProgress(0); return }
    const id = setInterval(() => {
      setProgress(prev => {
        if (prev >= 100) {
          setCurrentPage((pageRef.current + 1) % totalPages)
          return 0
        }
        return prev + (100 / (ROTATE_MS / 100))
      })
    }, 100)
    return () => clearInterval(id)
  }, [totalPages])

  useEffect(() => { setProgress(0) }, [currentPage])
  useEffect(() => { setCurrentPage(0); setProgress(0) }, [totalPages])
```

Replace it with just the fullscreen/theme keyboard shortcut (arrow-key page navigation now lives inside `AgendaTvTable`, which owns `currentPage`):

```js
  // Keyboard shortcuts (fullscreen, theme toggle — page navigation is handled
  // inside AgendaTvTable, which owns its own currentPage state)
  useEffect(() => {
    if (typeof window === 'undefined' || typeof document === 'undefined') return
    const handler = (e) => {
      if (e.key === 'f' || e.key === 'F' || e.key === 'F11') {
        e.preventDefault()
        try {
          if (!document.fullscreenElement) {
            document.documentElement.requestFullscreen?.().catch(() => {})
          } else {
            document.exitFullscreen?.().catch(() => {})
          }
        } catch (err) {
          console.warn('Fullscreen error:', err)
        }
      }
      if (e.key === 't' || e.key === 'T') toggle()
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [toggle])
```

Also remove the two now-unused state declarations just above this area:

```js
  const [currentPage, setCurrentPage] = useState(0)
  const [progress,    setProgress]    = useState(0)
```

(Delete these two lines entirely — `AgendaTvTable` owns this state now. Leave the other state declarations in the same block, `agenda`, `loading`, `error`, untouched.)

**3g. Replace the LEFT table block with `<AgendaTvTable>`.** Find:

```jsx
            {/* LEFT: Table */}
            <div style={{ background: t.card, border: `1px solid ${t.border}`, borderRadius: '0.8vw', display: 'flex', flexDirection: 'column', overflow: 'hidden', minWidth: 0 }}>
              {/* Table head */}
              <div style={{ 
                display: 'grid', 
                gridTemplateColumns: '4vw 13vw 1fr 18vw 13vw', 
                gap: '1vw', 
                padding: '1.2vh 1.5vw', 
                background: t.theadBg, 
                borderBottom: `1px solid ${t.border}`, 
                fontSize: '1vw', 
                fontWeight: 700, 
                letterSpacing: '0.06em', 
                textTransform: 'uppercase', 
                color: t.text2, 
                flexShrink: 0 
              }}>
                {['No', 'Tanggal', 'Judul Kegiatan', 'Lokasi', 'Status'].map(col => (
                  <div key={col}>{col}</div>
                ))}
              </div>
              {/* Table body */}
              <div ref={tbodyRef} style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
                {currentRows.map((item, i) => (
                  <AgendaTableRow key={item.id} item={item} num={currentPage * rowsPerPage + i + 1} t={t} />
                ))}
                {Array.from({ length: emptyCount }).map((_, i) => (
                  <div key={`e${i}`} style={{ flex: 1, minHeight: 0, borderBottom: `1px solid ${t.border}` }} />
                ))}
              </div>
            </div>
```

Replace it with:

```jsx
            {/* LEFT: Table */}
            <AgendaTvTable agenda={filtered} t={t} scale={scale} />
```

**3h. Remove the Pager block from the aside** — it's now part of `AgendaTvTable`. Find:

```jsx
              {/* Pager */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '1vw', background: t.card, border: `1px solid ${t.border}`, borderRadius: '1vw', padding: '1.4vh 1.8vw', flexShrink: 0 }}>
                <span style={{ fontSize: '0.9vw', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: t.text3 }}>Halaman</span>
                <div style={{ flex: 1, height: '0.6vh', background: t.border, borderRadius: 999, overflow: 'hidden', minWidth: '5vw' }}>
                  <div style={{ width: `${progress}%`, height: '100%', background: `linear-gradient(90deg, ${t.accent}, #ffd34d)`, transition: 'width 0.1s linear' }} />
                </div>
                <div style={{ display: 'flex', gap: '0.5vw' }}>
                  {Array.from({ length: totalPages }, (_, i) => (
                    <button key={i} onClick={() => { setCurrentPage(i); setProgress(0) }} style={{ width: i === currentPage ? '1.8vw' : '0.6vw', height: '0.6vw', borderRadius: 999, background: i === currentPage ? t.accent : t.border, border: 'none', cursor: 'pointer', transition: 'all 0.3s', padding: 0 }} />
                  ))}
                </div>
                <span style={{ fontFamily: '"JetBrains Mono", monospace', fontSize: '1.1vw', color: t.text2, fontWeight: 600 }}>
                  {currentPage + 1}/{totalPages}
                </span>
              </div>
            </aside>
```

Replace it with just:

```jsx
            </aside>
```

(Deleting the whole Pager `<div>...</div>` block, keeping the `</aside>` closing tag.)

- [ ] **Step 4: Build**

Run: `npm run build 2>&1 | tail -40`
Expected: `✓ Compiled successfully`, no errors referencing `page.jsx`, `AgendaTvTable.jsx`, or `shared.js`. Pay attention to any "is not defined" errors — they indicate a helper that got removed from `page.jsx` without being re-imported from `./shared`.

- [ ] **Step 5: Confirm no dead references remain**

Run: `grep -n "AgendaTableRow\|const DARK\|const LIGHT\|function useStageScale\|function useTheme\|function useClock" "app/(public)/agenda/tv/page.jsx"`
Expected: no output — all of these should now only exist in `shared.js` / `AgendaTvTable.jsx`, not duplicated in `page.jsx`.

- [ ] **Step 6: Manual no-behavior-change verification**

This task must not change what the public page looks like or does (the `tampil_publik` filter and ratio change are Task 4). Start the dev server, open `/agenda/tv` in a browser, and confirm: the table and media panel still render side by side in roughly the same proportions as before, agenda rows still display correctly, pagination dots/progress bar still work and still auto-advance every ~15s, arrow-key navigation still moves between pages, and the media rotator (pamphlets/YouTube) is unaffected.

- [ ] **Step 7: Commit**

```bash
git add "app/(public)/agenda/tv/shared.js" "app/(public)/agenda/tv/AgendaTvTable.jsx" "app/(public)/agenda/tv/page.jsx"
git commit -m "$(cat <<'EOF'
refactor: extract shared TV helpers and AgendaTvTable component

page.jsx mixed agenda-table rendering (rows, pagination, responsive
scaling) with media-rotation logic in one 1002-line file. Pulls the
table half into shared.js (helpers/theme/hooks) and AgendaTvTable.jsx
(table + pagination + pager), so the upcoming internal-only TV display
can reuse it without duplicating ~400 lines. No behavior change in this
commit — media rotation, ratio, and query are untouched.
EOF
)"
```

---

### Task 4: Public page changes — visibility filter + 40/60 ratio

**Files:**
- Modify: `app/(public)/agenda/tv/page.jsx`

**Interfaces:**
- Consumes: `agenda.tampil_publik` (Task 1), `AgendaTvTable`/`shared.js` (Task 3).

- [ ] **Step 1: Filter the query to public-only agenda**

Find:

```js
      const { data, error: err } = await supabase.from('agenda').select('*').order('tanggal_mulai', { ascending: true })
```

Replace it with:

```js
      const { data, error: err } = await supabase.from('agenda').select('*').eq('tampil_publik', true).order('tanggal_mulai', { ascending: true })
```

- [ ] **Step 2: Change the layout ratio from 63/37 to 40/60**

Find:

```jsx
          <main style={{ 
            display: 'grid', 
            gridTemplateColumns: '2.2fr 1fr', 
            gap: '1.2vw', 
            padding: '1.5vh 1.5vw', 
            flex: 1,
            minHeight: 0, 
            overflow: 'hidden' 
          }}>
```

Replace it with:

```jsx
          <main style={{ 
            display: 'grid', 
            gridTemplateColumns: '2fr 3fr', 
            gap: '1.2vw', 
            padding: '1.5vh 1.5vw', 
            flex: 1,
            minHeight: 0, 
            overflow: 'hidden' 
          }}>
```

(`2fr 3fr` = 40% / 60% — agenda table becomes the smaller left column, media panel becomes the larger right column, per the approved design.)

- [ ] **Step 3: Build**

Run: `npm run build 2>&1 | tail -30`
Expected: `✓ Compiled successfully`.

- [ ] **Step 4: Manual verification**

Requires Task 1's migration applied. Start the dev server:
1. In `/kelola-agenda`, ensure at least one agenda has "Tampilkan di TV Publik" checked and at least one does not.
2. Open `/agenda/tv` — confirm only the checked agenda appears in the table, and the media panel (right) now visibly takes up more width than the table (left) compared to before.
3. Confirm the pamphlet/YouTube rotation on the right still works exactly as before (unaffected by the ratio change, just resized).

- [ ] **Step 5: Commit**

```bash
git add "app/(public)/agenda/tv/page.jsx"
git commit -m "$(cat <<'EOF'
feat: filter public TV display to tampil_publik agenda, rebalance ratio

Public display now only shows agenda explicitly marked public. Layout
ratio changes from 63/37 to 40/60 (agenda/media) so pamphlets and the
video profile get more visual weight, per the approved design.
EOF
)"
```

---

### Task 5: New internal TV display (`/agenda/tv-internal`)

**Files:**
- Create: `app/(public)/agenda/tv-internal/page.jsx`

**Interfaces:**
- Consumes: `shared.js` and `AgendaTvTable.jsx` from `../tv/` (Task 3), `UNIT_COLORS` from `../tv/unit-colors` (unchanged, pre-existing).

- [ ] **Step 1: Create the internal page**

Create `app/(public)/agenda/tv-internal/page.jsx`:

```jsx
'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
import { supabase } from '@/lib/supabase/client'
import { UNIT_COLORS } from '../tv/unit-colors'
import { MONTHS_L, DAYS, useStageScale, useTheme, useClock, sortActiveAgenda } from '../tv/shared'
import AgendaTvTable from '../tv/AgendaTvTable'

// Halaman TV internal — menampilkan SEMUA agenda (internal + publik), tanpa
// panel media/pamflet, tanpa login, dan tanpa entri menu (akses lewat URL
// langsung). Lihat docs/superpowers/specs/2026-07-10-agenda-tv-public-internal-split-design.md
export default function AgendaTVInternalPage() {
  const scale = useStageScale()
  const { isDark, t, toggle } = useTheme()
  const now = useClock()

  useEffect(() => {
    if (typeof document === 'undefined') return
    try {
      const link = document.createElement('link')
      link.rel = 'stylesheet'
      link.href = 'https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@500;600;700;800;900&family=JetBrains+Mono:wght@500;700&display=swap'
      document.head?.appendChild?.(link)
      return () => {
        try {
          if (document.head?.contains?.(link)) {
            document.head?.removeChild?.(link)
          }
        } catch {}
      }
    } catch (err) {
      console.warn('Font loading error:', err)
    }
  }, [])

  const [agenda, setAgenda]   = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError]     = useState(null)

  const load = useCallback(async () => {
    if (typeof window === 'undefined') return
    try {
      if (!supabase) { setError('Supabase belum dikonfigurasi'); setLoading(false); return }
      const { data, error: err } = await supabase.from('agenda').select('*').order('tanggal_mulai', { ascending: true })
      if (err) {
        console.error('Supabase error:', err)
        setError('Gagal memuat agenda')
      } else { setAgenda(data || []); setError(null) }
    } catch (e) {
      console.error('Load error:', e)
      setError('Terjadi kesalahan')
    }
    finally { setLoading(false) }
  }, [])

  useEffect(() => {
    if (typeof window !== 'undefined') load()
  }, [load])

  useEffect(() => {
    if (typeof window === 'undefined') return
    const id = setInterval(load, 300000)
    return () => clearInterval(id)
  }, [load])

  const filtered = useMemo(() => sortActiveAgenda(agenda), [agenda])

  // Keyboard shortcuts (fullscreen, theme toggle — page navigation is
  // handled inside AgendaTvTable)
  useEffect(() => {
    if (typeof window === 'undefined' || typeof document === 'undefined') return
    const handler = (e) => {
      if (e.key === 'f' || e.key === 'F' || e.key === 'F11') {
        e.preventDefault()
        try {
          if (!document.fullscreenElement) {
            document.documentElement.requestFullscreen?.().catch(() => {})
          } else {
            document.exitFullscreen?.().catch(() => {})
          }
        } catch (err) {
          console.warn('Fullscreen error:', err)
        }
      }
      if (e.key === 't' || e.key === 'T') toggle()
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [toggle])

  const hh        = now ? String(now.getHours()).padStart(2, '0')   : '--'
  const mm        = now ? String(now.getMinutes()).padStart(2, '0') : '--'
  const dateShort = now ? `${DAYS[now.getDay()]}, ${now.getDate()} ${MONTHS_L[now.getMonth()]} ${now.getFullYear()}` : '—'

  if (loading || error) {
    return (
      <div style={{ height: '100vh', background: '#0a1228', display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 24 }}>
        <div style={{ width: 80, height: 80, borderRadius: 16, background: error ? '#7f1d1d' : 'linear-gradient(135deg,#f5b915,#d97706)', display: 'grid', placeItems: 'center', color: error ? '#fca5a5' : '#0f172a', fontWeight: 900, fontSize: 32 }}>
          {error ? '!' : 'S'}
        </div>
        <p style={{ color: error ? '#f87171' : '#64748b', fontSize: 18 }}>{error || 'Memuat agenda...'}</p>
      </div>
    )
  }

  return (
    <div style={{
      position: 'fixed',
      inset: 0,
      background: '#000',
      overflow: 'hidden',
      fontSize: '1vw'
    }}>
      <div style={{
        width: '100vw',
        height: '100vh',
        background: t.bg,
        backgroundImage: t.stageBg,
        display: 'flex',
        flexDirection: 'column',
        fontFamily: '"Plus Jakarta Sans", system-ui, sans-serif',
        color: t.text,
        overflow: 'hidden',
      }}>
        {/* ── HEADER ── */}
        <header style={{
          padding: '1.5vh 2vw 1vh',
          borderBottom: `1px solid ${t.border}`,
          flexShrink: 0,
          display: 'flex',
          flexDirection: 'column',
          gap: '1vh'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '1vw' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '1vw', flexShrink: 0 }}>
              <div style={{ width: '3.5vw', height: '3.5vw', background: isDark ? '#ffffff' : '#1e3a8a', borderRadius: '0.8vw', padding: '0.3vw', flexShrink: 0 }}>
                <img src="/images/logo USC.png" alt="USC" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
              </div>
              <div>
                <div style={{ fontSize: '1.8vw', fontWeight: 900, letterSpacing: '0.06em', lineHeight: 1, color: t.text }}>SIMDIR · USC</div>
                <div style={{ fontSize: '0.85vw', color: t.text2, letterSpacing: '0.16em', textTransform: 'uppercase', fontWeight: 600, marginTop: '0.3vh' }}>Internal</div>
              </div>
            </div>

            <div style={{ textAlign: 'center', flex: 1 }}>
              <h1 style={{ fontSize: '1.8vw', fontWeight: 800, margin: 0, letterSpacing: '0.04em', color: t.accent }}>AGENDA DIREKTORAT — INTERNAL</h1>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '0.8vw', flexShrink: 0 }}>
              <button
                onClick={toggle}
                style={{ background: 'rgba(255,255,255,0.04)', color: t.text, border: `1px solid ${t.border}`, width: '2.8vw', height: '4vh', borderRadius: '0.6vw', display: 'grid', placeItems: 'center', cursor: 'pointer', flexShrink: 0 }}
              >
                {isDark ? (
                  <svg viewBox="0 0 24 24" fill="none" stroke={t.accent} strokeWidth="2" style={{ width: '1.3vw', height: '1.3vw' }}>
                    <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/>
                  </svg>
                ) : (
                  <svg viewBox="0 0 24 24" fill="none" stroke={t.accent} strokeWidth="2" style={{ width: '1.3vw', height: '1.3vw' }}>
                    <circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41"/>
                  </svg>
                )}
              </button>

              <div style={{ textAlign: 'right' }}>
                <div style={{ fontFamily: '"JetBrains Mono", monospace', fontSize: '2.8vw', fontWeight: 700, lineHeight: 1, letterSpacing: '-0.02em', color: t.text }}>
                  {hh}<span style={{ animation: 'blink 1s steps(1) infinite' }}>:</span>{mm}
                </div>
                <div style={{ fontSize: '0.8vw', color: t.text2, marginTop: '0.3vh', letterSpacing: '0.04em' }}>{dateShort}</div>
              </div>
            </div>
          </div>

          {/* Legend unit kerja */}
          <div style={{ paddingTop: '0.8vh', borderTop: `1px solid ${t.border}`, display: 'flex', gap: '0 0.8vw', alignItems: 'center', flexWrap: 'nowrap', overflow: 'hidden' }}>
            {Object.entries(UNIT_COLORS).map(([key, uc]) => (
              <div key={key} style={{ display: 'flex', alignItems: 'center', gap: '0.3vw', flexShrink: 0 }}>
                <span style={{ width: '0.45vw', height: '0.45vw', borderRadius: 2, background: uc.border, flexShrink: 0, display: 'block' }} />
                <span style={{ fontSize: '0.75vw', fontWeight: 600, color: t.text3, whiteSpace: 'nowrap', letterSpacing: '0.02em' }}>{uc.name}</span>
              </div>
            ))}
          </div>
        </header>

        {/* ── MAIN: full-width table ── */}
        <main style={{ flex: 1, minHeight: 0, padding: '1.5vh 1.5vw', overflow: 'hidden' }}>
          <AgendaTvTable agenda={filtered} t={t} scale={scale} />
        </main>
      </div>

      <style>{`
        @keyframes blink    { 50% { opacity: 0.2; } }
        @keyframes dotpulse { 0% { box-shadow: 0 0 0 0 rgba(52,211,153,0.7); } 70% { box-shadow: 0 0 0 10px rgba(52,211,153,0); } 100% { box-shadow: 0 0 0 0 rgba(52,211,153,0); } }
        * { box-sizing: border-box; }
        body { margin: 0; -webkit-font-smoothing: antialiased; }
        button:hover { opacity: 0.85; }
      `}</style>
    </div>
  )
}
```

- [ ] **Step 2: Build**

Run: `npm run build 2>&1 | tail -30`
Expected: `✓ Compiled successfully`, and the route list includes `○ /agenda/tv-internal` (or `ƒ`, depending on Next.js's static/dynamic classification for this page).

- [ ] **Step 3: Confirm no auth/menu wiring was added**

Run: `grep -rn "tv-internal" middleware.js "app/(dashboard)/layout.jsx" "app/components/MobileBottomNav.jsx"`
Expected: no output — confirms the internal page was not added to any menu and no middleware rule references it (it's covered automatically by the existing `/agenda` public-path rule).

- [ ] **Step 4: Manual verification**

Requires Task 1's migration applied, with at least one agenda marked `tampil_publik = true` and at least one left `false`. Start the dev server:
1. Open `/agenda/tv-internal` directly by URL — confirm it loads without login.
2. Confirm the table shows **both** the public-marked and internal-only agenda (i.e., strictly more rows than `/agenda/tv` shows, unless all agenda happen to be public).
3. Confirm no media/pamphlet panel is present — table fills the full width.
4. Confirm the page-dots/progress pager still works if there are enough agenda to paginate, and ArrowLeft/ArrowRight still navigate pages.
5. Confirm the theme toggle button still works (dark/light).

- [ ] **Step 5: Commit**

```bash
git add "app/(public)/agenda/tv-internal/page.jsx"
git commit -m "$(cat <<'EOF'
feat: add internal-only agenda TV display at /agenda/tv-internal

Shows all agenda (internal + public), full-width table, no media
panel, no login, no nav menu entry — reachable only by direct URL per
the approved design. Reuses AgendaTvTable/shared.js from the public
page's Task 3 extraction.
EOF
)"
```
