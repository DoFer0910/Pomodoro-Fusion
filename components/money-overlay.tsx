"use client"

import { useEffect, useState } from "react"

interface MoneyOverlayProps {
  amount: number
}

export function MoneyOverlay({ amount }: MoneyOverlayProps) {
  const [particles, setParticles] = useState<{ id: number; x: number; delay: number }[]>([])

  useEffect(() => {
    const newParticles = Array.from({ length: 8 }, (_, i) => ({
      id: i,
      x: Math.random() * 100,
      delay: Math.random() * 0.5,
    }))
    setParticles(newParticles)
  }, [])

  return (
    <div className="fixed inset-0 z-50 pointer-events-none flex items-center justify-center">
      {/* Central amount display */}
      <div className="animate-float-up text-5xl font-bold text-gold drop-shadow-lg">+¥{amount.toLocaleString()}</div>

      {/* Floating coin particles */}
      {particles.map((particle) => (
        <div
          key={particle.id}
          className="absolute animate-float-up text-2xl"
          style={{
            left: `${particle.x}%`,
            bottom: "30%",
            animationDelay: `${particle.delay}s`,
          }}
        >
          💰
        </div>
      ))}
    </div>
  )
}
