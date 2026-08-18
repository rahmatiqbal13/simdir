'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useToast } from '@/app/components/Toast';
import { nomorToSlug } from '@/lib/utils/format';
import RabForm from '../RabForm';

const todayStr = () => new Date().toISOString().split('T')[0];

export default function CreateRabPage() {
  const router = useRouter();
  const { error: toastError, success: toastSuccess } = useToast();
  const [saving, setSaving] = useState(false);

  const initialHeader = {
    nama_kegiatan: '',
    tahun_anggaran: new Date().getFullYear(),
    tanggal: todayStr(),
    nama_penyusun: '',
    nama_penanggung_jawab: '',
  };

  const handleSubmit = async (payload) => {
    setSaving(true);
    try {
      const res = await fetch('/api/rab', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      toastSuccess('RAB berhasil dibuat');
      router.push(`/rab/${nomorToSlug(data.nomor_rab)}`);
    } catch (err) {
      toastError('Gagal menyimpan: ' + err.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div>
      <div className="page-header">
        <div className="page-title-wrap">
          <h1 className="page-title">Buat RAB</h1>
          <p className="page-subtitle">Susun rincian anggaran per kategori.</p>
        </div>
        <div className="page-actions">
          <Link href="/rab" className="btn btn-ghost">Batal</Link>
        </div>
      </div>

      <RabForm
        initialHeader={initialHeader}
        initialCategories={null}
        onSubmit={handleSubmit}
        saving={saving}
        submitLabel="Simpan RAB"
        cancelHref="/rab"
      />
    </div>
  );
}
