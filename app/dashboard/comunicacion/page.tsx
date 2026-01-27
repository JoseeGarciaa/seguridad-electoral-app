import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import ComunicacionClientPage from "./client-page";

export default async function ComunicacionPage() {
  const user = await getCurrentUser();
  if (!user) {
    redirect("/login");
  }

  if (user.role === "delegate" || user.role === "witness") {
    redirect("/dashboard");
  }

  return <ComunicacionClientPage />;
}
