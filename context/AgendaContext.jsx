'use client';

import { useState, useEffect, createContext, useContext } from 'react';

const AgendaContext = createContext();

export function AgendaProvider({ children }) {
  const [agenda, setAgenda] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const stored = localStorage.getItem('simdir_agenda');
    if (stored) {
      setAgenda(JSON.parse(stored));
    } else {
      const defaultAgenda = [
        { id: '1', judul: 'Rapat Evaluasi Program Semester', tanggal_mulai: '2026-05-10', tanggal_selesai: '2026-05-10', lokasi: 'Ruang Rapat USC', penyelenggara: 'USC', jenis: 'internal', deskripsi: 'Evaluasi program kerja semester awal', pic: 'Budi Santoso' },
        { id: '2', judul: 'Pelatihan Manajemen Olahraga', tanggal_mulai: '2026-05-05', tanggal_selesai: '2026-05-07', lokasi: 'Gedung Olahraga', penyelenggara: 'PUI Keolahragaan', jenis: 'internal', deskripsi: 'Pelatihan untuk staf administrasi', pic: 'Siti Rahayu' },
        { id: '3', judul: 'Audit Internal Keuangan', tanggal_mulai: '2026-04-20', tanggal_selesai: '2026-04-25', lokasi: 'Kantor USC', penyelenggara: 'External - KAP Smith & Co', jenis: 'eksternal', deskripsi: 'Audit rutin keuangan', pic: null },
        { id: '4', judul: 'Workshop Digital Transformation', tanggal_mulai: '2026-06-01', tanggal_selesai: '2026-06-03', lokasi: 'Aula Utama', penyelenggara: 'PUI Seni Budaya', jenis: 'internal', deskripsi: 'Workshop transformasi digital', pic: 'Dr. Purnomo' },
      ];
      setAgenda(defaultAgenda);
      localStorage.setItem('simdir_agenda', JSON.stringify(defaultAgenda));
    }
    setLoading(false);
  }, []);

  const addAgenda = (item) => {
    const newAgenda = [...agenda, item];
    setAgenda(newAgenda);
    localStorage.setItem('simdir_agenda', JSON.stringify(newAgenda));
  };

  const updateAgenda = (id, item) => {
    const newAgenda = agenda.map(a => a.id === id ? item : a);
    setAgenda(newAgenda);
    localStorage.setItem('simdir_agenda', JSON.stringify(newAgenda));
  };

  const deleteAgenda = (id) => {
    const newAgenda = agenda.filter(a => a.id !== id);
    setAgenda(newAgenda);
    localStorage.setItem('simdir_agenda', JSON.stringify(newAgenda));
  };

  const resetAgenda = () => {
    const defaultAgenda = [
      { id: '1', judul: 'Rapat Evaluasi Program Semester', tanggal_mulai: '2026-05-10', tanggal_selesai: '2026-05-10', lokasi: 'Ruang Rapat USC', penyelenggara: 'USC', jenis: 'internal', deskripsi: 'Evaluasi program kerja semester awal', pic: 'Budi Santoso' },
      { id: '2', judul: 'Pelatihan Manajemen Olahraga', tanggal_mulai: '2026-05-05', tanggal_selesai: '2026-05-07', lokasi: 'Gedung Olahraga', penyelenggara: 'PUI Keolahragaan', jenis: 'internal', deskripsi: 'Pelatihan untuk staf administrasi', pic: 'Siti Rahayu' },
      { id: '3', judul: 'Audit Internal Keuangan', tanggal_mulai: '2026-04-20', tanggal_selesai: '2026-04-25', lokasi: 'Kantor USC', penyelenggara: 'External - KAP Smith & Co', jenis: 'eksternal', deskripsi: 'Audit rutin keuangan', pic: null },
      { id: '4', judul: 'Workshop Digital Transformation', tanggal_mulai: '2026-06-01', tanggal_selesai: '2026-06-03', lokasi: 'Aula Utama', penyelenggara: 'PUI Seni Budaya', jenis: 'internal', deskripsi: 'Workshop transformasi digital', pic: 'Dr. Purnomo' },
    ];
    setAgenda(defaultAgenda);
    localStorage.setItem('simdir_agenda', JSON.stringify(defaultAgenda));
  };

  return (
    <AgendaContext.Provider value={{ agenda, loading, addAgenda, updateAgenda, deleteAgenda, resetAgenda }}>
      {children}
    </AgendaContext.Provider>
  );
}

export function useAgenda() {
  const context = useContext(AgendaContext);
  if (!context) {
    throw new Error('useAgenda must be used within AgendaProvider');
  }
  return context;
}