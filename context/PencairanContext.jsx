'use client';

import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase/client';

const PencairanContext = createContext(null);

const slugify = (text) =>
  (text || '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '')

export function PencairanProvider({ children }) {
  const [pencairan, setPencairan] = useState([]);
  const [programs, setPrograms] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Load pencairan data from Supabase with multiple programs
  const loadPencairan = useCallback(async () => {
    setLoading(true);
    setError(null);
    
    try {
      // Fetch pencairan with their related programs through junction table
      const { data, error } = await supabase
        .from('pencairan_dana')
        .select(`
          *,
          pencairan_program(
            id,
            jumlah_alokasi,
            keterangan,
            program_kerja:program_kerja_id(
              id, nama, unit_kerja_id, pagu_anggaran
            )
          )
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;
      
      // Transform data to match the component structure
      const transformedData = data.map(item => {
        // Get all programs from junction table
        const relatedPrograms = item.pencairan_program || [];
        const programList = relatedPrograms.map(pp => ({
          id: pp.program_kerja?.id,
          nama: pp.program_kerja?.nama,
          unit_kerja: pp.program_kerja?.unit_kerja_id,
          pagu_anggaran: pp.program_kerja?.pagu_anggaran,
          jumlah_alokasi: parseFloat(pp.jumlah_alokasi) || 0,
          keterangan: pp.keterangan,
          junction_id: pp.id
        })).filter(p => p.id); // Filter out null programs

        // Calculate total alokasi from all programs
        const totalAlokasi = programList.reduce((sum, p) => sum + p.jumlah_alokasi, 0);

        const nama = item.nomor_pencairan || `Pencairan ${item.id.slice(0, 8)}`
        return {
          id: item.id,
          nama,
          slug: slugify(nama),
          programs: programList,
          program: programList.length > 0 ? programList.map(p => p.nama).join(', ') : '-',
          program_ids: programList.map(p => p.id),
          unit_kerja: programList.length > 0
            ? [...new Set(programList.map(p => p.unit_kerja))].join(', ')
            : '-',
          tanggal: item.tanggal_pencairan,
          jumlah: parseFloat(item.jumlah),
          total_alokasi: totalAlokasi,
          keterangan: item.keterangan || '',
          status: item.status,
          created_at: item.created_at,
          spj_submitted: item.status === 'selesai',
          spj_partial: item.status === 'terbit',
        };
      });

      setPencairan(transformedData);
    } catch (err) {
      console.error('Error loading pencairan:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  // Load programs for reference
  const loadPrograms = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('program_kerja')
        .select('id, nama, unit_kerja_id, pagu_anggaran')
        .eq('status', 'aktif');

      if (error) throw error;
      setPrograms(data || []);
    } catch (err) {
      console.error('Error loading programs:', err);
    }
  }, []);

  // Add new pencairan with multiple programs
  const addPencairan = async (pencairanData) => {
    try {
      // Get current user
      const { data: { user } } = await supabase.auth.getUser();
      
      // Step 1: Insert pencairan_dana
      const { data: pencairanResult, error: pencairanError } = await supabase
        .from('pencairan_dana')
        .insert([{
          nomor_pencairan: pencairanData.nama,
          jumlah: pencairanData.jumlah,
          tanggal_pencairan: pencairanData.tanggal,
          keterangan: pencairanData.keterangan,
          status: 'draft',
          created_by: user?.id
        }])
        .select()
        .single();

      if (pencairanError) throw pencairanError;

      // Step 2: Insert into junction table if programs provided
      if (pencairanData.programs && pencairanData.programs.length > 0) {
        const junctionData = pencairanData.programs.map(program => ({
          pencairan_id: pencairanResult.id,
          program_kerja_id: program.id,
          jumlah_alokasi: program.jumlah_alokasi || 0,
          keterangan: program.keterangan || ''
        }));

        const { error: junctionError } = await supabase
          .from('pencairan_program')
          .insert(junctionData);

        if (junctionError) throw junctionError;
      }
      
      await loadPencairan(); // Reload data
      return { success: true, data: pencairanResult };
    } catch (err) {
      console.error('Error adding pencairan:', err);
      return { success: false, error: err.message };
    }
  };

  // Update pencairan and its programs
  const updatePencairan = async (id, pencairanData) => {
    try {
      // Step 1: Update pencairan_dana
      const { error: pencairanError } = await supabase
        .from('pencairan_dana')
        .update({
          nomor_pencairan: pencairanData.nama,
          jumlah: pencairanData.jumlah,
          tanggal_pencairan: pencairanData.tanggal,
          keterangan: pencairanData.keterangan,
          updated_at: new Date().toISOString()
        })
        .eq('id', id);

      if (pencairanError) throw pencairanError;

      // Step 2: Handle program updates if provided
      if (pencairanData.programs) {
        // Delete existing junction records
        const { error: deleteError } = await supabase
          .from('pencairan_program')
          .delete()
          .eq('pencairan_id', id);

        if (deleteError) throw deleteError;

        // Insert new junction records
        if (pencairanData.programs.length > 0) {
          const junctionData = pencairanData.programs.map(program => ({
            pencairan_id: id,
            program_kerja_id: program.id,
            jumlah_alokasi: program.jumlah_alokasi || 0,
            keterangan: program.keterangan || ''
          }));

          const { error: insertError } = await supabase
            .from('pencairan_program')
            .insert(junctionData);

          if (insertError) throw insertError;
        }
      }
      
      await loadPencairan(); // Reload data
      return { success: true };
    } catch (err) {
      console.error('Error updating pencairan:', err);
      return { success: false, error: err.message };
    }
  };

  // Delete pencairan (junction records will be deleted automatically via CASCADE)
  const deletePencairan = async (id) => {
    try {
      const { error } = await supabase
        .from('pencairan_dana')
        .delete()
        .eq('id', id);

      if (error) throw error;
      
      await loadPencairan(); // Reload data
      return { success: true };
    } catch (err) {
      console.error('Error deleting pencairan:', err);
      return { success: false, error: err.message };
    }
  };

  // Update SPJ status
  const updateSPJStatus = async (id, status) => {
    try {
      const statusMap = {
        'pending': 'draft',
        'partial': 'terbit',
        'completed': 'selesai'
      };

      const { data, error } = await supabase
        .from('pencairan_dana')
        .update({
          status: statusMap[status] || 'draft',
          updated_at: new Date().toISOString()
        })
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      
      await loadPencairan(); // Reload data
      return { success: true, data };
    } catch (err) {
      console.error('Error updating SPJ status:', err);
      return { success: false, error: err.message };
    }
  };

  // Get single pencairan by ID with programs
  const getPencairanById = async (id) => {
    try {
      const { data, error } = await supabase
        .from('pencairan_dana')
        .select(`
          *,
          pencairan_program(
            id,
            jumlah_alokasi,
            keterangan,
            program_kerja:program_kerja_id(
              id, nama, unit_kerja_id, pagu_anggaran
            )
          )
        `)
        .eq('id', id)
        .single();

      if (error) throw error;

      // Transform related programs
      const relatedPrograms = data.pencairan_program || [];
      const programList = relatedPrograms.map(pp => ({
        id: pp.program_kerja?.id,
        nama: pp.program_kerja?.nama,
        unit_kerja: pp.program_kerja?.unit_kerja_id,
        pagu_anggaran: pp.program_kerja?.pagu_anggaran,
        jumlah_alokasi: parseFloat(pp.jumlah_alokasi) || 0,
        keterangan: pp.keterangan,
        junction_id: pp.id
      })).filter(p => p.id);

      const totalAlokasi = programList.reduce((sum, p) => sum + p.jumlah_alokasi, 0);

      // Transform to match component structure
      const nama = data.nomor_pencairan || `Pencairan ${data.id.slice(0, 8)}`
      const transformed = {
        id: data.id,
        nama,
        slug: slugify(nama),
        programs: programList,
        program: programList.length > 0 ? programList.map(p => p.nama).join(', ') : '-',
        program_ids: programList.map(p => p.id),
        unit_kerja: programList.length > 0
          ? [...new Set(programList.map(p => p.unit_kerja))].join(', ')
          : '-',
        tanggal: data.tanggal_pencairan,
        jumlah: parseFloat(data.jumlah),
        total_alokasi: totalAlokasi,
        keterangan: data.keterangan || '',
        status: data.status,
        spj_submitted: data.status === 'selesai',
        spj_partial: data.status === 'terbit',
      };

      return { success: true, data: transformed };
    } catch (err) {
      console.error('Error getting pencairan:', err);
      return { success: false, error: err.message };
    }
  };

  // Load data on mount
  useEffect(() => {
    loadPencairan();
    loadPrograms();
  }, [loadPencairan, loadPrograms]);

  const value = {
    pencairan,
    programs,
    loading,
    error,
    loadPencairan,
    addPencairan,
    updatePencairan,
    deletePencairan,
    updateSPJStatus,
    getPencairanById
  };

  return (
    <PencairanContext.Provider value={value}>
      {children}
    </PencairanContext.Provider>
  );
}

export function usePencairan() {
  const context = useContext(PencairanContext);
  if (!context) {
    throw new Error('usePencairan must be used within a PencairanProvider');
  }
  return context;
}
