"use client"

import { useEffect, useState } from "react"
import { Loader2, MapPin } from "lucide-react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { fetchCEP } from "@/lib/cep-api"
import { type ShippingMethod } from "@/lib/data"
import { maskCEP, maskPhone, unmaskDigits } from "@/lib/format"
import { cn } from "@/lib/utils"
import { ShippingSelector } from "./shipping-selector"

export const deliverySchema = z.object({
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

export type DeliveryData = z.infer<typeof deliverySchema>

interface DeliveryStepProps {
  defaultValues?: Partial<DeliveryData>
  onSubmit: (data: DeliveryData) => void
  /** Seletor de frete controlado pelo parent (compartilhado com OrderSummary). */
  shippingMethod: ShippingMethod
  onShippingChange: (next: ShippingMethod) => void
}

interface FieldProps {
  label: string
  required?: boolean
  hint?: string
  error?: string
  children: React.ReactNode
}

function Field({ label, required, hint, error, children }: FieldProps) {
  return (
    <label className="block">
      <span className="mb-1 flex items-center justify-between">
        <span className="text-xs font-semibold text-muted-foreground">
          {label} {required && <span className="text-danger">*</span>}
        </span>
        {hint && <span className="text-[10px] text-muted-foreground/70">{hint}</span>}
      </span>
      {children}
      {error && <span className="mt-1 block text-xs text-danger">{error}</span>}
    </label>
  )
}

const inputClass =
  "w-full rounded-lg border border-border bg-white px-3 py-2.5 text-sm text-foreground outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"

export function DeliveryStep({ defaultValues, onSubmit, shippingMethod, onShippingChange }: DeliveryStepProps) {
  const {
    register,
    handleSubmit,
    setValue,
    watch,
    reset,
    formState: { errors, isValid },
  } = useForm<DeliveryData>({
    resolver: zodResolver(deliverySchema),
    mode: "onChange",
    defaultValues: defaultValues ?? {},
  })

  const [cepStatus, setCepStatus] = useState<"idle" | "loading" | "success" | "error">("idle")

  // Reaplica defaultValues quando vierem assíncronos (ex.: usuário logado)
  useEffect(() => {
    if (defaultValues) reset({ ...defaultValues })
  }, [defaultValues, reset])

  const handleCEPChange = async (value: string) => {
    const masked = maskCEP(value)
    setValue("cep", masked, { shouldValidate: true })
    const digits = unmaskDigits(masked)
    if (digits.length !== 8) {
      setCepStatus("idle")
      return
    }
    setCepStatus("loading")
    const result = await fetchCEP(digits)
    if (!result) {
      setCepStatus("error")
      return
    }
    setCepStatus("success")
    setValue("street", result.logradouro || "", { shouldValidate: true })
    setValue("neighborhood", result.bairro || "", { shouldValidate: true })
    setValue("city", result.localidade || "")
    setValue("state", result.uf || "")
  }

  const phoneValue = watch("phone") ?? ""
  const cepValue = watch("cep") ?? ""

  return (
    <form
      onSubmit={handleSubmit(onSubmit)}
      className="animate-step-in space-y-6 rounded-2xl border border-border bg-white p-5 shadow-sm md:p-7"
    >
      <header className="flex items-center gap-2">
        <span className="flex h-8 w-8 items-center justify-center rounded-full bg-primary-soft text-primary">
          <MapPin className="h-4 w-4" />
        </span>
        <h2 className="text-lg font-bold text-primary md:text-xl">Onde você quer receber?</h2>
      </header>

      <div className="grid gap-4">
        <Field label="Nome completo" required error={errors.fullName?.message}>
          <input {...register("fullName")} className={inputClass} placeholder="Seu nome completo" autoComplete="name" />
        </Field>

        <Field label="E-mail" required hint="usado pra mandar o comprovante" error={errors.email?.message}>
          <input
            {...register("email")}
            type="email"
            className={inputClass}
            placeholder="seu@email.com"
            autoComplete="email"
          />
        </Field>

        <Field label="WhatsApp" hint="opcional — pra contato em caso de imprevisto" error={errors.phone?.message}>
          <input
            value={phoneValue}
            onChange={(e) => setValue("phone", maskPhone(e.target.value), { shouldValidate: true })}
            className={inputClass}
            placeholder="(00) 00000-0000"
            inputMode="numeric"
            autoComplete="tel"
          />
        </Field>

        <Field label="CEP" required error={errors.cep?.message}>
          <div className="relative">
            <input
              value={cepValue}
              onChange={(e) => handleCEPChange(e.target.value)}
              className={inputClass}
              placeholder="00000-000"
              inputMode="numeric"
              autoComplete="postal-code"
            />
            {cepStatus === "loading" && (
              <Loader2 className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 animate-spin text-muted-foreground" />
            )}
          </div>
          {cepStatus === "success" && (
            <span className="mt-1 block text-xs font-semibold text-success">Endereço encontrado!</span>
          )}
          {cepStatus === "error" && (
            <span className="mt-1 block text-xs text-danger">CEP não encontrado, verifique</span>
          )}
        </Field>

        <div className="grid grid-cols-3 gap-3">
          <div className="col-span-2">
            <Field label="Rua" error={errors.street?.message}>
              <input {...register("street")} className={inputClass} placeholder="Nome da rua" autoComplete="address-line1" />
            </Field>
          </div>
          <Field label="Número" required error={errors.number?.message}>
            <input {...register("number")} className={inputClass} placeholder="123" inputMode="numeric" />
          </Field>
        </div>

        <Field label="Complemento" error={errors.complement?.message}>
          <input {...register("complement")} className={inputClass} placeholder="Apto, bloco, etc." />
        </Field>

        <Field label="Bairro" error={errors.neighborhood?.message}>
          <input {...register("neighborhood")} className={inputClass} placeholder="Bairro" />
        </Field>

        <Field label="Ponto de referência" error={errors.reference?.message}>
          <textarea
            {...register("reference")}
            className={cn(inputClass, "resize-none")}
            rows={2}
            placeholder="Próximo ao mercado, casa azul, etc."
          />
        </Field>
      </div>

      {/* Seletor de frete */}
      <div className="border-t border-border pt-5">
        <ShippingSelector value={shippingMethod} onChange={onShippingChange} />
      </div>

      <button
        type="submit"
        disabled={!isValid}
        className={cn(
          "w-full rounded-full bg-success px-6 py-3 text-sm font-bold text-white shadow-sm transition",
          isValid ? "hover:brightness-95" : "cursor-not-allowed opacity-50",
        )}
      >
        Continuar para pagamento →
      </button>
    </form>
  )
}
