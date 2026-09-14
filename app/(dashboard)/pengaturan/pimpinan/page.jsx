'use client';

import { useState, useEffect, useCallback } from 'react';
import { useToast } from '@/app/components/Toast';
import ConfirmModal from '@/app/components/ConfirmModal';
import { useFocusTrap } from '@/app/components/useFocusTrap';

// ============ KOMPONEN STATUS BADGE ============
function StatusBadge({ isActive }) {
  return (
    <span className="badge" style={{ background: isActive ? 'var(--success-bg)' : 'var(--surface-3)', color: isActive ? 'var(--success)' : 'var(--text-3)', fontSize: '0.6875rem' }}>
      {isActive ? 'Aktif' : 'Nonaktif'}
    </span>
  );
}

// ============ KOMPONEN MODAL TAMBAH/EDIT ============
function PimpinanModal({ item, onSave, onClose, saving }) {
  const modalRef = useFocusTrap(true, onClose);
  const [form, setForm] = useState({
    nama: item?.nama || '',
    jabatan: item?.jabatan || '',
  });
  const [error, setError] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!form.nama.trim()) { setError('Nama wajib diisi'); return; }
    onSave({ nama: form.nama.trim(), jabatan: form.jabatan.trim() || null });
  };

  return (
    <div className="modal-backdrop" onClick={onClose} ref={modalRef}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-head">
          <h3 style={{ fontSize: '1rem', fontWeight: 700 }}>{item?.id ? 'Edit Pimpinan' : 'Tambah Pimpinan'}</h3>
          <button className="btn btn-ghost btn-sm btn-icon" onClick={onClose} aria-label="Tutup">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ width: 16, height: 16 }}><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
          </button>
        </div>
        <form onSubmit={handleSubmit}>
          <div className="card-form-body">
            {error && (
              <div className="error-msg" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem' }}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ width: '1rem', height: '1rem', flexShrink: 0 }}>
                  <circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" />
                </svg>
                {error}
              </div>
            )}
            <div className="field">
              <label className="field-label" htmlFor="nama">Nama *</label>
              <input id="nama" className="input" value={form.nama} onChange={(e) => setForm({ ...form, nama: e.target.value })} placeholder="Contoh: Prof. Dr. Nurhasan, M.Kes." required />
            </div>
            <div className="field" style={{ marginTop: 16 }}>
              <label className="field-label" htmlFor="jabatan">Jabatan <span className="muted">(opsional)</span></label>
              <input id="jabatan" className="input" value={form.jabatan} onChange={(e) => setForm({ ...form, jabatan: e.target.value })} placeholder="Contoh: Rektor Unesa" />
              <p className="muted" style={{ fontSize: '0.75rem', marginTop: 4 }}>
                Tampil di dropdown sebagai "Nama (Jabatan)", mis. "Prof. Dr. Nurhasan, M.Kes. (Rektor Unesa)".
              </p>
            </div>
          </div>
          <div className="card-form-footer">
            <button type="button" className="btn btn-ghost" onClick={onClose}>Batal</button>
            <button type="submit" className="btn btn-primary" disabled={saving}>
              {saving ? 'Menyimpan…' : (item?.id ? 'Simpan Perubahan' : 'Tambah')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ============ HALAMAN UTAMA ============
export default function PimpinanSettingsPage() {
  const { error: toastError, success: toastSuccess } = useToast();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [saving, setSaving] = useState(false);
  const [deleteItem, setDeleteItem] = useState(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/pimpinan');
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
    return `${it.nama} ${it.jabatan || ''}`.toLowerCase().includes(q);
  });

  const handleSave = async (values) => {
    setSaving(true);
    try {
      const url = editingItem?.id ? `/api/pimpinan/${editingItem.id}` : '/api/pimpinan';
      const method = editingItem?.id ? 'PUT' : 'POST';
      const body = editingItem?.id ? { ...values, is_active: editingItem.is_active } : values;
      const res = await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      await fetchData();
      setShowModal(false);
      setEditingItem(null);
      toastSuccess(editingItem?.id ? 'Data pimpinan diperbarui' : 'Pimpinan berhasil ditambahkan');
    } catch (err) {
      toastError('Gagal menyimpan: ' + err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleToggleStatus = async (item) => {
    try {
      const res = await fetch(`/api/pimpinan/${item.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nama: item.nama, jabatan: item.jabatan, is_active: !item.is_active }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      await fetchData();
    } catch (err) {
      toastError('Gagal mengubah status: ' + err.message);
    }
  };

  const confirmDelete = async () => {
    if (!deleteItem) return;
    setDeleteLoading(true);
    try {
      const res = await fetch(`/api/pimpinan/${deleteItem.id}`, { method: 'DELETE' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      await fetchData();
      setDeleteItem(null);
      toastSuccess('Pimpinan dihapus');
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
          <h1 className="page-title">Data Pimpinan</h1>
          <p className="page-subtitle">Nama & jabatan pimpinan — dipakai di dropdown "Kepada" (Memo) dan "Dihadiri Pimpinan" (Agenda).</p>
        </div>
        <div className="page-actions">
          <button className="btn btn-primary" onClick={() => { setEditingItem(null); setShowModal(true); }}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ width: 16, height: 16 }}>
              <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
            </svg>
            Tambah Pimpinan
          </button>
        </div>
      </div>

      <div style={{ display: 'flex', gap: '0.75rem', marginBottom: '1rem', flexWrap: 'wrap' }}>
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Cari nama atau jabatan..."
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
                <th>Nama</th>
                <th>Jabatan</th>
                <th style={{ width: '100px' }}>Status</th>
                <th className="text-right" style={{ width: '140px' }}>Aksi</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={4} className="text-center muted" style={{ padding: '2rem' }}>Memuat...</td></tr>
              ) : filtered.length === 0 ? (
                <tr><td colSpan={4} className="text-center muted" style={{ padding: '2rem' }}>Belum ada data pimpinan</td></tr>
              ) : filtered.map((item) => (
                <tr key={item.id}>
                  <td style={{ fontWeight: 600 }}>{item.nama}</td>
                  <td className="muted">{item.jabatan || '-'}</td>
                  <td><StatusBadge isActive={item.is_active} /></td>
                  <td className="text-right">
                    <div style={{ display: 'inline-flex', gap: 4 }}>
                      <button className="btn btn-ghost btn-sm btn-icon" onClick={() => { setEditingItem(item); setShowModal(true); }} title="Edit" aria-label="Edit pimpinan">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ width: 14, height: 14 }}><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                      </button>
                      <button
                        className="btn btn-ghost btn-sm btn-icon"
                        onClick={() => handleToggleStatus(item)}
                        title={item.is_active ? 'Nonaktifkan' : 'Aktifkan'}
                        aria-label={item.is_active ? 'Nonaktifkan pimpinan' : 'Aktifkan pimpinan'}
                        style={{ color: item.is_active ? 'var(--warning)' : 'var(--success)' }}
                      >
                        {item.is_active ? (
                          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ width: 14, height: 14 }}><path d="M18.36 6.64a9 9 0 1 1-12.73 0"/><line x1="12" y1="2" x2="12" y2="12"/></svg>
                        ) : (
                          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ width: 14, height: 14 }}><path d="M5 12h14"/><path d="M12 5v14"/></svg>
                        )}
                      </button>
                      <button className="btn btn-ghost btn-sm btn-icon" onClick={() => setDeleteItem(item)} title="Hapus" aria-label="Hapus pimpinan" style={{ color: 'var(--danger)' }}>
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

      {showModal && (
        <PimpinanModal
          item={editingItem}
          onSave={handleSave}
          onClose={() => { setShowModal(false); setEditingItem(null); }}
          saving={saving}
        />
      )}

      <ConfirmModal
        open={!!deleteItem}
        title="Hapus Pimpinan"
        message={<>Yakin ingin menghapus <strong>{deleteItem?.nama}</strong> dari daftar pimpinan? Memo/agenda yang sudah dibuat dengan nama ini tidak berubah — hanya tidak muncul lagi di dropdown. Tindakan ini tidak dapat dibatalkan.</>}
        confirmLabel="Ya, Hapus"
        busy={deleteLoading}
        onConfirm={confirmDelete}
        onCancel={() => setDeleteItem(null)}
      />
    </div>
  );
}
