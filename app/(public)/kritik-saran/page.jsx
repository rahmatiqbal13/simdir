'use client'

import { useState } from 'react'
import PublicShell, { usePublicBrand } from '@/app/components/PublicShell'

const FASILITAS_LIST = [
  'Achilles Gym Hub', 'Kolam Renang Unesa', 'Driving Golf Unesa',
  'SSFC', 'PUIPT DIC', 'PUIPT SERC',
  'ULABK', 'USC (Umum)', 'Lainnya',
]

const JENIS_LIST = [
  {
    value: 'kritik', label: 'Kritik',
    desc: 'Sampaikan keluhan atau masalah yang Anda alami',
    icon: 'M10.3 3.9L1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0zM12 9v4M12 17h.01',
  },
  {
    value: 'saran', label: 'Saran',
    desc: 'Berikan ide atau masukan untuk perbaikan layanan',
    icon: 'M9 18h6M10 22h4M12 2a7 7 0 0 0-4 12.7V17h8v-2.3A7 7 0 0 0 12 2z',
  },
  {
    value: 'permohonan_kelas', label: 'Permohonan Kelas',
    desc: 'Ajukan permintaan kelas atau pelatihan baru',
    icon: 'M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2zM22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z',
  },
  {
    value: 'permohonan_kegiatan', label: 'Permohonan Kegiatan',
    desc: 'Usulkan event atau kegiatan yang ingin diadakan',
    icon: 'M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1zM4 22v-7',
  },
]

const UNIT_KERJA_LIST = [
  'USC (Umum)', 'Achilles Gym Hub', 'Kolam Renang Unesa', 'Driving Golf Unesa',
  'SSFC', 'PUIPT DIC', 'PUIPT SERC',
  'ULABK', 'Eksternal',
]

const STEPS = ['Jenis', 'Detail', 'Identitas']

export default function KritikSaranPage() {
  const [step, setStep] = useState(0)
  const [done, setDone] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const { logoUrl } = usePublicBrand()

  const [form, setForm] = useState({
    jenis: '', fasilitas: '', judul: '', isi: '',
    nama_kelas_kegiatan: '', tanggal_diinginkan: '', estimasi_peserta: '', catatan: '',
    nama: '', email: '', telepon: '', unit_kerja: '', jenis_kelamin: '', is_anonim: false,
  })

  const set = (k, v) => { setForm(f => ({ ...f, [k]: v })); setError('') }
  const selected = JENIS_LIST.find(j => j.value === form.jenis)
  const isPermohonan = form.jenis === 'permohonan_kelas' || form.jenis === 'permohonan_kegiatan'

  const validate = () => {
    if (step === 0 && !form.jenis) return 'Pilih jenis terlebih dahulu'
    if (step === 1) {
      if (!form.fasilitas) return 'Pilih fasilitas atau layanan terkait'
      if (isPermohonan) {
        if (!form.nama_kelas_kegiatan.trim()) return 'Nama kelas/kegiatan wajib diisi'
        if (!form.tanggal_diinginkan) return 'Tanggal yang diinginkan wajib diisi'
      } else {
        if (!form.judul.trim()) return 'Judul wajib diisi'
        const len = form.isi.trim().length
        if (len < 20) return 'Isi pesan minimal 20 karakter'
        if (len > 2000) return 'Isi pesan maksimal 2000 karakter'
      }
    }
    if (step === 2) {
      if (!form.jenis_kelamin) return 'Jenis kelamin wajib dipilih'
      if (!form.is_anonim && !form.nama.trim()) return 'Nama wajib diisi (atau centang Anonim)'
    }
    return ''
  }

  const next = () => {
    const err = validate()
    if (err) { setError(err); return }
    setStep(s => s + 1)
  }

  const back = () => { setError(''); setStep(s => s - 1) }

  const resetForm = () => ({
    jenis: '', fasilitas: '', judul: '', isi: '',
    nama_kelas_kegiatan: '', tanggal_diinginkan: '', estimasi_peserta: '', catatan: '',
    nama: '', email: '', telepon: '', unit_kerja: '', jenis_kelamin: '', is_anonim: false,
  })

  const handleSubmit = async (e) => {
    e.preventDefault()
    const err = validate()
    if (err) { setError(err); return }
    setLoading(true)
    setError('')
    try {
      const res = await fetch('/api/saran', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Gagal mengirim')
      setDone(true)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const shell = { title: 'Kritik & Saran', subtitle: 'Unesa Science Center', logoUrl }
  const restart = () => { setDone(false); setStep(0); setForm(resetForm()) }

  if (done) {
    return (
      <PublicShell {...shell}>
        <div className="pub-success">
          <span className="pub-success-icon"><svg viewBox="0 0 24 24" width="36" height="36" fill="none" stroke="currentColor" strokeWidth="2.5" aria-hidden="true"><polyline points="20 6 9 17 4 12" /></svg></span>
          <h1 className="pub-h" style={{ fontSize: 28 }}>{isPermohonan ? 'Permohonan terkirim' : 'Masukan terkirim'}</h1>
          <p className="pub-lede">
            {isPermohonan
              ? 'Terima kasih. Tim kami akan meninjau permohonan Anda dan menghubungi Anda secepatnya.'
              : 'Terima kasih. Tim kami meninjau setiap masukan yang membantu kami berkembang.'}
          </p>
          <button type="button" className="pub-ghost" onClick={restart} style={{ minHeight: 50, marginTop: 8 }}>Kirim masukan lain</button>
          <a href="/penilaian" style={{ fontSize: 14.5, fontWeight: 600 }}>Nilai fasilitas USC →</a>
        </div>
      </PublicShell>
    )
  }

  const errorBox = error && (
    <div role="alert" style={{ padding: '12px 14px', borderRadius: 12, background: 'var(--danger-50)', color: 'var(--danger)', fontSize: 14, fontWeight: 600 }}>{error}</div>
  )
  const isiLen = form.isi.length

  return (
    <PublicShell {...shell}>
      <div className="pub-steps" style={{ display: 'flex', gap: 6 }} aria-label={`Langkah ${step + 1} dari ${STEPS.length}`}>
        {STEPS.map((label, i) => (
          <div key={label} className={`pub-step ${i < step ? 'done' : i === step ? 'active' : ''}`} aria-current={i === step ? 'step' : undefined}>
            {i + 1} · {label}
          </div>
        ))}
      </div>

      <form onSubmit={step === 2 ? handleSubmit : (e) => { e.preventDefault(); next() }} noValidate className="pub-form" style={{ display: 'flex', flexDirection: 'column', flex: 1 }}>
        <div className="pub-body" style={{ gap: 18 }}>
          {/* ---- STEP 0: Jenis ---- */}
          {step === 0 && (
            <>
              <h1 className="pub-h" style={{ fontSize: 26, lineHeight: 1.15 }}>Apa yang ingin Anda sampaikan?</h1>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }} role="radiogroup" aria-label="Jenis masukan">
                {JENIS_LIST.map(j => {
                  const on = form.jenis === j.value
                  return (
                    <button key={j.value} type="button" role="radio" aria-checked={on} onClick={() => set('jenis', j.value)} className={`pub-card-option ${on ? 'active' : ''}`}>
                      <span className="pub-icon-tile">
                        <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d={j.icon} /></svg>
                      </span>
                      <span style={{ display: 'flex', flexDirection: 'column', gap: 3, flex: 1 }}>
                        <span style={{ fontSize: 16, fontWeight: 700 }}>{j.label}</span>
                        <span style={{ fontSize: 13.5, color: 'var(--text-2)', lineHeight: 1.35 }}>{j.desc}</span>
                      </span>
                      <span className="pub-radio" />
                    </button>
                  )
                })}
              </div>
            </>
          )}

          {/* ---- STEP 1: Detail ---- */}
          {step === 1 && (
            <>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                <span style={{ alignSelf: 'flex-start', fontSize: 12.5, fontWeight: 700, padding: '3px 10px', borderRadius: 99, background: 'var(--primary-50)', color: 'var(--primary)' }}>{selected?.label}</span>
                <h1 className="pub-h" style={{ fontSize: 26 }}>{isPermohonan ? 'Detail permohonan' : 'Detail pesan'}</h1>
              </div>
              <div>
                <label htmlFor="ks-fas">Fasilitas / layanan terkait <span className="pub-req">*</span></label>
                <select id="ks-fas" value={form.fasilitas} onChange={e => set('fasilitas', e.target.value)}>
                  <option value="">Pilih fasilitas…</option>
                  {FASILITAS_LIST.map(f => <option key={f} value={f}>{f}</option>)}
                </select>
              </div>

              {isPermohonan ? (
                <>
                  <div>
                    <label htmlFor="ks-nama-kk">Nama {form.jenis === 'permohonan_kelas' ? 'kelas' : 'kegiatan'} yang diinginkan <span className="pub-req">*</span></label>
                    <input id="ks-nama-kk" type="text" value={form.nama_kelas_kegiatan} onChange={e => set('nama_kelas_kegiatan', e.target.value)} maxLength={200}
                      placeholder={form.jenis === 'permohonan_kelas' ? 'Contoh: Kelas Yoga Pagi, Renang Lanjut…' : 'Contoh: Turnamen Futsal, Workshop Fitness…'} />
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0,1fr) 120px', gap: 10 }}>
                    <div style={{ minWidth: 0 }}>
                      <label htmlFor="ks-tgl">Tanggal diinginkan <span className="pub-req">*</span></label>
                      <input id="ks-tgl" type="date" value={form.tanggal_diinginkan} onChange={e => set('tanggal_diinginkan', e.target.value)} min={new Date().toISOString().split('T')[0]} />
                    </div>
                    <div>
                      <label htmlFor="ks-peserta">Peserta</label>
                      <input id="ks-peserta" type="number" inputMode="numeric" value={form.estimasi_peserta} onChange={e => set('estimasi_peserta', e.target.value)} placeholder="20" min={1} max={9999} />
                    </div>
                  </div>
                  <div>
                    <label htmlFor="ks-catatan" style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span>Keterangan</span><span className="mono" style={{ fontWeight: 400, fontSize: 12, color: 'var(--text-3)' }}>{form.catatan.length} / 1000</span>
                    </label>
                    <textarea id="ks-catatan" value={form.catatan} onChange={e => set('catatan', e.target.value)} rows={4} maxLength={1000} style={{ resize: 'none' }}
                      placeholder="Tujuan, jadwal reguler, atau hal lain yang perlu kami ketahui…" />
                  </div>
                </>
              ) : (
                <>
                  <div>
                    <label htmlFor="ks-judul">Judul <span className="pub-req">*</span></label>
                    <input id="ks-judul" type="text" value={form.judul} onChange={e => set('judul', e.target.value)} maxLength={150}
                      placeholder={form.jenis === 'kritik' ? 'Ringkasan masalah yang Anda alami' : 'Ringkasan saran Anda'} />
                  </div>
                  <div>
                    <label htmlFor="ks-isi" style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span>Isi pesan <span className="pub-req">*</span></span>
                      <span className="mono" style={{ fontWeight: 400, fontSize: 12, color: isiLen > 0 && isiLen < 20 ? 'var(--danger)' : 'var(--text-3)' }}>
                        {isiLen} / 2000{isiLen > 0 && isiLen < 20 ? ' · min. 20' : ''}
                      </span>
                    </label>
                    <textarea id="ks-isi" value={form.isi} onChange={e => set('isi', e.target.value)} rows={6} maxLength={2000} style={{ resize: 'none' }}
                      placeholder="Ceritakan apa yang terjadi, kapan, dan di mana…" />
                  </div>
                </>
              )}
            </>
          )}

          {/* ---- STEP 2: Identitas ---- */}
          {step === 2 && (
            <>
              <h1 className="pub-h" style={{ fontSize: 26 }}>Identitas pengirim</h1>
              <div style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '14px 16px', borderRadius: 14, background: 'var(--surface)', border: '1px solid var(--border)' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 3, flex: 1 }}>
                  <span id="ks-anon-lbl" style={{ fontSize: 15, fontWeight: 700 }}>Kirim sebagai anonim</span>
                  <span style={{ fontSize: 13, color: 'var(--text-2)' }}>Nama &amp; kontak tidak disimpan.</span>
                </div>
                <button type="button" role="switch" aria-checked={form.is_anonim} aria-labelledby="ks-anon-lbl" className="switch" onClick={() => set('is_anonim', !form.is_anonim)} style={{ width: 50, height: 30 }} />
              </div>
              <fieldset className="pub-fieldset">
                <legend>Jenis kelamin <span className="pub-req">*</span></legend>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }} role="radiogroup" aria-label="Jenis kelamin">
                  {['Laki-laki', 'Perempuan'].map(jk => (
                    <button key={jk} type="button" role="radio" aria-checked={form.jenis_kelamin === jk} onClick={() => set('jenis_kelamin', jk)}
                      className={`chip ${form.jenis_kelamin === jk ? 'active' : ''}`} style={{ borderRadius: 12, minHeight: 50, justifyContent: 'center', fontSize: 15 }}>
                      {jk}
                    </button>
                  ))}
                </div>
              </fieldset>
              {!form.is_anonim && (
                <>
                  <div>
                    <label htmlFor="ks-nama">Nama lengkap <span className="pub-req">*</span></label>
                    <input id="ks-nama" type="text" autoComplete="name" value={form.nama} onChange={e => set('nama', e.target.value)} placeholder="Nama Anda" maxLength={100} />
                  </div>
                  <div>
                    <label htmlFor="ks-tel">No. WhatsApp</label>
                    <input id="ks-tel" type="tel" inputMode="tel" autoComplete="tel" value={form.telepon} onChange={e => set('telepon', e.target.value)} placeholder="08xxxxxxxxxx" maxLength={20} />
                  </div>
                  <div>
                    <label htmlFor="ks-email">Email</label>
                    <input id="ks-email" type="email" autoComplete="email" value={form.email} onChange={e => set('email', e.target.value)} placeholder="email@contoh.com" />
                  </div>
                </>
              )}
              <div>
                <label htmlFor="ks-unit">Asal unit / instansi</label>
                <select id="ks-unit" value={form.unit_kerja} onChange={e => set('unit_kerja', e.target.value)}>
                  <option value="">Pilih unit (opsional)</option>
                  {UNIT_KERJA_LIST.map(u => <option key={u} value={u}>{u}</option>)}
                </select>
              </div>
            </>
          )}

          {errorBox}
        </div>

        <div className="pub-dock">
          {step > 0 && <button type="button" onClick={back} className="pub-ghost" style={{ width: 110 }}>Kembali</button>}
          <button type="submit" className="pub-cta" style={{ flex: 1 }} disabled={loading}>
            {step < 2 ? 'Lanjut' : loading ? 'Mengirim…' : `Kirim ${selected?.label?.toLowerCase() || 'pesan'}`}
          </button>
        </div>
      </form>
    </PublicShell>
  )
}
