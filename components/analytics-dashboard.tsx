"use client"

import { useState, useMemo } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Label } from "@/components/ui/label"

interface Revenue {
  amount: number
  platform: string
  createdAt: string
}

interface Track {
  id: number
  title: string
  totalEarnings: number
  revenues: Revenue[]
  createdAt: string
}

interface AnalyticsProps {
  tracks: Track[]
}

type TimeRange = "7d" | "30d" | "90d" | "1y"

export function AnalyticsDashboard({ tracks }: AnalyticsProps) {
  const [timeRange, setTimeRange] = useState<TimeRange>("30d")
  const [sortBy, setSortBy] = useState<"earnings" | "payments" | "date">("earnings")
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc")

  const safeTracks = useMemo(() => tracks || [], [tracks])

  const metrics = useMemo(() => {
    const totalRevenue = safeTracks.reduce((sum, track) => sum + (track.totalEarnings || 0), 0)
    const totalTracks = safeTracks.length
    const totalPayments = safeTracks.reduce((sum, track) => sum + (track.revenues?.length || 0), 0)
    const avgRevenuePerTrack = totalTracks > 0 ? totalRevenue / totalTracks : 0
    const avgRevenuePerPayment = totalPayments > 0 ? totalRevenue / totalPayments : 0

    const now = new Date()
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)

    const recentRevenue = safeTracks.reduce((sum, track) => {
      if (!track.revenues) return sum
      return (
        sum +
        track.revenues
          .filter((rev) => new Date(rev.createdAt) >= thirtyDaysAgo)
          .reduce((revSum, rev) => revSum + rev.amount, 0)
      )
    }, 0)

    const previousRevenue = totalRevenue - recentRevenue
    const growthRate = previousRevenue > 0 ? ((recentRevenue - previousRevenue) / previousRevenue) * 100 : 0

    return {
      totalRevenue,
      totalTracks,
      totalPayments,
      avgRevenuePerTrack,
      avgRevenuePerPayment,
      recentRevenue,
      growthRate,
    }
  }, [safeTracks])

  const sortedTracks = useMemo(() => {
    const detailed = safeTracks.map((track) => ({
      ...track,
      lastPayment:
        track.revenues && track.revenues.length > 0
          ? new Date(Math.max(...track.revenues.map((r) => new Date(r.createdAt).getTime()))).toLocaleDateString()
          : "No payments",
      avgPerPayment: track.revenues && track.revenues.length > 0 ? track.totalEarnings / track.revenues.length : 0,
      recentActivity: track.revenues
        ? track.revenues.filter((r) => {
            const paymentDate = new Date(r.createdAt)
            const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
            return paymentDate >= thirtyDaysAgo
          }).length
        : 0,
    }))

    return detailed.sort((a, b) => {
      let aValue: number | string, bValue: number | string

      switch (sortBy) {
        case "earnings":
          aValue = a.totalEarnings || 0
          bValue = b.totalEarnings || 0
          break
        case "payments":
          aValue = a.revenues?.length || 0
          bValue = b.revenues?.length || 0
          break
        case "date":
          aValue = new Date(a.createdAt).getTime()
          bValue = new Date(b.createdAt).getTime()
          break
        default:
          aValue = a.totalEarnings || 0
          bValue = b.totalEarnings || 0
      }

      if (sortOrder === "desc") {
        return typeof aValue === "number" && typeof bValue === "number"
          ? bValue - aValue
          : String(bValue).localeCompare(String(aValue))
      } else {
        return typeof aValue === "number" && typeof bValue === "number"
          ? aValue - bValue
          : String(aValue).localeCompare(String(bValue))
      }
    })
  }, [safeTracks, sortBy, sortOrder])

  const bestPerformingDay = useMemo(() => {
    const dailyTotals: { [key: string]: number } = {}

    safeTracks.forEach((track) => {
      if (track.revenues) {
        track.revenues.forEach((rev) => {
          const day = new Date(rev.createdAt).toLocaleDateString()
          dailyTotals[day] = (dailyTotals[day] || 0) + rev.amount
        })
      }
    })

    const bestDay = Object.entries(dailyTotals).sort(([, a], [, b]) => b - a)[0]

    return bestDay ? { date: bestDay[0], amount: bestDay[1] } : null
  }, [safeTracks])

  const exportToCSV = () => {
    if (safeTracks.length === 0) {
      alert("No data available to export")
      return
    }

    const csvData = [
      [
        "Track Name",
        "Total Earnings (MATIC)",
        "Payment Count",
        "Avg Per Payment",
        "Last Payment",
        "Registration Date",
        "Recent Activity (30d)",
      ],
      ...sortedTracks.map((track) => [
        `"${track.title}"`,
        (track.totalEarnings || 0).toFixed(6),
        track.revenues?.length || 0,
        track.avgPerPayment.toFixed(6),
        track.lastPayment,
        new Date(track.createdAt).toLocaleDateString(),
        track.recentActivity,
      ]),
    ]

    const csvString = csvData.map((row) => row.join(",")).join("\n")
    const blob = new Blob([csvString], { type: "text/csv;charset=utf-8;" })
    const link = document.createElement("a")

    if (link.download !== undefined) {
      const url = URL.createObjectURL(blob)
      link.setAttribute("href", url)
      link.setAttribute("download", `musicflow-analytics-${new Date().toISOString().split("T")[0]}.csv`)
      link.style.visibility = "hidden"
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
    }
  }

  return (
    <div className="space-y-6">
      {/* Header with Export */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold">Revenue Analytics Dashboard</h2>
          <p className="text-muted-foreground">Comprehensive insights into your music revenue</p>
        </div>
        <Button onClick={exportToCSV} disabled={safeTracks.length === 0} variant="outline">
          Export to CSV
        </Button>
      </div>

      {/* Key Metrics Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
        {[
          {
            title: "Total Revenue",
            value: `${metrics.totalRevenue.toFixed(4)} MATIC`,
            color: "text-green-600",
            icon: "💰",
          },
          {
            title: "Total Tracks",
            value: metrics.totalTracks.toString(),
            color: "text-blue-600",
            icon: "🎵",
          },
          {
            title: "Avg per Track",
            value: `${metrics.avgRevenuePerTrack.toFixed(4)} MATIC`,
            color: "text-orange-600",
            icon: "📈",
          },
          {
            title: "Total Payments",
            value: metrics.totalPayments.toString(),
            color: "text-purple-600",
            icon: "💳",
          },
          {
            title: "30-Day Growth",
            value: `${metrics.growthRate > 0 ? "+" : ""}${metrics.growthRate.toFixed(1)}%`,
            color: metrics.growthRate >= 0 ? "text-green-600" : "text-red-600",
            icon: metrics.growthRate >= 0 ? "📈" : "📉",
          },
        ].map((metric, index) => (
          <Card key={index}>
            <CardContent className="p-6">
              <div className="flex items-center space-x-2">
                <span className="text-2xl">{metric.icon}</span>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">{metric.title}</p>
                  <p className={`text-2xl font-bold ${metric.color}`}>{metric.value}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}

        {bestPerformingDay && (
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center space-x-2">
                <span className="text-2xl">🏆</span>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Best Day</p>
                  <p className="text-lg font-bold text-orange-600">{bestPerformingDay.amount.toFixed(4)} MATIC</p>
                  <p className="text-xs text-muted-foreground"><span suppressHydrationWarning>{bestPerformingDay.date}</span></p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {safeTracks.length === 0 ? (
        <Card>
          <CardContent className="p-12 text-center">
            <div className="text-6xl mb-4">🎵</div>
            <h3 className="text-xl font-semibold mb-2">No Track Data Available</h3>
            <p className="text-muted-foreground">
              Register your first track and add some revenue to see analytics here!
            </p>
          </CardContent>
        </Card>
      ) : (
        <>
          {/* Detailed Track Table */}
          <Card>
            <CardHeader>
              <div className="flex justify-between items-center">
                <div>
                  <CardTitle>Track Performance Details</CardTitle>
                  <CardDescription>Detailed breakdown of each track's performance</CardDescription>
                </div>

                <div className="flex items-center space-x-2">
                  <Label className="text-sm">Sort by:</Label>
                  <select
                    value={sortBy}
                    onChange={(e) => setSortBy(e.target.value as any)}
                    className="px-3 py-1 border border-input rounded-md bg-background text-sm"
                  >
                    <option value="earnings">Earnings</option>
                    <option value="payments">Payment Count</option>
                    <option value="date">Registration Date</option>
                  </select>

                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setSortOrder(sortOrder === "desc" ? "asc" : "desc")}
                  >
                    {sortOrder === "desc" ? "↓" : "↑"}
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b">
                      {[
                        "Track Name",
                        "Total Earnings",
                        "Payments",
                        "Avg per Payment",
                        "Last Payment",
                        "Registered",
                        "Recent Activity",
                      ].map((header) => (
                        <th key={header} className="text-left p-2 font-medium text-muted-foreground">
                          {header}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {sortedTracks.map((track, index) => (
                      <tr key={track.id} className={index % 2 === 0 ? "bg-muted/50" : ""}>
                        <td className="p-2 font-medium max-w-[200px] truncate">{track.title}</td>
                        <td className="p-2 text-right font-bold text-green-600">
                          {(track.totalEarnings || 0).toFixed(6)} MATIC
                        </td>
                        <td className="p-2 text-center">{track.revenues?.length || 0}</td>
                        <td className="p-2 text-right">{track.avgPerPayment.toFixed(6)} MATIC</td>
                        <td className="p-2 text-center">{track.lastPayment}</td>
                        <td className="p-2 text-center"><span suppressHydrationWarning>{new Date(track.createdAt).toLocaleDateString()}</span></td>
                        <td className="p-2 text-center">
                          <Badge variant={track.recentActivity > 0 ? "default" : "secondary"}>
                            {track.recentActivity}
                          </Badge>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {sortedTracks.length > 10 && (
                <p className="mt-4 text-sm text-muted-foreground text-center">
                  Showing all {sortedTracks.length} tracks • Export CSV for offline analysis
                </p>
              )}
            </CardContent>
          </Card>
        </>
      )}
    </div>
  )
}
