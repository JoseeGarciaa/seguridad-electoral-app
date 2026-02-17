import { redirect } from "next/navigation"
import { getCurrentUser } from "@/lib/auth"
import Resultados2022ClientPage from "@/app/dashboard/resultados-2022/client-page"

export default async function Resultados2022Page() {
  const user = await getCurrentUser()

  if (!user) {
    redirect("/login")
  }

  if (user.role !== "admin") {
    redirect("/dashboard")
  }

  return <Resultados2022ClientPage />
}
