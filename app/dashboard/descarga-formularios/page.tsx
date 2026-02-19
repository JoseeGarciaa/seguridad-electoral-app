import { getCurrentUser } from "@/lib/auth"
import { redirect } from "next/navigation"
import { FormDownloadClient } from "@/components/dashboard/form-download-client"

export default async function DescargaFormulariosPage() {
  const user = await getCurrentUser()
  if (!user) {
    redirect("/login")
  }

  if (user.role !== "admin") {
    redirect("/dashboard")
  }

  return <FormDownloadClient />
}
