export function toNumberSafe(s) {
  if (!s) return NaN
  const cleaned = s
    .replace(/[Oo]/g, '0')
    .replace(/[D]/g, '0')
    .replace(/[lI|]/g, '1')
    .replace(/S/g, '5')
    .replace(/B/g, '8')
    .replace(/Z/g, '2')
    .replace(/[,]/g, '.')
    .replace(/[^0-9.]/g, '')
    .replace(/(\.)(?=.*\.)/g, '')
  const n = Number(cleaned)
  return Number.isFinite(n) ? n : NaN
}

export function decimalsFromToken(tok) {
  const m = String(tok).match(/[.,]([0-9]+)/)
  return m ? m[1].length : 0
}

export function normalizeGrade(n) {
  if (!Number.isFinite(n)) return ''
  const clamped = Math.min(5, Math.max(0, n))
  return clamped.toFixed(2)
}
