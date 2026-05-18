// ============================================
// LOCAL USERS — Fallback ketika Supabase tidak tersedia
// Password disimpan sebagai bcrypt hash (bukan plain text)
// ============================================

export const localUsers = [
  {
    id: '1646e3e6-58bd-487a-aafb-82e5eda8b393',
    username: 'administrator',
    email: 'admin@direktorat.ac.id',
    password: '$2b$10$xIgNOGP8g0Qt02hfKr0.zulk2M2RqZ9n0LHSOYEh6baLtlisMB7lq',
    full_name: 'Administrator',
    role: 'super_admin',
    is_active: true,
    last_login: null,
  },
  {
    id: '550e8400-e29b-41d4-a716-446655440000',
    username: 'adminiqbal',
    email: 'adminiqbal@usc.ac.id',
    password: '$2b$10$yi8G6jBCyoMtGfbLeslkhOcByzk3vjMJXCpFjMTrCiN1qAEHh.4FO',
    full_name: 'Admin Iqbal',
    role: 'super_admin',
    is_active: true,
    last_login: null,
  },
  {
    id: '550e8400-e29b-41d4-a716-446655440001',
    username: 'keuangan',
    email: 'keuangan@usc.ac.id',
    password: '$2b$10$4Yob9N0dC7mv1Ysc.f6uJuWQiC8G7FSjkhmsGJUbOj0Ws5/2hbuT2',
    full_name: 'Admin Keuangan',
    role: 'admin_keuangan',
    is_active: true,
    last_login: null,
  },
  {
    id: '550e8400-e29b-41d4-a716-446655440002',
    username: 'operator',
    email: 'operator@usc.ac.id',
    password: '$2b$10$dagMba8ZCqOtGajSne5U5.WWytmY96p/WnnWKFPYtBErNeVc0z.qS',
    full_name: 'Operator',
    role: 'admin',
    is_active: true,
    last_login: null,
  },
  {
    id: '550e8400-e29b-41d4-a716-446655440003',
    username: 'pimpinan',
    email: 'pimpinan@usc.ac.id',
    password: '$2b$10$z741WRVhhmsjIocJdZxziut8wRq3QtI3ZbZMLogLRhXEMWIAXgNM6',
    full_name: 'Pimpinan',
    role: 'pimpinan',
    is_active: true,
    last_login: null,
  },
]

export function getLocalUserByUsername(username) {
  const user = localUsers.find(u => u.username === username)
  return user ? [user] : []
}

export function getLocalUserByEmail(email) {
  const user = localUsers.find(u => u.email === email)
  return user ? [user] : []
}

export function getAllLocalUsers() {
  return localUsers
}
