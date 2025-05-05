"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import Image from "next/image"
import { format, isToday, parseISO } from "date-fns"
import { Book, Calendar, LogOut, Moon, Search, Sun } from "lucide-react"
import { auth, db } from "@/lib/firebase"
import { collection, query, getDocs, orderBy } from "firebase/firestore"
import { signOut } from "firebase/auth"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Sidebar, SidebarHeader, SidebarContent, SidebarFooter } from "@/components/ui/sidebar"
import { useTheme } from "@/components/theme-provider"

interface HistorySidebarProps {
  onDateSelect: (date: string) => void
  selectedDate: string
  isExpanded: boolean
  toggleSidebar: () => void
}

export function HistorySidebar({ onDateSelect, selectedDate, isExpanded, toggleSidebar }: HistorySidebarProps) {
  const router = useRouter()
  const { theme, setTheme } = useTheme()
  const [searchQuery, setSearchQuery] = useState("")
  const [chatDates, setChatDates] = useState<string[]>([])
  const [filteredDates, setFilteredDates] = useState<string[]>([])
  const [user, setUser] = useState(auth.currentUser)
  //const [isExpanded, setIsExpanded] = useState(true) //Removed

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged((user) => {
      setUser(user)
      if (!user) {
        router.push("/")
      }
    })

    return () => unsubscribe()
  }, [router])

  useEffect(() => {
    const fetchChatDates = async () => {
      if (!user) return

      const chatsRef = collection(db, "users", user.uid, "chat")
      const q = query(chatsRef, orderBy("timestamp", "desc"))
      const querySnapshot = await getDocs(q)

      const datesSet = new Set<string>()
      querySnapshot.forEach((doc) => {
        const timestamp = doc.data().timestamp?.toDate()
        if (timestamp && !isToday(timestamp)) {
          datesSet.add(format(timestamp, "yyyy-MM-dd"))
        }
      })

      const sortedDates = Array.from(datesSet).sort((a, b) => b.localeCompare(a))
      setChatDates(sortedDates)
      setFilteredDates(sortedDates)
    }

    fetchChatDates()
  }, [user])

  useEffect(() => {
    const filtered = chatDates.filter((date) =>
      format(parseISO(date), "MMMM d, yyyy").toLowerCase().includes(searchQuery.toLowerCase()),
    )
    setFilteredDates(filtered)
  }, [searchQuery, chatDates])

  const handleLogout = async () => {
    try {
      await signOut(auth)
      router.push("/")
    } catch (error) {
      console.error("Error signing out:", error)
    }
  }

  const handleTodayClick = () => {
    const today = format(new Date(), "yyyy-MM-dd")
    onDateSelect(today)
  }

  const isSelectedToday = isToday(parseISO(selectedDate))

  //const toggleSidebar = () => setIsExpanded(!isExpanded) //Removed

  return (
    <Sidebar className={`transition-all duration-300 ${isExpanded ? "w-64" : "w-20"}`}>
      <SidebarHeader className={`p-4 pt-6 flex flex-col gap-4 ${isExpanded ? "" : "items-center"}`}>
        {isExpanded && (
          <div className="text-2xl font-bold bg-gradient-to-r from-[#6b8e23] to-[#8fbc8f] dark:from-[#98bf64] dark:to-[#a0d6a0] bg-clip-text text-transparent">
            Psaich.org
          </div>
        )}
        <div
          className={`flex items-center gap-2 ${isExpanded ? "" : "flex-col"} cursor-pointer`}
          onClick={() => router.push("/settings")}
        >
          <Image
            src={user?.photoURL || "/default-avatar.png"}
            alt="User avatar"
            width={40}
            height={40}
            className="rounded-full"
          />
          {isExpanded && <span className="text-sm font-medium">{user?.displayName}</span>}
        </div>
        <Button
          variant={isSelectedToday ? "default" : "secondary"}
          className={`w-full ${isExpanded ? "" : "px-2"}`}
          onClick={handleTodayClick}
        >
          <Calendar className={`h-5 w-5 ${isExpanded ? "mr-2" : ""}`} />
          {isExpanded && <span>Today's chat</span>}
        </Button>
        {isExpanded && (
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search conversations..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>
        )}
      </SidebarHeader>

      <SidebarContent className={`${isExpanded ? "px-4" : "px-2"}`}>
        <div className="space-y-2">
          {filteredDates.map((date) => (
            <Button
              key={date}
              variant={date === selectedDate ? "default" : "ghost"}
              className={`w-full ${isExpanded ? "justify-start" : "justify-center px-2"}`}
              onClick={() => onDateSelect(date)}
            >
              {isExpanded ? (
                format(parseISO(date), "MMMM d, yyyy")
              ) : (
                <span className="text-lg">{format(parseISO(date), "d")}</span>
              )}
            </Button>
          ))}
        </div>
      </SidebarContent>

      {isExpanded && (
        <SidebarFooter className="p-4 space-y-2">
          <div className="flex items-center justify-between px-2">
            <Button variant="ghost" size="icon" className="h-9 w-9">
              <Book className="h-5 w-5" />
            </Button>

            <Button
              variant="ghost"
              size="icon"
              onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
              className="h-9 w-9"
            >
              {theme === "dark" ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
            </Button>
            <Button
              variant="logout"
              size="icon"
              onClick={handleLogout}
              className="h-9 w-9 bg-red-100 text-red-600 hover:bg-red-200 dark:bg-red-900/20 dark:text-red-400 dark:hover:bg-red-900/30"
            >
              <LogOut className="h-5 w-5" />
            </Button>
          </div>
        </SidebarFooter>
      )}
    </Sidebar>
  )
}
