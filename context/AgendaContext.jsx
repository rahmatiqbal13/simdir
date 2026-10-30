'use client';

import { useState, useEffect, createContext, useContext } from 'react';
import { supabase } from '@/lib/supabase/client';

const AgendaContext = createContext();

export function AgendaProvider({ children }) {
  const [agenda, setAgenda] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Load data dari Supabase saat mount
  useEffect(() => {
    loadAgenda();
  }, []);

  const loadAgenda = async () => {
    try {
      setLoading(true);
      
      if (!supabase) {
        setError('Supabase belum dikonfigurasi');
        setLoading(false);
        return;
      }

      const { data, error: supabaseError } = await supabase
        .from('agenda')
        .select('*')
        .order('created_at', { ascending: false });

      if (supabaseError) {
        console.error('Error loading agenda:', supabaseError);
        setError('Gagal memuat data agenda');
      } else {
        setAgenda(data || []);
        setError(null);
      }
    } catch (err) {
      console.error('Error:', err);
      setError('Terjadi kesalahan');
    } finally {
      setLoading(false);
    }
  };

  const addAgenda = async (item) => {
    try {
      if (!supabase) {
        throw new Error('Supabase belum dikonfigurasi');
      }

      // Get current user
      const { data: { user } } = await supabase.auth.getUser();
      
      // Pastikan data yang wajib ada
      const agendaData = {
        judul: item.judul || '',
        jenis: item.jenis || 'internal',
        tanggal_mulai: item.tanggal_mulai || new Date().toISOString().split('T')[0],
        tanggal_selesai: item.tanggal_selesai || item.tanggal_mulai || new Date().toISOString().split('T')[0],
        waktu_mulai: item.waktu_mulai || null,
        waktu_selesai: item.waktu_selesai || null,
        lokasi: item.lokasi || '',
        link_meeting: item.link_meeting || null,
        penyelenggara: item.penyelenggara || '',
        deskripsi: item.deskripsi || '',
        dihadiri_pimpinan: item.dihadiri_pimpinan ?? false,
        nama_pimpinan: item.nama_pimpinan || null,
        disposisi: item.disposisi || null,
        pic: item.pic || null,
        status: item.status || 'upcoming',
        tampil_publik: item.tampil_publik ?? false,
        // Kosong = otomatis (default kolom); dikirim hanya bila dipilih
        ...(item.target_layar?.length && { target_layar: item.target_layar }),
        created_by: user?.id || null
      };

      const { data, error: supabaseError } = await supabase
        .from('agenda')
        .insert([agendaData])
        .select()
        .single();

      if (supabaseError) {
        console.error('Error adding agenda:', supabaseError);
        console.error('Error details:', {
          message: supabaseError.message,
          code: supabaseError.code,
          details: supabaseError.details,
          hint: supabaseError.hint
        });
        throw new Error(supabaseError.message || 'Gagal menambahkan agenda');
      }

      setAgenda(prev => [data, ...prev]);
      return data;
    } catch (err) {
      console.error('Error in addAgenda:', err);
      throw err;
    }
  };

  const updateAgenda = async (id, item) => {
    try {
      if (!supabase) {
        throw new Error('Supabase belum dikonfigurasi');
      }

      const { data, error: supabaseError } = await supabase
        .from('agenda')
        .update(item)
        .eq('id', id)
        .select()
        .single();

      if (supabaseError) {
        console.error('Error updating agenda:', supabaseError);
        throw supabaseError;
      }

      setAgenda(prev => prev.map(a => a.id === id ? data : a));
      return data;
    } catch (err) {
      console.error('Error:', err);
      throw err;
    }
  };

  const deleteAgenda = async (id) => {
    try {
      if (!supabase) {
        throw new Error('Supabase belum dikonfigurasi');
      }

      const { error: supabaseError } = await supabase
        .from('agenda')
        .delete()
        .eq('id', id);

      if (supabaseError) {
        console.error('Error deleting agenda:', supabaseError);
        throw supabaseError;
      }

      setAgenda(prev => prev.filter(a => a.id !== id));
    } catch (err) {
      console.error('Error:', err);
      throw err;
    }
  };

  const refreshAgenda = async () => {
    await loadAgenda();
  };

  return (
    <AgendaContext.Provider value={{ 
      agenda, 
      loading, 
      error,
      addAgenda, 
      updateAgenda, 
      deleteAgenda, 
      refreshAgenda 
    }}>
      {children}
    </AgendaContext.Provider>
  );
}

export function useAgenda() {
  const context = useContext(AgendaContext);
  if (!context) {
    throw new Error('useAgenda must be used within AgendaProvider');
  }
  return context;
}
