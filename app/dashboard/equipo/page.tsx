import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import EquipoClientPage from "./client-page";

export default async function EquipoPage() {
  const user = await getCurrentUser();
  if (!user) {
    redirect("/login");
  }

  if (user.role === "delegate" || user.role === "witness") {
    redirect("/dashboard");
  }

  return <EquipoClientPage />;
}
