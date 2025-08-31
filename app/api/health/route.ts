import { type NextRequest, NextResponse } from "next/server"

const API_BASE_URL = process.env.BACKEND_API_URL || "http://localhost:3001/api"

export async function GET(request: NextRequest) {
  try {
    const response = await fetch(`${API_BASE_URL}/health`, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
      },
    })

    if (!response.ok) {
      return NextResponse.json(
        {
          status: "error",
          message: "Backend service unavailable",
          timestamp: new Date().toISOString(),
        },
        { status: 503 },
      )
    }

    const healthData = await response.json()
    return NextResponse.json({
      status: "ok",
      backend: healthData,
      timestamp: new Date().toISOString(),
    })
  } catch (error) {
    console.error("Health check failed:", error)
    return NextResponse.json(
      {
        status: "error",
        message: "Backend connection failed",
        timestamp: new Date().toISOString(),
      },
      { status: 503 },
    )
  }
}
