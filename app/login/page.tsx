"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Shield, Eye, EyeOff, Loader2 } from "lucide-react"
import Image from "next/image"
import { motion } from "framer-motion"
import { login, register } from "@/app/actions/auth"

export default function LoginPage() {
  const [isLogin, setIsLogin] = useState(true)
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isStandalone, setIsStandalone] = useState<boolean | null>(null)
  const router = useRouter()

  // Collage images from public/; cycles every 3.5s.
  const collageImages = ["/123.jpeg"]
  const [active, setActive] = useState(0)

  // Simple auto-advance for collage; pauses on empty list.
  useEffect(() => {
    if (collageImages.length <= 1) return
    const id = setInterval(() => {
      setActive((current) => (current + 1) % collageImages.length)
    }, 3500)
    return () => clearInterval(id)
  }, [collageImages.length])

  useEffect(() => {
    const standalone =
      window.matchMedia("(display-mode: standalone)").matches ||
      ("standalone" in navigator && (navigator as Navigator & { standalone?: boolean }).standalone)
    setIsStandalone(Boolean(standalone))
  }, [])

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setLoading(true)
    setError(null)

    const formData = new FormData(event.currentTarget)
    
    try {
      const result = isLogin 
        ? await login(formData)
        : await register(formData)
      
      if (result.success) {
        router.push("/dashboard")
      } else {
        setError(result.error || "Error de autenticación")
      }
    } catch (err: any) {
      setError(err?.message || "Error de conexión")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-[100dvh] overflow-hidden bg-background grid-background flex items-center justify-center px-4 py-6 sm:py-10">
      {/* Background Effects */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <motion.div
          className="absolute top-1/4 left-1/4 w-96 h-96 bg-primary/10 rounded-full blur-3xl"
          animate={{
            scale: [1, 1.2, 1],
            opacity: [0.2, 0.4, 0.2],
          }}
          transition={{
            duration: 8,
            repeat: Infinity,
            ease: "easeInOut",
          }}
        />
        <motion.div
          className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-accent/10 rounded-full blur-3xl"
          animate={{
            scale: [1.2, 1, 1.2],
            opacity: [0.2, 0.4, 0.2],
          }}
          transition={{
            duration: 8,
            repeat: Infinity,
            ease: "easeInOut",
            delay: 2,
          }}
        />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className={`relative w-full ${isStandalone ? "max-w-[620px]" : "max-w-[620px] sm:max-w-lg lg:max-w-6xl"} mx-auto flex flex-col justify-center`}
      >
        <div className={`flex flex-col gap-4 ${isStandalone ? "items-center" : ""} items-stretch`}>
        {/* Login Card */}
        <div className={`order-2 glass rounded-2xl border border-border/50 p-7 sm:p-12 shadow-lg w-[84%] sm:w-[70%] mx-auto ${isStandalone ? "max-w-[620px]" : ""}`}>
          {/* Header */}
          <div className="text-center mb-6">
            <Link href="/" className="inline-flex items-center gap-2 mb-6">
              <div className="relative">
                <Shield className="w-10 h-10 text-primary" />
                <div className="absolute inset-0 blur-md bg-primary/30" />
              </div>
            </Link>
            <h1 className="text-2xl sm:text-3xl font-bold text-foreground mb-2">
              {isLogin ? "Centro de Comando" : "Crear Cuenta"}
            </h1>
            <p className="text-sm text-muted-foreground">
              {isLogin 
                ? "Accede a tu War Room electoral" 
                : "Únete al equipo de campaña"
              }
            </p>
          </div>

          {/* Error Message */}
          {error && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="mb-4 p-3 rounded-lg bg-destructive/10 border border-destructive/20 text-sm text-destructive"
            >
              {error}
            </motion.div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-3">
            {!isLogin && (
              <div className="space-y-2">
                <Label htmlFor="name" className="text-sm text-foreground">Nombre</Label>
                <Input
                  id="name"
                  name="name"
                  type="text"
                  placeholder="Tu nombre"
                  className="bg-secondary/50 border-border/50 focus:border-primary"
                />
              </div>
            )}
            
            <div className="space-y-2">
              <Label htmlFor="email" className="text-sm text-foreground">Email</Label>
              <Input
                id="email"
                name="email"
                type="email"
                placeholder="tu@email.com"
                required
                className="bg-secondary/50 border-border/50 focus:border-primary"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="password" className="text-sm text-foreground">Contraseña</Label>
              <div className="relative">
                <Input
                  id="password"
                  name="password"
                  type={showPassword ? "text" : "password"}
                  placeholder="••••••••"
                  required
                  minLength={8}
                  className="bg-secondary/50 border-border/50 focus:border-primary pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <Button
              type="submit"
              disabled={loading}
              className="w-full bg-primary text-primary-foreground hover:bg-primary/90 glow-green text-base sm:text-lg py-3"
            >
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  {isLogin ? "Ingresando..." : "Registrando..."}
                </>
              ) : (
                isLogin ? "Ingresar al Centro" : "Crear Cuenta"
              )}
            </Button>
          </form>

          {/* Toggle */}
          <div className="mt-4 text-center">
            <button
              type="button"
              onClick={() => {
                setIsLogin(!isLogin)
                setError(null)
              }}
              className="text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              {isLogin 
                ? "¿No tienes cuenta? Regístrate" 
                : "¿Ya tienes cuenta? Inicia sesión"
              }
            </button>
          </div>

          {/* Back to home */}
          <div className="mt-2 text-center">
            <Link href="/" className="text-xs text-muted-foreground hover:text-foreground transition-colors">
              ← Volver al inicio
            </Link>
          </div>
        </div>

        {/* Collage (web only) */}
        {isStandalone === false && (
          <div className="order-1 glass rounded-2xl border border-border/50 overflow-hidden shadow-lg bg-secondary/40 w-[84%] sm:w-[70%] mx-auto aspect-video">
            <div className="relative h-full bg-gradient-to-br from-primary/15 via-background/5 to-accent/10 flex items-center justify-center">
              {collageImages.map((src, index) => (
                <motion.div
                  key={src}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: index === active ? 1 : 0 }}
                  transition={{ duration: 0.6 }}
                  className="absolute inset-0"
                >
                  <div className="absolute inset-0 flex items-center justify-center p-3 md:p-4">
                    <Image
                      src={src}
                      alt="Collage de territorio"
                      fill
                      priority={index === 0}
                      sizes="(max-width: 768px) 100vw, 50vw"
                      className="object-cover"
                    />
                  </div>
                </motion.div>
              ))}
              <div className="absolute inset-x-0 bottom-0 flex justify-center gap-2 pb-2">
                {collageImages.map((_, index) => (
                  <button
                    key={index}
                    aria-label={`Ver imagen ${index + 1}`}
                    onClick={() => setActive(index)}
                    className={`h-1.5 w-6 rounded-full transition-all ${
                      index === active ? "bg-primary" : "bg-primary/30"
                    }`}
                  />
                ))}
              </div>
            </div>
            <div className="p-3 border-t border-border/40 text-sm text-muted-foreground flex items-center gap-2">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-primary"></span>
              </span>
              Collage de territorio (alta resolución).
            </div>
          </div>
        )}
        </div>
      </motion.div>
    </div>
  )
}
