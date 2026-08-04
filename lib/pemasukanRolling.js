// Perhitungan target bulanan dengan rolling carryover: kalau target bulan
// berjalan tidak tercapai, kekurangannya "digulirkan" jadi tambahan target
// bulan berikutnya. Port dari sistem lama (SIREKAP) lib/rolling.ts — logika
// tidak diubah, hanya diterjemahkan dari TypeScript ke JS.
export function calculateRolling(annualTarget, incomeByMonth) {
  const monthlyTarget = annualTarget > 0 ? Math.round(annualTarget / 12) : 0
  const months = []
  let carryover = 0

  for (let m = 1; m <= 12; m++) {
    const income = incomeByMonth[m] ?? null
    const effectiveTarget = monthlyTarget + carryover
    let status
    let nextCarryover = carryover

    if (annualTarget === 0) {
      status = 'notarget'
      nextCarryover = 0
    } else if (income === null) {
      status = 'pending'
      // carryover tetap sama untuk bulan yang belum ada datanya
    } else if (income >= effectiveTarget) {
      status = 'achieved'
      nextCarryover = 0
    } else {
      status = 'notachieved'
      nextCarryover = effectiveTarget - income
    }

    months.push({
      month: m,
      income,
      baseTarget: monthlyTarget,
      rollingCarryover: carryover,
      effectiveTarget,
      status,
      surplus: income !== null ? income - effectiveTarget : 0,
    })

    carryover = nextCarryover
  }

  return months
}
