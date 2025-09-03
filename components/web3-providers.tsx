"use client"

import { WagmiProvider } from "wagmi"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { createConfig, http } from "wagmi"
import { polygon, polygonAmoy } from "wagmi/chains"
import { injected } from "@wagmi/connectors"
import type { ReactNode } from "react"

const ALCHEMY_API_KEY = process.env.NEXT_PUBLIC_ALCHEMY_API_KEY || "demo"

const config = createConfig({
  chains: [polygonAmoy, polygon],
  connectors: [injected()],
  transports: {
    [polygon.id]: http(`https://polygon-mainnet.g.alchemy.com/v2/${ALCHEMY_API_KEY}`),
    [polygonAmoy.id]: http(`https://polygon-amoy.g.alchemy.com/v2/${ALCHEMY_API_KEY}`),
  },
  ssr: false,
})

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 3,
      staleTime: 1000 * 60 * 5,
      refetchOnWindowFocus: false,
    },
    mutations: {
      retry: 1,
    },
  },
})

interface Web3ProvidersProps {
  children: ReactNode
}

export function Web3Providers({ children }: Web3ProvidersProps) {
  return (
    <WagmiProvider config={config}>
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    </WagmiProvider>
  )
}
