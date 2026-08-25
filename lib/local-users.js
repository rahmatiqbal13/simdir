// ============================================
// LOCAL USERS — Fallback ketika Supabase tidak tersedia
// Password disimpan sebagai bcrypt hash (bukan plain text)
//
// Daftar akun (id/email/hash) dulu hardcode di sini dan ikut ter-commit ke
// git — itu kredensial produksi asli di source control. Sekarang dibaca
// dari env var LOCAL_USERS_JSON (lihat config/.env.local.example) supaya
// tidak ada lagi kredensial nyata yang ikut ter-push ke repo.
// ============================================

export function getLocalUsers() {
  const raw = process.env.LOCAL_USERS_JSON
  if (!raw) return []
  try {
    const parsed = JSON.parse(raw)
    return Array.isArray(parsed) ? parsed : []
  } catch (e) {
    console.error('LOCAL_USERS_JSON tidak valid (bukan JSON array):', e)
    return []
  }
}

// Akun mock plain-text password — HANYA untuk dev lokal (npm run dev tanpa
// Supabase). Tidak boleh pernah bisa dipakai login di production, karena
// passwordnya trivial ('admin123', dll) dan bisa jadi backdoor super_admin.
const devMockUsers = [
  {
    id: '1',
    username: 'admin',
    email: 'admin@usc.ac.id',
    password: 'admin123',
    full_name: 'Administrator USC',
    role: 'super_admin',
    is_active: true,
    last_login: null,
  },
  {
    id: '2',
    username: 'keuangan',
    email: 'keuangan@usc.ac.id',
    password: 'keuangan123',
    full_name: 'Admin Keuangan',
    role: 'admin_keuangan',
    is_active: true,
    last_login: null,
  },
  {
    id: '3',
    username: 'staff',
    email: 'staff@usc.ac.id',
    password: 'staff123',
    full_name: 'Staff USC',
    role: 'staff',
    is_active: true,
    last_login: null,
  },
]

function allUsersForCurrentEnv() {
  return process.env.NODE_ENV === 'production'
    ? getLocalUsers()
    : [...getLocalUsers(), ...devMockUsers]
}

export function getLocalUserByUsername(username) {
  const user = allUsersForCurrentEnv().find(u => u.username === username)
  return user ? [user] : []
}

export function getLocalUserByEmail(email) {
  const user = allUsersForCurrentEnv().find(u => u.email === email)
  return user ? [user] : []
}

export function getAllLocalUsers() {
  return allUsersForCurrentEnv()
}
