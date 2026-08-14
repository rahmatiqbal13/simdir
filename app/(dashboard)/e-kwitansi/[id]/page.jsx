'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import ConfirmModal from '@/app/components/ConfirmModal';
import { useToast } from '@/app/components/Toast';
import { formatRupiah, formatDate, terbilang, nomorToSlug } from '@/lib/utils/format';

export default function KwitansiDetailPage() {
  const params = useParams();
  const router = useRouter();
  const kwitansiId = params?.id;
  const { error: toastError, success: toastSuccess } = useToast();

  const [item, setItem] = useState(null);
  const [loading, setLoading] = useState(true);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(false);

  const fetchItem = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/kwitansi/${kwitansiId}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setItem(data);
    } catch (err) {
      toastError('Gagal memuat kwitansi: ' + err.message);
    } finally {
      setLoading(false);
    }
  }, [kwitansiId, toastError]);

  useEffect(() => { fetchItem(); }, [fetchItem]);

  const handleDelete = async () => {
    setDeleteLoading(true);
    try {
      const res = await fetch(`/api/kwitansi/${kwitansiId}`, { method: 'DELETE' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      toastSuccess('Kwitansi dihapus');
      router.push('/e-kwitansi');
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
        <h3>Kwitansi Tidak Ditemukan</h3>
        <Link href="/e-kwitansi" className="btn btn-primary" style={{ marginTop: '1rem' }}>
          Kembali ke Daftar Kwitansi
        </Link>
      </div>
    );
  }

  return (
    <>
      <div>
        <div className="page-header">
          <div className="page-title-wrap">
            <h1 className="page-title">Detail Kwitansi</h1>
            <p className="page-subtitle">{item.nomor_kwitansi}</p>
          </div>
          <div className="page-actions">
            <Link href="/e-kwitansi" className="btn btn-ghost">Kembali</Link>
            <Link href={`/e-kwitansi/${kwitansiId}/print`} className="btn btn-secondary">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ width: 16, height: 16 }}>
                <polyline points="6 9 6 2 18 2 18 9"/><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/>
                <rect x="6" y="14" width="12" height="8"/>
              </svg>
              Cetak
            </Link>
            <Link href={`/e-kwitansi/${kwitansiId}/edit`} className="btn btn-primary">
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
          </div>
        </div>

        <div className="card" style={{ maxWidth: 640 }}>
          <div className="card-body" style={{ display: 'grid', gap: '1rem' }}>
            <Field label="No. Kwitansi" value={item.nomor_kwitansi} mono />
            <Field label="Tanggal" value={formatDate(item.tanggal)} />
            <Field label="Telah Terima Dari" value={item.terima_dari} />
            <Field label="Jumlah Uang" value={formatRupiah(item.jumlah)} mono>
              <div className="muted" style={{ fontSize: '0.8125rem', fontStyle: 'italic', marginTop: 2 }}>
                {terbilang(Math.floor(item.jumlah))} Rupiah
              </div>
            </Field>
            <Field label="Untuk Pembayaran" value={item.untuk_pembayaran} />
            {item.penerima && <Field label="Penerima" value={item.penerima} />}
            <Field label="Invoice Terkait" value={item.invoice ? null : '-'}>
              {item.invoice && (
                <Link href={`/e-invoice/${nomorToSlug(item.invoice.nomor_invoice)}`} className="badge" style={{ textDecoration: 'none' }}>
                  {item.invoice.nomor_invoice}
                </Link>
              )}
            </Field>
          </div>
        </div>
      </div>

      <ConfirmModal
        open={confirmOpen}
        title="Hapus Kwitansi"
        message={<>Yakin ingin menghapus kwitansi <strong>{item.nomor_kwitansi}</strong>? Tindakan ini tidak dapat dibatalkan.</>}
        confirmLabel="Ya, Hapus"
        busy={deleteLoading}
        onConfirm={handleDelete}
        onCancel={() => setConfirmOpen(false)}
      />
    </>
  );
}

function Field({ label, value, mono, children }) {
  return (
    <div>
      <div style={{ fontSize: '0.75rem', color: 'var(--text-3)', marginBottom: 2 }}>{label}</div>
      {value !== null && value !== undefined && (
        <div style={{ fontWeight: 600, fontFamily: mono ? 'monospace' : undefined }}>{value}</div>
      )}
      {children}
    </div>
  );
}
