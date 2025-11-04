import React, { useState, useEffect } from 'react'
import DataTable from '../components/DataTable'
import Modal from '../components/Modal'
import { Button } from '@/components/ui/button'
import { Competition, Sport } from '../types'
import apiClient from '../api/client'
import './Page.css'

function Competitions() {
  const [competitions, setCompetitions] = useState<Competition[]>([])
  const [sports, setSports] = useState<Sport[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingCompetition, setEditingCompetition] = useState<Competition | null>(null)
  const [formData, setFormData] = useState({
    name: '',
    country: '',
    sport: '',
    active: true,
  })

  useEffect(() => {
    fetchCompetitions()
    fetchSports()
  }, [])

  const fetchCompetitions = async () => {
    try {
      const response = await apiClient.get('/api/competitions')
      setCompetitions(response.data)
    } catch (error) {
      console.error('Failed to fetch competitions:', error)
    } finally {
      setIsLoading(false)
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
    setEditingCompetition(null)
    setFormData({ name: '', country: '', sport: '', active: true })
    setIsModalOpen(true)
  }

  const handleEdit = (competition: Competition) => {
    setEditingCompetition(competition)
    setFormData({
      name: competition.name,
      country: competition.country,
      sport: competition.sport,
      active: competition.active,
    })
    setIsModalOpen(true)
  }

  const handleDelete = async (competition: Competition) => {
    if (!window.confirm(`Delete competition "${competition.name}"?`)) return
    try {
      await apiClient.delete(`/api/competitions/${competition.id}`)
      fetchCompetitions()
    } catch (error: any) {
      alert(error.response?.data?.detail || 'Failed to delete competition')
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      if (editingCompetition) {
        await apiClient.put(`/api/competitions/${editingCompetition.id}`, formData)
      } else {
        await apiClient.post('/api/competitions', formData)
      }
      setIsModalOpen(false)
      fetchCompetitions()
    } catch (error: any) {
      alert(error.response?.data?.detail || 'Failed to save competition')
    }
  }

  const columns = [
    { key: 'id', header: 'ID' },
    { key: 'name', header: 'Name' },
    { key: 'country', header: 'Country' },
    { key: 'sport', header: 'Sport' },
    {
      key: 'active',
      header: 'Active',
      render: (comp: Competition) => (comp.active ? 'Yes' : 'No'),
    },
  ]

  return (
    <div className="page">
      <div className="page-header">
        <h2 className="text-2xl font-bold text-foreground">Competitions</h2>
        <Button onClick={handleCreate}>
          + Add Competition
        </Button>
      </div>

      <DataTable
        columns={columns}
        data={competitions}
        onEdit={handleEdit}
        onDelete={handleDelete}
        isLoading={isLoading}
      />

      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingCompetition ? 'Edit Competition' : 'Create Competition'}
      >
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label>Name</label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              required
            />
          </div>
          <div className="form-group">
            <label>Country</label>
            <input
              type="text"
              value={formData.country}
              onChange={(e) => setFormData({ ...formData, country: e.target.value })}
              required
            />
          </div>
          <div className="form-group">
            <label>Sport</label>
            <select
              value={formData.sport}
              onChange={(e) => setFormData({ ...formData, sport: e.target.value })}
              required
            >
              <option value="">Select a sport</option>
              {sports.map((sport) => (
                <option key={sport.name} value={sport.name}>
                  {sport.name}
                </option>
              ))}
            </select>
          </div>
          <div className="form-group">
            <label>
              <input
                type="checkbox"
                checked={formData.active}
                onChange={(e) => setFormData({ ...formData, active: e.target.checked })}
              />
              Active
            </label>
          </div>
          <div className="form-actions">
            <Button type="submit">
              {editingCompetition ? 'Update' : 'Create'}
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

export default Competitions

