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
  if (num >= 1_000_000_000) return 'Rp ' + (num / 1_000_000_000).toFixed(1).replace('.', ',') + 'M'
  if (num >= 1_000_000) return 'Rp ' + (num / 1_000_000).toFixed(1).replace('.', ',') + 'Jt'
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
    year: 'numeric',
  })
}

/**
 * Angka ke terbilang bahasa Indonesia — dipakai di cetak invoice & kwitansi.
 * Contoh: 45000000 → "Empat Puluh Lima Juta"
 */
export const terbilang = (angka) => {
  const bilangan = ['', 'Satu', 'Dua', 'Tiga', 'Empat', 'Lima', 'Enam', 'Tujuh', 'Delapan', 'Sembilan', 'Sepuluh', 'Sebelas']

  if (angka < 12) return bilangan[angka]
  if (angka < 20) return bilangan[angka - 10] + ' Belas'
  if (angka < 100) return bilangan[Math.floor(angka / 10)] + ' Puluh ' + bilangan[angka % 10]
  if (angka < 200) return 'Seratus ' + terbilang(angka - 100)
  if (angka < 1000) return bilangan[Math.floor(angka / 100)] + ' Ratus ' + terbilang(angka % 100)
  if (angka < 2000) return 'Seribu ' + terbilang(angka - 1000)
  if (angka < 1000000) return terbilang(Math.floor(angka / 1000)) + ' Ribu ' + terbilang(angka % 1000)
  if (angka < 1000000000) return terbilang(Math.floor(angka / 1000000)) + ' Juta ' + terbilang(angka % 1000000)
  if (angka < 1000000000000) return terbilang(Math.floor(angka / 1000000000)) + ' Miliar ' + terbilang(angka % 1000000000)
  return 'Angka terlalu besar'
}
