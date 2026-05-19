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

      // Transform data untuk menambahkan sisa_pagu
      const transformedData = (data || []).map(program => ({
        ...program,
        dana_terpakai: program.dana_terpakai || 0,
        sisa_pagu: (program.pagu_anggaran || 0) - (program.dana_terpakai || 0)
      }));

      if (supabaseError) {
        console.error('Error loading programs:', supabaseError);
        setError('Gagal memuat data program kerja: ' + (supabaseError.message || 'Unknown error'));
      } else {
        setPrograms(transformedData);
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

      // Get current user
      const { data: { user } } = await supabase.auth.getUser();
      
      // Valid sumber_dana values based on database constraint
      const VALID_SUMBER_DANA = ['UKT', 'UU', 'BPPTN', 'SPP', 'Sponsor', 'Lainnya']
      const normalizeSumberDana = (val) => {
        if (!val) return 'UKT'
        const v = val.toString().trim().toUpperCase()
        if (VALID_SUMBER_DANA.includes(v)) return v
        if (v === 'SA' || v.includes('SWADANA')) return 'Lainnya'
        if (v === 'DJRP' || v.includes('DJARUM')) return 'Sponsor'
        return 'UKT'
      }

      const programData = {
        nama: program.nama_program || program.nama || '',
        id_rka: program.id_rka || null,
        unit_kerja_id: program.unit_kerja_id || program.unit_kerja || null,
        sumber_dana: normalizeSumberDana(program.sumber_dana),
        pagu_anggaran: Number(program.pagu || program.pagu_anggaran || 0),
        tahun: Number(program.tahun || new Date().getFullYear()),
        status: program.status || 'aktif',
        created_by: user?.id || null
      };

      // Validasi tipe data
      if (typeof programData.nama !== 'string' || programData.nama.trim() === '') {
        throw new Error('Nama program harus diisi')
      }
      if (!programData.id_rka) {
        throw new Error('ID RKA harus diisi')
      }
      if (isNaN(programData.pagu_anggaran) || programData.pagu_anggaran < 0) {
        throw new Error('Pagu anggaran tidak valid')
      }
      if (isNaN(programData.tahun) || programData.tahun < 2000 || programData.tahun > 2100) {
        throw new Error('Tahun tidak valid')
      }

      const { data, error: supabaseError } = await supabase
        .from('program_kerja')
        .insert([programData])
        .select()
        .single();

      if (supabaseError) {
        console.error('Error adding program:', supabaseError);
        console.error('Failed program data:', programData);
        // Handle empty object error
        let errorMsg = 'Gagal menambahkan program';
        if (supabaseError && typeof supabaseError === 'object') {
          if (supabaseError.message) {
            errorMsg = supabaseError.message;
          } else if (supabaseError.code) {
            errorMsg = `Error code: ${supabaseError.code}`;
            // Handle PostgreSQL error codes
            if (supabaseError.code === '23505') {
              errorMsg = `Program dengan ID RKA "${programData.id_rka}" untuk tahun ${programData.tahun} sudah ada (duplicate)`;
            } else if (supabaseError.code === '23502') {
              errorMsg = `Field wajib tidak diisi: ${supabaseError.column || 'unknown'}`;
            } else if (supabaseError.code === '23503') {
              errorMsg = `Foreign key constraint failed: ${supabaseError.message || 'unknown reference'}`;
            }
          } else if (supabaseError.details) {
            errorMsg = supabaseError.details;
          } else {
            errorMsg = `Unknown error: ${JSON.stringify(supabaseError)}`;
          }
        }
        throw new Error(errorMsg);
      }

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

      // Valid sumber_dana values based on database constraint
      const VALID_SUMBER_DANA = ['UKT', 'UU', 'BPPTN', 'SPP', 'Sponsor', 'Lainnya']
      const normalizeSumberDana = (val) => {
        if (!val) return 'UKT'
        const v = val.toString().trim().toUpperCase()
        if (VALID_SUMBER_DANA.includes(v)) return v
        if (v === 'SA' || v.includes('SWADANA')) return 'Lainnya'
        if (v === 'DJRP' || v.includes('DJARUM')) return 'Sponsor'
        return 'UKT'
      }

      const programData = {
        nama: program.nama_program || program.nama,
        id_rka: program.id_rka || null,
        unit_kerja_id: program.unit_kerja_id || program.unit_kerja || null,
        sumber_dana: normalizeSumberDana(program.sumber_dana),
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

  // Fungsi untuk recalculate dana terpakai (bisa dipanggil setelah SPJ diupdate)
  const recalculateDanaTerpakai = async (programId) => {
    try {
      if (!supabase) {
        throw new Error('Supabase belum dikonfigurasi');
      }

      // Panggil RPC function di Supabase untuk recalculate
      const { data, error } = await supabase
        .rpc('update_program_dana_terpakai', {
          p_program_id: programId
        });

      if (error) {
        console.error('Error recalculating dana terpakai:', error);
        throw error;
      }

      // Refresh programs setelah update
      await loadPrograms();
      return { success: true };
    } catch (err) {
      console.error('Error in recalculateDanaTerpakai:', err);
      throw err;
    }
  };

  // Fungsi untuk recalculate semua program
  const recalculateAllDana = async () => {
    try {
      if (!supabase) {
        throw new Error('Supabase belum dikonfigurasi');
      }

      const { data, error } = await supabase
        .rpc('recalculate_all_program_dana');

      if (error) {
        console.error('Error recalculating all dana:', error);
        throw error;
      }

      await loadPrograms();
      return { success: true };
    } catch (err) {
      console.error('Error in recalculateAllDana:', err);
      throw err;
    }
  };

  // Get sisa pagu untuk program tertentu
  const getSisaPagu = (programId) => {
    const program = programs.find(p => p.id === programId);
    if (!program) return 0;
    return (program.pagu_anggaran || 0) - (program.dana_terpakai || 0);
  };

  const deleteAllPrograms = async () => {
    try {
      if (!supabase) throw new Error('Supabase belum dikonfigurasi')
      
      console.log('Menghapus semua data dari biaya_variabel...')
      // Delete biaya_variabel first (no guaranteed cascade)
      const { error: bvErr, data: bvData } = await supabase
        .from('biaya_variabel')
        .delete()
        .not('id', 'is', null)
        .select()
      
      if (bvErr) {
        console.error('Error menghapus biaya_variabel:', bvErr)
        throw bvErr
      }
      console.log('Berhasil menghapus biaya_variabel:', bvData)
      
      console.log('Menghapus semua data dari program_kerja...')
      const { error, data } = await supabase
        .from('program_kerja')
        .delete()
        .not('id', 'is', null)
        .select()
      
      if (error) {
        console.error('Error menghapus program_kerja:', error)
        throw error
      }
      console.log('Berhasil menghapus program_kerja:', data)
      
      setPrograms([])
      console.log('State programs direset')
    } catch (err) {
      console.error('Error di deleteAllPrograms:', err)
      throw err
    }
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
      deleteAllPrograms,
      refreshPrograms,
      recalculateDanaTerpakai,
      recalculateAllDana,
      getSisaPagu,
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
