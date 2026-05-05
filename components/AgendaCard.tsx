import { StatusBadge } from './StatusBadge'
import { CountdownDisplay } from './CountdownDisplay'

function formatTanggal(mulai, selesai) {
  const opts = { day: 'numeric', month: 'short' }
  const mulaiStr = mulai.toLocaleDateString('id-ID', opts)
  if (mulai.toDateString() === selesai.toDateString()) {
    return mulaiStr
  }
  const selesaiStr = selesai.toLocaleDateString('id-ID', opts)
  return `${mulaiStr} – ${selesaiStr}`
}

export function AgendaCard({
  judul,
  tanggalMulai,
  tanggalSelesai,
  lokasi,
  Penyelenggara,
  pic,
}) {
  const mulai = new Date(tanggalMulai)
  const selesai = new Date(tanggalSelesai)

  return (
    <div className="agenda-card">
      <div className="agenda-header">
        <StatusBadge tanggalMulai={mulai} tanggalSelesai={selesai} />
        <span className="penyelenggara-tag">{Penyelenggara}</span>
      </div>

      <h3 className="agenda-title">{judul}</h3>

      <div className="agenda-meta">
        <div className="meta-row">
          <svg className="meta-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="12" cy="12" r="10" />
            <path d="M12 6v6l4 2" />
          </svg>
          <span>{formatTanggal(mulai, selesai)}</span>
        </div>
        <div className="meta-row">
          <svg className="meta-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z" />
            <circle cx="12" cy="10" r="3" />
          </svg>
          <span>{lokasi || '-'}</span>
        </div>
        {pic && (
          <div className="meta-row">
            <svg className="meta-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
              <circle cx="12" cy="7" r="4" />
            </svg>
            <span>PIC: {pic}</span>
          </div>
        )}
      </div>

      <CountdownDisplay tanggalMulai={mulai} tanggalSelesai={selesai} />
    </div>
  )
}