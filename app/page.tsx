import { Fragment } from "react"
import Link from "next/link"
import { Heart, Sparkles } from "lucide-react"
import { ActiveOrderBanner } from "@/components/active-order-banner"
import { CategoryNav } from "@/components/category-nav"
import { LiveOrderToast } from "@/components/live-order-toast"
import { LocationModal } from "@/components/location-modal"
import { ProductCard } from "@/components/product-card"
import { PromoTimer } from "@/components/promo-timer"
import { ReviewsWithPhotos } from "@/components/review-with-photo"
import { SiteHeader } from "@/components/site-header"
import { categories, products } from "@/lib/data"

export default function HomePage() {
  const productsByCategory = categories.map((cat) => ({
    ...cat,
    items: products.filter((p) => p.category === cat.id),
  }))

  return (
    <main className="min-h-screen bg-background">
      <LocationModal />
      <SiteHeader />
      <CategoryNav />

      <div className="mx-auto max-w-6xl px-4 py-5">
        <div className="space-y-3">
          <ActiveOrderBanner />

          {/* Faixa Entrega Grátis + linha pequena Express */}
          <div className="rounded-xl border-2 border-success bg-white px-4 py-3 text-center md:px-5 md:py-4">
            <p className="text-sm font-medium text-foreground md:text-base">
              <span className="font-semibold text-success">Entrega Grátis</span> para{" "}
              <strong>Angra Dos Reis</strong>!
            </p>
            <p className="mt-1 text-xs text-muted-foreground md:text-sm">
              ⚡ Tem pressa? <strong className="text-foreground">Express em 10-20 min</strong> por R$ 4,90
            </p>
          </div>

          {/* Faixa Promo */}
          <div className="rounded-xl border-2 border-primary bg-white px-4 py-3 text-center text-sm font-medium text-foreground md:text-base">
            Aproveite nossa <strong>promoção com preços irresistíveis</strong> igual Açaí{" "}
            <Heart className="inline h-4 w-4 fill-primary text-primary" />
          </div>
        </div>

        {/* Categorias */}
        <div className="mt-8 space-y-10">
          {productsByCategory.map((cat) => {
            const isPagueLeve = cat.id === "pague-leve" || cat.id === "pague-leve-zero"
            const isAvulso = cat.id === "avulso" || cat.id === "avulso-zero"
            const firstThree = isPagueLeve ? cat.items.slice(0, 3) : cat.items
            const lastItem = isPagueLeve ? cat.items[3] : null
            // Banner de upsell aparece só ANTES da primeira seção avulso ("1 Copo")
            const showAvulsoUpsell = cat.id === "avulso"

            return (
              <Fragment key={cat.id}>
                {showAvulsoUpsell && (
                  <div className="rounded-xl border-2 border-primary bg-primary-soft px-4 py-3 md:px-5 md:py-4">
                    <div className="flex items-start gap-3">
                      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary text-white">
                        <Sparkles className="h-4 w-4" />
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-extrabold text-primary md:text-base">
                          Levando 2 copos você ganha automaticamente Pague 1, Leve 2 💜
                        </p>
                        <p className="mt-0.5 text-xs text-muted-foreground md:text-sm">
                          Aumente a quantidade no carrinho e a promoção é aplicada na hora — economize até R$ 10
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                <section id={cat.id} className="scroll-mt-20">
                  {cat.tier === "primary" ? (
                    <h2 className="text-2xl font-bold text-primary md:text-3xl">{cat.label}</h2>
                  ) : (
                    <div>
                      <h2 className="text-xl font-bold text-foreground md:text-2xl">{cat.label}</h2>
                      {isAvulso && (
                        <p className="mt-1 text-sm text-muted-foreground">
                          1 copo individual — sem promoção
                        </p>
                      )}
                    </div>
                  )}

                  <div className="mt-4 grid grid-cols-1 items-start gap-4 md:grid-cols-2 lg:grid-cols-3">
                    {firstThree.map((product) => (
                      <ProductCard key={product.slug} product={product} />
                    ))}
                  </div>

                  {isPagueLeve && lastItem && (
                    <div className="mt-4 grid grid-cols-1 items-start gap-4 md:grid-cols-2">
                      <PromoTimer />
                      <ProductCard product={lastItem} />
                    </div>
                  )}
                </section>
              </Fragment>
            )
          })}
        </div>

        {/* Avaliações com fotos */}
        <div className="mt-12">
          <ReviewsWithPhotos />
        </div>

        {/* Timer final antes do bloco de estatísticas */}
        <div className="mt-8 max-w-md">
          <PromoTimer />
        </div>
      </div>

      <LiveOrderToast />

      <footer className="bg-primary py-6 pb-24 text-center text-xs text-white/80 md:pb-6">
        <p>© {new Date().getFullYear()} Açaí Tropical - Todos os direitos reservados</p>
        <p className="mt-1">Angra dos Reis - RJ</p>
        <p className="mt-2">
          <Link href="/politica-privacidade" className="underline underline-offset-2 hover:text-white">
            Política de Privacidade
          </Link>
        </p>
      </footer>
    </main>
  )
}
