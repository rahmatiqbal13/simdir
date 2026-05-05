'use client';

import { useState, useMemo } from 'react';

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

export default function SuratPage() {
  const [activeTab, setActiveTab] = useState('masuk');
  const [searchQuery, setSearchQuery] = useState('');
  const [jenisFilter, setJenisFilter] = useState('all');
  const [showModal, setShowModal] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const userRole = 'super_admin';

  const canEdit = userRole === 'super_admin';
  const canView = ['super_admin', 'pimpinan'].includes(userRole);

  // Sample data - Surat Masuk dengan field tambahan: tertuju, tanggal_surat, tanggal_diterima
  const [suratMasuk, setSuratMasuk] = useState([
    { 
      id: '1', 
      nomor_surat: '001/USC/2026', 
      asal: 'Kemendikbud', 
      tertuju: 'Kepala USC',
      tanggal_surat: '2026-04-10',
      tanggal_diterima: '2026-04-15', 
      perihal: 'Undangan Rapat Koordinasi', 
      jenis: 'undangan', 
      lampiran: true 
    },
    { 
      id: '2', 
      nomor_surat: '002/USC/2026', 
      asal: 'Dinas PU', 
      tertuju: 'Bagian Administrasi',
      tanggal_surat: '2026-04-15',
      tanggal_diterima: '2026-04-18', 
      perihal: 'Permohonan Data Fasilitas', 
      jenis: 'permohonan', 
      lampiran: false 
    },
    { 
      id: '3', 
      nomor_surat: '003/USC/2026', 
      asal: 'Rektorat Unesa', 
      tertuju: 'Seluruh Karyawan',
      tanggal_surat: '2026-04-18',
      tanggal_diterima: '2026-04-20', 
      perihal: 'Pemberitahuan Libur Nasional', 
      jenis: 'pemberitahuan', 
      lampiran: true 
    },
  ]);

  // Sample data - Surat Keluar dengan field tambahan: unit_kerja_peminta, pemohon, penanda_tangan
  const [suratKeluar, setSuratKeluar] = useState([
    { 
      id: '1', 
      nomor_surat: '001/KET/2026', 
      tujuan: 'Kemendikbud', 
      tanggal: '2026-04-20', 
      unit_kerja_peminta: 'USC',
      pemohon: 'Budi Santoso',
      penanda_tangan: 'Dr. Purnomo',
      perihal: 'Balasan Undangan Rapat', 
      jenis: 'undangan', 
      lampiran: true 
    },
    { 
      id: '2', 
      nomor_surat: '002/KET/2026', 
      tujuan: 'Dinas Pendidikan', 
      tanggal: '2026-04-22', 
      unit_kerja_peminta: 'PUI Keolahragaan',
      pemohon: 'Siti Rahayu',
      penanda_tangan: 'Ahmad Hidayat',
      perihal: 'Permohonan Izin Kegiatan', 
      jenis: 'permohonan', 
      lampiran: true 
    },
  ]);

  const currentList = activeTab === 'masuk' ? suratMasuk : suratKeluar;
  const setCurrentList = activeTab === 'masuk' ? setSuratMasuk : setSuratKeluar;

  // Stats
  const stats = useMemo(() => {
    return {
      masuk: suratMasuk.length,
      keluar: suratKeluar.length,
      total: suratMasuk.length + suratKeluar.length,
      withLampiran: [...suratMasuk, ...suratKeluar].filter(s => s.lampiran).length,
    };
  }, [suratMasuk, suratKeluar]);

  // Filter
  const filteredList = useMemo(() => {
    return currentList.filter(item => {
      const matchesSearch = 
        item.nomor_surat.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.perihal.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (item.asal || item.tujuan).toLowerCase().includes(searchQuery.toLowerCase()) ||
        (item.tertuju || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
        (item.pemohon || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
        (item.penanda_tangan || '').toLowerCase().includes(searchQuery.toLowerCase());
      const matchesJenis = jenisFilter === 'all' || item.jenis === jenisFilter;
      return matchesSearch && matchesJenis;
    });
  }, [currentList, searchQuery, jenisFilter]);

  const formatDate = (date) => {
    if (!date) return '-';
    return new Date(date).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' });
  };

  const getJenisBadgeClass = (jenis) => {
    const classes = {
      undangan: 'badge-blue',
      permohonan: 'badge-amber',
      pemberitahuan: 'badge-green',
      lainnya: 'badge-slate',
    };
    return classes[jenis] || 'badge-slate';
  };

  const getJenisLabel = (jenis) => {
    const labels = {
      undangan: 'Undangan',
      permohonan: 'Permohonan',
      pemberitahuan: 'Pemberitahuan',
      lainnya: 'Lainnya',
    };
    return labels[jenis] || 'Lainnya';
  };

  const handleDelete = (id) => {
    if (confirm('Apakah Anda yakin ingin menghapus surat ini?')) {
      setCurrentList(currentList.filter(s => s.id !== id));
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const formData = new FormData(e.target);
    const baseItem = {
      id: editingItem?.id || Date.now().toString(),
      nomor_surat: formData.get('nomor_surat'),
      perihal: formData.get('perihal'),
      jenis: formData.get('jenis') || 'lainnya',
      lampiran: formData.get('lampiran') ? true : false,
    };

    let newItem;
    if (activeTab === 'masuk') {
      newItem = {
        ...baseItem,
        asal: formData.get('asal'),
        tertuju: formData.get('tertuju'),
        tanggal_surat: formData.get('tanggal_surat'),
        tanggal_diterima: formData.get('tanggal_diterima'),
      };
    } else {
      newItem = {
        ...baseItem,
        tujuan: formData.get('tujuan'),
        tanggal: formData.get('tanggal'),
        unit_kerja_peminta: formData.get('unit_kerja_peminta'),
        pemohon: formData.get('pemohon'),
        penanda_tangan: formData.get('penanda_tangan'),
      };
    }

    if (editingItem) {
      setCurrentList(currentList.map(s => s.id === editingItem.id ? newItem : s));
    } else {
      setCurrentList([...currentList, newItem]);
    }
    closeModal();
  };

  const handleAdd = () => {
    setEditingItem(null);
    setShowModal(true);
  };

  const handleEdit = (item) => {
    setEditingItem(item);
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    setEditingItem(null);
  };

  const clearFilters = () => {
    setSearchQuery('');
    setJenisFilter('all');
  };

  if (!canView) {
    return (
      <div className="empty-state">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
          <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
          <path d="M7 11V7a5 5 0 0 1 10 0v4" />
        </svg>
        <h3>Akses Ditolak</h3>
        <p>Anda tidak memiliki akses ke modul ini.</p>
      </div>
    );
  }

  const hasFilters = searchQuery || jenisFilter !== 'all';

  return (
    <div className="surat-page">
      {/* Stats */}
      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-icon">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
              <polyline points="22,6 12,13 2,6" />
            </svg>
          </div>
          <div className="stat-label">Total Surat</div>
          <div className="stat-value">{stats.total}</div>
        </div>
        <div className="stat-card info">
          <div className="stat-icon">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M12 19l7-7 3 3-7 7-3-3z" />
              <path d="M18 13l-1.5-7.5L2 2l3.5 14.5L13 18l5-5z" />
              <path d="M2 2l7.586 7.586" />
              <circle cx="11" cy="11" r="2" />
            </svg>
          </div>
          <div className="stat-label">Surat Masuk</div>
          <div className="stat-value">{stats.masuk}</div>
        </div>
        <div className="stat-card success">
          <div className="stat-icon">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="22" y1="2" x2="11" y2="13" />
              <polygon points="22 2 15 22 11 13 2 9 22 2" />
            </svg>
          </div>
          <div className="stat-label">Surat Keluar</div>
          <div className="stat-value">{stats.keluar}</div>
        </div>
        <div className="stat-card warning">
          <div className="stat-icon">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z" />
              <polyline points="14 2 14 8 20 8" />
            </svg>
          </div>
          <div className="stat-label">Dengan Lampiran</div>
          <div className="stat-value">{stats.withLampiran}</div>
        </div>
      </div>

      {/* Header & Tabs */}
      <div className="toolbar">
        <div>
          <h2>Surat Masuk & Keluar</h2>
          <p className="text-muted">Kelola dokumen surat masuk dan keluar USC</p>
        </div>
        {canEdit && (
          <button className="btn btn-primary" onClick={handleAdd}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
            </svg>
            Tambah Surat
          </button>
        )}
      </div>

      {/* Tabs */}
      <div className="surat-tabs">
        <button
          className={`tab-btn ${activeTab === 'masuk' ? 'active' : ''}`}
          onClick={() => setActiveTab('masuk')}
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M12 19l7-7 3 3-7 7-3-3z" />
            <path d="M18 13l-1.5-7.5L2 2l3.5 14.5L13 18l5-5z" />
          </svg>
          Surat Masuk
          <span className="tab-badge">{suratMasuk.length}</span>
        </button>
        <button
          className={`tab-btn ${activeTab === 'keluar' ? 'active' : ''}`}
          onClick={() => setActiveTab('keluar')}
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <line x1="22" y1="2" x2="11" y2="13" />
            <polygon points="22 2 15 22 11 13 2 9 22 2" />
          </svg>
          Surat Keluar
          <span className="tab-badge">{suratKeluar.length}</span>
        </button>
      </div>

      {/* Filters */}
      <div className="filter-bar">
        <div className="filter-group filter-search">
          <svg className="filter-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="11" cy="11" r="8" />
            <line x1="21" y1="21" x2="16.65" y2="16.65" />
          </svg>
          <input
            type="text"
            placeholder={`Cari ${activeTab === 'masuk' ? 'surat masuk' : 'surat keluar'}...`}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="filter-input"
          />
          {searchQuery && (
            <button className="filter-clear-btn" onClick={() => setSearchQuery('')}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </button>
          )}
        </div>

        <div className="filter-group">
          <svg className="filter-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
            <polyline points="14 2 14 8 20 8" />
            <line x1="16" y1="13" x2="8" y2="13" />
            <line x1="16" y1="17" x2="8" y2="17" />
            <polyline points="10 9 9 9 8 9" />
          </svg>
          <select
            value={jenisFilter}
            onChange={(e) => setJenisFilter(e.target.value)}
            className="filter-select"
          >
            <option value="all">Semua Jenis</option>
            {JENIS_SURAT.map(j => (
              <option key={j.value} value={j.value}>{j.label}</option>
            ))}
          </select>
        </div>

        {hasFilters && (
          <button className="filter-clear" onClick={clearFilters}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
            </svg>
            Reset Filter
          </button>
        )}
      </div>

      {/* Results Info */}
      <div className="results-info">
        <span>
          Menampilkan <strong>{filteredList.length}</strong> dari <strong>{currentList.length}</strong> surat {activeTab}
        </span>
      </div>

      {/* Table */}
      <div className="table-wrap surat-table-wrap">
        <table className="surat-table">
          <thead>
            <tr>
              <th style={{ width: '3rem' }}>No</th>
              <th style={{ width: '10rem' }}>No. Surat</th>
              {activeTab === 'masuk' ? (
                <>
                  <th style={{ width: '9rem' }}>Asal</th>
                  <th style={{ width: '9rem' }}>Tertuju</th>
                  <th style={{ width: '7rem' }}>Tgl Surat</th>
                  <th style={{ width: '7rem' }}>Tgl Diterima</th>
                </>
              ) : (
                <>
                  <th style={{ width: '9rem' }}>Tujuan</th>
                  <th style={{ width: '7rem' }}>Tanggal</th>
                  <th style={{ width: '9rem' }}>Unit Kerja</th>
                  <th style={{ width: '8rem' }}>Pemohon</th>
                </>
              )}
              <th>Perihal</th>
              <th style={{ width: '7rem' }}>Jenis</th>
              {activeTab === 'keluar' && <th style={{ width: '9rem' }}>Penandatangan</th>}
              <th style={{ width: '5rem' }}>Lampiran</th>
              {canEdit && <th style={{ width: '4.5rem' }}></th>}
            </tr>
          </thead>
          <tbody>
            {filteredList.length === 0 ? (
              <tr>
                <td colSpan={canEdit ? (activeTab === 'masuk' ? 10 : 11) : (activeTab === 'masuk' ? 9 : 10)} className="empty-row">
                  <div className="empty-table-state">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                      <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
                      <polyline points="22,6 12,13 2,6" />
                    </svg>
                    <h4>{hasFilters ? 'Tidak ada surat yang sesuai' : `Belum ada surat ${activeTab}`}</h4>
                    <p>
                      {hasFilters
                        ? 'Coba ubah filter atau kata kunci pencarian Anda'
                        : canEdit
                          ? `Klik "Tambah Surat" untuk membuat surat ${activeTab} baru`
                          : `Tidak ada surat ${activeTab} yang tersedia`}
                    </p>
                    {hasFilters && (
                      <button className="btn btn-ghost mt-4" onClick={clearFilters}>
                        Reset Filter
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ) : (
              filteredList.map((item, index) => (
                <tr key={item.id} className="surat-row">
                  <td className="text-center text-muted">{index + 1}</td>
                  <td>
                    <code className="nomor-surat">{item.nomor_surat}</code>
                  </td>
                  {activeTab === 'masuk' ? (
                    <>
                      <td><span className="asal-tujuan">{item.asal}</span></td>
                      <td><span className="tertuju-text">{item.tertuju || '-'}</span></td>
                      <td className="text-sm">{formatDate(item.tanggal_surat)}</td>
                      <td className="text-sm">{formatDate(item.tanggal_diterima)}</td>
                    </>
                  ) : (
                    <>
                      <td><span className="asal-tujuan">{item.tujuan}</span></td>
                      <td className="text-sm">{formatDate(item.tanggal)}</td>
                      <td><span className="unit-kerja-badge">{item.unit_kerja_peminta || '-'}</span></td>
                      <td><span className="pemohon-text">{item.pemohon || '-'}</span></td>
                    </>
                  )}
                  <td>
                    <span className="perihal-text">{item.perihal}</span>
                  </td>
                  <td>
                    <span className={`badge ${getJenisBadgeClass(item.jenis)}`}>
                      {getJenisLabel(item.jenis)}
                    </span>
                  </td>
                  {activeTab === 'keluar' && (
                    <td><span className="penandatangan-text">{item.penanda_tangan || '-'}</span></td>
                  )}
                  <td className="text-center">
                    {item.lampiran ? (
                      <span className="lampiran-badge" title="Memiliki lampiran">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <path d="M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48" />
                        </svg>
                      </span>
                    ) : (
                      <span className="text-muted">-</span>
                    )}
                  </td>
                  {canEdit && (
                    <td>
                      <div className="action-buttons">
                        <button className="btn-action edit" onClick={() => handleEdit(item)} title="Edit">
                          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                            <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                          </svg>
                        </button>
                        <button className="btn-action delete" onClick={() => handleDelete(item.id)} title="Hapus">
                          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <polyline points="3 6 5 6 21 6" />
                            <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                          </svg>
                        </button>
                      </div>
                    </td>
                  )}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Modal */}
      {showModal && (
        <div className="modal-backdrop" onClick={closeModal}>
          <div className="modal-content modal-lg" onClick={e => e.stopPropagation()}>
            <div className="modal-head">
              <div>
                <h2>{editingItem ? 'Edit' : 'Tambah'} Surat {activeTab === 'masuk' ? 'Masuk' : 'Keluar'}</h2>
                <p>Isi informasi surat dengan lengkap</p>
              </div>
              <button onClick={closeModal}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>
            </div>
            <form onSubmit={handleSubmit}>
              <div className="modal-body">
                {/* Common Fields */}
                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label">Nomor Surat</label>
                    <input name="nomor_surat" defaultValue={editingItem?.nomor_surat} placeholder="Contoh: 001/USC/2026" required />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Jenis Surat</label>
                    <select name="jenis" defaultValue={editingItem?.jenis || 'lainnya'}>
                      {JENIS_SURAT.map(j => (
                        <option key={j.value} value={j.value}>{j.label}</option>
                      ))}
                    </select>
                  </div>
                </div>

                {activeTab === 'masuk' ? (
                  /* Surat Masuk Specific Fields */
                  <>
                    <div className="form-row">
                      <div className="form-group">
                        <label className="form-label">Asal Surat</label>
                        <input name="asal" defaultValue={editingItem?.asal} placeholder="Masukkan instansi pengirim" required />
                      </div>
                      <div className="form-group">
                        <label className="form-label">Tertuju Kepada</label>
                        <input name="tertuju" defaultValue={editingItem?.tertuju} placeholder="Contoh: Kepala USC, Bagian Administrasi" required />
                      </div>
                    </div>
                    <div className="form-row">
                      <div className="form-group">
                        <label className="form-label">Tanggal Surat</label>
                        <input type="date" name="tanggal_surat" defaultValue={editingItem?.tanggal_surat} required />
                        <span className="field-hint">Tanggal surat dikeluarkan oleh pengirim</span>
                      </div>
                      <div className="form-group">
                        <label className="form-label">Tanggal Diterima</label>
                        <input type="date" name="tanggal_diterima" defaultValue={editingItem?.tanggal_diterima} required />
                        <span className="field-hint">Tanggal surat diterima di USC</span>
                      </div>
                    </div>
                  </>
                ) : (
                  /* Surat Keluar Specific Fields */
                  <>
                    <div className="form-row">
                      <div className="form-group">
                        <label className="form-label">Tujuan Surat</label>
                        <input name="tujuan" defaultValue={editingItem?.tujuan} placeholder="Masukkan instansi tujuan" required />
                      </div>
                      <div className="form-group">
                        <label className="form-label">Tanggal Surat</label>
                        <input type="date" name="tanggal" defaultValue={editingItem?.tanggal} required />
                      </div>
                    </div>
                    <div className="form-section">
                      <label className="form-label">Informasi Pemohon</label>
                      <div className="form-row">
                        <div className="form-group">
                          <label className="form-label-sm">Unit Kerja Peminta</label>
                          <select name="unit_kerja_peminta" defaultValue={editingItem?.unit_kerja_peminta || ''} required>
                            <option value="">Pilih Unit Kerja</option>
                            {UNIT_KERJA_LIST.map(u => (
                              <option key={u.value} value={u.value}>{u.label}</option>
                            ))}
                          </select>
                        </div>
                        <div className="form-group">
                          <label className="form-label-sm">Nama Pemohon</label>
                          <input name="pemohon" defaultValue={editingItem?.pemohon} placeholder="Nama pemohon" required />
                        </div>
                        <div className="form-group">
                          <label className="form-label-sm">Penanda Tangan</label>
                          <input name="penanda_tangan" defaultValue={editingItem?.penanda_tangan} placeholder="Nama penanda tangan" required />
                        </div>
                      </div>
                    </div>
                  </>
                )}

                <div className="form-group">
                  <label className="form-label">Perihal</label>
                  <textarea name="perihal" defaultValue={editingItem?.perihal} placeholder="Tuliskan perihal surat" required rows={3} />
                </div>

                <div className="form-group">
                  <label className="form-label">Lampiran (Opsional)</label>
                  <div className="file-input-wrapper">
                    <input type="file" name="lampiran" accept=".pdf,.jpg,.png,.doc,.docx" id="file-input" />
                    <label htmlFor="file-input" className="file-input-label">
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48" />
                      </svg>
                      <span>Pilih file atau drag & drop di sini</span>
                    </label>
                  </div>
                  <span className="file-hint">Format yang didukung: PDF, JPG, PNG, DOC, DOCX</span>
                </div>
              </div>
              <div className="modal-foot">
                <button type="button" className="btn btn-ghost" onClick={closeModal}>Batal</button>
                <button type="submit" className="btn btn-primary">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                  Simpan
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
