// ============================================
// LOCAL USERS DATA - Fallback untuk login
// Copy dari database Supabase
// ============================================

export const localUsers = [
  // User dari Supabase Auth (untuk mode lokal fallback)
  {
    "id": "1646e3e6-58bd-487a-aafb-82e5eda8b393",
    "username": "administrator",
    "email": "admin@direktorat.ac.id",
    "password": "admin123",
    "full_name": "Administrator",
    "role": "super_admin",
    "is_active": true,
    "last_login": null
  },
  // Users default
  {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "username": "adminiqbal",
    "email": "adminiqbal@usc.ac.id",
    "password": "usc@_140451",
    "full_name": "Admin Iqbal",
    "role": "super_admin",
    "is_active": true,
    "last_login": null
  },
  {
    "id": "550e8400-e29b-41d4-a716-446655440001",
    "username": "keuangan",
    "email": "keuangan@usc.ac.id",
    "password": "keuangan123",
    "full_name": "Admin Keuangan",
    "role": "admin_keuangan",
    "is_active": true,
    "last_login": null
  },
  {
    "id": "550e8400-e29b-41d4-a716-446655440002",
    "username": "operator",
    "email": "operator@usc.ac.id",
    "password": "operatorusc@_123",
    "full_name": "Operator",
    "role": "admin",
    "is_active": true,
    "last_login": null
  },
  {
    "id": "550e8400-e29b-41d4-a716-446655440003",
    "username": "pimpinan",
    "email": "pimpinan@usc.ac.id",
    "password": "pimpinan123",
    "full_name": "Pimpinan",
    "role": "pimpinan",
    "is_active": true,
    "last_login": null
  }
]

// Fungsi untuk mencari user dari data lokal
export function getLocalUserByUsername(username) {
  const user = localUsers.find(u => u.username === username)
  return user ? [user] : []
}

export function getLocalUserByEmail(email) {
  const user = localUsers.find(u => u.email === email)
  return user ? [user] : []
}

// Fungsi untuk mendapatkan semua user (untuk admin)
export function getAllLocalUsers() {
  return localUsers
}
