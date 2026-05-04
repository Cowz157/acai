import Link from "next/link"
import { Mail, MessageCircle } from "lucide-react"

interface SiteFooterProps {
  /** Padding extra no bottom pra acomodar a barra mobile do carrinho. */
  withCartBarPadding?: boolean
}

export function SiteFooter({ withCartBarPadding = false }: SiteFooterProps) {
  return (
    <footer
      className={
        withCartBarPadding
          ? "bg-primary py-6 pb-24 text-center text-xs text-white/80 md:pb-6"
          : "bg-primary py-6 text-center text-xs text-white/80"
      }
    >
      <p className="font-semibold">© {new Date().getFullYear()} Açaí Tropical</p>
      <p className="mt-0.5">São Paulo - SP • Todos os direitos reservados</p>

      {/* Contato */}
      <div className="mt-3 flex flex-wrap items-center justify-center gap-x-4 gap-y-1.5">
        <a
          href="https://wa.me/5511987654321"
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1.5 underline-offset-2 hover:text-white hover:underline"
        >
          <MessageCircle className="h-3.5 w-3.5" />
          WhatsApp: (11) 98765-4321
        </a>
        <span className="opacity-40">•</span>
        <a
          href="mailto:contato@anoteii.shop"
          className="inline-flex items-center gap-1.5 underline-offset-2 hover:text-white hover:underline"
        >
          <Mail className="h-3.5 w-3.5" />
          contato@anoteii.shop
        </a>
      </div>

      {/* Links legais */}
      <div className="mt-3 flex flex-wrap items-center justify-center gap-x-4 gap-y-1">
        <Link href="/duvidas" className="underline underline-offset-2 hover:text-white">
          Dúvidas frequentes
        </Link>
        <span className="opacity-40">•</span>
        <Link href="/politica-privacidade" className="underline underline-offset-2 hover:text-white">
          Política de Privacidade
        </Link>
        <span className="opacity-40">•</span>
        <Link href="/termos-de-uso" className="underline underline-offset-2 hover:text-white">
          Termos de Uso
        </Link>
      </div>
    </footer>
  )
}
