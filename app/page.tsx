"use client"

import { MusicFlowDashboard } from "@/components/musicflow-dashboard"
import { Web3Providers } from "@/components/web3-providers"

export default function MusicFlowPage() {
  return (
    <Web3Providers>
      <div className="min-h-screen bg-background">
        <header className="border-b bg-card">
          <div className="container mx-auto px-4 py-6">
            <div className="text-center">
              <h1 className="text-4xl font-bold text-primary mb-2">MusicFlow</h1>
              <p className="text-xl text-muted-foreground">Decentralized Music Royalty Distribution</p>
            </div>
          </div>
        </header>
        <main>
          <MusicFlowDashboard />
        </main>
      </div>
    </Web3Providers>
  )
}
