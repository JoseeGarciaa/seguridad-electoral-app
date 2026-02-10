"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"

export function StandaloneRedirect() {
  const router = useRouter()

  useEffect(() => {
    const isStandalone =
      window.matchMedia("(display-mode: standalone)").matches ||
      ("standalone" in navigator && (navigator as Navigator & { standalone?: boolean }).standalone)

    if (isStandalone) {
      router.replace("/login")
    }
  }, [router])

  return null
}
