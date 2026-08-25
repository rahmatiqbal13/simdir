'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase/client';

// Nama & role user yang sedang login, lewat Supabase Auth atau fallback
// sesi lokal (METODE 2 login) — pola yang sama dipakai berulang di halaman
// e-invoice, jadi diekstrak ke satu tempat.
export function useCurrentUser() {
  const [displayName, setDisplayName] = useState('');
  const [role, setRole] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          const { data: profile } = await supabase
            .from('profiles')
            .select('nama, role')
            .eq('id', user.id)
            .single();
          if (!cancelled) {
            setDisplayName(profile?.nama || user.email || '');
            setRole(profile?.role || '');
          }
          return;
        }
      } catch (e) {
        console.error('useCurrentUser: gagal ambil user Supabase Auth:', e);
      }

      try {
        const localSession = localStorage.getItem('simdir_session');
        if (localSession) {
          const sessionData = JSON.parse(atob(localSession));
          if (!cancelled) {
            setDisplayName(sessionData.full_name || sessionData.username || '');
            setRole(sessionData.role || '');
          }
        }
      } catch (e) {
        console.error('useCurrentUser: sesi lokal tidak valid:', e);
      }
    }

    load().finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, []);

  return { displayName, role, isSuperAdmin: role === 'super_admin', loading };
}
