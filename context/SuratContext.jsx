'use client';

import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase/client';

const SuratContext = createContext(null);

export function SuratProvider({ children }) {
  const [suratMasuk, setSuratMasuk] = useState([]);
  const [suratKeluar, setSuratKeluar] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Load surat masuk
  const loadSuratMasuk = useCallback(async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('surat')
        .select('*')
        .eq('tipe', 'masuk')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setSuratMasuk(data || []);
    } catch (err) {
      console.error('Error loading surat masuk:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  // Load surat keluar
  const loadSuratKeluar = useCallback(async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('surat')
        .select('*')
        .eq('tipe', 'keluar')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setSuratKeluar(data || []);
    } catch (err) {
      console.error('Error loading surat keluar:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  // Load all surat
  const loadAllSurat = useCallback(async () => {
    await Promise.all([loadSuratMasuk(), loadSuratKeluar()]);
  }, [loadSuratMasuk, loadSuratKeluar]);

  // Add surat masuk
  const addSuratMasuk = async (suratData) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      const { data, error } = await supabase
        .from('surat')
        .insert([{
          tipe: 'masuk',
          nomor_surat: suratData.nomor_surat,
          perihal: suratData.perihal,
          jenis: suratData.jenis || 'lainnya',
          asal: suratData.asal,
          tertuju: suratData.tertuju,
          tanggal_surat: suratData.tanggal_surat,
          tanggal_diterima: suratData.tanggal_diterima,
          lampiran: suratData.lampiran || false,
          keterangan: suratData.keterangan,
          created_by: user?.id
        }])
        .select()
        .single();

      if (error) throw error;
      await loadSuratMasuk();
      return { success: true, data };
    } catch (err) {
      console.error('Error adding surat masuk:', err);
      return { success: false, error: err.message };
    }
  };

  // Add surat keluar
  const addSuratKeluar = async (suratData) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      const { data, error } = await supabase
        .from('surat')
        .insert([{
          tipe: 'keluar',
          nomor_surat: suratData.nomor_surat,
          perihal: suratData.perihal,
          jenis: suratData.jenis || 'lainnya',
          tujuan: suratData.tujuan,
          tanggal_keluar: suratData.tanggal,
          unit_kerja_peminta: suratData.unit_kerja_peminta,
          pemohon: suratData.pemohon,
          penanda_tangan: suratData.penanda_tangan,
          lampiran: suratData.lampiran || false,
          keterangan: suratData.keterangan,
          created_by: user?.id
        }])
        .select()
        .single();

      if (error) throw error;
      await loadSuratKeluar();
      return { success: true, data };
    } catch (err) {
      console.error('Error adding surat keluar:', err);
      return { success: false, error: err.message };
    }
  };

  // Update surat
  const updateSurat = async (id, suratData, tipe) => {
    try {
      let updateData = {
        nomor_surat: suratData.nomor_surat,
        perihal: suratData.perihal,
        jenis: suratData.jenis || 'lainnya',
        lampiran: suratData.lampiran || false,
        keterangan: suratData.keterangan,
        updated_at: new Date().toISOString()
      };

      if (tipe === 'masuk') {
        updateData = {
          ...updateData,
          asal: suratData.asal,
          tertuju: suratData.tertuju,
          tanggal_surat: suratData.tanggal_surat,
          tanggal_diterima: suratData.tanggal_diterima,
        };
      } else {
        updateData = {
          ...updateData,
          tujuan: suratData.tujuan,
          tanggal_keluar: suratData.tanggal,
          unit_kerja_peminta: suratData.unit_kerja_peminta,
          pemohon: suratData.pemohon,
          penanda_tangan: suratData.penanda_tangan,
        };
      }

      const { data, error } = await supabase
        .from('surat')
        .update(updateData)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      
      if (tipe === 'masuk') {
        await loadSuratMasuk();
      } else {
        await loadSuratKeluar();
      }
      
      return { success: true, data };
    } catch (err) {
      console.error('Error updating surat:', err);
      return { success: false, error: err.message };
    }
  };

  // Delete surat
  const deleteSurat = async (id, tipe) => {
    try {
      const { error } = await supabase
        .from('surat')
        .delete()
        .eq('id', id);

      if (error) throw error;
      
      if (tipe === 'masuk') {
        await loadSuratMasuk();
      } else {
        await loadSuratKeluar();
      }
      
      return { success: true };
    } catch (err) {
      console.error('Error deleting surat:', err);
      return { success: false, error: err.message };
    }
  };

  // Get stats
  const getStats = useCallback(() => {
    const masukWithLampiran = suratMasuk.filter(s => s.lampiran).length;
    const keluarWithLampiran = suratKeluar.filter(s => s.lampiran).length;
    
    return {
      masuk: suratMasuk.length,
      keluar: suratKeluar.length,
      total: suratMasuk.length + suratKeluar.length,
      withLampiran: masukWithLampiran + keluarWithLampiran,
    };
  }, [suratMasuk, suratKeluar]);

  // Load data on mount
  useEffect(() => {
    loadAllSurat();
  }, [loadAllSurat]);

  const value = {
    suratMasuk,
    suratKeluar,
    loading,
    error,
    loadSuratMasuk,
    loadSuratKeluar,
    loadAllSurat,
    addSuratMasuk,
    addSuratKeluar,
    updateSurat,
    deleteSurat,
    getStats
  };

  return (
    <SuratContext.Provider value={value}>
      {children}
    </SuratContext.Provider>
  );
}

export function useSurat() {
  const context = useContext(SuratContext);
  if (!context) {
    throw new Error('useSurat must be used within a SuratProvider');
  }
  return context;
}
