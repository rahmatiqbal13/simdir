'use client';

import { useState, useEffect, createContext, useContext } from 'react';
import { supabase } from '@/lib/supabase/client';

const UnitKerjaContext = createContext();

export function UnitKerjaProvider({ children }) {
  const [units, setUnits] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Load data dari Supabase saat mount
  useEffect(() => {
    loadUnits();
  }, []);

  const loadUnits = async () => {
    try {
      setLoading(true);
      
      if (!supabase) {
        setError('Supabase belum dikonfigurasi');
        setLoading(false);
        return;
      }

      // Try direct query first
      let { data, error: supabaseError } = await supabase
        .from('unit_kerja')
        .select('*')
        .order('created_at', { ascending: false });

      // If failed, try RPC function
      if (supabaseError) {
        console.log('Trying RPC function for unit_kerja...');
        const { data: rpcData, error: rpcError } = await supabase
          .rpc('get_all_unit_kerja');
        
        if (rpcError) {
          console.error('Error loading unit_kerja via RPC:', rpcError);
          setError('Gagal memuat data unit kerja: ' + rpcError.message);
          setUnits([]);
        } else {
          setUnits(rpcData || []);
          setError(null);
        }
      } else {
        setUnits(data || []);
        setError(null);
      }
    } catch (err) {
      console.error('Error:', err);
      setError('Terjadi kesalahan: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const addUnit = async (unit) => {
    try {
      if (!supabase) {
        throw new Error('Supabase belum dikonfigurasi');
      }

      console.log('Adding unit:', unit);

      // Try RPC function first
      const { data: rpcData, error: rpcError } = await supabase
        .rpc('add_unit_kerja', {
          p_nama: unit.nama || '',
          p_kode: unit.singkatan || unit.kode || '',
          p_deskripsi: unit.deskripsi || null
        });

      if (rpcError) {
        console.log('RPC failed, trying direct insert...', rpcError);
        // Fallback to direct insert
        const unitData = {
          nama: unit.nama || '',
          kode: unit.singkatan || unit.kode || '',
          deskripsi: unit.deskripsi || null,
          is_active: unit.is_active ?? true
        };

        const { data, error: supabaseError } = await supabase
          .from('unit_kerja')
          .insert([unitData])
          .select()
          .single();

        if (supabaseError) {
          console.error('Error adding unit:', supabaseError);
          throw new Error(supabaseError.message || 'Gagal menambahkan unit kerja');
        }

        console.log('Unit added:', data);
        setUnits(prev => [data, ...prev]);
        return data;
      }

      // Reload units to get the new unit with all fields
      await loadUnits();
      return { id: rpcData };
    } catch (err) {
      console.error('Error in addUnit:', err);
      throw err;
    }
  };

  const updateUnit = async (id, unit) => {
    try {
      if (!supabase) {
        throw new Error('Supabase belum dikonfigurasi');
      }

      // Try RPC function first
      const { error: rpcError } = await supabase
        .rpc('update_unit_kerja', {
          p_id: id,
          p_nama: unit.nama,
          p_kode: unit.singkatan || unit.kode,
          p_deskripsi: unit.deskripsi || null,
          p_is_active: unit.is_active
        });

      if (rpcError) {
        console.log('RPC failed, trying direct update...', rpcError);
        // Fallback to direct update
        const unitData = {
          nama: unit.nama,
          kode: unit.singkatan || unit.kode,
          deskripsi: unit.deskripsi,
          is_active: unit.is_active
        };

        const { data, error: supabaseError } = await supabase
          .from('unit_kerja')
          .update(unitData)
          .eq('id', id)
          .select()
          .single();

        if (supabaseError) {
          console.error('Error updating unit:', supabaseError);
          throw supabaseError;
        }

        setUnits(prev => prev.map(u => u.id === id ? data : u));
        return data;
      }

      // Update local state
      setUnits(prev => prev.map(u => u.id === id ? { ...u, ...unit, kode: unit.singkatan || unit.kode } : u));
      return { id, ...unit };
    } catch (err) {
      console.error('Error:', err);
      throw err;
    }
  };

  const deleteUnit = async (id) => {
    try {
      if (!supabase) {
        throw new Error('Supabase belum dikonfigurasi');
      }

      // Try RPC function first
      const { error: rpcError } = await supabase
        .rpc('delete_unit_kerja', { p_id: id });

      if (rpcError) {
        console.log('RPC failed, trying direct delete...', rpcError);
        // Fallback to direct delete
        const { error: supabaseError } = await supabase
          .from('unit_kerja')
          .delete()
          .eq('id', id);

        if (supabaseError) {
          console.error('Error deleting unit:', supabaseError);
          throw supabaseError;
        }
      }

      setUnits(prev => prev.filter(u => u.id !== id));
    } catch (err) {
      console.error('Error:', err);
      throw err;
    }
  };

  const toggleUnitStatus = async (id, currentStatus) => {
    try {
      if (!supabase) {
        throw new Error('Supabase belum dikonfigurasi');
      }

      // Try RPC function first
      const { error: rpcError } = await supabase
        .rpc('toggle_unit_kerja_status', {
          p_id: id,
          p_is_active: !currentStatus
        });

      if (rpcError) {
        console.log('RPC failed, trying direct update...', rpcError);
        // Fallback to direct update
        const { data, error: supabaseError } = await supabase
          .from('unit_kerja')
          .update({ is_active: !currentStatus })
          .eq('id', id)
          .select()
          .single();

        if (supabaseError) {
          console.error('Error toggling unit status:', supabaseError);
          throw supabaseError;
        }

        setUnits(prev => prev.map(u => u.id === id ? data : u));
        return data;
      }

      // Update local state
      setUnits(prev => prev.map(u => u.id === id ? { ...u, is_active: !currentStatus } : u));
      return { id, is_active: !currentStatus };
    } catch (err) {
      console.error('Error:', err);
      throw err;
    }
  };

  const refreshUnits = async () => {
    await loadUnits();
  };

  return (
    <UnitKerjaContext.Provider value={{ 
      units, 
      loading, 
      error,
      addUnit, 
      updateUnit, 
      deleteUnit, 
      toggleUnitStatus,
      refreshUnits
    }}>
      {children}
    </UnitKerjaContext.Provider>
  );
}

export function useUnitKerja() {
  const context = useContext(UnitKerjaContext);
  if (!context) {
    throw new Error('useUnitKerja must be used within UnitKerjaProvider');
  }
  return context;
}
