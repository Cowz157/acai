"use client"

import { supabase } from "./supabase"

export interface MyReview {
  rating: number
  comment: string
  createdAt: number
}

/**
 * Busca a avaliação do usuário logado. RLS no Supabase garante que só
 * retorna a do próprio usuário — o `.eq` é redundante mas explícito.
 */
export async function fetchMyReview(userId: string): Promise<MyReview | null> {
  const { data, error } = await supabase
    .from("reviews")
    .select("rating, comment, created_at")
    .eq("user_id", userId)
    .maybeSingle()

  if (error || !data) return null
  return {
    rating: data.rating,
    comment: data.comment ?? "",
    createdAt: new Date(data.created_at).getTime(),
  }
}

/**
 * Salva (ou atualiza) a avaliação do usuário. Upsert por `user_id` —
 * cada usuário tem no máximo 1 avaliação (unique constraint na tabela).
 */
export async function saveMyReview(
  userId: string,
  rating: number,
  comment: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const { error } = await supabase.from("reviews").upsert(
    {
      user_id: userId,
      rating,
      comment: comment.trim(),
      updated_at: new Date().toISOString(),
    },
    { onConflict: "user_id" },
  )

  if (error) return { ok: false, error: error.message }
  return { ok: true }
}
