import { Instagram } from "lucide-react"

export function Footer() {
  return (
    <footer className="w-full py-6 px-4 border-t bg-[#e6e6c8] dark:bg-[#3a3a30] text-[#4a4a40] dark:text-[#e0e0d0]">
      <div className="container mx-auto">
        <div className="flex flex-col md:flex-row justify-between items-center gap-4">
          <p className="text-sm text-muted-foreground">Psaich.org - Seu companheiro de saúde mental com IA</p>
          <div className="flex items-center space-x-4">
            <a href="#" className="text-sm hover:underline">
              Política de Privacidade
            </a>
            <a href="#" className="text-sm hover:underline">
              Termos de Serviço
            </a>
            <a
              href="https://www.instagram.com/psaich_org"
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-[#6b8e23] dark:hover:text-[#98bf64]"
            >
              <Instagram className="h-5 w-5" />
            </a>
            <a href="#" className="hover:text-[#6b8e23] dark:hover:text-[#98bf64]">
              <svg viewBox="0 0 24 24" className="h-5 w-5 fill-current" xmlns="http://www.w3.org/2000/svg">
                <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-5.2 1.74 2.89 2.89 0 0 1 2.31-4.64 2.93 2.93 0 0 1 .88.13V9.4a6.84 6.84 0 0 0-1-.05A6.33 6.33 0 0 0 5 20.1a6.34 6.34 0 0 0 10.86-4.43v-7a8.16 8.16 0 0 0 4.77 1.52v-3.4a4.85 4.85 0 0 1-1-.1z" />
              </svg>
            </a>
          </div>
        </div>
      </div>
    </footer>
  )
}
