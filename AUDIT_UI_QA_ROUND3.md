# Audit UI/UX — Ronde 3 (Full-App Review, "Modern Look" Assessment)
**Tanggal:** 2026-07-17
**Reviewer:** Claude (AI — senior UI/UX audit, 5-agent parallel review)
**Scope:** Semua halaman — shell/layout, e-invoice, agenda & TV kiosk, penilaian & kritik-saran, dashboard/laporan/surat/pengaturan
**Konteks:** Ronde 1 & 2 (`AUDIT_UI_QA.md`, `AUDIT_UI_QA_ROUND2.md`, 2026-05-18/19) mengaudit modul `pencairan`/SPJ yang **sudah tidak ada lagi** di codebase saat ini. Ronde ini adalah audit penuh dari nol terhadap kode saat ini, plus verifikasi eksplisit terhadap klaim-klaim lama yang masih relevan.

---

## TL;DR

The foundation is better than a typical internal admin tool: `app/globals.css` already defines a real design system (USC navy/yellow brand, a tuned shadow/radius scale, semantic color tokens, a command palette, skeleton loaders, focus-trapped modals, safe-area-aware mobile nav). `kelola-agenda`, the settings pages, and the public survey wizards all show genuine design intent.

But that system is inconsistently *adopted*. Roughly half the app's feature pages bypass it entirely — raw inline hex colors, native `alert()`/`confirm()` dialogs, ad-hoc badge/stamp components reimplemented 3-5 times with visible drift between copies. That inconsistency, more than any single ugly screen, is what currently caps this app's "modern" ceiling. It's also the highest-leverage thing to fix: most of it is a *migration onto infrastructure that already exists*, not new design work.

On top of the consistency issues, the review surfaced a handful of **real functional bugs**, not just polish:
- Surat's file attachment upload is fake — it's reduced to a boolean and never stored.
- The facility-rating admin UI only supports 3 of the 11 facilities the public form offers — 8 permanently show "not available."
- A global text color (`--text-3`) fails contrast (~2.6:1) and is used for real content (timestamps, locations, table cells) app-wide, not just decoration.
- Login page markets "SPJ Digital" / "Anggaran Real-time" — features that no longer exist in the nav.

---

## How to read this report

Findings are grouped two ways:
1. **Cross-cutting issues** — appear in 3+ modules, fix once at the root (CSS token / shared component) and every page benefits. Fix these first — highest leverage per hour spent.
2. **Module-specific findings** — the rest, grouped by feature area, most severe first.

Severity: **Critical** (broken/inaccessible/actively misleading) → **High** → **Medium** → **Low** (nice-to-have polish).

---

## PART 1 — Cross-Cutting Issues (fix once, benefits the whole app)

### X1 — Critical: `--text-3` fails WCAG contrast and is used for real content everywhere
**File:** `app/globals.css:64` — `--text-3: #94a3b8`
Contrast against white/`--surface` is ≈2.3–2.6:1 — needs 4.5:1 for normal text. This token isn't reserved for decoration: it's used for stat subtitles, dates, table timestamps, location text, filter hints, empty-state copy, and the TV kiosk's light-theme row numbers/timestamps/weather label — all across every module reviewed.
**Fix:** Darken `--text-3` toward `#64748b`/`#475569` for anything carrying real information; keep the lightest tint only for genuinely decorative labels. One CSS variable change fixes readability app-wide.

### X2 — Critical: Status/badge colors use raw hex instead of the app's own (already-tuned) semantic tokens, and fail contrast
Found independently in **3 separate modules**:
- E-invoice: all 6 status badge/stamp colors (`page.jsx:10-53`, `[id]/page.jsx:162-169`, `[id]/print/page.jsx:9-46`) computed at 1.95:1–3.95:1 — all fail AA.
- Kelola-saran/kelola-penilaian: "dibaca" badge `#ca8a04` on `#fefce8` (`kelola-penilaian/page.jsx:23-24`, `kelola-saran/page.jsx:14`) — likely fails AA.
- Public penilaian: rating-scale labels "Buruk"/"Sangat Baik" in raw `#ef4444`/`#10b981` on white, borderline AA (`penilaian/page.jsx:582-583`).

The root cause is the same everywhere: pages reach for generic Tailwind-500 hex values instead of the app's own `--danger`/`--warning`/`--success`/`--info` tokens in `globals.css`, which were already calibrated darker specifically to pass contrast (`--danger: #b91c1c`, `--success: #047857`, etc).
**Fix:** Swap every ad-hoc status color to the existing semantic tokens + their `-50`/`-100` tints. This is a find-and-replace, not new design work.

### X3 — High: Two feature areas use an entirely different, off-brand color language
`tv-pamflet/page.jsx` and the public `agenda/page.jsx` use indigo (`#4f46e5`) and amber gradients as their de facto "primary" color, plus scattered raw hex throughout — instead of the app's actual brand navy (`#1e3a8a`) and yellow accent (`#f5b915`) used correctly everywhere else, including the sibling page `kelola-agenda`.
**Why it matters:** this is the single most visible inconsistency found — staff moving between `kelola-agenda` (on-brand) and `tv-pamflet` (off-brand) see two different products. Fixing this alone would meaningfully move the needle on "modern, cohesive."
**Fix:** Migrate both files onto `var(--primary)` / `.btn` / `.card` and the shared tokens, same pattern already proven in `kelola-agenda`.

### X4 — High: `alert()` / `confirm()` native dialogs used inconsistently for core feedback and destructive actions
Present in **every module audited**: e-invoice (create/edit validation + errors), penilaian/kelola-saran (save/error/delete), kelola-agenda's sibling `tv-pamflet` (delete pamphlet), and surat/users/unit-kerja (errors, and unit-kerja's delete confirmation). Meanwhile several *other* pages in the same modules already have a polished, on-brand, focus-trapped modal or toast for the identical action (e.g. e-invoice list's `DeleteConfirmModal` vs e-invoice detail's `confirm()`; kelola-agenda's styled delete modal vs `tv-pamflet`'s `confirm()`).
**Why it matters:** blocks the JS thread, can't be styled, and reads as an unfinished internal tool sitting inside an otherwise custom-designed product — directly opposed to "modern looks." The fix is reuse, not invention — the good pattern already exists in the same codebase.
**Fix:** Standardize on the existing modal/toast components; sweep all `alert(`/`confirm(` call sites.

### X5 — High: Icon-only action buttons rely on `title` alone, missing `aria-label`
Recurring in every module: e-invoice's item-remove button, agenda's pagination/edit/delete icons (and inconsistently present in card view but missing in table view for the *same* action), penilaian's 6-icon question-reorder row, settings pages' row actions, TV pamphlet delete. `title` is not reliably exposed as an accessible name by screen readers.
**Fix:** Add explicit `aria-label` to every icon-only control; this is mechanical, not a design decision, and touches dozens of buttons across the app.

### X6 — High: Missing loading/disabled state on submit → double-submit risk
Confirmed on: e-invoice Edit (Create has autosave/protection, Edit has none — the *riskier* of the two operations is the unprotected one), kelola-agenda's Save/Update modal button, and Users/Unit Kerja's create/edit modals (Surat correctly disables its submit button; the sibling settings pages don't).
**Fix:** Thread the existing `isSaving`/`operationLoading` state (already present in each parent component) down into the modal's submit button — the state already exists, it's just not wired to the button in ~4 places.

### X7 — Medium: Table content overflows on mobile due to inconsistent use of `.table-scroll`
`.table-wrap` alone has no `overflow-x` — only `.table-scroll` (nested inside it) does. `UnitTable` in `pengaturan/unit-kerja/page.jsx:190` omits `.table-scroll` (its sibling `UserTable` has it correctly). Separately, e-invoice's items table in Create/Edit isn't wrapped in either class and uses fixed pixel column widths that exceed a 375px viewport with no scroll container at all.
**Fix:** Add the missing `.table-scroll` wrapper to Unit Kerja; wrap e-invoice's items table the same way the other e-invoice pages already do.

### X8 — Medium: Formatters and small components duplicated across many files, already drifting
`formatRupiah`/`formatDate` reimplemented independently in 6 files (`laporan`, and all 5 e-invoice pages); the exact "abbreviated vs full currency" inconsistency the Round 2 audit flagged on the old dashboard has resurfaced *inside a single page* (`laporan/page.jsx` shows both `Rp 5.000.000` and `Rp 5,0Jt` for the same kind of value simultaneously). Similarly, e-invoice's `InvoiceStamp`/status-config is defined 3 times with already-diverging visuals (screen vs. print stamps look different for the same status).
**Fix:** Extract one `lib/format.js` and one shared `StatusBadge`/`InvoiceStamp` component. Low effort, prevents the drift from getting worse.

### X9 — Medium: Nav/icon config duplicated 3 ways with no single source of truth
`app/(dashboard)/layout.jsx` defines `navItems` (sidebar) and `ALL_NAV` (command palette) separately, and `MobileBottomNav.jsx` redefines its own `navItems` + a full second copy of the icon SVG set. Adding/changing a nav entry requires editing 3 places correctly.
**Fix:** Not urgent, but worth consolidating into one nav config file imported by all three consumers before adding more nav items.

### X10 — Low/Medium (opportunity): No dark mode anywhere
Zero `prefers-color-scheme` in `globals.css`. The TV kiosk has its own bespoke dark/light toggle, but the main admin app doesn't respond to OS theme at all. Worth including if pursuing the "bigger overhaul" option.

### X11 — Confirmed still valid: Duplicate `role="banner"` landmark
`app/(dashboard)/layout.jsx:474` (topbar) and `:556` (mobile-header) both carry `role="banner"` and both stay mounted simultaneously (only CSS-hidden per breakpoint) — two banner landmarks exist in the accessibility tree at all times. This was flagged in Round 2 and is still present.
**Fix:** Remove the role from one (mobile-header is the better candidate to drop or change to no role, per the earlier audit's reasoning).

---

## PART 2 — Functional bugs found (not cosmetic — actual broken behavior)

| # | Bug | File | Impact |
|---|-----|------|--------|
| F1 | Surat attachment upload never persists a file — reduced to `!!fd.get('lampiran')` boolean | `surat/page.jsx:142,475` | User uploads a real document believing it's saved; it's silently discarded. UI (dropzone, file-type copy, "Ada" badge) actively implies otherwise. |
| F2 | Facility-rating question admin only supports 3 of 11 facilities the public form offers | `kelola-penilaian/pertanyaan/page.jsx:8-12` vs `penilaian/page.jsx:5-17` | 8 facilities permanently show "Belum tersedia" on the public form — not by design, just because admin tooling to configure them was never built out. Also breaks admin filtering/color-coding for the same 8 facilities. |
| F3 | `userRole`/`canEdit` hardcoded (`= true` / `= 'super_admin'`) instead of read from session | `surat/page.jsx:75`, `users/page.jsx:563-564`, `unit-kerja/page.jsx:483-484` | The "Akses Ditolak" permission UI on these 3 pages is unreachable dead code — every visitor is currently treated as super_admin regardless of real role. |
| F4 | Login page markets features no longer in the app | `app/login/page.jsx:115-117` ("Agenda Pintar", "Anggaran Real-time", "SPJ Digital") | "Anggaran Real-time" and "SPJ Digital" reference the removed `pencairan` module — new users are promised features that don't exist. |
| F5 | Debug `console.log` in component body re-runs every render, logs customer PII (name/phone/email/address) on every save | `e-invoice/[id]/edit/page.jsx:420-422`, plus extensive logging in `create/page.jsx:421-571` | Not user-facing, but leaks PII to devtools console on every invoice save. |
| F6 | Combined email/phone field decides field type via `.includes('@')` heuristic, no `type="email"`/`"tel"` | `penilaian/page.jsx:263-269` | Wrong mobile keyboard shown; the sibling public form (`kritik-saran`) does this correctly with two separate typed fields. |
| F7 | Public rating form's required-field validation error renders off-screen from where the user is scrolled | `penilaian/page.jsx:111-118,384-388` | Anonymous visitor taps submit, sees nothing happen, likely abandons — worst-case outcome for a public feedback channel. |
| F8 | CSV export gives zero feedback; silently downloads a near-blank file if the filtered list is empty | `surat/page.jsx:109-132` | User can't tell if export worked at all. |
| F9 | Public agenda auto-rotating carousel (10s) can only be paused by mouse hover — no keyboard/touch pause | `agenda/page.jsx:656-657` | WCAG 2.2.2 (Pause/Stop/Hide) gap on a real interactive public page (not the passive TV kiosk). |
| F10 | Agenda reorder/save-question reorder issues sequential unguarded network calls | `kelola-penilaian/pertanyaan/page.jsx:208-236` | A mid-loop failure leaves live public-facing question order partially applied with no rollback. |

---

## PART 3 — Module Findings

### 3.1 Global Shell, Login, Shared Components
- **X11** (duplicate banner) — see above.
- **X10** (no dark mode) — see above.
- **X9** (nav config x3) — see above.
- **F4** (login markets dead features) — see above.
- Toast container has a `minWidth: 300px` with fixed `1rem` right margin — borderline overflow risk on the smallest phones (iPhone SE, 320px width: 300+32=332px > 320px).
- Otherwise this layer is solid: focus-trap modals, skip-to-content link, `prefers-reduced-motion`/`prefers-contrast` media queries, safe-area-aware bottom nav, skeleton shimmer, and a genuinely nice empty-state illustration system already exist and are worth reusing more, not replacing.

### 3.2 E-Invoice (full findings: see agent report — 16 findings)
Highlights beyond the cross-cutting issues above:
- Edit has no autosave/draft-recovery even though Create does (**High** — the riskier operation is the unprotected one).
- Items table and the summary/notes grid use fixed pixel widths (`400px` column, `150px`/`140px`/`130px` per cell) with zero responsive breakpoint — real mobile overflow, not theoretical.
- Print preview toolbar is a fixed, non-wrapping bar over a hardcoded `100px` content offset — will visibly overlap content if the toolbar wraps to 2 lines on a narrow screen.
- Required-field asterisks are colored in the Customers modal but plain-text everywhere else in the same module.

### 3.3 Agenda Management & TV/Kiosk Display (full findings: see agent report — 18 findings)
Highlights beyond the cross-cutting issues above:
- TV kiosk's light theme has a genuine contrast failure (`text3: '#94a3b8'` in the TV's own separate theme config, same root problem as X1) on row numbers, timestamps, and the weather city label — the one screen whose entire purpose is legibility from across a room.
- `kelola-agenda`'s single edit/create modal has grown to ~12 fields with no visual section grouping.
- Several **prior-audit (Round 2) claims about the TV page were verified and found stale/incorrect**: the claimed scale-clamping formula doesn't match current code, and the "dual orientation (landscape/portrait)" feature does not exist in the current codebase (zero matches on grep) — treat Round 2's TV-page claims as superseded by this report.
- A dead file, `agenda/tv/media-config.js`, is explicitly marked superseded in a comment but still present — worth deleting before any redesign so it isn't mistaken for live config.

### 3.4 Penilaian & Kritik-Saran (full findings: see agent report — 22 findings)
Highlights beyond the cross-cutting issues above (F2, F6, F7 above are from this module):
- **The public-facing forms are the strongest UX work in the entire app** — a genuine step-wizard with progress bars, one-question-at-a-time flow, character counters, and polished success screens. The problem is purely that they're built with inline styles instead of the shared design system, not that the underlying UX pattern is weak.
- Star-rating widget (the single most important control on the public rating form) has a sub-44px touch target and zero accessible name/state.
- Custom "pill button" single-choice groups (gender, facility, jenis) have no ARIA radiogroup semantics anywhere across 3 files.
- No "review your answers" step before final submit on either public form — for anonymous, one-way submissions this removes any chance to self-correct.

### 3.5 Dashboard, Laporan, Surat, Pengaturan (full findings: see agent report — 13 findings)
Highlights beyond the cross-cutting issues above (F1, F3, F8 above are from this module):
- This cluster is **visually the most polished** in the app (dashboard hero, KPI cards, hover lifts, progress bars show real design intent) — the gap here is consistency and a11y wiring, not visual quality.
- `pengaturan/unit-kerja`'s table view is missing `.table-scroll` (X7) while its sibling `users` page has it correctly — a direct, verifiable mobile-overflow bug.
- Three **Round 2 claims are now confirmed resolved** (dead `WelcomeSection` component, `UUID.slice(0,5)` duplicate-key risk) — both no longer exist anywhere in the repo. One claim (11px/10px stat text) is stale/inaccurate — current sizes are 12-13px; the real problem at that location is the **contrast** of `--text-3` (X1), not the font size.

---

## Recommended Roadmap

**Phase 0 — Global token fixes (hours, not days, huge leverage):**
Fix X1 (`--text-3` contrast), X2 (swap raw hex status colors to existing semantic tokens), X11 (duplicate banner). These are CSS/config edits that improve every page simultaneously.

**Phase 1 — Consistency sweep (reuse, not redesign):**
X4 (replace `alert`/`confirm` with existing modal/toast), X5 (aria-labels on icon buttons), X6 (wire existing loading state into submit buttons), X7 (fix table-scroll gaps). All of these reuse components/state that already exist elsewhere in the codebase — this is largely mechanical.

**Phase 2 — Fix functional bugs:**
F1 (Surat upload), F2 (Penilaian facility config gap), F3 (hardcoded role), F9 (carousel pause control). These affect real users today, independent of any visual refresh.

**Phase 3 — Design system migration:**
X3 (bring `tv-pamflet` + public `agenda` onto brand), X8 (consolidate formatters/StatusBadge/InvoiceStamp), X9 (single nav config). This is where "modern refresh" work concentrates — migrating outlier pages onto the system that already exists elsewhere in the app.

**Phase 4 — If pursuing the bigger visual overhaul:**
Dark mode (X10), data visualization on `laporan`/`kelola-penilaian` (currently flat stat cards only, no trend/comparison charts), a "review your answers" step on public forms, and a section-grouped redesign of the 12-field `kelola-agenda` modal.

---

*This report is read-only analysis — no code was modified. Findings were produced by 4 parallel agents each auditing an independent module cluster, plus a direct review of the shared shell/design system, then synthesized here. Full per-finding detail (file:line, severity, fix direction) for each module is available in the individual agent reports if deeper drill-down is needed on any specific finding.*
