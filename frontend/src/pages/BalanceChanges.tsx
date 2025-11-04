import React, { useState, useEffect } from 'react'
import DataTable from '../components/DataTable'
import Modal from '../components/Modal'
import AuditModal from '../components/AuditModal'
import { Button } from '@/components/ui/button'
import { BalanceChange, Customer } from '../types'
import apiClient from '../api/client'
import './Page.css'

function BalanceChanges() {
  const [balanceChanges, setBalanceChanges] = useState<BalanceChange[]>([])
  const [customers, setCustomers] = useState<Customer[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [isAuditModalOpen, setIsAuditModalOpen] = useState(false)
  const [selectedChangeId, setSelectedChangeId] = useState<number | null>(null)
  const [formData, setFormData] = useState({
    customer_id: '',
    change_type: 'top_up',
    delta_amount: '0',
    delta_currency: 'USD',
    reference_id: '',
    description: '',
  })

  useEffect(() => {
    fetchBalanceChanges()
    fetchCustomers()
  }, [])

  const fetchBalanceChanges = async () => {
    try {
      const response = await apiClient.get('/api/balance-changes')
      setBalanceChanges(response.data)
    } catch (error) {
      console.error('Failed to fetch balance changes:', error)
    } finally {
      setIsLoading(false)
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

  const handleCreate = () => {
    setFormData({
      customer_id: '',
      change_type: 'top_up',
      delta_amount: '0',
      delta_currency: 'USD',
      reference_id: '',
      description: '',
    })
    setIsModalOpen(true)
  }

  const handleViewAudit = (change: BalanceChange) => {
    setSelectedChangeId(change.id)
    setIsAuditModalOpen(true)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      const payload = {
        customer_id: parseInt(formData.customer_id),
        change_type: formData.change_type,
        delta: {
          amount: parseFloat(formData.delta_amount),
          currency: formData.delta_currency,
        },
        reference_id: formData.reference_id || null,
        description: formData.description || null,
      }
      await apiClient.post('/api/balance-changes', payload)
      setIsModalOpen(false)
      fetchBalanceChanges()
    } catch (error: any) {
      alert(error.response?.data?.detail || 'Failed to create balance change')
    }
  }

  const columns = [
    { key: 'id', header: 'ID' },
    { key: 'customer_id', header: 'Customer ID' },
    { key: 'change_type', header: 'Type' },
    {
      key: 'delta',
      header: 'Delta',
      render: (change: BalanceChange) => {
        const amount = Number(change.delta.amount)
        const sign = amount >= 0 ? '+' : ''
        return `${sign}${change.delta.currency} ${amount.toFixed(2)}`
      },
    },
    { key: 'reference_id', header: 'Reference ID' },
    { key: 'description', header: 'Description' },
    {
      key: 'created_at',
      header: 'Created',
      render: (change: BalanceChange) => new Date(change.created_at).toLocaleString(),
    },
  ]

  return (
    <div className="page">
      <div className="page-header">
        <h2 className="text-2xl font-bold text-foreground">Balance Changes</h2>
        <Button onClick={handleCreate}>
          + Add Balance Change
        </Button>
      </div>

      <DataTable
        columns={columns}
        data={balanceChanges}
        onViewAudit={handleViewAudit}
        isLoading={isLoading}
      />

      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title="Create Balance Change"
      >
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label>Customer</label>
            <select
              value={formData.customer_id}
              onChange={(e) => setFormData({ ...formData, customer_id: e.target.value })}
              required
            >
              <option value="">Select customer</option>
              {customers.map((customer) => (
                <option key={customer.id} value={customer.id}>
                  {customer.username} ({customer.real_name}) - {customer.currency}
                </option>
              ))}
            </select>
          </div>
          <div className="form-group">
            <label>Change Type</label>
            <select
              value={formData.change_type}
              onChange={(e) => setFormData({ ...formData, change_type: e.target.value })}
              required
            >
              <option value="top_up">Top Up</option>
              <option value="bet_placed">Bet Placed</option>
              <option value="bet_settled">Bet Settled</option>
              <option value="withdrawal">Withdrawal</option>
              <option value="adjustment">Adjustment</option>
            </select>
          </div>
          <div className="form-row">
            <div className="form-group">
              <label>Delta Amount</label>
              <input
                type="number"
                step="0.01"
                value={formData.delta_amount}
                onChange={(e) => setFormData({ ...formData, delta_amount: e.target.value })}
                required
              />
              <small>Positive for increases, negative for decreases</small>
            </div>
            <div className="form-group">
              <label>Currency</label>
              <select
                value={formData.delta_currency}
                onChange={(e) => setFormData({ ...formData, delta_currency: e.target.value })}
                required
              >
                <option value="USD">USD</option>
                <option value="GBP">GBP</option>
                <option value="EUR">EUR</option>
              </select>
            </div>
          </div>
          <div className="form-group">
            <label>Reference ID (optional)</label>
            <input
              type="text"
              value={formData.reference_id}
              onChange={(e) => setFormData({ ...formData, reference_id: e.target.value })}
            />
          </div>
          <div className="form-group">
            <label>Description (optional)</label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              rows={3}
            />
          </div>
          <div className="form-actions">
            <Button type="submit">
              Create
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
        tableName="balance_changes"
        rowId={selectedChangeId || 0}
      />
    </div>
  )
}

export default BalanceChanges

