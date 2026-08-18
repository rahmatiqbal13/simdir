'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { useToast } from '@/app/components/Toast';
import RabForm from '../../RabForm';

function groupByKategori(rabItems) {
  const byKategori = (rabItems || []).reduce((acc, it) => {
    if (!acc[it.kategori]) acc[it.kategori] = { kategori: it.kategori, items: [] };
    acc[it.kategori].items.push({
      uraian: it.uraian,
      volume: String(it.volume),
      satuan: it.satuan || '',
      harga_satuan: String(it.harga_satuan),
    });
    return acc;
  }, {});
  return Object.values(byKategori);
}

export default function EditRabPage() {
  const params = useParams();
  const router = useRouter();
  const rabId = params?.id;
  const { error: toastError, success: toastSuccess } = useToast();

  const [fetching, setFetching] = useState(true);
  const [saving, setSaving] = useState(false);
  const [initialHeader, setInitialHeader] = useState(null);
  const [initialCategories, setInitialCategories] = useState(null);

  const fetchItem = useCallback(async () => {
    setFetching(true);
    try {
      const res = await fetch(`/api/rab/${rabId}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setInitialHeader({
        nama_kegiatan: data.nama_kegiatan || '',
        tahun_anggaran: data.tahun_anggaran || new Date().getFullYear(),
        tanggal: data.tanggal || '',
        nama_penyusun: data.nama_penyusun || '',
        nama_penanggung_jawab: data.nama_penanggung_jawab || '',
      });
      setInitialCategories(groupByKategori(data.rab_items));
    } catch (err) {
      toastError('Gagal memuat RAB: ' + err.message);
    } finally {
      setFetching(false);
    }
  }, [rabId, toastError]);

  useEffect(() => { fetchItem(); }, [fetchItem]);

  const handleSubmit = async (payload) => {
    setSaving(true);
    try {
      const res = await fetch(`/api/rab/${rabId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      toastSuccess('RAB berhasil diperbarui');
      router.push(`/rab/${rabId}`);
    } catch (err) {
      toastError('Gagal menyimpan: ' + err.message);
    } finally {
      setSaving(false);
    }
  };

  if (fetching) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '60vh' }}>
        <div className="spinner" style={{ width: 40, height: 40 }} />
      </div>
    );
  }

  if (!initialHeader) {
    return (
      <div style={{ textAlign: 'center', padding: '3rem' }}>
        <p>RAB tidak ditemukan</p>
        <Link href="/rab" className="btn btn-primary" style={{ marginTop: '1rem' }}>Kembali ke Daftar RAB</Link>
      </div>
    );
  }

  return (
    <div>
      <div className="page-header">
        <div className="page-title-wrap">
          <h1 className="page-title">Edit RAB</h1>
          <p className="page-subtitle">Ubah data RAB yang sudah ada</p>
        </div>
        <div className="page-actions">
          <Link href={`/rab/${rabId}`} className="btn btn-ghost">Batal</Link>
        </div>
      </div>

      <RabForm
        initialHeader={initialHeader}
        initialCategories={initialCategories}
        onSubmit={handleSubmit}
        saving={saving}
        submitLabel="Simpan Perubahan"
        cancelHref={`/rab/${rabId}`}
      />
    </div>
  );
}
