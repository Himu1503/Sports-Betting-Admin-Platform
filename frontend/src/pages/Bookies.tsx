import React, { useState, useEffect } from 'react'
import DataTable from '../components/DataTable'
import Modal from '../components/Modal'
import { PreferencesDisplay } from '../components/PreferencesDisplay'
import { PreferencesEditor } from '../components/PreferencesEditor'
import { Button } from '@/components/ui/button'
import { Bookie } from '../types'
import apiClient from '../api/client'
import './Page.css'

function Bookies() {
  const [bookies, setBookies] = useState<Bookie[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingBookie, setEditingBookie] = useState<Bookie | null>(null)
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    preferences: {} as Record<string, any>,
  })

  useEffect(() => {
    fetchBookies()
  }, [])

  const fetchBookies = async () => {
    try {
      const response = await apiClient.get('/api/bookies')
      setBookies(response.data)
    } catch (error) {
      console.error('Failed to fetch bookies:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleCreate = () => {
    setEditingBookie(null)
    setFormData({ name: '', description: '', preferences: {} })
    setIsModalOpen(true)
  }

  const handleEdit = (bookie: Bookie) => {
    setEditingBookie(bookie)
    setFormData({
      name: bookie.name,
      description: bookie.description,
      preferences: bookie.preferences || {},
    })
    setIsModalOpen(true)
  }

  const handleDelete = async (bookie: Bookie) => {
    if (!window.confirm(`Delete bookie "${bookie.name}"?`)) return
    try {
      await apiClient.delete(`/api/bookies/${bookie.name}`)
      fetchBookies()
    } catch (error: any) {
      alert(error.response?.data?.detail || 'Failed to delete bookie')
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      const payload = {
        description: formData.description,
        preferences: formData.preferences,
      }
      if (editingBookie) {
        await apiClient.put(`/api/bookies/${editingBookie.name}`, payload)
      } else {
        await apiClient.post('/api/bookies', {
          name: formData.name,
          ...payload,
        })
      }
      setIsModalOpen(false)
      fetchBookies()
    } catch (error: any) {
      alert(error.response?.data?.detail || 'Failed to save bookie')
    }
  }

  const columns = [
    { key: 'name', header: 'Name' },
    { key: 'description', header: 'Description' },
    {
      key: 'preferences',
      header: 'Preferences',
      render: (bookie: Bookie) => <PreferencesDisplay preferences={bookie.preferences || {}} compact />,
    },
  ]

  return (
    <div className="page">
      <div className="page-header">
        <h2 className="text-2xl font-bold text-foreground">Bookies</h2>
        <Button onClick={handleCreate}>
          + Add Bookie
        </Button>
      </div>

      <DataTable
        columns={columns}
        data={bookies}
        onEdit={handleEdit}
        onDelete={handleDelete}
        isLoading={isLoading}
      />

      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingBookie ? 'Edit Bookie' : 'Create Bookie'}
      >
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label>Name</label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              required
              disabled={!!editingBookie}
            />
          </div>
          <div className="form-group">
            <label>Description</label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              required
              rows={3}
              className="w-full px-3 py-2 border border-border rounded bg-background"
            />
          </div>
          <div className="form-group">
            <PreferencesEditor
              preferences={formData.preferences}
              onChange={(prefs) => setFormData({ ...formData, preferences: prefs })}
            />
          </div>
          <div className="form-actions">
            <Button type="submit">
              {editingBookie ? 'Update' : 'Create'}
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
    </div>
  )
}

export default Bookies

