"use client"

import { Button } from "@/components/ui/button"
import { motion } from "framer-motion"
import { Shield, MapPin, Users, BarChart3, ArrowRight } from "lucide-react"
import Link from "next/link"

// Deterministic positions/delays to avoid SSR/client mismatches from Math.random.
const heatmapPoints = Array.from({ length: 20 }, (_, index) => ({
  left: `${10 + ((index * 37) % 80)}%`,
  top: `${20 + ((index * 29) % 70)}%`,
  delay: (index % 6) * 0.35,
}))

export function HeroSection() {
  return (
    <section className="relative min-h-screen flex items-center justify-center overflow-hidden pt-16">
      {/* Animated Background Elements */}
      <div className="absolute inset-0 overflow-hidden">
        <motion.div
          className="absolute top-1/4 left-1/4 w-96 h-96 bg-primary/10 rounded-full blur-3xl"
          animate={{
            scale: [1, 1.2, 1],
            opacity: [0.3, 0.5, 0.3],
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
            opacity: [0.3, 0.5, 0.3],
          }}
          transition={{
            duration: 8,
            repeat: Infinity,
            ease: "easeInOut",
            delay: 2,
          }}
        />
      </div>

      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
        <div className="grid lg:grid-cols-2 gap-12 items-center">
          {/* Left Content */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            className="text-center lg:text-left"
          >
            {/* Status Badge */}
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.2 }}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 border border-primary/20 mb-6"
            >
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-primary"></span>
              </span>
              <span className="text-sm font-medium text-primary">CENTRO DE COMANDO ACTIVO</span>
            </motion.div>

            {/* Main Headline */}
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold tracking-tight text-foreground mb-6 text-balance">
              <span className="block">Menos caos.</span>
              <span className="block text-primary text-glow">Más control.</span>
              <span className="block">Cero sorpresas.</span>
            </h1>

            <p className="text-lg text-muted-foreground mb-8 max-w-xl mx-auto lg:mx-0 text-pretty">
              War Room digital premium para campañas políticas en Colombia. 
              Control total del territorio, evidencia en tiempo real, cero improvisación.
            </p>

            {/* CTA Buttons */}
            <div className="flex flex-col sm:flex-row gap-4 justify-center lg:justify-start">
              <Link href="/login">
                <Button size="lg" className="bg-primary text-primary-foreground hover:bg-primary/90 glow-green w-full sm:w-auto">
                  Acceder al Centro de Comando
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </Link>
              <Link href="#features">
                <Button size="lg" variant="outline" className="border-border/50 hover:bg-secondary w-full sm:w-auto bg-transparent">
                  Ver Funciones
                </Button>
              </Link>
            </div>

            {/* Quick Stats */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.6 }}
              className="mt-12 grid grid-cols-3 gap-6"
            >
              <div className="text-center lg:text-left">
                <div className="text-2xl font-bold text-foreground">100%</div>
                <div className="text-xs text-muted-foreground">Cobertura DIVIPOLE</div>
              </div>
              <div className="text-center lg:text-left">
                <div className="text-2xl font-bold text-foreground">Tiempo Real</div>
                <div className="text-xs text-muted-foreground">Evidencia Electoral</div>
              </div>
              <div className="text-center lg:text-left">
                <div className="text-2xl font-bold text-foreground">Cero</div>
                <div className="text-xs text-muted-foreground">Excel Necesario</div>
              </div>
            </motion.div>
          </motion.div>

          {/* Right Content - Visual Preview */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.8, delay: 0.3 }}
            className="relative hidden lg:block"
          >
            <div className="relative w-full aspect-square max-w-lg mx-auto">
              {/* Main Dashboard Preview */}
              <div className="absolute inset-0 glass rounded-2xl border border-border/50 overflow-hidden glow-green">
                <div className="p-4 border-b border-border/50">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full bg-neon-red" />
                    <div className="w-3 h-3 rounded-full bg-neon-orange" />
                    <div className="w-3 h-3 rounded-full bg-neon-green" />
                  </div>
                </div>
                <div className="p-6 space-y-4">
                  {/* Simulated Map */}
                  <div className="relative h-40 bg-secondary/50 rounded-lg overflow-hidden">
                    <div className="absolute inset-0 flex items-center justify-center">
                      <MapPin className="w-8 h-8 text-primary animate-pulse" />
                    </div>
                    <div className="absolute top-2 left-2 text-xs font-mono text-muted-foreground">
                      MAPA TERRITORIAL
                    </div>
                    {/* Simulated heatmap dots */}
                    {heatmapPoints.map((point, i) => (
                      <motion.div
                        key={i}
                        className="absolute w-2 h-2 rounded-full bg-primary/60"
                        style={{
                          left: point.left,
                          top: point.top,
                        }}
                        animate={{
                          scale: [1, 1.5, 1],
                          opacity: [0.6, 1, 0.6],
                        }}
                        transition={{
                          duration: 2,
                          repeat: Infinity,
                          delay: point.delay,
                        }}
                      />
                    ))}
                  </div>
                  
                  {/* Simulated Stats */}
                  <div className="grid grid-cols-2 gap-3">
                    <div className="bg-secondary/50 rounded-lg p-3">
                      <div className="text-xs text-muted-foreground mb-1">Puestos Cubiertos</div>
                      <div className="text-xl font-bold text-primary">1,247</div>
                    </div>
                    <div className="bg-secondary/50 rounded-lg p-3">
                      <div className="text-xs text-muted-foreground mb-1">Testigos Activos</div>
                      <div className="text-xl font-bold text-foreground">892</div>
                    </div>
                  </div>
                  
                  {/* Simulated Alert */}
                  <div className="bg-primary/10 border border-primary/20 rounded-lg p-3 flex items-center gap-3">
                    <Shield className="w-5 h-5 text-primary" />
                    <div className="flex-1">
                      <div className="text-xs font-medium text-foreground">Sistema Operativo</div>
                      <div className="text-xs text-muted-foreground">Monitoreo activo en 32 departamentos</div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Floating Elements */}
              <motion.div
                className="absolute -top-4 -right-4 glass rounded-xl border border-border/50 p-3"
                animate={{ y: [0, -10, 0] }}
                transition={{ duration: 4, repeat: Infinity }}
              >
                <Users className="w-6 h-6 text-primary" />
              </motion.div>
              
              <motion.div
                className="absolute -bottom-4 -left-4 glass rounded-xl border border-border/50 p-3"
                animate={{ y: [0, 10, 0] }}
                transition={{ duration: 4, repeat: Infinity, delay: 1 }}
              >
                <BarChart3 className="w-6 h-6 text-accent" />
              </motion.div>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  )
}
