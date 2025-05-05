"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { onAuthStateChanged } from "firebase/auth"
import { auth } from "@/lib/firebase"
import { HistorySidebar } from "@/components/history-sidebar"
import { ChatHistory } from "@/components/chat-history"
import { SidebarProvider } from "@/components/ui/sidebar"
import { Header } from "@/components/header"
import { ThemeProvider, useTheme } from "@/components/theme-provider"
import { format } from "date-fns"

export default function HistoryPage() {
  const router = useRouter()
  const [selectedDate, setSelectedDate] = useState<string>(format(new Date(), "yyyy-MM-dd"))
  const [user, setUser] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const { theme, setTheme } = useTheme()
  const [isExpanded, setIsExpanded] = useState(true)

  useEffect(() => {
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
      await auth.signOut()
      router.push("/")
    } catch (error) {
      console.error("Error signing out:", error)
    }
  }

  const toggleSidebar = () => setIsExpanded((prev) => !prev)

  if (loading) {
    return <div>Loading...</div>
  }

  return (
    <ThemeProvider>
      <SidebarProvider>
        <div className="flex h-screen w-full bg-background">
          <Header
            isDarkMode={theme === "dark"}
            onThemeToggle={() => setTheme(theme === "dark" ? "light" : "dark")}
            isLoggedIn={!!user}
            onLoginToggle={() => {}}
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
    </ThemeProvider>
  )
}
