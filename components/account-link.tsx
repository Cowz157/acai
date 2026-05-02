"use client"

import Link from "next/link"
import { User } from "lucide-react"
import { useAuth, useAuthSync } from "@/lib/auth-store"

export function AccountLink() {
  useAuthSync()
  const user = useAuth((s) => s.user)
  const initialized = useAuth((s) => s.initialized)

  // Antes de hidratar evitamos mostrar nome (evita flash/mismatch SSR).
  const label = initialized && user ? user.name.split(" ")[0] || "Conta" : "Entrar"

  return (
    <Link
      href="/conta"
      aria-label="Minha conta"
      className="inline-flex h-10 items-center gap-1.5 rounded-full border-2 border-primary px-3 text-xs font-bold text-primary transition hover:bg-primary hover:text-white md:text-sm"
    >
      <User className="h-4 w-4" />
      {label}
    </Link>
  )
}
