-- Migration: Decouple "dihadiri pimpinan" from agenda.jenis
-- Created: 2026-08-25
-- Description: `jenis` used to be a 3-way mutually exclusive value
-- ('internal' / 'eksternal' / 'pimpinan'), which conflated two unrelated
-- things: who organized the event (internal unit vs external body), and
-- whether a pimpinan is attending. Because the field could only hold one
-- value, an internal event attended by a pimpinan had to be filed as
-- jenis='pimpinan' — which discarded the organizing unit (penyelenggara
-- got overwritten with the pimpinan's name/title, and unit-colors.js
-- treats 'pimpinan' as a hard override for TV row coloring, hiding the
-- unit color entirely).
--
-- This migration adds two new independent columns so "who organized it"
-- and "is a pimpinan attending" can both be recorded, then backfills
-- existing jenis='pimpinan' rows without deleting any information: the
-- old penyelenggara value (which held the pimpinan's name/title) is
-- copied into the new nama_pimpinan column, dihadiri_pimpinan is set to
-- true, and jenis is reclassified to 'internal' (a reasonable default —
-- penyelenggara itself is left untouched, so nothing is lost).
--
-- Application code (app/(dashboard)/kelola-agenda/page.jsx and its
-- consumers) already handles both the old and new shape gracefully, so
-- this migration is safe to run before or after deploying the updated
-- code — but the "Dihadiri Pimpinan" checkbox in the add/edit form will
-- only persist correctly once these columns exist.

ALTER TABLE agenda ADD COLUMN IF NOT EXISTS dihadiri_pimpinan BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE agenda ADD COLUMN IF NOT EXISTS nama_pimpinan VARCHAR(255);

-- Backfill: baris lama dengan jenis='pimpinan' ditandai dihadiri_pimpinan,
-- nama pimpinannya disalin dari penyelenggara (satu-satunya tempat itu
-- tersimpan sebelumnya), lalu jenis-nya direklasifikasi ke 'internal'
-- supaya lolos constraint baru di bawah tanpa kehilangan data apa pun.
UPDATE agenda
SET
    dihadiri_pimpinan = true,
    nama_pimpinan = penyelenggara,
    jenis = 'internal'
WHERE jenis = 'pimpinan';

-- Persempit constraint jenis ke 2 nilai saja sekarang 'pimpinan' sudah
-- jadi flag terpisah, bukan bagian dari jenis.
ALTER TABLE agenda DROP CONSTRAINT IF EXISTS agenda_jenis_check;
ALTER TABLE agenda ADD CONSTRAINT agenda_jenis_check CHECK (jenis IN ('internal', 'eksternal'));
