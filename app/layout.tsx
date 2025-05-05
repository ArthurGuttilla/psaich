import "./globals.css"
import { inter } from "./fonts"

export const metadata = {
  title: "Psaich.org",
  description: "Your AI-powered mental health companion",
    generator: 'v0.dev'
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" className={inter.className}>
      <body>{children}</body>
    </html>
  )
}
