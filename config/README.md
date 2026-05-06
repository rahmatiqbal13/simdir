# ⚙️ Config

Folder ini berisi file konfigurasi untuk proyek SIMDIR.

## File

| File | Deskripsi |
|------|-----------|
| `.env.local.example` | Template environment variables |

## Cara Penggunaan

1. Copy `.env.local.example` ke root folder sebagai `.env.local`
2. Isi dengan nilai yang sesuai
3. Restart development server

```bash
cp config/.env.local.example .env.local
```

## Variables Penting

- `NEXT_PUBLIC_SUPABASE_URL` - URL Supabase project
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` - API key Supabase
- `JWT_SECRET` - Secret key untuk JWT (jika menggunakan auth lokal)
