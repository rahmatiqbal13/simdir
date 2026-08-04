// Migrasi data satu-kali dari backup pg_dumpall SIREKAP (Sistem Pencatatan
// Pemasukan Unit Usaha) ke tabel unit_usaha / target_unit_usaha /
// pemasukan_unit_usaha di database SIMDIR.
//
// Dipakai sebagai pengganti scripts/migrate-sirekap-data.js karena project
// Supabase SIREKAP sudah tidak aktif (DNS project-nya tidak resolve lagi) —
// jadi sumber datanya bukan koneksi langsung, melainkan file backup .gz yang
// diunduh manual dari Supabase sebelum project itu mati.
//
// PRASYARAT: migrasi 20260804000000_create_pemasukan_unit_usaha.sql sudah
// dijalankan di Supabase SQL Editor SIMDIR.
//
// Cara pakai (dari root folder SIMDIR):
//   node scripts/migrate-sirekap-backup.js <path-ke-file.backup.gz>
//   node scripts/migrate-sirekap-backup.js <path> --dry-run   (preview saja)
//
// Aman dijalankan ulang: unit_usaha di-upsert berdasar nama (unique), dan
// target/pemasukan di-upsert berdasar (unit, tahun[, bulan]).

const fs = require('fs')
const path = require('path')
const zlib = require('zlib')
const { createClient } = require('@supabase/supabase-js')

const args = process.argv.slice(2).filter((a) => a !== '--dry-run')
const DRY_RUN = process.argv.includes('--dry-run')
const backupPath = args[0]

if (!backupPath) {
  console.error('Penggunaan: node scripts/migrate-sirekap-backup.js <path-ke-file.backup.gz> [--dry-run]')
  process.exit(1)
}

// Nama unit yang sudah berganti sejak dump ini dibuat (lihat perbaikan
// halaman penilaian/kritik-saran sebelumnya di sesi yang sama) — dipetakan
// ke nama barunya supaya data historis langsung konsisten dengan nama unit
// usaha yang dipakai sekarang.
const NAME_OVERRIDES = {
  'SSFC Gym': 'Achilles Gym Hub',
}

function loadEnvFile(filePath) {
  const content = fs.readFileSync(filePath, 'utf8')
  const env = {}
  for (const line of content.split('\n')) {
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith('#')) continue
    const idx = trimmed.indexOf('=')
    if (idx === -1) continue
    env[trimmed.slice(0, idx).trim()] = trimmed.slice(idx + 1).trim()
  }
  return env
}

// Parse satu blok `COPY schema.table (col1, col2, ...) FROM stdin;` sampai
// baris `\.` — format tab-separated ala pg_dump, `\N` berarti NULL.
function parseCopyBlock(sqlText, tableName) {
  const startRe = new RegExp(`^COPY ${tableName.replace('.', '\\.')} \\(([^)]+)\\) FROM stdin;$`, 'm')
  const startMatch = startRe.exec(sqlText)
  if (!startMatch) throw new Error(`Blok COPY untuk ${tableName} tidak ditemukan di dalam backup`)

  const columns = startMatch[1].split(',').map((c) => c.trim())
  const dataStart = startMatch.index + startMatch[0].length + 1
  const terminatorIdx = sqlText.indexOf('\n\\.', dataStart)
  if (terminatorIdx === -1) throw new Error(`Terminator '\\.' untuk ${tableName} tidak ditemukan`)

  const rawRows = sqlText.slice(dataStart, terminatorIdx).split('\n').filter((l) => l.length > 0)
  return rawRows.map((line) => {
    const values = line.split('\t')
    const row = {}
    columns.forEach((col, i) => {
      const v = values[i]
      row[col] = v === '\\N' ? null : v
    })
    return row
  })
}

async function main() {
  const simdirEnv = loadEnvFile(path.join(__dirname, '..', '.env.local'))
  const dest = createClient(simdirEnv.NEXT_PUBLIC_SUPABASE_URL, simdirEnv.SUPABASE_SERVICE_ROLE_KEY)

  console.log(`Mode  : ${DRY_RUN ? 'DRY RUN (tidak menulis apa pun)' : 'LIVE — akan menulis ke database SIMDIR'}`)
  console.log(`Backup: ${backupPath}`)
  console.log(`Tujuan: ${simdirEnv.NEXT_PUBLIC_SUPABASE_URL}\n`)

  const raw = fs.readFileSync(backupPath)
  const sqlText = backupPath.endsWith('.gz') ? zlib.gunzipSync(raw).toString('utf8') : raw.toString('utf8')

  const units = parseCopyBlock(sqlText, 'public.units')
  const targets = parseCopyBlock(sqlText, 'public.targets')
  const pemasukan = parseCopyBlock(sqlText, 'public.pemasukan')

  console.log(`Ditemukan di backup: ${units.length} unit, ${targets.length} target, ${pemasukan.length} baris pemasukan.\n`)

  const idMap = {} // units.id (string, dari dump) -> unit_usaha.id (uuid SIMDIR)
  for (const u of units) {
    const nama = NAME_OVERRIDES[u.name] || u.name
    if (DRY_RUN) {
      console.log(`[dry-run] unit_usaha: "${nama}"${nama !== u.name ? ` (dari "${u.name}")` : ''} (aktif=${u.active === 't'})`)
      continue
    }
    const { data: existing } = await dest.from('unit_usaha').select('id').eq('nama', nama).maybeSingle()
    if (existing) {
      idMap[u.id] = existing.id
      console.log(`= unit_usaha sudah ada: "${nama}" -> ${existing.id}`)
      continue
    }
    const { data: inserted, error } = await dest
      .from('unit_usaha')
      .insert({ nama, aktif: u.active === 't', created_at: u.created_at })
      .select('id')
      .single()
    if (error) throw new Error(`Gagal insert unit_usaha "${nama}": ${error.message}`)
    idMap[u.id] = inserted.id
    console.log(`+ unit_usaha baru: "${nama}"${nama !== u.name ? ` (dari "${u.name}")` : ''} -> ${inserted.id}`)
  }

  if (DRY_RUN) {
    console.log(`\n[dry-run] akan memigrasikan ${targets.length} target dan ${pemasukan.length} baris pemasukan. Selesai (tidak ada yang ditulis).`)
    return
  }

  let targetCount = 0
  for (const t of targets) {
    const unitUsahaId = idMap[t.unit_id]
    if (!unitUsahaId) { console.warn(`  ! lewati target unit_id=${t.unit_id} (unit tidak ditemukan)`); continue }
    const { error } = await dest.from('target_unit_usaha').upsert(
      { unit_usaha_id: unitUsahaId, tahun: Number(t.year), target_tahunan: Number(t.annual_target), created_at: t.created_at, updated_at: t.updated_at },
      { onConflict: 'unit_usaha_id,tahun' }
    )
    if (error) { console.warn(`  ! gagal migrasi target unit=${t.unit_id} tahun=${t.year}: ${error.message}`); continue }
    targetCount++
  }
  console.log(`Target termigrasi: ${targetCount}/${targets.length}`)

  let pemasukanCount = 0
  for (const p of pemasukan) {
    const unitUsahaId = idMap[p.unit_id]
    if (!unitUsahaId) { console.warn(`  ! lewati pemasukan unit_id=${p.unit_id} (unit tidak ditemukan)`); continue }
    const { error } = await dest.from('pemasukan_unit_usaha').upsert(
      {
        unit_usaha_id: unitUsahaId,
        tahun: Number(p.year),
        bulan: Number(p.month),
        jumlah: Number(p.amount),
        keterangan: p.notes ?? null,
        created_at: p.created_at,
        updated_at: p.updated_at,
      },
      { onConflict: 'unit_usaha_id,tahun,bulan' }
    )
    if (error) { console.warn(`  ! gagal migrasi pemasukan unit=${p.unit_id} ${p.year}-${p.month}: ${error.message}`); continue }
    pemasukanCount++
  }
  console.log(`Pemasukan termigrasi: ${pemasukanCount}/${pemasukan.length}`)
  console.log('\nSelesai.')
}

main().catch((err) => {
  console.error('\nMigrasi gagal:', err.message)
  process.exit(1)
})
