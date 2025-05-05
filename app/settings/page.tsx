"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { auth } from "@/lib/firebase"
import { getUserData } from "@/lib/firestore"
import { Header } from "@/components/header"
import { SubscriptionOptions } from "@/components/subscription-options"
import { UserInformationSettings } from "@/components/user-information-settings"
import { ThemeProvider, useTheme } from "@/components/theme-provider"
import { StreakCountdown } from "@/components/streak-countdown"
import { LoadingDots } from "@/components/loading-dots"

export default function SettingsPage() {
  const router = useRouter()
  const [user, setUser] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const { theme, setTheme } = useTheme()

  useEffect(() => {
    // Move auth check to useEffect to ensure it only runs on client
    const unsubscribe = auth.onAuthStateChanged(async (currentUser) => {
      setLoading(true)
      if (currentUser) {
        setUser(currentUser)
        try {
          await getUserData(currentUser.uid)
        } catch (error) {
          console.error("Error fetching user data:", error)
        }
      } else {
        router.push("/")
      }
      setLoading(false)
    })

    return () => unsubscribe()
  }, [router])

  const handleLogout = async () => {
    try {
      await auth.signOut()
      router.push("/")
    } catch (error) {
      console.error("Error signing out:", error)
    }
  }

  // Show loading state while checking auth
  if (loading) {
    return (
      <ThemeProvider>
        <div className="min-h-screen bg-background flex items-center justify-center">
          <LoadingDots />
        </div>
      </ThemeProvider>
    )
  }

  // If no user, don't render anything (redirect will happen)
  if (!user) {
    return null
  }

  return (
    <ThemeProvider>
      <div className="min-h-screen bg-background">
        <Header isLoggedIn={!!user} user={user} onLogout={handleLogout} />
        <main className="container mx-auto px-4 py-8">
          <StreakCountdown />
          <h1 className="text-4xl font-bold mb-8 bg-gradient-to-r from-[#6b8e23] to-[#8fbc8f] dark:from-[#98bf64] dark:to-[#a0d6a0] bg-clip-text text-transparent">
            Configurações
          </h1>
          <SubscriptionOptions />
          <UserInformationSettings user={user} />
        </main>
      </div>
    </ThemeProvider>
  )
}
