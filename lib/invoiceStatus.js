/**
 * Satu sumber kebenaran untuk warna & label status invoice.
 * Dipakai oleh daftar invoice, detail invoice, dan halaman cetak —
 * sebelumnya masing-masing mendefinisikan salinannya sendiri secara terpisah.
 *
 * `color`/`bgColor`/`borderColor` pakai CSS custom property (var(--x)) untuk
 * dipakai di style biasa. `hex` disediakan terpisah untuk kasus yang butuh
 * string hex mentah (mis. digabung dengan alpha suffix seperti `hex + '20'`).
 */
export const INVOICE_STATUS = {
  dibuat: {
    label: 'Dibuat',
    color: 'var(--text-2)',
    bgColor: 'var(--surface-3)',
    borderColor: 'var(--border-strong)',
    hex: '#475569',
    stamp: null,
  },
  dikirim: {
    label: 'Dikirim',
    color: 'var(--info)',
    bgColor: 'var(--info-50)',
    borderColor: 'var(--info-100)',
    hex: '#1d4ed8',
    stamp: 'dikirim',
  },
  disetujui: {
    label: 'Disetujui',
    color: '#6d28d9',
    bgColor: '#ede9fe',
    borderColor: '#ddd6fe',
    hex: '#6d28d9',
    stamp: 'disetujui',
  },
  segera: {
    label: 'Segera',
    color: 'var(--warning)',
    bgColor: 'var(--warning-50)',
    borderColor: 'var(--warning-100)',
    hex: '#b45309',
    stamp: 'segera',
  },
  jatuh_tempo: {
    label: 'Jatuh Tempo',
    color: 'var(--danger)',
    bgColor: 'var(--danger-50)',
    borderColor: 'var(--danger-100)',
    hex: '#b91c1c',
    stamp: 'jatuh_tempo',
  },
  lunas: {
    label: 'Lunas',
    color: 'var(--success)',
    bgColor: 'var(--success-50)',
    borderColor: 'var(--success-100)',
    hex: '#047857',
    stamp: 'lunas',
  },
}
