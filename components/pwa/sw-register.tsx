"use client"

import { useEffect } from "react"

export function SwRegister() {
  useEffect(() => {
    if (process.env.NODE_ENV !== "production") return
    if (!("serviceWorker" in navigator)) return

    let didRefresh = false
    const onControllerChange = () => {
      if (didRefresh) return
      didRefresh = true
      window.location.reload()
    }

    navigator.serviceWorker.addEventListener("controllerchange", onControllerChange)

    const register = async () => {
      try {
        const registration = await navigator.serviceWorker.register("/sw.js")
        await registration.update()
      } catch (error) {
        console.error("Service worker registration failed", error)
      }
    }

    register()

    return () => {
      navigator.serviceWorker.removeEventListener("controllerchange", onControllerChange)
    }
  }, [])

  return null
}
