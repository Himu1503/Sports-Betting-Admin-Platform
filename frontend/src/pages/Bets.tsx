import React, { useState, useEffect } from 'react'
import DataTable from '../components/DataTable'
import Modal from '../components/Modal'
import AuditModal from '../components/AuditModal'
import { PlacementDataDisplay } from '../components/PlacementDataDisplay'
import { PlacementDataEditor } from '../components/PlacementDataEditor'
import { Button } from '@/components/ui/button'
import { Bet, Bookie, Customer, Event, Sport } from '../types'
import apiClient from '../api/client'
import './Page.css'

function Bets() {
  const [bets, setBets] = useState<Bet[]>([])
  const [bookies, setBookies] = useState<Bookie[]>([])
  const [customers, setCustomers] = useState<Customer[]>([])
  const [events, setEvents] = useState<Event[]>([])
  const [sports, setSports] = useState<Sport[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [isAuditModalOpen, setIsAuditModalOpen] = useState(false)
  const [selectedBetId, setSelectedBetId] = useState<number | null>(null)
  const [editingBet, setEditingBet] = useState<Bet | null>(null)
  const [formData, setFormData] = useState({
    bookie: '',
    customer_id: '',
    bookie_bet_id: '',
    bet_type: '',
    event_id: '',
    sport: '',
    placement_status: 'pending' as 'pending' | 'placed' | 'failed',
    outcome: '' as '' | 'win' | 'lose' | 'void',
    stake_amount: '0',
    stake_currency: 'USD' as 'USD' | 'GBP' | 'EUR',
    odds: '1.01',
    placement_data: {} as Record<string, any>,
  })

  useEffect(() => {
    fetchBets()
    fetchBookies()
    fetchCustomers()
    fetchEvents()
    fetchSports()
  }, [])

  const fetchBets = async () => {
    try {
      const response = await apiClient.get('/api/bets')
      setBets(response.data)
    } catch (error) {
      console.error('Failed to fetch bets:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const fetchBookies = async () => {
    try {
      const response = await apiClient.get('/api/bookies')
      setBookies(response.data)
    } catch (error) {
      console.error('Failed to fetch bookies:', error)
    }
  }

  const fetchCustomers = async () => {
    try {
      const response = await apiClient.get('/api/customers')
      setCustomers(response.data)
    } catch (error) {
      console.error('Failed to fetch customers:', error)
    }
  }

  const fetchEvents = async () => {
    try {
      const response = await apiClient.get('/api/events')
      setEvents(response.data)
    } catch (error) {
      console.error('Failed to fetch events:', error)
    }
  }

  const fetchSports = async () => {
    try {
      const response = await apiClient.get('/api/sports')
      setSports(response.data)
    } catch (error) {
      console.error('Failed to fetch sports:', error)
    }
  }

  const handleCreate = () => {
    setEditingBet(null)
    setFormData({
      bookie: '',
      customer_id: '',
      bookie_bet_id: '',
      bet_type: '',
      event_id: '',
      sport: '',
      placement_status: 'pending',
      outcome: '',
      stake_amount: '0',
      stake_currency: 'USD',
      odds: '1.01',
      placement_data: {},
    })
    setIsModalOpen(true)
  }

  const handleEdit = (bet: Bet) => {
    setEditingBet(bet)
    setFormData({
      bookie: bet.bookie,
      customer_id: String(bet.customer_id),
      bookie_bet_id: bet.bookie_bet_id,
      bet_type: bet.bet_type,
      event_id: String(bet.event_id),
      sport: bet.sport,
      placement_status: bet.placement_status,
      outcome: (bet.outcome || '') as '' | 'win' | 'lose' | 'void',
      stake_amount: String(bet.stake.amount),
      stake_currency: bet.stake.currency as 'USD' | 'GBP' | 'EUR',
      odds: String(bet.odds),
      placement_data: bet.placement_data || {},
    })
    setIsModalOpen(true)
  }

  const handleDelete = async (bet: Bet) => {
    if (!window.confirm(`Delete bet ID ${bet.id}?`)) return
    try {
      await apiClient.delete(`/api/bets/${bet.id}`)
      fetchBets()
    } catch (error: any) {
      alert(error.response?.data?.detail || 'Failed to delete bet')
    }
  }

  const handleViewAudit = (bet: Bet) => {
    setSelectedBetId(bet.id)
    setIsAuditModalOpen(true)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      const payload: any = {
        bookie: formData.bookie,
        customer_id: parseInt(formData.customer_id),
        bookie_bet_id: formData.bookie_bet_id,
        bet_type: formData.bet_type,
        event_id: parseInt(formData.event_id),
        sport: formData.sport,
        placement_status: formData.placement_status,
        stake: {
          amount: parseFloat(formData.stake_amount),
          currency: formData.stake_currency,
        },
        odds: parseFloat(formData.odds),
        placement_data: formData.placement_data,
      }
      if (formData.outcome) {
        payload.outcome = formData.outcome
      }
      if (editingBet) {
        await apiClient.put(`/api/bets/${editingBet.id}`, payload)
      } else {
        await apiClient.post('/api/bets', payload)
      }
      setIsModalOpen(false)
      fetchBets()
    } catch (error: any) {
      alert(error.response?.data?.detail || 'Failed to save bet')
    }
  }

  const columns = [
    { key: 'id', header: 'ID' },
    { key: 'bookie', header: 'Bookie' },
    { key: 'bookie_bet_id', header: 'Bookie Bet ID' },
    { key: 'bet_type', header: 'Bet Type' },
    { key: 'sport', header: 'Sport' },
    { 
      key: 'placement_status', 
      header: 'Status',
      render: (bet: Bet) => (
        <span className={`px-2 py-1 rounded text-xs font-medium ${
          bet.placement_status === 'placed' ? 'bg-green-100 text-green-800' :
          bet.placement_status === 'failed' ? 'bg-red-100 text-red-800' :
          'bg-yellow-100 text-yellow-800'
        }`}>
          {bet.placement_status.charAt(0).toUpperCase() + bet.placement_status.slice(1)}
        </span>
      )
    },
    { 
      key: 'outcome', 
      header: 'Outcome',
      render: (bet: Bet) => bet.outcome ? (
        <span className={`px-2 py-1 rounded text-xs font-medium ${
          bet.outcome === 'win' ? 'bg-green-100 text-green-800' :
          bet.outcome === 'lose' ? 'bg-red-100 text-red-800' :
          'bg-gray-100 text-gray-800'
        }`}>
          {bet.outcome.charAt(0).toUpperCase() + bet.outcome.slice(1)}
        </span>
      ) : <span className="text-muted-foreground text-xs">—</span>
    },
    {
      key: 'stake',
      header: 'Stake',
      render: (bet: Bet) =>
        <span className="font-semibold">{bet.stake.currency} {Number(bet.stake.amount).toFixed(2)}</span>,
    },
    { 
      key: 'odds', 
      header: 'Odds',
      render: (bet: Bet) => <span className="font-medium">{Number(bet.odds).toFixed(2)}</span>
    },
    {
      key: 'placement_data',
      header: 'Placement Data',
      render: (bet: Bet) => <PlacementDataDisplay placementData={bet.placement_data || {}} compact />,
    },
  ]

  return (
    <div className="page">
      <div className="page-header">
        <h2 className="text-2xl font-bold text-foreground">Bets</h2>
        <Button onClick={handleCreate}>
          + Add Bet
        </Button>
      </div>

      <DataTable
        columns={columns}
        data={bets}
        onEdit={handleEdit}
        onDelete={handleDelete}
        onViewAudit={handleViewAudit}
        isLoading={isLoading}
      />

      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingBet ? 'Edit Bet' : 'Create Bet'}
      >
        <form onSubmit={handleSubmit} className="bet-form space-y-4">
          {/* Basic Information Section */}
          <div className="space-y-3">
            <h3 className="text-sm font-semibold text-foreground border-b border-border pb-2">Basic Information</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="form-group">
                <label>Bookie *</label>
                <select
                  value={formData.bookie}
                  onChange={(e) => setFormData({ ...formData, bookie: e.target.value })}
                  required
                  className="w-full px-3 py-2 border border-border rounded bg-background"
                >
                  <option value="">Select bookie</option>
                  {bookies.map((bookie) => (
                    <option key={bookie.name} value={bookie.name}>
                      {bookie.name}
                    </option>
                  ))}
                </select>
              </div>
              <div className="form-group">
                <label>Customer *</label>
                <select
                  value={formData.customer_id}
                  onChange={(e) => setFormData({ ...formData, customer_id: e.target.value })}
                  required
                  className="w-full px-3 py-2 border border-border rounded bg-background"
                >
                  <option value="">Select customer</option>
                  {customers.map((customer) => (
                    <option key={customer.id} value={customer.id}>
                      {customer.username} ({customer.real_name})
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <div className="form-group">
              <label>Bookie Bet ID *</label>
              <input
                type="text"
                value={formData.bookie_bet_id}
                onChange={(e) => setFormData({ ...formData, bookie_bet_id: e.target.value })}
                required
                placeholder="e.g. BM-2025-001"
                className="w-full px-3 py-2 border border-border rounded bg-background"
              />
            </div>
          </div>

          {/* Bet Details Section */}
          <div className="space-y-3">
            <h3 className="text-sm font-semibold text-foreground border-b border-border pb-2">Bet Details</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="form-group">
                <label>Bet Type *</label>
                <input
                  type="text"
                  value={formData.bet_type}
                  onChange={(e) => setFormData({ ...formData, bet_type: e.target.value })}
                  required
                  placeholder="e.g. match_winner, total_points"
                  className="w-full px-3 py-2 border border-border rounded bg-background"
                />
              </div>
              <div className="form-group">
                <label>Sport *</label>
                <select
                  value={formData.sport}
                  onChange={(e) => setFormData({ ...formData, sport: e.target.value })}
                  required
                  className="w-full px-3 py-2 border border-border rounded bg-background"
                >
                  <option value="">Select sport</option>
                  {sports.map((sport) => (
                    <option key={sport.name} value={sport.name}>
                      {sport.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <div className="form-group">
              <label>Event *</label>
              <select
                value={formData.event_id}
                onChange={(e) => setFormData({ ...formData, event_id: e.target.value })}
                required
                className="w-full px-3 py-2 border border-border rounded bg-background"
              >
                <option value="">Select event</option>
                {events.map((event) => (
                  <option key={event.id} value={event.id}>
                    Event {event.id} - {new Date(event.date).toLocaleString()}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Status & Outcome Section */}
          <div className="space-y-3">
            <h3 className="text-sm font-semibold text-foreground border-b border-border pb-2">Status & Outcome</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="form-group">
                <label>Placement Status *</label>
                <select
                  value={formData.placement_status}
                  onChange={(e) => setFormData({ ...formData, placement_status: e.target.value as 'pending' | 'placed' | 'failed' })}
                  required
                  className="w-full px-3 py-2 border border-border rounded bg-background"
                >
                  <option value="pending">Pending</option>
                  <option value="placed">Placed</option>
                  <option value="failed">Failed</option>
                </select>
              </div>
              <div className="form-group">
                <label>Outcome</label>
                <select
                  value={formData.outcome}
                  onChange={(e) => setFormData({ ...formData, outcome: e.target.value as '' | 'win' | 'lose' | 'void' })}
                  className="w-full px-3 py-2 border border-border rounded bg-background"
                >
                  <option value="">None</option>
                  <option value="win">Win</option>
                  <option value="lose">Lose</option>
                  <option value="void">Void</option>
                </select>
              </div>
            </div>
          </div>

          {/* Financial Details Section */}
          <div className="space-y-3">
            <h3 className="text-sm font-semibold text-foreground border-b border-border pb-2">Financial Details</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="form-group">
                <label>Stake Amount *</label>
                <input
                  type="number"
                  step="0.01"
                  min="0.01"
                  value={formData.stake_amount}
                  onChange={(e) => setFormData({ ...formData, stake_amount: e.target.value })}
                  required
                  placeholder="0.00"
                  className="w-full px-3 py-2 border border-border rounded bg-background"
                />
              </div>
              <div className="form-group">
                <label>Stake Currency *</label>
                <select
                  value={formData.stake_currency}
                  onChange={(e) => setFormData({ ...formData, stake_currency: e.target.value as 'USD' | 'GBP' | 'EUR' })}
                  required
                  className="w-full px-3 py-2 border border-border rounded bg-background"
                >
                  <option value="USD">USD</option>
                  <option value="GBP">GBP</option>
                  <option value="EUR">EUR</option>
                </select>
              </div>
              <div className="form-group">
                <label>Odds *</label>
                <input
                  type="number"
                  step="0.01"
                  min="1.01"
                  max="999"
                  value={formData.odds}
                  onChange={(e) => setFormData({ ...formData, odds: e.target.value })}
                  required
                  placeholder="1.01 - 999.00"
                  className="w-full px-3 py-2 border border-border rounded bg-background"
                />
              </div>
            </div>
          </div>

          {/* Placement Data Section */}
          <div className="space-y-3">
            <PlacementDataEditor
              placementData={formData.placement_data}
              onChange={(data) => setFormData({ ...formData, placement_data: data })}
            />
          </div>
          <div className="form-actions">
            <Button type="submit">
              {editingBet ? 'Update' : 'Create'}
            </Button>
            <Button
              type="button"
              variant="secondary"
              onClick={() => setIsModalOpen(false)}
            >
              Cancel
            </Button>
          </div>
        </form>
      </Modal>

      <AuditModal
        isOpen={isAuditModalOpen}
        onClose={() => setIsAuditModalOpen(false)}
        tableName="bets"
        rowId={selectedBetId || 0}
      />
    </div>
  )
}

export default Bets

