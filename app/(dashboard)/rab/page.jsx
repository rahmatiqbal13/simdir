'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useToast } from '@/app/components/Toast';
import ConfirmModal from '@/app/components/ConfirmModal';
import { formatRupiah, formatDate, nomorToSlug } from '@/lib/utils/format';

export default function RabListPage() {
  const { error: toastError, success: toastSuccess } = useToast();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterTahun, setFilterTahun] = useState('');
  const [deleteItem, setDeleteItem] = useState(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/rab');
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

  const totalOf = (item) => (item.rab_items || []).reduce((sum, it) => sum + Number(it.total || 0), 0);

  const tahunOptions = [...new Set(items.map((it) => it.tahun_anggaran))].sort((a, b) => b - a);

  const filtered = items.filter((it) => {
    if (filterTahun && String(it.tahun_anggaran) !== filterTahun) return false;
    if (!search) return true;
    const q = search.toLowerCase();
    return `${it.nomor_rab} ${it.nama_kegiatan}`.toLowerCase().includes(q);
  });

  const confirmDelete = async () => {
    if (!deleteItem) return;
    setDeleteLoading(true);
    try {
      const res = await fetch(`/api/rab/${nomorToSlug(deleteItem.nomor_rab)}`, { method: 'DELETE' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      await fetchData();
      setDeleteItem(null);
      toastSuccess('RAB berhasil dihapus');
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
          <h1 className="page-title">RAB</h1>
          <p className="page-subtitle">Rencana Anggaran Biaya — susun, edit, dan cetak dokumen RAB.</p>
        </div>
        <div className="page-actions">
          <Link href="/rab/create" className="btn btn-primary">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ width: 16, height: 16 }}>
              <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
            </svg>
            Buat RAB
          </Link>
        </div>
      </div>

      <div style={{ display: 'flex', gap: '0.75rem', marginBottom: '1rem', flexWrap: 'wrap' }}>
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Cari nomor RAB atau nama kegiatan…"
          className="input"
          style={{ flex: 1, minWidth: 240 }}
        />
        <select
          value={filterTahun}
          onChange={(e) => setFilterTahun(e.target.value)}
          className="input"
          style={{ minWidth: 160 }}
        >
          <option value="">Semua Tahun Anggaran</option>
          {tahunOptions.map((tahun) => (
            <option key={tahun} value={String(tahun)}>{tahun}</option>
          ))}
        </select>
        {(search || filterTahun) && (
          <button onClick={() => { setSearch(''); setFilterTahun(''); }} className="btn btn-ghost">Reset</button>
        )}
      </div>

      <div className="table-wrap">
        <div className="table-scroll">
          <table>
            <thead>
              <tr>
                {['No. RAB', 'Nama Kegiatan', 'Tahun Anggaran', 'Total', 'Tanggal', 'Aksi'].map((h) => (
                  <th key={h}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={6} className="text-center muted" style={{ padding: '2rem' }}>Memuat…</td></tr>
              ) : filtered.length === 0 ? (
                <tr><td colSpan={6} className="text-center muted" style={{ padding: '2rem' }}>Belum ada RAB</td></tr>
              ) : filtered.map((item) => (
                <tr key={item.id}>
                  <td style={{ fontWeight: 600, fontFamily: 'monospace', whiteSpace: 'nowrap' }}>{item.nomor_rab}</td>
                  <td>{item.nama_kegiatan}</td>
                  <td className="num" style={{ whiteSpace: 'nowrap' }}>{item.tahun_anggaran}</td>
                  <td className="num" style={{ whiteSpace: 'nowrap', fontFamily: 'monospace' }}>{formatRupiah(totalOf(item))}</td>
                  <td className="num muted" style={{ whiteSpace: 'nowrap', fontSize: '0.8125rem' }}>{formatDate(item.tanggal)}</td>
                  <td className="text-right">
                    <div style={{ display: 'inline-flex', gap: 8 }}>
                      <Link href={`/rab/${nomorToSlug(item.nomor_rab)}`} className="btn btn-ghost icon-only" title="Detail" aria-label="Lihat detail RAB">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ width: 14, height: 14 }}><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
                      </Link>
                      <Link href={`/rab/${nomorToSlug(item.nomor_rab)}/print`} className="btn btn-ghost icon-only" title="Cetak" aria-label="Cetak RAB">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ width: 14, height: 14 }}><polyline points="6 9 6 2 18 2 18 9"/><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/><rect x="6" y="14" width="12" height="8"/></svg>
                      </Link>
                      <button className="btn btn-ghost icon-only" onClick={() => setDeleteItem(item)} title="Hapus" aria-label="Hapus RAB" style={{ color: 'var(--danger)' }}>
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ width: 14, height: 14 }}><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
                      </button>
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
        title="Hapus RAB"
        message={<>Yakin ingin menghapus <strong>{deleteItem?.nomor_rab}</strong> — {deleteItem?.nama_kegiatan}? Tindakan ini tidak dapat dibatalkan.</>}
        confirmLabel="Ya, Hapus"
        busy={deleteLoading}
        onConfirm={confirmDelete}
        onCancel={() => setDeleteItem(null)}
      />
    </div>
  );
}
