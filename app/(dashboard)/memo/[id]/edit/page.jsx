'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { useToast } from '@/app/components/Toast';
import { useCurrentUser } from '@/lib/hooks/useCurrentUser';
import MemoForm from '../../MemoForm';

export default function EditMemoPage() {
  const params = useParams();
  const router = useRouter();
  const memoId = params?.id;
  const { error: toastError, success: toastSuccess } = useToast();
  const { isSuperAdmin, loading: userLoading } = useCurrentUser();

  const [fetching, setFetching] = useState(true);
  const [saving, setSaving] = useState(false);
  const [initial, setInitial] = useState(null);

  useEffect(() => {
    if (!userLoading && !isSuperAdmin) router.replace('/memo');
  }, [userLoading, isSuperAdmin, router]);

  const fetchItem = useCallback(async () => {
    setFetching(true);
    try {
      const res = await fetch(`/api/memo/${memoId}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setInitial({
        tanggal: data.tanggal || '',
        kepada: data.kepada || '',
        dibuat_oleh: data.dibuat_oleh || '',
        sekretaris: data.sekretaris || '',
        perihal: data.perihal || '',
        isi: data.isi || '',
      });
    } catch (err) {
      toastError('Gagal memuat memo: ' + err.message);
    } finally {
      setFetching(false);
    }
  }, [memoId, toastError]);

  useEffect(() => { fetchItem(); }, [fetchItem]);

  const handleSubmit = async (values) => {
    setSaving(true);
    try {
      const res = await fetch(`/api/memo/${memoId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(values),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      toastSuccess('Memo berhasil diperbarui');
      router.push(`/memo/${memoId}`);
    } catch (err) {
      toastError('Gagal menyimpan: ' + err.message);
    } finally {
      setSaving(false);
    }
  };

  if (userLoading || !isSuperAdmin || fetching || !initial) {
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
          <h1 className="page-title">Edit Memo</h1>
          <p className="page-subtitle">Ubah data memo yang sudah ada. Nomor memo tidak berubah.</p>
        </div>
        <div className="page-actions">
          <Link href={`/memo/${memoId}`} className="btn btn-ghost">Batal</Link>
        </div>
      </div>

      <MemoForm
        initial={initial}
        submitting={saving}
        submitLabel="Simpan Perubahan"
        cancelHref={`/memo/${memoId}`}
        onSubmit={handleSubmit}
      />
    </div>
  );
}
