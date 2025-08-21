import { decimalsFromToken, normalizeGrade, toNumberSafe } from '../utils/ocr-helpers'

export async function preprocessImage(file) {
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
      const contrast = 1.25
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

let rapidEnginePromise = null
export async function getRapidEngine() {
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

export async function runTesseract(file, setStatus, setProgress) {
  const { default: Tesseract } = await import('tesseract.js')
  setStatus?.('Initializing...')
  setProgress?.(0)
  const input = await preprocessImage(file)
  const { data } = await Tesseract.recognize(input, 'eng', {
    logger: (m) => {
      if (m.status) setStatus?.(m.status)
      if (typeof m.progress === 'number') setProgress?.(Math.round(m.progress * 100))
    },
    user_defined_dpi: '300',
    tessedit_pageseg_mode: '6',
    preserve_interword_spaces: '1',
    tessedit_char_whitelist: '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz.,:-()/% ',
  })
  return { data, input }
}

export async function runRapid(file, setStatus, setProgress) {
  setStatus?.('Initializing models...')
  setProgress?.(5)
  const engine = await getRapidEngine()
  setStatus?.('Preprocessing...')
  const t0 = performance.now()
  const result = await engine.processImage(file, {
    enableWordSegmentation: true,
    returnConfidence: true,
    enableTextClassification: true,
  })
  const dt = Math.round(performance.now() - t0)
  setProgress?.(100)
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

export function bboxCenter(word) {
  const b = word?.bbox || word
  if (!b) return { x: 0, y: 0 }
  const x = (b.x0 ?? b.x ?? 0) + ((b.x1 ?? b.x ?? 0) - (b.x0 ?? b.x ?? 0)) / 2
  const y = (b.y0 ?? b.y ?? 0) + ((b.y1 ?? b.y ?? 0) - (b.y0 ?? b.y ?? 0)) / 2
  return { x, y }
}

export function parseUnitsAndGrades(text) {
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
  for (const [i, u] of unitsAt.entries()) {
    let g = gradeAt.get(i)
    if (!Number.isFinite(g)) g = gradeAt.get(i + 1)
    if (!Number.isFinite(g)) g = gradeAt.get(i - 1)
    if (Number.isFinite(g)) {
      results.push({ units: String(u), grade: normalizeGrade(g) })
    }
  }

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
      const gradeTok = candidates.find(c => c.n === g)?.token || ''
      if (Number.isFinite(u) && Number.isFinite(g) && twoDecimals(gradeTok)) {
        results.push({ units: String(u), grade: normalizeGrade(g) })
      }
    }
  }

  const cleaned = results.filter(r => (Number(r.units) || 0) > 0)
  return cleaned.length ? cleaned : []
}

export function parseOCRData(data) {
  const text = data?.data?.text || data?.text || ''
  const words = ((data?.data?.words) || data?.words || []).filter(w => (w?.text || '').trim().length > 0)
  if (!words.length) return parseUnitsAndGrades(text)

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

  const sorted = words.map(w => ({ w, c: bboxCenter(w) })).sort((a, b) => a.c.y - b.c.y)
  const rows = []
  const yTol = 10
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
    const nums = []
    for (const { w, c } of row.items) {
      const tok = (w.text || '')
      const match = tok.match(/[0-9]+(?:[.,][0-9]+)?/g)
      if (!match) continue
      for (const m of match) {
        if (/^\d+[.,]$/.test(m)) continue
        const n = toNumberSafe(m)
        if (Number.isFinite(n)) nums.push({ n, x: c.x, raw: m })
      }
    }
    if (!nums.length) continue

    let u = NaN, g = NaN
    if (unitsX != null) {
      let best = null
      for (const it of nums) {
        if (!inUnitsRange(it.n)) continue
        const d = dist(it.x, unitsX)
        if (!best || d < best.d) best = { d, n: it.n }
      }
      if (best) u = best.n
    }
    if (!Number.isFinite(u)) {
      let bestScore = -1
      for (const it of nums) {
        if (!inUnitsRange(it.n)) continue
        const decimals = decimalsFromToken(it.raw)
        const score = (decimals <= 1 ? 1 : 0) + (it.n <= 6 ? 1 : 0)
        if (score > bestScore) { bestScore = score; u = it.n }
      }
    }

    if (gradeX != null) {
      let best = null
      for (const it of nums) {
        if (!inGradeRange(it.n)) continue
        const decimals = decimalsFromToken(it.raw)
        if (decimals < 2) continue
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
      let twoDec = nums.filter(it => inGradeRange(it.n) && (decimalsFromToken(it.raw) >= 2))
      if (gradeXEq != null && gradeXFinal != null) {
        twoDec = twoDec.filter(it => Math.abs(it.x - gradeXEq) <= Math.abs(it.x - gradeXFinal))
      }
      if (twoDec.length) {
        let best = twoDec[0].n
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

export async function refineGradesByROI(original, parsed) {
  const { data: tesseractData, input } = original
  const { words, rows, unitsX, gradeX, gradeXEq, gradeXFinal } = parsed
  if (!input || !rows?.length) return parsed.results
  const { default: Tesseract } = await import('tesseract.js')

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
        tessedit_pageseg_mode: '7',
        tessedit_char_whitelist: '0123456789.',
      })
      const tok = (data?.text || '').trim()
      const matches = tok.match(/[0-9]+(?:\.[0-9]+)?/g) || []
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
