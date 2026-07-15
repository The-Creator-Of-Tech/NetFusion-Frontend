import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import DashboardNav from "@/components/DashboardNav";
import DashboardClient from "@/components/dashboard/DashboardClient";

export default async function DashboardPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  return (
    <div className="min-h-screen bg-background text-foreground">
      <DashboardNav
        userName={session.user.name}
        userRole={session.user.role}
      />

      <main className="max-w-6xl mx-auto px-6 py-10">
        <DashboardClient />
      </main>
    </div>
  );
}
