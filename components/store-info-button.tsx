"use client"

import { useEffect, useState } from "react"
import { Bike, Check, CheckCircle2, CreditCard, Info, MapPin, Package, Wallet, X } from "lucide-react"

export function StoreInfoButton() {
  const [open, setOpen] = useState(false)

  useEffect(() => {
    if (!open) return
    document.body.style.overflow = "hidden"
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false)
    }
    window.addEventListener("keydown", onKey)
    return () => {
      document.body.style.overflow = ""
      window.removeEventListener("keydown", onKey)
    }
  }, [open])

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label="Informações da loja"
        className="flex h-10 w-10 items-center justify-center rounded-full border-2 border-primary text-primary transition hover:bg-primary hover:text-white"
      >
        <Info className="h-5 w-5" />
      </button>

      {open && <StoreInfoSidebar onClose={() => setOpen(false)} />}
    </>
  )
}

function StoreInfoSidebar({ onClose }: { onClose: () => void }) {
  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Informações da loja"
      className="animate-overlay-fade fixed inset-0 z-50 bg-black/50"
      onClick={onClose}
    >
      <aside
        className="animate-drawer-in fixed inset-y-0 right-0 flex w-[90%] max-w-[400px] flex-col overflow-y-auto bg-white shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <header className="sticky top-0 z-10 flex items-center justify-between border-b border-border bg-white px-6 py-4">
          <h2 className="text-lg font-extrabold text-primary md:text-xl">Sobre a loja</h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Fechar"
            className="flex h-9 w-9 items-center justify-center rounded-full border border-border text-muted-foreground transition hover:bg-muted hover:text-foreground"
          >
            <X className="h-4 w-4" />
          </button>
        </header>

        {/* Conteúdo */}
        <div className="space-y-6 px-6 py-6">
          <Section title="Tipos de Entrega">
            <Item icon={<Bike className="h-4 w-4" />} text="Entrega Motoboy" />
            <Item icon={<Package className="h-4 w-4" />} text="Retirada na loja" />
          </Section>

          <Section title="Formas de Pagamento">
            <Item
              icon={<Wallet className="h-4 w-4" />}
              text={
                <span className="inline-flex items-center gap-1.5">
                  Pix
                  <CheckCircle2 className="h-4 w-4 text-success" />
                </span>
              }
            />
            <Item
              icon={<CreditCard className="h-4 w-4" />}
              text={
                <span className="inline-flex items-center gap-2 text-muted-foreground">
                  Cartão
                  <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] font-bold uppercase text-muted-foreground">
                    Em manutenção
                  </span>
                </span>
              }
              muted
            />
          </Section>

          <Section title="Endereço">
            <Item icon={<MapPin className="h-4 w-4" />} text="Angra Dos Reis - RJ" />
          </Section>

          <Section title="Áreas de Entrega">
            <div className="rounded-xl border border-primary-soft bg-white p-3">
              <div className="flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-sm font-bold text-foreground">Angra Dos Reis - RJ</p>
                  <p className="mt-0.5 text-xs text-muted-foreground">Tempo estimado: 30-50 min</p>
                </div>
                <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-success-soft px-2.5 py-1 text-[10px] font-extrabold uppercase text-success">
                  <Check className="h-3 w-3" strokeWidth={3} />
                  Grátis hoje
                </span>
              </div>
            </div>
          </Section>
        </div>
      </aside>
    </div>
  )
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section>
      <h3 className="text-base font-extrabold text-primary md:text-lg">{title}</h3>
      <div className="mt-3 space-y-2.5">{children}</div>
    </section>
  )
}

function Item({
  icon,
  text,
  muted = false,
}: {
  icon: React.ReactNode
  text: React.ReactNode
  muted?: boolean
}) {
  return (
    <div className="flex items-center gap-2.5">
      <span
        className={
          muted
            ? "flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-muted text-muted-foreground"
            : "flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary-soft text-primary"
        }
      >
        {icon}
      </span>
      <span className={muted ? "text-sm font-medium text-muted-foreground" : "text-sm font-medium text-foreground"}>
        {text}
      </span>
    </div>
  )
}
