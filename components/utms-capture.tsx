"use client"

import { useEffect } from "react"
import { captureUtmsFromUrl } from "@/lib/utms"

/**
 * Roda no primeiro pageview e persiste UTMs da URL em localStorage.
 * Mountar uma vez em `app/layout.tsx`.
 */
export function UtmsCapture(): null {
  useEffect(() => {
    captureUtmsFromUrl()
  }, [])
  return null
}
