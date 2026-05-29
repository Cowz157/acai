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
  /** Estado controlado pelo parent — permite auto-avançar entre seções. */
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

export function ProductCustomizer({ product }: { product: Product }) {
  // Cup 1 (sempre presente)
  const [coberturasSel, setCoberturasSel] = useState<Selection>({})
  const [frutasSel, setFrutasSel] = useState<Selection>({})
  const [complementosSel, setComplementosSel] = useState<Selection>({})
  const [turbinesSel, setTurbinesSel] = useState<Selection>({})

  // Cup 2 (usado só quando differentCups=true)
  const [coberturas2Sel, setCoberturas2Sel] = useState<Selection>({})
  const [frutas2Sel, setFrutas2Sel] = useState<Selection>({})
  const [complementos2Sel, setComplementos2Sel] = useState<Selection>({})
  const [turbines2Sel, setTurbines2Sel] = useState<Selection>({})

  const [differentCups, setDifferentCups] = useState(false)
  /** Acordeão: qual dos 2 cups está expandido no modo "diferentes". null = ambos fechados. */
  const [openCup, setOpenCup] = useState<1 | 2 | null>(1)

  const [detail, setDetail] = useState("")
  const [quantity, setQuantity] = useState(1)
  /** Índice da seção aberta do Copo 1 (0..3). null = todas fechadas.
   *  No modo "iguais", representa a única coluna de seções. */
  const [openSection, setOpenSection] = useState<number | null>(0)
  /** Índice da seção aberta do Copo 2 (0..3). Só relevante quando differentCups=true. */
  const [openSection2, setOpenSection2] = useState<number | null>(0)

  const isAddon = product.kind === "addon"
  const isAvulso = product.category === "avulso" || product.category === "avulso-zero"
  const isCombo = product.category === "pague-leve" || product.category === "pague-leve-zero"

  // Cupom ativo (user veio via ?cupom= ou aplicou em sessão anterior).
  const coupon = useActiveCoupon()
  const couponDiscount = coupon ? calculateCouponDiscount(coupon, product.price) : 0
  const priceWithCoupon = product.price - couponDiscount
  const showCouponPrice = coupon !== null && couponDiscount > 0

  const addItem = useCart((s) => s.addItem)
  const setCartOpen = useCart((s) => s.setOpen)
  const cartItemCount = useCart((s) => s.items.reduce((sum, it) => sum + it.quantity, 0))

  // Pricing — aplica combo Pague 1 Leve 2 quando avulso e quantidade >= 2
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

  // Toggle "personalizar cada copo" só faz sentido quando o cliente vai levar
  // EXATAMENTE 2 copos:
  //  - combo direto (Pague 1 Leve 2) — sempre tem 2 copos
  //  - avulso com quantity === 2 (combo aplicado automaticamente, sem remainder)
  // Pra qty>2 com remainder ou qty=1, esconde o toggle pra não confundir.
  const canDifferentiate = !isAddon && (isCombo || (isAvulso && quantity === 2))

  // Se cliente ativou "diferentes" e depois mudou quantity quebrando a regra,
  // volta automático pra "iguais" — evita estado inconsistente no addToCart.
  useEffect(() => {
    if (!canDifferentiate && differentCups) {
      setDifferentCups(false)
    }
  }, [canDifferentiate, differentCups])

  // Quando ativa o modo "diferentes", abre o Copo 1 por default
  useEffect(() => {
    if (differentCups) setOpenCup(1)
  }, [differentCups])

  const coberturasItems = coberturas.map((c) => ({ name: c }))
  const frutasItems = frutas.map((c) => ({ name: c }))
  const complementosItems = complementos.map((c) => ({ name: c }))

  // Totais por seção do Cup 1 (pra disparar auto-advance no modo "iguais")
  const coberturasTotal = useMemo(
    () => Object.values(coberturasSel).reduce((s, v) => s + v, 0),
    [coberturasSel],
  )
  const frutasTotal = useMemo(
    () => Object.values(frutasSel).reduce((s, v) => s + v, 0),
    [frutasSel],
  )
  const complementosTotal = useMemo(
    () => Object.values(complementosSel).reduce((s, v) => s + v, 0),
    [complementosSel],
  )
  const turbinesTotal = useMemo(
    () => Object.values(turbinesSel).reduce((s, v) => s + v, 0),
    [turbinesSel],
  )

  // Totais do Cup 2 (pra resumo do header colapsado no modo "diferentes")
  const coberturas2Total = useMemo(
    () => Object.values(coberturas2Sel).reduce((s, v) => s + v, 0),
    [coberturas2Sel],
  )
  const frutas2Total = useMemo(
    () => Object.values(frutas2Sel).reduce((s, v) => s + v, 0),
    [frutas2Sel],
  )
  const complementos2Total = useMemo(
    () => Object.values(complementos2Sel).reduce((s, v) => s + v, 0),
    [complementos2Sel],
  )
  const turbines2Total = useMemo(
    () => Object.values(turbines2Sel).reduce((s, v) => s + v, 0),
    [turbines2Sel],
  )

  const cup1Summary = summarizeCup(coberturasTotal, frutasTotal, complementosTotal, turbinesTotal)
  const cup2Summary = summarizeCup(coberturas2Total, frutas2Total, complementos2Total, turbines2Total)

  // Refs pras seções do Cup 1 (auto-advance só no modo "iguais")
  const sectionRefs = useRef<Array<HTMLDivElement | null>>([null, null, null, null])
  const sectionMaxes = [2, 2, 4, 1]
  const sectionTotals = [coberturasTotal, frutasTotal, complementosTotal, turbinesTotal]
  /** Marcado quando uma seção foi aberta via auto-advance (não por clique manual). */
  const autoAdvancedRef = useRef(false)

  // Auto-advance das seções do Copo 1 (vale tanto no modo "iguais" quanto
  // no modo "diferentes" — em ambos representa as escolhas do primeiro copo).
  useEffect(() => {
    if (openSection === null) return
    if (sectionTotals[openSection] < sectionMaxes[openSection]) return
    const next = openSection + 1 < sectionMaxes.length ? openSection + 1 : null
    autoAdvancedRef.current = next !== null
    setOpenSection(next)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [coberturasTotal, frutasTotal, complementosTotal, turbinesTotal])

  // Auto-advance das seções do Copo 2 (só relevante no modo "diferentes").
  // Sem scroll automático — Copo 2 fica no acordeão expandido, scroll manual.
  const sectionTotals2 = [coberturas2Total, frutas2Total, complementos2Total, turbines2Total]
  /** Suprime o próximo disparo do auto-advance do Cup 2 — usado quando o cliente
   *  clica em "Copiar do Copo 1": copia os valores mas mantém todas as seções
   *  fechadas (cliente já validou que quer iguais, não precisa ver detalhe). */
  const suppressCup2AutoAdvanceRef = useRef(false)
  useEffect(() => {
    if (!differentCups) return
    if (suppressCup2AutoAdvanceRef.current) {
      suppressCup2AutoAdvanceRef.current = false
      return
    }
    if (openSection2 === null) return
    if (sectionTotals2[openSection2] < sectionMaxes[openSection2]) return
    const next = openSection2 + 1 < sectionMaxes.length ? openSection2 + 1 : null
    setOpenSection2(next)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [coberturas2Total, frutas2Total, complementos2Total, turbines2Total, differentCups])

  // Quando Copo 1 fica 100% preenchido (todas seções no max), abre Copo 2
  // automaticamente pra facilitar o lead. Dispara só 1x — se o user fechar
  // Copo 2 depois, não reabre.
  const cup1Complete = coberturasTotal === 2 && frutasTotal === 2 && complementosTotal === 4 && turbinesTotal === 1
  const autoOpenedCup2Ref = useRef(false)
  useEffect(() => {
    if (!differentCups) {
      autoOpenedCup2Ref.current = false
      return
    }
    if (cup1Complete && !autoOpenedCup2Ref.current && openCup === 1) {
      autoOpenedCup2Ref.current = true
      setOpenCup(2)
    }
  }, [cup1Complete, differentCups, openCup])

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
  const toggleSection2 = (idx: number) => {
    setOpenSection2((current) => (current === idx ? null : idx))
  }

  const copyCup1ToCup2 = () => {
    // Cliente já validou que quer iguais — copia valores e mantém tudo fechado.
    // suppressCup2AutoAdvanceRef bloqueia a cascata de auto-advance que o
    // useEffect dispararia quando os totals subissem.
    suppressCup2AutoAdvanceRef.current = true
    setCoberturas2Sel({ ...coberturasSel })
    setFrutas2Sel({ ...frutasSel })
    setComplementos2Sel({ ...complementosSel })
    setTurbines2Sel({ ...turbinesSel })
    setOpenSection2(null)
  }

  const handleAddToCart = () => {
    const cup1Options = buildSelectedOptions(coberturasSel, frutasSel, complementosSel, turbinesSel)
    const cup2Options = differentCups
      ? buildSelectedOptions(coberturas2Sel, frutas2Sel, complementos2Sel, turbines2Sel)
      : null
    const obs = detail.trim()

    // Avulso com quantity >= 2: aplica combo "Pague 1 Leve 2".
    if (isAvulso && pricing.comboPairs > 0) {
      const combo = findComboEquivalent(product)
      if (combo) {
        addItem({
          productId: combo.slug,
          productName: combo.name,
          productImage: combo.image,
          basePrice: combo.price,
          quantity: pricing.comboPairs,
          observations: obs,
          selectedOptions: cup1Options,
          // 2 copos diferentes só se aplica quando o combo é exatamente
          // 1 unidade (qty=2 com remainder=0). canDifferentiate já garante isso.
          secondCupOptions: differentCups && pricing.comboPairs === 1 ? cup2Options : null,
        })
        if (pricing.remainder > 0) {
          addItem({
            productId: product.slug,
            productName: product.name,
            productImage: product.image,
            basePrice: product.price,
            quantity: pricing.remainder,
            observations: obs,
            selectedOptions: cup1Options,
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
      secondCupOptions: differentCups && isCombo ? cup2Options : null,
    })
    setCartOpen(true)
  }

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
              {comboApplied && (
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

        {/* Toggle "Quero personalizar cada copo" — só aparece quando há 2 copos.
            Default "Iguais" sempre pré-selecionado pra zero fricção de conversão:
            quem ignora o bloco continua o fluxo normal sem precisar clicar. */}
        {canDifferentiate && (
          <div className="mt-4 rounded-xl border border-dashed border-primary/60 bg-primary-soft/30 px-4 py-3">
            <div className="inline-flex items-center gap-1.5 text-sm font-semibold text-primary">
              <Sparkles className="h-3.5 w-3.5 shrink-0" />
              <span>Como você quer os 2 copos?</span>
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

        {/* Seções */}
        {!isAddon && !differentCups && (
          <div className="mt-5 space-y-4">
            <div ref={(el) => { sectionRefs.current[0] = el }} className="scroll-mt-20">
              <Section
                title="Coberturas"
                subtitle="Escolha até 2 opções"
                max={2}
                items={coberturasItems}
                selection={coberturasSel}
                onChange={setCoberturasSel}
                open={openSection === 0}
                onToggle={() => toggleSection(0)}
              />
            </div>
            <div ref={(el) => { sectionRefs.current[1] = el }} className="scroll-mt-20">
              <Section
                title="Frutas"
                subtitle="Escolha até 2 opções"
                max={2}
                items={frutasItems}
                selection={frutasSel}
                onChange={setFrutasSel}
                open={openSection === 1}
                onToggle={() => toggleSection(1)}
              />
            </div>
            <div ref={(el) => { sectionRefs.current[2] = el }} className="scroll-mt-20">
              <Section
                title="Complementos"
                subtitle="Escolha até 4 opções"
                max={4}
                items={complementosItems}
                selection={complementosSel}
                onChange={setComplementosSel}
                open={openSection === 2}
                onToggle={() => toggleSection(2)}
              />
            </div>
            <div ref={(el) => { sectionRefs.current[3] = el }} className="scroll-mt-20">
              <Section
                title="Turbine seu açaí"
                subtitle="Escolha até 1 opção"
                max={1}
                items={turbines}
                selection={turbinesSel}
                onChange={setTurbinesSel}
                open={openSection === 3}
                onToggle={() => toggleSection(3)}
              />
            </div>
          </div>
        )}

        {/* Modo "personalizar cada copo" — acordeão (1 aberto por vez) */}
        {!isAddon && differentCups && (
          <div className="mt-4 space-y-3">
            {/* Cup 1 */}
            <div className="overflow-hidden rounded-2xl border-2 border-primary/30 bg-white shadow-sm">
              <button
                type="button"
                onClick={() => setOpenCup((c) => (c === 1 ? null : 1))}
                className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left"
              >
                <div className="flex min-w-0 items-center gap-2.5">
                  <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary text-xs font-extrabold text-white">
                    1
                  </span>
                  <div className="min-w-0">
                    <div className="text-sm font-bold text-primary md:text-base">Copo 1</div>
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

            {/* Cup 2 */}
            <div className="overflow-hidden rounded-2xl border-2 border-primary/30 bg-white shadow-sm">
              <button
                type="button"
                onClick={() => setOpenCup((c) => (c === 2 ? null : 2))}
                className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left"
              >
                <div className="flex min-w-0 items-center gap-2.5">
                  <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary text-xs font-extrabold text-white">
                    2
                  </span>
                  <div className="min-w-0">
                    <div className="text-sm font-bold text-primary md:text-base">Copo 2</div>
                    <div className="truncate text-[11px] text-muted-foreground md:text-xs">{cup2Summary}</div>
                  </div>
                </div>
                <ChevronDown className={cn("h-4 w-4 shrink-0 text-primary transition", openCup === 2 && "rotate-180")} />
              </button>
              {openCup === 2 && (
                <div className="space-y-3 border-t border-primary/15 bg-muted/30 p-3 md:p-4">
                  <button
                    type="button"
                    onClick={copyCup1ToCup2}
                    className="inline-flex items-center gap-1.5 rounded-full border border-primary/40 bg-white px-3 py-1 text-[11px] font-semibold text-primary transition hover:bg-primary-soft md:text-xs"
                  >
                    <Sparkles className="h-3 w-3" />
                    Copiar do Copo 1
                  </button>
                  <Section
                    title="Coberturas" subtitle="Escolha até 2 opções" max={2}
                    items={coberturasItems} selection={coberturas2Sel} onChange={setCoberturas2Sel}
                    open={openSection2 === 0} onToggle={() => toggleSection2(0)}
                  />
                  <Section
                    title="Frutas" subtitle="Escolha até 2 opções" max={2}
                    items={frutasItems} selection={frutas2Sel} onChange={setFrutas2Sel}
                    open={openSection2 === 1} onToggle={() => toggleSection2(1)}
                  />
                  <Section
                    title="Complementos" subtitle="Escolha até 4 opções" max={4}
                    items={complementosItems} selection={complementos2Sel} onChange={setComplementos2Sel}
                    open={openSection2 === 2} onToggle={() => toggleSection2(2)}
                  />
                  <Section
                    title="Turbine seu açaí" subtitle="Escolha até 1 opção" max={1}
                    items={turbines} selection={turbines2Sel} onChange={setTurbines2Sel}
                    open={openSection2 === 3} onToggle={() => toggleSection2(3)}
                  />
                </div>
              )}
            </div>
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
                onClick={() => setQuantity((q) => q + 1)}
                aria-label="Aumentar quantidade"
                className="flex h-9 w-9 items-center justify-center rounded-full text-foreground transition hover:bg-muted"
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
