# ============================================
# SETUP USER EXISTING DI SUPABASE AUTH
# ============================================

## User yang Sudah Ada di Auth
- Email: admin@direktorat.ac.id
- UID: 1646e3e6-58bd-487a-aafb-82e5eda8b393
- Role: Administrator

## Langkah 1: Tambahkan User ke Database

### Opsi A: Jalankan SQL Script

1. Buka Supabase Dashboard → SQL Editor
2. Jalankan file `add-existing-user.sql`

Atau copy-paste SQL ini:

```sql
-- Tambahkan user ke tabel users
INSERT INTO public.users (
    id, 
    username, 
    email, 
    password, 
    full_name, 
    role, 
    is_active
) VALUES (
    '1646e3e6-58bd-487a-aafb-82e5eda8b393',
    'administrator',
    'admin@direktorat.ac.id',
    'AUTH_MANAGED',  -- Password dikelola oleh Supabase Auth
    'Administrator',
    'super_admin',
    true
)
ON CONFLICT (id) DO UPDATE SET
    username = EXCLUDED.username,
    email = EXCLUDED.email,
    full_name = EXCLUDED.full_name,
    role = EXCLUDED.role,
    is_active = EXCLUDED.is_active;

-- Tambahkan user ke tabel profiles
INSERT INTO public.profiles (
    id,
    username,
    email,
    full_name,
    role,
    is_active
) VALUES (
    '1646e3e6-58bd-487a-aafb-82e5eda8b393',
    'administrator',
    'admin@direktorat.ac.id',
    'Administrator',
    'super_admin',
    true
)
ON CONFLICT (id) DO UPDATE SET
    username = EXCLUDED.username,
    email = EXCLUDED.email,
    full_name = EXCLUDED.full_name,
    role = EXCLUDED.role,
    is_active = EXCLUDED.is_active;
```

### Opsi B: Mode Lokal

Jika tidak ingin setup database, Anda bisa menggunakan **Mode Lokal**:

1. Buka halaman login
2. Centang "Gunakan Mode Lokal"
3. Login dengan:
   - Email: admin@direktorat.ac.id
   - Password: admin123 (atau sesuaikan di `lib/local-users.js`)

## Langkah 2: Verifikasi Setup

### Test Login via Supabase Auth
1. Pastikan `.env.local` sudah terisi dengan benar
2. Jalankan `npm run dev`
3. Buka http://localhost:3000/login
4. Masukkan:
   - Email: admin@direktorat.ac.id
   - Password: [password yang Anda gunakan di Supabase Auth]
5. Klik "Masuk"

### Test Login via Mode Lokal
1. Centang "Gunakan Mode Lokal"
2. Masukkan:
   - Email: admin@direktorat.ac.id
   - Password: admin123
3. Klik "Masuk"

## Troubleshooting

### Error: "Email atau password salah"
- Pastikan SQL sudah dijalankan
- Cek apakah user ada di tabel users: 
  ```sql
  SELECT * FROM public.users WHERE email = 'admin@direktorat.ac.id';
  ```

### Error: "Database error"
- Pastikan function RPC sudah dibuat:
  ```sql
  SELECT * FROM get_user_by_email('admin@direktorat.ac.id');
  ```

### Error: "Gagal membuat user"
- Cek apakah email sudah ada di Supabase Auth dengan password berbeda
- Reset password di Supabase Dashboard jika perlu

## Mengubah Password

### Di Supabase Auth:
1. Dashboard → Authentication → Users
2. Cari user admin@direktorat.ac.id
3. Klik "Reset Password"

### Di Mode Lokal:
Edit file `lib/local-users.js`:
```javascript
{
  "id": "1646e3e6-58bd-487a-aafb-82e5eda8b393",
  "email": "admin@direktorat.ac.id",
  "password": "password-baru-anda",  // Ganti di sini
  ...
}
```
