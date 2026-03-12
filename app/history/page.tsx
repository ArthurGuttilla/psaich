"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { onAuthStateChanged } from "firebase/auth"
import { auth } from "@/lib/firebase"
import { HistorySidebar } from "@/components/history-sidebar"
import { ChatHistory } from "@/components/chat-history"
import { SidebarProvider } from "@/components/ui/sidebar"
import { Header } from "@/components/header"
import { ThemeProvider } from "@/components/theme-provider"
import { LoadingDots } from "@/components/loading-dots"
import { format } from "date-fns"

function HistoryPageContent() {
  const router = useRouter()
  const [selectedDate, setSelectedDate] = useState<string>(format(new Date(), "yyyy-MM-dd"))
  const [user, setUser] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [isExpanded, setIsExpanded] = useState(true)

  useEffect(() => {
    if (!auth) return
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser)
      setLoading(false)
      if (!currentUser) {
        router.push("/")
      }
    })

    return () => unsubscribe()
  }, [router])

  const handleLogout = async () => {
    try {
      if (auth) await auth.signOut()
      router.push("/")
    } catch (error) {
      console.error("Error signing out:", error)
    }
  }

  const toggleSidebar = () => setIsExpanded((prev) => !prev)

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <LoadingDots />
      </div>
    )
  }

  return (
    <SidebarProvider>
      <div className="flex h-screen w-full bg-background">
        <Header
          isLoggedIn={!!user}
          user={user}
          onLogout={handleLogout}
          showHeader={false}
        />
        <HistorySidebar
          onDateSelect={setSelectedDate}
          selectedDate={selectedDate}
          isExpanded={isExpanded}
          toggleSidebar={toggleSidebar}
        />
        <main className="flex-1 overflow-hidden">
          <ChatHistory selectedDate={selectedDate} toggleSidebar={toggleSidebar} isExpanded={isExpanded} />
        </main>
      </div>
    </SidebarProvider>
  )
}

export default function HistoryPage() {
  return (
    <ThemeProvider>
      <HistoryPageContent />
    </ThemeProvider>
  )
}
