'use client';

import { useEffect, useRef } from 'react';
import { safeLocalStorage } from '@/lib/localStorage';

export default function useAutosave(data, key, shouldSave = true) {
  const timerRef = useRef(null);
  const lastSavedRef = useRef(null);

  useEffect(() => {
    if (!shouldSave) {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
        timerRef.current = null;
      }
      return;
    }

    const dataJson = JSON.stringify(data);
    if (dataJson === lastSavedRef.current) {
      return;
    }

    if (timerRef.current) {
      clearTimeout(timerRef.current);
    }

    timerRef.current = setTimeout(() => {
      try {
        const payload = {
          ...data,
          savedAt: new Date().toISOString(),
        };
        safeLocalStorage.setItem(key, JSON.stringify(payload));
        lastSavedRef.current = JSON.stringify(data);
      } catch (e) {
        console.error('Autosave error:', e);
      }
      timerRef.current = null;
    }, 5000);

    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
        timerRef.current = null;
      }
    };
  }, [data, key, shouldSave]);
}
