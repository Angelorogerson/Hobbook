import axiosInstance from './axiosInstance'

export interface UserProfile {
  _id: string
  name: string
  email: string
  role: 'user' | 'admin'
  city?: string
  phone?: string
  sports?: string[]
  avatar?: string
  isActive: boolean
  createdAt: string
  updatedAt: string
}

export interface UserUpdateInput {
  name?: string
  city?: string
  phone?: string
  sports?: string[]
  avatar?: string
}

export interface PasswordChangeInput {
  currentPassword: string
  newPassword: string
  confirmPassword: string
}

// Get user profile
export async function getUserProfile() {
  try {
    const { data } = await axiosInstance.get<{ data: UserProfile }>('/users/me')
    return data.data
  } catch (error: any) {
    throw new Error(error.response?.data?.message || 'Failed to fetch profile')
  }
}

// Update user profile
export async function updateUserProfile(userData: UserUpdateInput) {
  try {
    const { data } = await axiosInstance.put<{ data: UserProfile }>('/users/me', userData)
    return data.data
  } catch (error: any) {
    throw new Error(error.response?.data?.message || 'Failed to update profile')
  }
}

// Change password
export async function changePassword(passwordData: PasswordChangeInput) {
  try {
    const { data } = await axiosInstance.post<{ message: string }>('/users/change-password', {
      currentPassword: passwordData.currentPassword,
      newPassword: passwordData.newPassword,
    })
    return data.message
  } catch (error: any) {
    throw new Error(error.response?.data?.message || 'Failed to change password')
  }
}

// Get all users (admin only)
export async function getAllUsers(params?: { skip?: number; limit?: number }) {
  try {
    const { data } = await axiosInstance.get<{ data?: UserProfile[]; users?: UserProfile[] }>('/users', { params })
    return data.users || data.data || []
  } catch (error: any) {
    throw new Error(error.response?.data?.message || 'Failed to fetch users')
  }
}

// Get user by ID (admin only)
export async function getUserById(id: string) {
  try {
    const { data } = await axiosInstance.get<{ data: UserProfile }>(`/users/${id}`)
    return data.data
  } catch (error: any) {
    throw new Error(error.response?.data?.message || 'Failed to fetch user')
  }
}

// ─── FAVORITES ───
// Get user's favorites
export async function getFavorites() {
  try {
    const { data } = await axiosInstance.get<{ favorites: string[] }>('/users/me/favorites')
    return data.favorites
  } catch (error: any) {
    throw new Error(error.response?.data?.message || 'Failed to fetch favorites')
  }
}

// Add venue to favorites
export async function addFavorite(venueId: string) {
  try {
    const { data } = await axiosInstance.post<{ favorites: string[] }>('/users/me/favorites', {
      venueId,
    })
    return data.favorites
  } catch (error: any) {
    throw new Error(error.response?.data?.message || 'Failed to add favorite')
  }
}

// Remove venue from favorites
export async function removeFavorite(venueId: string) {
  try {
    const { data } = await axiosInstance.delete<{ favorites: string[] }>('/users/me/favorites', {
      params: { venueId },
    })
    return data.favorites
  } catch (error: any) {
    throw new Error(error.response?.data?.message || 'Failed to remove favorite')
  }
}
