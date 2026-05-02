/**
 * Formatting helpers and input masks for Brazilian phone, CEP, and money values.
 */

export function formatMoney(value: number): string {
  return value.toFixed(2).replace(".", ",")
}

export function formatMoneyBR(value: number): string {
  return `R$ ${formatMoney(value)}`
}

/** (XX) XXXXX-XXXX or (XX) XXXX-XXXX */
export function maskPhone(value: string): string {
  const digits = value.replace(/\D/g, "").slice(0, 11)
  if (digits.length === 0) return ""
  if (digits.length <= 2) return `(${digits}`
  if (digits.length <= 6) return `(${digits.slice(0, 2)}) ${digits.slice(2)}`
  if (digits.length <= 10) return `(${digits.slice(0, 2)}) ${digits.slice(2, 6)}-${digits.slice(6)}`
  return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`
}

export function unmaskDigits(value: string): string {
  return value.replace(/\D/g, "")
}

/** XXXXX-XXX */
export function maskCEP(value: string): string {
  const digits = value.replace(/\D/g, "").slice(0, 8)
  if (digits.length <= 5) return digits
  return `${digits.slice(0, 5)}-${digits.slice(5)}`
}

/** Money mask for "troco" inputs (R$ X,XX) */
export function maskMoneyInput(value: string): string {
  const digits = value.replace(/\D/g, "")
  if (!digits) return ""
  const num = parseInt(digits, 10) / 100
  return num.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}
