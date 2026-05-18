# Audit UI/UX & QA — SIMDIR
**Tanggal:** 2026-05-18  
**Reviewer:** Claude (AI — senior UI/UX + QA)  
**Stack:** Next.js 14, CSS Variables, PWA

---

## CRITICAL (Harus diperbaiki segera)

### C1 — Layout Tablet Broken (768px – 1024px)
**File:** `app/globals.css` line 531 & 960  
**Masalah:**  
- `.main-content { margin-left: 16rem }` di-set global (desktop)  
- Sidebar di-hide mulai 1024px via `transform: translateX(-100%)`  
- Tapi reset `margin-left: 0` baru ada di `@media (max-width: 48rem)` (768px)  
- **Akibat:** Di tablet (768–1024px), ada dead space 256px di sisi kiri layar. Konten tergeser ke kanan padahal sidebar sudah hilang.

**Fix:**
```css
@media (max-width: 64rem) {
  /* tambahkan ini */
  .main-content { margin-left: 0; }
}
```

---

## HIGH (Sangat disarankan diperbaiki)

### H1 — Touch Target Terlalu Kecil
**File:** `app/globals.css`  
**Standar:** Minimum 44×44px (Apple HIG), 48×48dp (Material Design)

| Elemen | Ukuran saat ini | Standar |
|--------|----------------|---------|
| `.btn-action` (tombol edit/delete) | 32×32px | 44px |
| `.filter-clear-btn` | 24×24px | 44px |
| `.modal-head button` (close modal) | 32×32px | 44px |
| `.menu-toggle` di desktop | 36px | 44px |

**Fix untuk btn-action:**
```css
.btn-action { 
  width: 2.5rem;   /* 40px — kompromi antara estetika & standar */
  height: 2.5rem; 
  /* atau gunakan padding + hitSlop workaround */
}
```

---

### H2 — Teks Terlalu Kecil (di bawah 12px)
**File:** `app/globals.css`, `app/(dashboard)/dashboard/page.jsx`  
**Standar:** Body text minimum 16px, elemen pendukung minimum 12px

Elemen yang perlu diperhatikan:
| Class / lokasi | Ukuran | Masalah |
|----------------|--------|---------|
| `.stat-label` (mobile dashboard) | `0.6875rem` = 11px | Terlalu kecil |
| `.user-role` mobile | `0.625rem` = 10px | Terlalu kecil |
| `.muted` di AgendaItem & ActivityItem | `0.6875rem` = 11px | Terlalu kecil |
| Label bottom nav | `0.625rem` = 10px | Terlalu kecil — atur minimum 0.75rem |
| `.sidebar-brand span` | `0.6875rem` = 11px | Acceptable tapi borderline |

**Fix:**
```css
.stat-label { font-size: 0.75rem; }       /* 12px */
.user-role { font-size: 0.6875rem; }      /* min 11px di sidebar */

/* Bottom nav label — MobileBottomNav.jsx line 188 */
fontSize: '0.75rem'  /* ganti dari 0.625rem */
```

---

### H3 — Duplikat `role="banner"` (Accessibility)
**File:** `app/(dashboard)/layout.jsx` line 217 & 293  
**Masalah:** Dua elemen memiliki `role="banner"`:
- `<header className="mobile-header" role="banner">` (line 217)
- `<header className="topbar" role="banner">` (line 293)

Per ARIA, hanya boleh ada **satu** landmark `banner` per halaman.  
**Fix:** Hapus `role="banner"` dari salah satu. Topbar lebih representatif sebagai banner utama. Mobile header bisa diganti `role="navigation"` atau tanpa role.

---

### H4 — Stats Grid 4 Kolom di Tablet (768px–1024px) Terlalu Padat
**File:** `app/globals.css` line 914  
```css
/* Tablet */
.stats-grid-mobile { grid-template-columns: repeat(4, 1fr); }
```
Di tablet 768px lebar, 4 kolom stat card dengan teks angka keuangan (`Rp 500Jt`) sangat cramped.  
**Fix:**
```css
@media (max-width: 64rem) {
  .stats-grid-mobile { grid-template-columns: repeat(2, 1fr); }
}
```

---

## MEDIUM (Disarankan diperbaiki)

### M1 — Dead Code: `WelcomeSection` Component Tidak Dipakai
**File:** `app/(dashboard)/dashboard/page.jsx` line 42–70  
`WelcomeSection` component didefinisikan lengkap tapi **tidak pernah dipakai** di JSX.  
Dashboard menggunakan `.welcome-section-mobile` div langsung. Ini membingungkan dan menambah bundle size.  
**Fix:** Hapus komponen `WelcomeSection` (line 42–70) karena sudah digantikan.

---

### M2 — Hardcoded Hex Colors di JSX (Bukan CSS Variables)
**File:** `app/(dashboard)/dashboard/page.jsx` line 602–660  
Di bagian Quick Actions Mobile, warna ditulis langsung di JSX:
```jsx
style={{ background: 'rgba(99, 102, 241, 0.15)', color: '#6366f1' }}
style={{ background: 'rgba(16, 185, 129, 0.15)', color: '#10b981' }}
```
Ini **tidak** menggunakan CSS variables, sehingga dark mode dan theming tidak bisa konsisten.  
**Fix:** Gunakan `var(--primary)`, `var(--success)`, dll.

---

### M3 — `formatRupiah` Dua Versi Tidak Konsisten
**File:** `app/(dashboard)/dashboard/page.jsx` line 9–13 vs `app/(dashboard)/pencairan/page.jsx` line 8–10

| Halaman | Output untuk Rp 5.000.000 |
|---------|--------------------------|
| Dashboard | `Rp 5.0Jt` (disingkat) |
| Pencairan | `Rp 5.000.000` (penuh) |
| SPJ | `Rp 5.000.000` (penuh) |

Inkonsistensi ini membingungkan user — angka anggaran di dashboard beda format dengan di halaman pencairan.  
**Fix:** Buat satu helper terpusat di `lib/utils/format.js` dengan satu standar format.

---

### M4 — Duplicate Key Risk di Program List
**File:** `app/(dashboard)/dashboard/page.jsx` line 420–431  
```jsx
programs.map(p => ({
  id_rka: p.id?.slice(0, 5) || p.id_rka || '-',  // UUID 5 char pertama!
  ...
}))
...
programs.map((program, index) => (
  <ProgramCard key={program.id_rka} .../>  // Key dari UUID 5 char pertama
))
```
UUID 5 karakter pertama bisa **collision** jika ada program dengan UUID prefix sama.  
**Fix:** Gunakan `key={p.id}` atau `key={index}` sebagai fallback.

---

### M5 — `role="button"` pada div (Sidebar Overlay)
**File:** `app/(dashboard)/layout.jsx` line 346–358  
```jsx
<div 
  className="sidebar-overlay" 
  role="button"
  tabIndex={0}
  ...
/>
```
Div dengan `role="button"` adalah anti-pattern aksesibilitas. Sudah ada `tabIndex` dan `onKeyDown`, tapi screen reader experience kurang optimal.  
**Fix:** Ganti dengan elemen `<button>` native:
```jsx
<button 
  className="sidebar-overlay"
  onClick={() => setSidebarOpen(false)}
  aria-label="Tutup menu navigasi"
/>
```
Dan di CSS tambahkan:
```css
.sidebar-overlay { 
  background: none; 
  border: none; 
  cursor: default; 
}
```

---

### M6 — `content-area` Padding Bottom Duplikat
**File:** `app/globals.css` line 986 & 1492–1494  
```css
/* Baris 986 */
.content-area { padding-bottom: calc(1rem + 70px); }

/* Baris 1492 — dalam media query yang sama */
.content-area { padding-bottom: calc(1rem + 70px) !important; }
```
Duplikat deklarasi dalam media query yang sama. Tidak merusak tapi tidak rapi.

---

## LOW (Nice to have)

### L1 — Emoji sebagai Konten (Bukan Icon Struktural)
**File:** `app/(dashboard)/dashboard/page.jsx` line 57  
```jsx
{greeting}, {userName}! <span aria-hidden="true">👋</span>
```
Penggunaan emoji dengan `aria-hidden` sudah benar. Ini acceptable untuk konteks greeting, bukan untuk ikon navigasi. Tidak perlu diubah.

---

### L2 — `stats-grid-mobile` Tampil di Tablet Walaupun Stats Grid Lain Juga Muncul
**File:** `app/globals.css` line 912–914  
Di tablet, `stats-grid-mobile` ditampilkan dengan 4 kolom, tapi kelas `stat-card-mobile` hanya punya styling di `@media (max-width: 48rem)`. Di tablet, card tidak memiliki warna background karena `.stat-card-primary`, `.stat-card-success`, dll. hanya didefinisikan dalam mobile media query (line 1082–1129).  
**Akibat:** Di tablet, stat cards tampil tanpa warna background (plain white/default).

---

### L3 — Modal Tidak Ada Entrance Animation dari Trigger Source
**File:** `app/globals.css` line 322  
```css
@keyframes modalIn { from { opacity: 0; transform: scale(0.95) translateY(10px); } ... }
```
Sudah ada animation, tapi tidak ada shared-element / origin dari trigger button. Minor issue, acceptable.

---

### L4 — `filter-search` min-width pada Pencairan Page
**File:** `app/(dashboard)/pencairan/page.jsx` line 65  
```jsx
<div className="filter-group filter-search" style={{ maxWidth: '24rem' }}>
```
Di mobile, `.filter-group.filter-search { min-width: 16rem; }` di-override dengan `min-width: unset` di mobile media query, jadi OK.

---

## QA Checklist — Status

| Area | Status | Catatan |
|------|--------|---------|
| Desktop layout (>1024px) | ✅ OK | Sidebar + content benar |
| Tablet layout (768–1024px) | ❌ BROKEN | Dead space kiri 256px |
| Mobile layout (<768px) | ✅ OK | Sidebar slide-out benar |
| Bottom nav mobile | ✅ OK | `display: block !important` override inline style |
| Keyboard navigation | ✅ OK | Focus trap, Escape key, skip link |
| Reduced motion | ✅ OK | `prefers-reduced-motion` handled |
| High contrast mode | ✅ OK | Media query ada |
| iOS safe area | ✅ OK | `env(safe-area-inset-bottom)` di bottom nav |
| iOS zoom prevention | ✅ OK | Input font-size 16px di mobile |
| PWA manifest | ✅ OK | Icons lengkap, meta tags benar |
| Print styles | ✅ OK | Sidebar tersembunyi |
| Loading states | ✅ OK | Skeleton loading ada |
| Empty states | ✅ OK | EmptyState component ada |
| Form validation | ✅ OK | FormValidation component ada |
| Toast notifications | ✅ OK | ToastProvider tersedia |
| Role-based navigation | ✅ OK | Sidebar & bottom nav per role |
| Touch targets | ❌ MASALAH | Beberapa elemen < 44px |
| Text readability | ⚠️ BORDERLINE | Beberapa teks 10–11px |
| Color semantics | ⚠️ PARTIAL | Beberapa hardcoded hex di JSX |
| Accessibility landmarks | ❌ MASALAH | Duplikat role="banner" |

---

## Prioritas Implementasi (Rekomendasi)

| Prioritas | Issue | Effort |
|-----------|-------|--------|
| 1 | C1 — Tablet layout broken | Rendah (1 baris CSS) |
| 2 | H4 — Stats grid 4 kolom di tablet | Rendah (1 baris CSS) |
| 3 | H3 — Duplikat role="banner" | Rendah (hapus 1 attribute) |
| 4 | H1 — Touch target terlalu kecil | Sedang (beberapa elemen) |
| 5 | H2 — Teks terlalu kecil | Sedang (beberapa class) |
| 6 | M1 — Dead code WelcomeSection | Rendah (hapus 28 baris) |
| 7 | M3 — formatRupiah inkonsisten | Sedang (buat shared util) |
| 8 | M4 — Duplicate key di program list | Rendah (ganti key prop) |
| 9 | M2 — Hardcoded hex colors | Sedang (replace per-elemen) |
| 10 | M5 — role="button" pada div | Rendah |
