import React, { useState, useEffect } from 'react'
import DataTable from '../components/DataTable'
import Modal from '../components/Modal'
import AuditModal from '../components/AuditModal'
import { Button } from '@/components/ui/button'
import { Result, Event } from '../types'
import apiClient from '../api/client'
import './Page.css'

function Results() {
  const [results, setResults] = useState<Result[]>([])
  const [events, setEvents] = useState<Event[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [isAuditModalOpen, setIsAuditModalOpen] = useState(false)
  const [selectedEventId, setSelectedEventId] = useState<number | null>(null)
  const [editingResult, setEditingResult] = useState<Result | null>(null)
  const [formData, setFormData] = useState({
    event_id: '',
    score_a: '',
    score_b: '',
  })

  useEffect(() => {
    fetchResults()
    fetchEvents()
  }, [])

  const fetchResults = async () => {
    try {
      const response = await apiClient.get('/api/results')
      setResults(response.data)
    } catch (error) {
      console.error('Failed to fetch results:', error)
    } finally {
      setIsLoading(false)
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

  const handleCreate = () => {
    setEditingResult(null)
    setFormData({ event_id: '', score_a: '', score_b: '' })
    setIsModalOpen(true)
  }

  const handleEdit = (result: Result) => {
    setEditingResult(result)
    setFormData({
      event_id: String(result.event_id),
      score_a: result.score_a?.toString() || '',
      score_b: result.score_b?.toString() || '',
    })
    setIsModalOpen(true)
  }

  const handleDelete = async (result: Result) => {
    if (!window.confirm(`Delete result for event ID ${result.event_id}?`)) return
    try {
      await apiClient.delete(`/api/results/${result.event_id}`)
      fetchResults()
    } catch (error: any) {
      alert(error.response?.data?.detail || 'Failed to delete result')
    }
  }

  const handleViewAudit = (result: Result) => {
    setSelectedEventId(result.event_id)
    setIsAuditModalOpen(true)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      const payload = {
        event_id: parseInt(formData.event_id),
        score_a: formData.score_a ? parseInt(formData.score_a) : null,
        score_b: formData.score_b ? parseInt(formData.score_b) : null,
      }
      if (editingResult) {
        await apiClient.put(`/api/results/${editingResult.event_id}`, payload)
      } else {
        await apiClient.post('/api/results', payload)
      }
      setIsModalOpen(false)
      fetchResults()
    } catch (error: any) {
      alert(error.response?.data?.detail || 'Failed to save result')
    }
  }

  const getEventInfo = (eventId: number) => {
    const event = events.find((e) => e.id === eventId)
    return event ? `Event ${eventId} - ${new Date(event.date).toLocaleDateString()}` : `Event ${eventId}`
  }

  const columns = [
    { key: 'event_id', header: 'Event ID' },
    {
      key: 'event_id',
      header: 'Event Info',
      render: (result: Result) => getEventInfo(result.event_id),
    },
    { key: 'score_a', header: 'Score A' },
    { key: 'score_b', header: 'Score B' },
    {
      key: 'created_at',
      header: 'Created',
      render: (result: Result) => new Date(result.created_at).toLocaleDateString(),
    },
  ]

  return (
    <div className="page">
      <div className="page-header">
        <h2 className="text-2xl font-bold text-foreground">Results</h2>
        <Button onClick={handleCreate}>
          + Add Result
        </Button>
      </div>

      <DataTable
        columns={columns}
        data={results}
        onEdit={handleEdit}
        onDelete={handleDelete}
        onViewAudit={handleViewAudit}
        isLoading={isLoading}
      />

      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingResult ? 'Edit Result' : 'Create Result'}
      >
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label>Event</label>
            <select
              value={formData.event_id}
              onChange={(e) => setFormData({ ...formData, event_id: e.target.value })}
              required
              disabled={!!editingResult}
            >
              <option value="">Select an event</option>
              {events.map((event) => (
                <option key={event.id} value={event.id}>
                  Event {event.id} - {new Date(event.date).toLocaleString()}
                </option>
              ))}
            </select>
          </div>
          <div className="form-group">
            <label>Score A</label>
            <input
              type="number"
              min="0"
              value={formData.score_a}
              onChange={(e) => setFormData({ ...formData, score_a: e.target.value })}
              required
            />
          </div>
          <div className="form-group">
            <label>Score B</label>
            <input
              type="number"
              min="0"
              value={formData.score_b}
              onChange={(e) => setFormData({ ...formData, score_b: e.target.value })}
              required
            />
          </div>
          <div className="form-actions">
            <Button type="submit">
              {editingResult ? 'Update' : 'Create'}
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
        tableName="results"
        rowId={selectedEventId || 0}
      />
    </div>
  )
}

export default Results

