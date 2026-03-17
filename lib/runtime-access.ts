import { isAdminEmail } from '@/lib/admin-access'

export function isRuntimeAdmin(token: { email?: unknown } | null | undefined): boolean {
  const email = typeof token?.email === 'string' ? token.email : ''
  return isAdminEmail(email)
}

export function getRuntimeActor(token: { id?: unknown; email?: unknown } | null | undefined) {
  return {
    id: typeof token?.id === 'string' ? token.id : undefined,
    email: typeof token?.email === 'string' ? token.email : undefined,
  }
}
