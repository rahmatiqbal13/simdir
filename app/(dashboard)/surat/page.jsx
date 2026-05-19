'use client';

import { useState, useMemo } from 'react';
import { useSurat } from '@/context/SuratContext';

const JENIS_SURAT = [
  { value: 'undangan', label: 'Undangan' },
  { value: 'permohonan', label: 'Permohonan' },
  { value: 'pemberitahuan', label: 'Pemberitahuan' },
  { value: 'lainnya', label: 'Lainnya' },
];

const UNIT_KERJA_LIST = [
  { value: 'USC', label: 'USC' },
  { value: 'PUI Keolahragaan', label: 'PUI Keolahragaan' },
  { value: 'PUI Disabilitas', label: 'PUI Disabilitas' },
  { value: 'PUI Seni Budaya', label: 'PUI Seni Budaya' },
  { value: 'Kolam Renang', label: 'Kolam Renang' },
  { value: 'Driving Golf', label: 'Driving Golf' },
  { value: 'ULABK', label: 'ULABK' },
  { value: 'SSFC', label: 'SSFC' },
];

const fmtDate = (d) => d ? new Date(d).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' }) : '-';

export default function SuratPage() {
  const [activeTab, setActiveTab] = useState('masuk');
  const [searchQuery, setSearchQuery] = useState('');
  const [jenisFilter, setJenisFilter] = useState('all');
  const [showModal, setShowModal] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { suratMasuk, suratKeluar, loading, addSuratMasuk, addSuratKeluar, updateSurat, deleteSurat, getStats } = useSurat();

  const canEdit = true;
  const currentList = activeTab === 'masuk' ? suratMasuk : suratKeluar;
  const stats = getStats();

  const filteredList = useMemo(() => {
    return currentList.filter(item => {
      const q = searchQuery.toLowerCase();
      const matchSearch = !q ||
        item.nomor_surat?.toLowerCase().includes(q) ||
        item.perihal?.toLowerCase().includes(q) ||
        (item.asal || item.tujuan || '')?.toLowerCase().includes(q);
      const matchJenis = jenisFilter === 'all' || item.jenis === jenisFilter;
      return matchSearch && matchJenis;
    });
  }, [currentList, searchQuery, jenisFilter]);

  const handleDelete = async (id) => {
    if (confirm('Hapus surat ini?')) {
      const result = await deleteSurat(id, activeTab);
      if (!result.success) alert('Error: ' + result.error);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    const fd = new FormData(e.target);
    const base = {
      nomor_surat: fd.get('nomor_surat'),
      perihal: fd.get('perihal'),
      jenis: fd.get('jenis') || 'lainnya',
      lampiran: !!fd.get('lampiran'),
    };
    let data;
    if (activeTab === 'masuk') {
      data = { ...base, asal: fd.get('asal'), tertuju: fd.get('tertuju'), tanggal_surat: fd.get('tanggal_surat'), tanggal_diterima: fd.get('tanggal_diterima') };
    } else {
      data = { ...base, tujuan: fd.get('tujuan'), tanggal: fd.get('tanggal'), unit_kerja_peminta: fd.get('unit_kerja_peminta'), pemohon: fd.get('pemohon'), penanda_tangan: fd.get('penanda_tangan') };
    }
    const result = editingItem
      ? await updateSurat(editingItem.id, data, activeTab)
      : activeTab === 'masuk' ? await addSuratMasuk(data) : await addSuratKeluar(data);
    setIsSubmitting(false);
    if (result.success) { setShowModal(false); setEditingItem(null); }
    else alert('Error: ' + result.error);
  };

  if (loading) return (
    <div className="empty-state">
      <div className="spinner" style={{ width: 36, height: 36, margin: '0 auto 16px' }} />
      <h3>Memuat data surat...</h3>
    </div>
  );

  return (
    <div>
      {/* Page header */}
      <div className="page-header">
        <div className="page-title-wrap">
          <h1 className="page-title">Manajemen Surat</h1>
          <p className="page-subtitle">Catat surat masuk dan keluar, kelola disposisi dan lampiran.</p>
        </div>
        <div className="page-actions">
          <button className="btn btn-secondary hide-mobile">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ width: 16, height: 16 }}><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
            Export
          </button>
          <button className="btn btn-primary" onClick={() => { setEditingItem(null); setShowModal(true); }}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ width: 16, height: 16 }}><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
            Catat Surat
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="stats-grid">
        {[
          { label: 'Surat Masuk', value: stats.masuk, sub: 'Bulan ini', color: 'primary', icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="22 12 16 12 14 15 10 15 8 12 2 12"/><path d="M5.45 5.11L2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6l-3.45-6.89A2 2 0 0 0 16.76 4H7.24a2 2 0 0 0-1.79 1.11z"/></svg> },
          { label: 'Surat Keluar', value: stats.keluar, sub: 'Bulan ini', color: 'success', icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg> },
          { label: 'Total Surat', value: stats.total, sub: 'Semua waktu', color: 'accent', icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></svg> },
          { label: 'Dengan Lampiran', value: stats.withLampiran ?? 0, sub: 'Memiliki dokumen', color: 'warning', icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48"/></svg> },
        ].map(({ label, value, sub, color, icon }) => {
          const c = { primary: { bg: 'var(--primary-50)', fg: 'var(--primary)' }, success: { bg: 'var(--success-50)', fg: 'var(--success)' }, warning: { bg: 'var(--warning-50)', fg: 'var(--warning)' }, accent: { bg: 'var(--accent-soft)', fg: '#8a6500' } }[color];
          return (
            <div key={label} className="stat-card">
              <div className="stat-card-top">
                <div className="stat-icon-wrap" style={{ background: c.bg, color: c.fg }}>
                  {icon}
                </div>
              </div>
              <div className="stat-label">{label}</div>
              <div className="stat-value">{value}</div>
              <div className="stat-sub">{sub}</div>
            </div>
          );
        })}
      </div>

      {/* Toolbar */}
      <div className="toolbar">
        <div className="input-group" style={{ minWidth: 240, flex: 1 }}>
          <svg className="input-group-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
          <input className="input" placeholder="Cari nomor, perihal, asal..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)} style={{ height: 40 }} />
        </div>
        <div className="seg">
          <button className={activeTab === 'masuk' ? 'active' : ''} onClick={() => setActiveTab('masuk')}>Masuk ({suratMasuk.length})</button>
          <button className={activeTab === 'keluar' ? 'active' : ''} onClick={() => setActiveTab('keluar')}>Keluar ({suratKeluar.length})</button>
        </div>
        <select className="select" style={{ width: 'auto', height: 40 }} value={jenisFilter} onChange={e => setJenisFilter(e.target.value)}>
          <option value="all">Semua Jenis</option>
          {JENIS_SURAT.map(j => <option key={j.value} value={j.value}>{j.label}</option>)}
        </select>
      </div>

      {/* Desktop table */}
      <div className="table-wrap hide-mobile">
        <div className="table-scroll">
          <table>
            <thead>
              <tr>
                <th style={{ width: 50 }}>No</th>
                <th style={{ width: 160 }}>No. Surat</th>
                {activeTab === 'masuk' ? (
                  <>
                    <th>Asal</th>
                    <th style={{ width: 150 }}>Tertuju</th>
                    <th style={{ width: 120 }}>Tgl Surat</th>
                    <th style={{ width: 120 }}>Tgl Diterima</th>
                  </>
                ) : (
                  <>
                    <th>Tujuan</th>
                    <th style={{ width: 100 }}>Tanggal</th>
                    <th style={{ width: 130 }}>Unit Kerja</th>
                    <th style={{ width: 130 }}>Pemohon</th>
                  </>
                )}
                <th>Perihal</th>
                <th style={{ width: 110 }}>Jenis</th>
                <th style={{ width: 80 }}>Lampiran</th>
                <th style={{ width: 100 }} className="text-right">Aksi</th>
              </tr>
            </thead>
            <tbody>
              {filteredList.length === 0 ? (
                <tr>
                  <td colSpan={10} style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-3)' }}>
                    Belum ada surat {activeTab} yang sesuai
                  </td>
                </tr>
              ) : filteredList.map((item, idx) => {
                const jenisLabel = JENIS_SURAT.find(j => j.value === item.jenis)?.label || item.jenis || 'Lainnya';
                return (
                  <tr key={item.id}>
                    <td className="muted num">{String(idx + 1).padStart(2, '0')}</td>
                    <td className="num" style={{ fontWeight: 600, fontSize: '0.8125rem' }}>{item.nomor_surat}</td>
                    {activeTab === 'masuk' ? (
                      <>
                        <td style={{ fontSize: '0.875rem' }}>{item.asal}</td>
                        <td style={{ fontSize: '0.875rem' }}>{item.tertuju || '-'}</td>
                        <td className="num muted" style={{ fontSize: '0.8125rem' }}>{fmtDate(item.tanggal_surat)}</td>
                        <td className="num muted" style={{ fontSize: '0.8125rem' }}>{fmtDate(item.tanggal_diterima)}</td>
                      </>
                    ) : (
                      <>
                        <td style={{ fontSize: '0.875rem' }}>{item.tujuan}</td>
                        <td className="num muted" style={{ fontSize: '0.8125rem' }}>{fmtDate(item.tanggal)}</td>
                        <td style={{ fontSize: '0.875rem' }}>{item.unit_kerja_peminta || '-'}</td>
                        <td style={{ fontSize: '0.875rem' }}>{item.pemohon || '-'}</td>
                      </>
                    )}
                    <td style={{ fontSize: '0.875rem', maxWidth: 220 }} className="truncate">{item.perihal}</td>
                    <td>
                      <span className={`badge badge-${item.jenis === 'undangan' ? 'primary' : item.jenis === 'permohonan' ? 'accent' : item.jenis === 'pemberitahuan' ? 'success' : 'neutral'}`}>
                        {jenisLabel}
                      </span>
                    </td>
                    <td className="text-center">
                      {item.lampiran ? (
                        <span className="badge badge-success">Ada</span>
                      ) : <span className="muted">-</span>}
                    </td>
                    <td className="text-right">
                      <div style={{ display: 'inline-flex', gap: 4 }}>
                        <button className="btn btn-ghost btn-sm btn-icon" onClick={() => { setEditingItem(item); setShowModal(true); }} title="Edit">
                          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ width: 14, height: 14 }}><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                        </button>
                        <button className="btn btn-ghost btn-sm btn-icon" onClick={() => handleDelete(item.id)} title="Hapus" style={{ color: 'var(--danger)' }}>
                          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ width: 14, height: 14 }}><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Mobile list */}
      <div className="hide-desktop">
        {filteredList.length === 0 ? (
          <div className="empty-state">
            <div className="empty-state-title">Belum ada surat {activeTab}</div>
          </div>
        ) : filteredList.map((item, idx) => {
          const jenisLabel = JENIS_SURAT.find(j => j.value === item.jenis)?.label || 'Lainnya';
          return (
            <div className="list-card" key={item.id}>
              <div className="list-card-head">
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div className="num" style={{ fontSize: '0.6875rem', color: 'var(--text-3)', fontWeight: 600 }}>{item.nomor_surat}</div>
                  <div style={{ fontWeight: 600, fontSize: '0.9375rem', margin: '2px 0' }} className="truncate">{item.perihal}</div>
                  <div className="muted" style={{ fontSize: '0.75rem' }}>{activeTab === 'masuk' ? item.asal : item.tujuan}</div>
                </div>
                <span className={'badge badge-' + (item.jenis === 'undangan' ? 'primary' : item.jenis === 'pemberitahuan' ? 'success' : 'accent')}>{jenisLabel}</span>
              </div>
              <div className="list-card-row">
                <span className="label">Tanggal</span>
                <span className="num">{fmtDate(activeTab === 'masuk' ? item.tanggal_surat : item.tanggal)}</span>
              </div>
              {activeTab === 'keluar' && <div className="list-card-row"><span className="label">Pemohon</span><span>{item.pemohon || '-'}</span></div>}
              <div style={{ display: 'flex', gap: 6, marginTop: 6 }}>
                <button className="btn btn-secondary btn-sm" style={{ flex: 1 }} onClick={() => { setEditingItem(item); setShowModal(true); }}>
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ width: 14, height: 14 }}><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                  Edit
                </button>
                <button className="btn btn-secondary btn-sm btn-icon" onClick={() => handleDelete(item.id)} style={{ color: 'var(--danger)' }}>
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ width: 14, height: 14 }}><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Modal */}
      {showModal && (
        <div className="modal-overlay" onClick={() => { setShowModal(false); setEditingItem(null); }}>
          <div className="modal modal-lg" onClick={e => e.stopPropagation()}>
            <div className="modal-head">
              <h3>{editingItem ? 'Edit' : 'Catat'} Surat {activeTab === 'masuk' ? 'Masuk' : 'Keluar'}</h3>
              <button className="btn btn-ghost btn-sm btn-icon" onClick={() => { setShowModal(false); setEditingItem(null); }}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ width: 16, height: 16 }}><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
              </button>
            </div>
            <form onSubmit={handleSubmit}>
              <div className="modal-body">
                <div className="form-grid">
                  <div className="field">
                    <label className="field-label">Nomor Surat</label>
                    <input className="input" name="nomor_surat" defaultValue={editingItem?.nomor_surat} placeholder="001/USC/V/2026" required />
                  </div>
                  <div className="field">
                    <label className="field-label">Jenis Surat</label>
                    <select className="select" name="jenis" defaultValue={editingItem?.jenis || 'lainnya'}>
                      {JENIS_SURAT.map(j => <option key={j.value} value={j.value}>{j.label}</option>)}
                    </select>
                  </div>
                  {activeTab === 'masuk' ? (
                    <>
                      <div className="field">
                        <label className="field-label">Asal Surat</label>
                        <input className="input" name="asal" defaultValue={editingItem?.asal} placeholder="Instansi pengirim" required />
                      </div>
                      <div className="field">
                        <label className="field-label">Tertuju Kepada</label>
                        <input className="input" name="tertuju" defaultValue={editingItem?.tertuju} placeholder="Penerima surat" required />
                      </div>
                      <div className="field">
                        <label className="field-label">Tanggal Surat</label>
                        <input className="input" type="date" name="tanggal_surat" defaultValue={editingItem?.tanggal_surat} required />
                      </div>
                      <div className="field">
                        <label className="field-label">Tanggal Diterima</label>
                        <input className="input" type="date" name="tanggal_diterima" defaultValue={editingItem?.tanggal_diterima} required />
                      </div>
                    </>
                  ) : (
                    <>
                      <div className="field">
                        <label className="field-label">Tujuan Surat</label>
                        <input className="input" name="tujuan" defaultValue={editingItem?.tujuan} placeholder="Instansi tujuan" required />
                      </div>
                      <div className="field">
                        <label className="field-label">Tanggal Surat</label>
                        <input className="input" type="date" name="tanggal" defaultValue={editingItem?.tanggal} required />
                      </div>
                      <div className="field">
                        <label className="field-label">Unit Kerja Peminta</label>
                        <select className="select" name="unit_kerja_peminta" defaultValue={editingItem?.unit_kerja_peminta || ''} required>
                          <option value="">Pilih Unit Kerja</option>
                          {UNIT_KERJA_LIST.map(u => <option key={u.value} value={u.value}>{u.label}</option>)}
                        </select>
                      </div>
                      <div className="field">
                        <label className="field-label">Nama Pemohon</label>
                        <input className="input" name="pemohon" defaultValue={editingItem?.pemohon} placeholder="Nama pemohon" required />
                      </div>
                      <div className="field full">
                        <label className="field-label">Penanda Tangan</label>
                        <input className="input" name="penanda_tangan" defaultValue={editingItem?.penanda_tangan} placeholder="Nama penanda tangan" required />
                      </div>
                    </>
                  )}
                  <div className="field full">
                    <label className="field-label">Perihal</label>
                    <textarea className="textarea" name="perihal" defaultValue={editingItem?.perihal} placeholder="Ringkasan isi surat" required rows={3} />
                  </div>
                  <div className="field full">
                    <label className="field-label">Lampiran</label>
                    <div style={{ border: '2px dashed var(--border)', borderRadius: 10, padding: 20, textAlign: 'center', color: 'var(--text-3)' }}>
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ width: 24, height: 24, marginBottom: 8 }}><path d="M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48"/></svg>
                      <div style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--text)' }}>Tarik file ke sini atau klik untuk upload</div>
                      <input type="file" name="lampiran" accept=".pdf,.jpg,.png,.doc,.docx" style={{ display: 'none' }} />
                    </div>
                  </div>
                </div>
              </div>
              <div className="modal-foot">
                <button type="button" className="btn btn-secondary" onClick={() => { setShowModal(false); setEditingItem(null); }} disabled={isSubmitting}>Batal</button>
                <button type="submit" className="btn btn-primary" disabled={isSubmitting}>
                  {isSubmitting ? 'Menyimpan...' : (
                    <>
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ width: 16, height: 16 }}><polyline points="20 6 9 17 4 12"/></svg>
                      Simpan
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
