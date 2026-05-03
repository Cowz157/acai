"use client"

import { useEffect } from "react"
import { create } from "zustand"
import { supabase } from "./supabase"

export interface AuthUser {
  id: string
  name: string
  email: string
  phone: string
}

interface SignupData {
  name: string
  email: string
  phone: string
  password: string
  /** Se o cliente aceitou receber emails de marketing (LGPD). Default: false. */
  marketingConsent?: boolean
  /** De onde veio: 'signup' (página /conta), 'post_order' (após finalizar pedido), 'lead_magnet'. */
  source?: "signup" | "post_order" | "lead_magnet"
}

interface AuthState {
  user: AuthUser | null
  loading: boolean
  initialized: boolean
  signup: (data: SignupData) => Promise<{ ok: true; needsConfirmation: boolean } | { ok: false; error: string }>
  signin: (email: string, password: string) => Promise<{ ok: true } | { ok: false; error: string }>
  signout: () => Promise<void>
  setUser: (user: AuthUser | null) => void
  setInitialized: () => void
}

export const useAuth = create<AuthState>((set) => ({
  user: null,
  loading: false,
  initialized: false,
  setUser: (user) => set({ user }),
  setInitialized: () => set({ initialized: true }),

  signup: async ({ name, email, phone, password, marketingConsent = false, source = "signup" }) => {
    set({ loading: true })
    const normalizedEmail = email.trim().toLowerCase()
    const trimmedName = name.trim()
    const trimmedPhone = phone.trim()

    const { data, error } = await supabase.auth.signUp({
      email: normalizedEmail,
      password,
      options: {
        data: { name: trimmedName, phone: trimmedPhone },
      },
    })

    if (error) {
      set({ loading: false })
      return { ok: false, error: translateAuthError(error.message) }
    }

    if (data.user && data.session) {
      // Sessão criada de imediato (confirmação de e-mail desativada).
      await upsertProfile(data.user.id, {
        name: trimmedName,
        email: normalizedEmail,
        phone: trimmedPhone,
        marketingConsent,
        source,
      })
      set({
        user: { id: data.user.id, name: trimmedName, email: normalizedEmail, phone: trimmedPhone },
        loading: false,
      })
      return { ok: true, needsConfirmation: false }
    }

    // Sem sessão = precisa confirmar o e-mail antes do primeiro login.
    set({ loading: false })
    return { ok: true, needsConfirmation: true }
  },

  signin: async (email, password) => {
    set({ loading: true })
    const { data, error } = await supabase.auth.signInWithPassword({
      email: email.trim().toLowerCase(),
      password,
    })

    if (error) {
      set({ loading: false })
      return { ok: false, error: translateAuthError(error.message) }
    }

    if (data.user) {
      const profile = await fetchProfile(data.user.id)
      set({
        user: {
          id: data.user.id,
          name: profile?.name ?? (data.user.user_metadata?.name as string) ?? "",
          email: data.user.email ?? "",
          phone: profile?.phone ?? (data.user.user_metadata?.phone as string) ?? "",
        },
        loading: false,
      })
    } else {
      set({ loading: false })
    }
    return { ok: true }
  },

  signout: async () => {
    await supabase.auth.signOut()
    set({ user: null })
  },
}))

async function fetchProfile(userId: string): Promise<{ name: string; phone: string } | null> {
  const { data, error } = await supabase
    .from("profiles")
    .select("name, phone")
    .eq("id", userId)
    .maybeSingle()
  if (error || !data) return null
  return { name: data.name ?? "", phone: data.phone ?? "" }
}

async function upsertProfile(
  userId: string,
  profile: {
    name: string
    email: string
    phone: string
    marketingConsent?: boolean
    source?: string
  },
): Promise<void> {
  await supabase.from("profiles").upsert({
    id: userId,
    name: profile.name,
    email: profile.email,
    phone: profile.phone,
    marketing_consent: profile.marketingConsent ?? false,
    source: profile.source ?? "signup",
  })
}

function translateAuthError(message: string): string {
  const m = message.toLowerCase()
  if (m.includes("invalid login")) return "E-mail ou senha incorretos"
  if (m.includes("already registered") || m.includes("already exists")) return "Já existe uma conta com esse e-mail"
  if (m.includes("password should be")) return "A senha precisa ter no mínimo 6 caracteres"
  if (m.includes("invalid email")) return "E-mail inválido"
  if (m.includes("email not confirmed")) return "Confirme seu e-mail antes de entrar"
  return message
}

/**
 * Hook que sincroniza o estado de auth com o Supabase ao montar.
 * Use uma vez no topo da árvore (ex.: layout) ou direto na página /conta.
 */
export function useAuthSync() {
  const setUser = useAuth((s) => s.setUser)
  const setInitialized = useAuth((s) => s.setInitialized)

  useEffect(() => {
    let isMounted = true

    const hydrate = async () => {
      const { data } = await supabase.auth.getSession()
      const session = data.session
      if (!isMounted) return
      if (session?.user) {
        const profile = await fetchProfile(session.user.id)
        if (!isMounted) return
        setUser({
          id: session.user.id,
          name: profile?.name ?? (session.user.user_metadata?.name as string) ?? "",
          email: session.user.email ?? "",
          phone: profile?.phone ?? (session.user.user_metadata?.phone as string) ?? "",
        })
      }
      setInitialized()
    }

    hydrate()

    const { data: sub } = supabase.auth.onAuthStateChange(async (_event, session) => {
      if (!isMounted) return
      if (!session?.user) {
        setUser(null)
        return
      }
      const profile = await fetchProfile(session.user.id)
      if (!isMounted) return
      setUser({
        id: session.user.id,
        name: profile?.name ?? (session.user.user_metadata?.name as string) ?? "",
        email: session.user.email ?? "",
        phone: profile?.phone ?? (session.user.user_metadata?.phone as string) ?? "",
      })
    })

    return () => {
      isMounted = false
      sub.subscription.unsubscribe()
    }
  }, [setUser, setInitialized])
}
