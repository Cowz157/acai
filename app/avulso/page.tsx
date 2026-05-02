import Link from "next/link"
import { ArrowLeft, Sparkles } from "lucide-react"
import { ProductCard } from "@/components/product-card"
import { avulsoCategories, products } from "@/lib/data"

export const metadata = {
  title: "Açaí Avulso (1 Copo) — Açaí Tropical",
  description:
    "Prefere apenas 1 copo? Açaí avulso nos tamanhos 300ml, 500ml, 700ml e 1L. Versão tradicional ou Zero açúcar.",
}

export default function AvulsoPage() {
  const productsByCategory = avulsoCategories.map((cat) => ({
    ...cat,
    items: products.filter((p) => p.category === cat.id),
  }))

  return (
    <main className="min-h-screen bg-muted/40 pb-12">
      {/* Header */}
      <div className="bg-primary px-4 py-3">
        <div className="mx-auto flex max-w-6xl items-center justify-between">
          <Link
            href="/"
            className="inline-flex items-center gap-2 rounded-full bg-white/15 px-4 py-1.5 text-sm font-semibold text-white transition hover:bg-white/25"
          >
            <ArrowLeft className="h-4 w-4" />
            CARDÁPIO
          </Link>
          <span className="font-display text-sm font-bold uppercase tracking-wide text-white md:text-base">
            Açaí Avulso
          </span>
        </div>
      </div>

      <div className="mx-auto max-w-6xl px-4 py-5">
        {/* Faixa avisando que combo é melhor */}
        <Link
          href="/#pague-leve"
          className="group flex items-center justify-between gap-3 rounded-xl border-2 border-primary bg-primary-soft px-4 py-3 transition hover:bg-primary-soft/70"
        >
          <span className="flex min-w-0 items-center gap-3">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary text-white">
              <Sparkles className="h-4 w-4" />
            </span>
            <span className="min-w-0 text-sm md:text-base">
              <span className="block font-bold text-primary">
                Sabia que tem promoção <em className="not-italic">Pague 1, Leve 2</em>?
              </span>
              <span className="block text-xs text-muted-foreground md:text-sm">
                Você economiza até 33% levando o combo
              </span>
            </span>
          </span>
          <span className="shrink-0 text-xs font-bold text-primary md:text-sm">Ver combo →</span>
        </Link>

        {/* Categorias */}
        <div className="mt-8 space-y-10">
          {productsByCategory.map((cat) => (
            <section key={cat.id} id={cat.id} className="scroll-mt-20">
              <h2 className="text-2xl font-bold text-primary md:text-3xl">{cat.label}</h2>
              <p className="mt-1 text-sm text-muted-foreground">
                Escolha o tamanho — preço por copo individual
              </p>

              <div className="mt-4 grid grid-cols-1 items-start gap-4 md:grid-cols-2 lg:grid-cols-3">
                {cat.items.map((product) => (
                  <ProductCard key={product.slug} product={product} />
                ))}
              </div>
            </section>
          ))}
        </div>
      </div>
    </main>
  )
}
