import React, { useState, useEffect } from 'react'
import DataTable from '../components/DataTable'
import Modal from '../components/Modal'
import AuditModal from '../components/AuditModal'
import ConfirmDialog from '../components/ConfirmDialog'
import { Button } from '@/components/ui/button'
import { Event, Competition, Team } from '../types'
import apiClient from '../api/client'
import './Page.css'

function Events() {
  const [events, setEvents] = useState<Event[]>([])
  const [competitions, setCompetitions] = useState<Competition[]>([])
  const [teams, setTeams] = useState<Team[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [isAuditModalOpen, setIsAuditModalOpen] = useState(false)
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false)
  const [eventToDelete, setEventToDelete] = useState<Event | null>(null)
  const [selectedEventId, setSelectedEventId] = useState<number | null>(null)
  const [editingEvent, setEditingEvent] = useState<Event | null>(null)
  const [formData, setFormData] = useState({
    date: '',
    competition_id: '',
    team_a_id: '',
    team_b_id: '',
    status: 'prematch',
  })

  useEffect(() => {
    fetchEvents()
    fetchCompetitions()
    fetchTeams()
  }, [])

  const fetchEvents = async () => {
    try {
      const response = await apiClient.get('/api/events')
      setEvents(response.data)
    } catch (error) {
      console.error('Failed to fetch events:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const fetchCompetitions = async () => {
    try {
      const response = await apiClient.get('/api/competitions')
      setCompetitions(response.data)
    } catch (error) {
      console.error('Failed to fetch competitions:', error)
    }
  }

  const fetchTeams = async () => {
    try {
      const response = await apiClient.get('/api/teams')
      setTeams(response.data)
    } catch (error) {
      console.error('Failed to fetch teams:', error)
    }
  }

  const handleCreate = () => {
    setEditingEvent(null)
    setFormData({
      date: new Date().toISOString().slice(0, 16),
      competition_id: '',
      team_a_id: '',
      team_b_id: '',
      status: 'prematch',
    })
    setIsModalOpen(true)
  }

  const handleEdit = (event: Event) => {
    setEditingEvent(event)
    setFormData({
      date: new Date(event.date).toISOString().slice(0, 16),
      competition_id: String(event.competition_id),
      team_a_id: String(event.team_a_id),
      team_b_id: String(event.team_b_id),
      status: event.status,
    })
    setIsModalOpen(true)
  }

  const handleDelete = (event: Event) => {
    setEventToDelete(event)
    setIsDeleteDialogOpen(true)
  }

  const confirmDelete = async () => {
    if (!eventToDelete) return
    try {
      await apiClient.delete(`/api/events/${eventToDelete.id}`)
      setIsDeleteDialogOpen(false)
      setEventToDelete(null)
      fetchEvents()
    } catch (error: any) {
      const errorMessage = error.response?.data?.detail || error.message || 'Failed to delete event'
      
      // Show a more user-friendly error message
      if (error.response?.status === 409) {
        alert(`⚠️ Cannot Delete Event\n\n${errorMessage}\n\nPlease delete all related bets and results before deleting this event.`)
      } else {
        alert(`❌ Error: ${errorMessage}`)
      }
      
      setIsDeleteDialogOpen(false)
      setEventToDelete(null)
    }
  }

  const getEventDisplayName = (event: Event) => {
    const teamA = getTeamName(event.team_a_id)
    const teamB = getTeamName(event.team_b_id)
    const competition = getCompetitionName(event.competition_id)
    return `${teamA} vs ${teamB} (${competition})`
  }

  const handleViewAudit = (event: Event) => {
    setSelectedEventId(event.id)
    setIsAuditModalOpen(true)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      const payload = {
        ...formData,
        competition_id: parseInt(formData.competition_id),
        team_a_id: parseInt(formData.team_a_id),
        team_b_id: parseInt(formData.team_b_id),
        date: new Date(formData.date).toISOString(),
      }
      if (editingEvent) {
        await apiClient.put(`/api/events/${editingEvent.id}`, payload)
      } else {
        await apiClient.post('/api/events', payload)
      }
      setIsModalOpen(false)
      fetchEvents()
    } catch (error: any) {
      alert(error.response?.data?.detail || 'Failed to save event')
    }
  }

  const getTeamName = (teamId: number) => {
    const team = teams.find((t) => t.id === teamId)
    return team ? `${team.name} (${team.country})` : `Team ${teamId}`
  }

  const getCompetitionName = (compId: number) => {
    const comp = competitions.find((c) => c.id === compId)
    return comp ? comp.name : `Competition ${compId}`
  }

  const columns = [
    { key: 'id', header: 'ID' },
    {
      key: 'date',
      header: 'Date',
      render: (event: Event) => new Date(event.date).toLocaleString(),
    },
    {
      key: 'competition_id',
      header: 'Competition',
      render: (event: Event) => getCompetitionName(event.competition_id),
    },
    {
      key: 'team_a_id',
      header: 'Team A',
      render: (event: Event) => getTeamName(event.team_a_id),
    },
    {
      key: 'team_b_id',
      header: 'Team B',
      render: (event: Event) => getTeamName(event.team_b_id),
    },
    { key: 'status', header: 'Status' },
  ]

  return (
    <div className="page">
      <div className="page-header">
        <h2 className="text-2xl font-bold text-foreground">Events</h2>
        <Button onClick={handleCreate}>
          + Add Event
        </Button>
      </div>

      <DataTable
        columns={columns}
        data={events}
        onEdit={handleEdit}
        onDelete={handleDelete}
        onViewAudit={handleViewAudit}
        isLoading={isLoading}
      />

      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingEvent ? 'Edit Event' : 'Create Event'}
      >
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label>Date & Time</label>
            <input
              type="datetime-local"
              value={formData.date}
              onChange={(e) => setFormData({ ...formData, date: e.target.value })}
              required
            />
          </div>
          <div className="form-group">
            <label>Competition</label>
            <select
              value={formData.competition_id}
              onChange={(e) => setFormData({ ...formData, competition_id: e.target.value })}
              required
            >
              <option value="">Select a competition</option>
              {competitions.map((comp) => (
                <option key={comp.id} value={comp.id}>
                  {comp.name} ({comp.country})
                </option>
              ))}
            </select>
          </div>
          <div className="form-group">
            <label>Team A</label>
            <select
              value={formData.team_a_id}
              onChange={(e) => setFormData({ ...formData, team_a_id: e.target.value })}
              required
            >
              <option value="">Select team A</option>
              {teams.map((team) => (
                <option key={team.id} value={team.id}>
                  {team.name} ({team.country})
                </option>
              ))}
            </select>
          </div>
          <div className="form-group">
            <label>Team B</label>
            <select
              value={formData.team_b_id}
              onChange={(e) => setFormData({ ...formData, team_b_id: e.target.value })}
              required
            >
              <option value="">Select team B</option>
              {teams.map((team) => (
                <option key={team.id} value={team.id}>
                  {team.name} ({team.country})
                </option>
              ))}
            </select>
          </div>
          <div className="form-group">
            <label>Status</label>
            <select
              value={formData.status}
              onChange={(e) => setFormData({ ...formData, status: e.target.value })}
              required
            >
              <option value="prematch">Prematch</option>
              <option value="live">Live</option>
              <option value="finished">Finished</option>
            </select>
          </div>
          <div className="form-actions">
            <Button type="submit">
              {editingEvent ? 'Update' : 'Create'}
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
        tableName="events"
        rowId={selectedEventId || 0}
      />

      <ConfirmDialog
        isOpen={isDeleteDialogOpen}
        onClose={() => {
          setIsDeleteDialogOpen(false)
          setEventToDelete(null)
        }}
        onConfirm={confirmDelete}
        title="Delete Event"
        message={
          eventToDelete
            ? `Are you sure you want to delete Event ID ${eventToDelete.id}?\n\n${getEventDisplayName(eventToDelete)}\n\n⚠️ Note: This event cannot be deleted if it has associated bets or results. You must delete those first.\n\nThis action cannot be undone.`
            : 'Are you sure you want to delete this event?'
        }
        confirmText="Delete"
        cancelText="Cancel"
        type="danger"
      />
    </div>
  )
}

export default Events

