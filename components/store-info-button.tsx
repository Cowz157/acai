import Link from "next/link"
import { Info } from "lucide-react"

/**
 * Atalho pro painel "Sobre a loja" no header. Antes era um drawer com state
 * próprio; virou um Link pra `/sobre-a-loja` pra seguir o mesmo padrão visual
 * de /duvidas, /termos-de-uso e /politica-privacidade — página dedicada com
 * header roxo VOLTAR + card branco com seções.
 */
export function StoreInfoButton() {
  return (
    <Link
      href="/sobre-a-loja"
      aria-label="Informações da loja"
      className="flex h-10 w-10 items-center justify-center rounded-full border-2 border-primary text-primary transition hover:bg-primary hover:text-white"
    >
      <Info className="h-5 w-5" />
    </Link>
  )
}
