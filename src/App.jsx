import { useEffect, useMemo, useRef, useState } from 'react'
import useParallax from './hooks/useParallax'
import { numberOr, calcGWA } from './utils/numbers'
import { SCHOOLS } from './constants'
import { runRapid, runTesseract, parseOCRData, refineGradesByROI } from './lib/ocr'
import { generatePDF } from './lib/pdf'
import Header from './components/Header'
import CourseRow from './components/CourseRow'
import { OcrWarningModal, SampleGuideModal } from './components/Modals'
import Hero from './components/Hero'

// CourseRow moved to ./components/CourseRow

export default function App() {
  const [rows, setRows] = useState([{ id: crypto.randomUUID(), units: '', grade: '' }])
  const [name, setName] = useState('')
  const [school, setSchool] = useState(() => localStorage.getItem('gwa.school') || '')
  const offset = useParallax(0.35)
  const totalUnits = useMemo(() => rows.reduce((a, r) => a + numberOr(r.units, 0), 0), [rows])
  const gwa = useMemo(() => calcGWA(rows), [rows])
  const [ocrStatus, setOcrStatus] = useState('')
  const [ocrProgress, setOcrProgress] = useState(0)
  const fileInputRef = useRef(null)
  const [showOcrWarn, setShowOcrWarn] = useState(false)
  const [showSample, setShowSample] = useState(false)
  // New: OCR engine selection (rapid = RapidOCR/PP-OCR via ONNX, tesseract = current)
  const [ocrEngine, setOcrEngine] = useState('rapid') // 'rapid' | 'tesseract'
  const isDownloadDisabled = rows.length === 0 || gwa === 0

  const addRow = () => setRows((r) => [...r, { id: crypto.randomUUID(), units: '', grade: '' }])
  const updateRow = (id, next) => setRows((r) => r.map((x) => (x.id === id ? next : x)))
  const removeRow = (id) => setRows((r) => (r.length <= 1 ? r : r.filter((x) => x.id !== id)))
  const reset = () => setRows([{ id: crypto.randomUUID(), units: '', grade: '' }])

  // Theme switching via data-theme on <html>
  useEffect(() => {
    const root = document.documentElement
    if (!school) root.removeAttribute('data-theme')
    else root.setAttribute('data-theme', school)
  }, [school])

  // Only persist school to localStorage
  useEffect(() => {
    try { localStorage.setItem('gwa.school', school) } catch {}
  }, [school])

  // OCR helpers moved to ./lib/ocr

  async function handleFile(file) {
    try {
      const data = (ocrEngine === 'rapid'
        ? (await runRapid(file, setOcrStatus, setOcrProgress).catch(() => null) || await runTesseract(file, setOcrStatus, setOcrProgress))
        : await runTesseract(file, setOcrStatus, setOcrProgress))
      setOcrStatus('Parsing...')
      const parsed = parseOCRData(data)
      let finalRows = parsed.results
      if (ocrEngine === 'tesseract') {
        finalRows = await refineGradesByROI(data, parsed)
      }
      if (finalRows.length) {
        setRows(finalRows.map(r => ({ id: crypto.randomUUID(), ...r })))
      }
      setOcrStatus('Done')
      setTimeout(() => setOcrStatus(''), 1200)
      const el = document.getElementById('calc')
      if (el) el.scrollIntoView({ behavior: 'smooth' })
    } catch (e) {
      setOcrStatus('Failed to read image')
      setTimeout(() => setOcrStatus(''), 2000)
    } finally {
      setOcrProgress(0)
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
  }

  const onUploadClick = () => {
    setShowOcrWarn(true)
  }
  const proceedUpload = () => {
    setShowOcrWarn(false)
    fileInputRef.current?.click()
  }
  const onFileChange = (e) => {
    const file = e.target.files?.[0]
    if (file) handleFile(file)
  }

  // Cloud OCR has been removed per requirements

  // PDF download using generator in ./lib/pdf
  async function handleDownloadPDF() {
    await generatePDF({ rows, name, school, totalUnits, gwa })
  }

  const badgeColor = gwa === 0 ? 'bg-slate-700/50' : gwa <= 1.75 ? 'bg-emerald-500/20 text-emerald-200' : gwa <= 2.5 ? 'bg-amber-500/20 text-amber-200' : 'bg-rose-500/20 text-rose-200'

  return (
    <div className="relative min-h-screen">
      {/* Animated gradient backdrop */}
      <div aria-hidden className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
        <div
          className="absolute -left-1/3 -top-1/3 h-[120vmax] w-[120vmax] rounded-full blur-3xl anim-bgpulse"
          style={{
            background: 'conic-gradient(from 180deg at 50% 50%, color-mix(in oklab, var(--c1) 35%, transparent), color-mix(in oklab, var(--c2) 25%, transparent), color-mix(in oklab, var(--c3) 35%, transparent))',
            transform: `translateY(${offset * -0.4}px)`
          }}
        />
        <div
          className="absolute left-1/4 top-1/2 h-72 w-72 rounded-full blur-2xl anim-float1"
          style={{ background: 'color-mix(in oklab, var(--c1) 25%, transparent)', transform: `translateY(${offset * -0.2}px)` }}
        />
        <div
          className="absolute right-1/4 top-1/4 h-80 w-80 rounded-full blur-2xl anim-float2"
          style={{ background: 'color-mix(in oklab, var(--c2) 25%, transparent)', transform: `translateY(${offset * -0.1}px)` }}
        />
        <div className="absolute inset-x-0 top-0 h-40" style={{ background: 'linear-gradient(to bottom, rgba(0,0,0,.9), rgba(0,0,0,.6), transparent)' }} />
      </div>

  {/* Header */}
  <Header school={school} />

      {/* Hero with parallax title */}
      <Hero
        offset={offset}
        ocrStatus={ocrStatus}
        ocrProgress={ocrProgress}
        onUploadClick={onUploadClick}
        fileInputRef={fileInputRef}
        onFileChange={onFileChange}
        onShowSample={() => setShowSample(true)}
      >
        <table className="w-full text-sm">
          <thead className="text-slate-400">
            <tr>
              <th className="text-left font-medium py-1">Units</th>
              <th className="text-left font-medium py-1">Grade</th>
            </tr>
          </thead>
          <tbody className="text-slate-200/90">
            {rows.length === 0 && (
              <tr><td colSpan="2" className="py-2 text-slate-400">No rows yet</td></tr>
            )}
            {rows.map((r) => (
              <tr key={r.id} className="border-t border-slate-800/60">
                <td className="py-2">{r.units !== '' ? numberOr(r.units, 0) : '—'}</td>
                <td className="py-2">{r.grade || '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <div className="mt-3 flex items-center justify-between text-sm">
          <span className="text-slate-300/80">Total Units: {totalUnits}</span>
          <span className="font-semibold" style={{ color: 'var(--c1)' }}>GWA: {gwa.toFixed(2)}</span>
        </div>
      </Hero>

      {/* Calculator */}
      <section id="calc" className="relative py-10 sm:py-16">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <div className="rounded-2xl border border-slate-800/70 bg-slate-900/50 backdrop-blur-sm shadow-2xl">
            <div className="p-4 sm:p-6 md:p-8">
              <div className="grid md:grid-cols-3 gap-4 md:gap-6">
                <input
                  type="text"
                  placeholder="Your name (optional)"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="rounded-md bg-slate-900/60 border border-slate-800/80 px-3 py-2 text-slate-100 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[var(--c1)]/60"
                />
                <select
                  value={school}
                  onChange={(e) => setSchool(e.target.value)}
                  className="rounded-md bg-slate-900/60 border border-slate-800/80 px-3 py-2 text-slate-100 focus:outline-none focus:ring-2 focus:ring-[var(--c1)]/60 md:col-span-2"
                >
                  {SCHOOLS.map(s => (
                    <option key={s.id} value={s.id}>{s.label}</option>
                  ))}
                </select>

                {/* OCR Engine selector */}
                <div className="md:col-span-3 grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className="sm:col-span-1">
                    <label className="block text-xs text-slate-400 mb-1">OCR Engine</label>
                    <select
                      value={ocrEngine}
                      onChange={(e) => setOcrEngine(e.target.value)}
                      className="w-full rounded-md bg-slate-900/60 border border-slate-800/80 px-3 py-2 text-slate-100 focus:outline-none focus:ring-2 focus:ring-[var(--c1)]/60"
                    >
                      <option value="rapid">RapidOCR (Recommended)</option>
                      <option value="tesseract">Tesseract</option>
                    </select>
                  </div>
                  <div className="sm:col-span-2 flex items-end gap-3">
                    <button onClick={onUploadClick} className="inline-flex items-center gap-2 rounded-lg border border-slate-700 bg-slate-900/60 hover:bg-slate-900/40 text-slate-100 px-4 py-2 focus-ring clickable">
                      Upload picture
                    </button>
                  </div>
                </div>
              </div>

              <div className="mt-6 space-y-4">
                {rows.map((row) => (
                  <div key={row.id} className="rounded-xl border border-slate-800/60 bg-slate-950/40 p-3 sm:p-4 hover:border-indigo-700/50 transition">
                    <CourseRow
                      row={row}
                      onChange={(next) => updateRow(row.id, next)}
                      onRemove={() => removeRow(row.id)}
                    />
                  </div>
                ))}
              </div>  

              <div className="mt-4 flex flex-wrap gap-3 items-center">
                <button onClick={addRow} className="inline-flex items-center gap-2 rounded-lg btn-primary transition px-4 py-2 focus-ring clickable">
                  Add subject
                </button>
                <button onClick={reset} className="inline-flex items-center gap-2 rounded-lg border border-slate-700 bg-slate-900/60 hover:bg-slate-900/40 text-slate-100 px-4 py-2 focus-ring clickable">
                  Reset
                </button>
                <button
                  onClick={handleDownloadPDF}
                  disabled={isDownloadDisabled}
                  className={`inline-flex items-center gap-2 rounded-lg border px-4 py-2 ${isDownloadDisabled ? 'border-slate-800 bg-slate-900/40 text-slate-500 cursor-not-allowed' : 'border-slate-700 bg-slate-900/60 hover:bg-slate-900/40 text-slate-100'}`}
                  title={isDownloadDisabled ? 'Enter units and grades to enable PDF' : 'Download PDF'}
                >
                  Download PDF
                </button>
                {ocrStatus && (
                  <span className="text-xs text-slate-300/80">
                    {ocrStatus} {ocrProgress ? `· ${ocrProgress}%` : ''}
                  </span>
                )}
              </div>

              <div className="mt-8 grid md:grid-cols-3 gap-4 md:gap-6">
                <div className="rounded-xl border border-slate-800/60 bg-slate-950/40 p-4">
                  <p className="text-slate-300/80 text-sm">Total Units</p>
                  <p className="text-3xl font-bold mt-1">{totalUnits}</p>
                </div>
        <div className={`rounded-xl border border-slate-800/60 p-4 ${badgeColor}`}>
                  <p className="text-slate-100/80 text-sm">GWA</p>
                  <p className="text-3xl font-extrabold mt-1">{gwa.toFixed(2)}</p>
                </div>
                <div className="rounded-xl border border-slate-800/60 bg-slate-950/40 p-4">
                  <p className="text-slate-300/80 text-sm">Summary</p>
                  <p className="mt-1 text-slate-200/90 text-sm">
          {name ? `${name} · ` : ''}{(SCHOOLS.find(s=>s.id===school)?.label) || '—'}
                  </p>
                </div>
              </div>

            </div>
          </div>
        </div>
      </section>

  {/* OCR warning modal */}
  <OcrWarningModal open={showOcrWarn} onCancel={() => setShowOcrWarn(false)} onContinue={proceedUpload} />

  {/* Sample guide modal */}
  <SampleGuideModal open={showSample} onClose={() => setShowSample(false)} />

      {/* Footer */}
      <footer className="py-10 text-center text-slate-500">
        <p className="text-xs">made by John Dayrill P. Flores. No data leaves your browser.</p>
      </footer>
    </div>
  )
}
