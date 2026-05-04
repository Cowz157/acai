import "server-only"

import { Resend } from "resend"
import type { CartItem } from "./cart-store"
import type { DeliveryData } from "./checkout-types"
import { getSupabaseAdmin } from "./supabase-admin"

const RESEND_API_KEY = process.env.RESEND_API_KEY ?? ""

/** Domínio verificado no Resend pra `from`. Trocar se mudar de domínio. */
const FROM_EMAIL = "Açaí Tropical <pedidos@anoteii.shop>"
const REPLY_TO = "contato@anoteii.shop"
const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "https://anoteii.shop"

let cachedClient: Resend | null = null
function getResend(): Resend {
  if (cachedClient) return cachedClient
  if (!RESEND_API_KEY) {
    throw new Error("RESEND_API_KEY não configurada — defina no .env.local e no Railway Variables")
  }
  cachedClient = new Resend(RESEND_API_KEY)
  return cachedClient
}

// =====================================================================
// Helpers
// =====================================================================

function formatMoney(value: number): string {
  return `R$ ${value.toFixed(2).replace(".", ",")}`
}

function escapeHtml(unsafe: string): string {
  return unsafe
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;")
}

function renderItemsList(items: CartItem[]): string {
  return items
    .map(
      (it) => `
        <tr>
          <td style="padding: 8px 0; border-bottom: 1px solid #e5e7eb;">
            <strong>${it.quantity}× ${escapeHtml(it.productName)}</strong>
          </td>
          <td style="padding: 8px 0; border-bottom: 1px solid #e5e7eb; text-align: right; color: #16a34a; font-weight: bold;">
            ${formatMoney(it.subtotal)}
          </td>
        </tr>`,
    )
    .join("")
}

// =====================================================================
// Templates
// =====================================================================

interface OrderEmailContext {
  orderNumber: string
  customerName: string
  customerEmail: string
  trackingToken: string
  items: CartItem[]
  subtotal: number
  shippingPrice: number
  total: number
  delivery: DeliveryData
  shippingMethod: "standard" | "express"
  etaMinutes: number
}

function baseLayout(content: string, preheader = ""): string {
  return `
<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Açaí Tropical</title>
</head>
<body style="margin: 0; padding: 0; background-color: #f5f5f5; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #1a1a1a; line-height: 1.5;">
  <span style="display: none; max-height: 0; overflow: hidden;">${escapeHtml(preheader)}</span>
  <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="background-color: #f5f5f5;">
    <tr>
      <td align="center" style="padding: 32px 16px;">
        <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="max-width: 560px; background-color: #ffffff; border-radius: 12px; overflow: hidden;">
          <tr>
            <td style="background-color: #4a0e5c; padding: 24px; text-align: center;">
              <h1 style="margin: 0; color: #ffffff; font-size: 22px; font-weight: 800;">Açaí Tropical</h1>
            </td>
          </tr>
          <tr>
            <td style="padding: 32px 24px;">
              ${content}
            </td>
          </tr>
          <tr>
            <td style="background-color: #f5f5f5; padding: 16px 24px; text-align: center; color: #6b7280; font-size: 12px;">
              Açaí Tropical • São Paulo - SP<br>
              <a href="${SITE_URL}" style="color: #4a0e5c; text-decoration: none;">${SITE_URL.replace("https://", "")}</a>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`
}

function orderConfirmationTemplate(ctx: OrderEmailContext): { subject: string; html: string; text: string } {
  const trackUrl = `${SITE_URL}/acompanhar?token=${encodeURIComponent(ctx.trackingToken)}`
  const subject = `Pedido #${ctx.orderNumber} confirmado — chega em ~${ctx.etaMinutes} min`

  const content = `
    <h2 style="margin: 0 0 8px 0; color: #4a0e5c; font-size: 20px;">Olá, ${escapeHtml(ctx.customerName.split(" ")[0])}! 💜</h2>
    <p style="margin: 0 0 16px 0; font-size: 15px; color: #1a1a1a;">
      Recebemos seu pedido <strong>#${ctx.orderNumber}</strong> e já estamos preparando.
    </p>

    <div style="background-color: #f3e8f7; border-radius: 8px; padding: 16px; margin: 16px 0; text-align: center;">
      <p style="margin: 0 0 4px 0; color: #4a0e5c; font-size: 13px; font-weight: 600;">Tempo estimado de entrega</p>
      <p style="margin: 0; color: #4a0e5c; font-size: 24px; font-weight: 800;">~${ctx.etaMinutes} minutos</p>
      <p style="margin: 4px 0 0 0; color: #6b7280; font-size: 12px;">
        Modalidade: ${ctx.shippingMethod === "express" ? "Express ⚡" : "Padrão"}
      </p>
    </div>

    <div style="text-align: center; margin: 24px 0;">
      <a href="${trackUrl}" style="display: inline-block; background-color: #16a34a; color: #ffffff; padding: 14px 28px; border-radius: 999px; text-decoration: none; font-weight: bold; font-size: 15px;">
        Acompanhar pedido em tempo real →
      </a>
    </div>

    <h3 style="margin: 24px 0 12px 0; color: #1a1a1a; font-size: 16px;">Resumo do pedido</h3>
    <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="font-size: 14px;">
      ${renderItemsList(ctx.items)}
      <tr>
        <td style="padding: 8px 0; color: #6b7280;">Subtotal</td>
        <td style="padding: 8px 0; text-align: right; color: #1a1a1a;">${formatMoney(ctx.subtotal)}</td>
      </tr>
      <tr>
        <td style="padding: 0 0 8px 0; color: #6b7280;">Entrega</td>
        <td style="padding: 0 0 8px 0; text-align: right; color: ${ctx.shippingPrice > 0 ? "#1a1a1a" : "#16a34a"}; font-weight: ${ctx.shippingPrice > 0 ? "normal" : "bold"};">
          ${ctx.shippingPrice > 0 ? `+ ${formatMoney(ctx.shippingPrice)}` : "Grátis"}
        </td>
      </tr>
      <tr>
        <td style="padding: 8px 0 0 0; border-top: 1px solid #e5e7eb; font-weight: bold; color: #1a1a1a;">Total</td>
        <td style="padding: 8px 0 0 0; border-top: 1px solid #e5e7eb; text-align: right; font-weight: 800; color: #16a34a; font-size: 18px;">${formatMoney(ctx.total)}</td>
      </tr>
    </table>

    <h3 style="margin: 24px 0 8px 0; color: #1a1a1a; font-size: 16px;">Endereço de entrega</h3>
    <p style="margin: 0; color: #1a1a1a; font-size: 14px;">
      ${escapeHtml(ctx.delivery.fullName)}<br>
      ${escapeHtml(ctx.delivery.street)}, ${escapeHtml(ctx.delivery.number)}${ctx.delivery.complement ? ` - ${escapeHtml(ctx.delivery.complement)}` : ""}<br>
      ${ctx.delivery.neighborhood ? `${escapeHtml(ctx.delivery.neighborhood)}<br>` : ""}
      ${ctx.delivery.reference ? `<span style="color: #6b7280;">Ref: ${escapeHtml(ctx.delivery.reference)}</span>` : ""}
    </p>

    <p style="margin: 24px 0 0 0; color: #6b7280; font-size: 12px; border-top: 1px solid #e5e7eb; padding-top: 16px;">
      Dúvida? Responde esse email ou chama no WhatsApp (11) 98765-4321.
    </p>
  `

  const text = `Olá, ${ctx.customerName.split(" ")[0]}!

Recebemos seu pedido #${ctx.orderNumber} e já estamos preparando.

Tempo estimado: ~${ctx.etaMinutes} minutos (${ctx.shippingMethod === "express" ? "Express" : "Padrão"})

Acompanhe em: ${trackUrl}

Total: ${formatMoney(ctx.total)}

Açaí Tropical — ${SITE_URL}`

  return { subject, html: baseLayout(content, `Pedido #${ctx.orderNumber} confirmado`), text }
}

// =====================================================================
// Send
// =====================================================================

export async function sendOrderConfirmationEmail(ctx: OrderEmailContext): Promise<{ ok: boolean; error?: string }> {
  if (!RESEND_API_KEY) {
    console.warn("[email] RESEND_API_KEY ausente — pulando envio")
    return { ok: false, error: "RESEND_API_KEY não configurada" }
  }

  const { subject, html, text } = orderConfirmationTemplate(ctx)

  try {
    const resend = getResend()
    const { error } = await resend.emails.send({
      from: FROM_EMAIL,
      to: ctx.customerEmail,
      replyTo: REPLY_TO,
      subject,
      html,
      text,
    })
    if (error) {
      console.error("[email] erro do Resend:", error)
      return { ok: false, error: error.message }
    }
    return { ok: true }
  } catch (err) {
    console.error("[email] exceção:", err)
    return { ok: false, error: err instanceof Error ? err.message : "erro desconhecido" }
  }
}

interface OrderEmailRow {
  id: string
  order_number: string
  tracking_token: string | null
  eta_minutes: number
  items: CartItem[]
  total: number
  delivery: DeliveryData & {
    shipping?: { method: "standard" | "express"; price: number }
    subtotal?: number
  }
}

/**
 * Carrega o pedido do Supabase pelo id e dispara o email de confirmação.
 * Usado pelo checkout (cash/card) e pelo webhook do Vyat (PIX aprovado).
 */
export async function sendOrderConfirmationByOrderId(
  orderId: string,
): Promise<{ ok: boolean; error?: string; skipped?: string }> {
  const { data, error } = await getSupabaseAdmin()
    .from("orders")
    .select("id, order_number, tracking_token, eta_minutes, items, total, delivery")
    .eq("id", orderId)
    .maybeSingle<OrderEmailRow>()

  if (error) return { ok: false, error: error.message }
  if (!data) return { ok: false, error: "Pedido não encontrado" }

  const delivery = data.delivery
  const shipping = delivery.shipping ?? { method: "standard" as const, price: 0 }
  const subtotal = delivery.subtotal ?? Math.max(0, Number(data.total) - shipping.price)

  if (!delivery.email) return { ok: false, skipped: "no_email" }

  return sendOrderConfirmationEmail({
    orderNumber: data.order_number,
    customerName: delivery.fullName,
    customerEmail: delivery.email,
    trackingToken: data.tracking_token ?? data.id,
    items: data.items,
    subtotal,
    shippingPrice: shipping.price,
    total: Number(data.total),
    delivery,
    shippingMethod: shipping.method,
    etaMinutes: data.eta_minutes,
  })
}
