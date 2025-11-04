import { useQuery } from '@tanstack/react-query'
import apiClient from '../api/client'

const ANALYTICS_QUERY_KEY = ['analytics']

interface BetsSummary {
  total_bets: number
  placed_bets: number
  pending_bets: number
  failed_bets: number
  winning_bets: number
  losing_bets: number
  void_bets: number
  total_staked: number
  total_won: number
  total_lost: number
  net_revenue: number
  avg_stake: number
  avg_odds: number
  win_rate: number
}

interface ResultsSummary {
  total_events: number
  finished_events: number
  live_events: number
  prematch_events: number
  events_with_results: number
  avg_total_score: number
  max_total_score: number
  min_total_score: number
  avg_score_a: number
  avg_score_b: number
}

export function useAnalytics() {
  const betsSummary = useQuery({
    queryKey: [...ANALYTICS_QUERY_KEY, 'bets-summary'],
    queryFn: async () => {
      const response = await apiClient.get<BetsSummary>('/api/analytics/bets/summary')
      return response.data
    },
    staleTime: 1000 * 60, // 1 minute - analytics can be slightly stale
  })

  const resultsSummary = useQuery({
    queryKey: [...ANALYTICS_QUERY_KEY, 'results-summary'],
    queryFn: async () => {
      const response = await apiClient.get<ResultsSummary>('/api/analytics/results/summary')
      return response.data
    },
    staleTime: 1000 * 60,
  })

  const betsBySport = useQuery({
    queryKey: [...ANALYTICS_QUERY_KEY, 'bets-by-sport'],
    queryFn: async () => {
      const response = await apiClient.get('/api/analytics/bets/by-sport')
      return response.data
    },
    staleTime: 1000 * 60,
  })

  const betsByStatus = useQuery({
    queryKey: [...ANALYTICS_QUERY_KEY, 'bets-by-status'],
    queryFn: async () => {
      const response = await apiClient.get('/api/analytics/bets/by-status')
      return response.data
    },
    staleTime: 1000 * 60,
  })

  const betsByOutcome = useQuery({
    queryKey: [...ANALYTICS_QUERY_KEY, 'bets-by-outcome'],
    queryFn: async () => {
      const response = await apiClient.get('/api/analytics/bets/by-outcome')
      return response.data
    },
    staleTime: 1000 * 60,
  })

  const betsTrends = useQuery({
    queryKey: [...ANALYTICS_QUERY_KEY, 'bets-trends', 30],
    queryFn: async () => {
      const response = await apiClient.get('/api/analytics/bets/trends?days=30')
      return response.data
    },
    staleTime: 1000 * 60,
  })

  const topCustomers = useQuery({
    queryKey: [...ANALYTICS_QUERY_KEY, 'top-customers', 10],
    queryFn: async () => {
      const response = await apiClient.get('/api/analytics/top-customers?limit=10')
      return response.data
    },
    staleTime: 1000 * 60,
  })

  return {
    betsSummary,
    resultsSummary,
    betsBySport,
    betsByStatus,
    betsByOutcome,
    betsTrends,
    topCustomers,
    isLoading: betsSummary.isLoading || resultsSummary.isLoading || 
               betsBySport.isLoading || betsByStatus.isLoading ||
               betsByOutcome.isLoading || betsTrends.isLoading || 
               topCustomers.isLoading,
    error: betsSummary.error || resultsSummary.error || 
           betsBySport.error || betsByStatus.error ||
           betsByOutcome.error || betsTrends.error || 
           topCustomers.error,
  }
}

