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
  selectedOptions: CartItemOptions
  subtotal: number
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
