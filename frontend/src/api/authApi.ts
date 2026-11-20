import api from './axiosInstance'
import type { User } from '@/store/AuthContext'

/** Tokens in email links are 32 random bytes as hex. Anything else cannot be a valid link. */
export const isLinkToken = (token: string | undefined): token is string => !!token && /^[a-f0-9]{64}$/.test(token)

/** Ask for a link to set a new password. The answer is the same whether or not the account exists. */
export async function requestPasswordReset(email: string): Promise<string> {
  const { data } = await api.post('/auth/forgot', { email })
  return data.message
}

/** Set a new password with the token from the email. Answers like a login. */
export async function resetPassword(token: string, password: string): Promise<{ token: string; user: User }> {
  const { data } = await api.post('/auth/reset', { token, password })
  return { token: data.token, user: data.user }
}

export async function verifyEmail(token: string): Promise<{ message: string; alreadyVerified: boolean }> {
  const { data } = await api.post('/auth/verify', { token })
  return { message: data.message, alreadyVerified: data.alreadyVerified === true }
}

/** Send a fresh confirmation link to the signed-in person. */
export async function resendVerification(): Promise<{ message: string; emailVerified: boolean }> {
  const { data } = await api.post('/auth/verify/resend')
  return { message: data.message, emailVerified: data.emailVerified === true }
}
