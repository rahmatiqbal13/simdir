# Legacy JWT Setup Guide

## 🚀 Langkah-langkah Setup

### 1. Copy Environment File
```bash
cp .env.local.example .env.local
```

### 2. Dapatkan Legacy JWT Secret
1. Buka **Supabase Dashboard**
2. Pergi ke: **Project Settings** → **Configuration** → **API**
3. Cari bagian: **"Legacy JWT secret (still used)"**
4. Copy value-nya

### 3. Isi di .env.local
Buka file `.env.local` dan paste Legacy JWT Secret:

```bash
LEGACY_JWT_SECRET=paste-legacy-jwt-secret-anda-disini
```

**Contoh:**
```bash
LEGACY_JWT_SECRET=super-secret-jwt-key-1234567890abcdef
```

### 4. Install Dependencies
```bash
npm install jsonwebtoken
# atau
yarn add jsonwebtoken
```

---

## 📖 Cara Penggunaan

### Verifikasi Token
```javascript
import { verifyLegacyToken } from '@/lib/jwt-legacy';

// Di API Route atau Server Component
const token = 'eyJhbGciOiJIUzI1NiIs...';
const decoded = verifyLegacyToken(token);

if (decoded) {
  console.log('Token valid:', decoded);
} else {
  console.log('Token invalid');
}
```

### Dengan Middleware
```javascript
import { withLegacyAuth } from '@/lib/auth-middleware';

// API Route dengan proteksi
async function handler(req, res) {
  // req.user berisi decoded token
  res.json({ user: req.user });
}

export default withLegacyAuth(handler);
```

---

## ⚠️ Catatan Penting

1. **Jangan expose ke client** - `LEGACY_JWT_SECRET` hanya untuk server
2. **Jangan commit ke git** - File `.env.local` sudah di `.gitignore`
3. **Legacy secret** hanya untuk verifikasi token lama, tidak untuk generate token baru

---

## 🔍 Troubleshooting

### Error: LEGACY_JWT_SECRET tidak ditemukan
- Pastikan file `.env.local` ada di root project
- Pastikan variable name benar: `LEGACY_JWT_SECRET`
- Restart server development setelah edit `.env.local`

### Token selalu invalid
- Pastikan menggunakan **Legacy JWT Secret**, bukan Service Role Key
- Pastikan secret tidak ada spasi di awal/akhir
- Cek apakah token sudah expired
