"use client"

import type React from "react"

import { useState, useEffect, useRef } from "react"
import { Mic, Square, AudioWaveformIcon as Waveform, Play, Pause } from "lucide-react"
import { Button } from "@/components/ui/button"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { chat } from "@/app/actions"
import { LoadingDots } from "@/components/loading-dots"
import { saveChatMessage, updateFreeMessages, getFreeMessagesCount } from "@/lib/firestore"
import { speak, stopSpeaking } from "@/utils/textToSpeech"

declare global {
  interface Window {
    webkitSpeechRecognition: any
  }
}

interface Message {
  id: string
  content: string
  sender: "user" | "ai"
}

interface ChatInterfaceProps {
  isLoggedIn: boolean
  onNewMessage: () => boolean
  messageCount: number
  setMessageCount: (count: number) => void
  onLoginClick: () => void
  userId: string | null
  onUpgradeNeeded: () => void
  language: string
  setLanguage: (language: any) => void
}

type Language = "pt-BR" | "en-US"

const languageOptions: Record<Language, { flag: string; label: string }> = {
  "pt-BR": { flag: "🇧🇷", label: "PT-BR" },
  "en-US": { flag: "🇺🇸", label: "EN-US" },
}

export function ChatInterface({
  isLoggedIn,
  onNewMessage,
  messageCount,
  setMessageCount,
  onLoginClick,
  userId,
  onUpgradeNeeded,
  language,
  setLanguage,
}: ChatInterfaceProps) {
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [isChatFrozen, setIsChatFrozen] = useState(false)
  const [isRecording, setIsRecording] = useState(false)
  const [recognition, setRecognition] = useState<any>(null)
  const [isSilent, setIsSilent] = useState(false)
  const [isVoiceDetected, setIsVoiceDetected] = useState(false)
  const [isAiResponding, setIsAiResponding] = useState(false)
  const [playingMessageId, setPlayingMessageId] = useState<string | null>(null)
  const silenceTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const lastTranscriptRef = useRef("")
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (messageCount <= 0) {
      setIsChatFrozen(true)
    } else {
      setIsChatFrozen(false)
    }
  }, [messageCount])

  const handleSpeechResult = (event: any) => {
    console.log("Speech recognition result received:", event.results)
    const results = event.results
    let finalTranscript = ""
    let interimTranscript = ""

    for (let i = event.resultIndex; i < results.length; ++i) {
      const transcript = results[i][0].transcript
      if (results[i].isFinal) {
        finalTranscript += transcript
      } else {
        interimTranscript += transcript
      }
    }

    console.log("Final transcript:", finalTranscript)
    console.log("Interim transcript:", interimTranscript)

    if (finalTranscript) {
      setInput((prevInput) => {
        // Remove any repeated words at the beginning
        const words = finalTranscript.split(" ")
        const uniqueWords = words.filter(
          (word, index, self) => index === self.findIndex((t) => t.toLowerCase() === word.toLowerCase()),
        )
        const cleanedTranscript = uniqueWords.join(" ")

        const updatedInput = (prevInput + " " + cleanedTranscript).trim()
        console.log("Updated input:", updatedInput)
        return updatedInput
      })
      scrollInputToEnd()
    }
  }

  const handleSpeechEnd = () => {
    if (recognition) {
      recognition.stop()
      setIsRecording(false)
      setRecognition(null)
    }
  }

  const startRecording = () => {
    console.log("Starting recording. Language:", language)
    if ("webkitSpeechRecognition" in window) {
      console.log("webkitSpeechRecognition is available")
      const recognition = new (window as any).webkitSpeechRecognition()
      recognition.continuous = true
      recognition.interimResults = true
      recognition.lang = language
      console.log("Speech recognition initialized with language:", recognition.lang)

      recognition.onresult = handleSpeechResult
      recognition.onend = handleSpeechEnd

      recognition.onaudiostart = () => {
        console.log("Audio recording started")
        setIsSilent(false)
        resetSilenceTimeout()
      }

      recognition.onaudioend = () => {
        console.log("Audio recording ended")
        setIsSilent(true)
        setIsVoiceDetected(false)
        resetSilenceTimeout()
      }

      recognition.onsoundstart = () => {
        console.log("Sound detected")
        setIsSilent(false)
        setIsVoiceDetected(true)
        resetSilenceTimeout()
      }

      recognition.onsoundend = () => {
        console.log("Sound ended")
        setIsSilent(true)
        setIsVoiceDetected(false)
        resetSilenceTimeout()
      }

      recognition.onerror = (event: any) => {
        console.error("Speech recognition error:", event.error)
        console.log("Error details:", event)
      }

      recognition.onstart = () => {
        console.log("Speech recognition started")
      }

      try {
        recognition.start()
        setRecognition(recognition)
        setIsRecording(true)
        console.log("Recording started")
      } catch (error) {
        console.error("Error starting speech recognition:", error)
      }
    } else {
      console.error("webkitSpeechRecognition is not available in this browser")
    }
  }

  const handleSpeechError = (event: any) => {
    console.error("Speech recognition error:", event.error)
    console.log("Error details:", event)

    // Provide user feedback
    setInput((prevInput) => prevInput + " [Erro no reconhecimento de voz. Por favor, tente novamente.]")

    // Attempt to restart recognition after a brief delay
    setTimeout(() => {
      if (isRecording) {
        stopRecording()
        startRecording()
      }
    }, 1000)
  }

  const resetSilenceTimeout = () => {
    if (silenceTimeoutRef.current) {
      clearTimeout(silenceTimeoutRef.current)
    }
    silenceTimeoutRef.current = setTimeout(() => {
      if (isSilent && recognition) {
        recognition.stop()
      }
    }, 2000)
  }

  const stopRecording = () => {
    if (recognition) {
      recognition.stop()
      setRecognition(null)
      setIsRecording(false)
    }
    if (silenceTimeoutRef.current) {
      clearTimeout(silenceTimeoutRef.current)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!input.trim() || isLoading || isChatFrozen) return

    const canSend = onNewMessage()
    if (!canSend) return

    const newCount = messageCount - 1
    setMessageCount(newCount)

    if (userId) {
      try {
        await updateFreeMessages(userId, newCount)
      } catch (error) {
        console.error("Error updating free messages count:", error)
      }
    } else {
      localStorage.setItem("messageCount", newCount.toString())
    }

    if (newCount <= 0) {
      onUpgradeNeeded()
      return
    }

    const userMessage: Message = {
      id: Date.now().toString(),
      content: input,
      sender: "user",
    }

    setMessages((prev) => [...prev, userMessage])
    setInput("")
    setIsLoading(true)
    setIsAiResponding(true)

    try {
      const response = await chat(input)
      if (response.success) {
        const aiMessage: Message = {
          id: (Date.now() + 1).toString(),
          content: response.message,
          sender: "ai",
        }
        setMessages((prev) => [...prev, aiMessage])

        if (userId) {
          await saveChatMessage(userId, {
            userMessage: input,
            aiResponse: response.message,
            timestamp: new Date(),
          })
        }
      } else {
        throw new Error(response.message)
      }
    } catch (error) {
      console.error("Error in chat:", error)
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        content: "Desculpe, estou tendo problemas para processar sua mensagem no momento. Podemos tentar novamente?",
        sender: "ai",
      }
      setMessages((prev) => [...prev, errorMessage])
    } finally {
      setIsLoading(false)
      setIsAiResponding(false)
    }
  }

  useEffect(() => {
    const syncFreeMessagesCount = async () => {
      if (userId) {
        const freeMessages = await getFreeMessagesCount(userId)
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
  }, [userId, setMessageCount])

  useEffect(() => {
    return () => {
      if (silenceTimeoutRef.current) {
        clearTimeout(silenceTimeoutRef.current)
      }
    }
  }, [])

  useEffect(() => {
    scrollInputToEnd()
  }, [input])

  const scrollInputToEnd = () => {
    if (inputRef.current) {
      inputRef.current.scrollLeft = inputRef.current.scrollWidth
    }
  }

  const handlePlayPause = (messageId: string, content: string) => {
    if (playingMessageId === messageId) {
      stopSpeaking()
      setPlayingMessageId(null)
    } else {
      if (playingMessageId) {
        stopSpeaking()
      }
      speak(content, language)
      setPlayingMessageId(messageId)
    }
  }

  useEffect(() => {
    const handleSpeechEnd = () => {
      setPlayingMessageId(null)
    }

    speechSynthesis.addEventListener("end", handleSpeechEnd)

    return () => {
      speechSynthesis.removeEventListener("end", handleSpeechEnd)
    }
  }, [])

  useEffect(() => {
    console.log("Language changed. New language:", language)
    localStorage.setItem("preferredLanguage", language)

    // Restart recording if it's currently active
    if (isRecording) {
      stopRecording()
      startRecording()
    }
  }, [language])

  return (
    <div className="w-full max-w-2xl mx-auto flex flex-col gap-4 mt-4">
      <h4 className="text-lg font-semibold mb-2 bg-gradient-to-r from-[#6b8e23] to-[#8fbc8f] dark:from-[#98bf64] dark:to-[#a0d6a0] bg-clip-text text-transparent">
        Como você está se sentindo hoje?
      </h4>
      <form onSubmit={handleSubmit} className="flex gap-2 sticky top-4">
        <div className="relative flex-1 flex items-center">
          <div className="absolute left-0 top-0 bottom-0 flex items-center">
            <div className="flex items-center bg-background border border-input rounded-l-md h-10 px-3">
              <span className="text-sm font-medium">{languageOptions[language as Language]?.label || "PT-BR"}</span>
            </div>
            <Select
              value={language}
              onValueChange={(value: Language) => {
                console.log("Language changed to:", value)
                setLanguage(value)
                localStorage.setItem("preferredLanguage", value)
              }}
            >
              <SelectTrigger className="w-[40px] h-10 rounded-none border-l-0 border-r-0">
                <SelectValue>
                  {({ value }) => (
                    <span className="flex items-center justify-center">
                      {languageOptions[value as Language]?.flag || "🇧🇷"}
                    </span>
                  )}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                {Object.entries(languageOptions).map(([value, { flag, label }]) => (
                  <SelectItem key={value} value={value}>
                    <span className="flex items-center">
                      <span className="mr-2">{flag}</span>
                      <span>{label}</span>
                    </span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className={`relative rounded-full w-8 h-8 flex items-center justify-center ${
                isRecording
                  ? "bg-red-100 hover:bg-red-200 dark:bg-red-900/20 dark:hover:bg-red-900/30"
                  : "bg-primary/10 hover:bg-primary/20 dark:bg-primary/20 dark:hover:bg-primary/30"
              }`}
              disabled={isLoading || isChatFrozen}
              onClick={isRecording ? stopRecording : startRecording}
            >
              {isRecording ? (
                isVoiceDetected ? (
                  <Waveform className="h-4 w-4 text-red-500" />
                ) : (
                  <Square className="h-4 w-4 text-red-500" />
                )
              ) : (
                <Mic className="h-4 w-4" />
              )}
              {isRecording && isVoiceDetected && (
                <span className="absolute -top-1 -right-1 flex h-3 w-3">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-3 w-3 bg-red-500"></span>
                </span>
              )}
              <span className="sr-only">{isRecording ? "Parar gravação" : "Usar entrada de voz"}</span>
            </Button>
          </div>
          <input
            ref={inputRef}
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Compartilhe seus pensamentos ou preocupações."
            className={`w-full pl-[160px] pr-3 py-2 text-sm leading-5 rounded-md border border-input bg-background h-10 cursor-blink ${isChatFrozen ? "opacity-50" : ""}`}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault()
                handleSubmit(e)
              }
            }}
            disabled={isLoading || isChatFrozen}
          />
        </div>
        {isChatFrozen ? (
          isLoggedIn ? (
            <Button type="button" className="h-10" onClick={onUpgradeNeeded}>
              Atualizar
            </Button>
          ) : (
            <Button type="button" className="h-10" onClick={onLoginClick}>
              Entrar
            </Button>
          )
        ) : (
          <Button type="submit" className="h-10" disabled={isLoading}>
            {isLoading ? "Enviando..." : "Enviar"}
          </Button>
        )}
      </form>

      <p className="text-sm text-muted-foreground text-center">
        {isLoggedIn
          ? messageCount > 0
            ? `${messageCount} mensagens restantes`
            : "Você atingiu o limite de mensagens. Por favor, atualize para continuar."
          : messageCount > 0
            ? `${messageCount} mensagens gratuitas restantes`
            : "Você atingiu o limite de mensagens gratuitas. Por favor, faça login para continuar."}
      </p>

      <div className={`relative ${isChatFrozen ? "pointer-events-none" : ""}`}>
        {isChatFrozen && <div className="absolute inset-0 bg-background/50 backdrop-blur-sm z-10"></div>}
        {messages.length > 0 && (
          <ScrollArea
            className={`p-4 rounded-lg border bg-background ${
              messages.length > 3
                ? `min-h-[300px] h-[${Math.min(800, 300 + (messages.length - 3) * 100)}px]`
                : "h-[300px]"
            }`}
          >
            {messages.map((message) => (
              <div
                key={message.id}
                className={`mb-4 p-3 rounded-lg ${
                  message.sender === "user"
                    ? "bg-[#d2b48c] text-[#4a3c31] dark:bg-[#d2b48c]/70 dark:text-[#f5f5f5]"
                    : "bg-[#8fbc8f] text-[#2f4f4f] dark:bg-[#8fbc8f]/70 dark:text-[#ffffff]"
                } max-w-[80%] ${message.sender === "user" ? "ml-auto" : "mr-auto"} relative`}
              >
                {message.content}
                {message.sender === "ai" && (
                  <Button
                    variant="outline"
                    size="icon"
                    className="absolute bottom-1 right-1 rounded-full w-8 h-8 bg-white dark:bg-gray-800 border-2 border-[#2f4f4f] dark:border-[#ffffff] hover:bg-[#2f4f4f] hover:text-white dark:hover:bg-[#ffffff] dark:hover:text-gray-800 transition-colors"
                    onClick={() => handlePlayPause(message.id, message.content)}
                  >
                    {playingMessageId === message.id ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
                  </Button>
                )}
              </div>
            ))}
            {isAiResponding && (
              <div className="mb-4 p-3 rounded-lg bg-[#8fbc8f] text-[#2f4f4f] dark:bg-[#8fbc8f]/70 dark:text-[#ffffff] max-w-[80%] mr-auto">
                <LoadingDots />
              </div>
            )}
          </ScrollArea>
        )}
      </div>
    </div>
  )
}
