"use client"

import { Button } from "@/components/ui/button"
import { MessageSquare, Moon, Sun, LogOut, Settings } from "lucide-react"
import type { User } from "firebase/auth"
import Image from "next/image"
import { auth } from "@/lib/firebase"
import { signOut } from "firebase/auth"
import { useRouter } from "next/navigation"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { useTheme } from "@/components/theme-provider"
import { useState } from "react"
import { LoginPopup } from "@/components/login-popup"

interface HeaderProps {
  isLoggedIn: boolean
  user: User | null
  onLogout: () => void
  showHeader?: boolean
}

export function Header({ isLoggedIn, user, onLogout, showHeader = true }: HeaderProps) {
  const router = useRouter()
  const { theme, setTheme } = useTheme()
  const [isLoginPopupOpen, setIsLoginPopupOpen] = useState(false)

  const handleLogout = async () => {
    try {
      await signOut(auth)
      onLogout()
    } catch (error) {
      console.error("Error signing out:", error)
    }
  }

  const handleHistoryClick = () => {
    router.push("/history")
  }

  const toggleTheme = () => {
    setTheme(theme === "dark" ? "light" : "dark")
  }

  const handleSettingsClick = () => {
    router.push("/settings")
  }

  const handleLogin = (user: User) => {
    // Handle successful login
    setIsLoginPopupOpen(false)
    // You might want to update the parent component's state or trigger a re-fetch of user data
  }

  if (!showHeader) return null

  return (
    <header className="w-full py-4 px-6 border-b">
      <div className="container mx-auto flex items-center justify-between">
        <div className="text-2xl font-bold bg-gradient-to-r from-[#6b8e23] to-[#8fbc8f] dark:from-[#98bf64] dark:to-[#a0d6a0] bg-clip-text text-transparent">
          Psaich.org
        </div>
        <div className="flex items-center gap-4">
          {isLoggedIn && user ? (
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="sm"
                className="flex items-center gap-2 bg-[#f0e8d9] dark:bg-[#4a4a40] text-[#4a4a40] dark:text-[#f0e8d9] hover:bg-[#e6dcc7] dark:hover:bg-[#5a5a50]"
                onClick={handleHistoryClick}
              >
                <MessageSquare className="h-4 w-4" />
                Histórico
              </Button>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <div className="flex items-center gap-2 cursor-pointer">
                    <Image
                      src={user.photoURL || "/default-avatar.png"}
                      alt="Avatar do usuário"
                      width={32}
                      height={32}
                      className="rounded-full"
                    />
                    <span className="text-sm font-medium">{user.displayName}</span>
                  </div>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={toggleTheme}>
                    {theme === "dark" ? <Sun className="h-4 w-4 mr-2" /> : <Moon className="h-4 w-4 mr-2" />}
                    {theme === "dark" ? "Modo claro" : "Modo escuro"}
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={handleSettingsClick}>
                    <Settings className="h-4 w-4 mr-2" />
                    Configurações
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={handleLogout} className="text-red-600 dark:text-red-400">
                    <LogOut className="h-4 w-4 mr-2" />
                    Sair
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          ) : (
            <>
              <Button
                variant="ghost"
                size="icon"
                onClick={toggleTheme}
                aria-label="Alternar tema"
                className="hover:bg-primary/90 dark:hover:bg-primary/20"
              >
                {theme === "dark" ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
              </Button>
              <Button variant="default" onClick={() => setIsLoginPopupOpen(true)}>
                Entrar
              </Button>
            </>
          )}
        </div>
      </div>
      <LoginPopup isOpen={isLoginPopupOpen} onClose={() => setIsLoginPopupOpen(false)} onLogin={handleLogin} />
    </header>
  )
}
