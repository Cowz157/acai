"use client"

import { useState } from "react"
import { CheckCircle2, Loader2, Sparkles } from "lucide-react"
import { useAuth } from "@/lib/auth-store"
import { unmaskDigits } from "@/lib/format"
import { type SavedOrder } from "@/lib/order-store"

interface PostOrderSignupProps {
  order: SavedOrder
}

/**
 * Card oferecido após o pedido pra cliente NÃO logado criar conta com 1 clique
 * usando os dados que ele já preencheu no checkout.
 * Não aparece se o cliente já está logado.
 */
export function PostOrderSignup({ order }: PostOrderSignupProps) {
  const user = useAuth((s) => s.user)
  const signup = useAuth((s) => s.signup)
  const initialized = useAuth((s) => s.initialized)

  const [password, setPassword] = useState("")
  const [marketingConsent, setMarketingConsent] = useState(true)
  const [loading, setLoading] = useState(false)
  const [done, setDone] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Não renderiza se já tá logado ou se ainda não hidratou auth
  if (!initialized || user) return null

  const handleCreateAccount = async () => {
    setError(null)
    if (password.length < 6) {
      setError("Senha precisa ter no mínimo 6 caracteres")
      return
    }
    setLoading(true)
    const result = await signup({
      name: order.delivery.fullName,
      email: order.delivery.email,
      phone: order.delivery.phone ? unmaskDigits(order.delivery.phone) : "",
      password,
      marketingConsent,
      source: "post_order",
    })
    setLoading(false)
    if (!result.ok) {
      setError(result.error)
      return
    }
    setDone(true)
  }

  if (done) {
    return (
      <div className="rounded-2xl border-2 border-success bg-success-soft/40 p-5 shadow-sm">
        <div className="flex items-start gap-3">
          <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-success" />
          <div>
            <p className="text-sm font-bold text-success">Conta criada com sucesso!</p>
            <p className="mt-1 text-xs text-success/80">
              Agora seus dados ficam salvos pra próxima compra ser ainda mais rápida. Vamos te enviar
              ofertas exclusivas no seu e-mail.
            </p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="rounded-2xl border-2 border-primary bg-primary-soft/40 p-5 shadow-sm md:p-6">
      <div className="flex items-start gap-3">
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary text-white">
          <Sparkles className="h-4 w-4" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-extrabold text-primary md:text-base">
            Quer agilizar sua próxima compra?
          </p>
          <p className="mt-0.5 text-xs text-muted-foreground md:text-sm">
            Crie uma conta com os dados que você já preencheu — só falta uma senha.
          </p>
        </div>
      </div>

      <div className="mt-4 space-y-3">
        <label className="block">
          <span className="mb-1 block text-xs font-semibold text-muted-foreground">
            Crie uma senha <span className="text-danger">*</span>
          </span>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Mínimo 6 caracteres"
            autoComplete="new-password"
            className="w-full rounded-lg border border-border bg-white px-3 py-2.5 text-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
          />
        </label>

        <label className="flex cursor-pointer items-start gap-2 text-xs text-muted-foreground">
          <input
            type="checkbox"
            checked={marketingConsent}
            onChange={(e) => setMarketingConsent(e.target.checked)}
            className="mt-0.5 h-4 w-4 shrink-0 cursor-pointer accent-success"
          />
          <span>Quero receber promoções e cupons exclusivos por e-mail</span>
        </label>

        {error && (
          <div className="rounded-lg bg-danger-soft px-3 py-2 text-xs font-semibold text-danger">{error}</div>
        )}

        <button
          type="button"
          onClick={handleCreateAccount}
          disabled={loading || password.length < 6}
          className="flex w-full items-center justify-center gap-2 rounded-full bg-primary px-6 py-3 text-sm font-bold text-white shadow-sm transition hover:bg-primary-light disabled:cursor-not-allowed disabled:opacity-50"
        >
          {loading && <Loader2 className="h-4 w-4 animate-spin" />}
          {loading ? "Criando conta..." : "Criar minha conta"}
        </button>
      </div>
    </div>
  )
}
