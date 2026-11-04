// Self-check getOpenStatus & agendaDiLayar: node lib/tvLayar.check.mjs
import assert from 'node:assert/strict'
import { getOpenStatus, agendaDiLayar, sanitizeJadwal, sanitizeKelas, kelasHariIni } from './tvLayar.js'

const at = (h, m = 0) => new Date(2026, 9, 30, h, m)
const s = { jam_buka: '06:00:00', jam_tutup: '18:00:00' }

assert.equal(getOpenStatus(s, at(5, 59)).title, 'TUTUP')
assert.equal(getOpenStatus(s, at(5, 59)).sub, 'Buka pukul 06.00')
assert.equal(getOpenStatus(s, at(6)).open, true)
assert.equal(getOpenStatus(s, at(17, 59)).sub, 'Tutup pukul 18.00')
assert.equal(getOpenStatus(s, at(18)).sub, 'Buka besok pukul 06.00')
// 30 Okt 2026 = Jumat; 31 Okt = Sabtu; 2 Nov = Senin
const hari = (buka, tutup) => ({ status: 'buka', buka, tutup })
const jadwal = [hari('07:00', '15:00'), hari('06:00', '21:00'), hari('06:00', '21:00'), hari('06:00', '21:00'), hari('06:00', '21:00'), hari('06:00', '21:00'), hari('07:00', '15:00')]
const w = { ...s, jadwal }
assert.equal(getOpenStatus(w, at(18)).open, true)
assert.equal(getOpenStatus(w, at(21)).sub, 'Buka besok pukul 07.00')
const sabtu = (h) => new Date(2026, 9, 31, h)
assert.equal(getOpenStatus(w, sabtu(6)).sub, 'Buka pukul 07.00')
assert.equal(getOpenStatus(w, sabtu(10)).range, '07.00 – 15.00')
// Minggu libur → setelah tutup Sabtu, buka berikutnya Senin
const libur = jadwal.map((h, i) => (i === 0 ? { status: 'libur' } : h))
assert.equal(getOpenStatus({ ...s, jadwal: libur }, sabtu(16)).sub, 'Buka Senin pukul 06.00')
assert.equal(getOpenStatus({ ...s, jadwal: libur }, new Date(2026, 10, 1, 10)).title, 'LIBUR')
const ts = jadwal.map((h, i) => (i === 6 ? { status: 'tutup_sementara' } : h))
assert.equal(getOpenStatus({ ...s, jadwal: ts, catatan: 'Perawatan alat' }, sabtu(10)).title, 'TUTUP SEMENTARA')
assert.equal(sanitizeJadwal(jadwal)[1].buka, '06:00')
assert.equal(sanitizeJadwal(jadwal.slice(1)), null)
assert.equal(sanitizeJadwal(jadwal.map((h, i) => (i === 3 ? { status: 'buka', buka: '', tutup: '' } : h))), null)
assert.equal(sanitizeJadwal(libur)[0].status, 'libur')

const pub = { tampil_publik: true, target_layar: [] }
assert.equal(agendaDiLayar({ ...pub, tampil_publik: false }, 'usc', null), false)
assert.equal(agendaDiLayar(pub, 'usc', 'kolam'), true)
assert.equal(agendaDiLayar(pub, 'kolam', 'kolam'), true)
assert.equal(agendaDiLayar(pub, 'ssfc', 'kolam'), false)
assert.equal(agendaDiLayar({ ...pub, target_layar: ['ssfc'] }, 'usc', 'kolam'), false)
assert.equal(agendaDiLayar({ ...pub, target_layar: ['ssfc'] }, 'ssfc', 'kolam'), true)
assert.equal(agendaDiLayar({ tampil_publik: true }, 'usc', null), true)
// Kelas rutin: Senin & Rabu; 2 Nov 2026 = Senin, 3 Nov = Selasa
const senam = { id: 'a', nama: 'Senam', hari: [1, 3], waktu_mulai: '07:00:00', waktu_selesai: '08:00:00', pelatih: 'Budi', aktif: true }
const senin = new Date(2026, 10, 2, 9)
assert.equal(kelasHariIni([senam], s, senin)[0].judul, 'Senam')
assert.equal(kelasHariIni([senam], s, senin)[0].id, 'kelas-a')
assert.equal(kelasHariIni([senam], s, new Date(2026, 10, 3, 9)).length, 0)
assert.equal(kelasHariIni([{ ...senam, aktif: false }], s, senin).length, 0)
assert.equal(kelasHariIni([senam], { ...s, tutup_sementara: true }, senin).length, 0)
assert.equal(kelasHariIni([senam], { ...s, jadwal: jadwal.map((h, i) => (i === 1 ? { status: 'libur' } : h)) }, senin).length, 0)
assert.equal(kelasHariIni([senam], null, senin).length, 1)
const kv = { layar: 'ssfc', nama: ' Yoga ', hari: [3, 1, 1, 9], waktu_mulai: '07:00', waktu_selesai: '08:00' }
assert.deepEqual(sanitizeKelas(kv).row.hari, [1, 3])
assert.equal(sanitizeKelas(kv).row.nama, 'Yoga')
assert.ok(sanitizeKelas({ ...kv, layar: 'usc' }).error)
assert.ok(sanitizeKelas({ ...kv, hari: [] }).error)
assert.ok(sanitizeKelas({ ...kv, waktu_selesai: '06:00' }).error)
assert.deepEqual(sanitizeKelas({ aktif: false }, true).row, { aktif: false })
console.log('ok')
