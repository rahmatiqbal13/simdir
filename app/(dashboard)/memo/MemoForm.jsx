'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useToast } from '@/app/components/Toast';
import { usePimpinanList } from '@/lib/hooks/usePimpinanList';

export default function MemoForm({ initial, submitting, submitLabel, cancelHref, onSubmit }) {
  const { error: toastError } = useToast();
  const { options: pimpinanOptions, loading: pimpinanLoading } = usePimpinanList();

  const [form, setForm] = useState({
    tanggal: initial.tanggal || '',
    kepada: initial.kepada || '',
    sekretaris: initial.sekretaris || '',
    dibuat_oleh: initial.dibuat_oleh || '',
    perihal: initial.perihal || '',
    isi: initial.isi || '',
  });

  const set = (field, value) => setForm((f) => ({ ...f, [field]: value }));

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!form.kepada.trim()) return toastError('Nama pimpinan (Kepada) wajib dipilih atau diisi');
    if (!form.perihal.trim()) return toastError('Perihal wajib diisi');
    if (!form.dibuat_oleh.trim()) return toastError('Nama pembuat wajib diisi');
    if (!form.isi.trim()) return toastError('Isi memo wajib diisi');
    if (!form.tanggal) return toastError('Tanggal wajib diisi');

    onSubmit({
      tanggal: form.tanggal,
      kepada: form.kepada.trim(),
      sekretaris: form.sekretaris.trim(),
      dibuat_oleh: form.dibuat_oleh.trim(),
      perihal: form.perihal.trim(),
      isi: form.isi.trim(),
    });
  };

  return (
    <form onSubmit={handleSubmit} className="card" style={{ maxWidth: 640 }}>
      <div className="card-body" style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        <div className="field">
          <label className="field-label" htmlFor="tanggal">Tanggal *</label>
          <input id="tanggal" type="date" className="input" value={form.tanggal} onChange={(e) => set('tanggal', e.target.value)} required />
        </div>

        <PimpinanPicker
          id="kepada"
          label="Kepada (Nama Pimpinan) *"
          placeholder="-- Pilih Pimpinan --"
          manualPlaceholder="Tulis nama/jabatan pimpinan"
          value={form.kepada}
          onChange={(v) => set('kepada', v)}
          options={pimpinanOptions}
          loading={pimpinanLoading}
          required
          hint={<>Tidak ada di daftar? Kelola di <Link href="/pengaturan/pimpinan">Pengaturan &gt; Data Pimpinan</Link>, atau pilih "Lainnya" untuk input manual. Pimpinan ini juga menandatangani memo.</>}
        />

        <PimpinanPicker
          id="sekretaris"
          label="Sekretaris (Penanda Tangan)"
          placeholder="-- Pilih Sekretaris --"
          manualPlaceholder="Tulis nama sekretaris"
          value={form.sekretaris}
          onChange={(v) => set('sekretaris', v)}
          options={pimpinanOptions}
          loading={pimpinanLoading}
          hint="Opsional. Kalau kosong, kolom tanda tangan sekretaris dicetak dengan titik-titik."
        />

        <div className="field">
          <label className="field-label" htmlFor="perihal">Perihal *</label>
          <input id="perihal" className="input" value={form.perihal} onChange={(e) => set('perihal', e.target.value)} placeholder="Hal / pokok memo" required />
        </div>

        <div className="field">
          <label className="field-label" htmlFor="dibuat_oleh">Dibuat Oleh *</label>
          <input id="dibuat_oleh" className="input" value={form.dibuat_oleh} onChange={(e) => set('dibuat_oleh', e.target.value)} placeholder="Nama pembuat memo" required />
        </div>

        <div className="field">
          <label className="field-label" htmlFor="isi">Isi Memo *</label>
          <textarea id="isi" className="textarea" rows={8} value={form.isi} onChange={(e) => set('isi', e.target.value)} placeholder="Tulis isi memo di sini..." required />
        </div>
      </div>
      <div className="modal-foot">
        <Link href={cancelHref} className="btn btn-secondary">Batal</Link>
        <button type="submit" className="btn btn-primary" disabled={submitting}>
          {submitting ? 'Menyimpan…' : submitLabel}
        </button>
      </div>
    </form>
  );
}

// Dropdown nama dari Data Pimpinan + opsi "Lainnya" untuk input manual.
// `value` selalu berupa nama final (string). Daftar dimuat async dari
// /api/pimpinan, jadi deteksi "value tersimpan tidak ada di daftar -> mode
// manual" baru dilakukan sekali setelah daftarnya selesai dimuat.
function PimpinanPicker({ id, label, placeholder, manualPlaceholder, value, onChange, options, loading, required, hint }) {
  const [manual, setManual] = useState(false);
  const [initialized, setInitialized] = useState(false);

  useEffect(() => {
    if (loading || initialized) return;
    const known = options.some((p) => p.value === value && p.value !== 'lainnya');
    setManual(!!value && !known);
    setInitialized(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loading, options, initialized]);

  const handleSelect = (v) => {
    if (v === 'lainnya') {
      setManual(true);
      onChange('');
    } else {
      setManual(false);
      onChange(v);
    }
  };

  return (
    <div className="field">
      <label className="field-label" htmlFor={id}>{label}</label>
      <select
        id={id}
        className="select"
        value={manual ? 'lainnya' : value}
        onChange={(e) => handleSelect(e.target.value)}
        disabled={loading}
        required={required}
      >
        <option value="">{loading ? 'Memuat daftar…' : placeholder}</option>
        {options.map((p) => <option key={p.value} value={p.value}>{p.label}</option>)}
      </select>
      {hint && <p className="muted" style={{ fontSize: '0.75rem', marginTop: 4 }}>{hint}</p>}
      {manual && (
        <input
          className="input"
          style={{ marginTop: 8 }}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={manualPlaceholder}
          required={required}
        />
      )}
    </div>
  );
}
