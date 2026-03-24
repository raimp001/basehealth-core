import Link from "next/link"
import { getServerSession } from "next-auth"
import { ResearchDashboard } from "@/components/admin/research-dashboard"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"

export default async function AdminResearchPage() {
  const session = await getServerSession()
  const role = (session?.user as any)?.role as string | undefined

  if (role !== "ADMIN") {
    return (
      <div className="min-h-screen bg-background text-foreground">
        <main className="mx-auto max-w-3xl px-4 sm:px-6 py-10">
          <Card>
            <CardHeader>
              <CardTitle>Admin only</CardTitle>
              <CardDescription>You must be signed in as an admin to use the auto-research worker.</CardDescription>
            </CardHeader>
            <CardContent>
              <Link href="/login" className="text-blue-700 hover:underline">
                Go to login
              </Link>
            </CardContent>
          </Card>
        </main>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background text-foreground">
      <main className="mx-auto w-full max-w-7xl px-4 sm:px-6 py-10">
        <ResearchDashboard />
      </main>
    </div>
  )
}
