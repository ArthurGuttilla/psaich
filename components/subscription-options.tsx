"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"

export function SubscriptionOptions() {
  const [loading, setLoading] = useState(false)

  const handleSubscribe = async (plan: "monthly" | "annually") => {
    setLoading(true)
    // TODO: Implement Stripe checkout
    console.log(`Subscribing to ${plan} plan`)
    setLoading(false)
  }

  return (
    <div className="mb-12">
      <h3 className="text-2xl font-semibold mb-4">Opções de Assinatura</h3>
      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Assinatura Mensal</CardTitle>
            <CardDescription>Pague mês a mês para acesso completo</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">R$50/mês</p>
          </CardContent>
          <CardFooter>
            <Button onClick={() => handleSubscribe("monthly")} disabled={loading}>
              {loading ? "Processando..." : "Assinar Mensalmente"}
            </Button>
          </CardFooter>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Assinatura Anual</CardTitle>
            <CardDescription>Economize com nosso plano anual</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">R$499/ano</p>
            <p className="text-sm text-muted-foreground">Economize R$101 em comparação ao mensal</p>
          </CardContent>
          <CardFooter>
            <Button onClick={() => handleSubscribe("annually")} disabled={loading}>
              {loading ? "Processando..." : "Assinar Anualmente"}
            </Button>
          </CardFooter>
        </Card>
      </div>
    </div>
  )
}
