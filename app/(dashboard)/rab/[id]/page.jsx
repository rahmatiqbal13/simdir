'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import ConfirmModal from '@/app/components/ConfirmModal';
import { useToast } from '@/app/components/Toast';
import { formatRupiah, formatDate } from '@/lib/utils/format';

export default function RabDetailPage() {
  const params = useParams();
  const router = useRouter();
  const rabId = params?.id;
  const { error: toastError, success: toastSuccess } = useToast();

  const [item, setItem] = useState(null);
  const [loading, setLoading] = useState(true);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(false);

  const fetchItem = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/rab/${rabId}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setItem(data);
    } catch (err) {
      toastError('Gagal memuat RAB: ' + err.message);
    } finally {
      setLoading(false);
    }
  }, [rabId, toastError]);

  useEffect(() => { fetchItem(); }, [fetchItem]);

  const handleDelete = async () => {
    setDeleteLoading(true);
    try {
      const res = await fetch(`/api/rab/${rabId}`, { method: 'DELETE' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      toastSuccess('RAB dihapus');
      router.push('/rab');
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
      <div style={{ textAlign: 'center', padding: '3rem' }}>
        <p>RAB tidak ditemukan</p>
        <Link href="/rab" className="btn btn-primary" style={{ marginTop: '1rem' }}>Kembali ke Daftar RAB</Link>
      </div>
    );
  }

  const categories = Object.values(
    (item.rab_items || []).reduce((acc, it) => {
      if (!acc[it.kategori]) acc[it.kategori] = { kategori: it.kategori, items: [] };
      acc[it.kategori].items.push(it);
      return acc;
    }, {})
  );
  const grandTotal = (item.rab_items || []).reduce((sum, it) => sum + Number(it.total || 0), 0);

  return (
    <div>
      <div className="page-header">
        <div className="page-title-wrap">
          <h1 className="page-title">{item.nomor_rab}</h1>
          <p className="page-subtitle">{item.nama_kegiatan}</p>
        </div>
        <div className="page-actions">
          <Link href="/rab" className="btn btn-ghost">Kembali</Link>
          <Link href={`/rab/${rabId}/print`} className="btn btn-secondary">Cetak</Link>
          <Link href={`/rab/${rabId}/edit`} className="btn btn-secondary">Edit</Link>
          <button className="btn btn-danger" onClick={() => setConfirmOpen(true)}>Hapus</button>
        </div>
      </div>

      <div className="card" style={{ maxWidth: 900 }}>
        <div className="card-body" style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 14 }}>
            <Detail label="Tahun Anggaran" value={String(item.tahun_anggaran)} />
            <Detail label="Tanggal" value={formatDate(item.tanggal)} />
            <Detail label="Nama Penyusun" value={item.nama_penyusun || '-'} />
            <Detail label="Nama Penanggung Jawab" value={item.nama_penanggung_jawab} />
          </div>

          <div style={{ borderTop: '1px solid var(--border)', paddingTop: 16, display: 'flex', flexDirection: 'column', gap: 14 }}>
            {categories.map((cat) => {
              const subtotal = cat.items.reduce((sum, it) => sum + Number(it.total || 0), 0);
              return (
                <div key={cat.kategori} style={{ border: '1px solid var(--border)', borderRadius: 10, padding: 14 }}>
                  <div style={{ fontWeight: 700, marginBottom: 8 }}>{cat.kategori}</div>
                  <div className="table-scroll">
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.875rem' }}>
                      <thead>
                        <tr style={{ background: 'var(--surface-2)' }}>
                          {['Uraian', 'Volume', 'Satuan', 'Harga Satuan', 'Total'].map((h) => (
                            <th key={h} style={{ padding: '0.5rem 0.625rem', textAlign: 'left', fontWeight: 600, whiteSpace: 'nowrap' }}>{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {cat.items.map((it) => (
                          <tr key={it.id} style={{ borderBottom: '1px solid var(--surface-3)' }}>
                            <td style={{ padding: '0.5rem 0.625rem' }}>{it.uraian}</td>
                            <td style={{ padding: '0.5rem 0.625rem' }}>{it.volume}</td>
                            <td style={{ padding: '0.5rem 0.625rem' }}>{it.satuan || '-'}</td>
                            <td style={{ padding: '0.5rem 0.625rem', fontFamily: 'monospace' }}>{formatRupiah(it.harga_satuan)}</td>
                            <td style={{ padding: '0.5rem 0.625rem', fontFamily: 'monospace' }}>{formatRupiah(it.total)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  <div style={{ textAlign: 'right', fontWeight: 700, marginTop: 8, fontSize: '0.875rem' }}>
                    Subtotal: <span style={{ fontFamily: 'monospace' }}>{formatRupiah(subtotal)}</span>
                  </div>
                </div>
              );
            })}

            <div style={{ display: 'flex', justifyContent: 'flex-end', fontSize: '1.0625rem', fontWeight: 800, borderTop: '2px solid var(--border)', paddingTop: 12 }}>
              Total RAB:&nbsp;<span style={{ fontFamily: 'monospace' }}>{formatRupiah(grandTotal)}</span>
            </div>
          </div>
        </div>
      </div>

      <ConfirmModal
        open={confirmOpen}
        title="Hapus RAB"
        message={<>Yakin ingin menghapus <strong>{item.nomor_rab}</strong>? Tindakan ini tidak dapat dibatalkan.</>}
        confirmLabel="Ya, Hapus"
        busy={deleteLoading}
        onConfirm={handleDelete}
        onCancel={() => setConfirmOpen(false)}
      />
    </div>
  );
}

function Detail({ label, value }) {
  return (
    <div>
      <div className="muted" style={{ fontSize: '0.75rem', marginBottom: 2 }}>{label}</div>
      <div style={{ fontSize: '0.9375rem', color: 'var(--text)' }}>{value}</div>
    </div>
  );
}
