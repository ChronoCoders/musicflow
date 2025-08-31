import { type NextRequest, NextResponse } from "next/server"

const API_BASE_URL = process.env.BACKEND_API_URL || "http://localhost:3001/api"

export async function GET(request: NextRequest, { params }: { params: { walletAddress: string } }) {
  try {
    const { walletAddress } = params

    if (!walletAddress) {
      return NextResponse.json({ error: "Wallet address is required" }, { status: 400 })
    }

    const response = await fetch(`${API_BASE_URL}/tracks/${walletAddress}`, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
      },
    })

    if (!response.ok) {
      if (response.status === 404) {
        return NextResponse.json([]) // Return empty array for no tracks found
      }
      throw new Error(`Backend API error: ${response.status}`)
    }

    const tracks = await response.json()
    return NextResponse.json(tracks)
  } catch (error) {
    console.error("API Error - Get tracks:", error)
    return NextResponse.json({ error: "Failed to fetch tracks" }, { status: 500 })
  }
}
