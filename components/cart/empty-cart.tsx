"use client"

import { ShoppingBag } from "lucide-react"

interface EmptyCartProps {
  onContinue: () => void
}

export function EmptyCart({ onContinue }: EmptyCartProps) {
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-5 px-6 py-12 text-center">
      <div className="relative">
        <div className="flex h-32 w-32 items-center justify-center rounded-full bg-primary-soft">
          <ShoppingBag className="h-14 w-14 text-primary/50" strokeWidth={1.5} />
        </div>
      </div>
      <div className="space-y-1.5">
        <p className="text-base font-bold text-foreground">Seu carrinho está vazio</p>
        <p className="text-sm text-muted-foreground">Adicione um açaí delicioso e comece seu pedido!</p>
      </div>
      <button
        type="button"
        onClick={onContinue}
        className="rounded-full bg-success px-6 py-2.5 text-sm font-bold text-white shadow-sm transition hover:brightness-95"
      >
        Ver cardápio
      </button>
    </div>
  )
}
