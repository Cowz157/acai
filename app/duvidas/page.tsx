import Link from "next/link"
import { ArrowLeft, HelpCircle } from "lucide-react"
import { SiteFooter } from "@/components/site-footer"

export const metadata = {
  title: "Dúvidas frequentes — Açaí Tropical",
  description:
    "Respostas pras perguntas mais comuns sobre pedidos, entrega, pagamento e cancelamento no Açaí Tropical.",
}

interface FAQ {
  q: string
  a: React.ReactNode
}

const FAQS: FAQ[] = [
  {
    q: "Quanto tempo demora pra chegar?",
    a: (
      <>
        A entrega <strong>Padrão</strong> chega entre 30-50 minutos e é grátis na maior parte da
        cidade. A <strong>Express</strong> chega em 10-20 minutos por R$ 4,90 a mais. O tempo
        começa a contar a partir da confirmação do pagamento.
      </>
    ),
  },
  {
    q: "Quais formas de pagamento vocês aceitam?",
    a: (
      <>
        No momento aceitamos <strong>apenas PIX</strong> — pagamento na hora, com QR Code ou copia
        e cola. Outras formas (cartão, dinheiro na entrega) podem ser disponibilizadas no futuro.
      </>
    ),
  },
  {
    q: "Como acompanho meu pedido?",
    a: (
      <>
        Depois de pagar, você é redirecionado pra página{" "}
        <Link href="/acompanhar" className="font-semibold text-primary underline">
          Acompanhar Pedido
        </Link>
        . Você também recebe um <strong>email de confirmação</strong> com link pra acompanhar
        de qualquer dispositivo (celular, computador). É atualizado em tempo real.
      </>
    ),
  },
  {
    q: "Posso cancelar meu pedido?",
    a: (
      <>
        <strong>Antes de pagar:</strong> sim, basta clicar em "Cancelar pedido" na tela do PIX.
        <br />
        <strong>Depois de pagar:</strong> entre em contato pelo WhatsApp em até 5 minutos. Se o
        preparo ainda não tiver começado, fazemos o reembolso integral via PIX em até 24h úteis.
        <br />
        Após o início do preparo o cancelamento não é possível, pois o produto é perecível.
      </>
    ),
  },
  {
    q: "O pedido chegou errado ou avariado, e agora?",
    a: (
      <>
        Lamentamos! Entre em contato pelo{" "}
        <a href="https://wa.me/5511987654321" className="font-semibold text-primary underline">
          WhatsApp
        </a>{" "}
        em até 1 hora da entrega com fotos do problema. Fazemos análise caso a caso e, se
        procedente, oferecemos reembolso total ou parcial via PIX em até 24h úteis.
      </>
    ),
  },
  {
    q: "Vocês entregam na minha região?",
    a: (
      <>
        Atendemos toda a cidade de São Paulo. Se você está em outra cidade, infelizmente ainda
        não chegamos aí. Para confirmar, basta digitar seu CEP no checkout — se a entrega não
        for possível, o sistema avisa antes de você finalizar.
      </>
    ),
  },
  {
    q: "Como funciona a promoção 'Pague 1, Leve 2'?",
    a: (
      <>
        Comprando 2 copos da seção <strong>Pague 1, Leve 2</strong>, você paga apenas 1.
        A promoção é aplicada automaticamente no carrinho — não precisa de cupom.
      </>
    ),
  },
  {
    q: "Como atualizo ou removo meus dados?",
    a: (
      <>
        Conforme a LGPD, você pode solicitar acesso, correção ou exclusão dos seus dados a
        qualquer momento. Mande um email pra{" "}
        <a href="mailto:contato@pedii.shop" className="font-semibold text-primary underline">
          contato@pedii.shop
        </a>{" "}
        ou fale no WhatsApp (11) 98765-4321 que respondemos em até 48h úteis.
      </>
    ),
  },
  {
    q: "Como cancelo as ofertas por email?",
    a: (
      <>
        Em todo email promocional há um link de descadastro no rodapé. Clique nele pra parar de
        receber. Os emails de confirmação de pedido continuam (são transacionais, parte do serviço).
      </>
    ),
  },
]

export default function FaqPage() {
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
            Dúvidas frequentes
          </span>
        </div>
      </div>

      <div className="mx-auto w-full max-w-3xl flex-1 px-4 py-8">
        <div className="rounded-2xl border border-border bg-white p-6 shadow-sm md:p-8">
          <header className="flex items-center gap-3">
            <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-primary-soft">
              <HelpCircle className="h-6 w-6 text-primary" />
            </span>
            <div>
              <h1 className="text-2xl font-bold text-primary md:text-3xl">Dúvidas frequentes</h1>
              <p className="mt-0.5 text-xs text-muted-foreground md:text-sm">
                Respostas pras perguntas mais comuns sobre pedidos, entrega e pagamento.
              </p>
            </div>
          </header>

          <ul className="mt-6 divide-y divide-border">
            {FAQS.map((faq) => (
              <li key={faq.q} className="py-4">
                <details className="group">
                  <summary className="flex cursor-pointer list-none items-center justify-between gap-2 text-sm font-bold text-foreground md:text-base">
                    {faq.q}
                    <span className="text-primary transition group-open:rotate-45">+</span>
                  </summary>
                  <p className="mt-3 text-sm leading-relaxed text-muted-foreground md:text-base">
                    {faq.a}
                  </p>
                </details>
              </li>
            ))}
          </ul>

          <div className="mt-6 rounded-xl bg-primary-soft px-4 py-4 text-center text-sm text-foreground md:text-base">
            <p>
              Não encontrou sua dúvida?{" "}
              <a href="mailto:contato@pedii.shop" className="font-semibold text-primary underline">
                contato@pedii.shop
              </a>{" "}
              ou{" "}
              <a
                href="https://wa.me/5511987654321"
                target="_blank"
                rel="noopener noreferrer"
                className="font-semibold text-primary underline"
              >
                WhatsApp
              </a>
              .
            </p>
          </div>
        </div>
      </div>

      <SiteFooter />
    </main>
  )
}
