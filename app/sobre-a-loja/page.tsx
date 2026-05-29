import Link from "next/link"
import { ArrowLeft } from "lucide-react"
import { SiteFooter } from "@/components/site-footer"
import { SobreLocationCard } from "@/components/sobre-a-loja/location-card"

export const metadata = {
  title: "Sobre a loja — Açaí Paraíso",
  description:
    "Conheça o Açaí Paraíso: delivery de açaí com complementos grátis, promoção Pague 1 Leve 2 e entrega rápida.",
}

export default function SobreALojaPage() {
  return (
    <main className="flex min-h-screen flex-col bg-muted/40">
      <div className="bg-primary px-4 py-3">
        <div className="mx-auto flex max-w-3xl items-center justify-between">
          <Link
            href="/"
            className="inline-flex items-center gap-2 rounded-full bg-white/15 px-4 py-1.5 text-sm font-semibold text-white transition hover:bg-white/25"
          >
            <ArrowLeft className="h-4 w-4" />
            VOLTAR
          </Link>
          <span className="text-sm font-bold uppercase tracking-wide text-white md:text-base">
            Sobre a loja
          </span>
        </div>
      </div>

      <div className="mx-auto w-full max-w-3xl flex-1 px-4 py-8">
        <article className="space-y-6 rounded-2xl border border-border bg-white p-6 text-sm leading-relaxed text-foreground shadow-sm md:p-8 md:text-base">
          <header>
            <h1 className="text-2xl font-bold text-primary md:text-3xl">Sobre a loja</h1>
            <p className="mt-1 text-xs text-muted-foreground">Última atualização: 29 de maio de 2026</p>
          </header>

          <section className="space-y-2">
            <h2 className="text-lg font-bold text-foreground">1. Quem somos</h2>
            <p>
              O <strong>Açaí Paraíso</strong> é um delivery de açaí que aposta na receita tradicional —
              polpa pura, sem mistura — com complementos grátis e entrega rápida. Nossa promoção mais
              famosa é a <strong>Pague 1, Leve 2</strong>: você escolhe o copo, levamos dois.
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="text-lg font-bold text-foreground">2. Atende em</h2>
            <SobreLocationCard />
            <p className="mt-2 text-xs text-muted-foreground">
              A cidade exibida é detectada automaticamente. Se preferir escolher outra região, use o
              seletor no topo do site.
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="text-lg font-bold text-foreground">3. Como funciona o pedido</h2>
            <ul className="list-disc space-y-1 pl-5">
              <li>Escolha os copos e complementos diretamente no site, sem precisar de app.</li>
              <li>Pagamento via <strong>PIX</strong> instantâneo gerado no checkout.</li>
              <li>O preparo começa assim que o PIX é confirmado.</li>
              <li>
                Entrega <strong>Padrão</strong> em 30-50 min (grátis hoje) ou{" "}
                <strong>Express</strong> em 10-20 min por R$ 4,90.
              </li>
            </ul>
          </section>

          <section className="space-y-2">
            <h2 className="text-lg font-bold text-foreground">4. Formas de pagamento</h2>
            <ul className="list-disc space-y-1 pl-5">
              <li>
                <strong>PIX</strong> — instantâneo, com QR Code ou copia e cola. É a única forma
                aceita no momento.
              </li>
              <li>
                <strong>Cartão</strong> — indisponível no momento. Volta em breve, mas no PIX a
                promoção sai mais em conta pra você.
              </li>
            </ul>
          </section>

          <section className="space-y-2">
            <h2 className="text-lg font-bold text-foreground">5. Horário de funcionamento</h2>
            <p>
              Todo dia, sem folga. Açaí não tem dia de descanso 💜
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="text-lg font-bold text-foreground">6. Promoções e cupons</h2>
            <ul className="list-disc space-y-1 pl-5">
              <li>
                <strong>Pague 1, Leve 2</strong> — combo automático na seção de combos ou ao levar 2
                copos avulsos.
              </li>
              <li>
                Cupom <strong>ACAI20</strong> — 20% de desconto no produto de maior valor do
                carrinho. Vale 1x por email.
              </li>
              <li>Entrega grátis hoje na sua região.</li>
            </ul>
          </section>

          <section className="space-y-2">
            <h2 className="text-lg font-bold text-foreground">7. Contato</h2>
            <p>
              <strong>WhatsApp:</strong>{" "}
              <a
                href="https://wa.me/5511987654321"
                target="_blank"
                rel="noopener noreferrer"
                className="font-semibold text-primary underline"
              >
                (11) 98765-4321
              </a>
            </p>
            <p>
              <strong>Email:</strong>{" "}
              <a href="mailto:contato@pedii.shop" className="font-semibold text-primary underline">
                contato@pedii.shop
              </a>
            </p>
          </section>

          <div className="rounded-xl bg-primary-soft px-4 py-4 text-center text-sm text-foreground md:text-base">
            <p>
              Ficou com alguma dúvida específica?{" "}
              <Link href="/duvidas" className="font-semibold text-primary underline">
                Ver dúvidas frequentes
              </Link>
              .
            </p>
          </div>
        </article>
      </div>

      <SiteFooter />
    </main>
  )
}
