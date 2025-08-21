import { useEffect, useMemo, useRef, useState } from 'react'

// Grading options (informational)
const GRADE_OPTIONS = [1.0, 1.25, 1.5, 1.75, 2.0, 2.25, 2.5, 2.75, 3.0, 5.0, 0.0]
const SCHOOLS = [
  { id: '', label: 'Other (Default)' },
  { id: 'psu', label: 'Pampanga State University' },
  { id: 'hau', label: 'Holy Angel University' },
]

function useParallax(multiplier = 0.3) {
  const [offset, setOffset] = useState(0)
  useEffect(() => {
    const onScroll = () => setOffset(window.scrollY * multiplier)
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [multiplier])
  return offset
}

function numberOr(value, fallback) {
  const n = Number(value)
  return Number.isFinite(n) ? n : fallback
}

function calcGWA(rows) {
  let sum = 0
  let units = 0
  for (const r of rows) {
    const u = numberOr(r.units, 0)
    const g = numberOr(r.grade, NaN)
    if (u > 0 && Number.isFinite(g)) {
      sum += g * u
      units += u
    }
  }
  return units > 0 ? sum / units : 0
}

function CourseRow({ row, onChange, onRemove }) {
  return (
    <div className="grid grid-cols-12 gap-2 sm:gap-3 items-center">
      <input
        type="number"
        step="0.25"
        min="0"
        placeholder="Units"
        value={row.units}
        onChange={(e) => onChange({ ...row, units: e.target.value })}
  className="col-span-6 sm:col-span-6 rounded-md bg-slate-900/60 border border-slate-800/80 px-3 py-2 text-slate-100 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[var(--c1)]/60"
      />
      <input
        type="number"
        step="0.01"
        min="0"
        max="5"
        placeholder="Grade (0.00 - 5.00)"
        value={row.grade}
        onChange={(e) => onChange({ ...row, grade: e.target.value })}
        className="col-span-5 sm:col-span-5 rounded-md bg-slate-900/60 border border-slate-800/80 px-3 py-2 text-slate-100 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[var(--c1)]/60"
      />
      <button
        type="button"
        onClick={onRemove}
        className="col-span-1 inline-flex justify-center items-center h-10 w-10 rounded-md bg-rose-500/20 text-rose-200 hover:bg-rose-500/30 transition"
        aria-label="Remove row"
      >
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
          <path fillRule="evenodd" d="M16.5 4.478v.773a48.816 48.816 0 0 1 3.878.512.75.75 0 1 1-.256 1.478l-.209-.036-1.005 12.06A3.75 3.75 0 0 1 15.173 23H8.827a3.75 3.75 0 0 1-3.735-3.735L4.087 7.205l-.209.036a.75.75 0 0 1-.256-1.478 48.709 48.709 0 0 1 3.878-.512v-.773A2.25 2.25 0 0 1 9.75 2.25h4.5a2.25 2.25 0 0 1 2.25 2.228ZM9.75 3.75a.75.75 0 0 0-.75.75v.648a49.488 49.488 0 0 1 6 0V4.5a.75.75 0 0 0-.75-.75h-4.5Zm-.43 5.47a.75.75 0 0 1 1.06 0L12 10.94l1.62-1.72a.75.75 0 1 1 1.08 1.04L13.06 12l1.62 1.62a.75.75 0 1 1-1.06 1.06L12 13.06l-1.62 1.62a.75.75 0 0 1-1.06-1.06L10.94 12 9.32 10.38a.75.75 0 0 1 0-1.06Z" clipRule="evenodd" />
        </svg>
      </button>
    </div>
  )
}

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

  // OCR helpers
  // RapidOCR (client-side-ocr) wrapper
  let rapidEnginePromise = null
  async function getRapidEngine() {
    if (!rapidEnginePromise) {
      rapidEnginePromise = (async () => {
        try {
          const url = 'https://unpkg.com/client-side-ocr@2.1.0/dist/index.mjs'
          const mod = await import(/* @vite-ignore */ url)
          const engine = mod.createOCREngine({ language: 'en', modelVersion: 'PP-OCRv4', modelType: 'mobile' })
          await engine.initialize()
          return engine
        } catch (e) {
          console.error('RapidOCR import failed, falling back to Tesseract', e)
          return null
        }
      })()
    }
    return rapidEnginePromise
  }

  async function preprocessImage(file) {
    return new Promise((resolve, reject) => {
      const img = new Image()
      img.onload = () => {
        const maxDim = 2000
        const scale = Math.min(maxDim / img.width, maxDim / img.height, 1)
        const w = Math.round(img.width * scale)
        const h = Math.round(img.height * scale)
        const canvas = document.createElement('canvas')
        canvas.width = w
        canvas.height = h
        const ctx = canvas.getContext('2d', { willReadFrequently: true })
        ctx.drawImage(img, 0, 0, w, h)
        const imgData = ctx.getImageData(0, 0, w, h)
        const d = imgData.data
        // grayscale + contrast boost
        const contrast = 1.25 // 1.0 no change
        const brightness = 5
        for (let i = 0; i < d.length; i += 4) {
          const r = d[i], g = d[i + 1], b = d[i + 2]
          let y = 0.2126 * r + 0.7152 * g + 0.0722 * b
          y = (y - 128) * contrast + 128 + brightness
          y = Math.max(0, Math.min(255, y))
          d[i] = d[i + 1] = d[i + 2] = y
        }
        ctx.putImageData(imgData, 0, 0)
        resolve(canvas)
      }
      img.onerror = reject
      img.src = URL.createObjectURL(file)
    })
  }

  async function runOCR(file) {
    const { default: Tesseract } = await import('tesseract.js')
    setOcrStatus('Initializing...')
    setOcrProgress(0)
    const input = await preprocessImage(file)
    const { data } = await Tesseract.recognize(input, 'eng', {
      logger: (m) => {
        if (m.status) setOcrStatus(m.status)
        if (typeof m.progress === 'number') setOcrProgress(Math.round(m.progress * 100))
      },
      // Hints for better OCR on grade sheets
      user_defined_dpi: '300',
      tessedit_pageseg_mode: '6', // Assume a single uniform block of text
      preserve_interword_spaces: '1',
      tessedit_char_whitelist: '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz.,:-()/% ' ,
    })
  return { data, input }
  }

  // Run OCR using RapidOCR (client-side-ocr)
  async function runRapidOCR(file) {
    setOcrStatus('Initializing models...')
    setOcrProgress(5)
    const engine = await getRapidEngine()
    setOcrStatus('Preprocessing...')
    // The library accepts File/Blob directly
    const t0 = performance.now()
    const result = await engine.processImage(file, {
      enableWordSegmentation: true,
      returnConfidence: true,
      enableTextClassification: true,
    })
    const dt = Math.round(performance.now() - t0)
    setOcrProgress(100)
    // Map to a tesseract-like structure we already parse
    const words = (result.wordBoxes || []).map(w => ({
      text: w.text || w.word || '',
      bbox: { x0: w.box?.[0] ?? w.x0 ?? 0, y0: w.box?.[1] ?? w.y0 ?? 0, x1: w.box?.[2] ?? w.x1 ?? 0, y1: w.box?.[3] ?? w.y1 ?? 0 }
    }))
    return {
      text: result.text || (result.lines || []).map(l => l.text).join('\n'),
      words,
      meta: { dt, confidence: result.confidence }
    }
  }

  function toNumberSafe(s) {
    if (!s) return NaN
    const cleaned = s
      // common OCR confusions
      .replace(/[Oo]/g, '0')
      .replace(/[D]/g, '0')
      .replace(/[lI|]/g, '1')
      .replace(/S/g, '5')
      .replace(/B/g, '8')
      .replace(/Z/g, '2')
      .replace(/[,]/g, '.')
      .replace(/[^0-9.]/g, '')
      .replace(/(\.)(?=.*\.)/g, '') // keep only first dot
    const n = Number(cleaned)
    return Number.isFinite(n) ? n : NaN
  }

  // Count decimal places using the raw token (preserves trailing zeros like 1.00)
  function decimalsFromToken(tok) {
    const m = String(tok).match(/[.,]([0-9]+)/)
    return m ? m[1].length : 0
  }

  function normalizeGrade(n) {
    if (!Number.isFinite(n)) return ''
    const clamped = Math.min(5, Math.max(0, n))
    // keep two decimals without snapping to preserve exact grades like 1.45
    return clamped.toFixed(2)
  }

  function parseUnitsAndGrades(text) {
    const rawLines = text
      .replace(/\t/g, ' ')
      .replace(/\u00A0/g, ' ')
      .split(/\r?\n/)
      .map(l => l.replace(/\s{2,}/g, ' ').trim())
      .filter(Boolean)

  const unitsKW = /(\bunits?\b|\bunit\b|lec|lab|credit)/i
  const gradeKW = /(equivalent\s*grade|equivalent|equiv|eqv)/i

    const structured = rawLines.map((raw, idx) => {
      const tokens = raw.match(/[0-9]+(?:[.,][0-9]+)?/g) || []
      const items = tokens
        .map(t => ({ token: t, n: toNumberSafe(t) }))
        .filter(it => Number.isFinite(it.n))
      return {
        idx,
        raw,
        lower: raw.toLowerCase(),
        items,
        hasUnits: unitsKW.test(raw),
        hasGrade: gradeKW.test(raw),
      }
    })

    const unitsAt = new Map()
    const gradeAt = new Map()

    const pickUnits = (items) => {
      // prefer 0.5..9, with one decimal like 3 or 3.0
      let best = NaN
      let bestScore = -1
      for (const it of items) {
        const n = it.n
        const inRange = n > 0 && n <= 9
        if (!inRange) continue
        const score = (n % 0.5 === 0 ? 2 : 1) + (n <= 6 ? 1 : 0)
        if (score > bestScore) { best = n; bestScore = score }
      }
      return best
    }
    const pickGrade = (items) => {
      // Only accept grades in 0..5 with TWO decimals (e.g., 1.25, 1.45)
      let best = NaN
      let bestScore = -1
      for (const it of items) {
        const n = it.n
        const inRange = n >= 0 && n <= 5
        if (!inRange) continue
        const decimals = decimalsFromToken(it.token)
        if (decimals < 2) continue
        const score = 2 + (n <= 3.0 ? 1 : 0)
        if (score > bestScore) { best = n; bestScore = score }
      }
      return best
    }

    // First pass: use labeled lines
    for (const l of structured) {
  if (l.hasUnits) {
        const u = pickUnits(l.items)
        if (Number.isFinite(u)) unitsAt.set(l.idx, u)
      }
      if (l.hasGrade) {
        const g = pickGrade(l.items)
        if (Number.isFinite(g)) gradeAt.set(l.idx, g)
      }
    }

    const results = []

    // Pair labeled units+grade from same or neighboring lines
    for (const [i, u] of unitsAt.entries()) {
      let g = gradeAt.get(i)
      if (!Number.isFinite(g)) g = gradeAt.get(i + 1)
      if (!Number.isFinite(g)) g = gradeAt.get(i - 1)
      if (Number.isFinite(g)) {
        results.push({ units: String(u), grade: normalizeGrade(g) })
      }
    }

  // If nothing labeled, fallback to heuristic per line
    if (results.length === 0) {
      for (const l of structured) {
        const items = l.items
        if (items.length < 1) continue
        const candidates = items.slice(-3)
        let u = NaN, g = NaN
        for (let i = 0; i < candidates.length; i++) {
          for (let j = i + 1; j < candidates.length; j++) {
            const a = candidates[i], b = candidates[j]
            const aUnits = a.n > 0 && a.n <= 9
            const bUnits = b.n > 0 && b.n <= 9
            const aGrade = a.n >= 0 && a.n <= 5
            const bGrade = b.n >= 0 && b.n <= 5
            if (aUnits && bGrade) { u = a.n; g = b.n; break }
            if (bUnits && aGrade) { u = b.n; g = a.n; break }
          }
          if (Number.isFinite(u) && Number.isFinite(g)) break
        }
        const twoDecimals = (tok) => decimalsFromToken(tok) >= 2
        // Use the last grade-like token among candidates for decimal check when ambiguous
        const gradeTok = candidates.find(c => c.n === g)?.token || ''
        if (Number.isFinite(u) && Number.isFinite(g) && twoDecimals(gradeTok)) {
          results.push({ units: String(u), grade: normalizeGrade(g) })
        }
      }
    }

    // Cleanup
    const cleaned = results.filter(r => numberOr(r.units, 0) > 0)
    return cleaned.length ? cleaned : []
  }

  function bboxCenter(word) {
    const b = word?.bbox || word
    if (!b) return { x: 0, y: 0 }
    const x = (b.x0 ?? b.x ?? 0) + ((b.x1 ?? b.x ?? 0) - (b.x0 ?? b.x ?? 0)) / 2
    const y = (b.y0 ?? b.y ?? 0) + ((b.y1 ?? b.y ?? 0) - (b.y0 ?? b.y ?? 0)) / 2
    return { x, y }
  }

  function parseOCRData(data) {
    const text = data?.data?.text || data?.text || ''
    const words = ((data?.data?.words) || data?.words || []).filter(w => (w?.text || '').trim().length > 0)
    if (!words.length) return parseUnitsAndGrades(text)

  // Detect column x-positions from header labels
    let unitsX = null, gradeXEq = null, gradeXFinal = null, gradeX = null
  const headerRegexUnits = /(\bunits?\b|\bunit\b|credit|lec|lab)/i
  const headerRegexEq = /(equivalent\s*grade|equivalent|equiv|eqv)/i
  const headerRegexFinal = /(final\s*(average|avg|ave|grade|rating))/i
    for (const w of words) {
      const t = (w.text || '').toLowerCase()
      if (headerRegexUnits.test(t)) unitsX = bboxCenter(w).x
      if (headerRegexEq.test(t)) gradeXEq = bboxCenter(w).x
      if (headerRegexFinal.test(t)) gradeXFinal = bboxCenter(w).x
    }
    gradeX = gradeXEq ?? null

    // Group words into rows by y center proximity
    const sorted = words.map(w => ({ w, c: bboxCenter(w) })).sort((a, b) => a.c.y - b.c.y)
    const rows = []
    const yTol = 10 // px tolerance
    for (const entry of sorted) {
      const y = entry.c.y
      const last = rows[rows.length - 1]
      if (last && Math.abs(last.y - y) <= yTol) {
        last.items.push(entry)
        last.y = (last.y * last.items.length + y) / (last.items.length + 1)
      } else {
        rows.push({ y, items: [entry] })
      }
    }

    const results = []
    const dist = (a, b) => Math.abs(a - b)
    const inUnitsRange = (n) => n > 0 && n <= 9
    const inGradeRange = (n) => n >= 0 && n <= 5

    // If headers missing, attempt median-x fallback using all nums across rows
    if (unitsX == null || gradeX == null) {
      const allNums = []
      for (const row of rows) {
        for (const { w, c } of row.items) {
          const tok = (w.text || '')
          const match = tok.match(/[0-9]+(?:[.,][0-9]+)?/g)
          if (!match) continue
          for (const m of match) {
            const n = toNumberSafe(m)
            if (Number.isFinite(n)) allNums.push({ n, x: c.x })
          }
        }
      }
      const xsUnits = allNums.filter(a => inUnitsRange(a.n)).map(a => a.x).sort((a,b)=>a-b)
      const xsGrade = allNums.filter(a => inGradeRange(a.n)).map(a => a.x).sort((a,b)=>a-b)
      const median = (arr) => arr.length ? arr[Math.floor(arr.length/2)] : null
      if (unitsX == null && xsUnits.length) unitsX = median(xsUnits)
      if (gradeX == null && xsGrade.length) gradeX = median(xsGrade)
    }

    for (const row of rows) {
      // collect numeric tokens with x positions
      const nums = []
      for (const { w, c } of row.items) {
        const tok = (w.text || '')
        const match = tok.match(/[0-9]+(?:[.,][0-9]+)?/g)
        if (!match) continue
        for (const m of match) {
          // Ignore ordinal-like tokens from the '#' column such as '1.'
          if (/^\d+[.,]$/.test(m)) continue
          const n = toNumberSafe(m)
          if (Number.isFinite(n)) nums.push({ n, x: c.x, raw: m })
        }
      }
      if (!nums.length) continue

      let u = NaN, g = NaN
      if (unitsX != null) {
        // Choose numeric closest to unitsX that fits units range
        let best = null
        for (const it of nums) {
          if (!inUnitsRange(it.n)) continue
          const d = dist(it.x, unitsX)
          if (!best || d < best.d) best = { d, n: it.n }
        }
        if (best) u = best.n
      }
    if (!Number.isFinite(u)) {
        // fallback pick best units by heuristic
        let bestScore = -1
        for (const it of nums) {
          if (!inUnitsRange(it.n)) continue
      const decimals = decimalsFromToken(it.raw)
          const score = (decimals <= 1 ? 1 : 0) + (it.n <= 6 ? 1 : 0)
          if (score > bestScore) { bestScore = score; u = it.n }
        }
      }

      if (gradeX != null) {
        // Choose grade closest to gradeX but REQUIRE two decimals
        let best = null
        for (const it of nums) {
          if (!inGradeRange(it.n)) continue
          const decimals = decimalsFromToken(it.raw)
          if (decimals < 2) continue
          // If both Equivalent and Final headers are present, ignore numbers closer to Final than Equivalent
          if (gradeXEq != null && gradeXFinal != null) {
            const dEq = Math.abs(it.x - gradeXEq)
            const dFinal = Math.abs(it.x - gradeXFinal)
            if (dFinal < dEq) continue
          }
          const d = dist(it.x, gradeX)
          if (!best || d < best.d) best = { d, n: it.n }
        }
        if (best) g = best.n
      }
      if (!Number.isFinite(g)) {
        // Fallback: only accept two-decimal grades 0..5
        let twoDec = nums.filter(it => inGradeRange(it.n) && (decimalsFromToken(it.raw) >= 2))
        if (gradeXEq != null && gradeXFinal != null) {
          twoDec = twoDec.filter(it => Math.abs(it.x - gradeXEq) <= Math.abs(it.x - gradeXFinal))
        }
        if (twoDec.length) {
          // pick the smallest distance to median x of all grade-like numbers if available
          let best = twoDec[0].n
          // Prefer <= 3.00 when ties
          let bestScore = -1
          for (const it of twoDec) {
            const score = (it.n <= 3 ? 2 : 1)
            if (score > bestScore) { bestScore = score; best = it.n }
          }
          g = best
        }
      }

      if (Number.isFinite(u) && Number.isFinite(g)) {
        results.push({ units: String(u), grade: normalizeGrade(g) })
      }
    }

  if (results.length) return { results, words, rows, unitsX, gradeX, gradeXEq, gradeXFinal, text }
  return { results: parseUnitsAndGrades(text), words, rows, unitsX, gradeX, gradeXEq, gradeXFinal, text }
  }

  async function refineGradesByROI(original, parsed) {
    const { data: tesseractData, input } = original
    const { words, rows, unitsX, gradeX, gradeXEq, gradeXFinal } = parsed
    if (!input || !rows?.length) return parsed.results
    const { default: Tesseract } = await import('tesseract.js')

    // Build a fast map of row y to approximate height
    const rowHeights = rows.map(r => {
      let maxH = 18
      for (const it of r.items) {
        const b = it.w?.bbox
        if (b) {
          const h = Math.abs((b.y1 ?? 0) - (b.y0 ?? 0))
          if (h > maxH) maxH = h
        }
      }
      return maxH
    })

    const canvas = input
    const ctx = canvas.getContext('2d')
    const refined = [...parsed.results]

  const gX = (gradeXEq ?? gradeX) ?? (() => {
      // derive a fallback from numeric positions if needed
      const nums = []
      for (const r of rows) for (const it of r.items) {
        const ms = (it.w.text||'').match(/[0-9]+(?:[.,][0-9]+)?/g); if (!ms) continue
        for (const m of ms) { const n = toNumberSafe(m); if (Number.isFinite(n) && n>=0 && n<=5) nums.push(it.c.x) }
      }
      nums.sort((a,b)=>a-b); return nums.length? nums[Math.floor(nums.length/2)]: null
    })()
    if (gX == null) return refined

    for (let i = 0; i < refined.length && i < rows.length; i++) {
      const row = rows[i]
      const rec = refined[i]
      if (rec.grade && rec.grade !== '' && Number.isFinite(Number(rec.grade))) continue
      const y = row.y
      const h = Math.max(18, Math.min(48, rowHeights[i] * 1.6))
      const w = 140
      const x0 = Math.max(0, Math.round(gX - w/2))
      const y0 = Math.max(0, Math.round(y - h/2))
      const x1 = Math.min(canvas.width, x0 + w)
      const y1 = Math.min(canvas.height, y0 + h)
      const sw = x1 - x0, sh = y1 - y0
      if (sw < 8 || sh < 8) continue
      const roi = document.createElement('canvas')
      roi.width = sw; roi.height = sh
      const rctx = roi.getContext('2d')
      rctx.drawImage(canvas, x0, y0, sw, sh, 0, 0, sw, sh)
      try {
        const { data } = await Tesseract.recognize(roi, 'eng', {
          logger: ()=>{},
          tessedit_pageseg_mode: '7', // single text line
          tessedit_char_whitelist: '0123456789.',
        })
        const tok = (data?.text || '').trim()
        const matches = tok.match(/[0-9]+(?:\.[0-9]+)?/g) || []
        // prefer two-decimal candidates
        const twoDec = matches.filter(t => /\d+\.\d{2}/.test(t))
        const pick = (arr) => {
          let best = null, bestScore = -1
          for (const m of arr) {
            const n = toNumberSafe(m)
            if (!Number.isFinite(n) || n < 0 || n > 5) continue
            const decimals = String(n).split('.')[1]?.length || 0
            const score = (decimals >= 2 ? 3 : decimals === 1 ? 2 : 1) + (n <= 3 ? 1 : 0)
            if (score > bestScore) { bestScore = score; best = n }
          }
          return best
        }
        let n = twoDec.length ? pick(twoDec) : pick(matches)
        if (Number.isFinite(n)) refined[i] = { ...rec, grade: normalizeGrade(n) }
      } catch {}
    }

    return refined
  }

  async function handleFile(file) {
    try {
      const data = (ocrEngine === 'rapid'
        ? (await runRapidOCR(file).catch(() => null) || await runOCR(file))
        : await runOCR(file))
      setOcrStatus('Parsing...')
      const parsed = parseOCRData(data)
      let finalRows = parsed.results
      if (ocrEngine !== 'tesseract') {
        // For RapidOCR path we skip Tesseract ROI refinement; results already word-segmented
      } else {
        // Attempt grade refinement with ROI OCR only in local mode
        finalRows = await refineGradesByROI(data, parsed)
      }
      if (finalRows.length) {
        setRows(finalRows.map(r => ({ id: crypto.randomUUID(), ...r })))
      }
      setOcrStatus('Done')
      setTimeout(() => setOcrStatus(''), 1200)
      // Scroll to calculator
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

  // PDF download (includes logo, name, school, units, grades, and summary)
  async function loadImageDataURL(src) {
    try {
      const res = await fetch(src)
      if (!res.ok) return null
      const blob = await res.blob()
      return await new Promise((resolve) => {
        const fr = new FileReader()
        fr.onload = () => resolve(fr.result)
        fr.readAsDataURL(blob)
      })
    } catch {
      return null
    }
  }

  async function handleDownloadPDF() {
    const { jsPDF } = await import('jspdf')
    const doc = new jsPDF({ unit: 'pt' })

    const marginX = 48, marginY = 48
    let y = marginY

  // Decorative parallax-style backdrop (layered translucent circles using theme colors)
    const pageW = doc.internal.pageSize.getWidth()
    const pageH = doc.internal.pageSize.getHeight()
    const css = getComputedStyle(document.documentElement)
    const c1 = css.getPropertyValue('--c1').trim() || '#6366f1'
    const c2 = css.getPropertyValue('--c2').trim() || '#a855f7'
    const c3 = css.getPropertyValue('--c3').trim() || '#06b6d4'
    const hexToRgb = (hex) => {
      const h = hex.replace('#','')
      const bigint = parseInt(h.length===3 ? h.split('').map(x=>x+x).join('') : h, 16)
      return { r: (bigint>>16)&255, g: (bigint>>8)&255, b: bigint&255 }
    }
    const c1rgb = hexToRgb(c1), c2rgb = hexToRgb(c2), c3rgb = hexToRgb(c3)
    if (doc.GState) {
      const gs = new doc.GState({ opacity: 0.15 })
      doc.setGState(gs)
    }
  doc.setFillColor(c1rgb.r, c1rgb.g, c1rgb.b)
  doc.circle(pageW * 0.15, pageH * 0.20, pageW * 0.20, 'F')
  doc.setFillColor(c2rgb.r, c2rgb.g, c2rgb.b)
  doc.circle(pageW * 0.80, pageH * 0.18, pageW * 0.16, 'F')
  doc.setFillColor(c3rgb.r, c3rgb.g, c3rgb.b)
  doc.circle(pageW * 0.55, pageH * 0.66, pageW * 0.24, 'F')
    // reset opacity if supported
    if (doc.GState) {
      const gs = new doc.GState({ opacity: 1 })
      doc.setGState(gs)
    }

  // Header bar + Logo and title (use school-specific logo if selected)
  const logoSrc = school === 'psu' ? '/PampangaStateU.png' : (school === 'hau' ? '/HolyAngelU.png' : '/GWA-logo.png')
  const logoData = await loadImageDataURL(logoSrc)
    doc.setFillColor(17, 24, 39) // bg-slate-900 bar
    doc.rect(0, 0, pageW, 64, 'F')
    if (logoData) {
      try { doc.addImage(logoData, 'PNG', marginX, 16, 32, 32) } catch {}
    }
    doc.setFont('helvetica', 'bold')
    doc.setTextColor(248, 250, 252)
    doc.setFontSize(16)
    doc.text('GWA Report', marginX + (logoData ? 44 : 0), 38)
    doc.setFont('helvetica', 'normal')
    doc.setTextColor(203, 213, 225)
    doc.setFontSize(10)
    doc.text(new Date().toLocaleString(), marginX + (logoData ? 44 : 0), 52)
    y = 88

  // Name and School (summary subtitle)
    const schoolLabel = (SCHOOLS.find(s => s.id === school)?.label) || ''
  doc.setFontSize(11)
  doc.setTextColor(203, 213, 225)
  const subtitle = [name && `Name: ${name}`, schoolLabel && `School: ${schoolLabel}`].filter(Boolean).join('  •  ')
  if (subtitle) { doc.text(subtitle, marginX, y); y += 14 }
  y += 4

  // Sample-like card container
  const cardX = marginX
  const cardW = pageW - marginX * 2
  let cardY = y
  const innerPad = 20
  const innerX = cardX + innerPad
  let innerY = cardY + innerPad
  const innerW = cardW - innerPad * 2

  // Card background and border
  doc.setFillColor(11, 18, 32) // #0b1220
  doc.setDrawColor(31, 41, 55) // #1f2937
  doc.rect(cardX, cardY, cardW, 260 + Math.max(0, rows.length - 3) * 28, 'FD')

  // Header bar inside the card (two columns: Units | Equivalent Grade)
  const headerH = 36
  doc.setFillColor(51, 65, 85) // #334155
  doc.rect(innerX, innerY, innerW, headerH, 'F')
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(248, 250, 252)
  const colN = (pos) => innerX + innerW * pos
  // Column normalized positions based on sample-ocr-guide.svg (relative to inner width 1040)
  const C1 = (60 - 20) / 1040 // Units
  const C2 = (840 - 20) / 1040 // Equivalent Grade
  const thY = innerY + headerH - 12
  doc.text('Units', colN(C1), thY)
  doc.setTextColor(248, 250, 252)
  doc.text('Equivalent Grade', colN(C2), thY)

  // Rows (zebra), two columns: Units | Equivalent Grade
  innerY += headerH + 4
  const rowH = 26
  if (rows.length === 0) {
    doc.setTextColor(148, 163, 184)
    doc.text('No rows', innerX, innerY + 18)
    innerY += rowH
  } else {
    for (let i = 0; i < rows.length; i++) {
      const r = rows[i]
      const ry = innerY + i * rowH
      // alternating fills
      const fill = i % 2 === 0 ? { r: 17, g: 24, b: 39 } : { r: 15, g: 23, b: 42 }
      doc.setFillColor(fill.r, fill.g, fill.b)
      doc.rect(innerX, ry - 6, innerW, rowH, 'F')
      doc.setTextColor(229, 231, 235)
      const u = r.units === '' ? '—' : String(numberOr(r.units, 0))
      const eg = r.grade || ''
      doc.text(u, colN(C1), ry + 12)
      doc.setTextColor(229, 231, 235)
      doc.text(eg, colN(C2), ry + 12)
      if (ry + rowH > pageH - 80) { doc.addPage(); innerY = marginY; cardY = marginY; }
    }
    innerY += rows.length * rowH
  }

  // Spacer after card
  y = innerY + 18

    // Summary
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(248, 250, 252)
  doc.text(`Total Units: ${totalUnits}`, marginX, y)
  doc.text(`GWA: ${gwa.toFixed(2)}`, marginX + 240, y)
    doc.setFont('helvetica', 'normal')
    y += 30

  // Footer watermark
  doc.setFontSize(9)
  doc.setTextColor(148, 163, 184)
  doc.text('Generated by GWA Calculator (data stayed on your device)', marginX, y)

    doc.save('GWA_Report.pdf')
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
      <header className="sticky top-0 z-20 backdrop-blur supports-[backdrop-filter]:bg-black/40 bg-black/50 border-b border-slate-800/50">
        <div className="mx-auto max-w-6xl px-4 sm:px-6 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="relative h-9 w-9">
              <div className="absolute inset-0 rounded-lg bg-gradient-to-br from-[var(--c1)] to-[var(--c2)] blur-[2px] opacity-80" />
              <img
                src={school === 'psu' ? '/PampangaStateU.png' : school === 'hau' ? '/HolyAngelU.png' : '/GWA-logo.png'}
                alt={school === 'psu' ? 'Pampanga State University' : school === 'hau' ? 'Holy Angel University' : 'GWA Logo'}
                className="relative h-9 w-9 rounded-lg object-contain bg-black/30 border border-white/10"
              />
            </div>
            <h1 className="text-lg sm:text-xl font-semibold tracking-tight">GWA Calculator</h1>
          </div>
          {/* Start link removed per request */}
        </div>
      </header>

      {/* Hero with parallax title */}
      <section className="relative pt-16 sm:pt-24">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <div className="grid md:grid-cols-2 gap-8 items-center">
            <div className="space-y-4 md:space-y-6">
              <h2
                className="text-4xl sm:text-5xl md:text-6xl font-extrabold tracking-tight bg-clip-text text-transparent bg-gradient-to-br from-white to-slate-300"
                style={{ transform: `translateY(${offset * 0.12}px)` }}
              >
                Compute your General Weighted Average fast.
              </h2>
              <p className="text-slate-300/80 text-base sm:text-lg max-w-prose">
                Add your subjects, pick grades and units—get your GWA instantly.
              </p>
              <div className="flex flex-wrap gap-3">
                <a href="#calc" className="inline-flex items-center gap-2 rounded-lg btn-primary transition px-4 py-2 shadow-lg" style={{ boxShadow: '0 10px 20px -10px var(--primary)' }}>
                  Start calculating
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4"><path fillRule="evenodd" d="M15.75 6a.75.75 0 0 1 .75.75v7.5a.75.75 0 0 1-1.5 0V8.56l-7.22 7.22a.75.75 0 1 1-1.06-1.06l7.22-7.22h-5.69a.75.75 0 0 1 0-1.5h7.5Z" clipRule="evenodd" /></svg>
                </a>
                <input ref={fileInputRef} type="file" accept="image/*" onChange={onFileChange} className="hidden" />
                <button onClick={onUploadClick} className="inline-flex items-center gap-2 rounded-lg border border-slate-700 bg-slate-900/60 hover:bg-slate-900/40 text-slate-100 px-4 py-2 transition">
                  Upload picture
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4"><path d="M12 16a4 4 0 1 0 0-8 4 4 0 0 0 0 8Z"/><path fillRule="evenodd" d="M2.25 6.75A3.75 3.75 0 0 1 6 3h12a3.75 3.75 0 0 1 3.75 3.75v10.5A3.75 3.75 0 0 1 18 21H6a3.75 3.75 0 0 1-3.75-3.75V6.75Zm12 3.25a3.75 3.75 0 1 1-7.5 0 3.75 3.75 0 0 1 7.5 0Z" clipRule="evenodd"/></svg>
                </button>
                <button onClick={() => setShowSample(true)} className="text-xs text-slate-300/80 hover:text-slate-200 underline">View sample</button>
                {ocrStatus && (
                  <span className="text-xs text-slate-300/80">
                    {ocrStatus} {ocrProgress ? `· ${ocrProgress}%` : ''}
                  </span>
                )}
              </div>
            </div>
            <div className="relative h-56 sm:h-72 md:h-96">
              <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-[color:var(--c1)]/30 via-[color:var(--c2)]/20 to-[color:var(--c3)]/30 backdrop-blur-sm border border-slate-800/60 shadow-2xl" style={{ transform: `translateY(${offset * -0.18}px)` }} />
              <div className="absolute inset-3 rounded-2xl bg-black/40 border border-slate-800/60 p-6 overflow-hidden">
                <div className="absolute -right-10 -top-10 h-44 w-44 rounded-full" style={{ background: 'color-mix(in oklab, var(--c1) 30%, transparent)' }} />
                <div className="absolute -left-6 bottom-6 h-32 w-32 rounded-full" style={{ background: 'color-mix(in oklab, var(--c2) 30%, transparent)' }} />
                <div className="relative">
                  <p className="text-sm text-slate-300/80">Live preview</p>
                  <div className="mt-3 max-h-48 overflow-auto no-scrollbar">
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
                  </div>
                  <div className="mt-3 flex items-center justify-between text-sm">
                    <span className="text-slate-300/80">Total Units: {totalUnits}</span>
                    <span className="font-semibold" style={{ color: 'var(--c1)' }}>GWA: {gwa.toFixed(2)}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

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
                    <input ref={fileInputRef} type="file" accept="image/*" onChange={onFileChange} className="hidden" />
                    <button onClick={onUploadClick} className="inline-flex items-center gap-2 rounded-lg border border-slate-700 bg-slate-900/60 hover:bg-slate-900/40 text-slate-100 px-4 py-2">
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
                <button onClick={addRow} className="inline-flex items-center gap-2 rounded-lg btn-primary transition px-4 py-2">
                  Add subject
                </button>
                <button onClick={reset} className="inline-flex items-center gap-2 rounded-lg border border-slate-700 bg-slate-900/60 hover:bg-slate-900/40 text-slate-100 px-4 py-2">
                  Reset
                </button>
                <button
                  onClick={handleDownloadPDF}
                  disabled={rows.length === 0}
                  className={`inline-flex items-center gap-2 rounded-lg border px-4 py-2 ${rows.length === 0 ? 'border-slate-800 bg-slate-900/40 text-slate-500 cursor-not-allowed' : 'border-slate-700 bg-slate-900/60 hover:bg-slate-900/40 text-slate-100'}`}
                  title={rows.length === 0 ? 'Add rows to download' : 'Download PDF'}
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
      {showOcrWarn && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="max-w-md w-full rounded-xl border border-slate-800 bg-slate-900 p-5 shadow-2xl">
            <h3 className="text-lg font-semibold mb-2">Heads up</h3>
            <p className="text-slate-300/90 text-sm">OCR isn’t 100% accurate. Please double‑check extracted Units and Equivalent Grade before relying on the result.</p>
            <ul className="list-disc pl-5 mt-3 text-slate-300/80 text-sm">
              <li>Crop tightly to the table area.</li>
              <li>Ensure “Units” and “Equivalent Grade” headers are visible.</li>
              <li>Two-decimal grades like 1.00/1.25 help accuracy.</li>
            </ul>
            <div className="mt-4 flex gap-2 justify-end">
              <button onClick={() => setShowOcrWarn(false)} className="rounded-md border border-slate-700 bg-slate-900/60 hover:bg-slate-900/40 text-slate-100 px-3 py-2">Cancel</button>
              <button onClick={proceedUpload} className="rounded-md btn-primary px-3 py-2">Continue</button>
            </div>
          </div>
        </div>
      )}

      {/* Sample guide modal */}
      {showSample && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="max-w-5xl w-full rounded-xl border border-slate-800 bg-slate-950 p-4 md:p-6 shadow-2xl">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-lg font-semibold">Sample screenshot guide</h3>
              <button onClick={() => setShowSample(false)} className="rounded-md border border-slate-700 bg-slate-900/60 hover:bg-slate-900/40 text-slate-100 px-2 py-1 text-sm">Close</button>
            </div>
            <div className="rounded-lg overflow-auto max-h-[70vh]">
              <img src="/sample-ocr-guide.svg" alt="OCR screenshot guide" className="w-full h-auto" />
            </div>
          </div>
        </div>
      )}

      {/* Footer */}
      <footer className="py-10 text-center text-slate-500">
        <p className="text-xs">made by John Dayrill P. Flores. No data leaves your browser.</p>
      </footer>
    </div>
  )
}
