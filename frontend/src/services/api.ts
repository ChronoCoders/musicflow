import axios from "axios";

const API_BASE_URL = "http://localhost:3001/api";

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    "Content-Type": "application/json",
  },
});

export const trackAPI = {
  // Get tracks for wallet
  getTracks: async (walletAddress: string) => {
    const response = await api.get(`/tracks/${walletAddress}`);
    return response.data;
  },

  // Register new track
  registerTrack: async (trackData: {
    trackId: string;
    title: string;
    walletAddress: string;
    txHash?: string;
  }) => {
    const response = await api.post("/tracks/register", trackData);
    return response.data;
  },

  // Add revenue
  addRevenue: async (revenueData: {
    trackId: string;
    amount: string;
    platform: string;
    txHash?: string;
  }) => {
    const response = await api.post("/tracks/revenue", revenueData);
    return response.data;
  },
};

export default api;
