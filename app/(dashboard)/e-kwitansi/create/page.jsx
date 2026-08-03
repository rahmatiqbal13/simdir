'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { supabase } from '@/lib/supabase/client';
import { useToast } from '@/app/components/Toast';
import { terbilang } from '@/lib/utils/format';

const todayStr = () => new Date().toISOString().split('T')[0];

export default function CreateKwitansiPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const invoiceIdParam = searchParams.get('invoice_id');
  const { error: toastError, success: toastSuccess } = useToast();

  const [sourceInvoice, setSourceInvoice] = useState(null);
  const [loadingInvoice, setLoadingInvoice] = useState(!!invoiceIdParam);
  const [saving, setSaving] = useState(false);

  const [form, setForm] = useState({
    tanggal: todayStr(),
    terima_dari: '',
    jumlah: '',
    untuk_pembayaran: '',
    penerima: '',
  });

  // Kalau dibuka dari halaman invoice ("Buat Kwitansi"), ambil data
  // pelanggan/nominal invoice tsb untuk mengisi form otomatis.
  useEffect(() => {
    if (!invoiceIdParam) return;
    (async () => {
      try {
        const { data, error } = await supabase
          .from('invoice_summary')
          .select('*')
          .eq('id', invoiceIdParam)
          .single();
        if (error) throw error;
        setSourceInvoice(data);
        setForm((f) => ({
          ...f,
          terima_dari: data.nama_pelanggan || '',
          jumlah: String(data.total || ''),
          untuk_pembayaran: `Pembayaran invoice ${data.nomor_invoice}`,
        }));
      } catch (err) {
        toastError('Gagal memuat data invoice: ' + err.message);
      } finally {
        setLoadingInvoice(false);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [invoiceIdParam]);

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

    setSaving(true);
    try {
      const res = await fetch('/api/kwitansi', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tanggal: form.tanggal,
          invoice_id: invoiceIdParam || null,
          terima_dari: form.terima_dari.trim(),
          jumlah: jumlahNum,
          untuk_pembayaran: form.untuk_pembayaran.trim(),
          penerima: form.penerima.trim() || null,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      toastSuccess('Kwitansi berhasil dibuat');
      router.push(`/e-kwitansi/${data.id}`);
    } catch (err) {
      toastError('Gagal menyimpan: ' + err.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div>
      <div className="page-header">
        <div className="page-title-wrap">
          <h1 className="page-title">Buat Kwitansi</h1>
          <p className="page-subtitle">Isi manual, atau otomatis terisi kalau dibuka dari invoice.</p>
        </div>
        <div className="page-actions">
          <Link href="/e-kwitansi" className="btn btn-ghost">Batal</Link>
        </div>
      </div>

      {loadingInvoice ? (
        <div className="card"><div className="card-body" style={{ textAlign: 'center', padding: '2rem' }}>
          <div className="spinner" style={{ width: 32, height: 32, margin: '0 auto' }} />
        </div></div>
      ) : (
        <form onSubmit={handleSubmit} className="card" style={{ maxWidth: 640 }}>
          <div className="card-body" style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {sourceInvoice && (
              <div style={{ padding: '10px 14px', borderRadius: 10, background: 'var(--info-50)', color: 'var(--info)', fontSize: '0.8125rem', fontWeight: 600 }}>
                Terkait invoice {sourceInvoice.nomor_invoice} — {sourceInvoice.status === 'lunas' ? 'sudah Lunas' : `status: ${sourceInvoice.status}`}
              </div>
            )}

            <div className="field">
              <label className="field-label" htmlFor="tanggal">Tanggal *</label>
              <input id="tanggal" type="date" className="input" value={form.tanggal} onChange={(e) => set('tanggal', e.target.value)} required />
            </div>

            <div className="field">
              <label className="field-label" htmlFor="terima_dari">Telah Terima Dari *</label>
              <input id="terima_dari" className="input" value={form.terima_dari} onChange={(e) => set('terima_dari', e.target.value)} placeholder="Nama orang/instansi yang membayar" required />
            </div>

            <div className="field">
              <label className="field-label" htmlFor="jumlah">Jumlah Uang (Rp) *</label>
              <input id="jumlah" type="number" min="0" step="1000" className="input" value={form.jumlah} onChange={(e) => set('jumlah', e.target.value)} placeholder="0" required />
              {terbilangPreview && (
                <p className="muted" style={{ fontSize: '0.75rem', marginTop: 4, fontStyle: 'italic' }}>{terbilangPreview}</p>
              )}
            </div>

            <div className="field">
              <label className="field-label" htmlFor="untuk_pembayaran">Untuk Pembayaran *</label>
              <textarea id="untuk_pembayaran" className="textarea" rows={3} value={form.untuk_pembayaran} onChange={(e) => set('untuk_pembayaran', e.target.value)} placeholder="Keperluan/keterangan pembayaran" required />
            </div>

            <div className="field">
              <label className="field-label" htmlFor="penerima">Penerima <span className="muted">(opsional)</span></label>
              <input id="penerima" className="input" value={form.penerima} onChange={(e) => set('penerima', e.target.value)} placeholder="Nama yang menandatangani kwitansi" />
            </div>
          </div>
          <div className="modal-foot">
            <Link href="/e-kwitansi" className="btn btn-secondary">Batal</Link>
            <button type="submit" className="btn btn-primary" disabled={saving}>
              {saving ? 'Menyimpan…' : 'Simpan Kwitansi'}
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
