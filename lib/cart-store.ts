"use client"

import { create } from "zustand"
import { persist } from "zustand/middleware"
import { uuid } from "./uuid"

export interface SelectedOption {
  name: string
  quantity: number
}

export interface CartItemOptions {
  coberturas: SelectedOption[]
  frutas: SelectedOption[]
  complementos: SelectedOption[]
  turbine: SelectedOption[]
}

export interface CartItem {
  id: string
  productId: string
  productName: string
  productImage: string
  basePrice: number
  quantity: number
  observations: string
  /** Opções do PRIMEIRO copo. Quando additionalCupsOptions é null, todos os
   *  demais copos (combo Pague 1 Leve 2 ou avulso qty>=2) seguem essas opções. */
  selectedOptions: CartItemOptions
  /** Opções dos copos 2..N quando o cliente ativou "Cada um diferente" no
   *  customizer. Length esperado = (totalCups - 1) — pode ser 1 (combo direto),
   *  N-1 (avulso qty=N) etc. Null = todos os copos seguem `selectedOptions`. */
  additionalCupsOptions?: CartItemOptions[] | null
  /** @deprecated Mantido pra retrocompat com items antigos no localStorage de
   *  sessões anteriores (quando só suportava 2 copos diferentes). Itens novos
   *  usam `additionalCupsOptions`. Helper `getExtraCups` lê os 2 corretamente. */
  secondCupOptions?: CartItemOptions | null
  subtotal: number
}

/** Lê os "copos extras" (cup 2..N) de um item de carrinho, lidando com a
 *  retrocompat: itens novos usam `additionalCupsOptions`; itens antigos no
 *  localStorage de sessões anteriores usam `secondCupOptions` (1 copo extra). */
export function getExtraCups(item: CartItem): CartItemOptions[] {
  if (item.additionalCupsOptions && item.additionalCupsOptions.length > 0) {
    return item.additionalCupsOptions
  }
  if (item.secondCupOptions) return [item.secondCupOptions]
  return []
}

interface CartState {
  items: CartItem[]
  isOpen: boolean
  pulse: number
  addItem: (item: Omit<CartItem, "id" | "subtotal">) => void
  removeItem: (id: string) => void
  updateItemQuantity: (id: string, quantity: number) => void
  clearCart: () => void
  setOpen: (open: boolean) => void
  triggerPulse: () => void
  getTotal: () => number
  getItemCount: () => number
}

const computeSubtotal = (basePrice: number, quantity: number) => {
  return Number((basePrice * quantity).toFixed(2))
}

export const useCart = create<CartState>()(
  persist(
    (set, get) => ({
      items: [],
      isOpen: false,
      pulse: 0,
      addItem: (item) => {
        const newItem: CartItem = {
          ...item,
          id: uuid(),
          subtotal: computeSubtotal(item.basePrice, item.quantity),
        }
        set((state) => ({
          items: [...state.items, newItem],
          pulse: state.pulse + 1,
        }))
        // dataLayer push (GA4 schema). Pixel.js da Vyat (v3.2.0+) tem listener
        // que detecta `event: 'add_to_cart'` no formato GA4 e mapeia pra
        // AddToCart no Meta Pixel automaticamente. Mesma estrutura serve pra
        // GA4 + Meta + qualquer tag GTM custom.
        if (typeof window !== "undefined") {
          window.dataLayer = window.dataLayer || []
          window.dataLayer.push({
            event: "add_to_cart",
            ecommerce: {
              value: newItem.subtotal,
              currency: "BRL",
              items: [
                {
                  item_id: newItem.productId,
                  item_name: newItem.productName,
                  price: newItem.basePrice,
                  quantity: newItem.quantity,
                },
              ],
            },
          })
        }
      },
      removeItem: (id) =>
        set((state) => ({
          items: state.items.filter((it) => it.id !== id),
        })),
      updateItemQuantity: (id, quantity) =>
        set((state) => ({
          items: state.items.map((it) =>
            it.id === id
              ? {
                  ...it,
                  quantity: Math.max(1, quantity),
                  subtotal: computeSubtotal(it.basePrice, Math.max(1, quantity)),
                }
              : it,
          ),
        })),
      clearCart: () => set({ items: [] }),
      setOpen: (open) => set({ isOpen: open }),
      triggerPulse: () => set((state) => ({ pulse: state.pulse + 1 })),
      getTotal: () => {
        return get().items.reduce((sum, it) => sum + it.subtotal, 0)
      },
      getItemCount: () => {
        return get().items.reduce((sum, it) => sum + it.quantity, 0)
      },
    }),
    {
      name: "acai-tropical-cart",
      partialize: (state) => ({ items: state.items }),
    },
  ),
)

export const MIN_ORDER_VALUE = 10
