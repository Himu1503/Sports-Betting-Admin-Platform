import React, { useState, useEffect } from 'react'
import DataTable from '../components/DataTable'
import Modal from '../components/Modal'
import AuditModal from '../components/AuditModal'
import ConfirmDialog from '../components/ConfirmDialog'
import { Button } from '@/components/ui/button'
import { Customer } from '../types'
import apiClient from '../api/client'
import './Page.css'

function Customers() {
  const [customers, setCustomers] = useState<Customer[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [isAuditModalOpen, setIsAuditModalOpen] = useState(false)
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false)
  const [customerToDelete, setCustomerToDelete] = useState<Customer | null>(null)
  const [selectedCustomerId, setSelectedCustomerId] = useState<number | null>(null)
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null)
  const [formData, setFormData] = useState({
    username: '',
    password: '',
    real_name: '',
    currency: 'USD',
    status: 'active',
    balance_amount: '0',
    balance_currency: 'USD',
    preferences: '{}',
  })

  useEffect(() => {
    fetchCustomers()
  }, [])

  const fetchCustomers = async () => {
    try {
      const response = await apiClient.get('/api/customers')
      setCustomers(response.data)
    } catch (error) {
      console.error('Failed to fetch customers:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleCreate = () => {
    setEditingCustomer(null)
    setFormData({
      username: '',
      password: '',
      real_name: '',
      currency: 'USD',
      status: 'active',
      balance_amount: '0',
      balance_currency: 'USD',
      preferences: '{}',
    })
    setIsModalOpen(true)
  }

  const handleEdit = (customer: Customer) => {
    setEditingCustomer(customer)
    setFormData({
      username: customer.username,
      password: '',
      real_name: customer.real_name,
      currency: customer.currency,
      status: customer.status,
      balance_amount: String(customer.balance.amount),
      balance_currency: customer.balance.currency,
      preferences: JSON.stringify(customer.preferences, null, 2),
    })
    setIsModalOpen(true)
  }

  const handleDelete = (customer: Customer) => {
    setCustomerToDelete(customer)
    setIsDeleteDialogOpen(true)
  }

  const confirmDelete = async () => {
    if (!customerToDelete) return
    try {
      await apiClient.delete(`/api/customers/${customerToDelete.id}`)
      setIsDeleteDialogOpen(false)
      setCustomerToDelete(null)
      fetchCustomers()
    } catch (error: any) {
      const errorMessage = error.response?.data?.detail || error.message || 'Failed to delete customer'
      
      // Show a more user-friendly error message
      if (error.response?.status === 409) {
        alert(`⚠️ Cannot Delete Customer\n\n${errorMessage}\n\nPlease delete all related bets and balance changes before deleting this customer.`)
      } else {
        alert(`❌ Error: ${errorMessage}`)
      }
      
      setIsDeleteDialogOpen(false)
      setCustomerToDelete(null)
    }
  }

  const handleViewAudit = (customer: Customer) => {
    setSelectedCustomerId(customer.id)
    setIsAuditModalOpen(true)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      let payload: any = {
        username: formData.username,
        real_name: formData.real_name,
        currency: formData.currency,
        status: formData.status,
        balance: {
          amount: parseFloat(formData.balance_amount),
          currency: formData.balance_currency,
        },
        preferences: JSON.parse(formData.preferences),
      }
      if (formData.password || !editingCustomer) {
        payload.password = formData.password || 'default_password_hash'
      }
      if (editingCustomer) {
        await apiClient.put(`/api/customers/${editingCustomer.id}`, payload)
      } else {
        await apiClient.post('/api/customers', payload)
      }
      setIsModalOpen(false)
      fetchCustomers()
    } catch (error: any) {
      alert(error.response?.data?.detail || 'Failed to save customer')
    }
  }

  const columns = [
    { key: 'id', header: 'ID' },
    { key: 'username', header: 'Username' },
    { key: 'real_name', header: 'Real Name' },
    { key: 'currency', header: 'Currency' },
    { key: 'status', header: 'Status' },
    {
      key: 'balance',
      header: 'Balance',
      render: (customer: Customer) =>
        `${customer.balance.currency} ${Number(customer.balance.amount).toFixed(2)}`,
    },
  ]

  return (
    <div className="page">
      <div className="page-header">
        <h2 className="text-2xl font-bold text-foreground">Customers</h2>
        <Button onClick={handleCreate}>
          + Add Customer
        </Button>
      </div>

      <DataTable
        columns={columns}
        data={customers}
        onEdit={handleEdit}
        onDelete={handleDelete}
        onViewAudit={handleViewAudit}
        isLoading={isLoading}
      />

      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingCustomer ? 'Edit Customer' : 'Create Customer'}
      >
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label>Username</label>
            <input
              type="text"
              value={formData.username}
              onChange={(e) => setFormData({ ...formData, username: e.target.value })}
              required
              disabled={!!editingCustomer}
              minLength={3}
              maxLength={50}
              pattern="[a-zA-Z0-9_]+"
              title="Username can only contain letters, numbers, and underscores (3-50 characters)"
            />
          </div>
          <div className="form-group">
            <label>Password {editingCustomer && '(leave empty to keep current)'}</label>
            <input
              type="text"
              value={formData.password}
              onChange={(e) => setFormData({ ...formData, password: e.target.value })}
              required={!editingCustomer}
            />
          </div>
          <div className="form-group">
            <label>Real Name</label>
            <input
              type="text"
              value={formData.real_name}
              onChange={(e) => setFormData({ ...formData, real_name: e.target.value })}
              required
            />
          </div>
          <div className="form-group">
            <label>Currency</label>
            <select
              value={formData.currency}
              onChange={(e) => setFormData({ ...formData, currency: e.target.value, balance_currency: e.target.value })}
              required
            >
              <option value="USD">USD</option>
              <option value="GBP">GBP</option>
              <option value="EUR">EUR</option>
            </select>
          </div>
          <div className="form-group">
            <label>Status</label>
            <select
              value={formData.status}
              onChange={(e) => setFormData({ ...formData, status: e.target.value })}
              required
            >
              <option value="active">Active</option>
              <option value="disabled">Disabled</option>
            </select>
          </div>
          <div className="form-group">
            <label>Balance Amount</label>
            <input
              type="number"
              step="0.01"
              min="0"
              value={formData.balance_amount}
              onChange={(e) => setFormData({ ...formData, balance_amount: e.target.value })}
              required
            />
          </div>
          <div className="form-group">
            <label>Preferences (JSON)</label>
            <textarea
              value={formData.preferences}
              onChange={(e) => setFormData({ ...formData, preferences: e.target.value })}
              rows={4}
              required
            />
          </div>
          <div className="form-actions">
            <Button type="submit">
              {editingCustomer ? 'Update' : 'Create'}
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
        tableName="customers"
        rowId={selectedCustomerId || 0}
      />

      <ConfirmDialog
        isOpen={isDeleteDialogOpen}
        onClose={() => {
          setIsDeleteDialogOpen(false)
          setCustomerToDelete(null)
        }}
        onConfirm={confirmDelete}
        title="Delete Customer"
        message={
          customerToDelete
            ? `Are you sure you want to delete customer "${customerToDelete.username}" (ID: ${customerToDelete.id})?\n\n⚠️ Note: This customer cannot be deleted if they have associated bets or balance changes. You must delete those first.\n\nThis action cannot be undone.`
            : 'Are you sure you want to delete this customer?'
        }
        confirmText="Delete"
        cancelText="Cancel"
        type="danger"
      />
    </div>
  )
}

export default Customers

