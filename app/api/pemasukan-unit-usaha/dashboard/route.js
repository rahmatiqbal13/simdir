import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { calculateRolling } from '@/lib/pemasukanRolling'

function getServiceClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  )
}

// GET /api/pemasukan-unit-usaha/dashboard?tahun=2026 — ringkasan siap-pakai
// untuk dashboard/komparasi/saran anggaran: per unit usaha aktif, hitung
// target efektif per bulan (dengan rolling carryover), realisasi, dan
// capaian %, plus grand total gabungan semua unit.
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url)
    const tahun = parseInt(searchParams.get('tahun') || String(new Date().getFullYear()))

    const supabase = getServiceClient()
    const [{ data: units, error: unitsErr }, { data: targets }, { data: pemasukan }] = await Promise.all([
      supabase.from('unit_usaha').select('*').eq('aktif', true).order('nama'),
      supabase.from('target_unit_usaha').select('*').eq('tahun', tahun),
      supabase.from('pemasukan_unit_usaha').select('*').eq('tahun', tahun),
    ])

    if (unitsErr) throw unitsErr

    const unitSummaries = (units || []).map((unit) => {
      const target = targets?.find((t) => t.unit_usaha_id === unit.id)
      const annualTarget = target?.target_tahunan ?? 0
      const monthlyTarget = annualTarget > 0 ? Math.round(annualTarget / 12) : 0

      const incomeByMonth = {}
      for (let m = 1; m <= 12; m++) {
        const entry = pemasukan?.find((p) => p.unit_usaha_id === unit.id && p.bulan === m)
        incomeByMonth[m] = entry ? entry.jumlah : null
      }

      const months = calculateRolling(annualTarget, incomeByMonth)
      const totalIncome = months.reduce((s, m) => s + (m.income ?? 0), 0)
      const achievementPct = annualTarget > 0 ? Math.round((totalIncome / annualTarget) * 100) : 0
      const remaining = annualTarget - totalIncome

      return {
        unit: { id: unit.id, name: unit.nama, active: unit.aktif },
        annualTarget,
        monthlyTarget,
        totalIncome,
        achievementPct,
        remaining,
        months,
      }
    })

    const grandTotalTarget = unitSummaries.reduce((s, u) => s + u.annualTarget, 0)
    const grandTotalIncome = unitSummaries.reduce((s, u) => s + u.totalIncome, 0)

    return NextResponse.json({
      year: tahun,
      units: unitSummaries,
      grandTotal: {
        annualTarget: grandTotalTarget,
        totalIncome: grandTotalIncome,
        achievementPct: grandTotalTarget > 0 ? Math.round((grandTotalIncome / grandTotalTarget) * 100) : 0,
      },
    })
  } catch (err) {
    return NextResponse.json({ error: err.message || 'Gagal memuat data dashboard' }, { status: 500 })
  }
}
