'use client';

import { useState, useEffect, createContext, useContext } from 'react';
import { supabase } from '@/lib/supabase/client';

const ProgramKerjaContext = createContext();

export function ProgramKerjaProvider({ children }) {
  const [programs, setPrograms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Load data dari Supabase saat mount
  useEffect(() => {
    loadPrograms();
  }, []);

  const loadPrograms = async () => {
    try {
      setLoading(true);
      
      if (!supabase) {
        setError('Supabase belum dikonfigurasi');
        setLoading(false);
        return;
      }

      const { data, error: supabaseError } = await supabase
        .from('program_kerja')
        .select('*')
        .order('created_at', { ascending: false });

      if (supabaseError) {
        console.error('Error loading programs:', supabaseError);
        setError('Gagal memuat data program kerja');
      } else {
        setPrograms(data || []);
        setError(null);
      }
    } catch (err) {
      console.error('Error:', err);
      setError('Terjadi kesalahan');
    } finally {
      setLoading(false);
    }
  };

  const addProgram = async (program) => {
    try {
      if (!supabase) {
        throw new Error('Supabase belum dikonfigurasi');
      }

      console.log('Adding program:', program);

      // Get current user
      const { data: { user } } = await supabase.auth.getUser();
      
      const programData = {
        nama: program.nama_program || program.nama || '',
        id_rka: program.id_rka || null,
        unit_kerja_id: program.unit_kerja_id || program.unit_kerja || null,
        sumber_dana: program.sumber_dana || 'UKT',
        pagu_anggaran: program.pagu || program.pagu_anggaran || 0,
        tahun: program.tahun || new Date().getFullYear(),
        status: program.status || 'aktif',
        created_by: user?.id || null
      };

      console.log('Program data to insert:', programData);

      const { data, error: supabaseError } = await supabase
        .from('program_kerja')
        .insert([programData])
        .select()
        .single();

      if (supabaseError) {
        console.error('Error adding program:', supabaseError);
        throw new Error(supabaseError.message || 'Gagal menambahkan program');
      }

      console.log('Program added:', data);
      setPrograms(prev => [data, ...prev]);
      return data;
    } catch (err) {
      console.error('Error in addProgram:', err);
      throw err;
    }
  };

  const updateProgram = async (id, program) => {
    try {
      if (!supabase) {
        throw new Error('Supabase belum dikonfigurasi');
      }

      const programData = {
        nama: program.nama_program || program.nama,
        id_rka: program.id_rka || null,
        unit_kerja_id: program.unit_kerja_id || program.unit_kerja || null,
        sumber_dana: program.sumber_dana || 'UKT',
        pagu_anggaran: program.pagu || program.pagu_anggaran,
        tahun: program.tahun,
        status: program.status || 'aktif'
      };

      const { data, error: supabaseError } = await supabase
        .from('program_kerja')
        .update(programData)
        .eq('id', id)
        .select()
        .single();

      if (supabaseError) {
        console.error('Error updating program:', supabaseError);
        throw supabaseError;
      }

      setPrograms(prev => prev.map(p => p.id === id ? data : p));
      return data;
    } catch (err) {
      console.error('Error:', err);
      throw err;
    }
  };

  const deleteProgram = async (id) => {
    try {
      if (!supabase) {
        throw new Error('Supabase belum dikonfigurasi');
      }

      const { error: supabaseError } = await supabase
        .from('program_kerja')
        .delete()
        .eq('id', id);

      if (supabaseError) {
        console.error('Error deleting program:', supabaseError);
        throw supabaseError;
      }

      setPrograms(prev => prev.filter(p => p.id !== id));
    } catch (err) {
      console.error('Error:', err);
      throw err;
    }
  };

  const refreshPrograms = async () => {
    await loadPrograms();
  };

  // Load biaya variabel untuk program tertentu
  const loadBiayaVariabel = async (programId) => {
    try {
      if (!supabase) {
        throw new Error('Supabase belum dikonfigurasi');
      }

      const { data, error: supabaseError } = await supabase
        .from('biaya_variabel')
        .select('*')
        .eq('program_kerja_id', programId)
        .order('created_at', { ascending: true });

      if (supabaseError) {
        console.error('Error loading biaya variabel:', supabaseError);
        throw supabaseError;
      }

      return data || [];
    } catch (err) {
      console.error('Error in loadBiayaVariabel:', err);
      throw err;
    }
  };

  // Tambah biaya variabel
  const addBiayaVariabel = async (programId, variabel) => {
    try {
      if (!supabase) {
        throw new Error('Supabase belum dikonfigurasi');
      }

      const variabelData = {
        program_kerja_id: programId,
        nama_variabel: variabel.nama_variabel || '',
        jumlah: variabel.jumlah || 1,
        satuan: variabel.satuan || '',
        harga_satuan: variabel.harga_satuan || 0
      };

      const { data, error: supabaseError } = await supabase
        .from('biaya_variabel')
        .insert([variabelData])
        .select()
        .single();

      if (supabaseError) {
        console.error('Error adding biaya variabel:', supabaseError);
        throw supabaseError;
      }

      return data;
    } catch (err) {
      console.error('Error in addBiayaVariabel:', err);
      throw err;
    }
  };

  // Update biaya variabel
  const updateBiayaVariabel = async (id, variabel) => {
    try {
      if (!supabase) {
        throw new Error('Supabase belum dikonfigurasi');
      }

      const variabelData = {
        nama_variabel: variabel.nama_variabel,
        jumlah: variabel.jumlah,
        satuan: variabel.satuan,
        harga_satuan: variabel.harga_satuan
      };

      const { data, error: supabaseError } = await supabase
        .from('biaya_variabel')
        .update(variabelData)
        .eq('id', id)
        .select()
        .single();

      if (supabaseError) {
        console.error('Error updating biaya variabel:', supabaseError);
        throw supabaseError;
      }

      return data;
    } catch (err) {
      console.error('Error in updateBiayaVariabel:', err);
      throw err;
    }
  };

  // Delete biaya variabel
  const deleteBiayaVariabel = async (id) => {
    try {
      if (!supabase) {
        throw new Error('Supabase belum dikonfigurasi');
      }

      const { error: supabaseError } = await supabase
        .from('biaya_variabel')
        .delete()
        .eq('id', id);

      if (supabaseError) {
        console.error('Error deleting biaya variabel:', supabaseError);
        throw supabaseError;
      }
    } catch (err) {
      console.error('Error in deleteBiayaVariabel:', err);
      throw err;
    }
  };

  return (
    <ProgramKerjaContext.Provider value={{ 
      programs, 
      loading, 
      error,
      addProgram, 
      updateProgram, 
      deleteProgram, 
      refreshPrograms,
      loadBiayaVariabel,
      addBiayaVariabel,
      updateBiayaVariabel,
      deleteBiayaVariabel
    }}>
      {children}
    </ProgramKerjaContext.Provider>
  );
}

export function useProgramKerja() {
  const context = useContext(ProgramKerjaContext);
  if (!context) {
    throw new Error('useProgramKerja must be used within ProgramKerjaProvider');
  }
  return context;
}
