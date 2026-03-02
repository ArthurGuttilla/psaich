"use client"

import { useState, useEffect } from "react"
import { Header } from "@/components/header"
import { Sphere } from "@/components/sphere"
import { ChatInterface } from "@/components/chat-interface"
import { Footer } from "@/components/footer"
import { ThemeProvider } from "@/components/theme-provider"
import { MoodTracker } from "@/components/mood-tracker"
import { BreathingExercise } from "@/components/breathing-exercise"
import { CrisisSupport } from "@/components/crisis-support"
import { UpgradePopup } from "@/components/upgrade-popup"
import { Card, CardContent } from "@/components/ui/card"
import type { User } from "firebase/auth"
import { initializeAnalytics } from "@/lib/firebase"
import ErrorBoundary from "@/components/error-boundary"
import { getFreeMessagesCount, updateFreeMessages } from "@/lib/firestore"
import { onAuthStateChanged } from "firebase/auth"
import { auth } from "@/lib/firebase"

type Language = "en-US" | "pt-BR"

export default function Home() {
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
    const sync = async () => {
      if (user) {
        const count = await getFreeMessagesCount(user.uid)
        setMessageCount(count)
      } else {
        const stored = localStorage.getItem("messageCount")
        if (stored) {
          setMessageCount(parseInt(stored, 10))
        } else {
          setMessageCount(15)
          localStorage.setItem("messageCount", "15")
        }
      }
    }
    sync()
  }, [user])

  useEffect(() => {
    const stored = localStorage.getItem("preferredLanguage")
    if (stored) {
      setLanguage(stored as Language)
    } else {
      localStorage.setItem("preferredLanguage", "pt-BR")
    }
  }, [])

  const handleNewMessage = () => {
    if (messageCount <= 0) {
      if (isLoggedIn) setIsUpgradePopupOpen(true)
      return false
    }
    return true
  }

  const handleLogout = () => {
    setUser(null)
    setIsLoggedIn(false)
    setMessageCount(15)
    localStorage.setItem("messageCount", "15")
  }

  const handleUpgrade = () => {
    setIsUpgradePopupOpen(false)
    setMessageCount(100)
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

          <main className="flex-1 container mx-auto px-4 py-8 flex flex-col items-center">
            <div className="w-full max-w-4xl mx-auto flex flex-col items-center gap-8">

              {/* Hero */}
              <div className="text-center space-y-2">
                <h2 className="text-xl md:text-2xl font-semibold text-[#4a4a40] dark:text-[#e0e0d0]">
                  Um espaço seguro para suas emoções
                </h2>
                <p className="text-sm text-muted-foreground max-w-md mx-auto">
                  Converse livremente, sem julgamentos, a qualquer hora e de qualquer lugar.
                </p>
              </div>

              {/* Sphere */}
              <ErrorBoundary>
                <div className="w-48 h-48 md:w-64 md:h-64">
                  <Sphere />
                </div>
              </ErrorBoundary>

              {/* Mood tracker — only for logged-in users */}
              {isLoggedIn && user && (
                <ErrorBoundary>
                  <div className="w-full max-w-2xl">
                    <MoodTracker userId={user.uid} />
                  </div>
                </ErrorBoundary>
              )}

              {/* Chat */}
              <ErrorBoundary>
                <div className="w-full">
                  <ChatInterface
                    isLoggedIn={isLoggedIn}
                    onNewMessage={handleNewMessage}
                    messageCount={messageCount}
                    setMessageCount={setMessageCount}
                    onLoginClick={() => {}}
                    userId={user ? user.uid : null}
                    onUpgradeNeeded={() => setIsUpgradePopupOpen(true)}
                    language={language}
                    setLanguage={setLanguage}
                  />
                </div>
              </ErrorBoundary>

              {/* Wellness tools row */}
              <div className="w-full max-w-2xl grid grid-cols-1 md:grid-cols-2 gap-4">
                <ErrorBoundary>
                  <BreathingExercise />
                </ErrorBoundary>
                <ErrorBoundary>
                  <CrisisSupport />
                </ErrorBoundary>
              </div>

              {/* Mission */}
              <ErrorBoundary>
                <section className="w-full max-w-3xl">
                  <Card className="bg-gradient-to-br from-[#e6e6c8] to-[#d1e6d1] dark:from-[#3a3a30] dark:to-[#2a3a2a]">
                    <CardContent className="p-8">
                      <h3 className="text-2xl md:text-3xl font-bold mb-6 text-center text-[#4a4a40] dark:text-[#e0e0d0]">
                        Missão Psaich.org
                      </h3>
                      <div className="space-y-4 text-[#4a4a40] dark:text-[#e0e0d0]">
                        <p className="leading-relaxed">
                          Reconhecemos a crescente prevalência de estresse e ansiedade em nosso mundo. Estudos recentes
                          revelam que{" "}
                          <span className="font-semibold text-[#6b8e23] dark:text-[#98bf64]">
                            46% dos jovens adultos se sentem sobrecarregados pelo estresse e 35% relatam sintomas
                            depressivos
                          </span>
                          — uma taxa significativamente maior que gerações anteriores.
                        </p>
                        <p className="leading-relaxed">
                          Nossa missão é proporcionar um espaço seguro e livre de julgamentos para{" "}
                          <span className="font-semibold text-[#8fbc8f] dark:text-[#a0d6a0]">
                            sua jornada de autoconhecimento e bem-estar mental.
                          </span>{" "}
                          Através de IA empática, reduzimos o estresse e promovemos o bem-estar emocional com uma
                          conversa acolhedora.
                        </p>
                        <p className="leading-relaxed">
                          Seja navegando pelos desafios do dia a dia ou buscando crescimento pessoal, estamos aqui para
                          apoiar sua saúde mental com compreensão e empatia — gratuitamente, de forma privada e
                          acessível.
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
