"use client"

import type { DeliveryData } from "@/components/checkout/delivery-step"

const STORAGE_KEY = "acai-tropical-last-address"

/** Campos do endereço que vale lembrar entre pedidos. Senha/email não entram aqui. */
export type SavedAddress = Pick<
  DeliveryData,
  "fullName" | "email" | "phone" | "cep" | "street" | "number" | "complement" | "neighborhood" | "reference"
>

export function saveAddress(data: DeliveryData): void {
  if (typeof window === "undefined") return
  try {
    const toSave: SavedAddress = {
      fullName: data.fullName,
      email: data.email,
      phone: data.phone,
      cep: data.cep,
      street: data.street,
      number: data.number,
      complement: data.complement,
      neighborhood: data.neighborhood,
      reference: data.reference,
    }
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(toSave))
  } catch {
    /* ignora */
  }
}

export function getSavedAddress(): SavedAddress | null {
  if (typeof window === "undefined") return null
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY)
    if (!raw) return null
    return JSON.parse(raw) as SavedAddress
  } catch {
    return null
  }
}
