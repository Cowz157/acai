"use client"

import { useEffect, useState } from "react"
import { Loader2, Star } from "lucide-react"
import { fetchMyReview, saveMyReview, type MyReview as MyReviewType } from "@/lib/reviews"
import { cn } from "@/lib/utils"

/**
 * Avaliação do cliente — modelo "por-conta". Cada usuário tem no máximo
 * 1 avaliação, visível só pra ele (RLS no Supabase). Aparece na página
 * /conta. Pra avaliar, precisa estar logado — funciona como gancho de
 * criação de conta.
 */
export function MyReview({ userId }: { userId: string }) {
  const [review, setReview] = useState<MyReviewType | null | undefined>(undefined)
  const [editing, setEditing] = useState(false)
  const [rating, setRating] = useState(5)
  const [hoverRating, setHoverRating] = useState(0)
  const [comment, setComment] = useState("")
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let mounted = true
    fetchMyReview(userId).then((r) => {
      if (!mounted) return
      setReview(r)
      if (r) {
        setRating(r.rating)
        setComment(r.comment)
      }
    })
    return () => {
      mounted = false
    }
  }, [userId])

  const handleSave = async () => {
    setError(null)
    setSaving(true)
    const result = await saveMyReview(userId, rating, comment)
    setSaving(false)
    if (!result.ok) {
      setError(result.error)
      return
    }
    setReview({ rating, comment: comment.trim(), createdAt: Date.now() })
    setEditing(false)
  }

  // ainda carregando
  if (review === undefined) {
    return (
      <div className="flex items-center justify-center gap-2 rounded-2xl border border-border bg-white p-6 text-sm text-muted-foreground shadow-sm">
        <Loader2 className="h-4 w-4 animate-spin" />
        Carregando sua avaliação...
      </div>
    )
  }

  // já avaliou e não está editando — mostra a avaliação
  if (review && !editing) {
    return (
      <div className="rounded-2xl border border-border bg-white p-5 shadow-sm">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-bold text-foreground">Sua avaliação</h2>
          <button
            type="button"
            onClick={() => setEditing(true)}
            className="text-xs font-semibold text-primary transition hover:text-primary-light"
          >
            Editar
          </button>
        </div>
        <div className="mt-2 flex items-center gap-1">
          {Array.from({ length: 5 }).map((_, i) => (
            <Star
              key={i}
              className={cn(
                "h-4 w-4",
                i < review.rating ? "fill-amber-400 text-amber-400" : "fill-gray-200 text-gray-200",
              )}
            />
          ))}
        </div>
        {review.comment && (
          <p className="mt-2 text-sm leading-snug text-muted-foreground">{review.comment}</p>
        )}
      </div>
    )
  }

  // form de criar / editar
  return (
    <div className="rounded-2xl border border-border bg-white p-5 shadow-sm">
      <h2 className="text-sm font-bold text-foreground">
        {review ? "Editar sua avaliação" : "Avalie sua experiência"}
      </h2>
      <p className="mt-0.5 text-xs text-muted-foreground">Conta pra gente como foi seu pedido.</p>

      <div className="mt-3 flex items-center gap-1">
        {Array.from({ length: 5 }).map((_, i) => {
          const value = i + 1
          return (
            <button
              key={i}
              type="button"
              onClick={() => setRating(value)}
              onMouseEnter={() => setHoverRating(value)}
              onMouseLeave={() => setHoverRating(0)}
              aria-label={`${value} ${value > 1 ? "estrelas" : "estrela"}`}
              className="transition"
            >
              <Star
                className={cn(
                  "h-7 w-7 transition",
                  value <= (hoverRating || rating)
                    ? "fill-amber-400 text-amber-400"
                    : "fill-gray-200 text-gray-200",
                )}
              />
            </button>
          )
        })}
      </div>

      <textarea
        value={comment}
        onChange={(e) => setComment(e.target.value.slice(0, 280))}
        rows={3}
        placeholder="Escreva um comentário (opcional)"
        className="mt-3 w-full resize-none rounded-lg border border-border bg-white px-3 py-2 text-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
      />
      <div className="mt-1 text-right text-xs text-muted-foreground">{comment.length}/280</div>

      {error && (
        <div className="mt-2 rounded-lg bg-danger-soft px-3 py-2 text-xs font-semibold text-danger">{error}</div>
      )}

      <div className="mt-3 flex gap-2">
        {review && (
          <button
            type="button"
            onClick={() => {
              setEditing(false)
              setRating(review.rating)
              setComment(review.comment)
              setError(null)
            }}
            disabled={saving}
            className="flex-1 rounded-full border border-border bg-white px-4 py-2.5 text-sm font-semibold text-foreground transition hover:bg-muted disabled:opacity-50"
          >
            Cancelar
          </button>
        )}
        <button
          type="button"
          onClick={handleSave}
          disabled={saving}
          className="flex flex-1 items-center justify-center gap-2 rounded-full bg-success px-4 py-2.5 text-sm font-bold text-white shadow-sm transition hover:brightness-95 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {saving && <Loader2 className="h-4 w-4 animate-spin" />}
          {saving ? "Salvando..." : review ? "Salvar alterações" : "Enviar avaliação"}
        </button>
      </div>
    </div>
  )
}
