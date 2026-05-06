# 🚀 Scripts

Folder ini berisi script utility dan setup untuk proyek SIMDIR.

## Daftar Script

| File | Deskripsi | Cara Penggunaan |
|------|-----------|-----------------|
| `setup-supabase-auth.js` | Setup authentication Supabase | `node scripts/setup-supabase-auth.js` |
| `test-legacy-jwt.js` | Test JWT legacy | `node scripts/test-legacy-jwt.js` |

## Cara Menjalankan Script

```bash
# Setup Supabase Auth
node scripts/setup-supabase-auth.js

# Test JWT Legacy
node scripts/test-legacy-jwt.js
```

## Catatan
- Pastikan environment variables sudah diatur sebelum menjalankan script
- Beberapa script mungkin memerlukan akses ke database Supabase
