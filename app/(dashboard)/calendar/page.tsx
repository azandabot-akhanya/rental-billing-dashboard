"use client"

import { useState, useEffect } from "react"
import { Calendar, momentLocalizer, View } from "react-big-calendar"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog"
import { Checkbox } from "@/components/ui/checkbox"
import { Loader2, Calendar as CalendarIcon, MapPin, FileText, Mail, Trash2, Edit, Plus } from "lucide-react"
import { toast } from "sonner"
import moment from "moment"
import { getApiUrl } from "@/lib/api-config"
import "react-big-calendar/lib/css/react-big-calendar.css"

interface Property { property_id: number; property_name: string }
interface Tenant {
  tenant_id: number
  full_name: string
  email?: string
}

interface Event {
  event_id?: number
  tenant_id: number
  title: string
  description?: string
  location?: string
  event_type?: string
  start: Date
  end: Date
  tenant_name?: string
  tenant_email?: string
}

const localizer = momentLocalizer(moment)

export default function TenantCalendar() {
  const [properties, setProperties] = useState<Property[]>([])
  const [tenants, setTenants] = useState<Tenant[]>([])
  const [selectedProperty, setSelectedProperty] = useState<string>("")
  const [selectedTenant, setSelectedTenant] = useState<string>("")
  const [events, setEvents] = useState<Event[]>([])
  const [loading, setLoading] = useState(false)
  const [showEventDialog, setShowEventDialog] = useState(false)
  const [showDetailsDialog, setShowDetailsDialog] = useState(false)
  const [selectedEvent, setSelectedEvent] = useState<Event | null>(null)
  const [isEditing, setIsEditing] = useState(false)
  const [sendEmail, setSendEmail] = useState(true)
  const [view, setView] = useState<View>("month")

  const [form, setForm] = useState({
    title: "",
    description: "",
    location: "",
    event_type: "meeting",
    start: "",
    end: ""
  })

  const companyId = typeof window !== "undefined" ? localStorage.getItem("selectedCompanyId") || "1" : "1"

  // Fetch properties
  const fetchProperties = async () => {
    try {
      const res = await fetch(getApiUrl(`properties?company_id=${companyId}`))
      const data = await res.json()
      setProperties(Array.isArray(data) ? data.flat() : [])
    } catch (error) {
      console.error("Error fetching properties:", error)
    }
  }

  // Fetch tenants (filtered by property)
  const fetchTenants = async (propertyId?: string) => {
    try {
      let url = getApiUrl(`tenants?company_id=${companyId}`)
      if (propertyId) {
        url += `&property_id=${propertyId}`
      }
      const res = await fetch(url)
      const data = await res.json()
      const tenantsList = data.flat?.().filter((t:any) => t && t.full_name) || []
      setTenants(tenantsList)
    } catch (error) {
      console.error("Error fetching tenants:", error)
    }
  }

  // Fetch calendar events
  const fetchEvents = async () => {
    if (!selectedTenant) return
    setLoading(true)
    try {
      const res = await fetch(getApiUrl(`calendar?company_id=${companyId}&tenant_id=${selectedTenant}`))
      const data = await res.json()
      if (data.success) {
        const mapped = data.data.map((e:any) => ({
          ...e,
          start: new Date(e.start_datetime),
          end: new Date(e.end_datetime),
          tenant_name: tenants.find(t => t.tenant_id === Number(selectedTenant))?.full_name,
          tenant_email: tenants.find(t => t.tenant_id === Number(selectedTenant))?.email
        }))
        setEvents(mapped)
      }
    } catch (error) {
      console.error("Error fetching events:", error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchProperties()
  }, [])

  // When property changes, fetch tenants for that property
  useEffect(() => {
    if (selectedProperty) {
      fetchTenants(selectedProperty)
      setSelectedTenant("")
      setEvents([])
    }
  }, [selectedProperty])

  useEffect(() => {
    if (selectedTenant) fetchEvents()
  }, [selectedTenant])

  // Handle form changes
  const handleChange = (e:any) => {
    setForm({...form, [e.target.name]: e.target.value})
  }

  // Reset form
  const resetForm = () => {
    setForm({
      title: "",
      description: "",
      location: "",
      event_type: "meeting",
      start: "",
      end: ""
    })
    setIsEditing(false)
    setSelectedEvent(null)
  }

  // Open new event dialog
  const openNewEventDialog = () => {
    resetForm()
    setShowEventDialog(true)
  }

  // Open edit event dialog
  const openEditDialog = (event: Event) => {
    setSelectedEvent(event)
    setForm({
      title: event.title,
      description: event.description || "",
      location: event.location || "",
      event_type: event.event_type || "meeting",
      start: moment(event.start).format("YYYY-MM-DDTHH:mm"),
      end: moment(event.end).format("YYYY-MM-DDTHH:mm")
    })
    setIsEditing(true)
    setShowEventDialog(true)
  }

  // Create or update event
  const handleSaveEvent = async () => {
    if (!selectedTenant || !form.title || !form.start || !form.end) {
      return toast.error("Please fill in all required fields")
    }

    try {
      const formData = new FormData()
      formData.append("company_id", companyId)
      formData.append("tenant_id", selectedTenant)
      formData.append("title", form.title)
      formData.append("description", form.description)
      formData.append("location", form.location)
      formData.append("event_type", form.event_type)
      formData.append("start_datetime", form.start)
      formData.append("end_datetime", form.end)
      formData.append("send_email", sendEmail ? "1" : "0")

      let res
      if (isEditing && selectedEvent) {
        formData.append("event_id", String(selectedEvent.event_id))
        res = await fetch(getApiUrl(`calendar`), { method: "PUT", body: formData })
      } else {
        res = await fetch(getApiUrl(`calendar`), { method: "POST", body: formData })
      }

      const data = await res.json()
      if (data.success) {
        toast.success(isEditing ? "Event updated successfully" : "Event created successfully")
        if (sendEmail) {
          toast.success("Email notification sent to tenant")
        }
        fetchEvents()
        setShowEventDialog(false)
        resetForm()
      } else {
        toast.error(data.message || "Failed to save event")
      }
    } catch (error) {
      console.error(error)
      toast.error("Error saving event")
    }
  }

  // Delete event
  const handleDeleteEvent = async (event_id?:number) => {
    if (!event_id || !confirm("Are you sure you want to delete this event?")) return

    try {
      const res = await fetch(getApiUrl(`calendar`), {
        method: "DELETE",
        headers: { "Content-Type":"application/json" },
        body: JSON.stringify({ event_id, company_id: companyId, tenant_id: selectedTenant })
      })
      const data = await res.json()
      if (data.success) {
        toast.success("Event deleted successfully")
        fetchEvents()
        setShowDetailsDialog(false)
      } else {
        toast.error(data.message || "Failed to delete event")
      }
    } catch (error) {
      console.error(error)
      toast.error("Error deleting event")
    }
  }

  // Event style getter
  const eventStyleGetter = (event: Event) => {
    const colors = {
      meeting: { backgroundColor: '#3b82f6', borderColor: '#2563eb' },
      inspection: { backgroundColor: '#8b5cf6', borderColor: '#7c3aed' },
      maintenance: { backgroundColor: '#ef4444', borderColor: '#dc2626' },
      viewing: { backgroundColor: '#10b981', borderColor: '#059669' },
      other: { backgroundColor: '#64748b', borderColor: '#475569' }
    }

    const style = colors[event.event_type as keyof typeof colors] || colors.other

    return {
      style: {
        ...style,
        borderRadius: '6px',
        border: `2px solid ${style.borderColor}`,
        color: 'white',
        padding: '4px 8px',
        fontSize: '13px',
        fontWeight: '500'
      }
    }
  }

  // Format date for display
  const formatDateTime = (date: Date) => {
    return moment(date).format("MMM DD, YYYY [at] h:mm A")
  }

  return (
    <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Tenant Calendar</h2>
          <p className="text-muted-foreground">Schedule and manage tenant events with email notifications</p>
        </div>
        {selectedTenant && (
          <Button className="bg-blue-500 hover:bg-blue-600" onClick={openNewEventDialog}>
            <Plus className="w-4 h-4 mr-2" />
            New Event
          </Button>
        )}
      </div>

      {/* Property and Tenant Selection */}
      <Card>
        <CardHeader>
          <CardTitle>Select Tenant</CardTitle>
          <CardDescription>Choose a property and tenant to view and manage their calendar</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Property</Label>
              <Select value={selectedProperty} onValueChange={setSelectedProperty}>
                <SelectTrigger>
                  <SelectValue placeholder="Select property" />
                </SelectTrigger>
                <SelectContent>
                  {properties.map(p => (
                    <SelectItem key={p.property_id} value={String(p.property_id)}>
                      {p.property_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Tenant</Label>
              <Select
                value={selectedTenant}
                onValueChange={setSelectedTenant}
                disabled={!selectedProperty}
              >
                <SelectTrigger>
                  <SelectValue placeholder={selectedProperty ? "Select tenant" : "Select property first"} />
                </SelectTrigger>
                <SelectContent>
                  {tenants.map(t => (
                    <SelectItem key={t.tenant_id} value={String(t.tenant_id)}>
                      {t.full_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Event Legend */}
      {selectedTenant && (
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-6 flex-wrap">
              <span className="text-sm font-semibold">Event Types:</span>
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 rounded" style={{ backgroundColor: '#3b82f6' }}></div>
                <span className="text-sm">Meeting</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 rounded" style={{ backgroundColor: '#8b5cf6' }}></div>
                <span className="text-sm">Inspection</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 rounded" style={{ backgroundColor: '#ef4444' }}></div>
                <span className="text-sm">Maintenance</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 rounded" style={{ backgroundColor: '#10b981' }}></div>
                <span className="text-sm">Viewing</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 rounded" style={{ backgroundColor: '#64748b' }}></div>
                <span className="text-sm">Other</span>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Calendar */}
      {selectedTenant && (
        <Card>
          <CardHeader>
            <CardTitle>Events Calendar - {tenants.find(t => String(t.tenant_id) === selectedTenant)?.full_name}</CardTitle>
            <CardDescription>Click on an event to view details or click empty space to create new event</CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex justify-center items-center py-12">
                <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
              </div>
            ) : (
              <Calendar
                localizer={localizer}
                events={events}
                startAccessor="start"
                endAccessor="end"
                style={{ height: 600 }}
                view={view}
                onView={(newView) => setView(newView)}
                onSelectEvent={(event) => {
                  setSelectedEvent(event)
                  setShowDetailsDialog(true)
                }}
                onSelectSlot={(slotInfo) => {
                  setForm({
                    ...form,
                    start: moment(slotInfo.start).format("YYYY-MM-DDTHH:mm"),
                    end: moment(slotInfo.end).format("YYYY-MM-DDTHH:mm")
                  })
                  openNewEventDialog()
                }}
                selectable
                eventPropGetter={eventStyleGetter}
              />
            )}
          </CardContent>
        </Card>
      )}

      {/* Event Creation/Edit Dialog */}
      <Dialog open={showEventDialog} onOpenChange={setShowEventDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{isEditing ? "Edit Event" : "Create New Event"}</DialogTitle>
            <DialogDescription>
              {isEditing ? "Update event details" : "Schedule a new event for"} {tenants.find(t => String(t.tenant_id) === selectedTenant)?.full_name}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2 col-span-2">
                <Label>Event Title *</Label>
                <Input
                  placeholder="e.g., Property Inspection"
                  name="title"
                  value={form.title}
                  onChange={handleChange}
                />
              </div>
              <div className="space-y-2">
                <Label>Event Type *</Label>
                <Select value={form.event_type} onValueChange={(val) => setForm({...form, event_type: val})}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="meeting">Meeting</SelectItem>
                    <SelectItem value="inspection">Inspection</SelectItem>
                    <SelectItem value="maintenance">Maintenance</SelectItem>
                    <SelectItem value="viewing">Viewing</SelectItem>
                    <SelectItem value="other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Location</Label>
                <div className="relative">
                  <MapPin className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="e.g., Unit 101"
                    name="location"
                    value={form.location}
                    onChange={handleChange}
                    className="pl-10"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Start Date & Time *</Label>
                <Input
                  type="datetime-local"
                  name="start"
                  value={form.start}
                  onChange={handleChange}
                />
              </div>
              <div className="space-y-2">
                <Label>End Date & Time *</Label>
                <Input
                  type="datetime-local"
                  name="end"
                  value={form.end}
                  onChange={handleChange}
                />
              </div>
              <div className="space-y-2 col-span-2">
                <Label>Description</Label>
                <Textarea
                  placeholder="Add event details, notes, or instructions..."
                  name="description"
                  value={form.description}
                  onChange={handleChange}
                  rows={4}
                />
              </div>
              <div className="flex items-center space-x-2 col-span-2">
                <Checkbox
                  id="sendEmail"
                  checked={sendEmail}
                  onCheckedChange={(checked) => setSendEmail(checked as boolean)}
                />
                <label
                  htmlFor="sendEmail"
                  className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 flex items-center gap-2"
                >
                  <Mail className="w-4 h-4" />
                  Send email notification to tenant
                </label>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowEventDialog(false)}>
              Cancel
            </Button>
            <Button className="bg-blue-500 hover:bg-blue-600" onClick={handleSaveEvent}>
              {isEditing ? "Update Event" : "Create Event"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Event Details Dialog */}
      <Dialog open={showDetailsDialog} onOpenChange={setShowDetailsDialog}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <CalendarIcon className="w-5 h-5" />
              {selectedEvent?.title}
            </DialogTitle>
            <DialogDescription>Event Details</DialogDescription>
          </DialogHeader>
          {selectedEvent && (
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <div className="flex items-start gap-2">
                  <span className="text-sm font-semibold w-24">Type:</span>
                  <span className="text-sm capitalize">{selectedEvent.event_type || "Meeting"}</span>
                </div>
                <div className="flex items-start gap-2">
                  <span className="text-sm font-semibold w-24">Start:</span>
                  <span className="text-sm">{formatDateTime(selectedEvent.start)}</span>
                </div>
                <div className="flex items-start gap-2">
                  <span className="text-sm font-semibold w-24">End:</span>
                  <span className="text-sm">{formatDateTime(selectedEvent.end)}</span>
                </div>
                {selectedEvent.location && (
                  <div className="flex items-start gap-2">
                    <span className="text-sm font-semibold w-24">Location:</span>
                    <span className="text-sm">{selectedEvent.location}</span>
                  </div>
                )}
                {selectedEvent.description && (
                  <div className="flex items-start gap-2">
                    <span className="text-sm font-semibold w-24">Description:</span>
                    <span className="text-sm">{selectedEvent.description}</span>
                  </div>
                )}
              </div>
            </div>
          )}
          <DialogFooter className="flex gap-2">
            <Button
              variant="destructive"
              onClick={() => handleDeleteEvent(selectedEvent?.event_id)}
            >
              <Trash2 className="w-4 h-4 mr-2" />
              Delete
            </Button>
            <Button
              variant="outline"
              onClick={() => {
                setShowDetailsDialog(false)
                openEditDialog(selectedEvent!)
              }}
            >
              <Edit className="w-4 h-4 mr-2" />
              Edit
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
