"use client"

declare global {
  interface Window {
    webkitSpeechRecognition: any
  }
}

import { useState, useEffect, useRef } from "react"
import { format, isToday, startOfDay, endOfDay, parseISO, isValid } from "date-fns"
import { collection, query, where, getDocs, orderBy, addDoc, serverTimestamp } from "firebase/firestore"
import { Timestamp } from "firebase/firestore"
import { auth, db } from "@/lib/firebase"
import { ScrollArea } from "@/components/ui/scroll-area"
import { LoadingDots } from "@/components/loading-dots"
import { Button } from "@/components/ui/button"
import { Mic, Square, Play, Pause, AudioWaveformIcon as Waveform, ChevronLeft, ChevronRight } from "lucide-react"
import { speak, stopSpeaking } from "@/utils/textToSpeech"
import { chat } from "@/app/actions"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

interface ChatHistoryProps {
  selectedDate: string | null
  toggleSidebar: () => void
  isExpanded: boolean
}

interface ChatMessage {
  id: string
  userMessage: string
  aiResponse: string
  timestamp: Timestamp | { seconds: number; nanoseconds: number } | Date | null
}

type Language = "pt-BR" | "en-US"

const languageOptions: Record<Language, { flag: string; label: string }> = {
  "pt-BR": { flag: "🇧🇷", label: "PT-BR" },
  "en-US": { flag: "🇺🇸", label: "EN-US" },
}

export function ChatHistory({ selectedDate, toggleSidebar, isExpanded }: ChatHistoryProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [input, setInput] = useState("")
  const [isRecording, setIsRecording] = useState(false)
  const [playingMessageId, setPlayingMessageId] = useState<string | null>(null)
  const scrollAreaRef = useRef<HTMLDivElement>(null)
  const [user, setUser] = useState(auth.currentUser)
  const [language, setLanguage] = useState<Language>(() => {
    if (typeof window !== "undefined") {
      return (localStorage.getItem("preferredLanguage") as Language) || "en-US"
    }
    return "en-US"
  })
  const [recognition, setRecognition] = useState<any>(null)
  const [isSilent, setIsSilent] = useState(false)
  const [isVoiceDetected, setIsVoiceDetected] = useState(false)
  const silenceTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  const isCurrentDay = selectedDate ? isToday(parseISO(selectedDate)) : false

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged((user) => {
      setUser(user)
    })

    return () => unsubscribe()
  }, [])

  useEffect(() => {
    localStorage.setItem("preferredLanguage", language)
  }, [language])

  useEffect(() => {
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === "preferredLanguage") {
        setLanguage(e.newValue as Language)
      }
    }

    window.addEventListener("storage", handleStorageChange)

    return () => {
      window.removeEventListener("storage", handleStorageChange)
    }
  }, [])

  useEffect(() => {
    const fetchMessages = async () => {
      if (!selectedDate || !auth.currentUser) return

      setIsLoading(true)
      try {
        const selectedDateObj = parseISO(selectedDate)
        const startOfSelectedDay = startOfDay(selectedDateObj)
        const endOfSelectedDay = endOfDay(selectedDateObj)

        const chatsRef = collection(db, "users", auth.currentUser.uid, "chat")
        const q = query(
          chatsRef,
          where("timestamp", ">=", startOfSelectedDay),
          where("timestamp", "<=", endOfSelectedDay),
          orderBy("timestamp", "asc"),
        )

        const querySnapshot = await getDocs(q)
        const fetchedMessages = querySnapshot.docs.map((doc) => {
          const data = doc.data()
          let timestamp = data.timestamp
          if (timestamp instanceof Timestamp) {
            timestamp = timestamp.toDate()
          } else if (typeof timestamp === "object" && "seconds" in timestamp) {
            timestamp = new Date(timestamp.seconds * 1000)
          }
          return {
            id: doc.id,
            ...data,
            timestamp: isValid(timestamp) ? timestamp : null,
          }
        }) as ChatMessage[]

        setMessages(fetchedMessages)
      } catch (error) {
        console.error("Error fetching messages:", error)
      } finally {
        setIsLoading(false)
      }
    }

    fetchMessages()
  }, [selectedDate])

  useEffect(() => {
    if (isCurrentDay && messages.length > 0) {
      setTimeout(scrollToBottom, 100)
    }
  }, [isCurrentDay, messages])

  const scrollToBottom = () => {
    if (scrollAreaRef.current) {
      const scrollContainer = scrollAreaRef.current.querySelector("[data-radix-scroll-area-viewport]")
      if (scrollContainer) {
        scrollContainer.scrollTop = scrollContainer.scrollHeight
      }
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!input.trim() || !user || !isCurrentDay) return

    const userMessage = input.trim()
    setInput("")

    try {
      const response = await chat(userMessage)
      if (response.success) {
        const newMessage: ChatMessage = {
          id: Date.now().toString(),
          userMessage,
          aiResponse: response.message,
          timestamp: serverTimestamp() as Timestamp,
        }

        setMessages((prev) => [...prev, newMessage])

        // Save the message to Firestore
        const chatsRef = collection(db, "users", user.uid, "chat")
        await addDoc(chatsRef, newMessage)

        if (isCurrentDay) {
          setTimeout(scrollToBottom, 100)
        }
      } else {
        throw new Error(response.message)
      }
    } catch (error) {
      console.error("Error in chat:", error)
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

  const handleSpeechResult = (event: any) => {
    const results = event.results
    let finalTranscript = ""

    for (let i = event.resultIndex; i < results.length; ++i) {
      if (results[i].isFinal) {
        finalTranscript += results[i][0].transcript
      }
    }

    if (finalTranscript) {
      setInput((prevInput) => {
        const updatedInput = (prevInput + " " + finalTranscript).trim()
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
    if ("webkitSpeechRecognition" in window) {
      const recognition = new (window as any).webkitSpeechRecognition()
      recognition.continuous = true
      recognition.interimResults = true
      recognition.lang = language

      recognition.onresult = handleSpeechResult
      recognition.onend = handleSpeechEnd

      recognition.onaudiostart = () => {
        setIsSilent(false)
        resetSilenceTimeout()
      }

      recognition.onaudioend = () => {
        setIsSilent(true)
        setIsVoiceDetected(false)
        resetSilenceTimeout()
      }

      recognition.onsoundstart = () => {
        setIsSilent(false)
        setIsVoiceDetected(true)
        resetSilenceTimeout()
      }

      recognition.onsoundend = () => {
        setIsSilent(true)
        setIsVoiceDetected(false)
        resetSilenceTimeout()
      }

      recognition.start()
      setRecognition(recognition)
      setIsRecording(true)
    }
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

  const scrollInputToEnd = () => {
    if (inputRef.current) {
      inputRef.current.scrollLeft = inputRef.current.scrollWidth
    }
  }

  useEffect(() => {
    scrollInputToEnd()
  }, [input, inputRef])

  if (!selectedDate) {
    return (
      <div className="h-full w-full flex items-center justify-center text-muted-foreground">
        Select a date to view chat history
      </div>
    )
  }

  if (isLoading) {
    return (
      <div className="h-full w-full flex items-center justify-center">
        <LoadingDots />
      </div>
    )
  }

  return (
    <div className="h-full w-full flex flex-col md:h-screen">
      <div className="sticky top-0 z-10 bg-background p-4 border-b flex items-center justify-between">
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 rounded-full hover:bg-accent hover:text-accent-foreground mr-2"
          onClick={toggleSidebar}
        >
          {isExpanded ? <ChevronLeft className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
        </Button>
        <h2 className="text-2xl font-bold">
          {isCurrentDay ? "Today's Chat" : format(parseISO(selectedDate), "MMMM d, yyyy")}
        </h2>
      </div>
      <div className="flex-1 overflow-hidden">
        <ScrollArea className="h-[calc(100vh-16rem)] md:h-full w-full" ref={scrollAreaRef}>
          <div className="max-w-4xl mx-auto p-6 pt-2">
            <div className="space-y-4">
              {messages.map((message) => (
                <div key={message.id} className="space-y-4">
                  <div className="flex flex-col gap-2">
                    <div className="ml-auto max-w-[80%] bg-[#d2b48c] text-[#4a3c31] dark:bg-[#d2b48c]/70 dark:text-[#f5f5f5] rounded-lg p-3">
                      {message.userMessage}
                    </div>
                    <div className="mr-auto max-w-[80%] bg-[#8fbc8f] text-[#2f4f4f] dark:bg-[#8fbc8f]/70 dark:text-[#ffffff] rounded-lg p-3 relative">
                      {message.aiResponse}
                      <Button
                        variant="outline"
                        size="icon"
                        className="absolute bottom-1 right-1 rounded-full w-8 h-8 bg-white dark:bg-gray-800 border-2 border-[#2f4f4f] dark:border-[#ffffff] hover:bg-[#2f4f4f] hover:text-white dark:hover:bg-[#ffffff] dark:hover:text-gray-800 transition-colors"
                        onClick={() => handlePlayPause(message.id, message.aiResponse)}
                      >
                        {playingMessageId === message.id ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
                      </Button>
                    </div>
                  </div>
                  <div className="text-xs text-muted-foreground text-center">
                    {(message.timestamp &&
                      (() => {
                        let date: Date
                        if (message.timestamp instanceof Timestamp) {
                          date = message.timestamp.toDate()
                        } else if (message.timestamp instanceof Date) {
                          date = message.timestamp
                        } else if (typeof message.timestamp === "object" && "seconds" in message.timestamp) {
                          date = new Date((message.timestamp as any).seconds * 1000)
                        } else {
                          return "Invalid date"
                        }

                        return isValid(date) ? format(date, "h:mm a") : "Invalid date"
                      })()) ||
                      "Time not available"}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </ScrollArea>
      </div>
      {isCurrentDay && (
        <div className="flex-shrink-0 p-2 md:p-4 border-t w-full group-data-[collapsible=icon]:ml-20">
          <div className="max-w-4xl mx-auto">
            <h4 className="text-lg font-semibold mb-2 bg-gradient-to-r from-[#6b8e23] to-[#8fbc8f] dark:from-[#98bf64] dark:to-[#a0d6a0] bg-clip-text text-transparent">
              Hello, {user?.displayName}! How are you feeling today?
            </h4>
            <form onSubmit={handleSubmit} className="flex gap-2">
              <div className="relative flex-1 flex items-center">
                <div className="absolute left-0 top-0 bottom-0 flex items-center">
                  <div className="flex items-center bg-background border border-input rounded-l-md h-10 px-3">
                    <span className="text-sm font-medium">{languageOptions[language].label}</span>
                  </div>
                  <Select
                    value={language}
                    onValueChange={(value: Language) => {
                      setLanguage(value)
                      localStorage.setItem("preferredLanguage", value)
                    }}
                  >
                    <SelectTrigger className="w-[40px] h-10 rounded-none border-l-0 border-r-0">
                      <SelectValue>
                        {({ value }) => (
                          <span className="flex items-center justify-center">
                            {languageOptions[value as Language].flag}
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
                    <span className="sr-only">{isRecording ? "Stop recording" : "Use voice input"}</span>
                  </Button>
                </div>
                <input
                  ref={inputRef}
                  type="text"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  placeholder="Share your thoughts or any concerns you have."
                  className={`w-full pl-[160px] pr-3 py-2 text-sm leading-5 rounded-md border border-input bg-background h-10 cursor-blink`}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault()
                      handleSubmit(e)
                    }
                  }}
                />
              </div>
              <Button type="submit" className="h-10">
                Send
              </Button>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
