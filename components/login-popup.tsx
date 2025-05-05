"use client"

import { useState } from "react"
import { X } from "lucide-react"
import { auth, googleProvider, microsoftProvider } from "@/lib/firebase"
import { signInWithPopup, type OAuthProvider } from "firebase/auth"
import { saveUserData, updateLastLogin } from "@/lib/firestore"
import Image from "next/image"
import { Button } from "@/components/ui/button"

interface LoginPopupProps {
  isOpen: boolean
  onClose: () => void
  onLogin: (user: any, freeMessages?: number) => void
}

export function LoginPopup({ isOpen, onClose, onLogin }: LoginPopupProps) {
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  if (!isOpen) return null

  if (!auth) {
    return null
  }

  const handleOAuthLogin = async (provider: OAuthProvider | typeof googleProvider) => {
    setIsLoading(true)
    setError(null)
    try {
      if (!auth) {
        throw new Error("Firebase auth não está inicializado")
      }
      const result = await signInWithPopup(auth, provider)
      const user = result.user

      // Save user data to Firestore
      const userData = await saveUserData(user, {
        country: "Unknown", // You might want to get this from a geolocation service or user input
        firstName: user.displayName?.split(" ")[0] || "",
        lastName: user.displayName?.split(" ").slice(1).join(" ") || "",
      })

      // Update last login
      await updateLastLogin(user.uid)

      onLogin(user, userData.freeMessages || 15)
    } catch (error) {
      console.error("Erro ao fazer login:", error)
      if (error instanceof Error) {
        if (error.message.includes("auth/operation-not-allowed")) {
          setError("Este método de login não está habilitado. Por favor, contate o administrador.")
        } else {
          setError(error.message)
        }
      } else {
        setError("Ocorreu um erro desconhecido")
      }
    } finally {
      setIsLoading(false)
    }
  }

  const handleGoogleLogin = () => handleOAuthLogin(googleProvider)
  const handleMicrosoftLogin = () => handleOAuthLogin(microsoftProvider)

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-lg max-w-md w-full relative">
        <button
          onClick={onClose}
          className="absolute top-2 right-2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
        >
          <X size={24} />
        </button>
        <h2 className="text-2xl font-bold mb-4 text-gray-900 dark:text-gray-100">Login Psaich</h2>
        <p className="mb-6 text-gray-600 dark:text-gray-300">
          Faça login para continuar sua jornada de autoconhecimento, desenvolvimento pessoal e bem-estar mental.
        </p>
        <div className="space-y-4">
          <Button
            onClick={handleGoogleLogin}
            disabled={isLoading}
            className="w-full h-10 flex items-center justify-center gap-2 bg-white text-gray-700 border border-gray-300 rounded shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isLoading ? (
              <div className="w-5 h-5 border-t-2 border-b-2 border-gray-900 rounded-full animate-spin"></div>
            ) : (
              <>
                <Image src="/google-logo.svg" alt="Logo do Google" width={18} height={18} />
                <span className="text-sm font-medium">Entrar com Google</span>
              </>
            )}
          </Button>
          <Button
            onClick={handleMicrosoftLogin}
            disabled={isLoading}
            className="w-full h-10 flex items-center justify-center gap-2 bg-[#2F2F2F] text-white border border-gray-300 rounded shadow-sm hover:bg-[#1E1E1E] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isLoading ? (
              <div className="w-5 h-5 border-t-2 border-b-2 border-white rounded-full animate-spin"></div>
            ) : (
              <>
                <svg width="21" height="21" viewBox="0 0 21 21" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M10 1H1V10H10V1Z" fill="#F25022" />
                  <path d="M20 1H11V10H20V1Z" fill="#7FBA00" />
                  <path d="M10 11H1V20H10V11Z" fill="#00A4EF" />
                  <path d="M20 11H11V20H20V11Z" fill="#FFB900" />
                </svg>
                <span className="text-sm font-medium">Entrar com Microsoft</span>
              </>
            )}
          </Button>
        </div>
        {error && <p className="mt-4 text-sm text-red-600 dark:text-red-400">{error}</p>}
      </div>
    </div>
  )
}
