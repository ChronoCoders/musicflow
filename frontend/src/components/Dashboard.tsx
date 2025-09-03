"use client"

import type React from "react"
import { useState, useEffect, useCallback } from "react"
import {
  useAccount,
  useConnect,
  useDisconnect,
  useReadContract,
  useWriteContract,
  useWaitForTransactionReceipt,
  useSwitchChain,
} from "wagmi"
import { readContract } from "@wagmi/core"
  import { parseEther, keccak256, toBytes, formatEther, parseGwei, isAddress } from "viem"
  import { polygonAmoy } from "wagmi/chains"
  import { config } from "../config/wagmi"
import { ROYALTY_DISTRIBUTOR_ADDRESS, ROYALTY_DISTRIBUTOR_ABI } from "../contracts/RoyaltyDistributor"
import { trackAPI } from "../services/api"
import AnalyticsDashboard from "./AnalyticsDashboard"

interface Track {
  id: number
  trackId: string
  title: string
  totalEarnings: number
  createdAt: string
  revenues: Array<{ amount: number; platform: string; createdAt: string }>
}

interface RightHolder {
  address: string
  percentage: number
}

// Enhanced gas optimization with current Polygon gas prices
const getOptimizedGasConfig = (functionName: string) => {
  const baseConfigs = {
    registerTrack: {
      gas: 400000n,
      maxFeePerGas: parseGwei("50"),
      maxPriorityFeePerGas: parseGwei("30"),
    },
    addRevenue: {
      gas: 300000n,
      maxFeePerGas: parseGwei("45"),
      maxPriorityFeePerGas: parseGwei("25"),
    },
    withdraw: {
      gas: 100000n,
      maxFeePerGas: parseGwei("40"),
      maxPriorityFeePerGas: parseGwei("20"),
    },
    default: {
      gas: 250000n,
      maxFeePerGas: parseGwei("45"),
      maxPriorityFeePerGas: parseGwei("25"),
    },
  }

  return baseConfigs[functionName as keyof typeof baseConfigs] || baseConfigs.default
}

const Dashboard: React.FC = () => {
  const { address, isConnected, chain } = useAccount()
  const { connect, connectors, isPending: isConnecting } = useConnect()
  const { disconnect } = useDisconnect()
  const { switchChain } = useSwitchChain()
  const { writeContract, isPending: isWritePending, data: hash } = useWriteContract()

  // Transaction confirmation
  const { isLoading: isConfirming, isSuccess: isConfirmed } = useWaitForTransactionReceipt({
    hash,
  })

  // State management
  const [trackName, setTrackName] = useState("")
  const [revenueAmount, setRevenueAmount] = useState("")
  const [selectedTrackId, setSelectedTrackId] = useState("")
  const [tracks, setTracks] = useState<Track[]>([])
  const [loading, setLoading] = useState(false)
  const [activeTab, setActiveTab] = useState<"overview" | "analytics">("overview")
  const [rightHolders, setRightHolders] = useState<RightHolder[]>([{ address: "", percentage: 100 }])
  const [errors, setErrors] = useState({
    rightHolders: "",
    revenue: "",
    general: "",
  })

  // Contract reads
  const { data: pendingBalance, refetch: refetchBalance } = useReadContract({
    address: ROYALTY_DISTRIBUTOR_ADDRESS,
    abi: ROYALTY_DISTRIBUTOR_ABI,
    functionName: "pendingWithdrawals",
    args: address ? [address] : undefined,
    query: { enabled: !!address },
  })

  // Validation functions
  const validateRightHolders = useCallback((holders: RightHolder[]): string => {
    if (holders.length === 0) return "At least one right holder required"

    // Use more precise calculation to handle floating point issues
    const totalPercentage = holders.reduce((sum, h) => {
      const percentage = h.percentage || 0
      return sum + (Math.round(percentage * 100) / 100) // Round to 2 decimal places
    }, 0)
    
    const roundedTotal = Math.round(totalPercentage * 100) / 100
    if (Math.abs(roundedTotal - 100) > 0.01) {
      return `Percentages must sum to 100% (currently ${roundedTotal}%)`
    }

    const invalidAddress = holders.find((h) => !h.address || !isAddress(h.address))
    if (invalidAddress) return "All addresses must be valid Ethereum addresses"

    const duplicateAddress = holders.find(
      (h, index) => holders.findIndex((other) => other.address === h.address) !== index,
    )
    if (duplicateAddress) return "Duplicate addresses are not allowed"

    // Check for invalid percentages
    const invalidPercentage = holders.find((h) => h.percentage < 0 || h.percentage > 100)
    if (invalidPercentage) return "Each percentage must be between 0 and 100"

    return ""
  }, [])

  const validateRevenue = useCallback((trackId: string, amount: string): string => {
    if (!trackId) return "Please select a track"
    if (!amount || Number.parseFloat(amount) <= 0) return "Amount must be greater than 0"
    if (Number.parseFloat(amount) > 1000) return "Amount seems unusually high"
    return ""
  }, [])

  // Effects
  useEffect(() => {
    if (isConnected && address) {
      loadTracks()
      setRightHolders([{ address, percentage: 100 }])
    }
  }, [isConnected, address])

  useEffect(() => {
    setErrors((prev) => ({
      ...prev,
      rightHolders: validateRightHolders(rightHolders),
      revenue: validateRevenue(selectedTrackId, revenueAmount),
    }))
  }, [rightHolders, selectedTrackId, revenueAmount, validateRightHolders, validateRevenue])

  useEffect(() => {
    if (isConfirmed) {
      loadTracks()
      refetchBalance()
      setErrors((prev) => ({ ...prev, general: "" }))
    }
  }, [isConfirmed])

  // Network check
  const isWrongNetwork = chain?.id !== polygonAmoy.id

  // Data loading
  const loadTracks = async () => {
    if (!address) return
    setLoading(true)
    try {
      const fetchedTracks = await trackAPI.getTracks(address)
      setTracks(fetchedTracks)
      setErrors((prev) => ({ ...prev, general: "" }))
    } catch (err) {
      console.error("Failed to load tracks:", err)
      setErrors((prev) => ({ ...prev, general: "Failed to load tracks" }))
    } finally {
      setLoading(false)
    }
  }

  // Right holder management
  const addRightHolder = () => {
    setRightHolders((prev) => [...prev, { address: "", percentage: 0 }])
  }

  const updateRightHolder = (index: number, field: "address" | "percentage", value: string | number) => {
    setRightHolders((prev) => {
      const updated = [...prev]
      updated[index] = { ...updated[index], [field]: value }
      return updated
    })
  }

  const removeRightHolder = (index: number) => {
    if (rightHolders.length > 1) {
      setRightHolders((prev) => prev.filter((_, i) => i !== index))
    }
  }

  // Contract interactions
  const handleRegisterTrack = async () => {
    if (!trackName.trim() || errors.rightHolders || !address) return

    try {
      setErrors((prev) => ({ ...prev, general: "" }))
      const trackId = keccak256(toBytes(trackName.trim()))
      const holders = rightHolders.map((h) => h.address as `0x${string}`)
      
      // Convert percentages to basis points (multiply by 100) with proper rounding
      const percentages = rightHolders.map((h) => {
        const basisPoints = Math.round(h.percentage * 100)
        return BigInt(basisPoints)
      })

      // Debug logging
      console.log("Register Track Debug Info:")
      console.log("Track Name:", trackName.trim())
      console.log("Track ID:", trackId)
      console.log("Right Holders:", rightHolders)
      console.log("Holders (addresses):", holders)
      console.log("Percentages (basis points):", percentages)
      console.log("Total percentage:", percentages.reduce((sum, p) => sum + p, 0n))

      // Validate that percentages sum to exactly 10000 (100.00%)
      const totalBasisPoints = percentages.reduce((sum, p) => sum + p, 0n)
      if (totalBasisPoints !== 10000n) {
        throw new Error(`Percentages must sum to exactly 100%. Current total: ${Number(totalBasisPoints) / 100}%`)
      }

      // Check if track already exists by getting right holders
      const existingTrack = await readContract(config, {
        address: ROYALTY_DISTRIBUTOR_ADDRESS,
        abi: ROYALTY_DISTRIBUTOR_ABI,
        functionName: "getTrackRightHolders",
        args: [trackId],
      })

      if (existingTrack && existingTrack[0].length > 0) { // Check if holders array has entries
        throw new Error(`Track "${trackName.trim()}" already exists on the blockchain`)
      }

      const gasConfig = getOptimizedGasConfig("registerTrack")
      console.log("Gas config:", gasConfig)

      await writeContract({
        address: ROYALTY_DISTRIBUTOR_ADDRESS,
        abi: ROYALTY_DISTRIBUTOR_ABI,
        functionName: "registerTrack",
        args: [trackId, holders, percentages],
        ...gasConfig,
      })

      // Reset form on successful transaction initiation
      setTrackName("")
      setRightHolders([{ address, percentage: 100 }])
    } catch (err: any) {
      console.error("Register track error:", err)
      let errorMessage = "Failed to register track"
      
      if (err?.message?.includes("Track already exists")) {
        errorMessage = "This track name is already registered. Please choose a different name."
      } else if (err?.message?.includes("Percentages must sum")) {
        errorMessage = err.message
      } else if (err?.message?.includes("Arrays length mismatch")) {
        errorMessage = "Internal error: Right holders and percentages arrays don't match"
      } else if (err?.shortMessage) {
        errorMessage = err.shortMessage
      } else if (err?.message) {
        errorMessage = err.message
      }
      
      setErrors((prev) => ({
        ...prev,
        general: errorMessage,
      }))
    }
  }

  const handleAddRevenue = async () => {
    if (errors.revenue || !selectedTrackId || !revenueAmount) return

    try {
      setErrors((prev) => ({ ...prev, general: "" }))
      const gasConfig = getOptimizedGasConfig("addRevenue")

      await writeContract({
        address: ROYALTY_DISTRIBUTOR_ADDRESS,
        abi: ROYALTY_DISTRIBUTOR_ABI,
        functionName: "addRevenue",
        args: [selectedTrackId as `0x${string}`],
        value: parseEther(revenueAmount),
        ...gasConfig,
      })

      // Reset form
      setSelectedTrackId("")
      setRevenueAmount("")
    } catch (err: any) {
      console.error("Add revenue error:", err)
      setErrors((prev) => ({
        ...prev,
        general: err?.shortMessage || err?.message || "Failed to add revenue",
      }))
    }
  }

  const handleWithdraw = async () => {
    if (!pendingBalance || pendingBalance === 0n) return

    try {
      setErrors((prev) => ({ ...prev, general: "" }))
      const gasConfig = getOptimizedGasConfig("withdraw")

      await writeContract({
        address: ROYALTY_DISTRIBUTOR_ADDRESS,
        abi: ROYALTY_DISTRIBUTOR_ABI,
        functionName: "withdraw",
        ...gasConfig,
      })
    } catch (err: any) {
      console.error("Withdraw error:", err)
      setErrors((prev) => ({
        ...prev,
        general: err?.shortMessage || err?.message || "Failed to withdraw",
      }))
    }
  }

  // Render helpers
  const renderConnectionStatus = () => {
    if (!isConnected) {
      return (
        <div style={{ padding: "20px", textAlign: "center" }}>
          <h2>Connect Your Wallet</h2>
          <p>Connect your wallet to start managing music royalties</p>
          <div style={{ display: "flex", gap: "10px", justifyContent: "center", flexWrap: "wrap" }}>
            {connectors.map((connector) => (
              <button
                key={connector.uid}
                onClick={() => connect({ connector })}
                disabled={isConnecting}
                style={{
                  padding: "12px 24px",
                  backgroundColor: "#2196F3",
                  color: "white",
                  border: "none",
                  borderRadius: "8px",
                  cursor: "pointer",
                  opacity: isConnecting ? 0.7 : 1,
                }}
              >
                {isConnecting ? "Connecting..." : `Connect ${connector.name}`}
              </button>
            ))}
          </div>
        </div>
      )
    }

    if (isWrongNetwork) {
      return (
        <div
          style={{
            padding: "20px",
            textAlign: "center",
            backgroundColor: "#fff3cd",
            borderRadius: "8px",
            margin: "20px",
          }}
        >
          <h3>Wrong Network</h3>
          <p>Please switch to Polygon Amoy testnet to use this application.</p>
          <button
            onClick={() => switchChain({ chainId: polygonAmoy.id })}
            style={{
              padding: "10px 20px",
              backgroundColor: "#ff6b6b",
              color: "white",
              border: "none",
              borderRadius: "4px",
            }}
          >
            Switch to Polygon Amoy Testnet
          </button>
        </div>
      )
    }

    return null
  }

  const connectionStatus = renderConnectionStatus()
  if (connectionStatus) return connectionStatus

  const isTransactionPending = isWritePending || isConfirming

  return (
    <div style={{ padding: "20px", maxWidth: "1200px", margin: "0 auto" }}>
      {/* Navigation Tabs */}
      <div style={{ marginBottom: "30px", borderBottom: "2px solid #e0e0e0" }}>
        <nav style={{ display: "flex", gap: "0" }}>
          {[
            { key: "overview", label: "Overview" },
            { key: "analytics", label: "Analytics" },
          ].map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key as any)}
              style={{
                padding: "12px 24px",
                border: "none",
                backgroundColor: "transparent",
                color: activeTab === tab.key ? "#2196F3" : "#666",
                borderBottom: activeTab === tab.key ? "2px solid #2196F3" : "2px solid transparent",
                cursor: "pointer",
                fontSize: "16px",
                fontWeight: activeTab === tab.key ? "bold" : "normal",
              }}
            >
              {tab.label}
            </button>
          ))}
        </nav>
      </div>

      {/* Error Display */}
      {errors.general && (
        <div
          style={{
            padding: "12px",
            backgroundColor: "#ffebee",
            color: "#c62828",
            borderRadius: "4px",
            marginBottom: "20px",
            border: "1px solid #ffcdd2",
          }}
        >
          {errors.general}
        </div>
      )}

      {/* Transaction Status */}
      {isTransactionPending && (
        <div
          style={{
            padding: "12px",
            backgroundColor: "#e3f2fd",
            color: "#1976d2",
            borderRadius: "4px",
            marginBottom: "20px",
            border: "1px solid #bbdefb",
          }}
        >
          {isWritePending ? "Please confirm transaction in your wallet..." : "Transaction confirming..."}
        </div>
      )}

      {activeTab === "overview" ? (
        <>
          {/* Wallet Status */}
          <div
            style={{
              marginBottom: "30px",
              padding: "20px",
              border: "1px solid #e0e0e0",
              borderRadius: "8px",
              backgroundColor: "#fafafa",
            }}
          >
            <h3 style={{ margin: "0 0 15px 0" }}>Wallet Information</h3>
            <div style={{ display: "grid", gridTemplateColumns: "auto 1fr", gap: "10px", alignItems: "center" }}>
              <strong>Address:</strong>
              <code style={{ fontSize: "14px", wordBreak: "break-all" }}>{address}</code>

              <strong>Network:</strong>
              <span>{chain?.name || "Unknown"}</span>

              <strong>Pending Balance:</strong>
              <span style={{ color: "#4CAF50", fontWeight: "bold" }}>
                {pendingBalance ? `${formatEther(pendingBalance)} MATIC` : "0 MATIC"}
              </span>
            </div>

            <div style={{ marginTop: "15px", display: "flex", gap: "10px" }}>
              <button
                onClick={() => disconnect()}
                style={{
                  padding: "8px 16px",
                  backgroundColor: "#757575",
                  color: "white",
                  border: "none",
                  borderRadius: "4px",
                }}
              >
                Disconnect
              </button>
              <button
                onClick={handleWithdraw}
                disabled={isTransactionPending || !pendingBalance || pendingBalance === 0n}
                style={{
                  padding: "8px 16px",
                  backgroundColor: pendingBalance && pendingBalance > 0n ? "#4CAF50" : "#ccc",
                  color: "white",
                  border: "none",
                  borderRadius: "4px",
                  cursor: pendingBalance && pendingBalance > 0n ? "pointer" : "not-allowed",
                }}
              >
                {isTransactionPending ? "Processing..." : "Withdraw Earnings"}
              </button>
            </div>
          </div>

          {/* Register Track Section */}
          <div
            style={{
              marginBottom: "30px",
              padding: "20px",
              border: "1px solid #e0e0e0",
              borderRadius: "8px",
            }}
          >
            <h3>Register New Track</h3>

            <div style={{ marginBottom: "15px" }}>
              <label style={{ display: "block", marginBottom: "5px", fontWeight: "bold" }}>Track Name</label>
              <input
                type="text"
                value={trackName}
                onChange={(e) => setTrackName(e.target.value)}
                placeholder="Enter track name"
                style={{
                  padding: "10px",
                  width: "100%",
                  maxWidth: "400px",
                  border: "1px solid #ddd",
                  borderRadius: "4px",
                }}
              />
            </div>

            <h4>Right Holders Distribution</h4>
            {rightHolders.map((holder, index) => (
              <div
                key={index}
                style={{
                  marginBottom: "15px",
                  padding: "15px",
                  border: "1px solid #f0f0f0",
                  borderRadius: "4px",
                  backgroundColor: "#fafafa",
                }}
              >
                <div style={{ display: "flex", gap: "10px", alignItems: "flex-end", flexWrap: "wrap" }}>
                  <div style={{ flex: "1", minWidth: "250px" }}>
                    <label style={{ display: "block", marginBottom: "5px", fontSize: "14px" }}>Wallet Address</label>
                    <input
                      type="text"
                      value={holder.address}
                      onChange={(e) => updateRightHolder(index, "address", e.target.value)}
                      placeholder="0x..."
                      style={{
                        padding: "8px",
                        width: "100%",
                        border: "1px solid #ddd",
                        borderRadius: "4px",
                        fontSize: "14px",
                      }}
                    />
                  </div>

                  <div style={{ minWidth: "100px" }}>
                    <label style={{ display: "block", marginBottom: "5px", fontSize: "14px" }}>Percentage</label>
                    <div style={{ display: "flex", alignItems: "center", gap: "5px" }}>
                      <input
                        type="number"
                        value={holder.percentage}
                        onChange={(e) => updateRightHolder(index, "percentage", Number.parseInt(e.target.value) || 0)}
                        min={0}
                        max={100}
                        style={{
                          padding: "8px",
                          width: "70px",
                          border: "1px solid #ddd",
                          borderRadius: "4px",
                        }}
                      />
                      <span>%</span>
                    </div>
                  </div>

                  {rightHolders.length > 1 && (
                    <button
                      onClick={() => removeRightHolder(index)}
                      style={{
                        padding: "8px 12px",
                        backgroundColor: "#f44336",
                        color: "white",
                        border: "none",
                        borderRadius: "4px",
                        cursor: "pointer",
                      }}
                    >
                      Remove
                    </button>
                  )}
                </div>
              </div>
            ))}

            {errors.rightHolders && (
              <p style={{ color: "#f44336", fontSize: "14px", margin: "10px 0" }}>{errors.rightHolders}</p>
            )}

            <div style={{ marginBottom: "15px" }}>
              <button
                onClick={addRightHolder}
                style={{
                  padding: "8px 16px",
                  backgroundColor: "#757575",
                  color: "white",
                  border: "none",
                  borderRadius: "8px",
                  marginRight: "10px",
                }}
              >
                Add Right Holder
              </button>

              <span style={{ fontSize: "14px", color: "#666" }}>
                Total: {rightHolders.reduce((sum, h) => sum + (h.percentage || 0), 0)}% (must equal 100%)
              </span>
            </div>

            <button
              onClick={handleRegisterTrack}
              disabled={isTransactionPending || !!errors.rightHolders || !trackName.trim()}
              style={{
                padding: "12px 24px",
                backgroundColor: !errors.rightHolders && trackName.trim() ? "#2196F3" : "#ccc",
                color: "white",
                border: "none",
                borderRadius: "4px",
                fontSize: "16px",
                cursor: !errors.rightHolders && trackName.trim() ? "pointer" : "not-allowed",
              }}
            >
              {isTransactionPending ? "Processing..." : "Register Track"}
            </button>
          </div>

          {/* Add Revenue Section */}
          <div
            style={{
              marginBottom: "30px",
              padding: "20px",
              border: "1px solid #e0e0e0",
              borderRadius: "8px",
            }}
          >
            <h3>Add Revenue</h3>
            <div style={{ display: "flex", gap: "15px", alignItems: "flex-end", flexWrap: "wrap" }}>
              <div>
                <label style={{ display: "block", marginBottom: "5px", fontWeight: "bold" }}>Select Track</label>
                <select
                  value={selectedTrackId}
                  onChange={(e) => setSelectedTrackId(e.target.value)}
                  style={{
                    padding: "10px",
                    width: "250px",
                    border: "1px solid #ddd",
                    borderRadius: "4px",
                  }}
                >
                  <option value="">Choose a track...</option>
                  {tracks.map((track) => (
                    <option key={track.id} value={track.trackId}>
                      {track.title}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label style={{ display: "block", marginBottom: "5px", fontWeight: "bold" }}>Amount (MATIC)</label>
                <input
                  type="number"
                  value={revenueAmount}
                  onChange={(e) => setRevenueAmount(e.target.value)}
                  placeholder="0.00"
                  step="0.01"
                  min="0"
                  style={{
                    padding: "10px",
                    width: "150px",
                    border: "1px solid #ddd",
                    borderRadius: "4px",
                  }}
                />
              </div>

              <button
                onClick={handleAddRevenue}
                disabled={isTransactionPending || !!errors.revenue}
                style={{
                  padding: "10px 20px",
                  backgroundColor: !errors.revenue ? "#FF9800" : "#ccc",
                  color: "white",
                  border: "none",
                  borderRadius: "4px",
                  cursor: !errors.revenue ? "pointer" : "not-allowed",
                }}
              >
                {isTransactionPending ? "Processing..." : "Add Revenue"}
              </button>
            </div>

            {errors.revenue && (
              <p style={{ color: "#f44336", fontSize: "14px", marginTop: "10px" }}>{errors.revenue}</p>
            )}
          </div>

          {/* Tracks List */}
          <div
            style={{
              padding: "20px",
              border: "1px solid #e0e0e0",
              borderRadius: "8px",
            }}
          >
            <div
              style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px" }}
            >
              <h3>My Tracks</h3>
              {loading && <span style={{ color: "#666" }}>Loading...</span>}
            </div>

            {tracks.length === 0 ? (
              <div style={{ textAlign: "center", padding: "40px", color: "#666" }}>
                <p>No tracks registered yet.</p>
                <p style={{ fontSize: "14px" }}>Register your first track above to get started!</p>
              </div>
            ) : (
              <div style={{ display: "grid", gap: "15px" }}>
                {tracks.map((track) => (
                  <div
                    key={track.id}
                    style={{
                      padding: "20px",
                      border: "1px solid #f0f0f0",
                      borderRadius: "8px",
                      backgroundColor: "#fafafa",
                    }}
                  >
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                      <div>
                        <h4 style={{ margin: "0 0 10px 0", color: "#333" }}>{track.title}</h4>
                        <div
                          style={{
                            display: "grid",
                            gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
                            gap: "10px",
                          }}
                        >
                          <div>
                            <strong>Total Earnings:</strong> {track.totalEarnings.toFixed(4)} MATIC
                          </div>
                          <div>
                            <strong>Revenue Payments:</strong> {track.revenues.length}
                          </div>
                          <div>
                            <strong>Registered:</strong> {new Date(track.createdAt).toLocaleDateString()}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </>
      ) : (
        <AnalyticsDashboard tracks={tracks} />
      )}
    </div>
  )
}

export default Dashboard
