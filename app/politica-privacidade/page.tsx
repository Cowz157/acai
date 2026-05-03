import Link from "next/link"
import { ArrowLeft } from "lucide-react"
import { SiteFooter } from "@/components/site-footer"

export const metadata = {
  title: "Política de Privacidade — Açaí Tropical",
  description: "Como tratamos seus dados pessoais ao usar o Açaí Tropical.",
}

export default function PrivacyPolicyPage() {
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
            Política de Privacidade
          </span>
        </div>
      </div>

      <div className="mx-auto w-full max-w-3xl flex-1 px-4 py-8">
        <article className="space-y-6 rounded-2xl border border-border bg-white p-6 text-sm leading-relaxed text-foreground shadow-sm md:p-8 md:text-base">
          <header>
            <h1 className="text-2xl font-bold text-primary md:text-3xl">Política de Privacidade</h1>
            <p className="mt-1 text-xs text-muted-foreground">Última atualização: 02 de maio de 2026</p>
          </header>

          <section className="space-y-2">
            <h2 className="text-lg font-bold text-foreground">1. Quem somos</h2>
            <p>
              O <strong>Açaí Tropical</strong> é um delivery de açaí que opera em São Paulo - SP. Esta política
              explica como coletamos, usamos e protegemos os dados que você informa ao realizar um pedido.
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="text-lg font-bold text-foreground">2. Dados que coletamos</h2>
            <p>Para concluir o seu pedido coletamos:</p>
            <ul className="list-disc space-y-1 pl-5">
              <li>Nome completo;</li>
              <li>Telefone (WhatsApp);</li>
              <li>Endereço de entrega (CEP, rua, número, complemento, bairro e ponto de referência);</li>
              <li>Forma de pagamento escolhida e, quando aplicável, o valor para troco;</li>
              <li>Detalhes do pedido (itens, complementos e observações).</li>
            </ul>
          </section>

          <section className="space-y-2">
            <h2 className="text-lg font-bold text-foreground">3. Como usamos esses dados</h2>
            <ul className="list-disc space-y-1 pl-5">
              <li>Para preparar e entregar o seu pedido;</li>
              <li>Para entrar em contato sobre o pedido (status, confirmação, ajustes);</li>
              <li>Para emissão de comprovantes e cumprimento de obrigações legais e fiscais;</li>
              <li>Para melhorar a experiência de compra e o atendimento.</li>
            </ul>
          </section>

          <section className="space-y-2">
            <h2 className="text-lg font-bold text-foreground">4. Compartilhamento</h2>
            <p>
              Não vendemos seus dados. Compartilhamos informações apenas com prestadores essenciais para a operação
              (entregadores e provedor de pagamento PIX) e quando exigido por autoridades competentes.
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="text-lg font-bold text-foreground">5. Cookies</h2>
            <p>
              Usamos armazenamento local do navegador (localStorage) para lembrar do seu carrinho e da exibição inicial
              do modal de localização. Você pode limpar a qualquer momento nas configurações do navegador.
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="text-lg font-bold text-foreground">6. Seus direitos</h2>
            <p>
              Você pode solicitar acesso, correção ou exclusão dos seus dados, conforme a Lei Geral de Proteção de
              Dados (LGPD - Lei 13.709/2018), entrando em contato pelo nosso WhatsApp ou Instagram.
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="text-lg font-bold text-foreground">7. Retenção</h2>
            <p>
              Mantemos os dados de pedidos pelo prazo necessário para cumprimento das obrigações legais, fiscais e de
              defesa em eventuais processos. Após esse período, os dados são descartados de forma segura.
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="text-lg font-bold text-foreground">8. Contato</h2>
            <p>
              Em caso de dúvidas sobre esta política, entre em contato pelo nosso Instagram{" "}
              <a
                href="https://instagram.com"
                target="_blank"
                rel="noopener noreferrer"
                className="font-semibold text-primary underline"
              >
                @acaidocentro
              </a>
              .
            </p>
          </section>
        </article>
      </div>
      <SiteFooter />
    </main>
  )
}
