import { type NextRequest, NextResponse } from "next/server"

const API_BASE_URL = process.env.BACKEND_API_URL || "http://localhost:3001/api"

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { trackId, amount, platform, txHash } = body

    if (!trackId || !amount || !platform) {
      return NextResponse.json({ error: "Missing required fields: trackId, amount, platform" }, { status: 400 })
    }

    const numericAmount = Number.parseFloat(amount)
    if (isNaN(numericAmount) || numericAmount <= 0) {
      return NextResponse.json({ error: "Invalid amount value" }, { status: 400 })
    }

    const response = await fetch(`${API_BASE_URL}/tracks/revenue`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        trackId,
        amount: numericAmount.toString(),
        platform,
        txHash,
      }),
    })

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}))
      return NextResponse.json({ error: errorData.message || "Failed to add revenue" }, { status: response.status })
    }

    const revenue = await response.json()
    return NextResponse.json(revenue)
  } catch (error) {
    console.error("API Error - Add revenue:", error)
    return NextResponse.json({ error: "Failed to add revenue" }, { status: 500 })
  }
}
