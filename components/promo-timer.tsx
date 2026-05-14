"use client"

import { useEffect, useState } from "react"
import { Heart } from "lucide-react"

interface PromoTimerProps {
  showButton?: boolean
  onButtonClick?: () => void
}

/**
 * Fim do mês corrente (último dia às 23:59:59.999). Quando o mês vira, o alvo
 * passa sozinho pro fim do mês seguinte no próximo tick — sem reload.
 *
 * `new Date(ano, mês + 1, 0)` resolve pro último dia do mês `mês` (dia 0 do mês
 * seguinte = último dia do atual), cobrindo meses de 28/29/30/31 dias.
 */
function getEndOfMonth(currentTime: number): number {
  const d = new Date(currentTime)
  const endOfThisMonth = new Date(d.getFullYear(), d.getMonth() + 1, 0, 23, 59, 59, 999)
  if (endOfThisMonth.getTime() <= currentTime) {
    return new Date(d.getFullYear(), d.getMonth() + 2, 0, 23, 59, 59, 999).getTime()
  }
  return endOfThisMonth.getTime()
}

export function PromoTimer({ showButton = true, onButtonClick }: PromoTimerProps) {
  const [now, setNow] = useState<number | null>(null)

  useEffect(() => {
    setNow(Date.now())
    const interval = setInterval(() => setNow(Date.now()), 1000)
    return () => clearInterval(interval)
  }, [])

  const endAt = now === null ? 0 : getEndOfMonth(now)
  const secondsLeft = now === null ? 0 : Math.max(0, Math.floor((endAt - now) / 1000))
  const days = Math.floor(secondsLeft / 86400)
  const hours = Math.floor((secondsLeft % 86400) / 3600)
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

  const boxes: { value: number; label: string }[] = [
    { value: days, label: "Dias" },
    { value: hours, label: "Horas" },
    { value: minutes, label: "Min" },
    { value: seconds, label: "Seg" },
  ]

  return (
    <div className="flex h-full flex-col justify-center rounded-2xl border border-danger bg-danger-soft p-4 md:p-5">
      <p className="text-center text-sm font-semibold text-danger">A promoção encerra em:</p>

      <div className="mt-3 flex items-center justify-center gap-2 md:gap-3">
        {boxes.map((box) => (
          <div key={box.label} className="flex flex-col items-center">
            <div className="flex h-[60px] w-[60px] items-center justify-center rounded-md bg-danger text-[26px] font-extrabold leading-none text-white shadow-sm tabular-nums md:h-[70px] md:w-[70px] md:text-[32px]">
              {String(box.value).padStart(2, "0")}
            </div>
            <span className="mt-1 text-[10px] font-medium text-danger">{box.label}</span>
          </div>
        ))}
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
