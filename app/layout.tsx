import React from "react"
import type { Metadata, Viewport } from 'next'
import { Geist, Geist_Mono } from 'next/font/google'
import { Analytics } from '@vercel/analytics/next'
import './globals.css'
import { SwRegister } from "@/components/pwa/sw-register"

const _geist = Geist({ subsets: ["latin"] });
const _geistMono = Geist_Mono({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: 'Defensa Electoral | Centro de Comando',
  description: 'War Room digital premium para campañas políticas. Control total del territorio, evidencia en tiempo real, cero improvisación.',
  generator: 'v0.app',
  applicationName: 'Defensa Electoral',
  manifest: '/manifest.webmanifest',
  icons: {
    icon: '/123.jpeg',
    apple: '/123.jpeg',
  },
}

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: '#0b0c12',
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="es">
      <body className={`font-sans antialiased`}>
        {children}
        <SwRegister />
        <Analytics />
      </body>
    </html>
  )
}
