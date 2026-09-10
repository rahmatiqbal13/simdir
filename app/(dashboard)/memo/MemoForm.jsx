'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useToast } from '@/app/components/Toast';
import { PIMPINAN_LIST } from '@/lib/constants/pimpinan';

export default function MemoForm({ initial, submitting, submitLabel, cancelHref, onSubmit }) {
  const { error: toastError } = useToast();

  // Kalau nilai "kepada" tersimpan bukan salah satu opsi PIMPINAN_LIST
  // (mis. hasil input manual), pre-select "lainnya" dan isi input manual.
  const knownKepada = PIMPINAN_LIST.some((p) => p.value === initial.kepada && p.value !== 'lainnya');
  const [kepadaSelect, setKepadaSelect] = useState(
    initial.kepada ? (knownKepada ? initial.kepada : 'lainnya') : ''
  );
  const [kepadaManual, setKepadaManual] = useState(knownKepada ? '' : (initial.kepada || ''));
  const [form, setForm] = useState({
    tanggal: initial.tanggal || '',
    dibuat_oleh: initial.dibuat_oleh || '',
    perihal: initial.perihal || '',
    isi: initial.isi || '',
  });

  const set = (field, value) => setForm((f) => ({ ...f, [field]: value }));

  const handleSubmit = (e) => {
    e.preventDefault();
    const kepada = (kepadaSelect === 'lainnya' ? kepadaManual : kepadaSelect).trim();
    if (!kepada) return toastError('Nama pimpinan (Kepada) wajib dipilih atau diisi');
    if (!form.perihal.trim()) return toastError('Perihal wajib diisi');
    if (!form.dibuat_oleh.trim()) return toastError('Nama pembuat wajib diisi');
    if (!form.isi.trim()) return toastError('Isi memo wajib diisi');
    if (!form.tanggal) return toastError('Tanggal wajib diisi');

    onSubmit({
      tanggal: form.tanggal,
      kepada,
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

        <div className="field">
          <label className="field-label" htmlFor="kepada">Kepada (Nama Pimpinan) *</label>
          <select
            id="kepada"
            className="select"
            value={kepadaSelect}
            onChange={(e) => setKepadaSelect(e.target.value)}
            required
          >
            <option value="">-- Pilih Pimpinan --</option>
            {PIMPINAN_LIST.map((p) => <option key={p.value} value={p.value}>{p.label}</option>)}
          </select>
          {kepadaSelect === 'lainnya' && (
            <input
              className="input"
              style={{ marginTop: 8 }}
              value={kepadaManual}
              onChange={(e) => setKepadaManual(e.target.value)}
              placeholder="Tulis nama/jabatan pimpinan"
              required
            />
          )}
        </div>

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
