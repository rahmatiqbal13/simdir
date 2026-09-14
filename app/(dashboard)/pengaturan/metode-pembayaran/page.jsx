'use client';

import { useState, useEffect, useCallback } from 'react';
import { useToast } from '@/app/components/Toast';
import ConfirmModal from '@/app/components/ConfirmModal';
import { useFocusTrap } from '@/app/components/useFocusTrap';

const ALLOWED_QR_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
const MAX_QR_SIZE = 2 * 1024 * 1024;

// ============ KOMPONEN MODAL TAMBAH/EDIT ============
function PaymentMethodModal({ item, onSave, onClose, saving }) {
  const modalRef = useFocusTrap(true, onClose);
  const [type, setType] = useState(item?.type || 'qr');
  const [label, setLabel] = useState(item?.label || '');
  const [bankName, setBankName] = useState(item?.bank_name || '');
  const [vaNumber, setVaNumber] = useState(item?.va_number || '');
  const [imageFile, setImageFile] = useState(null);
  const [imagePreview, setImagePreview] = useState(item?.image_url || null);
  const [error, setError] = useState('');

  useEffect(() => {
    return () => { if (imagePreview && imagePreview.startsWith('blob:')) URL.revokeObjectURL(imagePreview); };
  }, [imagePreview]);

  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!ALLOWED_QR_TYPES.includes(file.type)) {
      setError('Format gambar harus JPG, PNG, atau WebP');
      e.target.value = '';
      return;
    }
    if (file.size > MAX_QR_SIZE) {
      setError('Ukuran gambar maksimal 2MB');
      e.target.value = '';
      return;
    }
    setError('');
    setImageFile(file);
    setImagePreview(URL.createObjectURL(file));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!label.trim()) { setError('Label wajib diisi'); return; }
    if (type === 'qr') {
      if (!item?.id && !imageFile) { setError('Gambar QR wajib diupload'); return; }
    } else {
      if (!bankName.trim() || !vaNumber.trim()) { setError('Nama bank dan nomor VA wajib diisi'); return; }
    }
    setError('');
    const fd = new FormData();
    fd.append('type', type);
    fd.append('label', label.trim());
    if (type === 'qr' && imageFile) fd.append('image', imageFile);
    if (type === 'va') {
      fd.append('bank_name', bankName.trim());
      fd.append('va_number', vaNumber.trim());
    }
    onSave(fd);
  };

  return (
    <div className="modal-backdrop" onClick={onClose} ref={modalRef}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-head">
          <h3 style={{ fontSize: '1rem', fontWeight: 700 }}>{item?.id ? 'Edit Metode Pembayaran' : 'Tambah Metode Pembayaran'}</h3>
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
            {!item?.id && (
              <div className="field">
                <label className="field-label">Tipe *</label>
                <div style={{ display: 'flex', gap: '0.75rem', marginTop: 4 }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer' }}>
                    <input type="radio" name="type" checked={type === 'qr'} onChange={() => setType('qr')} /> QR Code
                  </label>
                  <label style={{ display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer' }}>
                    <input type="radio" name="type" checked={type === 'va'} onChange={() => setType('va')} /> Virtual Account
                  </label>
                </div>
              </div>
            )}
            <div className="field" style={{ marginTop: 16 }}>
              <label className="field-label" htmlFor="label">Label *</label>
              <input id="label" className="input" value={label} onChange={(e) => setLabel(e.target.value)} placeholder={type === 'qr' ? 'Contoh: Kolam Renang' : 'Contoh: BNI - SSFC'} required />
            </div>
            {type === 'qr' ? (
              <div className="field" style={{ marginTop: 16 }}>
                <label className="field-label">
                  Gambar QR {item?.id ? <span className="muted">(kosongkan untuk tetap pakai gambar sekarang)</span> : '*'}
                </label>
                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginTop: 4 }}>
                  {imagePreview && (
                    <img src={imagePreview} alt="Preview QR" style={{ width: 64, height: 64, objectFit: 'contain', border: '1px solid var(--border)', borderRadius: 8, background: 'white' }} />
                  )}
                  <input type="file" accept=".jpg,.jpeg,.png,.webp" onChange={handleFileChange} />
                </div>
                <p className="muted" style={{ fontSize: '0.75rem', marginTop: 4 }}>
                  JPG, PNG, atau WebP. Maks. 2MB. Disarankan PNG supaya QR tetap tajam saat di-scan.
                </p>
              </div>
            ) : (
              <>
                <div className="field" style={{ marginTop: 16 }}>
                  <label className="field-label" htmlFor="bank_name">Nama Bank *</label>
                  <input id="bank_name" className="input" value={bankName} onChange={(e) => setBankName(e.target.value)} placeholder="Contoh: BNI" required />
                </div>
                <div className="field" style={{ marginTop: 16 }}>
                  <label className="field-label" htmlFor="va_number">Nomor VA *</label>
                  <input id="va_number" className="input" value={vaNumber} onChange={(e) => setVaNumber(e.target.value)} placeholder="Contoh: 1234567890123" required />
                </div>
              </>
            )}
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
export default function PaymentMethodsSettingsPage() {
  const { error: toastError, success: toastSuccess } = useToast();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [saving, setSaving] = useState(false);
  const [deleteItem, setDeleteItem] = useState(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/payment-methods');
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

  const handleSave = async (fd) => {
    setSaving(true);
    try {
      const url = editingItem?.id ? `/api/payment-methods/${editingItem.id}` : '/api/payment-methods';
      const method = editingItem?.id ? 'PUT' : 'POST';
      if (editingItem?.id) fd.append('is_active', String(editingItem.is_active));
      const res = await fetch(url, { method, body: fd });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      await fetchData();
      setShowModal(false);
      setEditingItem(null);
      toastSuccess(editingItem?.id ? 'Metode pembayaran diperbarui' : 'Metode pembayaran ditambahkan');
    } catch (err) {
      toastError('Gagal menyimpan: ' + err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleToggleStatus = async (item) => {
    try {
      const fd = new FormData();
      fd.append('label', item.label);
      fd.append('is_active', String(!item.is_active));
      if (item.type === 'va') {
        fd.append('bank_name', item.bank_name || '');
        fd.append('va_number', item.va_number || '');
      }
      const res = await fetch(`/api/payment-methods/${item.id}`, { method: 'PUT', body: fd });
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
      const res = await fetch(`/api/payment-methods/${deleteItem.id}`, { method: 'DELETE' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      await fetchData();
      setDeleteItem(null);
      toastSuccess('Metode pembayaran dihapus');
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
          <h1 className="page-title">Metode Pembayaran</h1>
          <p className="page-subtitle">Daftar QR dan Virtual Account yang bisa dipilih saat membuat invoice.</p>
        </div>
        <div className="page-actions">
          <button className="btn btn-primary" onClick={() => { setEditingItem(null); setShowModal(true); }}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ width: 16, height: 16 }}>
              <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
            </svg>
            Tambah Metode
          </button>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: '1rem' }}>
        {loading ? (
          <div className="muted" style={{ padding: '2rem', textAlign: 'center' }}>Memuat...</div>
        ) : items.length === 0 ? (
          <div className="muted" style={{ padding: '2rem', textAlign: 'center' }}>Belum ada metode pembayaran</div>
        ) : items.map((item) => (
          <div key={item.id} className="card">
            <div className="card-body" style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                {item.type === 'qr' ? (
                  <img src={item.image_url} alt={item.label} style={{ width: 56, height: 56, objectFit: 'contain', border: '1px solid var(--border)', borderRadius: 8, background: 'white' }} />
                ) : (
                  <div style={{ width: 56, height: 56, borderRadius: 8, background: 'var(--surface-2)', display: 'grid', placeItems: 'center', fontSize: '0.6875rem', fontWeight: 700, color: 'var(--text-2)' }}>VA</div>
                )}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: 600 }}>{item.label}</div>
                  {item.type === 'va' && (
                    <div className="muted" style={{ fontSize: '0.8125rem' }}>{item.bank_name} — {item.va_number}</div>
                  )}
                </div>
                <span className="badge" style={{ background: item.is_active ? 'var(--success-bg)' : 'var(--surface-3)', color: item.is_active ? 'var(--success)' : 'var(--text-3)', fontSize: '0.6875rem' }}>
                  {item.is_active ? 'Aktif' : 'Nonaktif'}
                </span>
              </div>
              <div style={{ display: 'flex', gap: 4, justifyContent: 'flex-end' }}>
                <button className="btn btn-ghost btn-sm btn-icon" onClick={() => { setEditingItem(item); setShowModal(true); }} title="Edit" aria-label="Edit metode">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ width: 14, height: 14 }}><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                </button>
                <button
                  className="btn btn-ghost btn-sm btn-icon"
                  onClick={() => handleToggleStatus(item)}
                  title={item.is_active ? 'Nonaktifkan' : 'Aktifkan'}
                  aria-label={item.is_active ? 'Nonaktifkan metode' : 'Aktifkan metode'}
                  style={{ color: item.is_active ? 'var(--warning)' : 'var(--success)' }}
                >
                  {item.is_active ? (
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ width: 14, height: 14 }}><path d="M18.36 6.64a9 9 0 1 1-12.73 0"/><line x1="12" y1="2" x2="12" y2="12"/></svg>
                  ) : (
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ width: 14, height: 14 }}><path d="M5 12h14"/><path d="M12 5v14"/></svg>
                  )}
                </button>
                <button className="btn btn-ghost btn-sm btn-icon" onClick={() => setDeleteItem(item)} title="Hapus" aria-label="Hapus metode" style={{ color: 'var(--danger)' }}>
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ width: 14, height: 14 }}><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {showModal && (
        <PaymentMethodModal
          item={editingItem}
          onSave={handleSave}
          onClose={() => { setShowModal(false); setEditingItem(null); }}
          saving={saving}
        />
      )}

      <ConfirmModal
        open={!!deleteItem}
        title="Hapus Metode Pembayaran"
        message={<>Yakin ingin menghapus <strong>{deleteItem?.label}</strong>? Metode ini mungkin sudah dipakai di invoice sebelumnya — invoice tersebut tidak akan lagi menampilkan info pembayaran ini saat dicetak ulang. Tindakan ini tidak dapat dibatalkan.</>}
        confirmLabel="Ya, Hapus"
        busy={deleteLoading}
        onConfirm={confirmDelete}
        onCancel={() => setDeleteItem(null)}
      />
    </div>
  );
}
