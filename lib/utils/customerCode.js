/**
 * Generate kode pelanggan unik untuk tabel `customers` (kolom `kode_pelanggan`).
 * Dipakai di e-invoice/create (mode "Pelanggan Baru", dengan retry-on-duplicate)
 * dan e-invoice/customers (form tambah pelanggan) — sebelumnya dua implementasi
 * terpisah dengan panjang/entropi berbeda, sekarang satu sumber.
 */
export const generateCustomerCode = () => {
  const prefix = 'CUST';
  const timestamp = Date.now().toString(36).toUpperCase();
  const random = Math.random().toString(36).substring(2, 8).toUpperCase();
  const random2 = Math.random().toString(36).substring(2, 4).toUpperCase();
  return `${prefix}${timestamp.slice(-6)}${random}${random2}`;
};
