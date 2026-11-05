-- Migration: hidupkan lagi jenis 'pimpinan' untuk "Agenda Pimpinan"
--
-- Migrasi 20260825000000 memisahkan "dihadiri pimpinan" menjadi flag
-- (dihadiri_pimpinan) dan mempersempit jenis ke internal/eksternal.
-- Ternyata ada dua kasus berbeda:
--   1. Kegiatan milik unit yang dihadiri pimpinan → jenis internal/eksternal
--      + dihadiri_pimpinan = true (penyelenggara & PIC unit tetap tercatat).
--   2. Agenda milik pimpinan sendiri (rapat, undangan dinas) yang diinput
--      sebagai pengingat di TV Internal → jenis = 'pimpinan',
--      dihadiri_pimpinan = true, nama_pimpinan wajib, penyelenggara berisi
--      pengundang (opsional), pic kosong.
-- Data lama sudah dibackfill ke 'internal' oleh migrasi sebelumnya, jadi
-- tidak ada baris yang perlu diubah — hanya constraint yang diperlebar.

ALTER TABLE agenda DROP CONSTRAINT IF EXISTS agenda_jenis_check;
ALTER TABLE agenda ADD CONSTRAINT agenda_jenis_check CHECK (jenis IN ('internal', 'eksternal', 'pimpinan'));
