import "server-only"

import { getServerSession } from "next-auth"

export async function getSessionRole(): Promise<string | undefined> {
  const session = await getServerSession()
  const role = (session?.user as any)?.role
  return typeof role === "string" ? role : undefined
}

export async function isAdminSession(): Promise<boolean> {
  return (await getSessionRole()) === "ADMIN"
}
