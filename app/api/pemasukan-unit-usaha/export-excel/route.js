import { createClient } from '@supabase/supabase-js'
import { calculateRolling } from '@/lib/pemasukanRolling'
import * as XLSX from 'xlsx'

const MONTH_NAMES_FULL = [
  '', 'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
  'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember',
]

function getServiceClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  )
}

// GET /api/pemasukan-unit-usaha/export-excel?tahun=2026&unit_usaha_id=xxx
export async function GET(request) {
  const { searchParams } = new URL(request.url)
  const tahun = parseInt(searchParams.get('tahun') || String(new Date().getFullYear()))
  const unitUsahaId = searchParams.get('unit_usaha_id') || null

  const supabase = getServiceClient()
  const [unitsRes, { data: targets }, pemasukanRes] = await Promise.all([
    supabase.from('unit_usaha').select('*').eq('aktif', true).order('nama'),
    supabase.from('target_unit_usaha').select('*').eq('tahun', tahun),
    supabase.from('pemasukan_unit_usaha').select('*').eq('tahun', tahun),
  ])

  const allUnits = unitsRes.data ?? []
  const units = unitUsahaId ? allUnits.filter((u) => u.id === unitUsahaId) : allUnits
  const pemasukan = unitUsahaId
    ? (pemasukanRes.data ?? []).filter((p) => p.unit_usaha_id === unitUsahaId)
    : (pemasukanRes.data ?? [])

  let appName = 'SIMDIR'
  try {
    const settingsRes = await fetch(new URL('/api/app-settings', request.url))
    if (settingsRes.ok) {
      const s = await settingsRes.json()
      if (s?.brand_name) appName = s.brand_name
    }
  } catch {}

  const wb = XLSX.utils.book_new()
  const unitLabel = unitUsahaId ? (allUnits.find((u) => u.id === unitUsahaId)?.nama ?? '') : 'Semua Unit'

  // Sheet 1: Ringkasan
  const summaryRows = [
    [`${appName} – Laporan Pemasukan Unit Usaha ${tahun} – ${unitLabel}`],
    [],
    ['No', 'Unit Usaha', 'Target Tahunan', 'Realisasi', 'Capaian %', 'Sisa/Surplus'],
  ]

  let grandTarget = 0, grandIncome = 0
  units.forEach((unit, i) => {
    const target = targets?.find((t) => t.unit_usaha_id === unit.id)
    const annual = target?.target_tahunan ?? 0
    const income = pemasukan.filter((p) => p.unit_usaha_id === unit.id).reduce((s, p) => s + p.jumlah, 0)
    const pct = annual > 0 ? ((income / annual) * 100).toFixed(1) + '%' : '-'
    summaryRows.push([i + 1, unit.nama, annual, income, pct, income - annual])
    grandTarget += annual
    grandIncome += income
  })
  summaryRows.push([])
  summaryRows.push(['', 'GRAND TOTAL', grandTarget, grandIncome,
    grandTarget > 0 ? ((grandIncome / grandTarget) * 100).toFixed(1) + '%' : '-',
    grandIncome - grandTarget])

  const ws1 = XLSX.utils.aoa_to_sheet(summaryRows)
  XLSX.utils.book_append_sheet(wb, ws1, 'Ringkasan')

  // Sheet 2: Detail Bulanan (matrix unit x bulan)
  const detailHeader = ['Unit Usaha', ...MONTH_NAMES_FULL.slice(1), 'Total']
  const detailRows = [detailHeader]
  units.forEach((unit) => {
    const row = [unit.nama]
    let total = 0
    for (let m = 1; m <= 12; m++) {
      const p = pemasukan.find((p) => p.unit_usaha_id === unit.id && p.bulan === m)
      const amt = p?.jumlah ?? 0
      row.push(amt)
      total += amt
    }
    row.push(total)
    detailRows.push(row)
  })
  const ws2 = XLSX.utils.aoa_to_sheet(detailRows)
  XLSX.utils.book_append_sheet(wb, ws2, 'Detail Bulanan')

  // Sheet 3: Target & Rolling
  const rollingHeader = ['Unit Usaha', 'Bulan', 'Target Dasar', 'Rolling', 'Target Efektif', 'Realisasi', 'Selisih', 'Status']
  const rollingRows = [rollingHeader]
  units.forEach((unit) => {
    const target = targets?.find((t) => t.unit_usaha_id === unit.id)
    const annual = target?.target_tahunan ?? 0
    const incomeByMonth = {}
    for (let m = 1; m <= 12; m++) {
      const p = pemasukan.find((p) => p.unit_usaha_id === unit.id && p.bulan === m)
      incomeByMonth[m] = p ? p.jumlah : null
    }
    const months = calculateRolling(annual, incomeByMonth)
    months.forEach((md) => {
      rollingRows.push([
        unit.nama, MONTH_NAMES_FULL[md.month], md.baseTarget, md.rollingCarryover,
        md.effectiveTarget, md.income ?? '-', md.surplus, md.status,
      ])
    })
  })
  const ws3 = XLSX.utils.aoa_to_sheet(rollingRows)
  XLSX.utils.book_append_sheet(wb, ws3, 'Target & Rolling')

  // Sheet 4: Data Pemasukan (raw)
  const rawHeader = ['ID', 'Unit Usaha', 'Tahun', 'Bulan', 'Pemasukan', 'Keterangan', 'Waktu Update']
  const rawRows = [rawHeader]
  pemasukan.forEach((p) => {
    const unit = units.find((u) => u.id === p.unit_usaha_id)
    rawRows.push([p.id, unit?.nama ?? p.unit_usaha_id, p.tahun, MONTH_NAMES_FULL[p.bulan], p.jumlah, p.keterangan ?? '', p.updated_at])
  })
  const ws4 = XLSX.utils.aoa_to_sheet(rawRows)
  XLSX.utils.book_append_sheet(wb, ws4, 'Data Pemasukan')

  const buffer = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' })
  const fileName = `${appName}_Pemasukan_Unit_Usaha_${tahun}.xlsx`

  return new Response(buffer, {
    headers: {
      'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition': `attachment; filename="${encodeURIComponent(fileName)}"`,
    },
  })
}
