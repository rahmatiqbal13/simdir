// Memetakan kode error Postgres ke pesan yang bisa dibaca admin,
// alih-alih membocorkan detail constraint/nama tabel mentah dari Postgres
// langsung ke toast di UI.
export function friendlyDbError(err, { duplicateLabel = 'Data', dependentLabel = 'data lain' } = {}) {
  if (err?.code === '23505') return `${duplicateLabel} ini sudah dipakai, gunakan nilai lain.`
  if (err?.code === '23503') return `Tidak bisa dihapus — masih dipakai oleh ${dependentLabel}.`
  return err?.message || 'Terjadi kesalahan pada database'
}
