import type { Metadata } from "next"
import Script from "next/script"
import { Poppins, Nunito } from "next/font/google"
import { CartUI } from "@/components/cart/cart-ui"
import { CouponBanner } from "@/components/coupon-banner"
import { Toaster } from "@/components/ui/sonner"
import { UtmsCapture } from "@/components/utms-capture"
import "./globals.css"

const poppins = Poppins({
  subsets: ["latin"],
  weight: ["400", "600", "700"],
  variable: "--font-poppins",
  display: "swap",
})

const nunito = Nunito({
  subsets: ["latin"],
  weight: ["700", "800"],
  variable: "--font-nunito",
  display: "swap",
})

export const metadata: Metadata = {
  title: "Açaí Paraíso - Delivery de Açaí",
  description: "Todo dia é dia de açaí! Pague 1, Leve 2. Entrega rápida em Angra dos Reis.",
  generator: "v0.app",
  icons: {
    icon: "/images/favicon.png",
    apple: "/images/favicon.png",
  },
}

// GTM só carrega se a env var existir (Railway prod) E o hostname estiver na allowlist.
// Defesa em camadas: a env var bloqueia previews Vercel / dev local; o hostname check
// bloqueia caso a env var vaze pra um build não-prod (acessos diretos à URL Railway,
// alias DNS futuro, etc).
// ATENÇÃO: pra adicionar novo domínio aqui, precisa também adicioná-lo no GTM Admin →
// Container Settings → Monitored Domains (Domínios monitorados), senão o alerta de
// "Outros domínios detectados" volta.
const GTM_ID = process.env.NEXT_PUBLIC_GTM_ID
const GTM_HOSTS = ["acai.pedii.shop", "www.acai.pedii.shop"]

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="pt-BR" className={`${poppins.variable} ${nunito.variable} bg-background`}>
      <head>
        {/* Google Tag Manager — gerencia todos os pixels (Google Ads, GA4, etc.).
            Só dispara em produção (env var setada) E em hostname da allowlist. */}
        {GTM_ID && (
          <Script id="gtm-init" strategy="afterInteractive">
            {`if (${JSON.stringify(GTM_HOSTS)}.indexOf(window.location.hostname) !== -1) {
(function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':
new Date().getTime(),event:'gtm.js'});var f=d.getElementsByTagName(s)[0],
j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';j.async=true;j.src=
'https://www.googletagmanager.com/gtm.js?id='+i+dl;f.parentNode.insertBefore(j,f);
})(window,document,'script','dataLayer','${GTM_ID}');
}`}
          </Script>
        )}
      </head>
      <body className="font-sans antialiased">
        {/* GTM noscript fallback. Mesma proteção via env var — não tem como fazer
            hostname check em <noscript> puro, mas o impacto é zero (Next.js depende
            de JS). Sem GTM_ID, o iframe não renderiza nem em preview/dev. */}
        {GTM_ID && (
          <noscript>
            <iframe
              src={`https://www.googletagmanager.com/ns.html?id=${GTM_ID}`}
              height="0"
              width="0"
              style={{ display: "none", visibility: "hidden" }}
            />
          </noscript>
        )}
        <UtmsCapture />
        <CouponBanner />
        {children}
        <CartUI />
        <Toaster position="top-center" closeButton />
      </body>
    </html>
  )
}
