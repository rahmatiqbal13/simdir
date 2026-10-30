// Self-check getOpenStatus & agendaDiLayar: node lib/tvLayar.check.mjs
import assert from 'node:assert/strict'
import { getOpenStatus, agendaDiLayar, sanitizeJadwal } from './tvLayar.js'

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
console.log('ok')
