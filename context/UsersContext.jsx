'use client';

import { useState, useEffect, createContext, useContext } from 'react';
import { supabase } from '@/lib/supabase/client';
import bcrypt from 'bcryptjs';

const UsersContext = createContext();

export function UsersProvider({ children }) {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Load data dari Supabase saat mount
  useEffect(() => {
    loadUsers();
  }, []);

  const loadUsers = async () => {
    try {
      setLoading(true);

      if (!supabase) {
        setError('Supabase belum dikonfigurasi');
        setLoading(false);
        return;
      }

      let { data, error: supabaseError } = await supabase
        .from('users')
        .select('*')
        .order('created_at', { ascending: false });

      if (supabaseError) {
        const { data: rpcData, error: rpcError } = await supabase.rpc('get_all_users');
        if (rpcError) {
          setError('Gagal memuat data user: ' + rpcError.message);
          setUsers([]);
        } else {
          setUsers(rpcData || []);
          setError(null);
        }
      } else {
        setUsers(data || []);
        setError(null);
      }
    } catch (err) {
      setError('Terjadi kesalahan: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const addUser = async (user) => {
    try {
      if (!supabase) {
        throw new Error('Supabase belum dikonfigurasi');
      }

      // Hash password sebelum disimpan ke database
      const plainPassword = user.password || 'Ganti_Password_123!'
      const hashedPassword = await bcrypt.hash(plainPassword, 10)

      const { data: rpcData, error: rpcError } = await supabase
        .rpc('add_user', {
          p_username: user.username || user.email?.split('@')[0] || '',
          p_email: user.email || '',
          p_password: hashedPassword,
          p_full_name: user.nama || user.full_name || '',
          p_role: user.role || 'admin'
        });

      if (rpcError) {
        const userData = {
          full_name: user.nama || user.full_name || '',
          username: user.username || user.email?.split('@')[0] || '',
          email: user.email || '',
          role: user.role || 'admin',
          is_active: user.is_active ?? true,
          password: hashedPassword,
        };

        const { data, error: supabaseError } = await supabase
          .from('users')
          .insert([userData])
          .select()
          .single();

        if (supabaseError) {
          throw new Error(supabaseError.message || 'Gagal menambahkan user');
        }

        setUsers(prev => [data, ...prev]);
        return data;
      }

      await loadUsers();
      return { id: rpcData };
    } catch (err) {
      throw err;
    }
  };

  const updateUser = async (id, user) => {
    try {
      if (!supabase) {
        throw new Error('Supabase belum dikonfigurasi');
      }

      const hasPassword = user.password && user.password.trim();

      // Hash password baru sebelum disimpan
      let hashedPassword = null
      if (hasPassword) {
        hashedPassword = await bcrypt.hash(user.password.trim(), 10)
      }

      const rpcFunction = hasPassword ? 'update_user_with_password' : 'update_user';
      const rpcParams = hasPassword ? {
        p_id: id,
        p_full_name: user.nama || user.full_name,
        p_email: user.email,
        p_role: user.role,
        p_is_active: user.is_active,
        p_password: hashedPassword,
      } : {
        p_id: id,
        p_full_name: user.nama || user.full_name,
        p_email: user.email,
        p_role: user.role,
        p_is_active: user.is_active,
      };

      const { error: rpcError } = await supabase.rpc(rpcFunction, rpcParams);

      if (rpcError) {
        const userData = {
          full_name: user.nama || user.full_name,
          email: user.email,
          role: user.role,
          is_active: user.is_active,
        };

        if (hasPassword) {
          userData.password = hashedPassword;
        }

        const { data, error: supabaseError } = await supabase
          .from('users')
          .update(userData)
          .eq('id', id)
          .select()
          .single();

        if (supabaseError) throw supabaseError;

        setUsers(prev => prev.map(u => u.id === id ? data : u));
        return data;
      }

      setUsers(prev => prev.map(u => u.id === id ? { ...u, ...user, full_name: user.nama || user.full_name } : u));
      return { id, ...user };
    } catch (err) {
      throw err;
    }
  };

  const deleteUser = async (id) => {
    try {
      if (!supabase) throw new Error('Supabase belum dikonfigurasi');

      const { error: rpcError } = await supabase.rpc('delete_user', { p_id: id });

      if (rpcError) {
        const { error: supabaseError } = await supabase.from('users').delete().eq('id', id);
        if (supabaseError) throw supabaseError;
      }

      setUsers(prev => prev.filter(u => u.id !== id));
    } catch (err) {
      throw err;
    }
  };

  const toggleUserStatus = async (id, currentStatus) => {
    try {
      if (!supabase) throw new Error('Supabase belum dikonfigurasi');

      const { error: rpcError } = await supabase.rpc('toggle_user_status', {
        p_id: id,
        p_is_active: !currentStatus,
      });

      if (rpcError) {
        const { data, error: supabaseError } = await supabase
          .from('users')
          .update({ is_active: !currentStatus })
          .eq('id', id)
          .select()
          .single();

        if (supabaseError) throw supabaseError;

        setUsers(prev => prev.map(u => u.id === id ? data : u));
        return data;
      }

      setUsers(prev => prev.map(u => u.id === id ? { ...u, is_active: !currentStatus } : u));
      return { id, is_active: !currentStatus };
    } catch (err) {
      throw err;
    }
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
