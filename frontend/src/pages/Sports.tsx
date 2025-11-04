import React, { useState } from 'react'
import DataTable from '../components/DataTable'
import Modal from '../components/Modal'
import { Button } from '@/components/ui/button'
import { Sport } from '../types'
import { useSports, useCreateSport, useDeleteSport } from '../hooks/useSports'
import ConfirmDialog from '../components/ConfirmDialog'
import './Page.css'

function Sports() {
  const { data: sports = [], isLoading, error } = useSports()
  const createSport = useCreateSport()
  const deleteSport = useDeleteSport()
  
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false)
  const [sportToDelete, setSportToDelete] = useState<Sport | null>(null)
  const [editingSport, setEditingSport] = useState<Sport | null>(null)
  const [formData, setFormData] = useState({ name: '' })

  const handleCreate = () => {
    setEditingSport(null)
    setFormData({ name: '' })
    setIsModalOpen(true)
  }

  const handleEdit = (sport: Sport) => {
    setEditingSport(sport)
    setFormData({ name: sport.name })
    setIsModalOpen(true)
  }

  const handleDeleteClick = (sport: Sport) => {
    setSportToDelete(sport)
    setIsDeleteDialogOpen(true)
  }

  const handleDeleteConfirm = async () => {
    if (!sportToDelete) return
    try {
      await deleteSport.mutateAsync(sportToDelete.name)
      setIsDeleteDialogOpen(false)
      setSportToDelete(null)
    } catch (error: any) {
      alert(error.response?.data?.detail || 'Failed to delete sport')
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      if (editingSport) {
        // Sports only have name, so we delete and recreate (or skip update)
        alert('Cannot update sport name. Delete and create a new one.')
      } else {
        await createSport.mutateAsync(formData)
        setIsModalOpen(false)
        setFormData({ name: '' })
      }
    } catch (error: any) {
      alert(error.response?.data?.detail || 'Failed to save sport')
    }
  }

  if (error) {
    return (
      <div className="page">
        <div className="page-header">
          <h2 className="text-2xl font-bold text-foreground">Sports</h2>
        </div>
        <div className="bg-card border border-border rounded-lg p-6">
          <p className="text-red-600">Error loading sports: {String(error)}</p>
        </div>
      </div>
    )
  }

  const columns = [
    { key: 'name', header: 'Name' },
  ]

  return (
    <div className="page">
      <div className="page-header">
        <h2 className="text-2xl font-bold text-foreground">Sports</h2>
        <Button onClick={handleCreate}>
          + Add Sport
        </Button>
      </div>

      <DataTable
        columns={columns}
        data={sports}
        onEdit={handleEdit}
        onDelete={handleDeleteClick}
        isLoading={isLoading}
      />

      <ConfirmDialog
        isOpen={isDeleteDialogOpen}
        onClose={() => setIsDeleteDialogOpen(false)}
        onConfirm={handleDeleteConfirm}
        title="Delete Sport"
        message={`Are you sure you want to delete "${sportToDelete?.name}"? This action cannot be undone.`}
        confirmText="Delete"
        cancelText="Cancel"
        type="danger"
      />

      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingSport ? 'Edit Sport' : 'Create Sport'}
      >
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label>Name</label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              required
              disabled={!!editingSport}
            />
          </div>
          <div className="form-actions">
            <Button type="submit">
              {editingSport ? 'Update' : 'Create'}
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

export default Sports

