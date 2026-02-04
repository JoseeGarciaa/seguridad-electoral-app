"use client"

import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Shield, Menu, X } from "lucide-react"
import { useState } from "react"
import { motion, AnimatePresence } from "framer-motion"

export function LandingHeader() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

  return (
    <header className="fixed top-0 left-0 right-0 z-50 glass border-b border-border/50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-14 sm:h-16">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2">
            <div className="relative">
              <Shield className="w-7 h-7 sm:w-8 sm:h-8 text-primary" />
              <div className="absolute inset-0 blur-md bg-primary/30" />
            </div>
            <span className="font-bold text-base sm:text-lg tracking-tight text-foreground">
              DEFENSA ELECTORAL
            </span>
          </Link>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center gap-8">
            <Link href="#features" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
              Funciones
            </Link>
            <Link href="#stats" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
              Impacto
            </Link>
            <Link href="#contact" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
              Contacto
            </Link>
          </nav>

          {/* Desktop CTA */}
          <div className="hidden md:flex items-center gap-4">
            <Link href="/login">
              <Button variant="ghost" size="sm" className="text-muted-foreground hover:text-foreground">
                Iniciar Sesión
              </Button>
            </Link>
            <Link href="/login">
              <Button size="sm" className="bg-primary text-primary-foreground hover:bg-primary/90 glow-green">
                Acceder al Centro
              </Button>
            </Link>
          </div>

          {/* Mobile Menu Button */}
          <button
            className="md:hidden p-2 text-muted-foreground hover:text-foreground"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          >
            {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>
      </div>

      {/* Mobile Menu */}
      <AnimatePresence>
        {mobileMenuOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="md:hidden glass border-t border-border/50"
          >
            <div className="px-4 py-6 space-y-4">
              <Link href="#features" className="block text-sm text-muted-foreground hover:text-foreground">
                Funciones
              </Link>
              <Link href="#stats" className="block text-sm text-muted-foreground hover:text-foreground">
                Impacto
              </Link>
              <Link href="#contact" className="block text-sm text-muted-foreground hover:text-foreground">
                Contacto
              </Link>
              <div className="pt-4 border-t border-border/50 space-y-2">
                <Link href="/login" className="block">
                  <Button variant="ghost" className="w-full text-muted-foreground">
                    Iniciar Sesión
                  </Button>
                </Link>
                <Link href="/login" className="block">
                  <Button className="w-full bg-primary text-primary-foreground">
                    Acceder al Centro
                  </Button>
                </Link>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  )
}
