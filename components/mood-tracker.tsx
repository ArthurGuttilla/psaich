"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { saveMoodEntry, getTodayMood, type MoodLevel } from "@/lib/firestore"

const MOODS: { level: MoodLevel; emoji: string; label: string; color: string }[] = [
  { level: 1, emoji: "😔", label: "Muito mal", color: "bg-red-100 border-red-300 dark:bg-red-900/30 dark:border-red-700" },
  { level: 2, emoji: "😕", label: "Mal", color: "bg-orange-100 border-orange-300 dark:bg-orange-900/30 dark:border-orange-700" },
  { level: 3, emoji: "😐", label: "Neutro", color: "bg-yellow-100 border-yellow-300 dark:bg-yellow-900/30 dark:border-yellow-700" },
  { level: 4, emoji: "🙂", label: "Bem", color: "bg-lime-100 border-lime-300 dark:bg-lime-900/30 dark:border-lime-700" },
  { level: 5, emoji: "😊", label: "Muito bem", color: "bg-green-100 border-green-300 dark:bg-green-900/30 dark:border-green-700" },
]

interface MoodTrackerProps {
  userId: string
  onMoodSelected?: (mood: MoodLevel) => void
}

export function MoodTracker({ userId, onMoodSelected }: MoodTrackerProps) {
  const [selected, setSelected] = useState<MoodLevel | null>(null)
  const [note, setNote] = useState("")
  const [saved, setSaved] = useState(false)
  const [showNote, setShowNote] = useState(false)
  const [alreadyCheckedIn, setAlreadyCheckedIn] = useState(false)

  useEffect(() => {
    const checkTodayMood = async () => {
      const todayEntry = await getTodayMood(userId)
      if (todayEntry) {
        setSelected(todayEntry.mood)
        setAlreadyCheckedIn(true)
        setSaved(true)
      }
    }
    checkTodayMood()
  }, [userId])

  const handleSelect = (level: MoodLevel) => {
    if (alreadyCheckedIn) return
    setSelected(level)
    setShowNote(true)
  }

  const handleSave = async () => {
    if (!selected) return
    await saveMoodEntry(userId, selected, note.trim() || undefined)
    setSaved(true)
    setAlreadyCheckedIn(true)
    onMoodSelected?.(selected)
  }

  const selectedMood = MOODS.find((m) => m.level === selected)

  return (
    <div className="w-full rounded-xl border bg-card p-5 shadow-sm">
      <h3 className="text-base font-semibold mb-1 text-foreground">
        {alreadyCheckedIn ? "Humor de hoje" : "Como você está se sentindo agora?"}
      </h3>
      {alreadyCheckedIn && (
        <p className="text-sm text-muted-foreground mb-3">Você já fez seu check-in de hoje.</p>
      )}

      <div className="flex gap-2 justify-between mb-3">
        {MOODS.map((m) => (
          <button
            key={m.level}
            onClick={() => handleSelect(m.level)}
            disabled={alreadyCheckedIn}
            className={`flex-1 flex flex-col items-center gap-1 py-3 rounded-lg border-2 transition-all
              ${selected === m.level ? `${m.color} scale-105 shadow-md` : "border-transparent hover:border-muted-foreground/30"}
              ${alreadyCheckedIn ? "opacity-70 cursor-default" : "cursor-pointer hover:scale-105"}
            `}
            aria-label={m.label}
          >
            <span className="text-2xl">{m.emoji}</span>
            <span className="text-[10px] text-muted-foreground">{m.label}</span>
          </button>
        ))}
      </div>

      {showNote && !saved && (
        <div className="space-y-2 mt-2">
          <Textarea
            placeholder="Quer adicionar uma nota sobre como está se sentindo? (opcional)"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            className="text-sm resize-none h-20"
          />
          <Button size="sm" onClick={handleSave} className="w-full">
            Salvar humor
          </Button>
        </div>
      )}

      {saved && selectedMood && (
        <p className="text-sm text-muted-foreground text-center mt-1">
          {selectedMood.emoji} {selectedMood.label} — registrado
        </p>
      )}
    </div>
  )
}
