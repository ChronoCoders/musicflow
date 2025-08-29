import React, { useState, useMemo } from 'react'
import { Line, Bar, Doughnut } from 'react-chartjs-2'
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
} from 'chart.js'

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  Title,
  Tooltip,
  Legend
)

interface Track {
  id: number
  title: string
  totalEarnings: number
  revenues: Array<{
    amount: number
    platform: string
    createdAt: string
  }>
}

interface AnalyticsProps {
  tracks: Track[]
}

const AnalyticsDashboard: React.FC<AnalyticsProps> = ({ tracks }) => {
  const [timeRange, setTimeRange] = useState<'7d' | '30d' | '90d'>('30d')

  // Safe tracks array
  const safeTracks = tracks || []

  // Basic metrics
  const totalRevenue = safeTracks.reduce((sum, track) => sum + track.totalEarnings, 0)
  const totalTracks = safeTracks.length
  const avgRevenuePerTrack = totalTracks > 0 ? totalRevenue / totalTracks : 0
  const totalPayments = safeTracks.reduce((sum, track) => sum + (track.revenues?.length || 0), 0)

  // Detailed track list for table (memoized)
  const detailedTracks = useMemo(() => {
    return safeTracks.map(track => ({
      ...track,
      lastPayment: track.revenues && track.revenues.length > 0 
        ? new Date(track.revenues[track.revenues.length - 1].createdAt).toLocaleDateString()
        : 'No payments',
      avgPerPayment: track.revenues && track.revenues.length > 0 
        ? (track.totalEarnings / track.revenues.length).toFixed(4)
        : '0.0000'
    })).sort((a, b) => b.totalEarnings - a.totalEarnings)
  }, [safeTracks])

  // Revenue over time
  const getRevenueOverTime = () => {
    const days = timeRange === '7d' ? 7 : timeRange === '30d' ? 30 : 90
    const labels = Array.from({length: days}, (_, i) => {
      const date = new Date()
      date.setDate(date.getDate() - (days - 1 - i))
      return date.toLocaleDateString()
    })

    const data = labels.map(label => {
      const targetDate = new Date(label).toDateString()
      return safeTracks.reduce((sum, track) => {
        if (!track.revenues) return sum
        return sum + track.revenues
          .filter(rev => new Date(rev.createdAt).toDateString() === targetDate)
          .reduce((revSum, rev) => revSum + rev.amount, 0)
      }, 0)
    })

    return {
      labels,
      datasets: [{
        label: 'Revenue (MATIC)',
        data,
        borderColor: 'rgb(75, 192, 192)',
        backgroundColor: 'rgba(75, 192, 192, 0.2)',
        tension: 0.1
      }]
    }
  }

  // Track performance comparison
  const getTrackPerformance = () => {
    const topTracks = safeTracks
      .sort((a, b) => b.totalEarnings - a.totalEarnings)
      .slice(0, 5)

    return {
      labels: topTracks.map(track => track.title),
      datasets: [{
        label: 'Total Earnings (MATIC)',
        data: topTracks.map(track => track.totalEarnings),
        backgroundColor: [
          'rgba(255, 99, 132, 0.8)',
          'rgba(54, 162, 235, 0.8)',
          'rgba(255, 205, 86, 0.8)',
          'rgba(75, 192, 192, 0.8)',
          'rgba(153, 102, 255, 0.8)',
        ]
      }]
    }
  }

  // Platform distribution
  const getPlatformDistribution = () => {
    const platformTotals: {[key: string]: number} = {}
    
    safeTracks.forEach(track => {
      if (track.revenues) {
        track.revenues.forEach(rev => {
          platformTotals[rev.platform] = (platformTotals[rev.platform] || 0) + rev.amount
        })
      }
    })

    return {
      labels: Object.keys(platformTotals),
      datasets: [{
        data: Object.values(platformTotals),
        backgroundColor: [
          '#FF6384',
          '#36A2EB',
          '#FFCE56',
          '#4BC0C0',
          '#9966FF'
        ]
      }]
    }
  }

  // Export CSV
  const exportToCSV = () => {
    if (safeTracks.length === 0) {
      alert('No data to export')
      return
    }
    
    const csvData = [
      ['Track Name', 'Total Earnings (MATIC)', 'Payment Count', 'Last Payment'],
      ...safeTracks.map(track => [
        track.title,
        track.totalEarnings.toFixed(4),
        track.revenues?.length || 0,
        track.revenues && track.revenues.length > 0 
          ? new Date(track.revenues[track.revenues.length - 1].createdAt).toLocaleDateString()
          : 'No payments'
      ])
    ]
    
    const csvString = csvData.map(row => row.join(',')).join('\n')
    const blob = new Blob([csvString], { type: 'text/csv' })
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `musicflow-analytics-${new Date().toISOString().split('T')[0]}.csv`
    a.click()
    window.URL.revokeObjectURL(url)
  }

  // Best day calculation
  const getBestDay = () => {
    const dailyTotals: {[key: string]: number} = {}
    
    safeTracks.forEach(track => {
      if (track.revenues) {
        track.revenues.forEach(rev => {
          const day = new Date(rev.createdAt).toLocaleDateString()
          dailyTotals[day] = (dailyTotals[day] || 0) + rev.amount
        })
      }
    })
    
    const bestDay = Object.entries(dailyTotals)
      .sort(([,a], [,b]) => b - a)[0]
    
    return bestDay ? { date: bestDay[0], amount: bestDay[1] } : null
  }

  const bestDay = getBestDay()

  return (
    <div style={{padding: '20px'}}>
      <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px'}}>
        <h2>Revenue Analytics</h2>
        <button 
          onClick={exportToCSV}
          style={{
            padding: '8px 16px',
            backgroundColor: '#4CAF50',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer'
          }}
        >
          Export CSV
        </button>
      </div>
      
      {/* Key Metrics */}
      <div style={{display: 'flex', gap: '20px', marginBottom: '30px'}}>
        <div style={{padding: '15px', border: '1px solid #ddd', borderRadius: '8px', flex: 1}}>
          <h3>Total Revenue</h3>
          <p style={{fontSize: '24px', fontWeight: 'bold', color: '#4CAF50'}}>
            {totalRevenue.toFixed(4)} MATIC
          </p>
        </div>
        <div style={{padding: '15px', border: '1px solid #ddd', borderRadius: '8px', flex: 1}}>
          <h3>Total Tracks</h3>
          <p style={{fontSize: '24px', fontWeight: 'bold', color: '#2196F3'}}>
            {totalTracks}
          </p>
        </div>
        <div style={{padding: '15px', border: '1px solid #ddd', borderRadius: '8px', flex: 1}}>
          <h3>Avg per Track</h3>
          <p style={{fontSize: '24px', fontWeight: 'bold', color: '#FF9800'}}>
            {avgRevenuePerTrack.toFixed(4)} MATIC
          </p>
        </div>
        <div style={{padding: '15px', border: '1px solid #ddd', borderRadius: '8px', flex: 1}}>
          <h3>Total Payments</h3>
          <p style={{fontSize: '24px', fontWeight: 'bold', color: '#9C27B0'}}>
            {totalPayments}
          </p>
        </div>
        {bestDay && (
          <div style={{padding: '15px', border: '1px solid #ddd', borderRadius: '8px', flex: 1}}>
            <h3>Best Day</h3>
            <p style={{fontSize: '16px', fontWeight: 'bold', color: '#FF5722'}}>
              {bestDay.amount.toFixed(4)} MATIC
            </p>
            <p style={{fontSize: '12px', color: '#666'}}>
              {bestDay.date}
            </p>
          </div>
        )}
      </div>

      {/* Time Range Selector */}
      <div style={{marginBottom: '20px'}}>
        <label>Time Range: </label>
        <select 
          value={timeRange} 
          onChange={(e) => setTimeRange(e.target.value as any)}
          style={{padding: '5px', marginLeft: '10px'}}
        >
          <option value="7d">Last 7 Days</option>
          <option value="30d">Last 30 Days</option>
          <option value="90d">Last 90 Days</option>
        </select>
      </div>

      {/* Charts */}
      <div style={{display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '20px', marginBottom: '30px'}}>
        <div style={{padding: '20px', border: '1px solid #ddd', borderRadius: '8px'}}>
          <h3>Revenue Over Time</h3>
          <Line data={getRevenueOverTime()} options={{responsive: true}} />
        </div>
        
        <div style={{padding: '20px', border: '1px solid #ddd', borderRadius: '8px'}}>
          <h3>Platform Distribution</h3>
          <Doughnut data={getPlatformDistribution()} options={{responsive: true}} />
        </div>
      </div>

      <div style={{padding: '20px', border: '1px solid #ddd', borderRadius: '8px', marginBottom: '30px'}}>
        <h3>Top Performing Tracks</h3>
        <Bar data={getTrackPerformance()} options={{responsive: true}} />
      </div>

      {/* Track Performance Table */}
      <div style={{padding: '20px', border: '1px solid #ddd', borderRadius: '8px'}}>
        <h3>Track Performance Details</h3>
        
        {safeTracks.length === 0 ? (
          <p style={{textAlign: 'center', color: '#666', padding: '20px'}}>
            No track data available
          </p>
        ) : (
          <table style={{width: '100%', borderCollapse: 'collapse', marginTop: '15px'}}>
            <thead>
              <tr style={{backgroundColor: '#f5f5f5'}}>
                <th style={{padding: '10px', textAlign: 'left', border: '1px solid #ddd'}}>Track Name</th>
                <th style={{padding: '10px', textAlign: 'right', border: '1px solid #ddd'}}>Total Earnings</th>
                <th style={{padding: '10px', textAlign: 'center', border: '1px solid #ddd'}}>Payments</th>
                <th style={{padding: '10px', textAlign: 'right', border: '1px solid #ddd'}}>Avg per Payment</th>
                <th style={{padding: '10px', textAlign: 'center', border: '1px solid #ddd'}}>Last Payment</th>
              </tr>
            </thead>
            <tbody>
              {detailedTracks.slice(0, 10).map((track, index) => (
                <tr key={track.id} style={{backgroundColor: index % 2 === 0 ? 'white' : '#fafafa'}}>
                  <td style={{padding: '8px', border: '1px solid #ddd', fontWeight: 'bold'}}>
                    {track.title}
                  </td>
                  <td style={{padding: '8px', border: '1px solid #ddd', textAlign: 'right'}}>
                    {track.totalEarnings.toFixed(4)} MATIC
                  </td>
                  <td style={{padding: '8px', border: '1px solid #ddd', textAlign: 'center'}}>
                    {track.revenues?.length || 0}
                  </td>
                  <td style={{padding: '8px', border: '1px solid #ddd', textAlign: 'right'}}>
                    {track.avgPerPayment} MATIC
                  </td>
                  <td style={{padding: '8px', border: '1px solid #ddd', textAlign: 'center'}}>
                    {track.lastPayment}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
        
        {safeTracks.length > 10 && (
          <p style={{marginTop: '10px', fontSize: '14px', color: '#666'}}>
            Showing top 10 tracks. Export CSV for complete data.
          </p>
        )}
      </div>
    </div>
  )
}

export default AnalyticsDashboard