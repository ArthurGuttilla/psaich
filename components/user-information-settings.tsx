"use client"

import type React from "react"

import { useState, useEffect, useRef } from "react"
import type { User } from "firebase/auth"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { updateUserProfile, uploadProfileImage, getUserProfile } from "@/lib/firebase"
import { getUserData, updateUserData } from "@/lib/firestore"
import Image from "next/image"
import { getFreeMessagesCount } from "@/lib/firestore"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"

interface UserInformationSettingsProps {
  user: User
}

interface UserData {
  displayName: string
  email: string
  photoURL: string | null
  phoneNumber: string
  address: string
  country: string
  newsletter: boolean
  psychologySchool: string
  firstName: string
  lastName: string
  lastLogin: Date
  freeMessages: number
  lastFreeMessagesReset: Date
}

const psychologySchools = {
  cognitive: "Foca em processos mentais como memória, pensamento e resolução de problemas.",
  behavioral: "Enfatiza o papel de fatores ambientais na influência do comportamento.",
  psychoanalytic: "Explora pensamentos inconscientes e experiências da infância para explicar o comportamento.",
  humanistic: "Enfatiza o crescimento pessoal, auto-realização e o momento presente.",
  biological: "Examina como o cérebro e os neurotransmissores influenciam nossos comportamentos.",
}

export function UserInformationSettings({ user }: UserInformationSettingsProps) {
  const [formData, setFormData] = useState<UserData>({
    displayName: user.displayName || "",
    email: user.email || "",
    photoURL: user.photoURL || "",
    phoneNumber: "",
    address: "",
    country: "",
    newsletter: false,
    psychologySchool: "",
    firstName: "",
    lastName: "",
    lastLogin: new Date(),
    freeMessages: 15,
    lastFreeMessagesReset: new Date(),
  })

  const [loading, setLoading] = useState(false)
  const [previewImage, setPreviewImage] = useState<string | null>(user.photoURL || null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [freeMessages, setFreeMessages] = useState(0)
  const [nextReset, setNextReset] = useState<Date | null>(null)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)

  useEffect(() => {
    const fetchUserData = async () => {
      try {
        const firebaseUserData = await getUserProfile(user.uid)
        const firestoreUserData = await getUserData(user.uid)

        if (firebaseUserData || firestoreUserData) {
          setFormData({
            displayName: firebaseUserData?.displayName || firestoreUserData?.displayName || user.displayName || "",
            email: firebaseUserData?.email || firestoreUserData?.email || user.email || "",
            photoURL: firebaseUserData?.photoURL || firestoreUserData?.photoURL || user.photoURL || "",
            phoneNumber: firebaseUserData?.phoneNumber || firestoreUserData?.phoneNumber || "",
            address: firebaseUserData?.address || firestoreUserData?.address || "",
            country: firebaseUserData?.country || firestoreUserData?.country || "",
            newsletter: firebaseUserData?.newsletter || firestoreUserData?.newsletter || false,
            psychologySchool: firebaseUserData?.psychologySchool || firestoreUserData?.psychologySchool || "",
            firstName: firestoreUserData?.firstName || "",
            lastName: firestoreUserData?.lastName || "",
            lastLogin: firestoreUserData?.lastLogin || new Date(),
            freeMessages: firestoreUserData?.freeMessages || 15,
            lastFreeMessagesReset: firestoreUserData?.lastFreeMessagesReset || new Date(),
          })
          setPreviewImage(firebaseUserData?.photoURL || firestoreUserData?.photoURL || null)
        }

        const count = await getFreeMessagesCount(user.uid)
        setFreeMessages(count)

        // Set next reset date to the first day of next month
        const now = new Date()
        const nextMonth = new Date(now.getFullYear(), now.getMonth() + 1, 1)
        setNextReset(nextMonth)
      } catch (error) {
        console.error("Error fetching user data:", error)
      }
    }

    fetchUserData()
  }, [user.uid, user.displayName, user.email, user.photoURL])

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value })
  }

  const handleSelectChange = (value: string) => {
    setFormData((prevData) => ({ ...prevData, country: value }))
  }

  const handleSwitchChange = (checked: boolean) => {
    setFormData({ ...formData, newsletter: checked })
  }

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      const reader = new FileReader()
      reader.onloadend = () => {
        setPreviewImage(reader.result as string)
      }
      reader.readAsDataURL(file)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setSuccessMessage(null)
    try {
      let photoURL = formData.photoURL
      if (fileInputRef.current?.files?.[0]) {
        photoURL = await uploadProfileImage(user.uid, fileInputRef.current.files[0])
      }
      const updatedData = {
        displayName: formData.displayName,
        photoURL,
        email: formData.email,
        phoneNumber: formData.phoneNumber,
        address: formData.address,
        country: formData.country,
        newsletter: formData.newsletter,
        psychologySchool: formData.psychologySchool,
      }
      await updateUserProfile(user, updatedData)
      await updateUserData(user.uid, updatedData)
      setSuccessMessage("Suas alterações foram salvas com sucesso!")
    } catch (error) {
      console.error("Error updating user profile:", error)
      setSuccessMessage("Ocorreu um erro ao salvar suas alterações. Por favor, tente novamente.")
    }
    setLoading(false)
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <h3 className="text-2xl font-semibold mb-4">Informações do Usuário</h3>

      <div className="grid gap-4 md:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="displayName">Nome</Label>
          <Input id="displayName" name="displayName" value={formData.displayName} onChange={handleInputChange} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="email">Email</Label>
          <Input id="email" name="email" type="email" value={formData.email} onChange={handleInputChange} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="profileImage">Foto de Perfil</Label>
          <div className="flex items-center space-x-4">
            {previewImage && (
              <Image
                src={previewImage || "/placeholder.svg"}
                alt="Perfil"
                width={64}
                height={64}
                className="rounded-full"
              />
            )}
            <Input
              id="profileImage"
              name="profileImage"
              type="file"
              accept="image/*"
              onChange={handleImageChange}
              ref={fileInputRef}
            />
          </div>
        </div>
        <div className="space-y-2">
          <Label htmlFor="phoneNumber">Número de Telefone</Label>
          <Input id="phoneNumber" name="phoneNumber" value={formData.phoneNumber} onChange={handleInputChange} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="address">Endereço</Label>
          <Input id="address" name="address" value={formData.address} onChange={handleInputChange} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="country">País</Label>
          <Select onValueChange={handleSelectChange} value={formData.country}>
            <SelectTrigger>
              <SelectValue placeholder="Selecione um país" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="us">Estados Unidos</SelectItem>
              <SelectItem value="ca">Canadá</SelectItem>
              <SelectItem value="uk">Reino Unido</SelectItem>
              <SelectItem value="br">Brasil</SelectItem>
              <SelectItem value="pt">Portugal</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2 md:col-span-2">
          <Label>Escola de Psicologia Preferida</Label>
          <RadioGroup
            onValueChange={(value) => setFormData({ ...formData, psychologySchool: value })}
            value={formData.psychologySchool}
          >
            {Object.entries(psychologySchools).map(([key, description]) => (
              <div key={key} className="flex items-center space-x-2">
                <RadioGroupItem value={key} id={key} />
                <Label htmlFor={key}>{key.charAt(0).toUpperCase() + key.slice(1)}</Label>
              </div>
            ))}
          </RadioGroup>
          {formData.psychologySchool && (
            <p className="mt-2 text-sm text-muted-foreground">
              {psychologySchools[formData.psychologySchool as keyof typeof psychologySchools]}
            </p>
          )}
        </div>
      </div>

      <div className="flex items-center space-x-2">
        <Switch id="newsletter" checked={formData.newsletter} onCheckedChange={handleSwitchChange} />
        <Label htmlFor="newsletter">Inscrever-se na newsletter</Label>
      </div>

      <div className="bg-muted p-4 rounded-lg">
        <h4 className="text-lg font-semibold mb-2">Mensagens Gratuitas</h4>
        <p>Você tem {freeMessages} mensagens gratuitas restantes.</p>
        {nextReset && <p>Próxima renovação: {nextReset.toLocaleDateString()}</p>}
      </div>

      {successMessage && (
        <div
          className={`p-4 rounded-md ${
            successMessage.includes("erro") ? "bg-red-100 text-red-700" : "bg-green-100 text-green-700"
          }`}
        >
          {successMessage}
        </div>
      )}

      <Button type="submit" disabled={loading}>
        {loading ? "Salvando..." : "Salvar Alterações"}
      </Button>
    </form>
  )
}
