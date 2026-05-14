import type { Metadata } from "next"
import Script from "next/script"
import { Poppins, Nunito } from "next/font/google"
import { CartUI } from "@/components/cart/cart-ui"
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
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="pt-BR" className={`${poppins.variable} ${nunito.variable} bg-background`}>
      <head>
        {/* Google Tag Manager — gerencia todos os pixels (Google Ads, GA4, etc.)
            via container GTM-WVTNHC4M. */}
        <Script id="gtm-init" strategy="afterInteractive">
          {`(function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':
new Date().getTime(),event:'gtm.js'});var f=d.getElementsByTagName(s)[0],
j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';j.async=true;j.src=
'https://www.googletagmanager.com/gtm.js?id='+i+dl;f.parentNode.insertBefore(j,f);
})(window,document,'script','dataLayer','GTM-WVTNHC4M');`}
        </Script>
      </head>
      <body className="font-sans antialiased">
        {/* GTM noscript fallback — recomendado pela Google logo após <body> */}
        <noscript>
          <iframe
            src="https://www.googletagmanager.com/ns.html?id=GTM-WVTNHC4M"
            height="0"
            width="0"
            style={{ display: "none", visibility: "hidden" }}
          />
        </noscript>
        <UtmsCapture />
        {children}
        <CartUI />
      </body>
    </html>
  )
}
