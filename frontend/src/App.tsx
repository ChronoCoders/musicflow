"use client"

import { WagmiProvider } from "wagmi"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { config } from "./config/wagmi"
import Dashboard from "./components/Dashboard"
import "./App.css"
import React from "react"

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 3,
      staleTime: 1000 * 60 * 5, // 5 minutes
      refetchOnWindowFocus: false,
    },
    mutations: {
      retry: 1,
    },
  },
})

// Simple Error Boundary
class ErrorBoundary extends React.Component<{ children: React.ReactNode }, { hasError: boolean; error?: Error }> {
  constructor(props: { children: React.ReactNode }) {
    super(props)
    this.state = { hasError: false }
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error("Error caught by boundary:", error, errorInfo)
  }

  render() {
    if (this.state.hasError) {
      return (
        <div
          style={{
            padding: "40px",
            textAlign: "center",
            backgroundColor: "#ffebee",
            minHeight: "100vh",
            display: "flex",
            flexDirection: "column",
            justifyContent: "center",
            alignItems: "center",
          }}
        >
          <h1 style={{ color: "#c62828", marginBottom: "20px" }}>Something went wrong</h1>
          <p style={{ color: "#666", marginBottom: "20px" }}>
            The application encountered an unexpected error. Please try refreshing the page.
          </p>
          <button
            onClick={() => window.location.reload()}
            style={{
              padding: "10px 20px",
              backgroundColor: "#2196F3",
              color: "white",
              border: "none",
              borderRadius: "4px",
              cursor: "pointer",
            }}
          >
            Reload Page
          </button>
          <details style={{ marginTop: "20px", textAlign: "left" }}>
            <summary style={{ cursor: "pointer", color: "#666" }}>Technical Details</summary>
            <pre
              style={{
                backgroundColor: "#f5f5f5",
                padding: "10px",
                borderRadius: "4px",
                fontSize: "12px",
                overflow: "auto",
                maxWidth: "500px",
              }}
            >
              {this.state.error?.stack || this.state.error?.message || "Unknown error"}
            </pre>
          </details>
        </div>
      )
    }

    return this.props.children
  }
}

function App() {
  return (
    <ErrorBoundary>
      <WagmiProvider config={config}>
        <QueryClientProvider client={queryClient}>
          <div className="App">
            <header
              style={{
                textAlign: "center",
                padding: "20px 0",
                borderBottom: "1px solid #e0e0e0",
                marginBottom: "20px",
              }}
            >
              <h1
                style={{
                  color: "#2196F3",
                  margin: 0,
                  fontSize: "2.5rem",
                  fontWeight: "bold",
                }}
              >
                🎵 MusicFlow
              </h1>
              <p
                style={{
                  color: "#666",
                  margin: "10px 0 0 0",
                  fontSize: "1.1rem",
                }}
              >
                Decentralized Music Royalty Distribution
              </p>
            </header>
            <Dashboard />
          </div>
        </QueryClientProvider>
      </WagmiProvider>
    </ErrorBoundary>
  )
}

export default App
