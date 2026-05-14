import { Fragment } from "react"
import { Heart, Sparkles } from "lucide-react"
import { ActiveOrderBanner } from "@/components/active-order-banner"
import { CategoryNav } from "@/components/category-nav"
import { DeliveryBanner } from "@/components/delivery-banner"
import { LocationModal } from "@/components/location-modal"
import { ProductCard } from "@/components/product-card"
import { PromoTimer } from "@/components/promo-timer"
import { ReviewCta } from "@/components/review-cta"
import { ReviewsWithPhotos } from "@/components/review-with-photo"
import { SiteFooter } from "@/components/site-footer"
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

          {/* Faixa Entrega Grátis + linha pequena Express (cidade dinâmica via IP) */}
          <DeliveryBanner />

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
                    <div className="mt-4 grid grid-cols-1 items-start gap-4 md:grid-cols-2 lg:grid-cols-3">
                      <div className="lg:col-span-2">
                        <PromoTimer />
                      </div>
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

        {/* CTA pra deixar avaliação — gancho de criação de conta */}
        <div className="mt-6">
          <ReviewCta />
        </div>

        {/* Timer final antes do bloco de estatísticas */}
        <div className="mt-8 max-w-md">
          <PromoTimer />
        </div>
      </div>

      <SiteFooter withCartBarPadding />
    </main>
  )
}
