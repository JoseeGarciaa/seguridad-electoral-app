import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import SimpatizantesClientPage from "./client-page";

export default async function SimpatizantesPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (user.role === "delegate" || user.role === "witness") {
    redirect("/dashboard");
  }
  return <SimpatizantesClientPage />;
}
