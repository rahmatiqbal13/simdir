'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { useToast } from '@/app/components/Toast';
import { terbilang } from '@/lib/utils/format';

export default function EditKwitansiPage() {
  const params = useParams();
  const router = useRouter();
  const kwitansiId = params?.id;
  const { error: toastError, success: toastSuccess } = useToast();

  const [fetching, setFetching] = useState(true);
  const [saving, setSaving] = useState(false);
  const [invoiceRef, setInvoiceRef] = useState(null);
  const [form, setForm] = useState({
    tanggal: '',
    terima_dari: '',
    jumlah: '',
    untuk_pembayaran: '',
    penerima: '',
  });

  const fetchItem = useCallback(async () => {
    setFetching(true);
    try {
      const res = await fetch(`/api/kwitansi/${kwitansiId}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setForm({
        tanggal: data.tanggal || '',
        terima_dari: data.terima_dari || '',
        jumlah: String(data.jumlah ?? ''),
        untuk_pembayaran: data.untuk_pembayaran || '',
        penerima: data.penerima || '',
      });
      setInvoiceRef(data.invoice || null);
    } catch (err) {
      toastError('Gagal memuat kwitansi: ' + err.message);
    } finally {
      setFetching(false);
    }
  }, [kwitansiId, toastError]);

  useEffect(() => { fetchItem(); }, [fetchItem]);

  const set = (field, value) => setForm((f) => ({ ...f, [field]: value }));

  const jumlahNum = Number(form.jumlah);
  const terbilangPreview = Number.isFinite(jumlahNum) && jumlahNum > 0
    ? `${terbilang(Math.floor(jumlahNum))} Rupiah`
    : '';

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.terima_dari.trim()) return toastError('Nama/instansi yang membayar wajib diisi');
    if (!Number.isFinite(jumlahNum) || jumlahNum <= 0) return toastError('Jumlah uang harus lebih besar dari 0');
    if (!form.untuk_pembayaran.trim()) return toastError('Keterangan pembayaran wajib diisi');
    if (!form.tanggal) return toastError('Tanggal wajib diisi');

    setSaving(true);
    try {
      const res = await fetch(`/api/kwitansi/${kwitansiId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tanggal: form.tanggal,
          invoice_id: invoiceRef?.id || null,
          terima_dari: form.terima_dari.trim(),
          jumlah: jumlahNum,
          untuk_pembayaran: form.untuk_pembayaran.trim(),
          penerima: form.penerima.trim() || null,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      toastSuccess('Kwitansi berhasil diperbarui');
      router.push(`/e-kwitansi/${kwitansiId}`);
    } catch (err) {
      toastError('Gagal menyimpan: ' + err.message);
    } finally {
      setSaving(false);
    }
  };

  if (fetching) {
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
          <h1 className="page-title">Edit Kwitansi</h1>
          <p className="page-subtitle">Ubah data kwitansi yang sudah ada</p>
        </div>
        <div className="page-actions">
          <Link href={`/e-kwitansi/${kwitansiId}`} className="btn btn-ghost">Batal</Link>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="card" style={{ maxWidth: 640 }}>
        <div className="card-body" style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {invoiceRef && (
            <div style={{ padding: '10px 14px', borderRadius: 10, background: 'var(--info-50)', color: 'var(--info)', fontSize: '0.8125rem', fontWeight: 600 }}>
              Terkait invoice {invoiceRef.nomor_invoice}
            </div>
          )}

          <div className="field">
            <label className="field-label" htmlFor="tanggal">Tanggal *</label>
            <input id="tanggal" type="date" className="input" value={form.tanggal} onChange={(e) => set('tanggal', e.target.value)} required />
          </div>

          <div className="field">
            <label className="field-label" htmlFor="terima_dari">Telah Terima Dari *</label>
            <input id="terima_dari" className="input" value={form.terima_dari} onChange={(e) => set('terima_dari', e.target.value)} required />
          </div>

          <div className="field">
            <label className="field-label" htmlFor="jumlah">Jumlah Uang (Rp) *</label>
            <input id="jumlah" type="number" min="0" step="1" className="input" value={form.jumlah} onChange={(e) => set('jumlah', e.target.value)} required />
            {terbilangPreview && (
              <p className="muted" style={{ fontSize: '0.75rem', marginTop: 4, fontStyle: 'italic' }}>{terbilangPreview}</p>
            )}
          </div>

          <div className="field">
            <label className="field-label" htmlFor="untuk_pembayaran">Untuk Pembayaran *</label>
            <textarea id="untuk_pembayaran" className="textarea" rows={3} value={form.untuk_pembayaran} onChange={(e) => set('untuk_pembayaran', e.target.value)} required />
          </div>

          <div className="field">
            <label className="field-label" htmlFor="penerima">Penerima <span className="muted">(opsional)</span></label>
            <input id="penerima" className="input" value={form.penerima} onChange={(e) => set('penerima', e.target.value)} />
          </div>
        </div>
        <div className="modal-foot">
          <Link href={`/e-kwitansi/${kwitansiId}`} className="btn btn-secondary">Batal</Link>
          <button type="submit" className="btn btn-primary" disabled={saving}>
            {saving ? 'Menyimpan…' : 'Simpan Perubahan'}
          </button>
        </div>
      </form>
    </div>
  );
}
