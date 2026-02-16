"use client"

import { useEffect } from "react"

const SW_VERSION = "2026-02-16-v5"

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
        try {
          const storedVersion = localStorage.getItem("sw-version")
          if (storedVersion !== SW_VERSION && "caches" in window) {
            const keys = await caches.keys()
            await Promise.all(keys.map((key) => caches.delete(key)))
            localStorage.setItem("sw-version", SW_VERSION)
          }
        } catch {
          // ignore storage/cache access restrictions and continue registration
        }

        const registration = await navigator.serviceWorker.register(`/sw.js?v=${SW_VERSION}`)
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
