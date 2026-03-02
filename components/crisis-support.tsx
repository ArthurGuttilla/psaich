"use client"

import { useState } from "react"
import { Heart, Phone, ChevronDown, ChevronUp } from "lucide-react"

const RESOURCES = [
  {
    country: "🇧🇷 Brasil",
    lines: [
      { name: "CVV — Centro de Valorização da Vida", number: "188", available: "24 horas, 7 dias por semana", free: true },
      { name: "SAMU", number: "192", available: "Emergências médicas", free: true },
    ],
  },
  {
    country: "🇺🇸 EUA",
    lines: [
      { name: "988 Suicide & Crisis Lifeline", number: "988", available: "24/7", free: true },
      { name: "Crisis Text Line", number: "Text HOME to 741741", available: "24/7", free: true },
    ],
  },
  {
    country: "🌍 Internacional",
    lines: [
      { name: "International Association for Suicide Prevention", number: "https://www.iasp.info/resources/Crisis_Centres/", available: "Diretório global", free: true },
    ],
  },
]

export function CrisisSupport() {
  const [isOpen, setIsOpen] = useState(false)

  return (
    <div className="w-full rounded-xl border border-rose-200 dark:border-rose-900/50 bg-rose-50 dark:bg-rose-950/20 overflow-hidden">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between px-4 py-3 text-left"
        aria-expanded={isOpen}
      >
        <span className="flex items-center gap-2 text-sm font-medium text-rose-700 dark:text-rose-300">
          <Heart className="h-4 w-4" />
          Recursos de apoio em crise
        </span>
        {isOpen ? (
          <ChevronUp className="h-4 w-4 text-rose-500" />
        ) : (
          <ChevronDown className="h-4 w-4 text-rose-500" />
        )}
      </button>

      {isOpen && (
        <div className="px-4 pb-4 space-y-4">
          <p className="text-xs text-rose-600 dark:text-rose-400">
            Se você ou alguém que você conhece está passando por uma crise, ajuda está disponível. Você não está sozinho(a).
          </p>
          {RESOURCES.map((region) => (
            <div key={region.country}>
              <p className="text-xs font-semibold text-muted-foreground mb-1">{region.country}</p>
              <ul className="space-y-2">
                {region.lines.map((line) => (
                  <li key={line.name} className="flex items-start gap-2">
                    <Phone className="h-3.5 w-3.5 text-rose-500 mt-0.5 shrink-0" />
                    <div>
                      <p className="text-sm font-medium text-foreground">{line.name}</p>
                      <p className="text-xs text-rose-600 dark:text-rose-400 font-mono">{line.number}</p>
                      <p className="text-[10px] text-muted-foreground">{line.available} {line.free ? "· Gratuito" : ""}</p>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          ))}
          <p className="text-[10px] text-muted-foreground pt-1">
            Eliza é uma companheira de apoio emocional e não substitui ajuda profissional.
          </p>
        </div>
      )}
    </div>
  )
}
