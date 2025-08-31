import axios, { type AxiosInstance, type AxiosError } from "axios"

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:3001/api"

const api: AxiosInstance = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    "Content-Type": "application/json",
  },
  timeout: 10000, // 10 second timeout
})

// Request interceptor for debugging
api.interceptors.request.use(
  (config) => {
    console.log(`API Request: ${config.method?.toUpperCase()} ${config.url}`)
    return config
  },
  (error) => {
    console.error("Request error:", error)
    return Promise.reject(error)
  },
)

// Response interceptor for error handling
api.interceptors.response.use(
  (response) => {
    console.log(`API Response: ${response.status} ${response.config.url}`)
    return response
  },
  (error: AxiosError) => {
    console.error("API Error:", {
      status: error.response?.status,
      data: error.response?.data,
      message: error.message,
    })

    // Custom error messages
    if (error.code === "ECONNABORTED") {
      throw new Error("Request timeout - server might be down")
    }

    if (!error.response) {
      throw new Error("Network error - please check your connection")
    }

    const status = error.response.status
    const errorMessage = (error.response.data as any)?.message || error.message

    switch (status) {
      case 400:
        throw new Error(`Bad request: ${errorMessage}`)
      case 404:
        throw new Error("Resource not found")
      case 500:
        throw new Error("Server error - please try again later")
      default:
        throw new Error(`API Error (${status}): ${errorMessage}`)
    }
  },
)

// Type Definitions
export interface Revenue {
  amount: number
  platform: string
  createdAt: string
}

export interface Track {
  id: number
  trackId: string
  title: string
  totalEarnings: number
  createdAt: string
  revenues: Revenue[]
}

export interface RegisterTrackData {
  trackId: string
  title: string
  walletAddress: string
  txHash?: string
}

export interface AddRevenueData {
  trackId: string
  amount: string
  platform: string
  txHash?: string
}

// API Wrapper with enhanced error handling
export const trackAPI = {
  getTracks: async (walletAddress: string): Promise<Track[]> => {
    try {
      if (!walletAddress) {
        throw new Error("Wallet address is required")
      }

      const response = await api.get<Track[]>(`/tracks/${walletAddress}`)

      // Validate response data
      if (!Array.isArray(response.data)) {
        console.warn("Invalid tracks response format, returning empty array")
        return []
      }

      return response.data.map((track) => ({
        ...track,
        totalEarnings: Number(track.totalEarnings) || 0,
        revenues: Array.isArray(track.revenues) ? track.revenues : [],
      }))
    } catch (error: any) {
      console.error("Error fetching tracks:", error)

      // Return empty array instead of throwing for better UX
      if (error.response?.status === 404) {
        return [] // No tracks found is not an error
      }

      throw new Error(error.message || "Failed to fetch tracks")
    }
  },

  registerTrack: async (trackData: RegisterTrackData): Promise<Track> => {
    try {
      // Validate input data
      if (!trackData.trackId || !trackData.title || !trackData.walletAddress) {
        throw new Error("Missing required track data")
      }

      if (trackData.title.trim().length === 0) {
        throw new Error("Track title cannot be empty")
      }

      const response = await api.post<Track>("/tracks/register", {
        ...trackData,
        title: trackData.title.trim(),
      })

      return {
        ...response.data,
        totalEarnings: Number(response.data.totalEarnings) || 0,
        revenues: Array.isArray(response.data.revenues) ? response.data.revenues : [],
      }
    } catch (error: any) {
      console.error("Error registering track:", error)
      throw new Error(error.message || "Failed to register track")
    }
  },

  addRevenue: async (revenueData: AddRevenueData): Promise<Revenue> => {
    try {
      // Validate input data
      if (!revenueData.trackId || !revenueData.amount || !revenueData.platform) {
        throw new Error("Missing required revenue data")
      }

      const amount = Number.parseFloat(revenueData.amount)
      if (isNaN(amount) || amount <= 0) {
        throw new Error("Invalid revenue amount")
      }

      const response = await api.post<Revenue>("/tracks/revenue", {
        ...revenueData,
        amount: amount.toString(),
      })

      return {
        ...response.data,
        amount: Number(response.data.amount) || 0,
      }
    } catch (error: any) {
      console.error("Error adding revenue:", error)
      throw new Error(error.message || "Failed to add revenue")
    }
  },

  // Health check endpoint
  healthCheck: async (): Promise<{ status: string; timestamp: string }> => {
    try {
      const response = await api.get("/health")
      return response.data
    } catch (error: any) {
      console.error("Health check failed:", error)
      throw new Error("Backend service is unavailable")
    }
  },
}

export default api
