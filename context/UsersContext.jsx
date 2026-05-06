'use client';

import { useState, useEffect, createContext, useContext } from 'react';
import { supabase } from '@/lib/supabase/client';

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
      console.log('[UsersContext] Loading users...');
      
      if (!supabase) {
        setError('Supabase belum dikonfigurasi');
        setLoading(false);
        return;
      }

      // Try direct query first
      let { data, error: supabaseError } = await supabase
        .from('users')
        .select('*')
        .order('created_at', { ascending: false });

      console.log('[UsersContext] Direct query result:', { data, error: supabaseError });

      // If failed, try RPC function
      if (supabaseError) {
        console.log('[UsersContext] Trying RPC function for users...');
        const { data: rpcData, error: rpcError } = await supabase
          .rpc('get_all_users');
        
        console.log('[UsersContext] RPC result:', { rpcData, rpcError });
        
        if (rpcError) {
          console.error('[UsersContext] Error loading users via RPC:', rpcError);
          setError('Gagal memuat data user: ' + rpcError.message);
          setUsers([]);
        } else {
          console.log('[UsersContext] Users loaded via RPC:', rpcData?.length, 'users');
          setUsers(rpcData || []);
          setError(null);
        }
      } else {
        console.log('[UsersContext] Users loaded directly:', data?.length, 'users');
        console.log('[UsersContext] Users data:', data?.map(u => ({ username: u.username, email: u.email })));
        setUsers(data || []);
        setError(null);
      }
    } catch (err) {
      console.error('Error:', err);
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

      console.log('Adding user:', user);

      // Try RPC function first
      const { data: rpcData, error: rpcError } = await supabase
        .rpc('add_user', {
          p_username: user.username || user.email?.split('@')[0] || '',
          p_email: user.email || '',
          p_password: user.password || 'password123',
          p_full_name: user.nama || user.full_name || '',
          p_role: user.role || 'admin'
        });

      if (rpcError) {
        console.log('RPC failed, trying direct insert...', rpcError);
        // Fallback to direct insert
        const userData = {
          full_name: user.nama || user.full_name || '',
          username: user.username || user.email?.split('@')[0] || '',
          email: user.email || '',
          role: user.role || 'admin',
          is_active: user.is_active ?? true,
          password: user.password || 'password123'
        };

        const { data, error: supabaseError } = await supabase
          .from('users')
          .insert([userData])
          .select()
          .single();

        if (supabaseError) {
          console.error('Error adding user:', supabaseError);
          throw new Error(supabaseError.message || 'Gagal menambahkan user');
        }

        console.log('User added:', data);
        setUsers(prev => [data, ...prev]);
        return data;
      }

      // Reload users to get the new user with all fields
      await loadUsers();
      return { id: rpcData };
    } catch (err) {
      console.error('Error in addUser:', err);
      throw err;
    }
  };

  const updateUser = async (id, user) => {
    try {
      if (!supabase) {
        throw new Error('Supabase belum dikonfigurasi');
      }

      // Try RPC function with password if provided
      const hasPassword = user.password && user.password.trim();
      const rpcFunction = hasPassword ? 'update_user_with_password' : 'update_user';
      const rpcParams = hasPassword ? {
        p_id: id,
        p_full_name: user.nama || user.full_name,
        p_email: user.email,
        p_role: user.role,
        p_is_active: user.is_active,
        p_password: user.password
      } : {
        p_id: id,
        p_full_name: user.nama || user.full_name,
        p_email: user.email,
        p_role: user.role,
        p_is_active: user.is_active
      };

      const { error: rpcError } = await supabase
        .rpc(rpcFunction, rpcParams);

      if (rpcError) {
        console.log('RPC failed, trying direct update...', rpcError);
        // Fallback to direct update
        const userData = {
          full_name: user.nama || user.full_name,
          email: user.email,
          role: user.role,
          is_active: user.is_active
        };

        // Only include password if it's provided
        if (hasPassword) {
          userData.password = user.password;
        }

        const { data, error: supabaseError } = await supabase
          .from('users')
          .update(userData)
          .eq('id', id)
          .select()
          .single();

        if (supabaseError) {
          console.error('Error updating user:', supabaseError);
          throw supabaseError;
        }

        setUsers(prev => prev.map(u => u.id === id ? data : u));
        return data;
      }

      // Update local state
      setUsers(prev => prev.map(u => u.id === id ? { ...u, ...user, full_name: user.nama || user.full_name } : u));
      return { id, ...user };
    } catch (err) {
      console.error('Error:', err);
      throw err;
    }
  };

  const deleteUser = async (id) => {
    try {
      if (!supabase) {
        throw new Error('Supabase belum dikonfigurasi');
      }

      // Try RPC function first
      const { error: rpcError } = await supabase
        .rpc('delete_user', { p_id: id });

      if (rpcError) {
        console.log('RPC failed, trying direct delete...', rpcError);
        // Fallback to direct delete
        const { error: supabaseError } = await supabase
          .from('users')
          .delete()
          .eq('id', id);

        if (supabaseError) {
          console.error('Error deleting user:', supabaseError);
          throw supabaseError;
        }
      }

      setUsers(prev => prev.filter(u => u.id !== id));
    } catch (err) {
      console.error('Error:', err);
      throw err;
    }
  };

  const toggleUserStatus = async (id, currentStatus) => {
    try {
      if (!supabase) {
        throw new Error('Supabase belum dikonfigurasi');
      }

      // Try RPC function first
      const { error: rpcError } = await supabase
        .rpc('toggle_user_status', {
          p_id: id,
          p_is_active: !currentStatus
        });

      if (rpcError) {
        console.log('RPC failed, trying direct update...', rpcError);
        // Fallback to direct update
        const { data, error: supabaseError } = await supabase
          .from('users')
          .update({ is_active: !currentStatus })
          .eq('id', id)
          .select()
          .single();

        if (supabaseError) {
          console.error('Error toggling user status:', supabaseError);
          throw supabaseError;
        }

        setUsers(prev => prev.map(u => u.id === id ? data : u));
        return data;
      }

      // Update local state
      setUsers(prev => prev.map(u => u.id === id ? { ...u, is_active: !currentStatus } : u));
      return { id, is_active: !currentStatus };
    } catch (err) {
      console.error('Error:', err);
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
