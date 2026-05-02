"use client"

import Image from "next/image"
import Link from "next/link"
import { useEffect, useMemo, useRef, useState } from "react"
import { ArrowLeft, Check, ChevronDown, Flame, Minus, Plus, ShoppingBag, Sparkles } from "lucide-react"
import {
  calculateAvulsoTotal,
  coberturas,
  complementos,
  findComboEquivalent,
  frutas,
  turbines,
  type Product,
} from "@/lib/data"
import { useCart } from "@/lib/cart-store"
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

export function ProductCustomizer({ product }: { product: Product }) {
  const [coberturasSel, setCoberturasSel] = useState<Selection>({})
  const [frutasSel, setFrutasSel] = useState<Selection>({})
  const [complementosSel, setComplementosSel] = useState<Selection>({})
  const [turbinesSel, setTurbinesSel] = useState<Selection>({})
  const [detail, setDetail] = useState("")
  const [quantity, setQuantity] = useState(1)
  const [showToast, setShowToast] = useState(false)
  /** Índice da seção aberta (0..3). null = todas fechadas. */
  const [openSection, setOpenSection] = useState<number | null>(0)

  const isAddon = product.kind === "addon"
  const isAvulso = product.category === "avulso" || product.category === "avulso-zero"

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

  const coberturasItems = coberturas.map((c) => ({ name: c }))
  const frutasItems = frutas.map((c) => ({ name: c }))
  const complementosItems = complementos.map((c) => ({ name: c }))

  // Totais por seção (pra disparar auto-advance quando atingem o max)
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

  // Refs pras seções (pra scrollIntoView ao avançar)
  const sectionRefs = useRef<Array<HTMLDivElement | null>>([null, null, null, null])
  const sectionMaxes = [2, 2, 4, 1]
  const sectionTotals = [coberturasTotal, frutasTotal, complementosTotal, turbinesTotal]
  /** Marcado quando uma seção foi aberta via auto-advance (não por clique manual). */
  const autoAdvancedRef = useRef(false)

  // Detecta quando a seção atual atinge o max → marca pra auto-advance
  useEffect(() => {
    if (openSection === null) return
    if (sectionTotals[openSection] < sectionMaxes[openSection]) return
    const next = openSection + 1 < sectionMaxes.length ? openSection + 1 : null
    autoAdvancedRef.current = next !== null
    setOpenSection(next)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [coberturasTotal, frutasTotal, complementosTotal, turbinesTotal])

  // Faz o scroll APÓS o React re-renderizar com o novo openSection
  // (assim a posição calculada já considera a seção anterior fechada e a próxima aberta)
  useEffect(() => {
    if (!autoAdvancedRef.current) return
    autoAdvancedRef.current = false
    if (openSection === null) return
    // Double rAF garante que o layout do navegador foi finalizado antes do scroll
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

  // Auto-hide toast
  useEffect(() => {
    if (!showToast) return
    const t = setTimeout(() => setShowToast(false), 2200)
    return () => clearTimeout(t)
  }, [showToast])

  const handleAddToCart = () => {
    const selectedOptions = {
      coberturas: selectionToOptions(coberturasSel),
      frutas: selectionToOptions(frutasSel),
      complementos: selectionToOptions(complementosSel),
      turbine: selectionToOptions(turbinesSel),
    }
    const obs = detail.trim()

    // Avulso com quantidade >= 2: aplica combo "Pague 1 Leve 2".
    // Cada par vira 1 combo (registrado com slug/nome do combo); ímpar vira avulso.
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
          selectedOptions,
        })
        if (pricing.remainder > 0) {
          addItem({
            productId: product.slug,
            productName: product.name,
            productImage: product.image,
            basePrice: product.price,
            quantity: pricing.remainder,
            observations: obs,
            selectedOptions,
          })
        }
        setShowToast(true)
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
      selectedOptions,
    })
    setShowToast(true)
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

        {/* Seções */}
        <div className="mt-5 space-y-4">
          {!isAddon && (
            <>
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
            </>
          )}

          {/* Detalhe */}
          <div className="overflow-hidden rounded-xl border border-border bg-white">
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
              <span className="text-base font-extrabold tabular-nums md:text-lg">R$ {formatMoney(total)}</span>
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

      {/* Toast confirmação */}
      {showToast && (
        <div className="fixed bottom-24 left-1/2 z-80 -translate-x-1/2 animate-step-in md:bottom-28">
          <div className="flex items-center gap-2.5 rounded-full bg-success px-5 py-3 text-sm font-bold text-white shadow-2xl">
            <Check className="h-4 w-4" strokeWidth={3} />
            Adicionado ao carrinho!
            <button
              type="button"
              onClick={() => {
                setShowToast(false)
                setCartOpen(true)
              }}
              className="ml-2 rounded-full bg-white/20 px-3 py-0.5 text-xs font-bold transition hover:bg-white/30"
            >
              Ver carrinho
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
