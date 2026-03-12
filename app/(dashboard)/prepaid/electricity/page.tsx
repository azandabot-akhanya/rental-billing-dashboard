"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { toast } from "sonner"
import { getApiUrl } from "@/lib/api-config"

export default function ElectricityPage() {
  const [formData, setFormData] = useState({
    tenantId: "",
    propertyId: "",
    unitId: "",
    reading: "",
    amount: "",
    voucherNumber: "",
    notes: "",
  })

  const [tenants, setTenants] = useState<any[]>([])
  const [properties, setProperties] = useState<any[]>([])

  const companyId =
    typeof window !== "undefined" ? localStorage.getItem("selectedCompanyId") : "1"

  // 🔹 Fetch tenants (optionally filtered by property)
  const fetchTenants = async (propertyId?: string) => {
    try {
      let url = getApiUrl(`tenants?company_id=${companyId}`)
      if (propertyId) {
        url += `&property_id=${propertyId}`
      }
      const res = await fetch(url)
      const data = await res.json()
      const flattened = Array.isArray(data) ? data.flat() : []
      setTenants(flattened)
    } catch (err) {
      console.error("Error fetching tenants:", err)
    }
  }

  // 🔹 Fetch properties
  const fetchProperties = async () => {
    try {
      const res = await fetch(getApiUrl(`properties?company_id=${companyId}`))
      const data = await res.json()
      const flattened = Array.isArray(data) ? data.flat() : []
      setProperties(flattened)
    } catch (err) {
      console.error("Error fetching properties:", err)
    }
  }

  useEffect(() => {
    fetchTenants()
    fetchProperties()
  }, [])

  // When property changes, refetch tenants and reset tenant/unit
  useEffect(() => {
    if (formData.propertyId) {
      fetchTenants(formData.propertyId)
      setFormData(prev => ({ ...prev, tenantId: "", unitId: "" }))
    }
  }, [formData.propertyId])

  // When tenant changes, auto-fill unit number
  useEffect(() => {
    if (formData.tenantId) {
      const selectedTenant = tenants.find(t => String(t.tenant_id) === formData.tenantId)
      if (selectedTenant && selectedTenant.unit_number) {
        setFormData(prev => ({ ...prev, unitId: String(selectedTenant.unit_number) }))
      }
    }
  }, [formData.tenantId, tenants])

  const handleSubmit = async () => {
    if (!companyId) return toast.error("Company ID not found")
    if (!formData.propertyId) return toast.error("Please select a property")
    if (!formData.tenantId) return toast.error("Please select a tenant")
    if (!formData.amount) return toast.error("Please enter amount")
    if (!formData.reading) return toast.error("Please enter meter reading")

    const payload = {
      company_id: companyId,
      tenant_id: formData.tenantId,
      property_id: formData.propertyId,
      unit_id: formData.unitId,
      utility_type: "electricity",
      amount: formData.amount,
      voucher_number: formData.voucherNumber,
      reading: formData.reading,
      notes: formData.notes,
      transaction_date: new Date().toISOString().split("T")[0],
      reading_date: new Date().toISOString().split("T")[0],
    }

    try {
      const res = await fetch(getApiUrl("utilities/save-transaction"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      })

      const data = await res.json()
      if (!res.ok) throw new Error(data.message || "Failed to save transaction")

      toast.success("Electricity transaction and meter reading saved successfully!")
      setFormData({
        ...formData,
        amount: "",
        voucherNumber: "",
        reading: "",
        notes: ""
      })
    } catch (err: any) {
      toast.error(err.message)
    }
  }

  return (
    <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Electricity</h2>
          <p className="text-muted-foreground">
            Record electricity meter readings and transactions
          </p>
        </div>
      </div>

      {/* Record Electricity Transaction & Meter Reading */}
      <Card>
        <CardHeader>
          <CardTitle>Record Transaction & Meter Reading</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* 🔹 Property Dropdown (FIRST) */}
            <div className="space-y-2">
              <Label>Property *</Label>
              <Select
                value={formData.propertyId}
                onValueChange={(val) => setFormData({ ...formData, propertyId: val })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select property" />
                </SelectTrigger>
                <SelectContent>
                  {properties.map((p) => (
                    <SelectItem key={p.property_id} value={String(p.property_id)}>
                      {p.property_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* 🔹 Tenant Dropdown (SECOND - filtered by property) */}
            <div className="space-y-2">
              <Label>Tenant *</Label>
              <Select
                value={formData.tenantId}
                onValueChange={(val) => setFormData({ ...formData, tenantId: val })}
                disabled={!formData.propertyId}
              >
                <SelectTrigger>
                  <SelectValue placeholder={formData.propertyId ? "Select tenant" : "Select property first"} />
                </SelectTrigger>
                <SelectContent>
                  {tenants.map((t) => (
                    <SelectItem key={t.tenant_id} value={String(t.tenant_id)}>
                      {t.full_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* 🔹 Unit Number (THIRD - auto-filled from tenant) */}
            <div className="space-y-2">
              <Label htmlFor="unitId">Unit Number</Label>
              <Input
                id="unitId"
                value={formData.unitId}
                onChange={(e) => setFormData({ ...formData, unitId: e.target.value })}
                placeholder="Auto-filled from tenant"
                disabled
              />
            </div>
          </div>

          {/* Meter Reading, Amount & Voucher */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="reading">Meter Reading *</Label>
              <Input
                id="reading"
                type="number"
                value={formData.reading}
                onChange={(e) => setFormData({ ...formData, reading: e.target.value })}
                placeholder="Enter meter reading"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="amount">Amount *</Label>
              <Input
                id="amount"
                type="number"
                value={formData.amount}
                onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                placeholder="Enter amount"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="voucherNumber">Voucher Number</Label>
              <Input
                id="voucherNumber"
                value={formData.voucherNumber}
                onChange={(e) => setFormData({ ...formData, voucherNumber: e.target.value })}
                placeholder="Enter voucher number"
              />
            </div>
          </div>

          {/* Notes */}
          <div className="space-y-2">
            <Label htmlFor="notes">Notes</Label>
            <Textarea
              id="notes"
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              placeholder="Optional notes"
            />
          </div>

          <Button className="bg-blue-500 hover:bg-blue-600" onClick={handleSubmit}>
            Save Transaction & Reading
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}
