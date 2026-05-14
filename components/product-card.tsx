import Image from "next/image"
import Link from "next/link"
import { Sparkles } from "lucide-react"
import { findComboEquivalent, type Product } from "@/lib/data"
import { cn } from "@/lib/utils"

function formatPrice(value: number) {
  return value.toFixed(2).replace(".", ",")
}

export function ProductCard({ product }: { product: Product }) {
  const isBest = product.isBestSeller
  const isAddon = product.kind === "addon"
  const isAvulso = product.category === "avulso" || product.category === "avulso-zero"
  const isCombo = product.category === "pague-leve" || product.category === "pague-leve-zero"
  const hasDiscount = product.oldPrice > product.price

  // Pra avulsos: calcula a economia se o cliente levar 2 (ativa o combo)
  const avulsoCombo = isAvulso ? findComboEquivalent(product) : null
  const avulsoSavings = avulsoCombo ? Math.max(0, 2 * product.price - avulsoCombo.price) : 0

  const hasExtras = Boolean(
    product.highlight || product.bestSellerNote || isCombo || avulsoSavings > 0,
  )

  return (
    <Link
      href={`/produto/${product.slug}`}
      className={cn(
        "group relative block rounded-xl bg-white p-3 transition hover:shadow-md lg:p-4 lg:duration-300 lg:hover:-translate-y-1 lg:hover:shadow-xl",
        isBest ? "animate-best-seller-pulse border-[3px] border-success" : "border border-border",
      )}
    >
      {isBest && (
        <div className="absolute left-1/2 top-2 z-10 -translate-x-1/2">
          <span className="inline-flex items-center gap-1 rounded-full bg-best-badge px-3 py-1 text-[11px] font-bold text-best-badge-text shadow-sm">
            MAIS VENDIDO <span className="text-base leading-none">💜</span>
          </span>
        </div>
      )}

      <div
        className={cn(
          "flex gap-3 lg:flex-col lg:gap-4",
          isBest && "pt-7",
          hasExtras ? "items-start lg:items-stretch" : "items-center lg:items-stretch",
        )}
      >
        <div className="min-w-0 flex-1 lg:order-2">
          <h3 className="text-sm font-bold leading-snug text-foreground md:text-base lg:text-lg">{product.name}</h3>
          {!isAddon && product.freebies > 0 && (
            <p className="mt-0.5 text-xs text-muted-foreground">{product.freebies} Complementos Grátis</p>
          )}

          {product.highlight && (
            <div className="mt-2 rounded-lg bg-muted/60 px-2.5 py-1.5 text-xs text-foreground">
              {product.highlight}
            </div>
          )}

          {hasDiscount ? (
            <>
              <div className="mt-1.5 text-xs text-muted-foreground">de</div>
              <div className="text-sm text-muted-foreground line-through">R$ {formatPrice(product.oldPrice)}</div>
              <div className="text-xs text-muted-foreground">por</div>
              <div
                className={cn(
                  "inline-block text-base font-extrabold md:text-lg lg:text-2xl",
                  isBest ? "rounded-md bg-success px-2 py-0.5 text-white" : "text-success",
                )}
              >
                R$ {formatPrice(product.price)}
              </div>
            </>
          ) : (
            <div
              className={cn(
                "mt-2 inline-block text-base font-extrabold md:text-lg lg:text-2xl",
                isBest ? "rounded-md bg-success px-2 py-0.5 text-white" : "text-success",
              )}
            >
              R$ {formatPrice(product.price)}
            </div>
          )}

          {avulsoSavings > 0 && (
            <div className="mt-2">
              <span className="inline-flex items-center gap-1 rounded-full bg-primary-soft px-2.5 py-1 text-[10px] font-bold text-primary md:text-[11px]">
                <Sparkles className="h-3 w-3" />
                Leve 2 e economize R$ {formatPrice(avulsoSavings)}
              </span>
            </div>
          )}

          {product.bestSellerNote && (
            <p className="mt-2 text-xs italic leading-snug text-muted-foreground">{product.bestSellerNote}</p>
          )}

          {isCombo && (
            <div className="mt-2">
              <span className="inline-flex items-center gap-1 rounded-full bg-primary-soft px-2.5 py-1 text-[10px] font-bold text-primary md:text-[11px]">
                <Sparkles className="h-3 w-3" />
                2 copos pelo preço de 1
              </span>
            </div>
          )}
        </div>

        <div
          className={cn(
            "relative shrink-0 lg:order-1 lg:h-56 lg:w-full lg:self-stretch lg:overflow-hidden lg:rounded-lg",
            hasExtras ? "h-24 w-24 self-start md:h-28 md:w-28" : "h-28 w-28 md:h-32 md:w-32",
          )}
        >
          <Image
            src={product.image || "/placeholder.svg"}
            alt={product.name}
            fill
            className="object-contain transition-transform duration-300 lg:group-hover:scale-105"
            sizes="(max-width: 768px) 112px, (max-width: 1024px) 128px, 360px"
          />
        </div>
      </div>
    </Link>
  )
}
