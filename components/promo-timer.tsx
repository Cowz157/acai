"use client"

import { useEffect, useState } from "react"
import { Heart } from "lucide-react"

interface PromoTimerProps {
  /** Hora local em que a promoção encerra (0-23). Default: 23 (encerra às 23:59:59 do dia atual). */
  endHour?: number
  showButton?: boolean
  onButtonClick?: () => void
}

/** Próximo "fim do dia" a partir de um timestamp (sempre futuro). */
function getNextEndOfDay(currentTime: number, endHour: number): number {
  const d = new Date(currentTime)
  d.setHours(endHour, 59, 59, 999)
  // Se o "fim de hoje" já passou, mira no mesmo horário do dia seguinte.
  if (d.getTime() <= currentTime) d.setDate(d.getDate() + 1)
  return d.getTime()
}

export function PromoTimer({ endHour = 23, showButton = true, onButtonClick }: PromoTimerProps) {
  const [now, setNow] = useState<number | null>(null)

  useEffect(() => {
    setNow(Date.now())
    const interval = setInterval(() => setNow(Date.now()), 1000)
    return () => clearInterval(interval)
  }, [])

  // Recalcula o alvo a cada tick — quando a meia-noite passa, o "endAt" automaticamente
  // pula pra o fim do novo dia, sem precisar de reload.
  const endAt = now === null ? 0 : getNextEndOfDay(now, endHour)
  const secondsLeft = now === null ? 0 : Math.max(0, Math.floor((endAt - now) / 1000))
  const hours = Math.floor(secondsLeft / 3600)
  const minutes = Math.floor((secondsLeft % 3600) / 60)
  const seconds = secondsLeft % 60

  const handleClick = () => {
    if (onButtonClick) {
      onButtonClick()
      return
    }
    const target = document.getElementById("pague-leve")
    if (target) {
      const y = target.getBoundingClientRect().top + window.pageYOffset - 70
      window.scrollTo({ top: y, behavior: "smooth" })
    }
  }

  return (
    <div className="flex h-full flex-col justify-center rounded-2xl border border-danger bg-danger-soft p-4 md:p-5">
      <p className="text-center text-sm font-semibold text-danger">A promoção encerra hoje em:</p>

      <div className="mt-3 flex items-center justify-center gap-3">
        <div className="flex flex-col items-center">
          <div className="flex h-[70px] w-[70px] items-center justify-center rounded-md bg-danger text-[32px] font-extrabold leading-none text-white shadow-sm tabular-nums">
            {String(hours).padStart(2, "0")}
          </div>
          <span className="mt-1 text-[10px] font-medium text-danger">Horas</span>
        </div>
        <div className="flex flex-col items-center">
          <div className="flex h-[70px] w-[70px] items-center justify-center rounded-md bg-danger text-[32px] font-extrabold leading-none text-white shadow-sm tabular-nums">
            {String(minutes).padStart(2, "0")}
          </div>
          <span className="mt-1 text-[10px] font-medium text-danger">Minutos</span>
        </div>
        <div className="flex flex-col items-center">
          <div className="flex h-[70px] w-[70px] items-center justify-center rounded-md bg-danger text-[32px] font-extrabold leading-none text-white shadow-sm tabular-nums">
            {String(seconds).padStart(2, "0")}
          </div>
          <span className="mt-1 text-[10px] font-medium text-danger">Segundos</span>
        </div>
      </div>

      {showButton && (
        <div className="mt-4 flex justify-center">
          <button
            type="button"
            onClick={handleClick}
            className="inline-flex items-center gap-2 rounded-full border border-border bg-white px-5 py-2 text-sm font-semibold text-primary transition hover:bg-muted"
          >
            Clique Para Ver Açaís em Promoção <Heart className="h-4 w-4 fill-primary text-primary" />
          </button>
        </div>
      )}
    </div>
  )
}
