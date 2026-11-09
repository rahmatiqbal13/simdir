# SQL Files Documentation

## File SQL Aktif

| File | Deskripsi | Kapan Digunakan |
|------|-----------|-----------------|
| `sql/schema/supabase-schema.sql` | Schema database utama (tabel, RLS, policies) | Setup awal database |
| `sql/fixes/fix-pengaturan-rls.sql` | Fix RLS dan RPC functions untuk halaman pengaturan | Jika ada masalah RLS di users/unit_kerja |
| `sql/seed/backup-simdir-data.sql` | Query untuk membackup data penting | Sebelum cleanup data |

Struktur lengkap ada di [`sql/README.md`](../sql/README.md). Migrasi database ada di `supabase/migrations/`.

## Penggunaan

### Setup Database Baru
```bash
psql -f sql/schema/supabase-schema.sql
```

### Fix Masalah RLS
```bash
psql -f sql/fixes/fix-pengaturan-rls.sql
```
