import React, { useState, useEffect } from 'react'
import DataTable from '../components/DataTable'
import Modal from '../components/Modal'
import AuditModal from '../components/AuditModal'
import { Button } from '@/components/ui/button'
import { Team, Sport } from '../types'
import apiClient from '../api/client'
import './Page.css'

function Teams() {
  const [teams, setTeams] = useState<Team[]>([])
  const [sports, setSports] = useState<Sport[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [isAuditModalOpen, setIsAuditModalOpen] = useState(false)
  const [selectedTeamId, setSelectedTeamId] = useState<number | null>(null)
  const [editingTeam, setEditingTeam] = useState<Team | null>(null)
  const [formData, setFormData] = useState({ name: '', country: '', sport: '' })

  useEffect(() => {
    fetchTeams()
    fetchSports()
  }, [])

  const fetchTeams = async () => {
    try {
      const response = await apiClient.get('/api/teams')
      setTeams(response.data)
    } catch (error) {
      console.error('Failed to fetch teams:', error)
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
    setEditingTeam(null)
    setFormData({ name: '', country: '', sport: '' })
    setIsModalOpen(true)
  }

  const handleEdit = (team: Team) => {
    setEditingTeam(team)
    setFormData({ name: team.name, country: team.country, sport: team.sport })
    setIsModalOpen(true)
  }

  const handleDelete = async (team: Team) => {
    if (!window.confirm(`Delete team "${team.name}"?`)) return
    try {
      await apiClient.delete(`/api/teams/${team.id}`)
      fetchTeams()
    } catch (error: any) {
      alert(error.response?.data?.detail || 'Failed to delete team')
    }
  }

  const handleViewAudit = (team: Team) => {
    setSelectedTeamId(team.id)
    setIsAuditModalOpen(true)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      if (editingTeam) {
        await apiClient.put(`/api/teams/${editingTeam.id}`, formData)
      } else {
        await apiClient.post('/api/teams', formData)
      }
      setIsModalOpen(false)
      fetchTeams()
    } catch (error: any) {
      alert(error.response?.data?.detail || 'Failed to save team')
    }
  }

  const columns = [
    { key: 'id', header: 'ID' },
    { key: 'name', header: 'Name' },
    { key: 'country', header: 'Country' },
    { key: 'sport', header: 'Sport' },
    {
      key: 'created_at',
      header: 'Created',
      render: (team: Team) => new Date(team.created_at).toLocaleDateString(),
    },
  ]

  return (
    <div className="page">
      <div className="page-header">
        <h2 className="text-2xl font-bold text-foreground">Teams</h2>
        <Button onClick={handleCreate}>
          + Add Team
        </Button>
      </div>

      <DataTable
        columns={columns}
        data={teams}
        onEdit={handleEdit}
        onDelete={handleDelete}
        onViewAudit={handleViewAudit}
        isLoading={isLoading}
      />

      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingTeam ? 'Edit Team' : 'Create Team'}
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
          <div className="form-actions">
            <Button type="submit">
              {editingTeam ? 'Update' : 'Create'}
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
        tableName="teams"
        rowId={selectedTeamId || 0}
      />
    </div>
  )
}

export default Teams

