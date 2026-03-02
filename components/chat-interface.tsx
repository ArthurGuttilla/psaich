"use client"

import type React from "react"
import { useState, useEffect, useRef } from "react"
import { Mic, Square, AudioWaveformIcon as Waveform, Play, Pause, Send } from "lucide-react"
import { Button } from "@/components/ui/button"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { chat, type ConversationMessage } from "@/app/actions"
import { LoadingDots } from "@/components/loading-dots"
import { saveChatMessage, updateFreeMessages, getFreeMessagesCount } from "@/lib/firestore"
import { speak, stopSpeaking } from "@/utils/textToSpeech"
import { format } from "date-fns"

declare global {
  interface Window {
    webkitSpeechRecognition: any
  }
}

interface Message {
  id: string
  content: string
  sender: "user" | "ai"
  timestamp: Date
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

const STARTER_PROMPTS = [
  "Estou me sentindo ansioso(a) hoje...",
  "Quero falar sobre algo que me preocupa",
  "Preciso de apoio para lidar com o estresse",
  "Estou passando por um momento difícil",
]

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
  const [isVoiceDetected, setIsVoiceDetected] = useState(false)
  const [isAiResponding, setIsAiResponding] = useState(false)
  const [playingMessageId, setPlayingMessageId] = useState<string | null>(null)
  const silenceTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    setIsChatFrozen(messageCount <= 0)
  }, [messageCount])

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [messages, isAiResponding])

  // Build conversation history for AI context
  const buildHistory = (): ConversationMessage[] =>
    messages.map((m) => ({
      role: m.sender === "user" ? "user" : "assistant",
      content: m.content,
    }))

  const handleSpeechResult = (event: any) => {
    const results = event.results
    let finalTranscript = ""

    for (let i = event.resultIndex; i < results.length; ++i) {
      if (results[i].isFinal) {
        finalTranscript += results[i][0].transcript
      }
    }

    if (finalTranscript) {
      setInput((prev) => (prev + " " + finalTranscript).trim())
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
    if (!("webkitSpeechRecognition" in window)) return
    const rec = new (window as any).webkitSpeechRecognition()
    rec.continuous = true
    rec.interimResults = true
    rec.lang = language

    rec.onresult = handleSpeechResult
    rec.onend = handleSpeechEnd

    rec.onsoundstart = () => {
      setIsVoiceDetected(true)
      resetSilenceTimeout()
    }
    rec.onsoundend = () => {
      setIsVoiceDetected(false)
      resetSilenceTimeout()
    }
    rec.onerror = () => {
      setIsRecording(false)
      setRecognition(null)
    }

    try {
      rec.start()
      setRecognition(rec)
      setIsRecording(true)
    } catch {
      // recognition already started
    }
  }

  const resetSilenceTimeout = () => {
    if (silenceTimeoutRef.current) clearTimeout(silenceTimeoutRef.current)
    silenceTimeoutRef.current = setTimeout(() => {
      if (recognition) recognition.stop()
    }, 2000)
  }

  const stopRecording = () => {
    if (recognition) {
      recognition.stop()
      setRecognition(null)
      setIsRecording(false)
    }
    if (silenceTimeoutRef.current) clearTimeout(silenceTimeoutRef.current)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const trimmed = input.trim()
    if (!trimmed || isLoading || isChatFrozen) return

    const canSend = onNewMessage()
    if (!canSend) return

    const newCount = messageCount - 1
    setMessageCount(newCount)

    if (userId) {
      try {
        await updateFreeMessages(userId, newCount)
      } catch {
        // non-critical
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
      content: trimmed,
      sender: "user",
      timestamp: new Date(),
    }

    const historyBeforeNew = buildHistory()
    setMessages((prev) => [...prev, userMessage])
    setInput("")
    setIsLoading(true)
    setIsAiResponding(true)

    try {
      const response = await chat(trimmed, historyBeforeNew)
      if (response.success) {
        const aiMessage: Message = {
          id: (Date.now() + 1).toString(),
          content: response.message,
          sender: "ai",
          timestamp: new Date(),
        }
        setMessages((prev) => [...prev, aiMessage])

        if (userId) {
          await saveChatMessage(userId, {
            userMessage: trimmed,
            aiResponse: response.message,
            timestamp: new Date(),
          })
        }
      } else {
        throw new Error(response.message)
      }
    } catch {
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        content:
          "Desculpe, estou com dificuldades técnicas no momento. Podemos tentar novamente?",
        sender: "ai",
        timestamp: new Date(),
      }
      setMessages((prev) => [...prev, errorMessage])
    } finally {
      setIsLoading(false)
      setIsAiResponding(false)
    }
  }

  useEffect(() => {
    const sync = async () => {
      if (userId) {
        const count = await getFreeMessagesCount(userId)
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
  }, [userId, setMessageCount])

  useEffect(() => () => {
    if (silenceTimeoutRef.current) clearTimeout(silenceTimeoutRef.current)
  }, [])

  useEffect(() => {
    scrollInputToEnd()
  }, [input])

  useEffect(() => {
    localStorage.setItem("preferredLanguage", language)
    if (isRecording) {
      stopRecording()
      startRecording()
    }
  }, [language])

  const scrollInputToEnd = () => {
    if (inputRef.current) inputRef.current.scrollLeft = inputRef.current.scrollWidth
  }

  const handlePlayPause = (messageId: string, content: string) => {
    if (playingMessageId === messageId) {
      stopSpeaking()
      setPlayingMessageId(null)
    } else {
      if (playingMessageId) stopSpeaking()
      speak(content, language)
      setPlayingMessageId(messageId)
    }
  }

  useEffect(() => {
    const onEnd = () => setPlayingMessageId(null)
    speechSynthesis.addEventListener("end", onEnd)
    return () => speechSynthesis.removeEventListener("end", onEnd)
  }, [])

  const hasMessages = messages.length > 0

  return (
    <div className="w-full max-w-2xl mx-auto flex flex-col gap-3 mt-4">
      <h4 className="text-lg font-semibold bg-gradient-to-r from-[#6b8e23] to-[#8fbc8f] dark:from-[#98bf64] dark:to-[#a0d6a0] bg-clip-text text-transparent">
        Como você está se sentindo hoje?
      </h4>

      {/* Starter prompts — only show when no messages yet */}
      {!hasMessages && !isChatFrozen && (
        <div className="flex flex-wrap gap-2">
          {STARTER_PROMPTS.map((prompt) => (
            <button
              key={prompt}
              onClick={() => setInput(prompt)}
              className="text-xs px-3 py-1.5 rounded-full border border-muted-foreground/30 text-muted-foreground hover:border-foreground hover:text-foreground transition-colors"
            >
              {prompt}
            </button>
          ))}
        </div>
      )}

      {/* Message area */}
      {hasMessages && (
        <div className={`relative ${isChatFrozen ? "pointer-events-none" : ""}`}>
          {isChatFrozen && (
            <div className="absolute inset-0 bg-background/50 backdrop-blur-sm z-10 rounded-lg" />
          )}
          <ScrollArea className="h-[380px] rounded-xl border bg-background p-3">
            <div className="flex flex-col gap-3">
              {messages.map((message) => (
                <div
                  key={message.id}
                  className={`flex flex-col max-w-[80%] ${message.sender === "user" ? "ml-auto items-end" : "mr-auto items-start"}`}
                >
                  <div
                    className={`px-4 py-3 rounded-2xl text-sm leading-relaxed relative ${
                      message.sender === "user"
                        ? "bg-[#d2b48c] text-[#4a3c31] dark:bg-[#d2b48c]/70 dark:text-[#f5f5f5] rounded-br-sm"
                        : "bg-[#8fbc8f] text-[#2f4f4f] dark:bg-[#8fbc8f]/70 dark:text-[#ffffff] rounded-bl-sm"
                    }`}
                  >
                    {message.content}
                    {message.sender === "ai" && (
                      <button
                        className="absolute -bottom-2 -right-2 w-7 h-7 rounded-full bg-white dark:bg-gray-800 border border-[#2f4f4f]/20 dark:border-white/20 flex items-center justify-center hover:bg-muted transition-colors shadow-sm"
                        onClick={() => handlePlayPause(message.id, message.content)}
                        aria-label={playingMessageId === message.id ? "Pausar" : "Ouvir"}
                      >
                        {playingMessageId === message.id ? (
                          <Pause className="h-3 w-3" />
                        ) : (
                          <Play className="h-3 w-3" />
                        )}
                      </button>
                    )}
                  </div>
                  <span className="text-[10px] text-muted-foreground mt-1 px-1">
                    {format(message.timestamp, "HH:mm")}
                  </span>
                </div>
              ))}
              {isAiResponding && (
                <div className="flex flex-col max-w-[80%] mr-auto items-start">
                  <div className="px-4 py-3 rounded-2xl rounded-bl-sm bg-[#8fbc8f] dark:bg-[#8fbc8f]/70">
                    <LoadingDots />
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>
          </ScrollArea>
        </div>
      )}

      {/* Input form */}
      <form onSubmit={handleSubmit} className="flex gap-2">
        <div className="relative flex-1 flex items-center">
          {/* Language & mic controls on the left */}
          <div className="absolute left-0 top-0 bottom-0 flex items-center pl-1 gap-1 z-10">
            <Select
              value={language}
              onValueChange={(value: Language) => {
                setLanguage(value)
                localStorage.setItem("preferredLanguage", value)
              }}
            >
              <SelectTrigger className="w-[72px] h-8 text-xs border-0 bg-transparent focus:ring-0 shadow-none">
                <SelectValue>
                  <span>
                    {languageOptions[language as Language]?.flag}{" "}
                    {languageOptions[language as Language]?.label}
                  </span>
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                {Object.entries(languageOptions).map(([value, { flag, label }]) => (
                  <SelectItem key={value} value={value}>
                    <span className="flex items-center gap-2">
                      <span>{flag}</span>
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
              className={`w-7 h-7 rounded-full ${
                isRecording
                  ? "bg-red-100 hover:bg-red-200 dark:bg-red-900/20"
                  : "hover:bg-muted"
              }`}
              disabled={isLoading || isChatFrozen}
              onClick={isRecording ? stopRecording : startRecording}
              aria-label={isRecording ? "Parar gravação" : "Usar microfone"}
            >
              {isRecording ? (
                isVoiceDetected ? (
                  <Waveform className="h-3.5 w-3.5 text-red-500" />
                ) : (
                  <Square className="h-3.5 w-3.5 text-red-500" />
                )
              ) : (
                <Mic className="h-3.5 w-3.5" />
              )}
              {isRecording && isVoiceDetected && (
                <span className="absolute -top-0.5 -right-0.5 flex h-2.5 w-2.5">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75" />
                  <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-red-500" />
                </span>
              )}
            </Button>
          </div>

          <input
            ref={inputRef}
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder={isChatFrozen ? "Limite de mensagens atingido" : "Compartilhe seus pensamentos..."}
            className={`w-full pl-[120px] pr-3 py-2 text-sm rounded-xl border border-input bg-background h-10 outline-none focus:ring-2 focus:ring-[#8fbc8f]/50 transition-all ${
              isChatFrozen ? "opacity-50 cursor-not-allowed" : ""
            }`}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault()
                handleSubmit(e)
              }
            }}
            disabled={isLoading || isChatFrozen}
            aria-label="Mensagem"
          />
        </div>

        {isChatFrozen ? (
          isLoggedIn ? (
            <Button type="button" className="h-10 px-4" onClick={onUpgradeNeeded}>
              Atualizar
            </Button>
          ) : (
            <Button type="button" className="h-10 px-4" onClick={onLoginClick}>
              Entrar
            </Button>
          )
        ) : (
          <Button type="submit" className="h-10 w-10 p-0 rounded-xl" disabled={isLoading || !input.trim()}>
            <Send className="h-4 w-4" />
            <span className="sr-only">Enviar</span>
          </Button>
        )}
      </form>

      <p className="text-xs text-muted-foreground text-center">
        {isLoggedIn
          ? messageCount > 0
            ? `${messageCount} mensagens restantes este mês`
            : "Limite atingido — atualize para continuar"
          : messageCount > 0
          ? `${messageCount} mensagens gratuitas restantes`
          : "Limite atingido — faça login para continuar"}
      </p>
    </div>
  )
}
