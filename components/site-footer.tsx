import Link from "next/link"

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
      <p>© {new Date().getFullYear()} Açaí Tropical - Todos os direitos reservados</p>
      <p className="mt-1">São Paulo - SP</p>
      <p className="mt-2">
        <Link href="/politica-privacidade" className="underline underline-offset-2 hover:text-white">
          Política de Privacidade
        </Link>
      </p>
    </footer>
  )
}
