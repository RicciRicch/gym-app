// Pounds for machines that only show lb. Weights are always stored in kg; the
// unit is a per-exercise display and input choice.

export type WeightUnit = 'kg' | 'lb'

export const KG_PER_LB = 0.45359237

/** A weight typed in `unit`, in kg as stored (numeric(6,2): two decimals). */
export function toKg(value: number, unit: WeightUnit): number {
  const kg = unit === 'lb' ? value * KG_PER_LB : value
  return Math.round(kg * 100) / 100
}

/**
 * A stored kg weight in `unit`. Pounds snap to 0.05 lb: kg keeps two decimals,
 * so 102.5 lb comes back as 102.49..., and this turns it into 102.5 again.
 */
export function fromKg(kg: number, unit: WeightUnit): number {
  if (unit === 'kg') return kg
  return Math.round((kg / KG_PER_LB) * 20) / 20
}

/** "100", "102.5": a weight in `unit` without trailing zeros. */
export function formatIn(kg: number, unit: WeightUnit): string {
  return String(Number(fromKg(kg, unit).toFixed(2)))
}

/** "100 kg", "225 lb". */
export function withUnit(kg: number, unit: WeightUnit): string {
  return `${formatIn(kg, unit)} ${unit}`
}

/**
 * A weight input moved to another unit ("100" kg -> "220.45" lb), so the real
 * weight stays the same. Empty (bodyweight) and unreadable text stay as they are.
 */
export function convertInput(text: string, from: WeightUnit, to: WeightUnit): string {
  if (from === to) return text
  const value = Number(text.trim().replace(',', '.'))
  if (text.trim() === '' || !Number.isFinite(value)) return text
  return formatIn(toKg(value, from), to)
}

/** Smallest sensible jump in `unit`: kg 1 under 20 kg, else 2.5; lb 2.5 under 45 lb, else 5. */
export function weightStep(weight: number, unit: WeightUnit): number {
  if (unit === 'lb') return weight < 45 ? 2.5 : 5
  return weight < 20 ? 1 : 2.5
}

export const isWeightUnit = (value: unknown): value is WeightUnit => value === 'kg' || value === 'lb'
