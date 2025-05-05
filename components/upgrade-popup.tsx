"use client"
import { X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"

interface UpgradePopupProps {
  isOpen: boolean
  onClose: () => void
  onUpgrade: () => void
}

export function UpgradePopup({ isOpen, onClose, onUpgrade }: UpgradePopupProps) {
  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <Card className="w-full max-w-md">
        <CardHeader className="relative">
          <CardTitle className="text-2xl font-bold text-center">Melhore Sua Experiência</CardTitle>
          <Button variant="ghost" size="icon" className="absolute right-2 top-2" onClick={onClose} aria-label="Fechar">
            <X className="h-4 w-4" />
          </Button>
        </CardHeader>
        <CardContent>
          <p className="text-center mb-4">
            Você atingiu o limite do seu plano atual. Atualize agora para continuar sua jornada de autoconhecimento e
            bem-estar mental com conversas ilimitadas.
          </p>
          <ul className="space-y-2">
            <li className="flex items-center">
              <span className="mr-2">🪷</span>
              Apenas R$50/mês
            </li>
            <li className="flex items-center">
              <span className="mr-2">🧠</span>
              Ou R$499/anual
            </li>
          </ul>
        </CardContent>
        <CardFooter className="flex justify-center">
          <Button onClick={onUpgrade} className="w-full">
            Atualizar Agora
          </Button>
        </CardFooter>
      </Card>
    </div>
  )
}
