import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import AsignacionesClientPage from "./client-page";

export default async function AsignacionesPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (user.role === "delegate" || user.role === "witness") {
    redirect("/dashboard");
  }
  return <AsignacionesClientPage />;
}
