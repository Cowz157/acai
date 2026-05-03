"use client"

import { useEffect } from "react"
import { User } from "lucide-react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { identificationSchema, type IdentificationData } from "@/lib/checkout-types"
import { maskPhone } from "@/lib/format"
import { cn } from "@/lib/utils"

interface IdentificationStepProps {
  defaultValues?: Partial<IdentificationData>
  onSubmit: (data: IdentificationData) => void
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

export function IdentificationStep({ defaultValues, onSubmit }: IdentificationStepProps) {
  const {
    register,
    handleSubmit,
    setValue,
    watch,
    reset,
    formState: { errors, isValid },
  } = useForm<IdentificationData>({
    resolver: zodResolver(identificationSchema),
    mode: "onChange",
    defaultValues: defaultValues ?? {},
  })

  useEffect(() => {
    if (defaultValues) reset({ ...defaultValues })
  }, [defaultValues, reset])

  const phoneValue = watch("phone") ?? ""

  return (
    <form
      onSubmit={handleSubmit(onSubmit)}
      className="animate-step-in space-y-6 rounded-2xl border border-border bg-white p-5 shadow-sm md:p-7"
    >
      <header className="flex items-center gap-2">
        <span className="flex h-8 w-8 items-center justify-center rounded-full bg-primary-soft text-primary">
          <User className="h-4 w-4" />
        </span>
        <h2 className="text-lg font-bold text-primary md:text-xl">Quem está pedindo?</h2>
      </header>

      <div className="grid gap-4">
        <Field label="Nome completo" required error={errors.fullName?.message}>
          <input
            {...register("fullName")}
            className={inputClass}
            placeholder="Seu nome completo"
            autoComplete="name"
          />
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
      </div>

      <button
        type="submit"
        disabled={!isValid}
        className={cn(
          "w-full rounded-full bg-success px-6 py-3 text-sm font-bold text-white shadow-sm transition",
          isValid ? "hover:brightness-95" : "cursor-not-allowed opacity-50",
        )}
      >
        Continuar para o endereço →
      </button>
    </form>
  )
}
