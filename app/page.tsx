"use client"

import { useState, useEffect } from "react"
import { Header } from "@/components/header"
import { Sphere } from "@/components/sphere"
import { ChatInterface } from "@/components/chat-interface"
import { Footer } from "@/components/footer"
import { ThemeProvider } from "@/components/theme-provider"
import { Card, CardContent } from "@/components/ui/card"
import { UpgradePopup } from "@/components/upgrade-popup"
import type { User } from "firebase/auth"
import { initializeAnalytics } from "@/lib/firebase"
import ErrorBoundary from "@/components/error-boundary"
import { getFreeMessagesCount, updateFreeMessages } from "@/lib/firestore"
import { onAuthStateChanged } from "firebase/auth"
import { auth } from "@/lib/firebase"

type Language = "en-US" | "es-ES" | "fr-FR" | "pt-BR"

export default function Home() {
  const [isDarkMode, setIsDarkMode] = useState(false)
  const [isLoggedIn, setIsLoggedIn] = useState(false)
  const [user, setUser] = useState<User | null>(null)
  const [messageCount, setMessageCount] = useState(0)
  const [isUpgradePopupOpen, setIsUpgradePopupOpen] = useState(false)
  const [language, setLanguage] = useState<Language>(() => {
    if (typeof window !== "undefined") {
      return (localStorage.getItem("preferredLanguage") as Language) || "pt-BR"
    }
    return "pt-BR"
  })

  useEffect(() => {
    initializeAnalytics()
  }, [])

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser)
      setIsLoggedIn(!!currentUser)
    })

    return () => unsubscribe()
  }, [])

  useEffect(() => {
    const syncFreeMessagesCount = async () => {
      if (user) {
        const freeMessages = await getFreeMessagesCount(user.uid)
        setMessageCount(freeMessages)
      } else {
        const storedCount = localStorage.getItem("messageCount")
        if (storedCount) {
          setMessageCount(Number.parseInt(storedCount, 10))
        } else {
          setMessageCount(15) // Default free messages for non-logged in users
          localStorage.setItem("messageCount", "15")
        }
      }
    }

    syncFreeMessagesCount()
  }, [user])

  useEffect(() => {
    const storedLanguage = localStorage.getItem("preferredLanguage")
    if (storedLanguage) {
      setLanguage(storedLanguage as Language)
    } else {
      // Set default language to Brazilian Portuguese
      localStorage.setItem("preferredLanguage", "pt-BR")
    }
  }, [])

  const handleNewMessage = () => {
    if (messageCount <= 0) {
      if (isLoggedIn) {
        setIsUpgradePopupOpen(true)
      } else {
        // Open login popup
        // This should be handled in the Header component
      }
      return false
    }
    return true
  }

  const handleLogout = () => {
    setUser(null)
    setIsLoggedIn(false)
    setMessageCount(15) // Reset message count to 15 for logged-out users
    localStorage.setItem("messageCount", "15")
  }

  const handleUpgrade = () => {
    // Implement upgrade logic here
    console.log("User upgraded")
    setIsUpgradePopupOpen(false)
    setMessageCount(100) // Set a higher message count for upgraded users
    if (user) {
      updateFreeMessages(user.uid, 100)
    } else {
      localStorage.setItem("messageCount", "100")
    }
  }

  return (
    <ErrorBoundary>
      <ThemeProvider>
        <div className="min-h-screen flex flex-col bg-[#f5f5f0] dark:bg-[#2a2a25] text-[#4a4a40] dark:text-[#e0e0d0]">
          <ErrorBoundary>
            <Header isLoggedIn={isLoggedIn} user={user} onLogout={handleLogout} />
          </ErrorBoundary>
          <main className="flex-1 container mx-auto px-4 py-8 flex flex-col items-center justify-start">
            <div className="w-full max-w-4xl mx-auto flex flex-col items-center">
              <h2 className="text-center text-xl md:text-2xl font-semibold mb-8 text-[#4a4a40] dark:text-[#e0e0d0]">
                Você deve falar sobre suas emoções e preocupações...
                <br />
                em qualquer lugar, a qualquer hora, de forma privada, sem julgamentos.
              </h2>
              <ErrorBoundary>
                <div className="w-64 h-64 md:w-96 md:h-96 mb-4 md:mb-8">
                  <Sphere />
                </div>
              </ErrorBoundary>
              <ErrorBoundary>
                <div className="mt-4 md:mt-0 w-full">
                  <ChatInterface
                    isLoggedIn={isLoggedIn}
                    onNewMessage={handleNewMessage}
                    messageCount={messageCount}
                    setMessageCount={setMessageCount}
                    onLoginClick={() => {
                      /* This is now handled in the Header component */
                    }}
                    userId={user ? user.uid : null}
                    onUpgradeNeeded={() => setIsUpgradePopupOpen(true)}
                    language={language}
                    setLanguage={setLanguage}
                  />
                </div>
              </ErrorBoundary>

              <ErrorBoundary>
                <section className="w-full max-w-3xl mx-auto px-4 py-16">
                  <Card className="bg-gradient-to-br from-[#e6e6c8] to-[#d1e6d1] dark:from-[#3a3a30] dark:to-[#2a3a2a] overflow-hidden">
                    <CardContent className="p-8">
                      <h3 className="text-2xl md:text-3xl font-bold mb-6 text-center text-[#4a4a40] dark:text-[#e0e0d0]">
                        Missão Psaich.org
                      </h3>
                      <div className="space-y-6 text-[#4a4a40] dark:text-[#e0e0d0]">
                        <p className="leading-relaxed">
                          Reconhecemos a crescente prevalência de estresse e ansiedade em nosso mundo acelerado, com
                          redes sociais, crise climática e guerras. Estudos recentes revelam que{" "}
                          <span className="font-semibold text-[#6b8e23] dark:text-[#98bf64]">
                            46% dos jovens adultos relatam se sentir sobrecarregados pelo estresse e 35% mais deprimidos
                          </span>
                          , uma taxa significativamente maior que as gerações anteriores.
                        </p>
                        <p className="leading-relaxed">
                          Nossa missão é proporcionar um espaço seguro e livre de julgamentos para{" "}
                          <span className="font-semibold text-[#8fbc8f] dark:text-[#a0d6a0]">
                            sua jornada de autoconhecimento e bem-estar mental.
                          </span>{" "}
                          Através do poder da tecnologia de IA, reduzimos os níveis de estresse e promovemos o bem-estar
                          emocional através de uma conversa acolhedora.
                        </p>
                        <p className="leading-relaxed">
                          Seja navegando pelos desafios diários, buscando crescimento pessoal ou simplesmente precisando
                          de um ouvinte compassivo, estamos aqui para apoiar sua jornada de saúde mental com compreensão
                          e empatia.
                        </p>
                      </div>
                    </CardContent>
                  </Card>
                </section>
              </ErrorBoundary>
            </div>
          </main>
          <ErrorBoundary>
            <Footer />
          </ErrorBoundary>
          <ErrorBoundary>
            <UpgradePopup
              isOpen={isUpgradePopupOpen}
              onClose={() => setIsUpgradePopupOpen(false)}
              onUpgrade={handleUpgrade}
            />
          </ErrorBoundary>
        </div>
      </ThemeProvider>
    </ErrorBoundary>
  )
}
