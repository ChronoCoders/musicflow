"use client"

import type React from "react"
import { useState, useMemo } from "react"
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
  Filler,
} from "chart.js"
import { Line, Bar, Doughnut } from "react-chartjs-2"

// Register Chart.js components
ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
  Filler,
)

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

const AnalyticsDashboard: React.FC<AnalyticsProps> = ({ tracks }) => {
  const [timeRange, setTimeRange] = useState<TimeRange>("30d")
  const [sortBy, setSortBy] = useState<"earnings" | "payments" | "date">("earnings")
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc")

  // Safe tracks array with better error handling
  const safeTracks = useMemo(() => tracks || [], [tracks])

  // Enhanced metrics calculation
  const metrics = useMemo(() => {
    const totalRevenue = safeTracks.reduce((sum, track) => sum + (track.totalEarnings || 0), 0)
    const totalTracks = safeTracks.length
    const totalPayments = safeTracks.reduce((sum, track) => sum + (track.revenues?.length || 0), 0)
    const avgRevenuePerTrack = totalTracks > 0 ? totalRevenue / totalTracks : 0
    const avgRevenuePerPayment = totalPayments > 0 ? totalRevenue / totalPayments : 0

    // Growth calculations
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

  // Enhanced track details with sorting
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

  // Enhanced revenue over time with better date handling
  const revenueOverTimeData = useMemo(() => {
    const days = timeRange === "7d" ? 7 : timeRange === "30d" ? 30 : timeRange === "90d" ? 90 : 365
    const labels: string[] = []
    const dataPoints: number[] = []

    for (let i = days - 1; i >= 0; i--) {
      const date = new Date()
      date.setDate(date.getDate() - i)
      const dateString = date.toLocaleDateString("en-US", { month: "short", day: "numeric" })
      labels.push(dateString)

      const dayRevenue = safeTracks.reduce((sum, track) => {
        if (!track.revenues) return sum
        return (
          sum +
          track.revenues
            .filter((rev) => {
              const revDate = new Date(rev.createdAt)
              return revDate.toDateString() === date.toDateString()
            })
            .reduce((revSum, rev) => revSum + rev.amount, 0)
        )
      }, 0)

      dataPoints.push(dayRevenue)
    }

    return {
      labels,
      datasets: [
        {
          label: "Daily Revenue (MATIC)",
          data: dataPoints,
          borderColor: "#2196F3",
          backgroundColor: "rgba(33, 150, 243, 0.1)",
          fill: true,
          tension: 0.4,
          pointBackgroundColor: "#2196F3",
          pointBorderColor: "#ffffff",
          pointBorderWidth: 2,
          pointRadius: 4,
          pointHoverRadius: 6,
        },
      ],
    }
  }, [safeTracks, timeRange])

  // Enhanced track performance comparison
  const trackPerformanceData = useMemo(() => {
    const topTracks = sortedTracks.slice(0, 8)

    return {
      labels: topTracks.map((track) => (track.title.length > 15 ? track.title.substring(0, 15) + "..." : track.title)),
      datasets: [
        {
          label: "Total Earnings (MATIC)",
          data: topTracks.map((track) => track.totalEarnings || 0),
          backgroundColor: ["#FF6384", "#36A2EB", "#FFCE56", "#4BC0C0", "#9966FF", "#FF9F40", "#FF6384", "#C9CBCF"],
          borderColor: ["#FF6384", "#36A2EB", "#FFCE56", "#4BC0C0", "#9966FF", "#FF9F40", "#FF6384", "#C9CBCF"],
          borderWidth: 1,
        },
      ],
    }
  }, [sortedTracks])

  // Enhanced platform distribution
  const platformDistributionData = useMemo(() => {
    const platformTotals: { [key: string]: number } = {}

    safeTracks.forEach((track) => {
      if (track.revenues) {
        track.revenues.forEach((rev) => {
          const platform = rev.platform || "Unknown"
          platformTotals[platform] = (platformTotals[platform] || 0) + rev.amount
        })
      }
    })

    const platforms = Object.keys(platformTotals)
    const values = Object.values(platformTotals)

    return {
      labels: platforms.length > 0 ? platforms : ["No Data"],
      datasets: [
        {
          data: values.length > 0 ? values : [1],
          backgroundColor: ["#FF6384", "#36A2EB", "#FFCE56", "#4BC0C0", "#9966FF", "#FF9F40", "#FF6B6B", "#4ECDC4"],
          borderColor: "#ffffff",
          borderWidth: 2,
        },
      ],
    }
  }, [safeTracks])

  // Best performing day
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

  // Export functionality with enhanced data
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

  // Chart options
  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: "top" as const,
        labels: {
          usePointStyle: true,
          padding: 20,
        },
      },
      tooltip: {
        backgroundColor: "rgba(0, 0, 0, 0.8)",
        titleColor: "#ffffff",
        bodyColor: "#ffffff",
        borderColor: "#666",
        borderWidth: 1,
      },
    },
    scales: {
      y: {
        beginAtZero: true,
        grid: {
          color: "rgba(0, 0, 0, 0.1)",
        },
      },
      x: {
        grid: {
          display: false,
        },
      },
    },
  }

  return (
    <div style={{ padding: "20px", maxWidth: "1400px", margin: "0 auto" }}>
      {/* Header with Export */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: "30px",
          flexWrap: "wrap",
          gap: "15px",
        }}
      >
        <h2 style={{ margin: 0, color: "#333" }}>Revenue Analytics Dashboard</h2>
        <button
          onClick={exportToCSV}
          disabled={safeTracks.length === 0}
          style={{
            padding: "10px 20px",
            backgroundColor: safeTracks.length > 0 ? "#4CAF50" : "#ccc",
            color: "white",
            border: "none",
            borderRadius: "6px",
            cursor: safeTracks.length > 0 ? "pointer" : "not-allowed",
            fontSize: "14px",
            fontWeight: "bold",
          }}
        >
          Export to CSV
        </button>
      </div>

      {/* Key Metrics Grid */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
          gap: "20px",
          marginBottom: "40px",
        }}
      >
        {[
          {
            title: "Total Revenue",
            value: `${metrics.totalRevenue.toFixed(4)} MATIC`,
            color: "#4CAF50",
            icon: "",
          },
          {
            title: "Total Tracks",
            value: metrics.totalTracks.toString(),
            color: "#2196F3",
            icon: "",
          },
          {
            title: "Avg per Track",
            value: `${metrics.avgRevenuePerTrack.toFixed(4)} MATIC`,
            color: "#FF9800",
            icon: "",
          },
          {
            title: "Total Payments",
            value: metrics.totalPayments.toString(),
            color: "#9C27B0",
            icon: "",
          },
          {
            title: "30-Day Growth",
            value: `${metrics.growthRate > 0 ? "+" : ""}${metrics.growthRate.toFixed(1)}%`,
            color: metrics.growthRate >= 0 ? "#4CAF50" : "#f44336",
            icon: "",
          },
        ].map((metric, index) => (
          <div
            key={index}
            style={{
              padding: "20px",
              border: "1px solid #e0e0e0",
              borderRadius: "12px",
              backgroundColor: "#fafafa",
              textAlign: "center",
              transition: "transform 0.2s, box-shadow 0.2s",
              cursor: "default",
            }}
            onMouseOver={(e) => {
              e.currentTarget.style.transform = "translateY(-2px)"
              e.currentTarget.style.boxShadow = "0 4px 12px rgba(0,0,0,0.1)"
            }}
            onMouseOut={(e) => {
              e.currentTarget.style.transform = "translateY(0)"
              e.currentTarget.style.boxShadow = "none"
            }}
          >
            <div style={{ fontSize: "24px", marginBottom: "8px" }}>{metric.icon}</div>
            <h4 style={{ margin: "0 0 8px 0", color: "#666", fontSize: "14px" }}>{metric.title}</h4>
            <p
              style={{
                fontSize: "20px",
                fontWeight: "bold",
                color: metric.color,
                margin: 0,
              }}
            >
              {metric.value}
            </p>
          </div>
        ))}

        {bestPerformingDay && (
          <div
            style={{
              padding: "20px",
              border: "1px solid #e0e0e0",
              borderRadius: "12px",
              backgroundColor: "#fafafa",
              textAlign: "center",
            }}
          >
            <div style={{ fontSize: "24px", marginBottom: "8px" }}></div>
            <h4 style={{ margin: "0 0 8px 0", color: "#666", fontSize: "14px" }}>Best Day</h4>
            <p
              style={{
                fontSize: "16px",
                fontWeight: "bold",
                color: "#FF5722",
                margin: "0 0 4px 0",
              }}
            >
              {bestPerformingDay.amount.toFixed(4)} MATIC
            </p>
            <p style={{ fontSize: "12px", color: "#999", margin: 0 }}><span suppressHydrationWarning>{bestPerformingDay.date}</span></p>
          </div>
        )}
      </div>

      {/* Time Range Selector */}
      <div style={{ marginBottom: "30px" }}>
        <label style={{ marginRight: "15px", fontWeight: "bold" }}>Time Range:</label>
        <select
          value={timeRange}
          onChange={(e) => setTimeRange(e.target.value as TimeRange)}
          style={{
            padding: "8px 12px",
            border: "1px solid #ddd",
            borderRadius: "6px",
            fontSize: "14px",
          }}
        >
          <option value="7d">Last 7 Days</option>
          <option value="30d">Last 30 Days</option>
          <option value="90d">Last 90 Days</option>
          <option value="1y">Last Year</option>
        </select>
      </div>

      {safeTracks.length === 0 ? (
        <div
          style={{
            textAlign: "center",
            padding: "60px 20px",
            color: "#666",
            backgroundColor: "#f9f9f9",
            borderRadius: "12px",
            border: "2px dashed #ddd",
          }}
        >
          <div style={{ fontSize: "48px", marginBottom: "16px" }}></div>
          <h3>No Track Data Available</h3>
          <p>Register your first track and add some revenue to see analytics here!</p>
        </div>
      ) : (
        <>
          {/* Charts Grid */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "2fr 1fr",
              gap: "30px",
              marginBottom: "40px",
            }}
          >
            {/* Revenue Over Time */}
            <div
              style={{
                padding: "25px",
                border: "1px solid #e0e0e0",
                borderRadius: "12px",
                backgroundColor: "white",
              }}
            >
              <h3 style={{ marginTop: 0, marginBottom: "20px" }}>Revenue Over Time</h3>
              <div style={{ height: "300px" }}>
                <Line data={revenueOverTimeData} options={chartOptions} />
              </div>
            </div>

            {/* Platform Distribution */}
            <div
              style={{
                padding: "25px",
                border: "1px solid #e0e0e0",
                borderRadius: "12px",
                backgroundColor: "white",
              }}
            >
              <h3 style={{ marginTop: 0, marginBottom: "20px" }}>Platform Distribution</h3>
              <div style={{ height: "300px" }}>
                <Doughnut
                  data={platformDistributionData}
                  options={{
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                      legend: {
                        position: "bottom",
                        labels: {
                          padding: 20,
                          usePointStyle: true,
                        },
                      },
                    },
                  }}
                />
              </div>
            </div>
          </div>

          {/* Top Performing Tracks */}
          <div
            style={{
              padding: "25px",
              border: "1px solid #e0e0e0",
              borderRadius: "12px",
              backgroundColor: "white",
              marginBottom: "40px",
            }}
          >
            <h3 style={{ marginTop: 0, marginBottom: "20px" }}>Top Performing Tracks</h3>
            <div style={{ height: "400px" }}>
              <Bar data={trackPerformanceData} options={chartOptions} />
            </div>
          </div>

          {/* Detailed Track Table */}
          <div
            style={{
              padding: "25px",
              border: "1px solid #e0e0e0",
              borderRadius: "12px",
              backgroundColor: "white",
            }}
          >
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                marginBottom: "20px",
                flexWrap: "wrap",
                gap: "15px",
              }}
            >
              <h3 style={{ margin: 0 }}>Track Performance Details</h3>

              <div style={{ display: "flex", gap: "10px", alignItems: "center" }}>
                <label style={{ fontSize: "14px", fontWeight: "bold" }}>Sort by:</label>
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value as any)}
                  style={{
                    padding: "6px 10px",
                    border: "1px solid #ddd",
                    borderRadius: "4px",
                    fontSize: "14px",
                  }}
                >
                  <option value="earnings">Earnings</option>
                  <option value="payments">Payment Count</option>
                  <option value="date">Registration Date</option>
                </select>

                <button
                  onClick={() => setSortOrder(sortOrder === "desc" ? "asc" : "desc")}
                  style={{
                    padding: "6px 10px",
                    border: "1px solid #ddd",
                    borderRadius: "4px",
                    backgroundColor: "white",
                    cursor: "pointer",
                    fontSize: "14px",
                  }}
                >
                  {sortOrder === "desc" ? "↓" : "↑"}
                </button>
              </div>
            </div>

            <div style={{ overflowX: "auto" }}>
              <table
                style={{
                  width: "100%",
                  borderCollapse: "collapse",
                  fontSize: "14px",
                }}
              >
                <thead>
                  <tr style={{ backgroundColor: "#f8f9fa" }}>
                    {[
                      "Track Name",
                      "Total Earnings",
                      "Payments",
                      "Avg per Payment",
                      "Last Payment",
                      "Registered",
                      "Recent Activity",
                    ].map((header) => (
                      <th
                        key={header}
                        style={{
                          padding: "12px 8px",
                          textAlign: "left",
                          border: "1px solid #dee2e6",
                          fontWeight: "bold",
                          color: "#495057",
                        }}
                      >
                        {header}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {sortedTracks.map((track, index) => (
                    <tr
                      key={track.id}
                      style={{
                        backgroundColor: index % 2 === 0 ? "white" : "#f8f9fa",
                        transition: "background-color 0.2s",
                      }}
                      onMouseOver={(e) => {
                        e.currentTarget.style.backgroundColor = "#e3f2fd"
                      }}
                      onMouseOut={(e) => {
                        e.currentTarget.style.backgroundColor = index % 2 === 0 ? "white" : "#f8f9fa"
                      }}
                    >
                      <td
                        style={{
                          padding: "12px 8px",
                          border: "1px solid #dee2e6",
                          fontWeight: "bold",
                          maxWidth: "200px",
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                          whiteSpace: "nowrap",
                        }}
                      >
                        {track.title}
                      </td>
                      <td
                        style={{
                          padding: "12px 8px",
                          border: "1px solid #dee2e6",
                          textAlign: "right",
                          fontWeight: "bold",
                          color: "#4CAF50",
                        }}
                      >
                        {(track.totalEarnings || 0).toFixed(6)} MATIC
                      </td>
                      <td
                        style={{
                          padding: "12px 8px",
                          border: "1px solid #dee2e6",
                          textAlign: "center",
                        }}
                      >
                        {track.revenues?.length || 0}
                      </td>
                      <td
                        style={{
                          padding: "12px 8px",
                          border: "1px solid #dee2e6",
                          textAlign: "right",
                        }}
                      >
                        {track.avgPerPayment.toFixed(6)} MATIC
                      </td>
                      <td
                        style={{
                          padding: "12px 8px",
                          border: "1px solid #dee2e6",
                          textAlign: "center",
                        }}
                      >
                        {track.lastPayment}
                      </td>
                      <td
                        style={{
                          padding: "12px 8px",
                          border: "1px solid #dee2e6",
                          textAlign: "center",
                        }}
                      >
                        <span suppressHydrationWarning>{new Date(track.createdAt).toLocaleDateString()}</span>
                      </td>
                      <td
                        style={{
                          padding: "12px 8px",
                          border: "1px solid #dee2e6",
                          textAlign: "center",
                        }}
                      >
                        <span
                          style={{
                            padding: "4px 8px",
                            borderRadius: "12px",
                            backgroundColor: track.recentActivity > 0 ? "#e8f5e8" : "#f5f5f5",
                            color: track.recentActivity > 0 ? "#2e7d32" : "#666",
                            fontSize: "12px",
                            fontWeight: "bold",
                          }}
                        >
                          {track.recentActivity}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {sortedTracks.length > 10 && (
              <p
                style={{
                  marginTop: "15px",
                  fontSize: "14px",
                  color: "#666",
                  textAlign: "center",
                }}
              >
                Showing all {sortedTracks.length} tracks • Export CSV for offline analysis
              </p>
            )}
          </div>
        </>
      )}
    </div>
  )
}

export default AnalyticsDashboard
