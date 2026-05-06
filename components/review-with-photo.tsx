import { Star } from "lucide-react"
import { photoReviews } from "@/lib/data"

export function ReviewsWithPhotos() {
  return (
    <div className="space-y-3">
      <div className="rounded-xl border border-border bg-card p-4 text-center">
        <div className="text-3xl font-bold text-foreground">4,8</div>
        <div className="mt-1 flex items-center justify-center gap-0.5">
          {[1, 2, 3, 4].map((i) => (
            <Star key={i} className="h-5 w-5 fill-amber-400 text-amber-400" />
          ))}
          <Star className="h-5 w-5 fill-amber-400 text-amber-400" style={{ clipPath: "inset(0 50% 0 0)" }} />
        </div>
        <p className="mt-2 text-sm font-semibold text-foreground">
          136 avaliações <span className="text-muted-foreground">• últimos 90 dias</span>
        </p>
        <p className="mt-0.5 text-xs text-muted-foreground">1.007 avaliações no total</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 md:gap-x-6">
        {photoReviews.map((review, idx) => (
          <div
            key={`${review.name}-${idx}`}
            className="border-b border-border py-4"
          >
            <div className="font-bold text-foreground">{review.name}</div>
            <div className="mt-0.5 flex items-center gap-1 text-sm">
              <span className="font-semibold text-amber-500">5,0</span>
              <div className="flex">
                {Array.from({ length: 5 }).map((_, i) => (
                  <Star key={i} className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />
                ))}
              </div>
            </div>
            <p className="mt-1 text-sm leading-snug text-muted-foreground">{review.text}</p>
          </div>
        ))}
      </div>
    </div>
  )
}
