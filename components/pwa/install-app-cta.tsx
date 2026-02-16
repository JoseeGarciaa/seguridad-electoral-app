"use client"

import { useEffect, useState } from "react"
import { Download } from "lucide-react"
import { Button } from "@/components/ui/button"

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: "accepted" | "dismissed"; platform: string }>
}

type InstallAppCtaProps = {
  className?: string
}

export function InstallAppCta({ className }: InstallAppCtaProps) {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null)
  const [isStandalone, setIsStandalone] = useState(false)
  const [isIosSafari, setIsIosSafari] = useState(false)

  useEffect(() => {
    const standalone =
      window.matchMedia("(display-mode: standalone)").matches ||
      ("standalone" in navigator && (navigator as Navigator & { standalone?: boolean }).standalone)

    setIsStandalone(Boolean(standalone))

    const userAgent = navigator.userAgent.toLowerCase()
    const isIos = /iphone|ipad|ipod/.test(userAgent)
    const isSafari = /safari/.test(userAgent) && !/crios|fxios|edgios|opr\//.test(userAgent)
    setIsIosSafari(isIos && isSafari)

    const handleBeforeInstallPrompt = (event: Event) => {
      event.preventDefault()
      setDeferredPrompt(event as BeforeInstallPromptEvent)
    }

    const handleInstalled = () => {
      setDeferredPrompt(null)
      setIsStandalone(true)
    }

    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt)
    window.addEventListener("appinstalled", handleInstalled)

    return () => {
      window.removeEventListener("beforeinstallprompt", handleBeforeInstallPrompt)
      window.removeEventListener("appinstalled", handleInstalled)
    }
  }, [])

  const onInstallClick = async () => {
    if (!deferredPrompt) return

    await deferredPrompt.prompt()
    await deferredPrompt.userChoice
    setDeferredPrompt(null)
  }

  if (isStandalone) return null

  if (deferredPrompt) {
    return (
      <div className={className}>
        <Button
          type="button"
          onClick={onInstallClick}
          variant="outline"
          className="w-full border-border/50 hover:bg-secondary bg-transparent"
        >
          <Download className="mr-2 h-4 w-4" />
          Instalar app
        </Button>
      </div>
    )
  }

  if (isIosSafari) {
    return (
      <div className={className}>
        <p className="text-xs text-muted-foreground text-center">
          En iPhone/iPad: abre compartir y pulsa “Agregar a pantalla de inicio”.
        </p>
      </div>
    )
  }

  return null
}
