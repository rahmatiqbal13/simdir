// Browser memakai document.title sebagai nama default file saat "Save as PDF".
// Helper ini mengganti judul sementara selama dialog print terbuka, lalu
// mengembalikannya — supaya file tersimpan dengan nama laporan + tanggal unduh,
// bukan nama sistem.
export function printWithFilename(name) {
  const now = new Date()
  const pad = (n) => String(n).padStart(2, '0')
  const tanggal = `${pad(now.getDate())}-${pad(now.getMonth() + 1)}-${now.getFullYear()}`
  // Karakter seperti "/" (mis. pada nomor memo) tidak valid di nama file
  const safe = `${name} - ${tanggal}`.replace(/[\\/:*?"<>|]+/g, '-').replace(/\s+/g, ' ').trim()

  const prev = document.title
  const restore = () => { document.title = prev }
  document.title = safe
  window.addEventListener('afterprint', restore, { once: true })
  window.print()
}
