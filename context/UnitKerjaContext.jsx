'use client';

import { useState, useEffect, createContext, useContext, useCallback } from 'react';

const UnitKerjaContext = createContext();

async function apiRequest(url, options) {
  const res = await fetch(url, {
    ...options,
    headers: { 'Content-Type': 'application/json', ...(options?.headers || {}) },
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || 'Terjadi kesalahan');
  return data;
}

export function UnitKerjaProvider({ children }) {
  const [units, setUnits] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const loadUnits = useCallback(async () => {
    try {
      setLoading(true);
      const data = await apiRequest('/api/unit-kerja');
      setUnits(data || []);
      setError(null);
    } catch (err) {
      setError('Gagal memuat data unit kerja: ' + err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadUnits(); }, [loadUnits]);

  const addUnit = async (unit) => {
    const data = await apiRequest('/api/unit-kerja', {
      method: 'POST',
      body: JSON.stringify({
        nama: unit.nama || '',
        singkatan: unit.singkatan || unit.kode || '',
        deskripsi: unit.deskripsi || null,
        is_active: unit.is_active ?? true,
      }),
    });
    setUnits((prev) => [data, ...prev]);
    return data;
  };

  const updateUnit = async (id, unit) => {
    const data = await apiRequest(`/api/unit-kerja/${id}`, {
      method: 'PUT',
      body: JSON.stringify({
        nama: unit.nama,
        singkatan: unit.singkatan || unit.kode,
        deskripsi: unit.deskripsi || null,
        is_active: unit.is_active,
      }),
    });
    setUnits((prev) => prev.map((u) => (u.id === id ? data : u)));
    return data;
  };

  const deleteUnit = async (id) => {
    await apiRequest(`/api/unit-kerja/${id}`, { method: 'DELETE' });
    setUnits((prev) => prev.filter((u) => u.id !== id));
  };

  const toggleUnitStatus = async (id, currentStatus) => {
    const current = units.find((u) => u.id === id);
    if (!current) throw new Error('Unit kerja tidak ditemukan');
    const data = await apiRequest(`/api/unit-kerja/${id}`, {
      method: 'PUT',
      body: JSON.stringify({
        nama: current.nama,
        singkatan: current.kode,
        deskripsi: current.deskripsi,
        is_active: !currentStatus,
      }),
    });
    setUnits((prev) => prev.map((u) => (u.id === id ? data : u)));
    return data;
  };

  const refreshUnits = async () => {
    await loadUnits();
  };

  return (
    <UnitKerjaContext.Provider value={{
      units,
      loading,
      error,
      addUnit,
      updateUnit,
      deleteUnit,
      toggleUnitStatus,
      refreshUnits
    }}>
      {children}
    </UnitKerjaContext.Provider>
  );
}

export function useUnitKerja() {
  const context = useContext(UnitKerjaContext);
  if (!context) {
    throw new Error('useUnitKerja must be used within UnitKerjaProvider');
  }
  return context;
}
