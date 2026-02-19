import { redirect } from "next/navigation"
import { getCurrentUser } from "@/lib/auth"
import EvidenciaPage from "../evidencia/client-page"

export default async function EvidenciasPage() {
  const user = await getCurrentUser()
  if (!user) {
    redirect("/login")
  }

  return <EvidenciaPage initialViewerRole={user.role ?? null} />
}
