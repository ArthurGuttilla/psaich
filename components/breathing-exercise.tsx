"use client"

import { useState, useEffect, useRef } from "react"
import { Button } from "@/components/ui/button"
import { Wind } from "lucide-react"

type Phase = "idle" | "inhale" | "hold" | "exhale" | "rest"

interface BreathingConfig {
  name: string
  inhale: number
  hold: number
  exhale: number
  rest: number
  cycles: number
  description: string
}

const TECHNIQUES: BreathingConfig[] = [
  {
    name: "Box Breathing",
    inhale: 4,
    hold: 4,
    exhale: 4,
    rest: 4,
    cycles: 4,
    description: "Reduz o estresse e melhora o foco",
  },
  {
    name: "4-7-8",
    inhale: 4,
    hold: 7,
    exhale: 8,
    rest: 0,
    cycles: 4,
    description: "Promove relaxamento e sono",
  },
  {
    name: "Respiração calmante",
    inhale: 4,
    hold: 0,
    exhale: 6,
    rest: 2,
    cycles: 6,
    description: "Ativa o sistema nervoso parassimpático",
  },
]

const PHASE_LABELS: Record<Phase, string> = {
  idle: "Pronto",
  inhale: "Inspire...",
  hold: "Segure...",
  exhale: "Expire...",
  rest: "Pause...",
}

export function BreathingExercise() {
  const [isOpen, setIsOpen] = useState(false)
  const [technique, setTechnique] = useState(TECHNIQUES[0])
  const [phase, setPhase] = useState<Phase>("idle")
  const [progress, setProgress] = useState(0)
  const [cyclesLeft, setCyclesLeft] = useState(0)
  const [isActive, setIsActive] = useState(false)
  const [completedMessage, setCompletedMessage] = useState(false)
  const timerRef = useRef<NodeJS.Timeout | null>(null)
  const frameRef = useRef<number | null>(null)
  const startTimeRef = useRef<number>(0)
  const phaseDurationRef = useRef<number>(0)

  const clearTimers = () => {
    if (timerRef.current) clearTimeout(timerRef.current)
    if (frameRef.current) cancelAnimationFrame(frameRef.current)
  }

  const runPhase = (phaseName: Phase, duration: number, onComplete: () => void) => {
    if (duration === 0) {
      onComplete()
      return
    }
    setPhase(phaseName)
    setProgress(0)
    startTimeRef.current = performance.now()
    phaseDurationRef.current = duration * 1000

    const animate = (now: number) => {
      const elapsed = now - startTimeRef.current
      const p = Math.min(elapsed / phaseDurationRef.current, 1)
      setProgress(p)
      if (p < 1) {
        frameRef.current = requestAnimationFrame(animate)
      } else {
        onComplete()
      }
    }
    frameRef.current = requestAnimationFrame(animate)
  }

  const runCycle = (cycles: number) => {
    if (cycles <= 0) {
      setPhase("idle")
      setProgress(0)
      setIsActive(false)
      setCyclesLeft(0)
      setCompletedMessage(true)
      return
    }

    setCyclesLeft(cycles)

    runPhase("inhale", technique.inhale, () => {
      runPhase("hold", technique.hold, () => {
        runPhase("exhale", technique.exhale, () => {
          runPhase("rest", technique.rest, () => {
            runCycle(cycles - 1)
          })
        })
      })
    })
  }

  const start = () => {
    clearTimers()
    setCompletedMessage(false)
    setIsActive(true)
    runCycle(technique.cycles)
  }

  const stop = () => {
    clearTimers()
    setIsActive(false)
    setPhase("idle")
    setProgress(0)
    setCyclesLeft(0)
  }

  useEffect(() => {
    return clearTimers
  }, [])

  // Circle scale: inhale grows, exhale shrinks
  const circleScale = phase === "inhale"
    ? 0.6 + progress * 0.4
    : phase === "exhale"
    ? 1.0 - progress * 0.4
    : phase === "hold"
    ? 1.0
    : 0.6

  if (!isOpen) {
    return (
      <button
        onClick={() => setIsOpen(true)}
        className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors px-3 py-2 rounded-lg hover:bg-muted"
        aria-label="Abrir exercício de respiração"
      >
        <Wind className="h-4 w-4" />
        Respiração guiada
      </button>
    )
  }

  return (
    <div className="w-full rounded-xl border bg-card p-5 shadow-sm">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-base font-semibold flex items-center gap-2">
          <Wind className="h-4 w-4 text-[#8fbc8f]" />
          Respiração guiada
        </h3>
        <button
          onClick={() => { stop(); setIsOpen(false) }}
          className="text-muted-foreground hover:text-foreground text-sm"
        >
          Fechar
        </button>
      </div>

      {/* Technique selector */}
      {!isActive && (
        <div className="flex gap-2 mb-4 flex-wrap">
          {TECHNIQUES.map((t) => (
            <button
              key={t.name}
              onClick={() => setTechnique(t)}
              className={`px-3 py-1.5 rounded-full text-xs border transition-colors
                ${technique.name === t.name
                  ? "bg-[#8fbc8f] text-white border-[#8fbc8f]"
                  : "border-muted-foreground/30 text-muted-foreground hover:border-foreground"
                }`}
            >
              {t.name}
            </button>
          ))}
        </div>
      )}

      <p className="text-xs text-muted-foreground mb-4">{technique.description}</p>

      {/* Breathing circle */}
      <div className="flex flex-col items-center my-4">
        <div className="relative w-36 h-36 flex items-center justify-center">
          {/* Outer glow ring */}
          <div
            className="absolute rounded-full bg-[#8fbc8f]/20 transition-none"
            style={{
              width: `${100 * circleScale * 1.3}%`,
              height: `${100 * circleScale * 1.3}%`,
              transition: isActive ? "none" : "all 0.3s",
            }}
          />
          {/* Main circle */}
          <div
            className="rounded-full bg-gradient-to-br from-[#6b8e23]/60 to-[#8fbc8f] flex items-center justify-center"
            style={{
              width: `${100 * circleScale}%`,
              height: `${100 * circleScale}%`,
              transition: isActive ? "none" : "all 0.3s",
            }}
          >
            <span className="text-white font-medium text-sm select-none">
              {PHASE_LABELS[phase]}
            </span>
          </div>
        </div>

        {isActive && cyclesLeft > 0 && (
          <p className="text-xs text-muted-foreground mt-3">
            {cyclesLeft} ciclo{cyclesLeft !== 1 ? "s" : ""} restante{cyclesLeft !== 1 ? "s" : ""}
          </p>
        )}

        {completedMessage && (
          <p className="text-sm text-[#6b8e23] font-medium mt-3">
            Muito bem! Esperamos que se sinta mais calmo(a). 🌿
          </p>
        )}
      </div>

      <div className="flex justify-center mt-2">
        {!isActive ? (
          <Button size="sm" onClick={start} className="px-8">
            Começar
          </Button>
        ) : (
          <Button size="sm" variant="outline" onClick={stop}>
            Parar
          </Button>
        )}
      </div>
    </div>
  )
}
