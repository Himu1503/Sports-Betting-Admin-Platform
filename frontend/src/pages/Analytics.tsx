import { useAnalytics } from '../hooks/useAnalytics'
import { BarChart, PieChart, LineChart } from '../components/Charts'
import './Page.css'

function Analytics() {
  const {
    betsSummary,
    resultsSummary,
    betsBySport,
    betsByStatus,
    betsByOutcome,
    betsTrends,
    topCustomers,
    isLoading,
    error,
  } = useAnalytics()

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2
    }).format(amount)
  }

  const formatPercent = (value: number) => {
    return `${value.toFixed(1)}%`
  }

  if (isLoading) {
    return (
      <div className="page">
        <div className="page-header">
          <h2 className="text-2xl font-bold text-foreground">Analytics & Charts</h2>
        </div>
        <div className="text-center py-8">Loading analytics...</div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="page">
        <div className="page-header">
          <h2 className="text-2xl font-bold text-foreground">Analytics & Charts</h2>
        </div>
        <div className="bg-card border border-border rounded-lg p-6">
          <div className="text-center py-8">
            <p className="text-red-600 mb-4">Error: {String(error)}</p>
            <button 
              onClick={() => window.location.reload()}
              className="px-4 py-2 bg-primary text-primary-foreground rounded hover:bg-primary/90"
            >
              Retry
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="page">
      <div className="page-header">
        <h2 className="text-2xl font-bold text-foreground">Analytics & Charts</h2>
      </div>

      {/* Bets Summary Cards */}
      {betsSummary.data && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <div className="bg-card border border-border rounded-lg p-4">
            <h3 className="text-sm font-medium text-muted-foreground mb-1">Total Bets</h3>
            <p className="text-2xl font-bold text-foreground">{betsSummary.data.total_bets}</p>
            <p className="text-xs text-muted-foreground mt-1">
              {betsSummary.data.placed_bets} placed
            </p>
          </div>

          <div className="bg-card border border-border rounded-lg p-4">
            <h3 className="text-sm font-medium text-muted-foreground mb-1">Total Staked</h3>
            <p className="text-2xl font-bold text-foreground">
              {formatCurrency(betsSummary.data.total_staked)}
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              Avg: {formatCurrency(betsSummary.data.avg_stake)}
            </p>
          </div>

          <div className="bg-card border border-border rounded-lg p-4">
            <h3 className="text-sm font-medium text-muted-foreground mb-1">Win Rate</h3>
            <p className="text-2xl font-bold text-green-600">
              {formatPercent(betsSummary.data.win_rate)}
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              {betsSummary.data.winning_bets} wins / {betsSummary.data.placed_bets} placed
            </p>
          </div>

          <div className="bg-card border border-border rounded-lg p-4">
            <h3 className="text-sm font-medium text-muted-foreground mb-1">Net Revenue</h3>
            <p className={`text-2xl font-bold ${betsSummary.data.net_revenue >= 0 ? 'text-green-600' : 'text-red-600'}`}>
              {formatCurrency(betsSummary.data.net_revenue)}
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              Won: {formatCurrency(betsSummary.data.total_won)}
            </p>
          </div>
        </div>
      )}

      {/* Results Summary Cards */}
      {resultsSummary.data && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <div className="bg-card border border-border rounded-lg p-4">
            <h3 className="text-sm font-medium text-muted-foreground mb-1">Total Events</h3>
            <p className="text-2xl font-bold text-foreground">{resultsSummary.data.total_events}</p>
            <p className="text-xs text-muted-foreground mt-1">
              {resultsSummary.data.finished_events} finished
            </p>
          </div>

          <div className="bg-card border border-border rounded-lg p-4">
            <h3 className="text-sm font-medium text-muted-foreground mb-1">Events with Results</h3>
            <p className="text-2xl font-bold text-foreground">
              {resultsSummary.data.events_with_results}
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              {resultsSummary.data.total_events > 0 
                ? formatPercent((resultsSummary.data.events_with_results / resultsSummary.data.total_events) * 100)
                : '0%'} coverage
            </p>
          </div>

          <div className="bg-card border border-border rounded-lg p-4">
            <h3 className="text-sm font-medium text-muted-foreground mb-1">Avg Total Score</h3>
            <p className="text-2xl font-bold text-foreground">
              {resultsSummary.data.avg_total_score.toFixed(2)}
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              Max: {resultsSummary.data.max_total_score || 0}
            </p>
          </div>

          <div className="bg-card border border-border rounded-lg p-4">
            <h3 className="text-sm font-medium text-muted-foreground mb-1">Event Status</h3>
            <p className="text-lg font-semibold text-foreground">
              {resultsSummary.data.prematch_events} prematch
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              {resultsSummary.data.live_events} live, {resultsSummary.data.finished_events} finished
            </p>
          </div>
        </div>
      )}

      {/* Debug Info */}
      {/* <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6">
        <h3 className="font-bold mb-2">Debug Info:</h3>
        <p>Bets by Sport: {betsBySport?.length || 0} items</p>
        <p>Bets by Status: {betsByStatus?.length || 0} items</p>
        <p>Bets by Outcome: {betsByOutcome?.length || 0} items</p>
        <p>Bets Trends: {betsTrends?.length || 0} items</p>
        {betsBySport && betsBySport.length > 0 && (
          <pre className="mt-2 text-xs overflow-auto">
            {JSON.stringify(betsBySport.slice(0, 2), null, 2)}
          </pre>
        )}
      </div> */}

      {/* Charts Section */}
      <div className="mb-6">
        <h2 className="text-xl font-bold mb-4 text-foreground">📊 Charts & Visualizations</h2>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Bets by Sport - Bar Chart */}
          {betsBySport.data && betsBySport.data.length > 0 ? (
            <BarChart
              title="Bets by Sport"
              description="Distribution of bets across different sports"
              data={betsBySport.data.map((sport: any) => ({
                name: sport.sport || 'Unknown',
                value: sport.total_bets || 0,
                staked: sport.total_staked || 0,
                winRate: sport.win_rate || 0,
              }))}
              dataKey="value"
              colors={['#3b82f6', '#10b981', '#f59e0b', '#8b5cf6', '#ec4899']}
              height={350}
            />
          ) : (
            <div className="bg-card border border-border rounded-lg p-6">
              <h3 className="text-lg font-semibold mb-2">Bets by Sport</h3>
              <p className="text-muted-foreground">
                {betsBySport.data?.length === 0 ? 'No bet data available. Charts will appear here once you have bets.' : 'Loading...'}
              </p>
            </div>
          )}

          {/* Bets by Status - Pie Chart */}
          {betsByStatus.data && betsByStatus.data.length > 0 ? (
            <PieChart
              title="Bets by Status"
              description="Breakdown of bet placement statuses"
              data={betsByStatus.data.map((status: any) => ({
                name: (status.status || 'Unknown').charAt(0).toUpperCase() + (status.status || '').slice(1),
                value: status.count || 0,
                staked: status.total_staked || 0,
              }))}
              dataKey="value"
              colors={['#10b981', '#f59e0b', '#ef4444']}
              height={350}
            />
          ) : (
            <div className="bg-card border border-border rounded-lg p-6">
              <h3 className="text-lg font-semibold mb-2">Bets by Status</h3>
              <p className="text-muted-foreground">
                {betsByStatus.data?.length === 0 ? 'No bet status data available.' : 'Loading...'}
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Bets by Outcome */}
      {betsByOutcome.data && betsByOutcome.data.length > 0 ? (
        <div className="mb-6">
          <BarChart
            title="Bets by Outcome"
            description="Distribution of bet outcomes for placed bets"
            data={betsByOutcome.data.map((outcome: any) => ({
              name: outcome.outcome === 'pending' ? 'Pending' : 
                    outcome.outcome === 'win' ? 'Win' :
                    outcome.outcome === 'lose' ? 'Lose' : 
                    outcome.outcome === 'void' ? 'Void' : String(outcome.outcome || 'Unknown'),
              value: outcome.count || 0,
              staked: outcome.total_staked || 0,
              won: outcome.total_won || 0,
              lost: outcome.total_lost || 0,
            }))}
            dataKey="value"
            colors={['#10b981', '#ef4444', '#f59e0b', '#6366f1']}
            height={350}
          />
        </div>
      ) : (
        <div className="bg-card border border-border rounded-lg p-6 mb-6">
          <h3 className="text-lg font-semibold mb-2">Bets by Outcome</h3>
          <p className="text-muted-foreground">No outcome data available. This chart will show once you have placed bets.</p>
        </div>
      )}


      {/* Bet Trends Over Time */}
      {betsTrends.data && betsTrends.data.length > 0 ? (
        <div className="mb-6">
          <LineChart
            title="Bet Trends (Last 30 Days)"
            description="Daily bet activity and trends over time"
            data={betsTrends.data.map((trend: any) => ({
              ...trend,
              date: trend.date ? (typeof trend.date === 'string' ? trend.date.split('T')[0] : String(trend.date)) : '',
              total_bets: trend.total_bets || 0,
              placed_bets: trend.placed_bets || 0,
            }))}
            xAxisKey="date"
            lines={[
              { dataKey: 'total_bets', name: 'Total Bets', color: '#3b82f6' },
              { dataKey: 'placed_bets', name: 'Placed Bets', color: '#10b981' },
            ]}
            height={350}
          />
        </div>
      ) : (
        <div className="bg-card border border-border rounded-lg p-6 mb-6">
          <h3 className="text-lg font-semibold mb-2">Bet Trends (Last 30 Days)</h3>
          <p className="text-muted-foreground">No trend data available. This chart will show daily bet activity once you have bet data.</p>
        </div>
      )}

      {/* Top Customers */}
      <div className="bg-card border border-border rounded-lg p-6">
        <h3 className="text-lg font-semibold mb-4">Top Customers</h3>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-border">
                <th className="text-left py-2 px-4 font-medium">Customer</th>
                <th className="text-right py-2 px-4 font-medium">Total Bets</th>
                <th className="text-right py-2 px-4 font-medium">Placed</th>
                <th className="text-right py-2 px-4 font-medium">Win Rate</th>
                <th className="text-right py-2 px-4 font-medium">Total Staked</th>
                <th className="text-right py-2 px-4 font-medium">Net Profit</th>
              </tr>
            </thead>
            <tbody>
              {topCustomers.data?.map((customer: any) => (
                <tr key={customer.customer_id} className="border-b border-border">
                  <td className="py-2 px-4">
                    <div>
                      <div className="font-medium">{customer.real_name}</div>
                      <div className="text-sm text-muted-foreground">@{customer.username}</div>
                    </div>
                  </td>
                  <td className="text-right py-2 px-4">{customer.total_bets}</td>
                  <td className="text-right py-2 px-4">{customer.placed_bets}</td>
                  <td className="text-right py-2 px-4">
                    {formatPercent(customer.win_rate)}
                  </td>
                  <td className="text-right py-2 px-4">
                    {formatCurrency(customer.total_staked)}
                  </td>
                  <td className={`text-right py-2 px-4 font-medium ${
                    customer.net_profit >= 0 ? 'text-green-600' : 'text-red-600'
                  }`}>
                    {formatCurrency(customer.net_profit)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}

export default Analytics

