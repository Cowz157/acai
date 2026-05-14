export type ProductCategory =
  | "pague-leve"
  | "pague-leve-zero"
  | "avulso"
  | "avulso-zero"
export type ProductKind = "combo" | "addon"

export type Product = {
  slug: string
  name: string
  size: string
  category: ProductCategory
  /** "combo" = açaí customizável (default). "addon" = item simples (sem coberturas/frutas/etc). */
  kind?: ProductKind
  isZero: boolean
  oldPrice: number
  price: number
  freebies: number
  description: string
  image: string
  isBestSeller?: boolean
  bestSellerNote?: string
  highlight?: string
}

const COMBO_DESCRIPTION =
  "Açaí cremoso + leite condensado, granola, banana, morango, leite ninho e mais 4 complementos à sua escolha"
const ZERO_DESCRIPTION =
  "Açaí Zero açúcar + granola, banana, morango, creme de ninho zero e mais 5 complementos à sua escolha"

export const products: Product[] = [
  // Pague 1, Leve 2
  {
    slug: "2-copos-acai-300ml",
    name: "2 Copos Açaí 300ml",
    size: "300ml",
    category: "pague-leve",
    isZero: false,
    oldPrice: 39.8,
    price: 19.9,
    freebies: 9,
    description: COMBO_DESCRIPTION,
    image: "/images/copo.webp",
  },
  {
    slug: "2-copos-acai-500ml",
    name: "2 Copos Açaí 500ml",
    size: "500ml",
    category: "pague-leve",
    isZero: false,
    oldPrice: 43.8,
    price: 22.9,
    freebies: 9,
    description: COMBO_DESCRIPTION,
    image: "/images/copo.webp",
  },
  {
    slug: "2-copos-acai-700ml",
    name: "2 Copos Açaí 700ml",
    size: "700ml",
    category: "pague-leve",
    isZero: false,
    oldPrice: 53.8,
    price: 26.9,
    freebies: 9,
    description: COMBO_DESCRIPTION,
    image: "/images/copo.webp",
    isBestSeller: true,
    highlight: "Mais que o dobro do Combo 1 por apenas R$ 7 a mais!",
    bestSellerNote: "A maioria dos clientes escolhe esse porque é o melhor custo-benefício!",
  },
  {
    slug: "2-copos-acai-1l",
    name: "2 Copos Açaí 1L",
    size: "1L",
    category: "pague-leve",
    isZero: false,
    oldPrice: 75.8,
    price: 37.9,
    freebies: 9,
    description: COMBO_DESCRIPTION,
    image: "/images/copo.webp",
  },
  // Pague 1, Leve 2 - Zero Açúcar
  {
    slug: "2-copos-acai-300ml-zero",
    name: "2 Copos Açaí 300ml ZERO",
    size: "300ml",
    category: "pague-leve-zero",
    isZero: true,
    oldPrice: 45.8,
    price: 22.9,
    freebies: 9,
    description: ZERO_DESCRIPTION,
    image: "/images/zero.webp",
  },
  {
    slug: "2-copos-acai-500ml-zero",
    name: "2 Copos Açaí 500ml ZERO",
    size: "500ml",
    category: "pague-leve-zero",
    isZero: true,
    oldPrice: 49.8,
    price: 25.9,
    freebies: 9,
    description: ZERO_DESCRIPTION,
    image: "/images/zero.webp",
  },
  {
    slug: "2-copos-acai-700ml-zero",
    name: "2 Copos Açaí 700ml ZERO",
    size: "700ml",
    category: "pague-leve-zero",
    isZero: true,
    oldPrice: 59.8,
    price: 29.9,
    freebies: 9,
    description: ZERO_DESCRIPTION,
    image: "/images/zero.webp",
    isBestSeller: true,
    highlight: "Mais que o dobro do Combo 1 por apenas R$7 a mais!",
    bestSellerNote: "A maioria dos clientes escolhe esse porque é o melhor custo-benefício!",
  },
  {
    slug: "2-copos-acai-1l-zero",
    name: "2 Copos Açaí 1L ZERO",
    size: "1L",
    category: "pague-leve-zero",
    isZero: true,
    oldPrice: 81.8,
    price: 40.9,
    freebies: 9,
    description: ZERO_DESCRIPTION,
    image: "/images/zero.webp",
  },
  // Avulso — 1 copo (sem promoção). Acessível pela página /avulso.
  {
    slug: "1-copo-acai-300ml",
    name: "1 Copo Açaí 300ml",
    size: "300ml",
    category: "avulso",
    isZero: false,
    oldPrice: 14.9,
    price: 14.9,
    freebies: 9,
    description: COMBO_DESCRIPTION,
    image: "/images/copo-1.png",
  },
  {
    slug: "1-copo-acai-500ml",
    name: "1 Copo Açaí 500ml",
    size: "500ml",
    category: "avulso",
    isZero: false,
    oldPrice: 16.9,
    price: 16.9,
    freebies: 9,
    description: COMBO_DESCRIPTION,
    image: "/images/copo-1.png",
  },
  {
    slug: "1-copo-acai-700ml",
    name: "1 Copo Açaí 700ml",
    size: "700ml",
    category: "avulso",
    isZero: false,
    oldPrice: 19.9,
    price: 19.9,
    freebies: 9,
    description: COMBO_DESCRIPTION,
    image: "/images/copo-1.png",
  },
  {
    slug: "1-copo-acai-1l",
    name: "1 Copo Açaí 1L",
    size: "1L",
    category: "avulso",
    isZero: false,
    oldPrice: 27.9,
    price: 27.9,
    freebies: 9,
    description: COMBO_DESCRIPTION,
    image: "/images/copo-1.png",
  },
  // Avulso Zero — 1 copo zero (sem promoção)
  {
    slug: "1-copo-acai-300ml-zero",
    name: "1 Copo Açaí 300ml ZERO",
    size: "300ml",
    category: "avulso-zero",
    isZero: true,
    oldPrice: 16.9,
    price: 16.9,
    freebies: 9,
    description: ZERO_DESCRIPTION,
    image: "/images/copo-2.png",
  },
  {
    slug: "1-copo-acai-500ml-zero",
    name: "1 Copo Açaí 500ml ZERO",
    size: "500ml",
    category: "avulso-zero",
    isZero: true,
    oldPrice: 18.9,
    price: 18.9,
    freebies: 9,
    description: ZERO_DESCRIPTION,
    image: "/images/copo-2.png",
  },
  {
    slug: "1-copo-acai-700ml-zero",
    name: "1 Copo Açaí 700ml ZERO",
    size: "700ml",
    category: "avulso-zero",
    isZero: true,
    oldPrice: 22.9,
    price: 22.9,
    freebies: 9,
    description: ZERO_DESCRIPTION,
    image: "/images/copo-2.png",
  },
  {
    slug: "1-copo-acai-1l-zero",
    name: "1 Copo Açaí 1L ZERO",
    size: "1L",
    category: "avulso-zero",
    isZero: true,
    oldPrice: 29.9,
    price: 29.9,
    freebies: 9,
    description: ZERO_DESCRIPTION,
    image: "/images/copo-2.png",
  },
]

/**
 * Categorias renderizadas na home, em ordem.
 * - "tier" decide a hierarquia visual:
 *     "primary"   → combos com a oferta "Pague 1 Leve 2" (heading grande, animações)
 *     "secondary" → opções avulsas / cross-sell (heading menor, sem badges)
 */
export const categories = [
  { id: "pague-leve", label: "Pague 1, Leve 2", tier: "primary" },
  { id: "pague-leve-zero", label: "Pague 1, Leve 2 - Zero Açúcar", tier: "primary" },
  { id: "avulso", label: "1 Copo", tier: "secondary" },
  { id: "avulso-zero", label: "1 Copo Zero", tier: "secondary" },
] as const

/** Alias mantido pra compatibilidade dos imports existentes. */
export const homeCategories = categories
/** Subset usado pela página /avulso (mantida como landing direta). */
export const avulsoCategories = categories.filter(
  (c) => c.id === "avulso" || c.id === "avulso-zero",
)

/**
 * Para um produto avulso (1 copo), retorna o combo equivalente "Pague 1 Leve 2"
 * de mesmo tamanho e mesma versão (zero ou tradicional). Retorna `null` se não
 * existe combo correspondente ou se o produto já é um combo.
 */
export function findComboEquivalent(product: Product): Product | null {
  if (product.category !== "avulso" && product.category !== "avulso-zero") return null
  const targetCategory: ProductCategory =
    product.category === "avulso-zero" ? "pague-leve-zero" : "pague-leve"
  return products.find((p) => p.category === targetCategory && p.size === product.size) ?? null
}

export interface AvulsoPricing {
  /** Total em reais somando combos + sobras de avulso. */
  total: number
  /** Quantos combos "Pague 1 Leve 2" se aplicam (cada combo = 2 copos). */
  comboPairs: number
  /** Sobra (1 copo solo) que não fechou par. */
  remainder: number
  /** Preço do combo equivalente, ou null se o produto não tem combo. */
  comboUnitPrice: number | null
  /** Quanto o cliente economiza vs comprar tudo avulso. */
  savings: number
}

/**
 * Calcula o preço total de um avulso aplicando o combo Pague 1 Leve 2 quando
 * possível. Cada par de copos vira um combo (preço cheio do combo); sobra
 * impar permanece como avulso.
 */
export function calculateAvulsoTotal(product: Product, quantity: number): AvulsoPricing {
  const combo = findComboEquivalent(product)
  if (!combo || quantity < 2) {
    return {
      total: product.price * quantity,
      comboPairs: 0,
      remainder: quantity,
      comboUnitPrice: combo?.price ?? null,
      savings: 0,
    }
  }
  const comboPairs = Math.floor(quantity / 2)
  const remainder = quantity % 2
  const total = comboPairs * combo.price + remainder * product.price
  const withoutCombo = quantity * product.price
  return {
    total,
    comboPairs,
    remainder,
    comboUnitPrice: combo.price,
    savings: Math.max(0, withoutCombo - total),
  }
}

export const photoReviews = [
  {
    name: "Laysa",
    rating: 5,
    text: "Chegou geladinho, bem embalado e do jeito que pedi.",
    photo: "https://images.unsplash.com/photo-1623123565568-fa5d6f47e837?w=200&h=200&fit=crop",
  },
  {
    name: "Nadia",
    rating: 5,
    text: "Sinceramente? Melhor custo-benefício que já vi! Açaí bom, preço sensacional e entrega rápida.",
    photo: "https://images.unsplash.com/photo-1638176067000-9e2afc6c4f3f?w=200&h=200&fit=crop",
  },
  {
    name: "Aline",
    rating: 5,
    text: "Pedi pra testar e agora já viciei kkk",
    photo: "https://images.unsplash.com/photo-1546039907-7fa05f864c02?w=200&h=200&fit=crop",
  },
  {
    name: "Kamilly",
    rating: 5,
    text: "Quando vi o preço achei q ia ser pequeno, mas me enganei! Vem bem servido e a qualidade é absurda.",
    photo: "https://images.unsplash.com/photo-1490323948693-bd95e2916ade?w=200&h=200&fit=crop",
  },
  {
    name: "Karol",
    rating: 5,
    text: "entregaram dentro do prazo e o açaí é delicioso! Vou pedir mais loguinhoo",
    photo: "https://images.unsplash.com/photo-1626203519030-5a1da11a6cea?w=200&h=200&fit=crop",
  },
  {
    name: "Talita",
    rating: 5,
    text: "Açaí cremoso, bem montado e chegou intacto. Parabéns a franquia.",
    photo: "https://images.unsplash.com/photo-1571805341302-f857506f6435?w=200&h=200&fit=crop",
  },
  {
    name: "Aline",
    rating: 5,
    text: "Bom, barato e entrega rápida. Não tem erro, semana que vem peço de novo",
    photo: "https://images.unsplash.com/photo-1502741126161-b048400d085d?w=200&h=200&fit=crop",
  },
  {
    name: "Iana",
    rating: 5,
    text: "Pedi pela primeira vez e td mundo gostou, vamos pedir mais!",
    photo: "https://images.unsplash.com/photo-1488477181946-6428a0291777?w=200&h=200&fit=crop",
  },
  {
    name: "Gustavo",
    rating: 5,
    text: "Açaí top, amei",
    photo: "https://images.unsplash.com/photo-1553530666-ba11a7da3888?w=200&h=200&fit=crop",
  },
  {
    name: "Iana",
    rating: 5,
    text: "Gostei muito Sério kkk",
    photo: "https://images.unsplash.com/photo-1505252585461-04db1eb84625?w=200&h=200&fit=crop",
  },
  {
    name: "Mari",
    rating: 5,
    text: "Muito bom, esta de parabéns",
    photo: "https://images.unsplash.com/photo-1607478900766-efe13248b125?w=200&h=200&fit=crop",
  },
  {
    name: "Ana",
    rating: 5,
    text: 'Me deram um pacotinho de Bala Fini de Brinde no primeiro pedido escrito "para adoçar seu dia", ameiiii nota 10!!!!',
    photo: "https://images.unsplash.com/photo-1497034825429-c343d7c6a68f?w=200&h=200&fit=crop",
  },
]

export const testimonials = [
  {
    name: "Thiago P.",
    initial: "T",
    timeAgo: "Há 2 horas",
    text: "Chegou bem embalado e geladinho. O creme é divino, super cremoso. Recomendo demais!",
  },
  {
    name: "Rafael T.",
    initial: "R",
    timeAgo: "Há 95 min",
    text: "Entrega muito rápida! Pedi os 2 copos de 700ml e ficou sensacional. Veio bem recheado e o tamanho é ótimo.",
  },
  {
    name: "Gustavo N.",
    initial: "G",
    timeAgo: "Há 44 min",
    text: "Melhor açaí que já pedi no delivery. Veio cheio de complementos e com uma cremosidade incrível. Dá pra ver que usam ingredientes de qualidade.",
  },
  {
    name: "Felipe M.",
    initial: "F",
    timeAgo: "Há 82 min",
    text: "Melhor custo-benefício da cidade. Virei cliente fiel depois do primeiro pedido.",
  },
  {
    name: "Camila R.",
    initial: "C",
    timeAgo: "Há 72 min",
    text: "Único lugar que acerto sempre! Os complementos são generosos e o açaí é o mais cremoso da região.",
  },
  {
    name: "Mariana S.",
    initial: "M",
    timeAgo: "Há 112 min",
    text: "Qualidade excelente e preço honesto. A promoção Pague 1 Leve 2 é imperdível! Já é o meu delivery favorito.",
  },
]

export const states = [
  "Acre",
  "Alagoas",
  "Amapá",
  "Amazonas",
  "Bahia",
  "Ceará",
  "Distrito Federal",
  "Espírito Santo",
  "Goiás",
  "Maranhão",
  "Mato Grosso",
  "Mato Grosso do Sul",
  "Minas Gerais",
  "Pará",
  "Paraíba",
  "Paraná",
  "Pernambuco",
  "Piauí",
  "Rio de Janeiro",
  "Rio Grande do Norte",
  "Rio Grande do Sul",
  "Rondônia",
  "Roraima",
  "Santa Catarina",
  "São Paulo",
  "Sergipe",
  "Tocantins",
]

export const citiesByState: Record<string, string[]> = {
  "Rio de Janeiro": [
    "Angra dos Reis",
    "Rio de Janeiro",
    "Niterói",
    "São Gonçalo",
    "Duque de Caxias",
    "Nova Iguaçu",
    "Petrópolis",
    "Volta Redonda",
    "Campos dos Goytacazes",
    "Macaé",
  ],
  "São Paulo": ["São Paulo", "Campinas", "Santos", "Guarulhos", "Osasco", "São Bernardo do Campo"],
  "Minas Gerais": ["Belo Horizonte", "Uberlândia", "Contagem", "Juiz de Fora", "Betim"],
}

export const coberturas = [
  "Amora",
  "Caramelo",
  "Chocolate",
  "Leite condensado",
  "Maracujá",
  "Mel",
  "Menta",
  "Morango",
]

export const frutas = ["Abacaxi", "Banana", "Kiwi", "Manga", "Morango", "Uva"]

export const complementos = [
  "Amendoim",
  "Aveia",
  "Castanha de caju",
  "Chocoball",
  "Confete",
  "Creme de banana",
  "Creme de mousse de maracujá",
  "Creme de morango",
  "Farinha de cereais",
  "Gotas de chocolate",
  "Granola",
  "Leite em pó",
  "Ovomaltine",
  "Paçoca",
  "Sucrilhos",
]

export const turbines = [
  { name: "Bis (3 un)", free: true },
  { name: "Chantilly", free: true },
  { name: "Nutella", free: true },
  { name: "01 bola de sorvete de creme", free: true },
  { name: "Creme de Ninho", free: true },
  { name: "Creme de Oreo", free: true },
  { name: "KitKat", free: true },
]

/** Pedido mínimo em reais para finalizar a compra. */
export const MIN_ORDER_VALUE = 10

// =====================================================================
// Frete
// =====================================================================

export type ShippingMethod = "standard" | "express"

export interface ShippingOption {
  id: ShippingMethod
  label: string
  /** Preço em reais (0 = grátis). */
  price: number
  /** Janela mínima e máxima de entrega em minutos. */
  etaMinMinutes: number
  etaMaxMinutes: number
  description: string
  /** Badge curto opcional pra destacar (ex: "Mais rápido"). */
  badge?: string
}

export const shippingOptions: readonly ShippingOption[] = [
  {
    id: "standard",
    label: "Padrão",
    price: 0,
    etaMinMinutes: 30,
    etaMaxMinutes: 50,
    description: "Entrega em 30-50 min",
  },
  {
    id: "express",
    label: "Express",
    price: 4.9,
    etaMinMinutes: 10,
    etaMaxMinutes: 20,
    description: "Entrega em 10-20 min",
    badge: "Mais rápido",
  },
] as const

export function getShippingOption(method: ShippingMethod): ShippingOption {
  return shippingOptions.find((o) => o.id === method) ?? shippingOptions[0]
}
