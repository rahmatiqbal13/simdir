import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { calculateRolling } from '@/lib/pemasukanRolling'

function getServiceClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  )
}

// GET /api/pendapatan-publik?tahun=2026 — versi publik (tanpa login) dari
// ringkasan pendapatan unit usaha, termasuk breakdown bulanan dengan rolling
// target (lihat lib/pemasukanRolling.js) supaya publik bisa melihat gimana
// target bulanan bergulir sampai tercapai target tahunan.
// Dilindungi lewat pengecualian eksplisit di middleware.js (isPublicPath),
// BUKAN lewat prefix /pemasukan-unit-usaha yang mensyaratkan login.
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url)
    const tahun = parseInt(searchParams.get('tahun') || String(new Date().getFullYear()))

    const supabase = getServiceClient()
    const [{ data: units, error: unitsErr }, { data: targets }, { data: pemasukan }] = await Promise.all([
      supabase.from('unit_usaha').select('id, nama').eq('aktif', true).order('nama'),
      supabase.from('target_unit_usaha').select('unit_usaha_id, target_tahunan').eq('tahun', tahun),
      supabase.from('pemasukan_unit_usaha').select('unit_usaha_id, bulan, jumlah').eq('tahun', tahun),
    ])
    if (unitsErr) throw unitsErr

    const items = (units || []).map((u) => {
      const target = targets?.find((t) => t.unit_usaha_id === u.id)?.target_tahunan ?? 0

      const incomeByMonth = {}
      for (let m = 1; m <= 12; m++) {
        const entry = pemasukan?.find((p) => p.unit_usaha_id === u.id && p.bulan === m)
        incomeByMonth[m] = entry ? entry.jumlah : null
      }
      const months = calculateRolling(target, incomeByMonth)
      const realisasi = months.reduce((s, m) => s + (m.income ?? 0), 0)
      const capaianPct = target > 0 ? Math.round((realisasi / target) * 100) : null

      return { nama: u.nama, target_tahunan: target, realisasi, capaian_pct: capaianPct, months }
    })

    const grandTarget = items.reduce((s, i) => s + i.target_tahunan, 0)
    const grandRealisasi = items.reduce((s, i) => s + i.realisasi, 0)

    return NextResponse.json({
      tahun,
      units: items,
      grand_total: {
        target_tahunan: grandTarget,
        realisasi: grandRealisasi,
        capaian_pct: grandTarget > 0 ? Math.round((grandRealisasi / grandTarget) * 100) : null,
      },
    })
  } catch (err) {
    return NextResponse.json({ error: err.message || 'Gagal memuat data pendapatan' }, { status: 500 })
  }
}
