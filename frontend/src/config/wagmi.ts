import { createConfig, http } from "wagmi"
import { polygon, polygonAmoy } from "wagmi/chains"
import { injected, metaMask } from "wagmi/connectors"

// Use environment variables for API keys
const ALCHEMY_API_KEY = import.meta.env.VITE_ALCHEMY_API_KEY || "EIYf5Nk7kP7QyWTCsU4IB"

// Configure for both mainnet and testnet
const isDevelopment = import.meta.env.DEV

export const config = createConfig({
  chains: isDevelopment ? [polygonAmoy, polygon] : [polygon],
  connectors: [injected(), metaMask()],
  transports: {
    [polygon.id]: http(`https://polygon-mainnet.g.alchemy.com/v2/${ALCHEMY_API_KEY}`),
    [polygonAmoy.id]: http(`https://polygon-amoy.g.alchemy.com/v2/${ALCHEMY_API_KEY}`),
  },
  ssr: false,
})

declare module "wagmi" {
  interface Register {
    config: typeof config
  }
}
