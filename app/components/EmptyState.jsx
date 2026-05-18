'use client'

/**
 * Empty State Components dengan Illustrations
 * Menyediakan visual feedback yang menarik saat tidak ada data
 */

// Illustration: Empty Agenda
function IllustrationEmptyAgenda({ size = 120 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 120 120" fill="none" aria-hidden="true">
      <circle cx="60" cy="60" r="50" fill="#EEF2FF" />
      <rect x="35" y="35" width="50" height="50" rx="8" fill="#C7D2FE" />
      <rect x="42" y="45" width="36" height="4" rx="2" fill="#6366F1" />
      <rect x="42" y="55" width="28" height="4" rx="2" fill="#818CF8" />
      <rect x="42" y="65" width="32" height="4" rx="2" fill="#818CF8" />
      <circle cx="85" cy="85" r="15" fill="#FEF3C7" />
      <path d="M80 85H90M85 80V90" stroke="#D97706" strokeWidth="2" strokeLinecap="round" />
    </svg>
  )
}

// Illustration: No Search Results
function IllustrationNoSearch({ size = 120 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 120 120" fill="none" aria-hidden="true">
      <circle cx="60" cy="60" r="50" fill="#F1F5F9" />
      <circle cx="50" cy="52" r="20" fill="#E2E8F0" stroke="#94A3B8" strokeWidth="3" />
      <line x1="64" y1="66" x2="82" y2="84" stroke="#94A3B8" strokeWidth="3" strokeLinecap="round" />
      <circle cx="45" cy="48" r="2" fill="#64748B" />
      <circle cx="55" cy="48" r="2" fill="#64748B" />
      <path d="M45 58C45 58 48 62 52 58" stroke="#64748B" strokeWidth="2" strokeLinecap="round" />
    </svg>
  )
}

// Illustration: No Data
function IllustrationNoData({ size = 120 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 120 120" fill="none" aria-hidden="true">
      <circle cx="60" cy="60" r="50" fill="#ECFDF5" />
      <rect x="38" y="40" width="44" height="40" rx="4" fill="#A7F3D0" />
      <rect x="45" y="50" width="30" height="3" rx="1.5" fill="#059669" />
      <rect x="45" y="58" width="22" height="3" rx="1.5" fill="#34D399" />
      <rect x="45" y="66" width="26" height="3" rx="1.5" fill="#34D399" />
      <circle cx="85" cy="35" r="10" fill="#FEE2E2" />
      <path d="M81 35H89" stroke="#DC2626" strokeWidth="2" strokeLinecap="round" />
    </svg>
  )
}

// Illustration: Error
function IllustrationError({ size = 120 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 120 120" fill="none" aria-hidden="true">
      <circle cx="60" cy="60" r="50" fill="#FEF2F2" />
      <circle cx="60" cy="60" r="25" fill="#FECACA" />
      <path d="M52 52L68 68M68 52L52 68" stroke="#DC2626" strokeWidth="3" strokeLinecap="round" />
      <circle cx="30" cy="30" r="8" fill="#FEE2E2" />
      <circle cx="90" cy="90" r="6" fill="#FEE2E2" />
    </svg>
  )
}

// Illustration: Success
function IllustrationSuccess({ size = 120 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 120 120" fill="none" aria-hidden="true">
      <circle cx="60" cy="60" r="50" fill="#ECFDF5" />
      <circle cx="60" cy="60" r="25" fill="#A7F3D0" />
      <path d="M50 60L56 66L70 52" stroke="#059669" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx="30" cy="30" r="8" fill="#D1FAE5" />
      <circle cx="90" cy="90" r="6" fill="#D1FAE5" />
    </svg>
  )
}

// Illustration: No Internet
function IllustrationNoInternet({ size = 120 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 120 120" fill="none" aria-hidden="true">
      <circle cx="60" cy="60" r="50" fill="#FEF3C7" />
      <path d="M40 65C40 65 48 55 60 55C72 55 80 65 80 65" stroke="#D97706" strokeWidth="3" strokeLinecap="round" />
      <path d="M48 73C48 73 53 67 60 67C67 67 72 73 72 73" stroke="#F59E0B" strokeWidth="3" strokeLinecap="round" />
      <circle cx="60" cy="80" r="3" fill="#D97706" />
      <line x1="35" y1="45" x2="85" y2="85" stroke="#DC2626" strokeWidth="2" strokeLinecap="round" />
    </svg>
  )
}

// Illustration: Add New
function IllustrationAddNew({ size = 120 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 120 120" fill="none" aria-hidden="true">
      <circle cx="60" cy="60" r="50" fill="#EEF2FF" />
      <rect x="38" y="40" width="44" height="40" rx="4" fill="#C7D2FE" />
      <rect x="45" y="50" width="30" height="3" rx="1.5" fill="#6366F1" />
      <rect x="45" y="58" width="22" height="3" rx="1.5" fill="#818CF8" />
      <circle cx="85" cy="85" r="15" fill="#4F46E5" />
      <path d="M85 78V92M78 85H92" stroke="white" strokeWidth="2" strokeLinecap="round" />
    </svg>
  )
}

// Base Empty State Component
function EmptyStateBase({
  illustration,
  title,
  description,
  action,
  secondaryAction,
  compact = false
}) {
  return (
    <div 
      className={`empty-state ${compact ? 'compact' : ''}`}
      role="status"
      aria-live="polite"
      style={{
        textAlign: 'center',
        padding: compact ? '2rem 1rem' : '3rem 2rem',
        background: 'var(--surface)',
        border: '1px solid var(--border)',
        borderRadius: 'var(--radius-lg)',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: '1rem'
      }}
    >
      <div aria-hidden="true">{illustration}</div>
      
      <div style={{ maxWidth: '24rem' }}>
        <h3 style={{ 
          fontSize: compact ? '1rem' : '1.125rem', 
          fontWeight: 600, 
          color: 'var(--text)',
          marginBottom: '0.5rem'
        }}>
          {title}
        </h3>
        <p style={{ 
          fontSize: '0.875rem', 
          color: 'var(--text-2)',
          lineHeight: 1.5,
          margin: 0
        }}>
          {description}
        </p>
      </div>

      {(action || secondaryAction) && (
        <div style={{ 
          display: 'flex', 
          gap: '0.75rem', 
          marginTop: '0.5rem',
          flexWrap: 'wrap',
          justifyContent: 'center'
        }}>
          {action}
          {secondaryAction}
        </div>
      )}
    </div>
  )
}

// Pre-built Empty State: No Agenda
export function EmptyStateAgenda({ onAddNew, canEdit }) {
  return (
    <EmptyStateBase
      illustration={<IllustrationEmptyAgenda />}
      title="Belum Ada Agenda"
      description="Tidak ada agenda yang akan datang atau sedang berlangsung. Mulai dengan menambahkan agenda kegiatan pertama Anda."
      action={canEdit ? (
        <button className="btn btn-primary" onClick={onAddNew}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ width: '1rem', height: '1rem' }}>
            <line x1="12" y1="5" x2="12" y2="19" />
            <line x1="5" y1="12" x2="19" y2="12" />
          </svg>
          Tambah Agenda
        </button>
      ) : null}
    />
  )
}

// Pre-built Empty State: No Search Results
export function EmptyStateSearch({ query, onClear }) {
  return (
    <EmptyStateBase
      illustration={<IllustrationNoSearch />}
      title="Tidak Ada Hasil"
      description={`Pencarian untuk "${query}" tidak menemukan hasil. Coba kata kunci lain atau periksa ejaan Anda.`}
      action={onClear ? (
        <button className="btn btn-ghost" onClick={onClear}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ width: '1rem', height: '1rem' }}>
            <line x1="18" y1="6" x2="6" y2="18" />
            <line x1="6" y1="6" x2="18" y2="18" />
          </svg>
          Hapus Pencarian
        </button>
      ) : null}
    />
  )
}

// Pre-built Empty State: Filter Results
export function EmptyStateFilter({ onClear }) {
  return (
    <EmptyStateBase
      illustration={<IllustrationNoData />}
      title="Tidak Ada Data"
      description="Tidak ada data yang sesuai dengan filter yang dipilih. Coba ubah filter Anda."
      action={onClear ? (
        <button className="btn btn-ghost" onClick={onClear}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ width: '1rem', height: '1rem' }}>
            <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 12" />
          </svg>
          Reset Filter
        </button>
      ) : null}
    />
  )
}

// Pre-built Empty State: Error
export function EmptyStateError({ message, onRetry }) {
  return (
    <EmptyStateBase
      illustration={<IllustrationError />}
      title="Terjadi Kesalahan"
      description={message || "Maaf, terjadi kesalahan saat memuat data. Silakan coba lagi."}
      action={onRetry ? (
        <button className="btn btn-primary" onClick={onRetry}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ width: '1rem', height: '1rem' }}>
            <path d="M23 4v6h-6M1 20v-6h6M20.49 9A9 9 0 0 0 5.64 5.64L1 10m22 4l-4.64 4.36A9 9 0 0 1 3.51 15" />
          </svg>
          Coba Lagi
        </button>
      ) : null}
    />
  )
}

// Pre-built Empty State: Success
export function EmptyStateSuccess({ title, description, action }) {
  return (
    <EmptyStateBase
      illustration={<IllustrationSuccess />}
      title={title || "Berhasil!"}
      description={description}
      action={action}
    />
  )
}

// Pre-built Empty State: No Internet
export function EmptyStateNoInternet({ onRetry }) {
  return (
    <EmptyStateBase
      illustration={<IllustrationNoInternet />}
      title="Koneksi Terputus"
      description="Tidak dapat terhubung ke server. Periksa koneksi internet Anda dan coba lagi."
      action={onRetry ? (
        <button className="btn btn-primary" onClick={onRetry}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ width: '1rem', height: '1rem' }}>
            <path d="M23 4v6h-6M1 20v-6h6M20.49 9A9 9 0 0 0 5.64 5.64L1 10m22 4l-4.64 4.36A9 9 0 0 1 3.51 15" />
          </svg>
          Coba Lagi
        </button>
      ) : null}
    />
  )
}

// Pre-built Empty State: Add New (for CRUD pages)
export function EmptyStateAddNew({ title, description, onAdd, addLabel }) {
  return (
    <EmptyStateBase
      illustration={<IllustrationAddNew />}
      title={title || "Mulai Membuat Data"}
      description={description || "Belum ada data tersedia. Klik tombol di bawah untuk membuat data pertama."}
      action={onAdd ? (
        <button className="btn btn-primary" onClick={onAdd}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ width: '1rem', height: '1rem' }}>
            <line x1="12" y1="5" x2="12" y2="19" />
            <line x1="5" y1="12" x2="19" y2="12" />
          </svg>
          {addLabel || "Tambah Baru"}
        </button>
      ) : null}
    />
  )
}

// Compact version for inline usage
export function EmptyStateCompact({ type = 'data', message }) {
  const illustrations = {
    data: <IllustrationNoData size={80} />,
    search: <IllustrationNoSearch size={80} />,
    agenda: <IllustrationEmptyAgenda size={80} />,
    error: <IllustrationError size={80} />
  }

  const messages = {
    data: "Tidak ada data tersedia",
    search: "Tidak ada hasil pencarian",
    agenda: "Tidak ada agenda",
    error: "Terjadi kesalahan"
  }

  return (
    <EmptyStateBase
      illustration={illustrations[type]}
      title={message || messages[type]}
      description=""
      compact
    />
  )
}
