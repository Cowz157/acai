"use client"

import Image from "next/image"
import Link from "next/link"
import { useEffect, useMemo, useRef, useState } from "react"
import { ArrowLeft, Check, ChevronDown, Flame, Minus, Plus, ShoppingBag, Sparkles, Ticket } from "lucide-react"
import {
  calculateAvulsoTotal,
  coberturas,
  complementos,
  findComboEquivalent,
  frutas,
  turbines,
  type Product,
} from "@/lib/data"
import { useCart, type CartItemOptions } from "@/lib/cart-store"
import { calculateCouponDiscount, useActiveCoupon } from "@/lib/coupon-url"
import { formatMoney } from "@/lib/format"
import { OptionStepper } from "./option-stepper"
import { cn } from "@/lib/utils"

type Selection = Record<string, number>

interface SectionProps {
  title: string
  subtitle: string
  max: number
  items: { name: string; free?: boolean }[]
  selection: Selection
  onChange: (next: Selection) => void
  open: boolean
  onToggle: () => void
}

function Section({ title, subtitle, max, items, selection, onChange, open, onToggle }: SectionProps) {
  const total = items.reduce((sum, it) => sum + (selection[it.name] ?? 0), 0)
  const isMaxed = total >= max
  const isComplete = total >= 1

  const setValue = (name: string, delta: number) => {
    const current = selection[name] ?? 0
    const next = Math.max(0, current + delta)
    if (delta > 0 && total >= max) return
    onChange({ ...selection, [name]: next })
  }

  return (
    <div className="overflow-hidden rounded-lg border border-border bg-white">
      <button
        type="button"
        onClick={onToggle}
        className="flex w-full items-center justify-between gap-3 bg-[#F3F4F6] px-4 py-3 text-left"
      >
        <div className="min-w-0">
          <div className="text-sm font-bold text-foreground md:text-base">{title}</div>
          <div className="text-xs text-muted-foreground">{subtitle}</div>
        </div>
        <div className="flex flex-shrink-0 items-center gap-2">
          <span className="rounded-full bg-foreground px-2.5 py-0.5 text-xs font-bold tabular-nums text-white">
            {total}/{max}
          </span>
          <span
            className={cn(
              "flex h-5 w-5 items-center justify-center rounded-full transition",
              isComplete ? "bg-success" : "bg-border",
            )}
          >
            <Check className={cn("h-3 w-3 transition", isComplete ? "text-white" : "text-muted-foreground/50")} />
          </span>
          <ChevronDown className={cn("h-4 w-4 text-muted-foreground transition", open && "rotate-180")} />
        </div>
      </button>

      {open && (
        <ul className="divide-y divide-border bg-white">
          {items.map((item) => {
            const value = selection[item.name] ?? 0
            return (
              <li key={item.name} className="flex items-center justify-between gap-3 px-4 py-3">
                <div className="min-w-0">
                  <div className="text-sm font-medium text-foreground">{item.name}</div>
                  {item.free && <div className="text-xs font-semibold text-success">Grátis no 1º pedido</div>}
                </div>
                <OptionStepper
                  value={value}
                  onIncrement={() => setValue(item.name, 1)}
                  onDecrement={() => setValue(item.name, -1)}
                  canIncrement={!isMaxed}
                />
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}

function selectionToOptions(selection: Selection) {
  return Object.entries(selection)
    .filter(([, qty]) => qty > 0)
    .map(([name, quantity]) => ({ name, quantity }))
}

function buildSelectedOptions(
  coberturasSel: Selection,
  frutasSel: Selection,
  complementosSel: Selection,
  turbinesSel: Selection,
): CartItemOptions {
  return {
    coberturas: selectionToOptions(coberturasSel),
    frutas: selectionToOptions(frutasSel),
    complementos: selectionToOptions(complementosSel),
    turbine: selectionToOptions(turbinesSel),
  }
}

function summarizeCup(c: number, f: number, cp: number, t: number): string {
  const parts: string[] = []
  if (c > 0) parts.push(`${c} ${c === 1 ? "cobertura" : "coberturas"}`)
  if (f > 0) parts.push(`${f} ${f === 1 ? "fruta" : "frutas"}`)
  if (cp > 0) parts.push(`${cp} ${cp === 1 ? "complemento" : "complementos"}`)
  if (t > 0) parts.push("turbine")
  if (parts.length === 0) return "Nada escolhido ainda"
  return parts.join(", ")
}

/** Estrutura genérica de seleção de 1 copo. Usado pros "copos extras" (Cup 2..N).
 *  Cup 1 mantém states separados pra preservar a lógica de auto-advance + scroll. */
interface CupSel {
  coberturas: Selection
  frutas: Selection
  complementos: Selection
  turbines: Selection
}
const emptyCupSel = (): CupSel => ({ coberturas: {}, frutas: {}, complementos: {}, turbines: {} })
const cupTotals = (c: CupSel) => ({
  cob: Object.values(c.coberturas).reduce((s, v) => s + v, 0),
  fru: Object.values(c.frutas).reduce((s, v) => s + v, 0),
  com: Object.values(c.complementos).reduce((s, v) => s + v, 0),
  tur: Object.values(c.turbines).reduce((s, v) => s + v, 0),
})
const cupSelToOptions = (c: CupSel): CartItemOptions =>
  buildSelectedOptions(c.coberturas, c.frutas, c.complementos, c.turbines)

const SECTION_MAXES = [2, 2, 4, 1] as const
const isCupComplete = (totals: ReturnType<typeof cupTotals>) =>
  totals.cob === 2 && totals.fru === 2 && totals.com === 4 && totals.tur === 1

/** Limite máximo de copos físicos por unidade adicionada ao carrinho.
 *  Aplica DUAS regras:
 *   1. Stepper de quantity não permite ultrapassar esse total de copos
 *      (combo qty máx = MAX/2, avulso qty máx = MAX).
 *   2. Toggle "Cada um diferente" só aparece quando o total de copos cabe nesse limite.
 *  6 cobre festa pequena / casa cheia sem explodir UX nem operacional —
 *  pedidos maiores devem ser fracionados em items separados. */
const MAX_CUPS_PER_ITEM = 6

export function ProductCustomizer({ product }: { product: Product }) {
  // Cup 1 (sempre presente, mantém states separados pra auto-advance com scroll)
  const [coberturasSel, setCoberturasSel] = useState<Selection>({})
  const [frutasSel, setFrutasSel] = useState<Selection>({})
  const [complementosSel, setComplementosSel] = useState<Selection>({})
  const [turbinesSel, setTurbinesSel] = useState<Selection>({})
  /** Seção aberta do Cup 1 (0..3, ou null). */
  const [openSection, setOpenSection] = useState<number | null>(0)

  // Cups extras (2..N) — array dinâmico que sincroniza com numTotalCups
  const [extraCups, setExtraCups] = useState<CupSel[]>([])
  const [openSectionExtras, setOpenSectionExtras] = useState<Array<number | null>>([])

  const [differentCups, setDifferentCups] = useState(false)
  /** Acordeão entre cups. 1 = Cup 1, 2..N = extras (1-indexed). */
  const [openCup, setOpenCup] = useState<number>(1)

  const [detail, setDetail] = useState("")
  const [quantity, setQuantity] = useState(1)

  const isAddon = product.kind === "addon"
  const isAvulso = product.category === "avulso" || product.category === "avulso-zero"
  const isCombo = product.category === "pague-leve" || product.category === "pague-leve-zero"

  const coupon = useActiveCoupon()
  const couponDiscount = coupon ? calculateCouponDiscount(coupon, product.price) : 0
  const priceWithCoupon = product.price - couponDiscount
  const showCouponPrice = coupon !== null && couponDiscount > 0

  const addItem = useCart((s) => s.addItem)
  const setCartOpen = useCart((s) => s.setOpen)
  const cartItemCount = useCart((s) => s.items.reduce((sum, it) => sum + it.quantity, 0))

  const pricing = useMemo(() => {
    if (!isAvulso) {
      return {
        total: product.price * quantity,
        comboPairs: 0,
        remainder: quantity,
        comboUnitPrice: null,
        savings: 0,
      }
    }
    return calculateAvulsoTotal(product, quantity)
  }, [product, quantity, isAvulso])
  const total = pricing.total
  const comboApplied = pricing.comboPairs > 0
  const couponUnitDiscount = coupon ? calculateCouponDiscount(coupon, product.price) : 0
  const totalWithCoupon = Math.max(0, total - couponUnitDiscount)

  // Número total de copos físicos que o cliente vai levar
  // (combo direto = 2 copos por unidade, avulso = 1 por unidade).
  const numTotalCups = isCombo ? quantity * 2 : quantity

  // Limite hard de quantity no stepper, derivado de MAX_CUPS_PER_ITEM:
  //  - combo direto: até MAX/2 unidades (= MAX copos)
  //  - avulso: até MAX unidades (= MAX copos)
  //  - addon (acessório qualquer): sem limite específico
  const maxQuantity = isAddon
    ? Number.POSITIVE_INFINITY
    : isCombo
      ? Math.floor(MAX_CUPS_PER_ITEM / 2)
      : MAX_CUPS_PER_ITEM
  const atMaxQuantity = quantity >= maxQuantity

  // Toggle "Cada um diferente" aparece quando o total de copos físicos cabe
  // no limite MAX_CUPS_PER_ITEM. Como maxQuantity já garante isso, basta
  // checar que há pelo menos 2 copos pra fazer sentido a personalização.
  const canDifferentiate = !isAddon && numTotalCups >= 2 && numTotalCups <= MAX_CUPS_PER_ITEM

  // Se cliente ativou "diferentes" e depois mudou quantity quebrando a regra,
  // volta automático pra "iguais" — evita estado inconsistente no addToCart.
  useEffect(() => {
    if (!canDifferentiate && differentCups) {
      setDifferentCups(false)
    }
  }, [canDifferentiate, differentCups])

  // Quando ativa o modo "diferentes", abre o Cup 1 por default
  useEffect(() => {
    if (differentCups) setOpenCup(1)
  }, [differentCups])

  // Sincroniza length de extraCups + openSectionExtras com numTotalCups - 1
  const numExtras = Math.max(0, numTotalCups - 1)
  useEffect(() => {
    setExtraCups((curr) => {
      if (curr.length === numExtras) return curr
      if (curr.length < numExtras) {
        return [...curr, ...Array.from({ length: numExtras - curr.length }, emptyCupSel)]
      }
      return curr.slice(0, numExtras)
    })
    setOpenSectionExtras((curr) => {
      if (curr.length === numExtras) return curr
      if (curr.length < numExtras) {
        return [...curr, ...Array.from({ length: numExtras - curr.length }, () => 0 as number | null)]
      }
      return curr.slice(0, numExtras)
    })
  }, [numExtras])

  const coberturasItems = coberturas.map((c) => ({ name: c }))
  const frutasItems = frutas.map((c) => ({ name: c }))
  const complementosItems = complementos.map((c) => ({ name: c }))

  // Totais do Cup 1 (pra auto-advance e pra header de resumo)
  const coberturasTotal = useMemo(
    () => Object.values(coberturasSel).reduce((s, v) => s + v, 0),
    [coberturasSel],
  )
  const frutasTotal = useMemo(() => Object.values(frutasSel).reduce((s, v) => s + v, 0), [frutasSel])
  const complementosTotal = useMemo(
    () => Object.values(complementosSel).reduce((s, v) => s + v, 0),
    [complementosSel],
  )
  const turbinesTotal = useMemo(() => Object.values(turbinesSel).reduce((s, v) => s + v, 0), [turbinesSel])

  const cup1Summary = summarizeCup(coberturasTotal, frutasTotal, complementosTotal, turbinesTotal)
  const cup1Complete = isCupComplete({
    cob: coberturasTotal, fru: frutasTotal, com: complementosTotal, tur: turbinesTotal,
  })

  // Refs pras seções do Cup 1 (auto-advance com scroll)
  const sectionRefs = useRef<Array<HTMLDivElement | null>>([null, null, null, null])
  const autoAdvancedRef = useRef(false)

  // Auto-advance das seções do Cup 1
  useEffect(() => {
    if (openSection === null) return
    const totals = [coberturasTotal, frutasTotal, complementosTotal, turbinesTotal]
    if (totals[openSection] < SECTION_MAXES[openSection]) return
    const next = openSection + 1 < SECTION_MAXES.length ? openSection + 1 : null
    autoAdvancedRef.current = next !== null
    setOpenSection(next)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [coberturasTotal, frutasTotal, complementosTotal, turbinesTotal])

  /** Suprime o próximo disparo do auto-advance de um extra cup específico —
   *  usado quando o cliente clica em "Copiar do Copo 1" naquele cup. */
  const suppressExtraAutoAdvanceRefs = useRef<Set<number>>(new Set())

  // Auto-advance das seções dentro de cada extra cup
  useEffect(() => {
    if (!differentCups) return
    setOpenSectionExtras((curr) => {
      let changed = false
      const next = curr.map((openSec, idx) => {
        if (suppressExtraAutoAdvanceRefs.current.has(idx)) {
          suppressExtraAutoAdvanceRefs.current.delete(idx)
          return openSec
        }
        if (openSec === null) return openSec
        const cup = extraCups[idx]
        if (!cup) return openSec
        const t = cupTotals(cup)
        const totalsArr = [t.cob, t.fru, t.com, t.tur]
        if (totalsArr[openSec] < SECTION_MAXES[openSec]) return openSec
        const nextSec = openSec + 1 < SECTION_MAXES.length ? openSec + 1 : null
        changed = true
        return nextSec
      })
      return changed ? next : curr
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [extraCups, differentCups])

  // Auto-abre próximo cup quando o atual fica 100% preenchido.
  // Dispara só 1x por cup via ref pra não reabrir se o cliente fechar manualmente.
  const autoOpenedCupRefs = useRef<Set<number>>(new Set())
  useEffect(() => {
    if (!differentCups) {
      autoOpenedCupRefs.current = new Set()
      return
    }
    if (openCup === 1 && cup1Complete && !autoOpenedCupRefs.current.has(1) && numTotalCups >= 2) {
      autoOpenedCupRefs.current.add(1)
      setOpenCup(2)
      return
    }
    const extraIdx = openCup - 2
    if (extraIdx >= 0 && extraIdx < extraCups.length && !autoOpenedCupRefs.current.has(openCup)) {
      const cup = extraCups[extraIdx]
      if (cup && isCupComplete(cupTotals(cup)) && openCup < numTotalCups) {
        autoOpenedCupRefs.current.add(openCup)
        setOpenCup(openCup + 1)
      }
    }
  }, [openCup, differentCups, cup1Complete, extraCups, numTotalCups])

  // Reset dos refs de auto-open quando quantity muda (cups são recriados/removidos)
  useEffect(() => {
    autoOpenedCupRefs.current = new Set()
  }, [quantity])

  // Scroll automático após auto-advance do Cup 1
  useEffect(() => {
    if (!autoAdvancedRef.current) return
    autoAdvancedRef.current = false
    if (openSection === null) return
    const id1 = requestAnimationFrame(() => {
      const id2 = requestAnimationFrame(() => {
        sectionRefs.current[openSection]?.scrollIntoView({ behavior: "smooth", block: "start" })
      })
      ;(window as unknown as { __scrollRaf?: number }).__scrollRaf = id2
    })
    return () => {
      cancelAnimationFrame(id1)
      const stored = (window as unknown as { __scrollRaf?: number }).__scrollRaf
      if (stored) cancelAnimationFrame(stored)
    }
  }, [openSection])

  const toggleSection = (idx: number) => {
    setOpenSection((current) => (current === idx ? null : idx))
  }
  const toggleExtraSection = (extraIdx: number, sectionIdx: number) => {
    setOpenSectionExtras((curr) => {
      const next = [...curr]
      next[extraIdx] = next[extraIdx] === sectionIdx ? null : sectionIdx
      return next
    })
  }

  const updateExtraCup = (extraIdx: number, key: keyof CupSel, sel: Selection) => {
    setExtraCups((curr) => {
      const next = [...curr]
      next[extraIdx] = { ...next[extraIdx], [key]: sel }
      return next
    })
  }

  const copyCup1ToExtra = (extraIdx: number) => {
    // Marca antes pra suprimir cascata de auto-advance
    suppressExtraAutoAdvanceRefs.current.add(extraIdx)
    setExtraCups((curr) => {
      const next = [...curr]
      next[extraIdx] = {
        coberturas: { ...coberturasSel },
        frutas: { ...frutasSel },
        complementos: { ...complementosSel },
        turbines: { ...turbinesSel },
      }
      return next
    })
    setOpenSectionExtras((curr) => {
      const next = [...curr]
      next[extraIdx] = null
      return next
    })
  }

  const handleAddToCart = () => {
    const cup1Options = buildSelectedOptions(coberturasSel, frutasSel, complementosSel, turbinesSel)
    const extraCupsOptions = differentCups ? extraCups.map(cupSelToOptions) : []
    const allCups = [cup1Options, ...extraCupsOptions]
    const obs = detail.trim()

    // Avulso com combo aplicado: distribui cups entre 1 item de combo + (opcional) 1 item avulso
    if (isAvulso && pricing.comboPairs > 0) {
      const combo = findComboEquivalent(product)
      if (combo) {
        const cupsInCombo = pricing.comboPairs * 2
        const comboFirst = allCups[0] ?? cup1Options
        const comboExtras = allCups.slice(1, cupsInCombo)

        addItem({
          productId: combo.slug,
          productName: combo.name,
          productImage: combo.image,
          basePrice: combo.price,
          quantity: pricing.comboPairs,
          observations: obs,
          selectedOptions: comboFirst,
          additionalCupsOptions: differentCups && comboExtras.length > 0 ? comboExtras : null,
        })

        if (pricing.remainder > 0) {
          const remainderFirst = allCups[cupsInCombo] ?? cup1Options
          const remainderExtras = allCups.slice(cupsInCombo + 1)
          addItem({
            productId: product.slug,
            productName: product.name,
            productImage: product.image,
            basePrice: product.price,
            quantity: pricing.remainder,
            observations: obs,
            selectedOptions: remainderFirst,
            additionalCupsOptions:
              differentCups && remainderExtras.length > 0 ? remainderExtras : null,
          })
        }
        setCartOpen(true)
        return
      }
    }

    // Caso padrão (combo direto, addon, ou avulso com qty 1)
    addItem({
      productId: product.slug,
      productName: product.name,
      productImage: product.image,
      basePrice: product.price,
      quantity,
      observations: obs,
      selectedOptions: cup1Options,
      additionalCupsOptions:
        differentCups && extraCupsOptions.length > 0 ? extraCupsOptions : null,
    })
    setCartOpen(true)
  }

  // Helper pra label do toggle conforme nº de cups
  const togglePromptLabel =
    numTotalCups === 2
      ? "Como você quer os 2 copos?"
      : `Como você quer os ${numTotalCups} copos?`

  return (
    <div className="min-h-screen bg-muted/40 pb-[140px] md:pb-32">
      {/* Header com voltar — sticky no topo enquanto rola */}
      <div className="sticky top-0 z-30 bg-primary px-4 py-3 shadow-sm">
        <Link
          href="/"
          className="inline-flex items-center gap-2 rounded-full bg-white/15 px-4 py-1.5 text-sm font-semibold text-white transition hover:bg-white/25"
        >
          <ArrowLeft className="h-4 w-4" />
          VOLTAR
        </Link>
      </div>

      <div className="mx-auto max-w-3xl px-4 py-6">
        {/* Card produto */}
        <div className="rounded-2xl border border-border bg-white p-4 shadow-sm md:p-6">
          <div className="flex flex-col gap-4 md:flex-row md:items-center">
            <div className="relative mx-auto h-44 w-44 shrink-0 md:mx-0 md:h-48 md:w-48">
              <Image
                src={product.image || "/placeholder.svg"}
                alt={product.name}
                fill
                className="object-contain"
                sizes="(max-width: 768px) 176px, 192px"
                priority
              />
            </div>
            <div className="flex-1">
              <h1 className="text-xl font-bold text-foreground md:text-2xl">{product.name}</h1>
              {!isAddon && product.freebies > 0 && (
                <p className="mt-1 text-sm text-muted-foreground">{product.freebies} Complementos Grátis</p>
              )}
              {isAddon && product.description && (
                <p className="mt-1 text-sm text-muted-foreground">{product.description}</p>
              )}

              <div className="mt-3">
                {product.oldPrice > product.price ? (
                  <>
                    <div className="text-xs text-muted-foreground">de</div>
                    <div className="text-sm text-muted-foreground line-through">R$ {formatMoney(product.oldPrice)}</div>
                    <div className="text-xs text-muted-foreground">por</div>
                  </>
                ) : null}
                <div className="text-2xl font-extrabold text-success md:text-3xl">R$ {formatMoney(product.price)}</div>
              </div>
              {showCouponPrice && (
                <div className="mt-2 inline-flex w-fit items-center gap-2 rounded-lg border border-dashed border-primary bg-primary-soft px-3 py-1.5">
                  <Ticket className="h-3.5 w-3.5 shrink-0 text-primary" />
                  <span className="text-[10px] font-bold uppercase tracking-wide text-primary/80 md:text-[11px]">
                    com cupom {coupon.code}
                  </span>
                  <span className="text-sm font-extrabold text-primary md:text-base">
                    R$ {formatMoney(priceWithCoupon)}
                  </span>
                </div>
              )}
              {!isAddon && !comboApplied && (
                <div className="mt-3 inline-flex items-center gap-1.5 rounded-full bg-primary-soft px-3 py-1 text-xs font-semibold text-primary">
                  <Flame className="h-3.5 w-3.5" /> Promoção válida só hoje
                </div>
              )}
              {comboApplied && quantity === 2 && (
                <div className="mt-3 rounded-lg border-2 border-success bg-success-soft px-3 py-2 text-xs text-success md:text-sm">
                  <div className="flex items-center gap-1.5 font-extrabold">
                    <Sparkles className="h-3.5 w-3.5" />
                    Promoção Pague 1, Leve 2 aplicada!
                  </div>
                  <div className="mt-0.5">
                    Você economiza{" "}
                    <strong className="font-extrabold">R$ {formatMoney(pricing.savings)}</strong> levando o combo.
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Toggle "Iguais / Cada um diferente" — aparece pra qty 2..MAX_DIFFERENT_CUPS */}
        {canDifferentiate && (
          <div className="mt-4 rounded-xl border border-dashed border-primary/60 bg-primary-soft/30 px-4 py-3">
            <div className="inline-flex items-center gap-1.5 text-sm font-semibold text-primary">
              <Sparkles className="h-3.5 w-3.5 shrink-0" />
              <span>{togglePromptLabel}</span>
            </div>
            <div className="mt-2.5 grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setDifferentCups(false)}
                className={cn(
                  "rounded-lg border px-3 py-2 text-xs font-bold transition md:text-sm",
                  !differentCups
                    ? "border-primary bg-primary text-white shadow-sm"
                    : "border-border bg-white text-foreground hover:border-primary/40",
                )}
              >
                Iguais
              </button>
              <button
                type="button"
                onClick={() => setDifferentCups(true)}
                className={cn(
                  "rounded-lg border px-3 py-2 text-xs font-bold transition md:text-sm",
                  differentCups
                    ? "border-primary bg-primary text-white shadow-sm"
                    : "border-border bg-white text-foreground hover:border-primary/40",
                )}
              >
                Cada um diferente
              </button>
            </div>
          </div>
        )}

        {/* Modo "iguais" — 1 conjunto de seções (Cup 1) */}
        {!isAddon && !differentCups && (
          <div className="mt-5 space-y-4">
            <div ref={(el) => { sectionRefs.current[0] = el }} className="scroll-mt-20">
              <Section
                title="Coberturas" subtitle="Escolha até 2 opções" max={2}
                items={coberturasItems} selection={coberturasSel} onChange={setCoberturasSel}
                open={openSection === 0} onToggle={() => toggleSection(0)}
              />
            </div>
            <div ref={(el) => { sectionRefs.current[1] = el }} className="scroll-mt-20">
              <Section
                title="Frutas" subtitle="Escolha até 2 opções" max={2}
                items={frutasItems} selection={frutasSel} onChange={setFrutasSel}
                open={openSection === 1} onToggle={() => toggleSection(1)}
              />
            </div>
            <div ref={(el) => { sectionRefs.current[2] = el }} className="scroll-mt-20">
              <Section
                title="Complementos" subtitle="Escolha até 4 opções" max={4}
                items={complementosItems} selection={complementosSel} onChange={setComplementosSel}
                open={openSection === 2} onToggle={() => toggleSection(2)}
              />
            </div>
            <div ref={(el) => { sectionRefs.current[3] = el }} className="scroll-mt-20">
              <Section
                title="Turbine seu açaí" subtitle="Escolha até 1 opção" max={1}
                items={turbines} selection={turbinesSel} onChange={setTurbinesSel}
                open={openSection === 3} onToggle={() => toggleSection(3)}
              />
            </div>
          </div>
        )}

        {/* Modo "cada um diferente" — acordeão de N cups (1 aberto por vez) */}
        {!isAddon && differentCups && (
          <div className="mt-4 space-y-3">
            {/* Cup 1 */}
            <div className="overflow-hidden rounded-2xl border-2 border-primary/30 bg-white shadow-sm">
              <button
                type="button"
                onClick={() => setOpenCup((c) => (c === 1 ? 0 : 1))}
                className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left"
              >
                <div className="flex min-w-0 items-center gap-2.5">
                  <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary text-xs font-extrabold text-white">
                    1
                  </span>
                  <div className="min-w-0">
                    <div className="text-sm font-bold text-primary md:text-base">
                      Copo 1 <span className="text-muted-foreground">de {numTotalCups}</span>
                    </div>
                    <div className="truncate text-[11px] text-muted-foreground md:text-xs">{cup1Summary}</div>
                  </div>
                </div>
                <ChevronDown className={cn("h-4 w-4 shrink-0 text-primary transition", openCup === 1 && "rotate-180")} />
              </button>
              {openCup === 1 && (
                <div className="space-y-3 border-t border-primary/15 bg-muted/30 p-3 md:p-4">
                  <Section
                    title="Coberturas" subtitle="Escolha até 2 opções" max={2}
                    items={coberturasItems} selection={coberturasSel} onChange={setCoberturasSel}
                    open={openSection === 0} onToggle={() => toggleSection(0)}
                  />
                  <Section
                    title="Frutas" subtitle="Escolha até 2 opções" max={2}
                    items={frutasItems} selection={frutasSel} onChange={setFrutasSel}
                    open={openSection === 1} onToggle={() => toggleSection(1)}
                  />
                  <Section
                    title="Complementos" subtitle="Escolha até 4 opções" max={4}
                    items={complementosItems} selection={complementosSel} onChange={setComplementosSel}
                    open={openSection === 2} onToggle={() => toggleSection(2)}
                  />
                  <Section
                    title="Turbine seu açaí" subtitle="Escolha até 1 opção" max={1}
                    items={turbines} selection={turbinesSel} onChange={setTurbinesSel}
                    open={openSection === 3} onToggle={() => toggleSection(3)}
                  />
                </div>
              )}
            </div>

            {/* Cups extras */}
            {extraCups.map((cup, extraIdx) => {
              const cupNumber = extraIdx + 2
              const isOpen = openCup === cupNumber
              const t = cupTotals(cup)
              const summary = summarizeCup(t.cob, t.fru, t.com, t.tur)
              const sectionOpen = openSectionExtras[extraIdx] ?? null
              return (
                <div key={extraIdx} className="overflow-hidden rounded-2xl border-2 border-primary/30 bg-white shadow-sm">
                  <button
                    type="button"
                    onClick={() => setOpenCup((c) => (c === cupNumber ? 0 : cupNumber))}
                    className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left"
                  >
                    <div className="flex min-w-0 items-center gap-2.5">
                      <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary text-xs font-extrabold text-white">
                        {cupNumber}
                      </span>
                      <div className="min-w-0">
                        <div className="text-sm font-bold text-primary md:text-base">
                          Copo {cupNumber} <span className="text-muted-foreground">de {numTotalCups}</span>
                        </div>
                        <div className="truncate text-[11px] text-muted-foreground md:text-xs">{summary}</div>
                      </div>
                    </div>
                    <ChevronDown className={cn("h-4 w-4 shrink-0 text-primary transition", isOpen && "rotate-180")} />
                  </button>
                  {isOpen && (
                    <div className="space-y-3 border-t border-primary/15 bg-muted/30 p-3 md:p-4">
                      <button
                        type="button"
                        onClick={() => copyCup1ToExtra(extraIdx)}
                        className="inline-flex items-center gap-1.5 rounded-full border border-primary/40 bg-white px-3 py-1 text-[11px] font-semibold text-primary transition hover:bg-primary-soft md:text-xs"
                      >
                        <Sparkles className="h-3 w-3" />
                        Copiar do Copo 1
                      </button>
                      <Section
                        title="Coberturas" subtitle="Escolha até 2 opções" max={2}
                        items={coberturasItems} selection={cup.coberturas}
                        onChange={(s) => updateExtraCup(extraIdx, "coberturas", s)}
                        open={sectionOpen === 0} onToggle={() => toggleExtraSection(extraIdx, 0)}
                      />
                      <Section
                        title="Frutas" subtitle="Escolha até 2 opções" max={2}
                        items={frutasItems} selection={cup.frutas}
                        onChange={(s) => updateExtraCup(extraIdx, "frutas", s)}
                        open={sectionOpen === 1} onToggle={() => toggleExtraSection(extraIdx, 1)}
                      />
                      <Section
                        title="Complementos" subtitle="Escolha até 4 opções" max={4}
                        items={complementosItems} selection={cup.complementos}
                        onChange={(s) => updateExtraCup(extraIdx, "complementos", s)}
                        open={sectionOpen === 2} onToggle={() => toggleExtraSection(extraIdx, 2)}
                      />
                      <Section
                        title="Turbine seu açaí" subtitle="Escolha até 1 opção" max={1}
                        items={turbines} selection={cup.turbines}
                        onChange={(s) => updateExtraCup(extraIdx, "turbines", s)}
                        open={sectionOpen === 3} onToggle={() => toggleExtraSection(extraIdx, 3)}
                      />
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}

        {/* Detalhe */}
        <div className="mt-5 overflow-hidden rounded-xl border border-border bg-white">
          <div className="bg-muted px-4 py-3">
            <div className="text-sm font-bold text-foreground">Adicionar algum detalhe?</div>
          </div>
          <div className="p-4">
            <textarea
              value={detail}
              onChange={(e) => setDetail(e.target.value.slice(0, 140))}
              placeholder="Escreva o detalhe aqui ..."
              rows={3}
              className="w-full resize-none rounded-lg border border-border bg-white px-3 py-2 text-sm outline-none focus:border-primary"
            />
            <div className="mt-1 text-right text-xs text-muted-foreground">{detail.length}/140</div>
          </div>
        </div>
      </div>

      {/* Barra fixa */}
      <div className="fixed bottom-0 left-0 right-0 z-30 border-t border-border bg-white shadow-[0_-4px_12px_rgba(0,0,0,0.05)]">
        <div className="mx-auto flex max-w-3xl flex-col gap-1.5 px-4 py-3 md:px-6">
          <div className="flex items-center gap-3">
            {/* Stepper de quantidade */}
            <div className="inline-flex shrink-0 items-center gap-0.5 rounded-full border-2 border-border bg-white p-0.5">
              <button
                type="button"
                onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                disabled={quantity <= 1}
                aria-label="Diminuir quantidade"
                className="flex h-9 w-9 items-center justify-center rounded-full text-foreground transition hover:bg-muted disabled:cursor-not-allowed disabled:text-muted-foreground/50 disabled:hover:bg-transparent"
              >
                <Minus className="h-4 w-4" />
              </button>
              <span className="min-w-[28px] text-center text-base font-extrabold tabular-nums text-foreground">
                {quantity}
              </span>
              <button
                type="button"
                onClick={() => setQuantity((q) => Math.min(maxQuantity, q + 1))}
                disabled={atMaxQuantity}
                aria-label="Aumentar quantidade"
                title={atMaxQuantity ? `Máximo ${MAX_CUPS_PER_ITEM} copos por pedido` : undefined}
                className="flex h-9 w-9 items-center justify-center rounded-full text-foreground transition hover:bg-muted disabled:cursor-not-allowed disabled:text-muted-foreground/50 disabled:hover:bg-transparent"
              >
                <Plus className="h-4 w-4" />
              </button>
            </div>

            {/* Botão ADICIONAR com preço incluído */}
            <button
              type="button"
              onClick={handleAddToCart}
              className="flex flex-1 items-center justify-between gap-3 rounded-full bg-primary-light px-4 py-2.5 text-sm font-bold text-white shadow-sm transition hover:brightness-110 md:px-5 md:py-3"
            >
              <span className="inline-flex items-center gap-2">
                <ShoppingBag className="h-4 w-4" />
                <span>Adicionar</span>
              </span>
              {showCouponPrice ? (
                <span className="flex flex-col items-end leading-tight">
                  <span className="text-[10px] font-medium text-white/85 line-through tabular-nums md:text-xs">
                    R$ {formatMoney(total)}
                  </span>
                  <span
                    className="inline-flex items-center gap-1.5 text-base font-extrabold tabular-nums md:text-lg"
                    title={`Com cupom ${coupon.code}`}
                  >
                    <Ticket className="h-3.5 w-3.5 shrink-0" aria-label={`Com cupom ${coupon.code}`} />
                    R$ {formatMoney(totalWithCoupon)}
                  </span>
                </span>
              ) : (
                <span className="text-base font-extrabold tabular-nums md:text-lg">R$ {formatMoney(total)}</span>
              )}
            </button>
          </div>
          {atMaxQuantity && (
            <div className="inline-flex self-center items-center gap-1.5 rounded-full bg-primary-soft px-3 py-1 text-[11px] font-semibold text-primary md:text-xs">
              <span className="inline-flex h-4 items-center rounded-full bg-primary px-1.5 text-[9px] font-extrabold uppercase tracking-wide text-white">
                Máx
              </span>
              Limite de {MAX_CUPS_PER_ITEM} copos por pedido atingido
            </div>
          )}
          {cartItemCount > 0 && (
            <button
              type="button"
              onClick={() => setCartOpen(true)}
              className="self-center text-[12px] font-semibold text-best-badge-text underline-offset-2 hover:underline"
            >
              <ShoppingBag className="mr-1 inline h-3.5 w-3.5 align-[-2px]" />
              Você tem {cartItemCount} {cartItemCount === 1 ? "item" : "itens"} no carrinho • Ver pedido
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
