'use client';

import { useState } from 'react';
import Link from 'next/link';
import ConfirmModal from '@/app/components/ConfirmModal';
import { formatRupiah } from '@/lib/utils/format';

const emptyItem = () => ({ uraian: '', volume: '1', satuan: '', harga_satuan: '' });
const emptyCategory = () => ({ kategori: '', items: [emptyItem()] });

export default function RabForm({ initialHeader, initialCategories, onSubmit, saving, submitLabel, cancelHref }) {
  const [header, setHeader] = useState(initialHeader);
  const [categories, setCategories] = useState(
    initialCategories && initialCategories.length > 0 ? initialCategories : [emptyCategory()]
  );
  const [deleteCategoryIndex, setDeleteCategoryIndex] = useState(null);

  const setHeaderField = (field, value) => setHeader((h) => ({ ...h, [field]: value }));

  const setCategoryName = (catIndex, value) => {
    setCategories((cats) => cats.map((c, i) => (i === catIndex ? { ...c, kategori: value } : c)));
  };

  const addCategory = () => setCategories((cats) => [...cats, emptyCategory()]);

  const requestRemoveCategory = (catIndex) => {
    const hasContent = categories[catIndex].items.some((it) => it.uraian.trim());
    if (hasContent) {
      setDeleteCategoryIndex(catIndex);
    } else {
      setCategories((cats) => cats.filter((_, i) => i !== catIndex));
    }
  };

  const confirmRemoveCategory = () => {
    setCategories((cats) => cats.filter((_, i) => i !== deleteCategoryIndex));
    setDeleteCategoryIndex(null);
  };

  const addItem = (catIndex) => {
    setCategories((cats) => cats.map((c, i) => (i === catIndex ? { ...c, items: [...c.items, emptyItem()] } : c)));
  };

  const removeItem = (catIndex, itemIndex) => {
    setCategories((cats) => cats.map((c, i) => {
      if (i !== catIndex) return c;
      return { ...c, items: c.items.filter((_, j) => j !== itemIndex) };
    }));
  };

  const updateItem = (catIndex, itemIndex, field, value) => {
    setCategories((cats) => cats.map((c, i) => {
      if (i !== catIndex) return c;
      return {
        ...c,
        items: c.items.map((it, j) => (j === itemIndex ? { ...it, [field]: value } : it)),
      };
    }));
  };

  const categorySubtotal = (cat) => cat.items.reduce(
    (sum, it) => sum + (Number(it.volume) || 0) * (Number(it.harga_satuan) || 0), 0
  );
  const grandTotal = categories.reduce((sum, cat) => sum + categorySubtotal(cat), 0);

  const handleSubmit = async (e) => {
    e.preventDefault();
    const items = categories.flatMap((cat) => cat.items.map((it) => ({
      kategori: cat.kategori,
      uraian: it.uraian,
      volume: it.volume,
      satuan: it.satuan,
      harga_satuan: it.harga_satuan,
    })));
    await onSubmit({
      nama_kegiatan: header.nama_kegiatan,
      tahun_anggaran: Number(header.tahun_anggaran),
      tanggal: header.tanggal,
      nama_penyusun: header.nama_penyusun,
      nama_penanggung_jawab: header.nama_penanggung_jawab,
      items,
    });
  };

  return (
    <form onSubmit={handleSubmit} className="card" style={{ maxWidth: 900 }}>
      <div className="card-body" style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        <div className="field">
          <label className="field-label" htmlFor="nama_kegiatan">Nama Kegiatan *</label>
          <input id="nama_kegiatan" className="input" value={header.nama_kegiatan} onChange={(e) => setHeaderField('nama_kegiatan', e.target.value)} placeholder="Mis. Pelatihan Atlet Difabel" required />
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 14 }}>
          <div className="field">
            <label className="field-label" htmlFor="tahun_anggaran">Tahun Anggaran *</label>
            <input id="tahun_anggaran" type="number" className="input" value={header.tahun_anggaran} onChange={(e) => setHeaderField('tahun_anggaran', e.target.value)} required />
          </div>
          <div className="field">
            <label className="field-label" htmlFor="tanggal">Tanggal *</label>
            <input id="tanggal" type="date" className="input" value={header.tanggal} onChange={(e) => setHeaderField('tanggal', e.target.value)} required />
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 14 }}>
          <div className="field">
            <label className="field-label" htmlFor="nama_penyusun">Nama Penyusun <span className="muted">(opsional)</span></label>
            <input id="nama_penyusun" className="input" value={header.nama_penyusun} onChange={(e) => setHeaderField('nama_penyusun', e.target.value)} />
          </div>
          <div className="field">
            <label className="field-label" htmlFor="nama_penanggung_jawab">Nama Penanggung Jawab *</label>
            <input id="nama_penanggung_jawab" className="input" value={header.nama_penanggung_jawab} onChange={(e) => setHeaderField('nama_penanggung_jawab', e.target.value)} required />
          </div>
        </div>

        <div style={{ borderTop: '1px solid var(--border)', paddingTop: 16, display: 'flex', flexDirection: 'column', gap: 20 }}>
          {categories.map((cat, catIndex) => (
            <div key={catIndex} style={{ border: '1px solid var(--border)', borderRadius: 10, padding: 14 }}>
              <div style={{ display: 'flex', gap: 10, alignItems: 'center', marginBottom: 10, flexWrap: 'wrap' }}>
                <input
                  className="input"
                  style={{ flex: 1, minWidth: 200, fontWeight: 600 }}
                  value={cat.kategori}
                  onChange={(e) => setCategoryName(catIndex, e.target.value)}
                  placeholder="Nama kategori, mis. Konsumsi"
                  required
                />
                <button type="button" className="btn btn-ghost btn-sm btn-icon" onClick={() => requestRemoveCategory(catIndex)} aria-label="Hapus kategori" style={{ color: 'var(--danger)' }}>
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ width: 14, height: 14 }}><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
                </button>
              </div>

              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.875rem' }}>
                  <thead>
                    <tr style={{ background: 'var(--surface-2)' }}>
                      {['Uraian', 'Volume', 'Satuan', 'Harga Satuan', 'Total', ''].map((h) => (
                        <th key={h} style={{ padding: '0.5rem 0.625rem', textAlign: 'left', fontWeight: 600, whiteSpace: 'nowrap' }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {cat.items.map((item, itemIndex) => {
                      const rowTotal = (Number(item.volume) || 0) * (Number(item.harga_satuan) || 0);
                      return (
                        <tr key={itemIndex} style={{ borderBottom: '1px solid var(--surface-3)' }}>
                          <td style={{ padding: '0.375rem' }}>
                            <input className="input" value={item.uraian} onChange={(e) => updateItem(catIndex, itemIndex, 'uraian', e.target.value)} placeholder="Nama item" required />
                          </td>
                          <td style={{ padding: '0.375rem', width: 100 }}>
                            <input className="input" type="number" min="0.01" step="0.01" value={item.volume} onChange={(e) => updateItem(catIndex, itemIndex, 'volume', e.target.value)} required />
                          </td>
                          <td style={{ padding: '0.375rem', width: 110 }}>
                            <input className="input" value={item.satuan} onChange={(e) => updateItem(catIndex, itemIndex, 'satuan', e.target.value)} placeholder="unit" />
                          </td>
                          <td style={{ padding: '0.375rem', width: 160 }}>
                            <input className="input" type="number" min="0" step="0.01" value={item.harga_satuan} onChange={(e) => updateItem(catIndex, itemIndex, 'harga_satuan', e.target.value)} required />
                          </td>
                          <td style={{ padding: '0.375rem', whiteSpace: 'nowrap', fontFamily: 'monospace' }}>{formatRupiah(rowTotal)}</td>
                          <td style={{ padding: '0.375rem' }}>
                            <button type="button" className="btn btn-ghost btn-sm btn-icon" onClick={() => removeItem(catIndex, itemIndex)} disabled={cat.items.length === 1} aria-label="Hapus item" style={{ color: 'var(--danger)' }}>
                              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ width: 14, height: 14 }}><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 10 }}>
                <button type="button" className="btn btn-secondary btn-sm" onClick={() => addItem(catIndex)}>+ Tambah Item</button>
                <div style={{ fontWeight: 700, fontSize: '0.875rem' }}>
                  Subtotal: <span style={{ fontFamily: 'monospace' }}>{formatRupiah(categorySubtotal(cat))}</span>
                </div>
              </div>
            </div>
          ))}

          <div>
            <button type="button" className="btn btn-secondary" onClick={addCategory}>+ Tambah Kategori</button>
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', fontSize: '1.0625rem', fontWeight: 800, borderTop: '2px solid var(--border)', paddingTop: 12 }}>
            Total RAB:&nbsp;<span style={{ fontFamily: 'monospace' }}>{formatRupiah(grandTotal)}</span>
          </div>
        </div>
      </div>

      <div className="modal-foot">
        <Link href={cancelHref} className="btn btn-secondary">Batal</Link>
        <button type="submit" className="btn btn-primary" disabled={saving}>
          {saving ? 'Menyimpan…' : submitLabel}
        </button>
      </div>

      <ConfirmModal
        open={deleteCategoryIndex !== null}
        title="Hapus Kategori"
        message="Kategori ini sudah punya item terisi. Menghapusnya akan menghapus semua item di dalamnya. Lanjutkan?"
        confirmLabel="Ya, Hapus"
        onConfirm={confirmRemoveCategory}
        onCancel={() => setDeleteCategoryIndex(null)}
      />
    </form>
  );
}
