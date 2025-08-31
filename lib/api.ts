interface Revenue {
  amount: number
  platform: string
  createdAt: string
}

interface Track {
  id: number
  trackId: string
  title: string
  totalEarnings: number
  createdAt: string
  revenues: Revenue[]
}

interface RegisterTrackData {
  trackId: string
  title: string
  walletAddress: string
  txHash?: string
}

interface AddRevenueData {
  trackId: string
  amount: string
  platform: string
  txHash?: string
}

const API_BASE_URL = "/api"

class APIError extends Error {
  constructor(
    message: string,
    public status?: number,
  ) {
    super(message)
    this.name = "APIError"
  }
}

async function apiRequest<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const url = `${API_BASE_URL}${endpoint}`

  try {
    const response = await fetch(url, {
      headers: {
        "Content-Type": "application/json",
        ...options.headers,
      },
      ...options,
    })

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}))
      throw new APIError(errorData.error || `HTTP ${response.status}: ${response.statusText}`, response.status)
    }

    return await response.json()
  } catch (error) {
    if (error instanceof APIError) {
      throw error
    }

    console.error("API Request failed:", error)
    throw new APIError("Network error - please check your connection")
  }
}

export const trackAPI = {
  getTracks: async (walletAddress: string): Promise<Track[]> => {
    if (!walletAddress) {
      throw new APIError("Wallet address is required")
    }

    try {
      const tracks = await apiRequest<Track[]>(`/tracks/${walletAddress}`)

      return Array.isArray(tracks)
        ? tracks.map((track) => ({
            ...track,
            totalEarnings: Number(track.totalEarnings) || 0,
            revenues: Array.isArray(track.revenues) ? track.revenues : [],
          }))
        : []
    } catch (error) {
      if (error instanceof APIError && error.status === 404) {
        return [] // No tracks found is not an error
      }
      throw error
    }
  },

  registerTrack: async (trackData: RegisterTrackData): Promise<Track> => {
    if (!trackData.trackId || !trackData.title || !trackData.walletAddress) {
      throw new APIError("Missing required track data")
    }

    if (trackData.title.trim().length === 0) {
      throw new APIError("Track title cannot be empty")
    }

    const track = await apiRequest<Track>("/tracks/register", {
      method: "POST",
      body: JSON.stringify({
        ...trackData,
        title: trackData.title.trim(),
      }),
    })

    return {
      ...track,
      totalEarnings: Number(track.totalEarnings) || 0,
      revenues: Array.isArray(track.revenues) ? track.revenues : [],
    }
  },

  addRevenue: async (revenueData: AddRevenueData): Promise<Revenue> => {
    if (!revenueData.trackId || !revenueData.amount || !revenueData.platform) {
      throw new APIError("Missing required revenue data")
    }

    const amount = Number.parseFloat(revenueData.amount)
    if (isNaN(amount) || amount <= 0) {
      throw new APIError("Invalid revenue amount")
    }

    const revenue = await apiRequest<Revenue>("/tracks/revenue", {
      method: "POST",
      body: JSON.stringify({
        ...revenueData,
        amount: amount.toString(),
      }),
    })

    return {
      ...revenue,
      amount: Number(revenue.amount) || 0,
    }
  },

  healthCheck: async (): Promise<{ status: string; timestamp: string }> => {
    return await apiRequest("/health")
  },
}

export type { Track, Revenue, RegisterTrackData, AddRevenueData }
