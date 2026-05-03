import Link from "next/link"
import { ArrowLeft } from "lucide-react"
import { SiteFooter } from "@/components/site-footer"

export const metadata = {
  title: "Termos de Uso — Açaí Tropical",
  description: "Termos e condições de uso do delivery Açaí Tropical, incluindo política de cancelamento e reembolso.",
}

export default function TermsOfUsePage() {
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
            Termos de Uso
          </span>
        </div>
      </div>

      <div className="mx-auto w-full max-w-3xl flex-1 px-4 py-8">
        <article className="space-y-6 rounded-2xl border border-border bg-white p-6 text-sm leading-relaxed text-foreground shadow-sm md:p-8 md:text-base">
          <header>
            <h1 className="text-2xl font-bold text-primary md:text-3xl">Termos de Uso</h1>
            <p className="mt-1 text-xs text-muted-foreground">Última atualização: 02 de maio de 2026</p>
          </header>

          <section className="space-y-2">
            <h2 className="text-lg font-bold text-foreground">1. Aceitação dos termos</h2>
            <p>
              Ao realizar um pedido no <strong>Açaí Tropical</strong>, você declara ter lido, compreendido e
              aceito integralmente estes Termos de Uso. O pedido só é confirmado após o aceite explícito
              durante o checkout.
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="text-lg font-bold text-foreground">2. Sobre nós</h2>
            <p>
              O Açaí Tropical é um delivery de açaí localizado em São Paulo - SP. Vendemos copos
              individuais e combos da promoção "Pague 1, Leve 2", com complementos personalizáveis.
            </p>
            <p>
              <strong>Contato:</strong> matheusfq2008@gmail.com • WhatsApp (11) 98765-4321
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="text-lg font-bold text-foreground">3. Como funciona o pedido</h2>
            <ul className="list-disc space-y-1 pl-5">
              <li>Você escolhe os produtos e personaliza com coberturas, frutas e complementos.</li>
              <li>Preenche seus dados de identificação e endereço de entrega.</li>
              <li>Escolhe o tipo de entrega (Padrão grátis em 30-50 min ou Express R$ 4,90 em 10-20 min).</li>
              <li>Realiza o pagamento via PIX. O pedido só entra em preparo após confirmação do pagamento.</li>
              <li>Acompanha o status do pedido em tempo real na página "Acompanhar Pedido".</li>
            </ul>
          </section>

          <section className="space-y-2">
            <h2 className="text-lg font-bold text-foreground">4. Preços e pagamento</h2>
            <ul className="list-disc space-y-1 pl-5">
              <li>Os preços exibidos no site são finais e em reais.</li>
              <li>Promoções e cupons têm validade limitada e podem ser alterados a qualquer momento.</li>
              <li>Aceitamos pagamento exclusivamente por PIX no momento desta publicação. Outras formas
                podem ser disponibilizadas no futuro.</li>
              <li>Pedidos pendentes de pagamento são automaticamente cancelados após o vencimento do PIX.</li>
            </ul>
          </section>

          <section className="space-y-2">
            <h2 className="text-lg font-bold text-foreground">5. Cancelamento e reembolso</h2>
            <p>
              Tratando-se de produto perecível e preparado sob demanda, o direito de arrependimento previsto
              no art. 49 do CDC tem aplicação restrita ao período <strong>antes do início do preparo</strong>.
            </p>
            <ul className="list-disc space-y-1 pl-5">
              <li>
                <strong>Antes de pagar:</strong> você pode cancelar o pedido livremente pelo botão "Cancelar
                pedido" disponível na tela de pagamento PIX.
              </li>
              <li>
                <strong>Após pagamento confirmado:</strong> entre em contato pelo WhatsApp em até 5 minutos.
                Se o preparo ainda não tiver começado, faremos o reembolso integral via PIX em até 24h úteis.
              </li>
              <li>
                <strong>Após o início do preparo:</strong> não é possível cancelar (o produto já foi
                consumido em insumos).
              </li>
              <li>
                <strong>Problemas com o pedido entregue</strong> (item errado, produto avariado, atraso
                significativo): entre em contato pelo WhatsApp em até 1h da entrega. Faremos análise caso a
                caso e, se procedente, reembolso integral ou parcial via PIX em até 24h úteis.
              </li>
            </ul>
          </section>

          <section className="space-y-2">
            <h2 className="text-lg font-bold text-foreground">6. Tempo de entrega</h2>
            <p>
              Os tempos exibidos (30-50 min Padrão / 10-20 min Express) são <strong>estimativas</strong>.
              Imprevistos como trânsito intenso, condições climáticas e alta demanda podem causar atrasos.
              Atrasos eventuais não geram reembolso, exceto em casos significativos avaliados caso a caso.
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="text-lg font-bold text-foreground">7. Responsabilidades do cliente</h2>
            <ul className="list-disc space-y-1 pl-5">
              <li>Fornecer endereço completo e correto para entrega.</li>
              <li>Estar disponível para receber o pedido no horário estimado.</li>
              <li>Conferir o pedido no momento da entrega.</li>
              <li>Não usar o site para fins ilícitos ou que violem direitos de terceiros.</li>
            </ul>
          </section>

          <section className="space-y-2">
            <h2 className="text-lg font-bold text-foreground">8. Propriedade intelectual</h2>
            <p>
              Todo o conteúdo do site (textos, imagens, logos, código) pertence ao Açaí Tropical e é
              protegido por direitos autorais. É vedada qualquer reprodução sem autorização expressa.
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="text-lg font-bold text-foreground">9. Modificações</h2>
            <p>
              Reservamo-nos o direito de modificar estes Termos a qualquer momento. Alterações serão
              publicadas nesta página com a data de atualização. O uso contínuo do serviço após mudanças
              implica aceitação dos novos termos.
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="text-lg font-bold text-foreground">10. Foro</h2>
            <p>
              Fica eleito o foro da comarca de São Paulo - SP para dirimir quaisquer questões oriundas
              destes Termos, com renúncia a qualquer outro, por mais privilegiado que seja.
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="text-lg font-bold text-foreground">11. Política de Privacidade</h2>
            <p>
              O tratamento de seus dados pessoais é regido pela nossa{" "}
              <Link href="/politica-privacidade" className="font-semibold text-primary underline">
                Política de Privacidade
              </Link>
              , que faz parte integrante destes Termos.
            </p>
          </section>
        </article>
      </div>
      <SiteFooter />
    </main>
  )
}
