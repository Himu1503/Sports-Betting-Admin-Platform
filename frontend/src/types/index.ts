export interface MoneyAmount {
  amount: number | string
  currency: string
}

export interface Sport {
  name: string
  id?: never // Sport uses 'name' as primary key, not 'id'
}

export interface Team {
  id: number
  name: string
  country: string
  sport: string
  created_at: string
  updated_at: string
}

export interface Competition {
  id: number
  name: string
  country: string
  sport: string
  active: boolean
}

export interface Event {
  id: number
  date: string
  competition_id: number
  team_a_id: number
  team_b_id: number
  status: 'prematch' | 'live' | 'finished'
  created_at: string
  updated_at: string
}

export interface Result {
  event_id: number
  score_a: number | null
  score_b: number | null
  created_at: string
  updated_at: string
  id?: never // Result uses 'event_id' as primary key, not 'id'
}

export interface Customer {
  id: number
  username: string
  password: string
  real_name: string
  currency: string
  status: 'active' | 'disabled'
  balance: MoneyAmount
  preferences: Record<string, any>
  created_at: string
  updated_at: string
}

export interface Bookie {
  name: string
  description: string
  preferences: Record<string, any>
  id?: never // Bookie uses 'name' as primary key, not 'id'
}

export interface Bet {
  id: number
  bookie: string
  customer_id: number
  bookie_bet_id: string
  bet_type: string
  event_id: number
  sport: string
  placement_status: 'pending' | 'placed' | 'failed'
  outcome: 'win' | 'lose' | 'void' | null
  stake: MoneyAmount
  odds: number | string
  placement_data: Record<string, any>
  created_at: string
  updated_at: string
}

export interface BalanceChange {
  id: number
  customer_id: number
  change_type: string
  delta: MoneyAmount
  reference_id: string | null
  description: string | null
  created_at: string
}

export interface AuditLog {
  id: number
  table_name: string
  operation: 'INSERT' | 'UPDATE' | 'DELETE'
  username: string
  changed_at: string
  row_id: number | null
  old_data: Record<string, any> | null
  new_data: Record<string, any> | null
}

