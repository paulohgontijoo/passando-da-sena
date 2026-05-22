import { redirect } from "next/navigation"
import { Nav } from "@/components/Nav"
import { createClient } from "@/utils/supabase/server"
import { AnalyticsClient } from "./AnalyticsClient"

export default async function AnalyticsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect("/login")

  return (
    <div className="flex flex-col h-screen overflow-hidden bg-primary">
      <Nav />
      <div className="flex-1 overflow-hidden">
        <AnalyticsClient />
      </div>
    </div>
  )
}
