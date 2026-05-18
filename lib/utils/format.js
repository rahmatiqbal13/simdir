/**
 * Format angka ke Rupiah — full format (untuk tabel keuangan & detail)
 * Contoh: 5000000 → "Rp 5.000.000"
 */
export const formatRupiah = (num) => {
  if (!num || isNaN(num)) return 'Rp 0'
  return 'Rp ' + Number(num).toLocaleString('id-ID')
}

/**
 * Format angka ke Rupiah — format singkat (untuk stat cards & dashboard)
 * Contoh: 5000000 → "Rp 5.0Jt", 2000000000 → "Rp 2.0M"
 */
export const formatRupiahShort = (num) => {
  if (!num || isNaN(num)) return 'Rp 0'
  if (num >= 1_000_000_000) return 'Rp ' + (num / 1_000_000_000).toFixed(1) + 'M'
  if (num >= 1_000_000) return 'Rp ' + (num / 1_000_000).toFixed(1) + 'Jt'
  return 'Rp ' + Number(num).toLocaleString('id-ID')
}

/**
 * Format tanggal ke locale Indonesia
 * Contoh: "2026-05-18" → "18 Mei 2026"
 */
export const formatDate = (date, options = {}) => {
  if (!date) return '-'
  return new Date(date).toLocaleDateString('id-ID', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    ...options,
  })
}

/**
 * Format tanggal singkat
 * Contoh: "2026-05-18" → "18 Mei 26"
 */
export const formatDateShort = (date) => {
  if (!date) return '-'
  return new Date(date).toLocaleDateString('id-ID', {
    day: 'numeric',
    month: 'short',
    year: '2-digit',
  })
}
