'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useToast } from '@/app/components/Toast';
import ConfirmModal from '@/app/components/ConfirmModal';
import { useCurrentUser } from '@/lib/hooks/useCurrentUser';
import { formatDate, nomorToSlug } from '@/lib/utils/format';

export default function MemoListPage() {
  const { error: toastError, success: toastSuccess } = useToast();
  const { isSuperAdmin } = useCurrentUser();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [deleteItem, setDeleteItem] = useState(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/memo');
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setItems(data || []);
    } catch (err) {
      toastError('Gagal memuat data: ' + err.message);
    } finally {
      setLoading(false);
    }
  }, [toastError]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const filtered = items.filter((it) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return `${it.nomor} ${it.kepada} ${it.perihal} ${it.dibuat_oleh}`.toLowerCase().includes(q);
  });

  const confirmDelete = async () => {
    if (!deleteItem) return;
    setDeleteLoading(true);
    try {
      const res = await fetch(`/api/memo/${nomorToSlug(deleteItem.nomor)}`, { method: 'DELETE' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      await fetchData();
      setDeleteItem(null);
      toastSuccess('Memo berhasil dihapus');
    } catch (err) {
      toastError('Gagal menghapus: ' + err.message);
    } finally {
      setDeleteLoading(false);
    }
  };

  return (
    <div>
      <div className="page-header">
        <div className="page-title-wrap">
          <h1 className="page-title">Memo Pimpinan</h1>
          <p className="page-subtitle">Nota dinas untuk pimpinan — buat, cetak, lalu minta tanda tangan langsung ke pimpinan.</p>
        </div>
        {isSuperAdmin && (
          <div className="page-actions">
            <Link href="/memo/create" className="btn btn-primary">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ width: 16, height: 16 }}>
                <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
              </svg>
              Tambah Memo
            </Link>
          </div>
        )}
      </div>

      <div style={{ display: 'flex', gap: '0.75rem', marginBottom: '1rem', flexWrap: 'wrap' }}>
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Cari nomor, kepada, perihal, atau pembuat..."
          className="input"
          style={{ flex: 1, minWidth: 240 }}
        />
        {search && <button onClick={() => setSearch('')} className="btn btn-ghost">Reset</button>}
      </div>

      <div className="table-wrap">
        <div className="table-scroll">
          <table>
            <thead>
              <tr>
                {['No. Memo', 'Tanggal', 'Kepada', 'Perihal', 'Dibuat Oleh'].map((h) => <th key={h}>{h}</th>)}
                <th className="text-right">Aksi</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={6} className="text-center muted" style={{ padding: '2rem' }}>Memuat...</td></tr>
              ) : filtered.length === 0 ? (
                <tr><td colSpan={6} className="text-center muted" style={{ padding: '2rem' }}>Belum ada memo</td></tr>
              ) : filtered.map((item) => (
                <tr key={item.id}>
                  <td style={{ fontWeight: 600, fontFamily: 'monospace', whiteSpace: 'nowrap' }}>{item.nomor}</td>
                  <td className="muted" style={{ whiteSpace: 'nowrap', fontSize: '0.8125rem' }}>{formatDate(item.tanggal)}</td>
                  <td style={{ whiteSpace: 'nowrap' }}>{item.kepada}</td>
                  <td style={{ maxWidth: 320, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{item.perihal}</td>
                  <td style={{ whiteSpace: 'nowrap' }}>{item.dibuat_oleh}</td>
                  <td className="text-right">
                    <div style={{ display: 'inline-flex', gap: 4 }}>
                      <Link href={`/memo/${nomorToSlug(item.nomor)}`} className="btn btn-ghost btn-sm btn-icon" title="Detail" aria-label="Lihat detail memo">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ width: 14, height: 14 }}><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
                      </Link>
                      <Link href={`/memo/${nomorToSlug(item.nomor)}/print`} className="btn btn-ghost btn-sm btn-icon" title="Cetak" aria-label="Cetak memo">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ width: 14, height: 14 }}><polyline points="6 9 6 2 18 2 18 9"/><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/><rect x="6" y="14" width="12" height="8"/></svg>
                      </Link>
                      {isSuperAdmin && (
                        <button className="btn btn-ghost btn-sm btn-icon" onClick={() => setDeleteItem(item)} title="Hapus" aria-label="Hapus memo" style={{ color: 'var(--danger)' }}>
                          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ width: 14, height: 14 }}><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <ConfirmModal
        open={!!deleteItem}
        title="Hapus Memo"
        message={<>Yakin ingin menghapus memo <strong>{deleteItem?.nomor}</strong>? Tindakan ini tidak dapat dibatalkan.</>}
        confirmLabel="Ya, Hapus"
        busy={deleteLoading}
        onConfirm={confirmDelete}
        onCancel={() => setDeleteItem(null)}
      />
    </div>
  );
}
