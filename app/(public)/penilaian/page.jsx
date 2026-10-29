'use client'

import { useState, useEffect, useRef } from 'react'
import PublicShell, { usePublicBrand } from '@/app/components/PublicShell'

// Cuma unit usaha yang dinilai lewat penilaian bintang — PUI dan USC (Umum)
// bukan unit usaha, jadi tidak masuk di sini (lihat juga
// kelola-penilaian/pertanyaan/page.jsx yang harus selalu sinkron dengan
// daftar ini). 'ssfc' sudah berganti nama jadi 'Achilles Gym Hub' — entri
// lama dihapus, bukan cuma di-rename, supaya tidak dobel.
const FACILITIES = [
  { id: 'achilles-gym',    name: 'Achilles Gym Hub' },
  { id: 'kolam-renang',    name: 'Kolam Renang Unesa' },
  { id: 'driving-golf',    name: 'Driving Golf Unesa' },
  { id: 'ulabk',           name: 'ULABK' },
]

const RATING_LABELS = { 1: 'Buruk', 2: 'Kurang Baik', 3: 'Cukup', 4: 'Baik', 5: 'Sangat Baik' }

let nextId = 1
const genId = () => nextId++

export default function PenilaianPage() {
  const [items, setItems] = useState([])
  const [customQuestions, setCustomQuestions] = useState({})
  const [questionsLoading, setQuestionsLoading] = useState(true)
  const [profile, setProfile] = useState({
    nama: '', email: '', telepon: '', unit_kerja: '', jenis_kelamin: '', is_anonim: false,
  })
  const [loading, setLoading] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [error, setError] = useState('')
  const [currentStep, setCurrentStep] = useState(0)
  // 'pilih' (fasilitas + identitas) → 'nilai' (satu pertanyaan per layar)
  const [phase, setPhase] = useState('pilih')
  const wizardRef = useRef(null)
  const { logoUrl } = usePublicBrand()

  const scrollToWizard = () => wizardRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })

  useEffect(() => {
    async function loadQuestions() {
      try {
        const res = await fetch('/api/pertanyaan-kritik-saran?active=true')
        const data = await res.json()
        if (res.ok && data.grouped) setCustomQuestions(data.grouped)
      } catch (err) {
        console.error('Failed to load questions:', err)
      } finally {
        setQuestionsLoading(false)
      }
    }
    loadQuestions()
  }, [])

  const hasQuestions = (name) => {
    const qs = customQuestions[name]
    return qs && qs.length > 0
  }

  const addFacility = (name) => {
    const qs = customQuestions[name]
    if (!qs || qs.length === 0) {
      setError('Belum ada pertanyaan untuk fasilitas ini.')
      return
    }
    qs.filter(q => q.is_active).forEach(q => {
      if (!items.some(i => i.fasilitas === name && i.pertanyaan_id === q.id)) {
        setItems(prev => [...prev, {
          id: genId(), fasilitas: name, aspek: q.pertanyaan, rating: 0,
          penjelasan: '', jawaban_pilihan: '', pertanyaan_id: q.id,
          tipe: q.tipe || 'rating', opsi_pilihan: q.opsi_pilihan || null,
        }])
      }
    })
    setError('')
  }

  const removeFacility = (name) => {
    setItems(prev => prev.filter(i => i.fasilitas !== name))
    setError('')
  }

  const updateItem = (id, field, value) => {
    setItems(prev => prev.map(i => i.id === id ? { ...i, [field]: value } : i))
    setError('')
  }

  const parseCheckbox = (val) => {
    if (!val) return []
    if (Array.isArray(val)) return val
    try { return JSON.parse(val) } catch { return [] }
  }

  const isItemAnswered = (item) => {
    const tipe = item.tipe || 'rating'
    if (tipe === 'pilihan_ganda') return !!item.jawaban_pilihan?.trim()
    if (tipe === 'checkbox') return parseCheckbox(item.jawaban_pilihan).length > 0
    if (tipe === 'teks') return !!item.penjelasan.trim()
    return item.rating > 0 && !!item.penjelasan.trim()
  }

  const validateCurrentStep = () => {
    const item = items[currentStep]
    if (!item) return null
    if (!isItemAnswered(item)) {
      const tipe = item.tipe || 'rating'
      if (tipe === 'rating') {
        if (!item.rating) return `Rating untuk "${item.aspek}" wajib diisi`
        if (!item.penjelasan.trim()) return `Penjelasan untuk "${item.aspek}" wajib diisi`
      }
      return `Jawaban untuk "${item.aspek}" wajib diisi`
    }
    return null
  }

  const validate = () => {
    if (!profile.jenis_kelamin) return 'Jenis kelamin wajib dipilih'
    if (items.length === 0) return 'Pilih minimal 1 fasilitas untuk dinilai'
    for (const item of items) {
      if (!isItemAnswered(item)) return `Jawaban untuk "${item.aspek}" belum diisi`
    }
    return null
  }

  const goNext = () => {
    const err = validateCurrentStep()
    if (err) { setError(err); return }
    setError('')
    setCurrentStep(prev => Math.min(prev + 1, items.length - 1))
    scrollToWizard()
  }

  const goPrev = () => {
    setError('')
    if (currentStep === 0) { setPhase('pilih'); return }
    setCurrentStep(prev => Math.max(prev - 1, 0))
    scrollToWizard()
  }

  const startRating = () => {
    if (items.length === 0) { setError('Pilih minimal 1 fasilitas untuk dinilai'); return }
    if (!profile.jenis_kelamin) { setError('Jenis kelamin wajib dipilih'); return }
    setError('')
    setCurrentStep(0)
    setPhase('nilai')
    scrollToWizard()
  }

  const resetAll = () => {
    setSubmitted(false); setItems([]); setCurrentStep(0); setPhase('pilih')
    setProfile({ nama: '', email: '', telepon: '', unit_kerja: '', jenis_kelamin: '', is_anonim: false })
  }

  useEffect(() => {
    if (items.length === 0) setCurrentStep(0)
    else if (currentStep >= items.length) setCurrentStep(items.length - 1)
  }, [items.length])

  const handleSubmit = async (e) => {
    e.preventDefault()
    const err = validate()
    if (err) { setError(err); scrollToWizard(); return }
    setLoading(true)
    setError('')
    try {
      const res = await fetch('/api/kritik-saran', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...profile,
          items: items.map(({ fasilitas, aspek, rating, penjelasan, jawaban_pilihan, pertanyaan_id, tipe }) => ({
            fasilitas, aspek, rating, penjelasan, jawaban_pilihan, pertanyaan_id, tipe,
          })),
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Gagal mengirim')
      setSubmitted(true)
    } catch (err) {
      setError(err.message || 'Terjadi kesalahan. Silakan coba lagi.')
      scrollToWizard()
    } finally {
      setLoading(false)
    }
  }

  const grouped = {}
  items.forEach(item => {
    if (!grouped[item.fasilitas]) grouped[item.fasilitas] = []
    grouped[item.fasilitas].push(item)
  })
  const selectedNames = Object.keys(grouped)

  const shell = { title: 'Penilaian Fasilitas', subtitle: 'Unesa Science Center', logoUrl }
  const rated = items.filter(i => (i.tipe || 'rating') === 'rating' && i.rating > 0)
  const avg = rated.length ? (rated.reduce((s, i) => s + i.rating, 0) / rated.length).toFixed(1).replace('.', ',') : null
  const errorBox = error && (
    <div role="alert" style={{ padding: '12px 14px', borderRadius: 12, background: 'var(--danger-50)', color: 'var(--danger)', fontSize: 14, fontWeight: 600 }}>{error}</div>
  )

  if (submitted) {
    return (
      <PublicShell {...shell}>
        <div className="pub-success">
          {avg ? (
            <>
              <span style={{ fontFamily: 'var(--font-display)', fontSize: 64, fontWeight: 600, letterSpacing: '-.03em', lineHeight: 1, color: 'var(--primary)' }}>{avg}</span>
              <span className="eyebrow" style={{ fontSize: 12.5 }}>Rata-rata nilai Anda</span>
            </>
          ) : (
            <span className="pub-success-icon"><svg viewBox="0 0 24 24" width="36" height="36" fill="none" stroke="currentColor" strokeWidth="2.5" aria-hidden="true"><polyline points="20 6 9 17 4 12" /></svg></span>
          )}
          <h1 className="pub-h" style={{ fontSize: 28, marginTop: 8 }}>Terima kasih!</h1>
          <p className="pub-lede">Penilaian Anda untuk {selectedNames.length} fasilitas ({items.length} pertanyaan) membantu kami memperbaiki layanan.</p>
          <button type="button" className="pub-ghost" onClick={resetAll} style={{ minHeight: 50, marginTop: 8 }}>Nilai fasilitas lain</button>
          <a href="/kritik-saran" style={{ fontSize: 14.5, fontWeight: 600 }}>Punya kritik atau saran? →</a>
        </div>
      </PublicShell>
    )
  }

  // ---- FASE 2: satu pertanyaan per layar ----
  if (phase === 'nilai' && items.length > 0) {
    const item = items[currentStep]
    const isLast = currentStep === items.length - 1
    const pct = Math.round(((currentStep + 1) / items.length) * 100)
    return (
      <PublicShell {...shell}>
        <form onSubmit={isLast ? handleSubmit : (e) => { e.preventDefault(); goNext() }} noValidate className="pub-form" style={{ display: 'flex', flexDirection: 'column', flex: 1 }}>
          <div ref={wizardRef} style={{ display: 'flex', flexDirection: 'column', gap: 8, padding: '4px 20px 0' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, fontWeight: 600, color: 'var(--text-2)' }}>
              <span>Pertanyaan {currentStep + 1} dari {items.length}</span><span className="mono">{pct}%</span>
            </div>
            <div style={{ height: 6, borderRadius: 3, background: 'var(--border)', overflow: 'hidden' }}>
              <div style={{ height: '100%', width: `${pct}%`, background: 'var(--usc-yellow)', borderRadius: 3, transition: 'width .3s' }} />
            </div>
          </div>
          <div className="pub-body" style={{ gap: 22, paddingTop: 24 }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <span style={{ alignSelf: 'flex-start', fontSize: 12.5, fontWeight: 700, padding: '3px 10px', borderRadius: 99, background: 'var(--primary-50)', color: 'var(--primary)' }}>{item.fasilitas}</span>
              <h1 className="pub-h" style={{ fontSize: 27, lineHeight: 1.15 }}>{item.aspek}</h1>
            </div>
            <QuestionInput item={item} updateItem={updateItem} parseCheckbox={parseCheckbox} />
            {errorBox}
          </div>
          <div className="pub-dock">
            <button type="button" onClick={goPrev} className="pub-ghost" style={{ width: 110 }}>Kembali</button>
            <button type="submit" className="pub-cta" style={{ flex: 1 }} disabled={loading || !isItemAnswered(item)}>
              {isLast ? (loading ? 'Mengirim…' : 'Kirim penilaian') : 'Lanjut'}
            </button>
          </div>
        </form>
      </PublicShell>
    )
  }

  // ---- FASE 1: pilih fasilitas + identitas ----
  return (
    <PublicShell {...shell}>
      <div className="pub-form" style={{ display: 'flex', flexDirection: 'column', flex: 1 }} ref={wizardRef}>
        <div className="pub-body" style={{ paddingTop: 14 }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <h1 className="pub-h" style={{ fontSize: 28 }}>Bagaimana pengalaman Anda?</h1>
            <p className="pub-lede">Pilih fasilitas yang Anda gunakan hari ini. Boleh lebih dari satu.</p>
          </div>

          {questionsLoading ? (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
              {FACILITIES.map(f => <div key={f.id} style={{ minHeight: 96, borderRadius: 16, background: 'var(--surface-2)', animation: 'pulse 1.5s infinite' }} />)}
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }} role="group" aria-label="Fasilitas">
              {FACILITIES.map(f => {
                const on = selectedNames.includes(f.name)
                const hasCQ = hasQuestions(f.name)
                const qCount = customQuestions[f.name]?.filter(q => q.is_active).length || 0
                return (
                  <button key={f.id} type="button" disabled={!hasCQ} aria-pressed={on}
                    onClick={() => (on ? removeFacility(f.name) : addFacility(f.name))}
                    className={`pn-fas ${on ? 'active' : ''}`}>
                    <span className="pn-check" aria-hidden="true">
                      <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="3"><polyline points="20 6 9 17 4 12" /></svg>
                    </span>
                    <span style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                      <span style={{ fontSize: 15, fontWeight: 700, lineHeight: 1.25 }}>{f.name}</span>
                      <span style={{ fontSize: 12.5, color: 'var(--text-3)' }}>{hasCQ ? `${qCount} pertanyaan` : 'Belum tersedia'}</span>
                    </span>
                  </button>
                )
              })}
            </div>
          )}

          <div style={{ display: 'flex', flexDirection: 'column', gap: 12, padding: 16, borderRadius: 16, background: 'var(--surface)', border: '1px solid var(--border)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 2, flex: 1 }}>
                <span id="pn-id-lbl" style={{ fontSize: 15, fontWeight: 700 }}>Identitas penilai</span>
                <span style={{ fontSize: 13, color: 'var(--text-2)' }}>{profile.is_anonim ? 'Anonim — nama & kontak tidak disimpan' : 'Opsional · aktifkan untuk anonim'}</span>
              </div>
              <button type="button" role="switch" aria-checked={profile.is_anonim} aria-label="Kirim secara anonim" className="switch" style={{ width: 50, height: 30 }}
                onClick={() => setProfile(p => ({ ...p, is_anonim: !p.is_anonim }))} />
            </div>
            {!profile.is_anonim && (
              <>
                <input type="text" autoComplete="name" placeholder="Nama (opsional)" aria-label="Nama" value={profile.nama} onChange={e => setProfile(p => ({ ...p, nama: e.target.value }))} style={{ height: 48, background: 'var(--bg)' }} />
                <input type="tel" inputMode="tel" autoComplete="tel" placeholder="No. WhatsApp (opsional)" aria-label="Nomor WhatsApp" value={profile.telepon} onChange={e => setProfile(p => ({ ...p, telepon: e.target.value }))} style={{ height: 48, background: 'var(--bg)' }} />
              </>
            )}
            <input type="text" placeholder="Unit kerja / instansi (opsional)" aria-label="Unit kerja atau instansi" value={profile.unit_kerja} onChange={e => setProfile(p => ({ ...p, unit_kerja: e.target.value }))} style={{ height: 48, background: 'var(--bg)' }} />
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }} role="radiogroup" aria-label="Jenis kelamin (wajib)">
              {['Laki-laki', 'Perempuan'].map(jk => (
                <button key={jk} type="button" role="radio" aria-checked={profile.jenis_kelamin === jk}
                  onClick={() => { setProfile(p => ({ ...p, jenis_kelamin: jk })); setError('') }}
                  className={`chip ${profile.jenis_kelamin === jk ? 'active' : ''}`} style={{ borderRadius: 12, minHeight: 46, justifyContent: 'center' }}>
                  {jk}
                </button>
              ))}
            </div>
          </div>
          {errorBox}
          <p style={{ margin: 0, fontSize: 13, color: 'var(--text-3)', textAlign: 'center' }}>Penilaian bersifat rahasia dan hanya dilihat tim pimpinan USC.</p>
        </div>
        <div className="pub-dock">
          <button type="button" className="pub-cta" onClick={startRating} disabled={items.length === 0}>
            {items.length === 0 ? 'Pilih fasilitas dulu' : `Mulai menilai · ${items.length} pertanyaan`}
          </button>
        </div>
      </div>
    </PublicShell>
  )
}

function QuestionInput({ item, updateItem, parseCheckbox }) {
  const tipe = item.tipe || 'rating'

  if ((tipe === 'pilihan_ganda' || tipe === 'checkbox') && item.opsi_pilihan) {
    const multi = tipe === 'checkbox'
    const selected = multi ? parseCheckbox(item.jawaban_pilihan) : [item.jawaban_pilihan]
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }} role={multi ? 'group' : 'radiogroup'} aria-label="Pilihan jawaban">
        {multi && <span style={{ fontSize: 13, color: 'var(--text-3)' }}>Boleh pilih lebih dari satu.</span>}
        {item.opsi_pilihan.map((opsi, idx) => {
          const on = selected.includes(opsi)
          return (
            <button key={idx} type="button" role={multi ? 'checkbox' : 'radio'} aria-checked={on}
              className={`pub-card-option ${on ? 'active' : ''}`} style={{ minHeight: 56 }}
              onClick={() => {
                if (!multi) return updateItem(item.id, 'jawaban_pilihan', opsi)
                const cur = parseCheckbox(item.jawaban_pilihan)
                updateItem(item.id, 'jawaban_pilihan', JSON.stringify(on ? cur.filter(v => v !== opsi) : [...cur, opsi]))
              }}>
              <span className="mono" style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-3)', width: 18 }}>{String.fromCharCode(65 + idx)}</span>
              <span style={{ flex: 1, fontSize: 15, fontWeight: on ? 700 : 500 }}>{opsi}</span>
              <span className="pub-radio" style={multi ? { borderRadius: 6 } : undefined} />
            </button>
          )
        })}
      </div>
    )
  }

  if (tipe === 'teks') {
    return (
      <div>
        <label htmlFor={`q-${item.id}`}>Jawaban Anda <span className="pub-req">*</span></label>
        <textarea id={`q-${item.id}`} value={item.penjelasan}
          onChange={e => updateItem(item.id, 'penjelasan', e.target.value)}
          placeholder="Tuliskan jawaban Anda…" rows={5} style={{ resize: 'none' }} />
      </div>
    )
  }

  // Default: rating 1–5 + alasan
  return (
    <>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 8 }} role="radiogroup" aria-label="Nilai 1 sampai 5">
          {[1, 2, 3, 4, 5].map(n => {
            const on = item.rating === n
            return (
              <button key={n} type="button" role="radio" aria-checked={on} aria-label={`${n} — ${RATING_LABELS[n]}`}
                onClick={() => updateItem(item.id, 'rating', n)} className={`pn-rate ${on ? 'active' : ''}`}>
                {n}
              </button>
            )
          })}
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', fontSize: 12.5, color: 'var(--text-3)' }}>
          <span>Buruk</span>
          <span style={{ fontWeight: 700, color: 'var(--primary)', fontSize: 14 }}>{item.rating ? RATING_LABELS[item.rating] : 'Pilih nilai'}</span>
          <span>Sangat baik</span>
        </div>
      </div>
      <div>
        <label htmlFor={`q-${item.id}`}>Alasan penilaian <span className="pub-req">*</span></label>
        <textarea id={`q-${item.id}`} value={item.penjelasan}
          onChange={e => updateItem(item.id, 'penjelasan', e.target.value)}
          placeholder="Apa yang membuat Anda memberi nilai ini?" rows={4} style={{ resize: 'none' }} />
      </div>
    </>
  )
}
