"use client"

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
import { parseEther, keccak256, toBytes, formatEther, parseGwei, isAddress } from "viem"
import { polygonAmoy } from "wagmi/chains"
import { ROYALTY_DISTRIBUTOR_ADDRESS, ROYALTY_DISTRIBUTOR_ABI } from "@/lib/contracts"
import { trackAPI, type Track } from "@/lib/api"
import { AnalyticsDashboard } from "@/components/analytics-dashboard"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"

interface RightHolder {
  address: string
  percentage: number
}

const getOptimizedGasConfig = (functionName: string) => {
  // Optimized for Polygon Amoy testnet - lower gas prices and higher limits
  const baseConfigs = {
    registerTrack: {
      gas: 800000n, // Increased gas limit for complex contract interactions
      maxFeePerGas: parseGwei("100"), // Higher gas price for testnet reliability
      maxPriorityFeePerGas: parseGwei("50"),
    },
    addRevenue: {
      gas: 500000n,
      maxFeePerGas: parseGwei("80"),
      maxPriorityFeePerGas: parseGwei("40"),
    },
    withdraw: {
      gas: 200000n,
      maxFeePerGas: parseGwei("60"),
      maxPriorityFeePerGas: parseGwei("30"),
    },
    default: {
      gas: 500000n,
      maxFeePerGas: parseGwei("80"),
      maxPriorityFeePerGas: parseGwei("40"),
    },
  }

  return baseConfigs[functionName as keyof typeof baseConfigs] || baseConfigs.default
}

export function MusicFlowDashboard() {
  const { address, isConnected, chain } = useAccount()
  const { connect, connectors, isPending: isConnecting } = useConnect()
  const { disconnect } = useDisconnect()
  const { switchChain } = useSwitchChain()
  const { writeContract, isPending: isWritePending, error: writeError, data: hash } = useWriteContract()

  const { isLoading: isConfirming, isSuccess: isConfirmed } = useWaitForTransactionReceipt({
    hash,
  })

  // State management
  const [trackName, setTrackName] = useState("")
  const [revenueAmount, setRevenueAmount] = useState("")
  const [selectedTrackId, setSelectedTrackId] = useState("")
  const [tracks, setTracks] = useState<Track[]>([])
  const [loading, setLoading] = useState(false)
  const [rightHolders, setRightHolders] = useState<RightHolder[]>([{ address: "", percentage: 100 }])
  const [errors, setErrors] = useState({
    rightHolders: "",
    revenue: "",
    general: "",
  })
  const [isClient, setIsClient] = useState(false)

  // Fix hydration by ensuring client-side rendering
  useEffect(() => {
    setIsClient(true)
  }, [])

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

    const totalPercentage = holders.reduce((sum, h) => sum + (h.percentage || 0), 0)
    if (totalPercentage !== 100) return `Percentages must sum to 100% (currently ${totalPercentage}%)`

    const invalidAddress = holders.find((h) => !h.address || !isAddress(h.address))
    if (invalidAddress) return "All addresses must be valid Ethereum addresses"

    const duplicateAddress = holders.find(
      (h, index) => holders.findIndex((other) => other.address === h.address) !== index,
    )
    if (duplicateAddress) return "Duplicate addresses are not allowed"

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

  const isWrongNetwork = chain?.id !== polygonAmoy.id

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

  const handleRegisterTrack = async () => {
    if (!trackName.trim() || errors.rightHolders || !address) return

    try {
      setErrors((prev) => ({ ...prev, general: "" }))
      
      // Enhanced validation
      const trackId = keccak256(toBytes(trackName.trim()))
      const holders = rightHolders.map((h) => h.address as `0x${string}`)
      const percentages = rightHolders.map((h) => BigInt(Math.round(h.percentage * 100)))
      
      // Validate addresses
      for (const holder of holders) {
        if (!isAddress(holder)) {
          throw new Error(`Invalid address: ${holder}`)
        }
      }
      
      // Validate percentages sum to exactly 10000 (100.00%)
      const totalBasisPoints = percentages.reduce((sum, p) => sum + p, 0n)
      if (totalBasisPoints !== 10000n) {
        throw new Error(`Percentages must sum to exactly 100%. Current total: ${Number(totalBasisPoints) / 100}%`)
      }
      
      // Check if track already exists
      console.log("Checking if track exists...", trackId)
      
      const gasConfig = getOptimizedGasConfig("registerTrack")
      console.log("Gas config:", gasConfig)
      console.log("Track registration params:", { trackId, holders, percentages })

      await writeContract({
        address: ROYALTY_DISTRIBUTOR_ADDRESS,
        abi: ROYALTY_DISTRIBUTOR_ABI,
        functionName: "registerTrack",
        args: [trackId, holders, percentages],
        ...gasConfig,
      })

      setTrackName("")
      setRightHolders([{ address, percentage: 100 }])
    } catch (err: any) {
      console.error("Register track error:", err)
      let errorMessage = "Failed to register track"
      
      if (err?.message?.includes("Track already exists")) {
        errorMessage = "This track name is already registered. Please choose a different name."
      } else if (err?.message?.includes("Percentages must sum")) {
        errorMessage = err.message
      } else if (err?.message?.includes("Invalid address")) {
        errorMessage = err.message
      } else if (err?.message?.includes("insufficient funds")) {
        errorMessage = "Insufficient funds for gas fees. Please ensure you have enough POL tokens."
      } else if (err?.message?.includes("gas")) {
        errorMessage = "Transaction failed due to gas issues. Please try again with higher gas settings."
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

  // Prevent hydration mismatch by showing loading state until client-side
  if (!isClient) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <CardTitle>Loading...</CardTitle>
            <CardDescription>Initializing application</CardDescription>
          </CardHeader>
        </Card>
      </div>
    )
  }

  if (!isConnected) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <CardTitle>Connect Your Wallet</CardTitle>
            <CardDescription>Connect your wallet to start managing music royalties</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {connectors.map((connector) => (
              <Button
                key={connector.uid}
                onClick={() => connect({ connector })}
                disabled={isConnecting}
                className="w-full"
              >
                {isConnecting ? "Connecting..." : `Connect ${connector.name}`}
              </Button>
            ))}
          </CardContent>
        </Card>
      </div>
    )
  }

  if (isWrongNetwork) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <CardTitle>Wrong Network</CardTitle>
            <CardDescription>Please switch to Polygon Amoy testnet to use this application.</CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={() => switchChain({ chainId: polygonAmoy.id })} className="w-full">
              Switch to Polygon Amoy Testnet
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  const isTransactionPending = isWritePending || isConfirming

  return (
    <div className="container mx-auto p-6 max-w-6xl">
      <Tabs defaultValue="overview" className="space-y-6">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="analytics">Analytics</TabsTrigger>
        </TabsList>

        {/* Error Display */}
        {errors.general && (
          <Alert variant="destructive">
            <AlertDescription>{errors.general}</AlertDescription>
          </Alert>
        )}

        {/* Transaction Status */}
        {isTransactionPending && (
          <Alert>
            <AlertDescription>
              {isWritePending ? "Please confirm transaction in your wallet..." : "Transaction confirming..."}
            </AlertDescription>
          </Alert>
        )}

        <TabsContent value="overview" className="space-y-6">
          {/* Wallet Status */}
          <Card>
            <CardHeader>
              <CardTitle>Wallet Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label>Address</Label>
                  <code className="block text-sm bg-muted p-2 rounded mt-1 break-all">{address}</code>
                </div>
                <div>
                  <Label>Network</Label>
                  <p className="text-sm mt-1">{chain?.name || "Unknown"}</p>
                </div>
                <div>
                  <Label>Pending Balance</Label>
                  <p className="text-sm mt-1 font-bold text-green-600">
                    {pendingBalance ? `${formatEther(pendingBalance)} MATIC` : "0 MATIC"}
                  </p>
                </div>
              </div>
              <div className="flex gap-2">
                <Button variant="outline" onClick={() => disconnect()}>
                  Disconnect
                </Button>
                <Button
                  onClick={handleWithdraw}
                  disabled={isTransactionPending || !pendingBalance || pendingBalance === 0n}
                >
                  {isTransactionPending ? "Processing..." : "Withdraw Earnings"}
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Register Track Section */}
          <Card>
            <CardHeader>
              <CardTitle>Register New Track</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="trackName">Track Name</Label>
                <Input
                  id="trackName"
                  value={trackName}
                  onChange={(e) => setTrackName(e.target.value)}
                  placeholder="Enter track name"
                />
              </div>

              <div>
                <Label>Right Holders Distribution</Label>
                <div className="space-y-3 mt-2">
                  {rightHolders.map((holder, index) => (
                    <div key={index} className="flex gap-2 items-end">
                      <div className="flex-1">
                        <Label className="text-xs">Wallet Address</Label>
                        <Input
                          value={holder.address}
                          onChange={(e) => updateRightHolder(index, "address", e.target.value)}
                          placeholder="0x..."
                          className="text-sm"
                        />
                      </div>
                      <div className="w-24">
                        <Label className="text-xs">Percentage</Label>
                        <div className="flex items-center gap-1">
                          <Input
                            type="number"
                            value={holder.percentage}
                            onChange={(e) =>
                              updateRightHolder(index, "percentage", Number.parseInt(e.target.value) || 0)
                            }
                            min={0}
                            max={100}
                            className="text-sm"
                          />
                          <span className="text-sm">%</span>
                        </div>
                      </div>
                      {rightHolders.length > 1 && (
                        <Button variant="destructive" size="sm" onClick={() => removeRightHolder(index)}>
                          Remove
                        </Button>
                      )}
                    </div>
                  ))}
                </div>

                {errors.rightHolders && <p className="text-sm text-destructive mt-2">{errors.rightHolders}</p>}

                <div className="flex items-center justify-between mt-3">
                  <Button variant="outline" onClick={addRightHolder}>
                    Add Right Holder
                  </Button>
                  <span className="text-sm text-muted-foreground">
                    Total: {rightHolders.reduce((sum, h) => sum + (h.percentage || 0), 0)}% (must equal 100%)
                  </span>
                </div>
              </div>

              <Button
                onClick={handleRegisterTrack}
                disabled={isTransactionPending || !!errors.rightHolders || !trackName.trim()}
                className="w-full"
              >
                {isTransactionPending ? "Processing..." : "Register Track"}
              </Button>
            </CardContent>
          </Card>

          {/* Add Revenue Section */}
          <Card>
            <CardHeader>
              <CardTitle>Add Revenue</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="trackSelect">Select Track</Label>
                  <select
                    id="trackSelect"
                    value={selectedTrackId}
                    onChange={(e) => setSelectedTrackId(e.target.value)}
                    className="w-full p-2 border border-input rounded-md bg-background"
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
                  <Label htmlFor="revenueAmount">Amount (MATIC)</Label>
                  <Input
                    id="revenueAmount"
                    type="number"
                    value={revenueAmount}
                    onChange={(e) => setRevenueAmount(e.target.value)}
                    placeholder="0.00"
                    step="0.01"
                    min="0"
                  />
                </div>
              </div>

              {errors.revenue && <p className="text-sm text-destructive">{errors.revenue}</p>}

              <Button onClick={handleAddRevenue} disabled={isTransactionPending || !!errors.revenue} className="w-full">
                {isTransactionPending ? "Processing..." : "Add Revenue"}
              </Button>
            </CardContent>
          </Card>

          {/* Tracks List */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>My Tracks</CardTitle>
              {loading && <Badge variant="secondary">Loading...</Badge>}
            </CardHeader>
            <CardContent>
              {tracks.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <p>No tracks registered yet.</p>
                  <p className="text-sm">Register your first track above to get started!</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {tracks.map((track) => (
                    <Card key={track.id}>
                      <CardContent className="pt-6">
                        <div className="flex justify-between items-start">
                          <div>
                            <h4 className="font-semibold">{track.title}</h4>
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-2 mt-2 text-sm text-muted-foreground">
                              <div>
                                <strong>Total Earnings:</strong> {track.totalEarnings.toFixed(4)} MATIC
                              </div>
                              <div>
                                <strong>Revenue Payments:</strong> {track.revenues.length}
                              </div>
                              <div>
                                <strong>Registered:</strong> <span suppressHydrationWarning>{new Date(track.createdAt).toLocaleDateString()}</span>
                              </div>
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="analytics">
          <AnalyticsDashboard tracks={tracks} />
        </TabsContent>
      </Tabs>
    </div>
  )
}
