'use client';

import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase/client';

export function useAgenda() {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchData = useCallback(async () => {
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
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  return { data, loading, error, refetch: fetchData };
}

export { supabase };
