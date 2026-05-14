"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Sparkles, Star } from "lucide-react"
import { useAuth } from "@/lib/auth-store"

/**
 * CTA de avaliação na home — visível pra todos. Quem está logado vai
 * direto pro form em /conta. Quem não tem conta vê o "barramento":
 * um aviso explícito de que precisa criar conta pra avaliar (soft gate
 * — gancho de lead capture sem fazer o visitante adivinhar).
 *
 * O estado de auth já é hidratado na home pelo AccountLink (header),
 * que roda useAuthSync().
 */
export function ReviewCta() {
  const router = useRouter()
  const user = useAuth((s) => s.user)
  const [showGate, setShowGate] = useState(false)

  const handleClick = () => {
    if (user) {
      router.push("/conta")
      return
    }
    setShowGate(true)
  }

  return (
    <div className="rounded-2xl border-2 border-primary bg-primary-soft/40 p-5 text-center md:p-6">
      <div className="mx-auto flex h-11 w-11 items-center justify-center rounded-full bg-primary text-white">
        <Star className="h-5 w-5" />
      </div>
      <h3 className="mt-3 text-base font-extrabold text-primary md:text-lg">
        Já pediu? Conta como foi! 💜
      </h3>
      <p className="mt-1 text-xs text-muted-foreground md:text-sm">
        Sua avaliação ajuda a gente a melhorar cada vez mais.
      </p>

      {showGate ? (
        <div className="mt-4 rounded-xl border border-primary/30 bg-white px-4 py-3">
          <p className="text-sm font-semibold text-foreground">
            Pra deixar sua avaliação, você precisa de uma conta.
          </p>
          <p className="mt-0.5 text-xs text-muted-foreground">É rápido — leva menos de 1 minuto.</p>
          <button
            type="button"
            onClick={() => router.push("/conta")}
            className="mt-3 inline-flex items-center gap-2 rounded-full bg-primary px-6 py-2.5 text-sm font-bold text-white shadow-sm transition hover:bg-primary-light"
          >
            <Sparkles className="h-4 w-4" />
            Criar conta e avaliar
          </button>
        </div>
      ) : (
        <button
          type="button"
          onClick={handleClick}
          className="mt-4 inline-flex items-center gap-2 rounded-full bg-primary px-6 py-2.5 text-sm font-bold text-white shadow-sm transition hover:bg-primary-light"
        >
          <Star className="h-4 w-4" />
          Deixar minha avaliação
        </button>
      )}
    </div>
  )
}
