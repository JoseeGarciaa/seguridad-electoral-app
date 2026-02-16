import React from "react"
import { getCurrentUser } from "@/lib/auth"
import { redirect } from "next/navigation"
import { DashboardSidebar } from "@/components/dashboard/sidebar"
import { DashboardHeader } from "@/components/dashboard/header"

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const user = await getCurrentUser()
  
  if (!user) {
    redirect("/login")
  }

  return (
    <div className="min-h-screen overflow-x-hidden bg-background">
      <DashboardSidebar user={user} />
      <div className="lg:pl-64">
        <DashboardHeader user={user} />
        <main className="p-4 pb-24 lg:p-6 lg:pb-6">
          {children}
        </main>
      </div>
    </div>
  )
}
