import type { Metadata } from "next"
import Script from "next/script"
import { Poppins, Nunito } from "next/font/google"
import { Analytics } from "@vercel/analytics/next"
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
  title: "Açaí Tropical - Delivery de Açaí",
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
        <Script
          src="https://cdn.utmify.com.br/scripts/utms/latest.js"
          data-utmify-prevent-xcod-sck=""
          data-utmify-prevent-subids=""
          strategy="afterInteractive"
        />
      </head>
      <body className="font-sans antialiased">
        <UtmsCapture />
        {children}
        <CartUI />
        {process.env.NODE_ENV === "production" && <Analytics />}
      </body>
    </html>
  )
}
