# Agenda TV Display: Public/Internal Split + Media Ratio Rework

Date: 2026-07-10
Status: Approved

## Context

The current `/agenda/tv` display (public, no auth) mixes agenda content that
reads as more "internal" than public-facing, and the user wants:

1. A genuinely public-safe TV display that also does a better job
   showcasing pamphlets and a sub-direktorat video profile.
2. A separate internal-only display showing the full agenda (internal +
   public items), for rooms with restricted physical access — reachable
   only by direct URL, no nav menu entry.

Agenda visibility (which items are public-safe) needs to be an explicit,
per-agenda editorial decision made at input time, not inferred from
existing fields.

## Decisions Made During Brainstorming

- Internal display shows **agenda only** — no pamphlet/video rotation panel.
  It's an operational display, not a lobby screen.
- "Video profile sub direktorat" is **not** a new content type. It's
  already on YouTube, so it's just another entry in the existing
  `tv_pamflets` rotation (which already supports a YouTube type — see
  commit `535ac2a feat(tv-pamflet): add YouTube video support via URL
  input`). No new upload/storage needed; avoids bloating the database.
- Internal display requires **no login** — same trust model as the
  existing public `/agenda/tv` (unlisted URL, physically-restricted room).
  This was a deliberate choice against the recommendation to require auth;
  noting it here as the explicit tradeoff accepted.
- Visibility is a **new, dedicated field** (`tampil_publik`), not reused
  from the existing `jenis` field (`internal`/`eksternal`/`pimpinan`).
  `jenis` describes the *kind* of activity; visibility describes *who
  sees it* — conflating them would make `jenis` inflexible if an
  `eksternal` activity ever needs to stay non-public, or vice versa.
- Existing agenda rows all backfill to `tampil_publik = false` (safe
  default — nothing is exposed to the public display until staff
  explicitly re-tags it).
- Public display ratio changes from the current 63/37 (agenda/media) to
  ~40/60 — media becomes the primary visual focus, agenda becomes a
  persistent side panel.

## Part A — Data model

New migration `supabase/migrations/20260710000000_add_agenda_tampil_publik.sql`
(next in sequence after the existing `20260708000003_add_pilihan_ganda.sql`):

```sql
ALTER TABLE agenda ADD COLUMN IF NOT EXISTS tampil_publik BOOLEAN NOT NULL DEFAULT false;
```

`DEFAULT false` covers both the backfill for existing rows and the default
for agenda created before the form is updated to set it explicitly.

## Part B — Kelola-agenda form

`app/(dashboard)/kelola-agenda/page.jsx`: add a checkbox "Tampilkan di TV
Publik" to the agenda create/edit form (the component around line 506,
`AgendaFormModal` or equivalent — same area as the `jenis` selector),
wired to a `tampil_publik` boolean in the form's local state, included in
the object passed to `context/AgendaContext.jsx`'s `addAgenda`/`updateAgenda`.
`AgendaContext.jsx` needs no changes — it already inserts/updates with
`.insert([agendaData])` / `.update(item)` generically (lines 82, 114), so
the new field flows through as long as the form includes it in the object
it builds.

Also update the agenda list view in the same page (where `JenisBadge` is
rendered, e.g. lines 307/442) to show at a glance which agenda are marked
public — small visual indicator, not a new interaction.

## Part C — Public display (`/agenda/tv`, same URL)

`app/(public)/agenda/tv/page.jsx:646` — the agenda fetch:

```js
const { data, error: err } = await supabase.from('agenda').select('*').order('tanggal_mulai', { ascending: true })
```

becomes:

```js
const { data, error: err } = await supabase.from('agenda').select('*').eq('tampil_publik', true).order('tanggal_mulai', { ascending: true })
```

Layout ratio changes from 63/37 to ~40/60 (agenda/media) — the two
existing side-by-side panels are resized, no structural layout change
otherwise. The media rotation (pamphlets + YouTube, including the new
video profile entry) keeps using `/api/tv-pamflets` exactly as it does
today — no changes to that system.

## Part D — Internal display (new: `app/(public)/agenda/tv-internal/page.jsx`)

New page under the same `(public)/agenda` route group, so
`middleware.js`'s existing `pathname.startsWith('/agenda')` public-path
rule covers it automatically — no middleware changes needed.

- Fetches agenda with no `tampil_publik` filter (shows internal + public).
- Renders the agenda table full-width — no media rotation panel.
- Reuses the same table rendering, carousel/pagination, and
  `useScreenScale`-style responsive scaling logic as the public page.

### Refactor: extract shared agenda-table component

`app/(public)/agenda/tv/page.jsx` is currently 1002 lines, combining the
agenda-table rendering (carousel, pagination, responsive scaling, status
badges, running-text marquee) with the media-rotation panel (YouTube
iframe API handling, pamphlet fetch/cycling) in one file. The internal
page needs the exact same agenda-table behavior minus the media panel.

Extract the agenda-table portion into a shared component,
`app/(public)/agenda/tv/AgendaTvTable.jsx`, taking the already-filtered
agenda list as a prop and owning the carousel/pagination/scaling
behavior. Both `tv/page.jsx` (public, passes `tampil_publik`-filtered
data, renders the component alongside the media panel) and
`tv-internal/page.jsx` (internal, passes unfiltered data, renders the
component full-width with no media panel) consume it. This is a targeted
extraction driven directly by this task — not a speculative refactor of
unrelated parts of the file (the YouTube/media-rotation logic stays in
`tv/page.jsx`, since only the public page uses it).

## Out of Scope

- No changes to `tv_pamflets` table, `/api/tv-pamflets`, or the
  `/tv-pamflet` management page — the video profile is just a new entry
  created through the existing UI.
- No auth/login added to the internal display (explicit user decision).
- No bulk re-tagging of existing agenda — staff mark `tampil_publik`
  manually going forward.
- No changes to the plain public (non-TV) `/agenda` page.
