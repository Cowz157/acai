import { notFound } from "next/navigation"
import { ProductCustomizer } from "@/components/product-customizer"
import { products } from "@/lib/data"

export function generateStaticParams() {
  return products.map((p) => ({ slug: p.slug }))
}

export default async function ProductPage({
  params,
}: {
  params: Promise<{ slug: string }>
}) {
  const { slug } = await params
  const product = products.find((p) => p.slug === slug)
  if (!product) notFound()
  return <ProductCustomizer product={product} />
}
