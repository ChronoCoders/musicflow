import { type NextRequest, NextResponse } from "next/server"

const API_BASE_URL = process.env.BACKEND_API_URL || "http://localhost:3001/api"

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { trackId, title, walletAddress, txHash } = body

    if (!trackId || !title || !walletAddress) {
      return NextResponse.json({ error: "Missing required fields: trackId, title, walletAddress" }, { status: 400 })
    }

    const response = await fetch(`${API_BASE_URL}/tracks/register`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        trackId,
        title: title.trim(),
        walletAddress,
        txHash,
      }),
    })

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}))
      return NextResponse.json({ error: errorData.message || "Failed to register track" }, { status: response.status })
    }

    const track = await response.json()
    return NextResponse.json(track)
  } catch (error) {
    console.error("API Error - Register track:", error)
    return NextResponse.json({ error: "Failed to register track" }, { status: 500 })
  }
}
