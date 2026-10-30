// Self-check getOpenStatus & agendaDiLayar: node lib/tvLayar.check.mjs
import assert from 'node:assert/strict'
import { getOpenStatus, agendaDiLayar } from './tvLayar.js'

const at = (h, m = 0) => new Date(2026, 9, 30, h, m)
const s = { jam_buka: '06:00:00', jam_tutup: '18:00:00' }

assert.equal(getOpenStatus(s, at(5, 59)).title, 'TUTUP')
assert.equal(getOpenStatus(s, at(5, 59)).sub, 'Buka pukul 06.00')
assert.equal(getOpenStatus(s, at(6)).open, true)
assert.equal(getOpenStatus(s, at(17, 59)).sub, 'Tutup pukul 18.00')
assert.equal(getOpenStatus(s, at(18)).sub, 'Buka kembali besok')
assert.equal(getOpenStatus({ ...s, tutup_sementara: true, catatan: 'Perawatan' }, at(10)).sub, 'Perawatan')
assert.equal(getOpenStatus({ jam_buka: null, jam_tutup: '18:00' }, at(10)), null)
assert.equal(getOpenStatus(null, at(10)), null)
const pub = { tampil_publik: true, target_layar: [] }
assert.equal(agendaDiLayar({ ...pub, tampil_publik: false }, 'usc', null), false)
assert.equal(agendaDiLayar(pub, 'usc', 'kolam'), true)
assert.equal(agendaDiLayar(pub, 'kolam', 'kolam'), true)
assert.equal(agendaDiLayar(pub, 'ssfc', 'kolam'), false)
assert.equal(agendaDiLayar({ ...pub, target_layar: ['ssfc'] }, 'usc', 'kolam'), false)
assert.equal(agendaDiLayar({ ...pub, target_layar: ['ssfc'] }, 'ssfc', 'kolam'), true)
assert.equal(agendaDiLayar({ tampil_publik: true }, 'usc', null), true)
console.log('ok')
