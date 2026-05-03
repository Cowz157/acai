import { z } from "zod"
import { unmaskDigits } from "./format"

// =====================================================================
// Step 1 — Identificação
// =====================================================================

export const identificationSchema = z.object({
  fullName: z.string().min(3, "Informe seu nome completo"),
  email: z.string().min(1, "Informe seu e-mail").email("E-mail inválido"),
  phone: z
    .string()
    .optional()
    .refine((v) => {
      if (!v) return true
      const digits = unmaskDigits(v)
      return digits.length === 0 || digits.length === 10 || digits.length === 11
    }, "WhatsApp inválido"),
})

export type IdentificationData = z.infer<typeof identificationSchema>

// =====================================================================
// Step 2 — Endereço
// =====================================================================

export const addressSchema = z.object({
  cep: z
    .string()
    .min(1, "Informe o CEP")
    .refine((v) => unmaskDigits(v).length === 8, "CEP inválido"),
  street: z.string().min(1, "Informe a rua"),
  number: z.string().min(1, "Número obrigatório"),
  complement: z.string().optional().or(z.literal("")),
  neighborhood: z.string().min(1, "Informe o bairro"),
  reference: z.string().optional().or(z.literal("")),
  city: z.string().optional().or(z.literal("")),
  state: z.string().optional().or(z.literal("")),
})

export type AddressData = z.infer<typeof addressSchema>

// =====================================================================
// Combined — DeliveryData
// =====================================================================

/** Dados completos de entrega: identificação + endereço. Usado pelo order-store. */
export type DeliveryData = IdentificationData & AddressData
