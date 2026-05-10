/**
 * Busca municípios brasileiros via API pública do IBGE — usado pro fluxo
 * manual do location-modal quando o cliente seleciona um estado e a lista
 * estática `citiesByState` em lib/data.ts não cobre o estado escolhido.
 *
 * IBGE: https://servicodados.ibge.gov.br/api/docs/localidades — CORS aberto,
 * sem auth, dado oficial e estável. Cache module-level em-memory porque
 * municípios não mudam dentro de uma sessão.
 */

const STATE_TO_UF: Record<string, string> = {
  Acre: "AC",
  Alagoas: "AL",
  Amapá: "AP",
  Amazonas: "AM",
  Bahia: "BA",
  Ceará: "CE",
  "Distrito Federal": "DF",
  "Espírito Santo": "ES",
  Goiás: "GO",
  Maranhão: "MA",
  "Mato Grosso": "MT",
  "Mato Grosso do Sul": "MS",
  "Minas Gerais": "MG",
  Pará: "PA",
  Paraíba: "PB",
  Paraná: "PR",
  Pernambuco: "PE",
  Piauí: "PI",
  "Rio de Janeiro": "RJ",
  "Rio Grande do Norte": "RN",
  "Rio Grande do Sul": "RS",
  Rondônia: "RO",
  Roraima: "RR",
  "Santa Catarina": "SC",
  "São Paulo": "SP",
  Sergipe: "SE",
  Tocantins: "TO",
}

const cache = new Map<string, string[]>()

export async function fetchCitiesByState(stateName: string): Promise<string[]> {
  const cached = cache.get(stateName)
  if (cached) return cached

  const uf = STATE_TO_UF[stateName]
  if (!uf) return []

  try {
    const res = await fetch(
      `https://servicodados.ibge.gov.br/api/v1/localidades/estados/${uf}/municipios`,
    )
    if (!res.ok) return []
    const data = (await res.json()) as Array<{ nome: string }>
    const list = data
      .map((m) => m.nome)
      .sort((a, b) => a.localeCompare(b, "pt-BR"))
    cache.set(stateName, list)
    return list
  } catch {
    return []
  }
}
