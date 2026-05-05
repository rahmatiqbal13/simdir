'use client';

import { useState, useEffect, createContext, useContext } from 'react';
import { createClient } from '@supabase/supabase-js';

const AgendaContext = createContext();

// Inisialisasi Supabase client
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

let supabase;
if (supabaseUrl && supabaseKey) {
  supabase = createClient(supabaseUrl, supabaseKey);
}

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
      
      const agendaData = {
        ...item,
        created_by: user?.id || null
      };

      const { data, error: supabaseError } = await supabase
        .from('agenda')
        .insert([agendaData])
        .select()
        .single();

      if (supabaseError) {
        console.error('Error adding agenda:', supabaseError);
        throw supabaseError;
      }

      setAgenda(prev => [data, ...prev]);
      return data;
    } catch (err) {
      console.error('Error:', err);
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
