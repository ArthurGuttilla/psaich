"use client"

import { useEffect, useState } from "react"
import { auth } from "@/lib/firebase"
import { getStreak } from "@/lib/firestore"

export function StreakCountdown() {
  const [streak, setStreak] = useState(0)

  useEffect(() => {
    const fetchStreak = async () => {
      if (auth.currentUser) {
        const userStreak = await getStreak(auth.currentUser.uid)
        setStreak(userStreak)
      }
    }

    fetchStreak()
  }, [])

  const getStreakMessage = (days: number) => {
    if (days >= 75) return "Você está no caminho para a paz interior ☮️"
    if (days >= 61) return `Você está cuidando de si mesmo por ${days} dias 🫂`
    if (days >= 46) return `Você está cuidando de si mesmo por ${days} dias 🧘🏼‍♀️`
    if (days >= 31) return `Você está cuidando de si mesmo por ${days} dias 🧿`
    if (days >= 15) return `Você está cuidando de si mesmo por ${days} dias 🍵`
    if (days >= 7) return `Você está cuidando de si mesmo por ${days} dias 🪴`
    return `Você está cuidando de si mesmo por ${days} dias`
  }

  return (
    <div className="bg-primary/10 p-4 rounded-lg mb-6">
      <h2 className="text-xl font-semibold mb-2">Sua Sequência</h2>
      <p className="text-lg">{getStreakMessage(streak)}</p>
    </div>
  )
}
