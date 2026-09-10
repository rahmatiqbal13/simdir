// Daftar pimpinan/jabatan untuk dropdown "Kepada" (memo) dan "Dihadiri
// Pimpinan → Nama Pimpinan" (agenda). Satu sumber supaya dua form itu
// tidak menyimpan salinan yang bisa berbeda. Entri terakhir 'lainnya'
// memicu input manual di kedua form.
export const PIMPINAN_LIST = [
  { value: 'Rektor Unesa', label: 'Rektor Unesa' },
  { value: 'Wakil Rektor I', label: 'Wakil Rektor I' },
  { value: 'Wakil Rektor II', label: 'Wakil Rektor II' },
  { value: 'Wakil Rektor III', label: 'Wakil Rektor III' },
  { value: 'Direktur USC', label: 'Direktur USC' },
  { value: 'Gubernur Jawa Timur', label: 'Gubernur Jawa Timur' },
  { value: 'Walikota Surabaya', label: 'Walikota Surabaya' },
  { value: 'Kepala Dinas', label: 'Kepala Dinas' },
  { value: 'lainnya', label: 'Lainnya (Input Manual)' },
]
