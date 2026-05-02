/**
 * Lightweight UUID v4 generator that works on both server and client.
 * Uses crypto.randomUUID when available, falls back to a manual implementation.
 */
export function uuid(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID()
  }
  // Fallback for older runtimes
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0
    const v = c === "x" ? r : (r & 0x3) | 0x8
    return v.toString(16)
  })
}

/**
 * Generates a short numeric order id (5 digits).
 */
export function orderId(): string {
  return Math.floor(10000 + Math.random() * 90000).toString()
}
