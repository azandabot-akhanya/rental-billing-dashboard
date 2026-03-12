"use client"

import { useEffect, useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Search, Plus, Edit, Trash2 } from "lucide-react"
import Link from "next/link"
import { toast } from "sonner"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { getApiUrl } from "@/lib/api-config"

interface Tenant {
  tenant_id: number
  company_id: number
  property_id: number
  full_name: string
  email: string
  phone: string
  id_number: string
  emergency_contact_name: string
  emergency_contact_phone: string
  notes: string
  status: string
  created_at: string
  updated_at: string
  property_name?: string
  unit_numbrt?: string
  rent_amount?: string
  lease_end_date?: string
}

interface TenantFormData {
  full_name: string
  email: string
  phone: string
  id_number: string
  emergency_contact_name: string
  emergency_contact_phone: string
  notes: string
  status: string
  property_id: string
  unit_number: string   // 👈 add this
}


export default function TenantsPage() {
  const [tenants, setTenants] = useState<Tenant[]>([])
  const [filteredTenants, setFilteredTenants] = useState<Tenant[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [searchTerm, setSearchTerm] = useState("")
  const [isEditModalOpen, setIsEditModalOpen] = useState(false)
  const [selectedTenant, setSelectedTenant] = useState<Tenant | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const [formData, setFormData] = useState<TenantFormData>({
    full_name: "",
    email: "",
    phone: "",
    id_number: "",
    emergency_contact_name: "",
    emergency_contact_phone: "",
    notes: "",
    status: "active",
    property_id: "",
    unit_number: "" // 👈
  })
  

  // Fetch tenants from API
  useEffect(() => {
    fetchTenants()
  }, [])

  useEffect(() => {
    filterTenants()
  }, [tenants, searchTerm])

  const fetchTenants = async () => {
    setLoading(true)
    setError(null)
    try {
      const companyId = localStorage.getItem("selectedCompanyId")
      if (!companyId) {
        setError("No company selected")
        return
      }

      const response = await fetch(getApiUrl(`tenants?company_id=${companyId}`))
      
      if (!response.ok) {
        throw new Error("Failed to fetch tenants")
      }

      const data = await response.json()

      if (Array.isArray(data)) {
        const flattenedTenants = data.flat().filter(Boolean) // Flatten nested arrays and remove empty entries
        setTenants(flattenedTenants)
      } else if (data.success && Array.isArray(data.tenants)) {
        setTenants(data.tenants)
      } else {
        setError("Invalid response format from server")
      }

    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to fetch tenants")
      toast.error("Failed to fetch tenants")
    } finally {
      setLoading(false)
    }
  }

  const filterTenants = () => {
    if (!searchTerm) {
      setFilteredTenants(tenants)
      return
    }

    const filtered = tenants.filter(tenant =>
      tenant.full_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      tenant.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (tenant.property_name && tenant.property_name.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (tenant.phone && tenant.phone.toLowerCase().includes(searchTerm.toLowerCase()))
    )
    setFilteredTenants(filtered)
  }

  const handleEditClick = (tenant: Tenant) => {
    setSelectedTenant(tenant)
    setFormData({
      full_name: tenant.full_name || "",
      email: tenant.email || "",
      phone: tenant.phone || "",
      id_number: tenant.id_number || "",
      emergency_contact_name: tenant.emergency_contact_name || "",
      emergency_contact_phone: tenant.emergency_contact_phone || "",
      notes: tenant.notes || "",
      status: tenant.status || "active",
      property_id: tenant.property_id?.toString() || "",
      unit_number: tenant.unit_number || "" // 👈 use unit_name from API
    })
    
    setIsEditModalOpen(true)
  }

  const handleDeleteClick = async (tenant: Tenant) => {
    if (!confirm("Are you sure you want to delete this tenant? This action cannot be undone.")) return
  
    try {
      const response = await fetch(getApiUrl(`tenants/${tenant.tenant_id}`), {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
        },
      })
  
      const responseData = await response.json()
      
      if (!response.ok) {
        // Check if it's a foreign key constraint error
        if (responseData.message && responseData.message.includes('foreign key constraint')) {
          throw new Error("Cannot delete tenant because they have associated invoices. Please delete the invoices first.");
        }
        throw new Error(responseData.message || "Failed to delete tenant")
      }
  
      toast.success("Tenant deleted successfully")
      fetchTenants()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to delete tenant")
      console.error("Delete error:", error)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedTenant) return
  
    setIsSubmitting(true)
    try {
      const companyId = localStorage.getItem("selectedCompanyId");
      
      const payload = {
        full_name: formData.full_name,
        email: formData.email,
        phone: formData.phone,
        id_number: formData.id_number,
        emergency_contact_name: formData.emergency_contact_name,
        emergency_contact_phone: formData.emergency_contact_phone,
        notes: formData.notes,
        status: formData.status,
        property_id: parseInt(formData.property_id) || null,
        unit_number: formData.unit_number,
        items: [] // always include, even if empty
      }
      
      
  
      console.log("Sending update payload:", payload)
  
      const res = await fetch(getApiUrl(`tenants/${selectedTenant.tenant_id}`), {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      })
  
      const responseData = await res.json()
      console.log("Update response:", responseData)
  
      if (!res.ok) {
        throw new Error(responseData.message || "Failed to update tenant")
      }
  
      toast.success("Tenant updated successfully")
      setIsEditModalOpen(false)
      setSelectedTenant(null)
      fetchTenants()
    } catch (error) {
      console.error("Update error:", error)
      toast.error(error instanceof Error ? error.message : "Failed to update tenant")
    } finally {
      setIsSubmitting(false)
    }
  }

  const formatDate = (dateString: string | undefined) => {
    if (!dateString) return 'N/A'
    return new Date(dateString).toLocaleDateString()
  }

  const getStatusBadge = (status: string) => {
    return status === "active" ? (
      <Badge className="bg-green-100 text-green-800">Active</Badge>
    ) : (
      <Badge variant="outline" className="bg-gray-100 text-gray-800">Inactive</Badge>
    )
  }

  if (loading) {
    return (
      <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-3xl font-bold tracking-tight">Tenants</h2>
            <p className="text-muted-foreground">Manage property tenants</p>
          </div>
        </div>
        <Card>
          <CardContent className="pt-6">
            <p>Loading tenants...</p>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-3xl font-bold tracking-tight">Tenants</h2>
            <p className="text-muted-foreground">Manage property tenants</p>
          </div>
        </div>
        <Card>
          <CardContent className="pt-6">
            <p className="text-red-600">{error}</p>
            <Button onClick={fetchTenants} className="mt-4">Retry</Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Tenants</h2>
          <p className="text-muted-foreground">Manage property tenants</p>
        </div>
        <Link href="/tenants/add">
          <Button>
            <Plus className="w-4 h-4 mr-2" />
            Add Tenant
          </Button>
        </Link>
      </div>

      {loading && <p>Loading tenants...</p>}
      {error && <p className="text-red-600">{error}</p>}

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>All Tenants</CardTitle>
            <div className="flex gap-4">
              <div className="relative">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search tenants..."
                  className="w-[300px] pl-8"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
            </div>
          </div>
        </CardHeader>

        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Contact</TableHead>
                <TableHead>Property</TableHead>
                <TableHead>Unit</TableHead>
                <TableHead>Rent</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Lease End</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>

            <TableBody>
              {filteredTenants.length === 0 && !loading && (
                <TableRow>
                  <TableCell colSpan={8} className="text-center">
                    No tenants found.
                  </TableCell>
                </TableRow>
              )}

              {filteredTenants.map((tenant) => (
                <TableRow key={tenant.tenant_id}>
                  <TableCell className="font-medium">{tenant.full_name}</TableCell>
                  <TableCell>
                    <div className="space-y-1">
                      <div className="text-sm">{tenant.email}</div>
                      <div className="text-sm text-gray-500">{tenant.phone}</div>
                    </div>
                  </TableCell>
                  <TableCell>{tenant.property_name || 'N/A'}</TableCell>
                  <TableCell>{tenant.unit_number || 'N/A'}</TableCell>
                  <TableCell>{tenant.rent_amount ? `R ${tenant.rent_amount}` : 'R 0.00'}</TableCell>
                  <TableCell>{getStatusBadge(tenant.status)}</TableCell>
                  <TableCell>{tenant.lease_end_date || 'N/A'}</TableCell>
                  <TableCell>
                    <div className="flex gap-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleEditClick(tenant)}
                      >
                        <Edit className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDeleteClick(tenant)}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Edit Tenant Modal */}
      <Dialog open={isEditModalOpen} onOpenChange={setIsEditModalOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Tenant</DialogTitle>
            <DialogDescription>
              Update the tenant details
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="full_name">Full Name *</Label>
                <Input
                  id="full_name"
                  value={formData.full_name}
                  onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="email">Email *</Label>
                <Input
                  id="email"
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="phone">Phone *</Label>
                <Input
                  id="phone"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="id_number">ID Number</Label>
                <Input
                  id="id_number"
                  value={formData.id_number}
                  onChange={(e) => setFormData({ ...formData, id_number: e.target.value })}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="emergency_contact_name">Emergency Contact Name</Label>
                <Input
                  id="emergency_contact_name"
                  value={formData.emergency_contact_name}
                  onChange={(e) => setFormData({ ...formData, emergency_contact_name: e.target.value })}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="emergency_contact_phone">Emergency Contact Phone</Label>
                <Input
                  id="emergency_contact_phone"
                  value={formData.emergency_contact_phone}
                  onChange={(e) => setFormData({ ...formData, emergency_contact_phone: e.target.value })}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="property_id">Property ID</Label>
                <Input
                  id="property_id"
                  type="number"
                  value={formData.property_id}
                  onChange={(e) => setFormData({ ...formData, property_id: e.target.value })}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="status">Status</Label>
                <Select
                  value={formData.status}
                  onValueChange={(value) => setFormData({ ...formData, status: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="inactive">Inactive</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="unit_number">Unit Number</Label>
              <Input
                id="unit_number"
                value={formData.unit_number}
                onChange={(e) => setFormData({ ...formData, unit_number: e.target.value })}
              />
            </div>


            <div className="space-y-2">
              <Label htmlFor="notes">Notes</Label>
              <Textarea
                id="notes"
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                rows={3}
              />
            </div>

            <DialogFooter className="mt-6">
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setIsEditModalOpen(false)
                  setSelectedTenant(null)
                }}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={isSubmitting}
                className="bg-blue-500 hover:bg-blue-600"
              >
                {isSubmitting ? "Updating..." : "Update Tenant"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}