'use client';

import { useState, useEffect, useCallback } from 'react';

// Daftar pimpinan aktif untuk dropdown "Kepada" (Memo) / "Nama Pimpinan"
// (Agenda) — dikelola dari Pengaturan > Data Pimpinan (/api/pimpinan),
// bukan lagi daftar statis di source code. Dipakai bareng oleh kedua form
// supaya satu sumber data.
//
// Mengembalikan `options` dalam bentuk { value, label } yang sama seperti
// PIMPINAN_LIST lama, termasuk entri 'lainnya' di akhir untuk input
// manual — supaya kode form yang sudah ada (deteksi "value tidak dikenal
// -> pilih lainnya") tidak perlu berubah.
export function usePimpinanList() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/pimpinan');
      const data = await res.json();
      setItems(res.ok ? (data || []) : []);
    } catch {
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const options = [
    ...items
      .filter((p) => p.is_active)
      .map((p) => ({
        value: p.nama,
        label: p.jabatan ? `${p.nama} (${p.jabatan})` : p.nama,
      })),
    { value: 'lainnya', label: 'Lainnya (Input Manual)' },
  ];

  return { options, loading };
}
