'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useToast } from '@/app/components/Toast';
import { useCurrentUser } from '@/lib/hooks/useCurrentUser';
import { nomorToSlug } from '@/lib/utils/format';
import MemoForm from '../MemoForm';

const todayStr = () => new Date().toISOString().split('T')[0];

export default function CreateMemoPage() {
  const router = useRouter();
  const { error: toastError, success: toastSuccess } = useToast();
  const { displayName, isSuperAdmin, loading: userLoading } = useCurrentUser();
  const [saving, setSaving] = useState(false);

  // pimpinan (read-only) tidak boleh di halaman create — kembalikan ke list.
  useEffect(() => {
    if (!userLoading && !isSuperAdmin) router.replace('/memo');
  }, [userLoading, isSuperAdmin, router]);

  const handleSubmit = async (values) => {
    setSaving(true);
    try {
      const res = await fetch('/api/memo', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(values),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      toastSuccess('Memo berhasil dibuat');
      router.push(`/memo/${nomorToSlug(data.nomor)}`);
    } catch (err) {
      toastError('Gagal menyimpan: ' + err.message);
    } finally {
      setSaving(false);
    }
  };

  if (userLoading || !isSuperAdmin) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '60vh' }}>
        <div className="spinner" style={{ width: 40, height: 40 }} />
      </div>
    );
  }

  return (
    <div>
      <div className="page-header">
        <div className="page-title-wrap">
          <h1 className="page-title">Tambah Memo</h1>
          <p className="page-subtitle">Buat nota dinas baru untuk pimpinan.</p>
        </div>
        <div className="page-actions">
          <Link href="/memo" className="btn btn-ghost">Batal</Link>
        </div>
      </div>

      <MemoForm
        initial={{ tanggal: todayStr(), kepada: '', dibuat_oleh: displayName || '', perihal: '', isi: '' }}
        submitting={saving}
        submitLabel="Simpan Memo"
        cancelHref="/memo"
        onSubmit={handleSubmit}
      />
    </div>
  );
}
