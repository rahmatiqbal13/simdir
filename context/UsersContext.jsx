'use client';

import { useState, useEffect, createContext, useContext, useCallback } from 'react';

const UsersContext = createContext();

async function apiRequest(url, options) {
  const res = await fetch(url, {
    ...options,
    headers: { 'Content-Type': 'application/json', ...(options?.headers || {}) },
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || 'Terjadi kesalahan');
  return data;
}

export function UsersProvider({ children }) {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const loadUsers = useCallback(async () => {
    try {
      setLoading(true);
      const data = await apiRequest('/api/users');
      setUsers(data || []);
      setError(null);
    } catch (err) {
      setError('Gagal memuat data user: ' + err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadUsers(); }, [loadUsers]);

  const addUser = async (user) => {
    const data = await apiRequest('/api/users', {
      method: 'POST',
      body: JSON.stringify({
        username: user.username || user.email?.split('@')[0] || '',
        email: user.email || '',
        password: user.password || '',
        nama: user.nama || user.full_name || '',
        role: user.role || 'admin',
        is_active: user.is_active ?? true,
      }),
    });
    setUsers((prev) => [data, ...prev]);
    return data;
  };

  const updateUser = async (id, user) => {
    const data = await apiRequest(`/api/users/${id}`, {
      method: 'PUT',
      body: JSON.stringify({
        nama: user.nama || user.full_name,
        email: user.email,
        role: user.role,
        is_active: user.is_active,
        password: user.password?.trim() || undefined,
      }),
    });
    setUsers((prev) => prev.map((u) => (u.id === id ? data : u)));
    return data;
  };

  const deleteUser = async (id) => {
    await apiRequest(`/api/users/${id}`, { method: 'DELETE' });
    setUsers((prev) => prev.filter((u) => u.id !== id));
  };

  const toggleUserStatus = async (id, currentStatus) => {
    const current = users.find((u) => u.id === id);
    if (!current) throw new Error('User tidak ditemukan');
    const data = await apiRequest(`/api/users/${id}`, {
      method: 'PUT',
      body: JSON.stringify({
        nama: current.full_name,
        email: current.email,
        role: current.role,
        is_active: !currentStatus,
      }),
    });
    setUsers((prev) => prev.map((u) => (u.id === id ? data : u)));
    return data;
  };

  const refreshUsers = async () => {
    await loadUsers();
  };

  return (
    <UsersContext.Provider value={{
      users,
      loading,
      error,
      addUser,
      updateUser,
      deleteUser,
      toggleUserStatus,
      refreshUsers
    }}>
      {children}
    </UsersContext.Provider>
  );
}

export function useUsers() {
  const context = useContext(UsersContext);
  if (!context) {
    throw new Error('useUsers must be used within UsersProvider');
  }
  return context;
}
