"use client"

import { useEffect, useState } from "react"
import { ArrowLeft, Check, Gift, Loader2, MapPin, Sparkles } from "lucide-react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { fetchCEP } from "@/lib/cep-api"
import {
  addressSchema,
  giftMessageTemplates,
  type AddressData,
  type GiftData,
} from "@/lib/checkout-types"
import { type ShippingMethod } from "@/lib/data"
import { maskCEP, unmaskDigits } from "@/lib/format"
import { cn } from "@/lib/utils"
import { ShippingSelector } from "./shipping-selector"

interface AddressStepProps {
  defaultValues?: Partial<AddressData>
  /** Estado inicial do gift (vindo de um pedido salvo, ex: voltar do step 3). */
  giftDefault?: GiftData | null
  onSubmit: (data: AddressData, gift: GiftData | null) => void
  onBack: () => void
  shippingMethod: ShippingMethod
  onShippingChange: (next: ShippingMethod) => void
}

interface FieldProps {
  label: string
  required?: boolean
  error?: string
  children: React.ReactNode
}

function Field({ label, required, error, children }: FieldProps) {
  return (
    <label className="block">
      <span className="mb-1 block text-xs font-semibold text-muted-foreground">
        {label} {required && <span className="text-danger">*</span>}
      </span>
      {children}
      {error && <span className="mt-1 block text-xs text-danger">{error}</span>}
    </label>
  )
}

const inputClass =
  "w-full rounded-lg border border-border bg-white px-3 py-2.5 text-sm text-foreground outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"

export function AddressStep({
  defaultValues,
  giftDefault,
  onSubmit,
  onBack,
  shippingMethod,
  onShippingChange,
}: AddressStepProps) {
  const {
    register,
    handleSubmit,
    setValue,
    watch,
    reset,
    formState: { errors, isValid },
  } = useForm<AddressData>({
    resolver: zodResolver(addressSchema),
    mode: "onChange",
    defaultValues: defaultValues ?? {},
  })

  const [cepStatus, setCepStatus] = useState<"idle" | "loading" | "success" | "error">("idle")

  // Estado da seção de presente (validação manual no submit)
  const [isGift, setIsGift] = useState<boolean>(Boolean(giftDefault))
  const [recipientName, setRecipientName] = useState(giftDefault?.recipientName ?? "")
  const [giftMessage, setGiftMessage] = useState(giftDefault?.message ?? "")
  const [giftErrors, setGiftErrors] = useState<{ recipientName?: string }>({})

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

  const cepValue = watch("cep") ?? ""

  const validateGift = (): GiftData | null | "invalid" => {
    if (!isGift) return null

    const errs: { recipientName?: string } = {}
    if (recipientName.trim().length < 3) {
      errs.recipientName = "Nome de quem vai receber é obrigatório"
    }
    if (errs.recipientName) {
      setGiftErrors(errs)
      return "invalid"
    }
    setGiftErrors({})
    return {
      recipientName: recipientName.trim(),
      message: giftMessage.trim(),
    }
  }

  const onValid = (data: AddressData) => {
    const gift = validateGift()
    if (gift === "invalid") return
    onSubmit(data, gift)
  }

  const submitDisabled = !isValid

  return (
    <form
      onSubmit={handleSubmit(onValid)}
      className="animate-step-in space-y-6 rounded-2xl border border-border bg-white p-5 shadow-sm md:p-7"
    >
      <header className="flex items-center gap-2">
        <span className="flex h-8 w-8 items-center justify-center rounded-full bg-primary-soft text-primary">
          <MapPin className="h-4 w-4" />
        </span>
        <h2 className="text-lg font-bold text-primary md:text-xl">
          {isGift ? "Pra onde mandamos?" : "Onde você quer receber?"}
        </h2>
      </header>

      <div className="grid gap-4">
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
              <input
                {...register("street")}
                className={inputClass}
                placeholder="Nome da rua"
                autoComplete="address-line1"
              />
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

      {/* Seção de presente — chamativa mas não intrusiva */}
      <div
        className={cn(
          "rounded-xl border-2 p-4 transition",
          isGift
            ? "border-primary bg-primary-soft/40"
            : "border-dashed border-primary/40 bg-primary-soft/10",
        )}
      >
        <label className="flex cursor-pointer items-start gap-3">
          <input
            type="checkbox"
            checked={isGift}
            onChange={(e) => setIsGift(e.target.checked)}
            className="mt-1 h-4 w-4 shrink-0 cursor-pointer accent-primary"
          />
          <span className="min-w-0 flex-1">
            <span className="flex items-center gap-1.5 text-sm font-bold text-primary md:text-base">
              <Gift className="h-4 w-4" />
              É um presente?
              <Sparkles className="h-3 w-3 text-primary/70" />
            </span>
            <span className="mt-0.5 block text-xs leading-snug text-muted-foreground md:text-sm">
              Mande pra alguém especial com uma mensagem personalizada. Perfeito pra surpreender no Dia das Mães 💜
            </span>
          </span>
        </label>

        {isGift && (
          <div className="mt-4 space-y-5 border-t border-primary/20 pt-4">
            <Field label="Nome de quem vai receber" required error={giftErrors.recipientName}>
              <input
                value={recipientName}
                onChange={(e) => setRecipientName(e.target.value)}
                className={inputClass}
                placeholder="Ex: Maria da Silva"
                autoComplete="off"
              />
            </Field>

            <div>
              <div className="mb-1 flex items-baseline justify-between">
                <span className="text-xs font-semibold text-muted-foreground">
                  Mensagem do cartão{" "}
                  <span className="font-normal text-muted-foreground/70">(opcional)</span>
                </span>
              </div>

              <p className="mb-2 text-[11px] font-medium text-primary/80 md:text-xs">
                ✨ Toque numa sugestão pra usar — ou escreva a sua abaixo
              </p>

              <div className="mb-3 flex flex-wrap gap-2">
                {giftMessageTemplates.map((tpl) => {
                  const selected = giftMessage === tpl
                  return (
                    <button
                      key={tpl}
                      type="button"
                      onClick={() => setGiftMessage(selected ? "" : tpl)}
                      aria-pressed={selected}
                      className={cn(
                        "group inline-flex items-center gap-1.5 rounded-full border-2 px-3 py-1.5 text-xs font-medium transition active:scale-95 md:text-sm",
                        selected
                          ? "border-primary bg-primary text-white shadow-sm"
                          : "border-primary/30 bg-white text-primary hover:border-primary hover:bg-primary-soft",
                      )}
                    >
                      {selected ? (
                        <Check className="h-3.5 w-3.5" />
                      ) : (
                        <span className="text-primary/60 group-hover:text-primary">+</span>
                      )}
                      <span>{tpl}</span>
                    </button>
                  )
                })}
              </div>

              <textarea
                value={giftMessage}
                onChange={(e) => setGiftMessage(e.target.value.slice(0, 280))}
                className={cn(inputClass, "resize-none")}
                rows={3}
                placeholder="Ou escreva sua própria mensagem aqui..."
                maxLength={280}
              />
              <div className="mt-1 text-right text-[10px] text-muted-foreground">
                {giftMessage.length}/280
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Seletor de frete */}
      <div className="border-t border-border pt-5">
        <ShippingSelector value={shippingMethod} onChange={onShippingChange} />
      </div>

      <div className="flex flex-col-reverse gap-3 pt-2 md:flex-row">
        <button
          type="button"
          onClick={onBack}
          className="inline-flex items-center justify-center gap-1.5 rounded-full border border-border bg-white px-5 py-3 text-sm font-semibold text-foreground transition hover:bg-muted"
        >
          <ArrowLeft className="h-4 w-4" />
          Voltar
        </button>
        <button
          type="submit"
          disabled={submitDisabled}
          className={cn(
            "rounded-full bg-success px-6 py-3 text-sm font-bold text-white shadow-sm transition md:flex-1",
            !submitDisabled ? "hover:brightness-95" : "cursor-not-allowed opacity-50",
          )}
        >
          Continuar para pagamento →
        </button>
      </div>
    </form>
  )
}
