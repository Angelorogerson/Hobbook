import api, { TOKEN_KEY } from './axiosInstance'

export async function changePassword(currentPassword: string, newPassword: string): Promise<string> {
  const { data } = await api.put('/users/me/password', { currentPassword, newPassword })
  // Older sessions end with the password change; keep this device signed in with the new one.
  if (data.token) localStorage.setItem(TOKEN_KEY, data.token)
  return data.message
}

export async function deleteAccount(password: string): Promise<string> {
  const { data } = await api.delete('/users/me', { data: { password } })
  return data.message
}
