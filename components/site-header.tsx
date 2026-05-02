import Image from "next/image"
import { Bike, Coins, MapPin, Star } from "lucide-react"
import { AccountLink } from "./account-link"
import { StoreInfoButton } from "./store-info-button"

export function SiteHeader() {
  return (
    <header className="relative">
      {/* Banner */}
      <div className="relative h-[170px] w-full overflow-hidden md:h-[200px]">
        <Image
          src="/images/banner.webp"
          alt="Banner Açaí Tropical"
          fill
          priority
          sizes="100vw"
          className="object-cover object-[15%_center] md:object-center"
        />
      </div>

      {/* Cartão branco com cantos arredondados (estilo card sobreposto ao banner) */}
      <div className="relative -mt-6 rounded-t-[28px] bg-white md:-mt-8 md:rounded-t-[36px]">
        {/* Logo flutuante */}
        <div className="flex justify-center translate-y-[-55px] -mb-12 md:translate-y-[-64px] md:-mb-14">
          <div className="rounded-full border-[5px] border-white bg-white shadow-xl ring-1 ring-black/5">
            <div className="relative h-[110px] w-[110px] overflow-hidden rounded-full md:h-[150px] md:w-[150px]">
              <Image
                src="/images/logo.png"
                alt="Logo Açaí Tropical"
                fill
                priority
                sizes="(max-width: 768px) 110px, 150px"
                className="scale-110 object-cover"
              />
            </div>
          </div>
        </div>

        {/* Info da loja */}
        <div className="mx-auto max-w-4xl px-4 pt-4 pb-6 text-center">
        <h1
          className="font-display text-[26px] font-bold leading-tight text-primary md:text-[36px]"
          style={{ letterSpacing: "-0.5px" }}
        >
          Açaí Tropical
        </h1>

        {/* Ações: minha conta + info da loja */}
        <div className="mt-3 flex flex-wrap items-center justify-center gap-3">
          <AccountLink />
          <StoreInfoButton />
        </div>

        {/* Linha de info: pedido mínimo + tempo + grátis (UMA linha no mobile) */}
        <div className="mt-4 flex flex-nowrap items-center justify-center gap-x-1.5 whitespace-nowrap text-[12px] text-foreground md:gap-x-3 md:text-base">
          <span className="flex shrink-0 items-center gap-1">
            <Coins className="h-3 w-3 text-muted-foreground md:h-4 md:w-4" />
            <span>
              Pedido Mínimo <strong>R$ 10,00</strong>
            </span>
          </span>
          <span className="flex shrink-0 items-center gap-1">
            <Bike className="h-3 w-3 text-muted-foreground md:h-4 md:w-4" />
            <span>30-50 min</span>
          </span>
          <span className="shrink-0">
            • <strong className="text-success">Grátis</strong>
          </span>
        </div>

        <div className="mt-1 flex items-center justify-center gap-1.5 text-sm md:text-base">
          <MapPin className="h-4 w-4 text-muted-foreground" />
          <span>Angra Dos Reis - RJ • 1,6km de você</span>
        </div>

        <div className="mt-1 flex items-center justify-center gap-1.5 text-sm md:text-base">
          <Star className="h-4 w-4 fill-amber-400 text-amber-400" />
          <span>
            <strong>4,8</strong> (136 avaliações)
          </span>
        </div>

        {/* Badge ABERTO */}
        <div className="mt-3 inline-flex items-center gap-2 rounded-full bg-success-soft px-4 py-1.5 text-sm font-semibold text-success">
          <span className="h-2 w-2 rounded-full bg-success" />
          ABERTO
        </div>
        </div>
      </div>
    </header>
  )
}
