"use client"

import { useEffect, useState } from "react"
import { CheckCircle2, Gift, Loader2, X } from "lucide-react"

const SEEN_KEY = "acai-tropical-lead-magnet-seen"
const DELAY_MS = 12_000 // aparece 12s depois do load

export function LeadMagnetPopup() {
  const [open, setOpen] = useState(false)
  const [email, setEmail] = useState("")
  const [consent, setConsent] = useState(true)
  const [loading, setLoading] = useState(false)
  const [done, setDone] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    // Não mostra se já viu antes
    try {
      if (window.localStorage.getItem(SEEN_KEY) === "1") return
    } catch {
      /* ignora */
    }

    // Abre depois do delay OU em exit intent (cursor saiu pra cima do viewport)
    const timer = setTimeout(() => setOpen(true), DELAY_MS)

    const handleExit = (e: MouseEvent) => {
      if (e.clientY <= 10) {
        setOpen(true)
        clearTimeout(timer)
        document.removeEventListener("mouseleave", handleExit)
      }
    }
    document.addEventListener("mouseleave", handleExit)

    return () => {
      clearTimeout(timer)
      document.removeEventListener("mouseleave", handleExit)
    }
  }, [])

  const closeAndRemember = () => {
    setOpen(false)
    try {
      window.localStorage.setItem(SEEN_KEY, "1")
    } catch {
      /* ignora */
    }
  }

  // Esc fecha + bloqueia scroll
  useEffect(() => {
    if (!open) return
    document.body.style.overflow = "hidden"
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") closeAndRemember()
    }
    window.addEventListener("keydown", onKey)
    return () => {
      document.body.style.overflow = ""
      window.removeEventListener("keydown", onKey)
    }
  }, [open])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setError("Informe um e-mail válido")
      return
    }
    if (!consent) {
      setError("É necessário aceitar pra receber as ofertas")
      return
    }

    setLoading(true)
    try {
      const res = await fetch("/api/email-leads", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email,
          source: "lead_magnet",
          marketingConsent: consent,
        }),
      })
      const data = (await res.json().catch(() => ({}))) as { error?: string }
      if (!res.ok) {
        setError(data.error ?? "Erro ao salvar e-mail")
        return
      }
      setDone(true)
    } catch {
      setError("Falha de rede. Tente novamente.")
    } finally {
      setLoading(false)
    }
  }

  if (!open) return null

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Receba ofertas exclusivas"
      className="animate-overlay-fade fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
      onClick={closeAndRemember}
    >
      <div
        className="animate-modal-pop relative w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl md:p-8"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          type="button"
          onClick={closeAndRemember}
          aria-label="Fechar"
          className="absolute right-3 top-3 flex h-8 w-8 items-center justify-center rounded-full text-muted-foreground transition hover:bg-muted hover:text-foreground"
        >
          <X className="h-4 w-4" />
        </button>

        {done ? (
          <div className="flex flex-col items-center text-center">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-success-soft">
              <CheckCircle2 className="h-9 w-9 text-success" />
            </div>
            <h2 className="mt-4 text-xl font-extrabold text-foreground md:text-2xl">
              Pronto! Você está na lista 💜
            </h2>
            <p className="mt-2 text-sm text-muted-foreground md:text-base">
              Em breve você vai receber nossas promoções exclusivas no seu e-mail. Aproveita pra fazer um pedido agora mesmo!
            </p>
            <button
              type="button"
              onClick={closeAndRemember}
              className="mt-5 inline-flex items-center gap-2 rounded-full bg-success px-6 py-2.5 text-sm font-bold text-white shadow-sm transition hover:brightness-95"
            >
              Voltar pro cardápio
            </button>
          </div>
        ) : (
          <>
            <div className="flex justify-center">
              <div className="flex h-16 w-16 items-center justify-center rounded-full bg-primary-soft">
                <Gift className="h-8 w-8 text-primary" />
              </div>
            </div>
            <h2 className="mt-4 text-center text-xl font-extrabold text-primary md:text-2xl">
              Quer ofertas exclusivas no seu e-mail?
            </h2>
            <p className="mt-2 text-center text-sm text-muted-foreground md:text-base">
              Cadastre seu e-mail e seja o primeiro a receber promoções, cupons e novidades do Açaí Tropical.
            </p>

            <form onSubmit={handleSubmit} className="mt-5 space-y-3">
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="seu@email.com"
                autoComplete="email"
                className="w-full rounded-lg border border-border bg-white px-4 py-3 text-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
              />

              <label className="flex cursor-pointer items-start gap-2 text-xs text-muted-foreground">
                <input
                  type="checkbox"
                  checked={consent}
                  onChange={(e) => setConsent(e.target.checked)}
                  className="mt-0.5 h-4 w-4 shrink-0 cursor-pointer accent-success"
                />
                <span>Aceito receber e-mails com promoções. Posso cancelar quando quiser.</span>
              </label>

              {error && (
                <div className="rounded-lg bg-danger-soft px-3 py-2 text-xs font-semibold text-danger">{error}</div>
              )}

              <button
                type="submit"
                disabled={loading}
                className="flex w-full items-center justify-center gap-2 rounded-full bg-primary px-6 py-3 text-sm font-bold text-white shadow-sm transition hover:bg-primary-light disabled:cursor-not-allowed disabled:opacity-60"
              >
                {loading && <Loader2 className="h-4 w-4 animate-spin" />}
                {loading ? "Cadastrando..." : "Quero receber as ofertas"}
              </button>

              <button
                type="button"
                onClick={closeAndRemember}
                className="block w-full text-center text-xs text-muted-foreground transition hover:text-foreground"
              >
                Não, obrigado
              </button>
            </form>
          </>
        )}
      </div>
    </div>
  )
}
