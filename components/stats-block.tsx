import { Star, Truck, Heart } from "lucide-react"
import { testimonials } from "@/lib/data"

export function StatsBlock() {
  return (
    <section className="bg-primary-soft py-10">
      <div className="mx-auto max-w-5xl px-4">
        <div className="flex flex-col items-center justify-center gap-4 md:flex-row md:gap-6">
          {/* Card avaliações */}
          <div className="flex w-full max-w-[260px] flex-col items-center rounded-2xl bg-white p-5 shadow-sm">
            <div className="text-4xl font-extrabold text-foreground">4,8</div>
            <div className="mt-1 flex items-center gap-0.5">
              {Array.from({ length: 5 }).map((_, i) => (
                <Star key={i} className="h-5 w-5 fill-amber-400 text-amber-400" />
              ))}
            </div>
            <p className="mt-2 text-sm font-medium text-muted-foreground">782 avaliações</p>
          </div>

          {/* Card pedidos */}
          <div className="flex w-full max-w-[260px] items-center gap-3 rounded-2xl bg-primary p-5 text-white shadow-sm">
            <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-full bg-white/15">
              <Truck className="h-6 w-6" />
            </div>
            <div>
              <div className="text-2xl font-extrabold leading-tight">+ de 6.200</div>
              <p className="text-xs opacity-90">pedidos entregues</p>
            </div>
          </div>
        </div>

        <h2 className="mt-8 text-center text-xl font-bold text-foreground md:text-2xl">
          O que nossos clientes dizem <Heart className="inline h-5 w-5 fill-primary text-primary" />
        </h2>

        <div className="mt-5 grid grid-cols-1 gap-4 md:grid-cols-2">
          {testimonials.map((t, i) => (
            <div key={`${t.name}-${i}`} className="rounded-2xl border border-border bg-white p-4 shadow-sm">
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-primary text-base font-bold text-white">
                    {t.initial}
                  </div>
                  <div>
                    <div className="text-sm font-bold text-foreground">{t.name}</div>
                    <div className="text-xs text-muted-foreground">{t.timeAgo}</div>
                  </div>
                </div>
                <div className="flex">
                  {Array.from({ length: 5 }).map((_, idx) => (
                    <Star key={idx} className="h-4 w-4 fill-amber-400 text-amber-400" />
                  ))}
                </div>
              </div>
              <p className="mt-3 text-sm text-foreground">{t.text}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
