'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import ConfirmModal from '@/app/components/ConfirmModal';
import { useToast } from '@/app/components/Toast';
import { useCurrentUser } from '@/lib/hooks/useCurrentUser';
import { formatDate } from '@/lib/utils/format';

export default function MemoDetailPage() {
  const params = useParams();
  const router = useRouter();
  const memoId = params?.id;
  const { error: toastError, success: toastSuccess } = useToast();
  const { isSuperAdmin } = useCurrentUser();

  const [item, setItem] = useState(null);
  const [loading, setLoading] = useState(true);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(false);

  const fetchItem = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/memo/${memoId}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setItem(data);
    } catch (err) {
      toastError('Gagal memuat memo: ' + err.message);
    } finally {
      setLoading(false);
    }
  }, [memoId, toastError]);

  useEffect(() => { fetchItem(); }, [fetchItem]);

  const handleDelete = async () => {
    setDeleteLoading(true);
    try {
      const res = await fetch(`/api/memo/${memoId}`, { method: 'DELETE' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      toastSuccess('Memo dihapus');
      router.push('/memo');
    } catch (err) {
      toastError('Gagal menghapus: ' + err.message);
      setDeleteLoading(false);
    }
  };

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '60vh' }}>
        <div className="spinner" style={{ width: 40, height: 40 }} />
      </div>
    );
  }

  if (!item) {
    return (
      <div className="empty-state">
        <h3>Memo Tidak Ditemukan</h3>
        <Link href="/memo" className="btn btn-primary" style={{ marginTop: '1rem' }}>Kembali ke Daftar Memo</Link>
      </div>
    );
  }

  return (
    <>
      <div>
        <div className="page-header">
          <div className="page-title-wrap">
            <h1 className="page-title">Detail Memo</h1>
            <p className="page-subtitle">{item.nomor}</p>
          </div>
          <div className="page-actions">
            <Link href="/memo" className="btn btn-ghost">Kembali</Link>
            <Link href={`/memo/${memoId}/print`} className="btn btn-secondary">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ width: 16, height: 16 }}>
                <polyline points="6 9 6 2 18 2 18 9"/><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/><rect x="6" y="14" width="12" height="8"/>
              </svg>
              Cetak
            </Link>
            {isSuperAdmin && (
              <>
                <Link href={`/memo/${memoId}/edit`} className="btn btn-primary">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ width: 16, height: 16 }}>
                    <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
                    <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
                  </svg>
                  Edit
                </Link>
                <button className="btn btn-danger" onClick={() => setConfirmOpen(true)}>
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ width: 16, height: 16 }}>
                    <polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
                  </svg>
                  Hapus
                </button>
              </>
            )}
          </div>
        </div>

        <div className="card" style={{ maxWidth: 720 }}>
          <div className="card-body" style={{ display: 'grid', gap: '1rem' }}>
            <Field label="No. Memo" value={item.nomor} mono />
            <Field label="Tanggal" value={formatDate(item.tanggal)} />
            <Field label="Kepada" value={item.kepada} />
            <Field label="Perihal" value={item.perihal} />
            <Field label="Dibuat Oleh" value={item.dibuat_oleh} />
            <Field label="Diperiksa oleh (Sekretaris)" value={item.sekretaris || '-'} />
            <div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-3)', marginBottom: 4 }}>Isi Memo</div>
              <div style={{ whiteSpace: 'pre-wrap', lineHeight: 1.6 }}>{item.isi}</div>
            </div>
          </div>
        </div>
      </div>

      <ConfirmModal
        open={confirmOpen}
        title="Hapus Memo"
        message={<>Yakin ingin menghapus memo <strong>{item.nomor}</strong>? Tindakan ini tidak dapat dibatalkan.</>}
        confirmLabel="Ya, Hapus"
        busy={deleteLoading}
        onConfirm={handleDelete}
        onCancel={() => setConfirmOpen(false)}
      />
    </>
  );
}

function Field({ label, value, mono }) {
  return (
    <div>
      <div style={{ fontSize: '0.75rem', color: 'var(--text-3)', marginBottom: 2 }}>{label}</div>
      <div style={{ fontWeight: 600, fontFamily: mono ? 'monospace' : undefined }}>{value}</div>
    </div>
  );
}
