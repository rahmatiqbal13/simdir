'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

let supabase;
if (supabaseUrl && supabaseKey) {
  supabase = createClient(supabaseUrl, supabaseKey);
}

export function useAgenda() {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchData = async () => {
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
          .order('tanggal_mulai', { ascending: true });

        if (supabaseError) throw supabaseError;
        setData(data || []);
        setError(null);
      } catch (err) {
        console.error('Error fetching agenda:', err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  return { data, loading, error, refetch: () => fetchData() };
}

export function useProgramKerja() {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchData = async () => {
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

        if (supabaseError) throw supabaseError;
        setData(data || []);
        setError(null);
      } catch (err) {
        console.error('Error fetching program kerja:', err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  return { data, loading, error, refetch: () => fetchData() };
}

export function usePencairanDana() {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        if (!supabase) {
          setError('Supabase belum dikonfigurasi');
          setLoading(false);
          return;
        }

        const { data, error: supabaseError } = await supabase
          .from('pencairan_dana')
          .select('*')
          .order('created_at', { ascending: false });

        if (supabaseError) throw supabaseError;
        setData(data || []);
        setError(null);
      } catch (err) {
        console.error('Error fetching pencairan dana:', err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  return { data, loading, error, refetch: () => fetchData() };
}

export function useSPJ() {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        if (!supabase) {
          setError('Supabase belum dikonfigurasi');
          setLoading(false);
          return;
        }

        const { data, error: supabaseError } = await supabase
          .from('spj')
          .select('*')
          .order('created_at', { ascending: false });

        if (supabaseError) throw supabaseError;
        setData(data || []);
        setError(null);
      } catch (err) {
        console.error('Error fetching SPJ:', err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  return { data, loading, error, refetch: () => fetchData() };
}

export { supabase };
