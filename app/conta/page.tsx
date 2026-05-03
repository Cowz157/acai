"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { ArrowLeft, CheckCircle2, Loader2, LogOut, MapPin, User } from "lucide-react"
import { useAuth, useAuthSync } from "@/lib/auth-store"
import { maskPhone, unmaskDigits } from "@/lib/format"
import { getLastOrder, type SavedOrder } from "@/lib/order-store"
import { OrderHistory } from "@/components/order-history"
import { SiteFooter } from "@/components/site-footer"
import { cn } from "@/lib/utils"

type Mode = "signin" | "signup"

const inputClass =
  "w-full rounded-lg border border-border bg-white px-3 py-2.5 text-sm text-foreground outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"

export default function ContaPage() {
  useAuthSync()
  const router = useRouter()
  const user = useAuth((s) => s.user)
  const initialized = useAuth((s) => s.initialized)
  const signin = useAuth((s) => s.signin)
  const signup = useAuth((s) => s.signup)
  const signout = useAuth((s) => s.signout)

  const [mode, setMode] = useState<Mode>("signup")
  const [name, setName] = useState("")
  const [email, setEmail] = useState("")
  const [phone, setPhone] = useState("")
  const [password, setPassword] = useState("")
  const [marketingConsent, setMarketingConsent] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [confirmationSent, setConfirmationSent] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [lastOrder, setLastOrder] = useState<SavedOrder | null>(null)

  useEffect(() => {
    setLastOrder(getLastOrder())
  }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setConfirmationSent(false)
    setSubmitting(true)

    if (mode === "signup") {
      if (name.trim().length < 3) {
        setError("Informe seu nome completo")
        setSubmitting(false)
        return
      }
      const phoneDigits = unmaskDigits(phone)
      if (phoneDigits.length !== 10 && phoneDigits.length !== 11) {
        setError("Informe um WhatsApp válido")
        setSubmitting(false)
        return
      }
      if (password.length < 6) {
        setError("A senha precisa ter no mínimo 6 caracteres")
        setSubmitting(false)
        return
      }
      const result = await signup({
        name,
        email,
        phone,
        password,
        marketingConsent,
        source: "signup",
      })
      if (!result.ok) {
        setError(result.error)
      } else if (result.needsConfirmation) {
        setConfirmationSent(true)
      }
    } else {
      const result = await signin(email, password)
      if (!result.ok) setError(result.error)
    }

    setSubmitting(false)
  }

  if (!initialized) {
    return (
      <main className="flex min-h-screen items-center justify-center gap-2 text-sm text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" />
        Carregando...
      </main>
    )
  }

  return (
    <main className="flex min-h-screen flex-col bg-muted/40">
      <div className="bg-primary px-4 py-3">
        <div className="mx-auto flex max-w-3xl items-center justify-between">
          <Link
            href="/"
            className="inline-flex items-center gap-2 rounded-full bg-white/15 px-4 py-1.5 text-sm font-semibold text-white transition hover:bg-white/25"
          >
            <ArrowLeft className="h-4 w-4" />
            CARDÁPIO
          </Link>
          <span className="text-sm font-bold uppercase tracking-wide text-white md:text-base">
            Minha Conta
          </span>
        </div>
      </div>

      <div className="mx-auto w-full max-w-md flex-1 px-4 py-8">
        {user ? (
          /* Área logada */
          <div className="space-y-4">
            <div className="rounded-2xl border border-border bg-white p-6 text-center shadow-sm">
              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-primary-soft">
                <User className="h-8 w-8 text-primary" />
              </div>
              <h1 className="mt-3 text-xl font-bold text-foreground">Olá, {user.name.split(" ")[0]}!</h1>
              <p className="mt-1 text-xs text-muted-foreground">{user.email}</p>
              {user.phone && <p className="text-xs text-muted-foreground">{user.phone}</p>}
            </div>

            {lastOrder ? (
              <Link
                href="/acompanhar"
                className="flex items-center justify-between rounded-2xl border border-border bg-white p-4 shadow-sm transition hover:border-primary/40 hover:shadow-md"
              >
                <span className="flex items-center gap-3">
                  <span className="flex h-10 w-10 items-center justify-center rounded-full bg-primary-soft text-primary">
                    <MapPin className="h-5 w-5" />
                  </span>
                  <span>
                    <span className="block text-sm font-bold text-foreground">Acompanhar pedido</span>
                    <span className="block text-xs text-muted-foreground">#{lastOrder.orderId} em andamento</span>
                  </span>
                </span>
                <span className="text-primary">→</span>
              </Link>
            ) : (
              <div className="rounded-2xl border border-dashed border-border bg-white/50 p-4 text-center text-xs text-muted-foreground">
                Você ainda não tem pedidos em andamento.
              </div>
            )}

            <OrderHistory userId={user.id} />

            <button
              type="button"
              onClick={async () => {
                await signout()
                router.push("/")
              }}
              className="flex w-full items-center justify-center gap-2 rounded-full border border-border bg-white px-6 py-3 text-sm font-semibold text-foreground transition hover:bg-muted"
            >
              <LogOut className="h-4 w-4" />
              Sair da conta
            </button>
          </div>
        ) : (
          /* Login / Cadastro */
          <div className="rounded-2xl border border-border bg-white p-6 shadow-sm md:p-8">
            <div className="mb-5 inline-flex w-full rounded-full border border-border bg-muted/40 p-0.5">
              {(["signin", "signup"] as Mode[]).map((m) => (
                <button
                  key={m}
                  type="button"
                  onClick={() => {
                    setMode(m)
                    setError(null)
                  }}
                  aria-pressed={mode === m}
                  className={cn(
                    "flex-1 rounded-full px-3 py-2 text-sm font-bold transition",
                    mode === m ? "bg-primary text-white shadow-sm" : "text-muted-foreground hover:text-foreground",
                  )}
                >
                  {m === "signin" ? "Entrar" : "Criar conta"}
                </button>
              ))}
            </div>

            <h1 className="text-xl font-bold text-primary md:text-2xl">
              {mode === "signin" ? "Bem-vindo de volta!" : "Crie sua conta"}
            </h1>
            <p className="mt-1 text-xs text-muted-foreground md:text-sm">
              {mode === "signin"
                ? "Entre pra ver seus pedidos e finalizar mais rápido."
                : "Salve seus dados pra próxima compra ser mais ágil."}
            </p>

            <form onSubmit={handleSubmit} className="mt-5 space-y-3">
              {mode === "signup" && (
                <>
                  <label className="block">
                    <span className="mb-1 block text-xs font-semibold text-muted-foreground">
                      Nome completo <span className="text-danger">*</span>
                    </span>
                    <input
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      className={inputClass}
                      placeholder="Seu nome completo"
                      autoComplete="name"
                    />
                  </label>
                  <label className="block">
                    <span className="mb-1 block text-xs font-semibold text-muted-foreground">
                      WhatsApp <span className="text-danger">*</span>
                    </span>
                    <input
                      value={phone}
                      onChange={(e) => setPhone(maskPhone(e.target.value))}
                      className={inputClass}
                      placeholder="(00) 00000-0000"
                      inputMode="numeric"
                      autoComplete="tel"
                    />
                  </label>
                </>
              )}

              <label className="block">
                <span className="mb-1 block text-xs font-semibold text-muted-foreground">
                  E-mail <span className="text-danger">*</span>
                </span>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className={inputClass}
                  placeholder="seu@email.com"
                  autoComplete="email"
                  required
                />
              </label>

              <label className="block">
                <span className="mb-1 block text-xs font-semibold text-muted-foreground">
                  Senha <span className="text-danger">*</span>
                </span>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className={inputClass}
                  placeholder={mode === "signup" ? "Mínimo 6 caracteres" : "Sua senha"}
                  autoComplete={mode === "signin" ? "current-password" : "new-password"}
                  required
                />
              </label>

              {mode === "signup" && (
                <label className="flex cursor-pointer items-start gap-2 text-xs text-muted-foreground">
                  <input
                    type="checkbox"
                    checked={marketingConsent}
                    onChange={(e) => setMarketingConsent(e.target.checked)}
                    className="mt-0.5 h-4 w-4 shrink-0 cursor-pointer accent-success"
                  />
                  <span>
                    Quero receber promoções, cupons e novidades por e-mail. Posso cancelar quando quiser.
                  </span>
                </label>
              )}

              {error && (
                <div className="rounded-lg bg-danger-soft px-3 py-2 text-xs font-semibold text-danger">{error}</div>
              )}

              {confirmationSent && (
                <div className="flex items-start gap-2 rounded-lg bg-success-soft px-3 py-2 text-xs text-success">
                  <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />
                  <span>
                    Conta criada! Enviamos um link de confirmação para <strong>{email}</strong>. Confirme o e-mail e
                    depois faça login.
                  </span>
                </div>
              )}

              <button
                type="submit"
                disabled={submitting}
                className="flex w-full items-center justify-center gap-2 rounded-full bg-success px-6 py-3 text-sm font-bold text-white shadow-sm transition hover:brightness-95 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
                {mode === "signin" ? "Entrar" : "Criar conta"}
              </button>
            </form>

            <p className="mt-4 text-center text-[11px] leading-relaxed text-muted-foreground">
              Ao continuar você aceita nossa{" "}
              <Link href="/politica-privacidade" className="font-semibold text-primary underline">
                Política de Privacidade
              </Link>
              .
            </p>
          </div>
        )}
      </div>

      <SiteFooter />
    </main>
  )
}
