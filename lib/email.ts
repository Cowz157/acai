import "server-only"

import { Resend } from "resend"
import type { CartItem } from "./cart-store"
import type { DeliveryData, GiftData } from "./checkout-types"
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
  gift: GiftData | null
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
  const isGift = Boolean(ctx.gift)
  const subject = isGift
    ? `Presente confirmado pra ${ctx.gift!.recipientName.split(" ")[0]} 🎁 — Pedido #${ctx.orderNumber}`
    : `Pedido #${ctx.orderNumber} confirmado — chega em ~${ctx.etaMinutes} min`

  const giftBlock = isGift
    ? `
    <div style="background-color: #fdf4ff; border: 2px solid #a855f7; border-radius: 12px; padding: 16px 20px; margin: 16px 0;">
      <p style="margin: 0 0 8px 0; color: #6b21a8; font-size: 13px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px;">
        🎁 Presente para
      </p>
      <p style="margin: 0 0 6px 0; color: #1a1a1a; font-size: 18px; font-weight: 800;">
        ${escapeHtml(ctx.gift!.recipientName)}
      </p>
      <p style="margin: 0 0 ${ctx.gift!.message ? "12px" : "0"} 0; color: #6b7280; font-size: 13px;">
        WhatsApp: ${escapeHtml(ctx.gift!.recipientPhone)}
      </p>
      ${
        ctx.gift!.message
          ? `<div style="background-color: #ffffff; border-left: 4px solid #a855f7; padding: 12px 14px; border-radius: 4px; font-style: italic; color: #1a1a1a; font-size: 14px; line-height: 1.5;">
        "${escapeHtml(ctx.gift!.message)}"
      </div>`
          : ""
      }
    </div>`
    : ""

  const content = `
    <h2 style="margin: 0 0 8px 0; color: #4a0e5c; font-size: 20px;">Olá, ${escapeHtml(ctx.customerName.split(" ")[0])}! 💜</h2>
    <p style="margin: 0 0 16px 0; font-size: 15px; color: #1a1a1a;">
      ${
        isGift
          ? `Recebemos seu presente <strong>#${ctx.orderNumber}</strong> e já estamos preparando com carinho pra <strong>${escapeHtml(ctx.gift!.recipientName.split(" ")[0])}</strong>.`
          : `Recebemos seu pedido <strong>#${ctx.orderNumber}</strong> e já estamos preparando.`
      }
    </p>

    ${giftBlock}

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

    <h3 style="margin: 24px 0 8px 0; color: #1a1a1a; font-size: 16px;">${isGift ? "Endereço de entrega do presente" : "Endereço de entrega"}</h3>
    <p style="margin: 0; color: #1a1a1a; font-size: 14px;">
      ${escapeHtml(isGift ? ctx.gift!.recipientName : ctx.delivery.fullName)}<br>
      ${escapeHtml(ctx.delivery.street)}, ${escapeHtml(ctx.delivery.number)}${ctx.delivery.complement ? ` - ${escapeHtml(ctx.delivery.complement)}` : ""}<br>
      ${ctx.delivery.neighborhood ? `${escapeHtml(ctx.delivery.neighborhood)}<br>` : ""}
      ${ctx.delivery.reference ? `<span style="color: #6b7280;">Ref: ${escapeHtml(ctx.delivery.reference)}</span>` : ""}
    </p>

    <p style="margin: 24px 0 0 0; color: #6b7280; font-size: 12px; border-top: 1px solid #e5e7eb; padding-top: 16px;">
      Dúvida? Responde esse email ou chama no WhatsApp (11) 98765-4321.
    </p>
  `

  const giftText = isGift
    ? `\n🎁 Presente para: ${ctx.gift!.recipientName}\nWhatsApp: ${ctx.gift!.recipientPhone}${
        ctx.gift!.message ? `\nMensagem: "${ctx.gift!.message}"` : ""
      }\n`
    : ""

  const text = `Olá, ${ctx.customerName.split(" ")[0]}!

${
  isGift
    ? `Recebemos seu presente #${ctx.orderNumber} e já estamos preparando com carinho.`
    : `Recebemos seu pedido #${ctx.orderNumber} e já estamos preparando.`
}
${giftText}
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
  gift: GiftData | null
}

// =====================================================================
// Templates — Recuperação de PIX abandonado
// =====================================================================

interface PixNudgeContext {
  orderNumber: string
  customerName: string
  trackingToken: string
  items: CartItem[]
  total: number
  codigoPix: string
  expiresAtMs: number
}

function pixNudgeTemplate(ctx: PixNudgeContext): { subject: string; html: string; text: string } {
  const subject = `Seu açaí ainda tá esperando 💜 Pedido #${ctx.orderNumber}`
  const trackUrl = `${SITE_URL}/acompanhar?token=${encodeURIComponent(ctx.trackingToken)}`
  const minutesLeft = Math.max(0, Math.floor((ctx.expiresAtMs - Date.now()) / 60000))

  const content = `
    <h2 style="margin: 0 0 8px 0; color: #4a0e5c; font-size: 20px;">Olá, ${escapeHtml(ctx.customerName.split(" ")[0])}! 💜</h2>
    <p style="margin: 0 0 16px 0; font-size: 15px; color: #1a1a1a;">
      Notei que você gerou um PIX e ainda não chegou a pagar. Seu pedido <strong>#${ctx.orderNumber}</strong> ainda está aqui!
    </p>

    <div style="background-color: #fef3c7; border-left: 4px solid #f59e0b; padding: 12px 16px; margin: 16px 0; border-radius: 4px;">
      <p style="margin: 0; color: #92400e; font-size: 14px;">
        ⏱ ${minutesLeft > 0 ? `Você tem ~${minutesLeft} minutos pra pagar antes do PIX expirar.` : "Seu PIX está prestes a expirar — pague agora ou gere um novo."}
      </p>
    </div>

    <h3 style="margin: 24px 0 6px 0; color: #1a1a1a; font-size: 14px;">Código copia e cola:</h3>
    <p style="margin: 0 0 8px 0; color: #6b7280; font-size: 11px;">Toque no código abaixo pra selecionar tudo, depois cole no app do banco:</p>
    <div style="background-color: #f5f5f5; border: 2px dashed #d1d5db; border-radius: 8px; padding: 12px; font-family: 'Courier New', monospace; font-size: 11px; word-break: break-all; color: #1a1a1a; margin-bottom: 16px; user-select: all; -webkit-user-select: all; -moz-user-select: all; cursor: pointer;">
      ${escapeHtml(ctx.codigoPix)}
    </div>

    <div style="text-align: center; margin: 24px 0;">
      <a href="${trackUrl}" style="display: inline-block; background-color: #4a0e5c; color: #ffffff; padding: 14px 28px; border-radius: 999px; text-decoration: none; font-weight: bold; font-size: 15px;">
        Voltar e finalizar pedido →
      </a>
    </div>

    <h3 style="margin: 24px 0 12px 0; color: #1a1a1a; font-size: 16px;">Resumo</h3>
    <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="font-size: 14px;">
      ${renderItemsList(ctx.items)}
      <tr>
        <td style="padding: 8px 0 0 0; border-top: 1px solid #e5e7eb; font-weight: bold; color: #1a1a1a;">Total</td>
        <td style="padding: 8px 0 0 0; border-top: 1px solid #e5e7eb; text-align: right; font-weight: 800; color: #16a34a; font-size: 18px;">${formatMoney(ctx.total)}</td>
      </tr>
    </table>
  `

  const text = `Olá, ${ctx.customerName.split(" ")[0]}!

Notei que você gerou um PIX e ainda não chegou a pagar. Pedido #${ctx.orderNumber} está esperando.

${minutesLeft > 0 ? `Você tem ~${minutesLeft} min pra pagar.` : "PIX prestes a expirar."}

Código PIX:
${ctx.codigoPix}

Ou acesse: ${trackUrl}

Total: ${formatMoney(ctx.total)}

Açaí Tropical — ${SITE_URL}`

  return { subject, html: baseLayout(content, `Seu PIX ainda está válido — pedido #${ctx.orderNumber}`), text }
}

interface PixExpiredContext {
  orderNumber: string
  customerName: string
  trackingToken: string
  items: CartItem[]
  total: number
}

function pixExpiredTemplate(ctx: PixExpiredContext): { subject: string; html: string; text: string } {
  const subject = `Seu PIX expirou — gere outro em 1 clique 💜`
  const trackUrl = `${SITE_URL}/acompanhar?token=${encodeURIComponent(ctx.trackingToken)}`

  const content = `
    <h2 style="margin: 0 0 8px 0; color: #4a0e5c; font-size: 20px;">Olá, ${escapeHtml(ctx.customerName.split(" ")[0])}! 💜</h2>
    <p style="margin: 0 0 16px 0; font-size: 15px; color: #1a1a1a;">
      Seu PIX do pedido <strong>#${ctx.orderNumber}</strong> expirou, mas <strong>seu pedido ainda está aqui</strong>!
    </p>
    <p style="margin: 0 0 16px 0; font-size: 15px; color: #1a1a1a;">
      Sem stress — é só clicar abaixo pra gerar um PIX novo e finalizar.
    </p>

    <div style="text-align: center; margin: 24px 0;">
      <a href="${trackUrl}" style="display: inline-block; background-color: #16a34a; color: #ffffff; padding: 14px 28px; border-radius: 999px; text-decoration: none; font-weight: bold; font-size: 15px;">
        Gerar PIX novo e finalizar →
      </a>
    </div>

    <h3 style="margin: 24px 0 12px 0; color: #1a1a1a; font-size: 16px;">Seu pedido</h3>
    <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="font-size: 14px;">
      ${renderItemsList(ctx.items)}
      <tr>
        <td style="padding: 8px 0 0 0; border-top: 1px solid #e5e7eb; font-weight: bold; color: #1a1a1a;">Total</td>
        <td style="padding: 8px 0 0 0; border-top: 1px solid #e5e7eb; text-align: right; font-weight: 800; color: #16a34a; font-size: 18px;">${formatMoney(ctx.total)}</td>
      </tr>
    </table>

    <p style="margin: 24px 0 0 0; color: #6b7280; font-size: 12px; border-top: 1px solid #e5e7eb; padding-top: 16px;">
      Não quer mais? Sem problema — esse pedido é cancelado automaticamente sem pagamento.
    </p>
  `

  const text = `Olá, ${ctx.customerName.split(" ")[0]}!

Seu PIX do pedido #${ctx.orderNumber} expirou, mas seu pedido ainda está aqui!

Clique pra gerar outro PIX:
${trackUrl}

Total: ${formatMoney(ctx.total)}

Açaí Tropical — ${SITE_URL}`

  return { subject, html: baseLayout(content, `Seu PIX expirou — pedido #${ctx.orderNumber}`), text }
}

// =====================================================================
// Send — Recuperação de PIX abandonado
// =====================================================================

export interface AbandonedOrderRow {
  id: string
  order_number: string
  tracking_token: string | null
  items: CartItem[]
  total: number | string
  delivery: DeliveryData & {
    shipping?: { method: "standard" | "express"; price: number }
    subtotal?: number
  }
  pix_codigo: string | null
  pix_expires_at: string | null
}

export async function sendPixNudgeEmail(
  order: AbandonedOrderRow,
): Promise<{ ok: boolean; error?: string; skipped?: string }> {
  if (!RESEND_API_KEY) {
    console.warn("[email] RESEND_API_KEY ausente — pulando nudge")
    return { ok: false, error: "RESEND_API_KEY não configurada" }
  }
  if (!order.delivery.email) return { ok: false, skipped: "no_email" }
  if (!order.pix_codigo) return { ok: false, skipped: "no_pix_code" }
  if (!order.pix_expires_at) return { ok: false, skipped: "no_expires_at" }

  const { subject, html, text } = pixNudgeTemplate({
    orderNumber: order.order_number,
    customerName: order.delivery.fullName,
    trackingToken: order.tracking_token ?? order.id,
    items: order.items,
    total: Number(order.total),
    codigoPix: order.pix_codigo,
    expiresAtMs: new Date(order.pix_expires_at).getTime(),
  })

  try {
    const resend = getResend()
    const { error } = await resend.emails.send({
      from: FROM_EMAIL,
      to: order.delivery.email,
      replyTo: REPLY_TO,
      subject,
      html,
      text,
    })
    if (error) {
      console.error("[email] erro Resend (nudge):", error)
      return { ok: false, error: error.message }
    }
    return { ok: true }
  } catch (err) {
    console.error("[email] exceção (nudge):", err)
    return { ok: false, error: err instanceof Error ? err.message : "erro desconhecido" }
  }
}

// =====================================================================
// Templates — Falha de entrega (cliente não recebeu)
// =====================================================================

interface RedeliveryEmailContext {
  orderNumber: string
  customerName: string
  trackingToken: string
  redeliveryFee: number
  codigoPix: string
  expiresAtMs: number
}

function redeliveryTemplate(ctx: RedeliveryEmailContext): { subject: string; html: string; text: string } {
  const subject = `Nova entrega gerada — Pedido #${ctx.orderNumber}`
  const trackUrl = `${SITE_URL}/acompanhar?token=${encodeURIComponent(ctx.trackingToken)}`

  const content = `
    <h2 style="margin: 0 0 8px 0; color: #4a0e5c; font-size: 20px;">Olá, ${escapeHtml(ctx.customerName.split(" ")[0])} 💜</h2>
    <p style="margin: 0 0 16px 0; font-size: 15px; color: #1a1a1a;">
      Recebemos seu relato de que o pedido <strong>#${ctx.orderNumber}</strong> não chegou. Sentimos muito pelo transtorno.
    </p>

    <p style="margin: 0 0 16px 0; font-size: 15px; color: #1a1a1a;">
      Você optou por <strong>tentar uma nova entrega</strong>. Pra cobrir os custos do entregador na nova rota, geramos um PIX de <strong>${formatMoney(ctx.redeliveryFee)}</strong>.
    </p>

    <div style="background-color: #fef3c7; border-left: 4px solid #f59e0b; padding: 12px 16px; margin: 16px 0; border-radius: 4px;">
      <p style="margin: 0; color: #92400e; font-size: 14px;">
        ⏱ O PIX expira em ~30 minutos. Após o pagamento, sua nova entrega entra em rota imediatamente.
      </p>
    </div>

    <h3 style="margin: 24px 0 6px 0; color: #1a1a1a; font-size: 14px;">Código copia e cola:</h3>
    <p style="margin: 0 0 8px 0; color: #6b7280; font-size: 11px;">Toque no código abaixo pra selecionar tudo, depois cole no app do banco:</p>
    <div style="background-color: #f5f5f5; border: 2px dashed #d1d5db; border-radius: 8px; padding: 12px; font-family: 'Courier New', monospace; font-size: 11px; word-break: break-all; color: #1a1a1a; margin-bottom: 16px; user-select: all; -webkit-user-select: all; -moz-user-select: all; cursor: pointer;">
      ${escapeHtml(ctx.codigoPix)}
    </div>

    <div style="text-align: center; margin: 24px 0;">
      <a href="${trackUrl}" style="display: inline-block; background-color: #4a0e5c; color: #ffffff; padding: 14px 28px; border-radius: 999px; text-decoration: none; font-weight: bold; font-size: 15px;">
        Acompanhar nova entrega →
      </a>
    </div>

    <p style="margin: 24px 0 0 0; color: #6b7280; font-size: 12px; border-top: 1px solid #e5e7eb; padding-top: 16px;">
      Mudou de ideia? Você pode solicitar reembolso integral acessando a página de acompanhamento — basta clicar em "Solicitar reembolso" lá.
    </p>
  `

  const text = `Olá, ${ctx.customerName.split(" ")[0]}!

Recebemos seu relato de que o pedido #${ctx.orderNumber} não chegou.

Você optou por tentar uma nova entrega. Geramos um PIX de ${formatMoney(ctx.redeliveryFee)} pra cobrir os custos do entregador.

Código PIX (expira em ~30 min):
${ctx.codigoPix}

Ou acesse: ${trackUrl}

Açaí Tropical — ${SITE_URL}`

  return { subject, html: baseLayout(content, `Nova entrega gerada — pedido #${ctx.orderNumber}`), text }
}

interface RefundRequestedContext {
  orderNumber: string
  customerName: string
  refundAmount: number
}

function refundRequestedTemplate(ctx: RefundRequestedContext): { subject: string; html: string; text: string } {
  const subject = `Reembolso solicitado — Pedido #${ctx.orderNumber}`

  const content = `
    <h2 style="margin: 0 0 8px 0; color: #4a0e5c; font-size: 20px;">Olá, ${escapeHtml(ctx.customerName.split(" ")[0])} 💜</h2>
    <p style="margin: 0 0 16px 0; font-size: 15px; color: #1a1a1a;">
      Recebemos sua solicitação de reembolso pelo pedido <strong>#${ctx.orderNumber}</strong>. Sentimos muito pelo ocorrido.
    </p>

    <div style="background-color: #dcfce7; border-left: 4px solid #16a34a; padding: 16px; margin: 16px 0; border-radius: 4px;">
      <p style="margin: 0 0 8px 0; color: #14532d; font-size: 15px; font-weight: bold;">
        Valor a ser reembolsado: ${formatMoney(ctx.refundAmount)}
      </p>
      <p style="margin: 0; color: #14532d; font-size: 13px;">
        O valor será devolvido via PIX na chave usada no pagamento original em <strong>até 5 dias úteis</strong>.
      </p>
    </div>

    <h3 style="margin: 24px 0 8px 0; color: #1a1a1a; font-size: 16px;">Próximos passos</h3>
    <ol style="margin: 0; padding-left: 20px; color: #1a1a1a; font-size: 14px; line-height: 1.6;">
      <li>Nosso financeiro processa o reembolso nos próximos dias úteis</li>
      <li>Você recebe um novo email confirmando quando o valor for enviado</li>
      <li>O valor cai na sua conta de origem em até alguns minutos após o envio</li>
    </ol>

    <p style="margin: 24px 0 0 0; color: #6b7280; font-size: 12px; border-top: 1px solid #e5e7eb; padding-top: 16px;">
      Dúvidas sobre o reembolso? Responde esse email ou chama o WhatsApp — vamos te dar atualização do status.
    </p>
  `

  const text = `Olá, ${ctx.customerName.split(" ")[0]}!

Recebemos sua solicitação de reembolso pelo pedido #${ctx.orderNumber}.

Valor a ser reembolsado: ${formatMoney(ctx.refundAmount)}
Prazo: até 5 dias úteis

O valor será devolvido via PIX na chave usada no pagamento original.

Açaí Tropical — ${SITE_URL}`

  return { subject, html: baseLayout(content, `Reembolso solicitado — pedido #${ctx.orderNumber}`), text }
}

// =====================================================================
// Send — Falha de entrega
// =====================================================================

interface DeliveryFailureRow {
  id: string
  order_number: string
  tracking_token: string | null
  total: number | string
  delivery: DeliveryData & { shipping?: { method: "standard" | "express"; price: number } }
}

export async function sendRedeliveryEmail(
  order: DeliveryFailureRow,
  redelivery: { codigoPix: string; expiresAtMs: number; fee: number },
): Promise<{ ok: boolean; error?: string; skipped?: string }> {
  if (!RESEND_API_KEY) {
    console.warn("[email] RESEND_API_KEY ausente — pulando redelivery")
    return { ok: false, error: "RESEND_API_KEY não configurada" }
  }
  if (!order.delivery.email) return { ok: false, skipped: "no_email" }

  const { subject, html, text } = redeliveryTemplate({
    orderNumber: order.order_number,
    customerName: order.delivery.fullName,
    trackingToken: order.tracking_token ?? order.id,
    redeliveryFee: redelivery.fee,
    codigoPix: redelivery.codigoPix,
    expiresAtMs: redelivery.expiresAtMs,
  })

  try {
    const resend = getResend()
    const { error } = await resend.emails.send({
      from: FROM_EMAIL,
      to: order.delivery.email,
      replyTo: REPLY_TO,
      subject,
      html,
      text,
    })
    if (error) {
      console.error("[email] erro Resend (redelivery):", error)
      return { ok: false, error: error.message }
    }
    return { ok: true }
  } catch (err) {
    console.error("[email] exceção (redelivery):", err)
    return { ok: false, error: err instanceof Error ? err.message : "erro desconhecido" }
  }
}

export async function sendRefundRequestedEmail(
  order: DeliveryFailureRow,
): Promise<{ ok: boolean; error?: string; skipped?: string }> {
  if (!RESEND_API_KEY) {
    console.warn("[email] RESEND_API_KEY ausente — pulando refund")
    return { ok: false, error: "RESEND_API_KEY não configurada" }
  }
  if (!order.delivery.email) return { ok: false, skipped: "no_email" }

  const { subject, html, text } = refundRequestedTemplate({
    orderNumber: order.order_number,
    customerName: order.delivery.fullName,
    refundAmount: Number(order.total),
  })

  try {
    const resend = getResend()
    const { error } = await resend.emails.send({
      from: FROM_EMAIL,
      to: order.delivery.email,
      replyTo: REPLY_TO,
      subject,
      html,
      text,
    })
    if (error) {
      console.error("[email] erro Resend (refund):", error)
      return { ok: false, error: error.message }
    }
    return { ok: true }
  } catch (err) {
    console.error("[email] exceção (refund):", err)
    return { ok: false, error: err instanceof Error ? err.message : "erro desconhecido" }
  }
}

export async function sendPixExpiredEmail(
  order: AbandonedOrderRow,
): Promise<{ ok: boolean; error?: string; skipped?: string }> {
  if (!RESEND_API_KEY) {
    console.warn("[email] RESEND_API_KEY ausente — pulando expired")
    return { ok: false, error: "RESEND_API_KEY não configurada" }
  }
  if (!order.delivery.email) return { ok: false, skipped: "no_email" }

  const { subject, html, text } = pixExpiredTemplate({
    orderNumber: order.order_number,
    customerName: order.delivery.fullName,
    trackingToken: order.tracking_token ?? order.id,
    items: order.items,
    total: Number(order.total),
  })

  try {
    const resend = getResend()
    const { error } = await resend.emails.send({
      from: FROM_EMAIL,
      to: order.delivery.email,
      replyTo: REPLY_TO,
      subject,
      html,
      text,
    })
    if (error) {
      console.error("[email] erro Resend (expired):", error)
      return { ok: false, error: error.message }
    }
    return { ok: true }
  } catch (err) {
    console.error("[email] exceção (expired):", err)
    return { ok: false, error: err instanceof Error ? err.message : "erro desconhecido" }
  }
}

/**
 * Carrega o pedido do Supabase pelo id e dispara o email de confirmação.
 *
 * Idempotente: usa `confirmation_email_sent_at` como claim atômico. Dois
 * caminhos podem chamar essa função pra mesmo orderId quase simultaneamente
 * (polling no cliente + cron server-side de check-pending-pix). Quem ganha
 * o UPDATE da flag dispara o email; o outro retorna `skipped: 'already_sent'`.
 *
 * Se o envio do Resend falhar, a flag é revertida pra null pra que a
 * próxima execução do cron (ou retry do client) tente de novo.
 */
export async function sendOrderConfirmationByOrderId(
  orderId: string,
): Promise<{ ok: boolean; error?: string; skipped?: string }> {
  const admin = getSupabaseAdmin()

  // Claim atômico: só sucede se confirmation_email_sent_at ainda for null.
  // O .select() retorna a row com os dados pra montar o email — economiza
  // um SELECT extra no caso comum.
  const { data, error } = await admin
    .from("orders")
    .update({ confirmation_email_sent_at: new Date().toISOString() })
    .eq("id", orderId)
    .is("confirmation_email_sent_at", null)
    .select("id, order_number, tracking_token, eta_minutes, items, total, delivery, gift")
    .maybeSingle<OrderEmailRow>()

  if (error) return { ok: false, error: error.message }

  if (!data) {
    // Update afetou 0 rows — ou pedido não existe, ou já foi reivindicado
    // por outra execução. Diferencia pra dar erro ou skip apropriado.
    const { data: exists } = await admin
      .from("orders")
      .select("id")
      .eq("id", orderId)
      .maybeSingle()
    if (!exists) return { ok: false, error: "Pedido não encontrado" }
    return { ok: true, skipped: "already_sent" }
  }

  const delivery = data.delivery
  const shipping = delivery.shipping ?? { method: "standard" as const, price: 0 }
  const subtotal = delivery.subtotal ?? Math.max(0, Number(data.total) - shipping.price)

  if (!delivery.email) {
    // Sem email = não tem como enviar; reverte claim pra não bloquear retry futuro
    await admin
      .from("orders")
      .update({ confirmation_email_sent_at: null })
      .eq("id", orderId)
    return { ok: false, skipped: "no_email" }
  }

  const result = await sendOrderConfirmationEmail({
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
    gift: data.gift,
  })

  if (!result.ok) {
    // Falha no Resend — desfaz claim pra próximo retry tentar de novo
    await admin
      .from("orders")
      .update({ confirmation_email_sent_at: null })
      .eq("id", orderId)
  }

  return result
}

// =====================================================================
// Templates — Pós-entrega (seu açaí chegou?)
// =====================================================================

interface DeliveryFollowupContext {
  orderNumber: string
  customerName: string
  trackingToken: string
}

function deliveryFollowupTemplate(ctx: DeliveryFollowupContext): { subject: string; html: string; text: string } {
  const subject = `Seu açaí chegou? — Pedido #${ctx.orderNumber}`
  const trackUrl = `${SITE_URL}/acompanhar?token=${encodeURIComponent(ctx.trackingToken)}`

  // Empurra re-entrega como CTA principal (botão grande roxo). "Recebi" fica
  // como botão secundário menor. Reembolso é mencionado discretamente no fim
  // — quem realmente quer reembolso entra no /acompanhar e acha o link lá.
  const content = `
    <h2 style="margin: 0 0 8px 0; color: #4a0e5c; font-size: 20px;">Olá, ${escapeHtml(ctx.customerName.split(" ")[0])} 💜</h2>
    <p style="margin: 0 0 20px 0; font-size: 15px; color: #1a1a1a;">
      Seu pedido <strong>#${ctx.orderNumber}</strong> já deveria ter chegado. Conta pra gente como foi:
    </p>

    <div style="text-align: center; margin: 24px 0;">
      <a href="${trackUrl}" style="display: inline-block; width: 100%; max-width: 360px; box-sizing: border-box; background-color: #dc2626; color: #ffffff; padding: 18px 24px; border-radius: 12px; text-decoration: none; font-weight: 800; font-size: 15px; line-height: 1.3;">
        Não chegou — quero nova entrega
      </a>
    </div>

    <div style="text-align: center; margin: 12px 0 24px 0;">
      <a href="${trackUrl}" style="display: inline-block; background-color: #16a34a; color: #ffffff; padding: 12px 28px; border-radius: 999px; text-decoration: none; font-weight: 700; font-size: 13px;">
        ✅ Recebi, tudo certo
      </a>
    </div>

    <p style="margin: 24px 0 0 0; font-size: 14px; color: #1a1a1a; line-height: 1.5;">
      Se algo deu errado, <strong>nossa nova entrega é prioridade</strong> — chega em <strong>8-25 minutos</strong> com taxa simbólica de <strong>R$ 12,50</strong> (corrida do entregador novo).
    </p>

    <p style="margin: 16px 0 0 0; color: #6b7280; font-size: 12px; border-top: 1px solid #e5e7eb; padding-top: 16px;">
      Também é possível solicitar reembolso integral acessando "acompanhar pedido", mas a nova entrega geralmente resolve mais rápido.
    </p>
  `

  const text = `Olá, ${ctx.customerName.split(" ")[0]}!

Seu pedido #${ctx.orderNumber} já deveria ter chegado.

Não chegou? Geramos uma nova entrega imediata — chega em 8-25 min, com taxa de R$12,50.

Acessar: ${trackUrl}

Açaí Tropical — ${SITE_URL}`

  return {
    subject,
    html: baseLayout(content, `Seu pedido #${ctx.orderNumber} chegou?`),
    text,
  }
}

interface DeliveryFollowupEmailRow {
  id: string
  order_number: string
  tracking_token: string | null
  delivery: DeliveryData
}

/**
 * Carrega o pedido do Supabase pelo id e dispara o email pós-entrega.
 *
 * Idempotente: usa `delivery_followup_sent_at` como claim atômico — mesmo
 * padrão do confirmation email. Cron pode chamar repetidamente sem dobrar
 * envio.
 *
 * Se Resend falhar, a flag é revertida pra null pra próxima execução tentar.
 */
export async function sendDeliveryFollowupByOrderId(
  orderId: string,
): Promise<{ ok: boolean; error?: string; skipped?: string }> {
  const admin = getSupabaseAdmin()

  const { data, error } = await admin
    .from("orders")
    .update({ delivery_followup_sent_at: new Date().toISOString() })
    .eq("id", orderId)
    .is("delivery_followup_sent_at", null)
    .select("id, order_number, tracking_token, delivery")
    .maybeSingle<DeliveryFollowupEmailRow>()

  if (error) return { ok: false, error: error.message }

  if (!data) {
    const { data: exists } = await admin
      .from("orders")
      .select("id")
      .eq("id", orderId)
      .maybeSingle()
    if (!exists) return { ok: false, error: "Pedido não encontrado" }
    return { ok: true, skipped: "already_sent" }
  }

  if (!data.delivery.email) {
    await admin
      .from("orders")
      .update({ delivery_followup_sent_at: null })
      .eq("id", orderId)
    return { ok: false, skipped: "no_email" }
  }

  const { subject, html, text } = deliveryFollowupTemplate({
    orderNumber: data.order_number,
    customerName: data.delivery.fullName,
    trackingToken: data.tracking_token ?? data.id,
  })

  try {
    const resend = getResend()
    const { error: sendErr } = await resend.emails.send({
      from: FROM_EMAIL,
      to: data.delivery.email,
      replyTo: REPLY_TO,
      subject,
      html,
      text,
    })
    if (sendErr) {
      console.error("[email] erro Resend (delivery-followup):", sendErr)
      await admin
        .from("orders")
        .update({ delivery_followup_sent_at: null })
        .eq("id", orderId)
      return { ok: false, error: sendErr.message }
    }
    return { ok: true }
  } catch (err) {
    console.error("[email] exceção (delivery-followup):", err)
    await admin
      .from("orders")
      .update({ delivery_followup_sent_at: null })
      .eq("id", orderId)
    return { ok: false, error: err instanceof Error ? err.message : "erro desconhecido" }
  }
}
