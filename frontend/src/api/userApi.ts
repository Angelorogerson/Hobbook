import api from './axiosInstance'

export async function changePassword(currentPassword: string, newPassword: string): Promise<string> {
  const { data } = await api.put('/users/me/password', { currentPassword, newPassword })
  return data.message
}

export async function deleteAccount(password: string): Promise<string> {
  const { data } = await api.delete('/users/me', { data: { password } })
  return data.message
}
