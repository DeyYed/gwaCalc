export function numberOr(value, fallback) {
  const n = Number(value)
  return Number.isFinite(n) ? n : fallback
}

export function calcGWA(rows) {
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
