import { useEffect, useRef, useState } from 'react'

interface MoneyBarProps {
  money: number
}

export default function MoneyBar({ money }: MoneyBarProps) {
  const prevMoney = useRef(money)
  const [delta, setDelta] = useState<number | null>(null)

  useEffect(() => {
    if (money !== prevMoney.current) {
      const diff = money - prevMoney.current
      setDelta(diff)
      prevMoney.current = money
      const timer = setTimeout(() => setDelta(null), 1500)
      return () => clearTimeout(timer)
    }
  }, [money])

  return (
    <div className="relative flex items-center gap-2 bg-black/70 rounded-2xl px-5 py-3">
      <span className="text-xl">🪙</span>
      <span className="text-white font-bold text-xl">{money}</span>
      {delta !== null && (
        <span
          className={`absolute -top-5 left-1/2 -translate-x-1/2 font-bold text-sm animate-bounce ${delta > 0 ? 'text-green-400' : 'text-red-400'}`}
        >
          {delta > 0 ? `+${delta}` : `${delta}`}
        </span>
      )}
    </div>
  )
}
