"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { toast } from "sonner"
import { useRouter } from "next/navigation"
import { getApiUrl } from "@/lib/api-config"
import { UnitSelector } from "@/components/UnitSelector"

export default function AddTenantPage() {
  const [formData, setFormData] = useState({
    company_id: "",
    property_id: "",
    unit_number: "",   // 👈 add this
    full_name: "",
    email: "",
    phone: "",
    id_number: "",
    emergency_contact_name: "",
    emergency_contact_phone: "",
    notes: "",
    status: "active"
  })
  

  const [properties, setProperties] = useState([])
  const [formErrors, setFormErrors] = useState<Record<string, string>>({})
  const [isSubmitting, setIsSubmitting] = useState(false)
  const router = useRouter()

  // Load localStorage and fetch properties on client only
  useEffect(() => {
    const companyId = localStorage.getItem("selectedCompanyId") || ""
    setFormData((prev) => ({ ...prev, company_id: companyId }))

    if (!companyId) {
      toast.error("No company selected. Redirecting to company selection.")
      router.push("/company-select")
      return
    }

    const fetchProperties = async () => {
      try {
        const res = await fetch(getApiUrl(`properties?company_id=${companyId}`))
        if (!res.ok) throw new Error("Failed to fetch properties")
        const data = await res.json()
    
        // Flatten nested arrays and remove empty entries
        const flattened = Array.isArray(data) ? data.flat().filter(Boolean) : []
        setProperties(flattened)
      } catch (err) {
        console.error("Error fetching properties:", err)
        toast.error("Failed to load properties")
      }
    }
    

    fetchProperties()
  }, [router])

  const validateForm = (): boolean => {
    const errors: Record<string, string> = {}
    
    if (!formData.company_id.trim()) errors.company_id = "Company ID is required"
    if (!formData.property_id.trim()) errors.property_id = "Property is required"
    if (!formData.full_name.trim()) errors.full_name = "Full name is required"
    if (!formData.email.trim()) errors.email = "Email is required"
    if (!formData.phone.trim()) errors.phone = "Phone is required"
    if (!formData.status.trim()) errors.status = "Status is required"

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (formData.email && !emailRegex.test(formData.email)) {
      errors.email = "Please enter a valid email address"
    }

    setFormErrors(errors)
    return Object.keys(errors).length === 0
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target
    setFormData(prev => ({
      ...prev,
      [name]: value
    }))
    
    // Clear error when user starts typing
    if (formErrors[name]) {
      setFormErrors(prev => ({
        ...prev,
        [name]: ""
      }))
    }
  }

  const handleSelectChange = (name: string, value: string) => {
    setFormData(prev => ({
      ...prev,
      [name]: value
    }))
    
    // Clear error when user selects an option
    if (formErrors[name]) {
      setFormErrors(prev => ({
        ...prev,
        [name]: ""
      }))
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!validateForm()) {
      toast.error("Please fill in all required fields")
      return
    }
  
    setIsSubmitting(true)
    try {
      const res = await fetch(getApiUrl("tenants"), {
        method: "POST",
        headers: { 
          "Content-Type": "application/json",
        },
        body: JSON.stringify(formData),
      })
  
      const data = await res.json()
  
      if (!res.ok) {
        throw new Error(data.message || "Failed to create tenant")
      }
  
      toast.success("Tenant created successfully!")

      // Reset form
      setFormData({
        company_id: localStorage.getItem("selectedCompanyId") || "",
        property_id: "",
        unit_number: "",
        full_name: "",
        email: "",
        phone: "",
        id_number: "",
        emergency_contact_name: "",
        emergency_contact_phone: "",
        notes: "",
        status: "active"
      })
      
      setFormErrors({})
  
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Network error occurred")
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleCancel = () => {
    setFormData({
      company_id: localStorage.getItem("selectedCompanyId") || "",
      property_id: "",
      unit_number: "",
      full_name: "",
      email: "",
      phone: "",
      id_number: "",
      emergency_contact_name: "",
      emergency_contact_phone: "",
      notes: "",
      status: "active"
    })
    setFormErrors({})
    toast.info("Form cleared")
  }

  return (
    <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Add Tenant</h2>
          <p className="text-muted-foreground">Add a new tenant to your rental properties</p>
          <p className="text-red-500 text-sm font-semibold mt-1">
            * No fields should be left empty. All fields are required.
          </p>
        </div>
        <Button className="bg-blue-500 hover:bg-blue-600">Import Tenants</Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Tenant Information</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Property Select */}
            <div className="space-y-2">
              <Label htmlFor="property_id">Property *</Label>
              <Select
                value={formData.property_id}
                onValueChange={(value) => handleSelectChange("property_id", value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select property" />
                </SelectTrigger>
                <SelectContent>
                  {properties.map((property) => (
                    <SelectItem key={property.property_id} value={property.property_id.toString()}>
                      {property.property_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {formErrors.property_id && (
                <p className="text-red-500 text-sm">{formErrors.property_id}</p>
              )}
            </div>

            {/* Unit Selector */}
            <UnitSelector
              propertyId={formData.property_id}
              selectedUnit={formData.unit_number}
              onUnitSelect={(unitNumber) => {
                setFormData(prev => ({ ...prev, unit_number: unitNumber }))
                if (formErrors.unit_number) {
                  setFormErrors(prev => ({ ...prev, unit_number: "" }))
                }
              }}
              error={formErrors.unit_number}
            />


            {/* Status Select */}
            <div className="space-y-2">
              <Label htmlFor="status">Status *</Label>
              <Select
                value={formData.status}
                onValueChange={(value) => handleSelectChange("status", value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="inactive">Inactive</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                </SelectContent>
              </Select>
              {formErrors.status && (
                <p className="text-red-500 text-sm">{formErrors.status}</p>
              )}
            </div>

            {/* Full Name */}
            <div className="space-y-2">
              <Label htmlFor="full_name">Full Name *</Label>
              <Input
                id="full_name"
                name="full_name"
                value={formData.full_name}
                onChange={handleInputChange}
                placeholder="Enter full name"
              />
              {formErrors.full_name && (
                <p className="text-red-500 text-sm">{formErrors.full_name}</p>
              )}
            </div>

            {/* Email */}
            <div className="space-y-2">
              <Label htmlFor="email">Email *</Label>
              <Input
                id="email"
                name="email"
                type="email"
                value={formData.email}
                onChange={handleInputChange}
                placeholder="Enter email address"
              />
              {formErrors.email && (
                <p className="text-red-500 text-sm">{formErrors.email}</p>
              )}
            </div>

            {/* Phone */}
            <div className="space-y-2">
              <Label htmlFor="phone">Phone *</Label>
              <Input
                id="phone"
                name="phone"
                value={formData.phone}
                onChange={handleInputChange}
                placeholder="Enter phone number"
              />
              {formErrors.phone && (
                <p className="text-red-500 text-sm">{formErrors.phone}</p>
              )}
            </div>

            {/* ID Number */}
            <div className="space-y-2">
              <Label htmlFor="id_number">ID Number</Label>
              <Input
                id="id_number"
                name="id_number"
                value={formData.id_number}
                onChange={handleInputChange}
                placeholder="Enter ID number"
              />
            </div>

            {/* Emergency Contact Name */}
            <div className="space-y-2">
              <Label htmlFor="emergency_contact_name">Emergency Contact Name</Label>
              <Input
                id="emergency_contact_name"
                name="emergency_contact_name"
                value={formData.emergency_contact_name}
                onChange={handleInputChange}
                placeholder="Enter emergency contact name"
              />
            </div>

            {/* Emergency Contact Phone */}
            <div className="space-y-2">
              <Label htmlFor="emergency_contact_phone">Emergency Contact Phone</Label>
              <Input
                id="emergency_contact_phone"
                name="emergency_contact_phone"
                value={formData.emergency_contact_phone}
                onChange={handleInputChange}
                placeholder="Enter emergency contact phone"
              />
            </div>

            {/* Notes */}
            <div className="space-y-2">
              <Label htmlFor="notes">Notes</Label>
              <Textarea
                id="notes"
                name="notes"
                value={formData.notes}
                onChange={handleInputChange}
                placeholder="Additional notes about the tenant"
                rows={3}
              />
            </div>

            <div className="flex gap-2 pt-4">
              <Button 
                type="submit" 
                className="bg-blue-500 hover:bg-blue-600"
                disabled={isSubmitting}
              >
                {isSubmitting ? "Creating Tenant..." : "Save Tenant"}
              </Button>
              <Button 
                type="button" 
                variant="outline" 
                onClick={handleCancel}
                disabled={isSubmitting}
              >
                Cancel
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}