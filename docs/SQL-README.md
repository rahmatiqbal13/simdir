# SQL Files Documentation

## File SQL di Root Directory (Aktif)

| File | Deskripsi | Kapan Digunakan |
|------|-----------|-----------------|
| `supabase-schema.sql` | Schema database utama (tabel, RLS, policies) | Setup awal database |
| `seed-pengaturan.sql` | Data default untuk unit kerja dan users | Setup awal data |
| `fix-pengaturan-rls.sql` | Fix RLS dan RPC functions untuk halaman pengaturan | Jika ada masalah RLS di users/unit_kerja |
| `backup-simdir-data.sql` | Backup data penting | Backup/restore data |

## File di sql-archive/ (History)

29 file SQL lama sudah di-archive untuk referensi historis.

## Penggunaan

### Setup Database Baru
```bash
# 1. Jalankan schema
psql -f supabase-schema.sql

# 2. Jalankan seed data
psql -f seed-pengaturan.sql
```

### Fix Masalah RLS
```bash
psql -f fix-pengaturan-rls.sql
```
