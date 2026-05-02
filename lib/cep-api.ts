export interface CEPResult {
  cep: string
  logradouro: string
  bairro: string
  localidade: string // city
  uf: string // state
  erro?: boolean
}

export async function fetchCEP(cep: string): Promise<CEPResult | null> {
  const digits = cep.replace(/\D/g, "")
  if (digits.length !== 8) return null
  try {
    const res = await fetch(`https://viacep.com.br/ws/${digits}/json/`)
    if (!res.ok) return null
    const data = (await res.json()) as CEPResult
    if (data.erro) return null
    return data
  } catch {
    return null
  }
}
