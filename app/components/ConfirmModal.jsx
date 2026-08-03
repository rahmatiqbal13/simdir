'use client'

import { useFocusTrap } from './useFocusTrap'

/**
 * Modal konfirmasi generik (mis. sebelum aksi hapus/destruktif).
 * Menggantikan window.confirm() native agar konsisten dengan desain sistem
 * (focus-trapped, role=dialog, sesuai brand) di seluruh aplikasi.
 *
 * Usage:
 *   <ConfirmModal
 *     open={showConfirm}
 *     title="Hapus Pamflet"
 *     message={<>Yakin ingin menghapus <strong>{item.judul}</strong>?</>}
 *     confirmLabel="Ya, Hapus"
 *     onConfirm={handleDelete}
 *     onCancel={() => setShowConfirm(false)}
 *   />
 */
export default function ConfirmModal({
  open,
  title = 'Konfirmasi',
  message,
  confirmLabel = 'Ya, Lanjutkan',
  cancelLabel = 'Batal',
  danger = true,
  busy = false,
  onConfirm,
  onCancel,
}) {
  const modalRef = useFocusTrap(open, onCancel)
  if (!open) return null

  return (
    <div className="modal-overlay" onClick={onCancel} ref={modalRef} role="dialog" aria-modal="true" aria-labelledby="confirm-modal-title">
      <div className="modal" style={{ maxWidth: 420 }} onClick={(e) => e.stopPropagation()}>
        <div className="modal-head">
          <h3 id="confirm-modal-title">{title}</h3>
          {/* minWidth/minHeight eksplisit — class .btn-icon.btn-sm resolve ke
              32x32px (dirancang buat aksi baris tabel admin yang padat),
              tapi modal ini juga dipakai dari halaman kiosk publik
              (konfirmasi hapus tanda tangan/foto di Buku Tamu) yang perlu
              target sentuh minimal 44x44px. */}
          <button className="btn btn-ghost btn-sm btn-icon" onClick={onCancel} aria-label="Tutup" style={{ minWidth: 44, minHeight: 44 }}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ width: 16, height: 16 }}>
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>
        <div className="modal-body">
          <div style={{ display: 'flex', gap: 14, alignItems: 'flex-start' }}>
            <div
              style={{
                width: 40,
                height: 40,
                borderRadius: 10,
                background: danger ? 'var(--danger-50)' : 'var(--primary-50)',
                color: danger ? 'var(--danger)' : 'var(--primary)',
                display: 'grid',
                placeItems: 'center',
                flexShrink: 0,
              }}
              aria-hidden="true"
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ width: 20, height: 20 }}>
                {danger ? (
                  <>
                    <polyline points="3 6 5 6 21 6" />
                    <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                  </>
                ) : (
                  <>
                    <circle cx="12" cy="12" r="10" />
                    <line x1="12" y1="16" x2="12" y2="12" />
                    <line x1="12" y1="8" x2="12.01" y2="8" />
                  </>
                )}
              </svg>
            </div>
            <p style={{ fontSize: '0.9375rem', color: 'var(--text)', lineHeight: 1.6, margin: 0 }}>{message}</p>
          </div>
        </div>
        <div className="modal-foot">
          <button className="btn btn-secondary" onClick={onCancel} disabled={busy}>
            {cancelLabel}
          </button>
          <button className={`btn ${danger ? 'btn-danger' : 'btn-primary'}`} onClick={onConfirm} disabled={busy}>
            {busy ? 'Memproses...' : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  )
}
